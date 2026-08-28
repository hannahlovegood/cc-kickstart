import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as p from '@clack/prompts';
import { t } from './i18n.js';
import {
  appendToUnmarked,
  assemble,
  parseDoc,
  planAppend,
  type RenderedSection,
} from './merge/claudeMd.js';
import type { FileAction, KickstartConfig, Lang, SectionChange } from './types.js';

function describe(action: FileAction, lang: Lang): string {
  let desc: string;
  switch (action.kind) {
    case 'create':
      desc = t(lang, 'kind.create');
      break;
    case 'update-sections':
      desc = t(lang, 'kind.update-sections', {
        n: (action.sections ?? []).filter((s) => s.status !== 'unchanged').length,
      });
      break;
    case 'append':
      desc = t(lang, 'unmarked.append');
      break;
    case 'sidecar':
      desc = t(lang, 'kind.sidecar');
      break;
    case 'ask-unmarked':
      desc = t(lang, 'kind.ask-unmarked');
      break;
    case 'merge-json':
      desc = t(lang, 'kind.merge-json', { n: (action.addedLines ?? []).length });
      break;
    case 'skip-exists':
      desc = t(lang, 'kind.skip-exists');
      break;
    case 'skip-unchanged':
      desc = t(lang, 'kind.skip-unchanged');
      break;
    case 'skip-invalid':
      desc = t(lang, 'kind.skip-invalid');
      break;
  }
  return desc;
}

export function printPlan(actions: FileAction[], lang: Lang): void {
  const width = Math.max(...actions.map((a) => a.path.length)) + 2;
  const lines = actions.map((a) => `${a.path.padEnd(width)}${describe(a, lang)}`);
  p.note(lines.join('\n'), t(lang, 'plan.title'));
  for (const a of actions) {
    if (a.note !== undefined) p.log.warn(`${a.path}: ${a.note}`);
  }
}

function headingOf(change: SectionChange): string {
  return (change.fresh.split('\n')[0] ?? change.id).trim();
}

function guard<T>(value: T | symbol, lang: Lang): T {
  if (p.isCancel(value)) {
    p.cancel(t(lang, 'cancelled'));
    process.exit(1);
  }
  return value as T;
}

/** 交互模式:把 plan 的候选变更变成用户拍板后的最终动作。 */
export async function finalizeInteractive(
  actions: FileAction[],
  cfg: KickstartConfig,
): Promise<FileAction[]> {
  const { lang } = cfg;
  const out: FileAction[] = [];
  for (const action of actions) {
    if (action.kind === 'update-sections') {
      const changes = action.sections ?? [];
      const candidates = changes.filter((c) => c.status !== 'unchanged');
      const statusSuffix: Record<string, string> = {
        'template-updated': t(lang, 'section.updated'),
        'user-edited': t(lang, 'section.userEdited'),
        new: t(lang, 'section.new'),
      };
      const selected = guard(
        await p.multiselect({
          message: t(lang, 'merge.selectSections', { file: action.path }),
          options: candidates.map((c) => ({
            value: c.id,
            label: `${headingOf(c)} ${statusSuffix[c.status] ?? ''}`.trim(),
          })),
          initialValues: candidates.filter((c) => c.apply).map((c) => c.id),
          required: false,
        }),
        lang,
      );
      const chosen = new Set(selected);
      const finalSections = changes.map((c) => ({
        ...c,
        apply: c.status !== 'unchanged' && chosen.has(c.id),
      }));
      if (finalSections.some((c) => c.apply)) {
        out.push({ ...action, sections: finalSections });
      } else {
        out.push({ path: action.path, kind: 'skip-unchanged' });
      }
    } else if (action.kind === 'ask-unmarked') {
      const sidecarPath = action.path.replace(/\.md$/, '.kickstart.md');
      const choice = guard(
        await p.select({
          message: t(lang, 'unmarked.title', { file: action.path }),
          options: [
            { value: 'sidecar' as const, label: t(lang, 'unmarked.sidecar', { sidecar: sidecarPath }) },
            { value: 'append' as const, label: t(lang, 'unmarked.append') },
            { value: 'skip' as const, label: t(lang, 'unmarked.skip', { file: action.path }) },
          ],
          initialValue: 'sidecar' as const,
        }),
        lang,
      );
      if (choice === 'sidecar') {
        out.push({ path: sidecarPath, kind: 'sidecar', content: action.content });
      } else if (choice === 'append') {
        const text =
          action.path === 'CLAUDE.md'
            ? (cfg.detected.claudeMdText ?? '')
            : (cfg.detected.agentsMdText ?? '');
        const fresh: RenderedSection[] = (action.sections ?? []).map((s) => ({
          id: s.id,
          body: s.fresh,
        }));
        const { include, skipped } = planAppend(text, fresh);
        for (const s of skipped) {
          p.log.info(t(lang, 'unmarked.appendSkipped', { heading: s.heading }));
        }
        if (include.length === 0) {
          out.push({ path: action.path, kind: 'skip-unchanged' });
        } else {
          out.push({ path: action.path, kind: 'append', content: appendToUnmarked(text, include) });
        }
      } else {
        out.push({ path: action.path, kind: 'skip-exists' });
      }
    } else if (action.kind === 'merge-json') {
      p.note((action.addedLines ?? []).join('\n'), t(lang, 'settings.preview'));
      out.push(action);
    } else {
      out.push(action);
    }
  }
  return out;
}

const WRITE_ORDER: Record<string, number> = { skills: 0, settings: 1, docs: 2 };

function orderOf(action: FileAction): number {
  if (action.path.startsWith('.claude/skills/')) return WRITE_ORDER.skills as number;
  if (action.path === '.claude/settings.json') return WRITE_ORDER.settings as number;
  return WRITE_ORDER.docs as number;
}

/** 唯一写盘处。skills → settings → 文档,最重要的最后写,失败面最小。 */
export async function applyPlan(
  actions: FileAction[],
  cfg: KickstartConfig,
): Promise<{ written: string[]; skipped: { path: string; note: string }[] }> {
  const written: string[] = [];
  const skipped: { path: string; note: string }[] = [];
  const sorted = [...actions].sort((a, b) => orderOf(a) - orderOf(b));
  for (const action of sorted) {
    const abs = join(cfg.cwd, action.path);
    switch (action.kind) {
      case 'create':
      case 'append':
      case 'sidecar': {
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, action.content ?? '', 'utf8');
        written.push(action.path);
        break;
      }
      case 'update-sections': {
        const text =
          action.path === 'CLAUDE.md'
            ? (cfg.detected.claudeMdText ?? '')
            : (cfg.detected.agentsMdText ?? '');
        const outText = assemble(parseDoc(text), action.sections ?? []);
        await writeFile(abs, outText, 'utf8');
        written.push(action.path);
        break;
      }
      case 'merge-json': {
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, action.mergedJson ?? '', 'utf8');
        written.push(action.path);
        break;
      }
      case 'ask-unmarked': {
        // 非交互路径不该出现;保险起见按旁车处理
        const sidecarPath = action.path.replace(/\.md$/, '.kickstart.md');
        await writeFile(join(cfg.cwd, sidecarPath), action.content ?? '', 'utf8');
        written.push(sidecarPath);
        break;
      }
      default:
        skipped.push({ path: action.path, note: describe(action, cfg.lang) });
    }
  }
  return { written, skipped };
}
