import { buildCommandVars } from './commands.js';
import { t } from './i18n.js';
import {
  composeDoc,
  diffSections,
  normalizeBody,
  parseDoc,
  sectionHash,
  type RenderedSection,
} from './merge/claudeMd.js';
import { mergeSettings, serializeSettings } from './merge/settingsJson.js';
import { render, type TemplateVars } from './render.js';
import { buildSettings } from './settings.js';
import {
  AGENTS_SHELL_TEMPLATE,
  CK_SECTIONS,
  PROGRESS_TEMPLATE,
  SIDECAR_NOTE_TEMPLATE,
  loadTemplate,
  skillTemplate,
} from './templates.js';
import type { FileAction, KickstartConfig } from './types.js';

export interface PlanResult {
  actions: FileAction[];
  vars: TemplateVars;
}

function localDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 模板可用的全部插槽在这里供给;templates.test.ts 的白名单是它的镜像契约。 */
export function buildTemplateVars(cfg: KickstartConfig, now: Date): TemplateVars {
  const cmd = buildCommandVars(cfg);
  const dirTree =
    cfg.detected.topDirs.length > 0
      ? cfg.detected.topDirs
          .map(
            (d) =>
              `- \`${d}/\` —— ${cfg.lang === 'zh' ? '(一句话说明)' : '(one-line description)'}`,
          )
          .join('\n')
      : cfg.lang === 'zh'
        ? '- (暂无子目录——结构成形后回来补)'
        : '- (no subdirectories yet — fill in once the structure takes shape)';
  return {
    projectName: cfg.projectName,
    date: localDate(now),
    commandsBlock: cmd.commandsBlock,
    dirTree,
    testCommand: cmd.testCommand,
    lintCommand: cmd.lintCommand,
    isPython: cfg.projectType === 'python',
    isWeb: cfg.projectType === 'web',
    isNode: cfg.projectType === 'node',
    isFullstack: cfg.projectType === 'fullstack',
    isOther: cfg.projectType === 'other',
    worktree: cfg.worktree,
    hasTests: cmd.testCommand !== '',
    hasLint: cmd.lintCommand !== '',
    showCheckTip:
      !cmd.hasCheckScript && ['web', 'node', 'fullstack'].includes(cfg.projectType),
    agentsMd: cfg.targetDoc === 'AGENTS.md',
    promo: cfg.promo,
  };
}

async function renderSections(cfg: KickstartConfig, vars: TemplateVars): Promise<RenderedSection[]> {
  const sections: RenderedSection[] = [];
  for (const s of CK_SECTIONS) {
    const tpl = await loadTemplate(cfg.lang, s.file);
    sections.push({ id: s.id, body: render(tpl, vars, `${cfg.lang}/${s.file}`) });
  }
  return sections;
}

/**
 * 核心编排:config → 文件计划。纯计算,不碰磁盘(所有磁盘现状都来自 cfg.detected),
 * --dry-run 打印的就是它的输出。渲染必须确定:ck 节内不放时间戳,date 只进首建的进度区。
 */
export async function buildPlan(cfg: KickstartConfig, now: Date = new Date()): Promise<PlanResult> {
  const { lang, targetDoc } = cfg;
  const vars = buildTemplateVars(cfg, now);
  const sections = await renderSections(cfg, vars);
  const actions: FileAction[] = [];

  const targetText =
    targetDoc === 'CLAUDE.md' ? cfg.detected.claudeMdText : cfg.detected.agentsMdText;
  const targetState = targetDoc === 'CLAUDE.md' ? cfg.detected.claudeMd : cfg.detected.agentsMd;

  if (targetState === 'none') {
    const progress = render(await loadTemplate(lang, PROGRESS_TEMPLATE), vars, PROGRESS_TEMPLATE);
    actions.push({ path: targetDoc, kind: 'create', content: composeDoc(sections, progress) });
  } else if (targetState === 'marked') {
    const changes = diffSections(parseDoc(targetText as string), sections);
    if (changes.every((c) => c.status === 'unchanged')) {
      actions.push({ path: targetDoc, kind: 'skip-unchanged' });
    } else {
      actions.push({ path: targetDoc, kind: 'update-sections', sections: changes });
    }
  } else {
    // unmarked / broken:绝不碰原文件。非交互固定走旁车;交互模式待用户三选一。
    const sidecarPath = targetDoc.replace(/\.md$/, '.kickstart.md');
    const note = targetState === 'broken' ? t(lang, 'broken.warn', { file: targetDoc }) : undefined;
    const sidecarNote = await loadTemplate(lang, SIDECAR_NOTE_TEMPLATE);
    const sidecarContent = sidecarNote.trimEnd() + '\n\n' + composeDoc(sections);
    const existingSidecar =
      targetDoc === 'CLAUDE.md' ? cfg.detected.claudeSidecarText : cfg.detected.agentsSidecarText;
    if (cfg.nonInteractive) {
      if (existingSidecar === sidecarContent) {
        actions.push({ path: sidecarPath, kind: 'skip-unchanged', note });
      } else {
        actions.push({ path: sidecarPath, kind: 'sidecar', content: sidecarContent, note });
      }
    } else {
      actions.push({
        path: targetDoc,
        kind: 'ask-unmarked',
        content: sidecarContent,
        sections: sections.map((s) => ({
          id: s.id,
          status: 'new' as const,
          fresh: normalizeBody(s.body),
          freshHash: sectionHash(s.body),
          apply: true,
        })),
        note,
      });
    }
  }

  if (targetDoc === 'AGENTS.md') {
    const shell = render(await loadTemplate(lang, AGENTS_SHELL_TEMPLATE), vars, AGENTS_SHELL_TEMPLATE);
    if (cfg.detected.claudeMd === 'none') {
      actions.push({ path: 'CLAUDE.md', kind: 'create', content: shell });
    } else if (cfg.detected.claudeMdText?.trimStart().startsWith('@AGENTS.md') === true) {
      actions.push({ path: 'CLAUDE.md', kind: 'skip-unchanged' });
    } else {
      actions.push({ path: 'CLAUDE.md', kind: 'skip-exists', note: t(lang, 'shell.skip') });
    }
  }

  for (const id of cfg.skills) {
    const path = `.claude/skills/${id}/SKILL.md`;
    if (cfg.detected.existingSkills.includes(id)) {
      actions.push({ path, kind: 'skip-exists' });
    } else {
      const tpl = await loadTemplate(lang, skillTemplate(id));
      actions.push({ path, kind: 'create', content: render(tpl, vars, skillTemplate(id)) });
    }
  }

  const settingsPath = '.claude/settings.json';
  const incoming = buildSettings(cfg);
  if (cfg.detected.settings === null) {
    actions.push({ path: settingsPath, kind: 'create', content: serializeSettings(incoming) });
  } else if (cfg.detected.settings === 'invalid') {
    actions.push({ path: settingsPath, kind: 'skip-invalid', note: t(lang, 'settings.invalid.warn') });
  } else {
    const merge = mergeSettings(cfg.detected.settings, incoming);
    if (merge.changed) {
      actions.push({
        path: settingsPath,
        kind: 'merge-json',
        mergedJson: serializeSettings(merge.merged),
        addedLines: merge.addedLines,
        note:
          merge.conflicts.length > 0
            ? t(lang, 'settings.conflicts', { paths: merge.conflicts.join(', ') })
            : undefined,
      });
    } else {
      actions.push({ path: settingsPath, kind: 'skip-unchanged' });
    }
  }

  return { actions, vars };
}

/** 会真正写盘的动作(update-sections 需至少一节被接受才算)。 */
export function writableActions(actions: FileAction[]): FileAction[] {
  return actions.filter((a) => {
    if (a.kind === 'update-sections') return (a.sections ?? []).some((s) => s.apply);
    return ['create', 'append', 'sidecar', 'ask-unmarked', 'merge-json'].includes(a.kind);
  });
}
