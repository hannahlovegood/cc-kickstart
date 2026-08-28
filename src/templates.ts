import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lang } from './types.js';

// 唯一可靠的模板定位方式:相对本模块所在位置(dist/ 或 src/ 都在仓库一层下,
// npm 包内 dist/ 与 templates/ 同级)。凡 process.cwd() 相对路径在 npx 场景必炸。
const TEMPLATES_ROOT = fileURLToPath(new URL('../templates/', import.meta.url));

/** CLAUDE.md 的六个标记节,按最终文档顺序。 */
export const CK_SECTIONS: readonly { id: string; file: string }[] = [
  { id: 'header', file: 'claude-md/header.md' },
  { id: 'ground-rules', file: 'claude-md/ground-rules.md' },
  { id: 'commands', file: 'claude-md/commands.md' },
  { id: 'structure', file: 'claude-md/structure.md' },
  { id: 'facts', file: 'claude-md/facts.md' },
  { id: 'handoff', file: 'claude-md/handoff.md' },
];

export const PROGRESS_TEMPLATE = 'claude-md/progress.md';
export const AGENTS_SHELL_TEMPLATE = 'agents-shell.md';
export const SIDECAR_NOTE_TEMPLATE = 'sidecar-note.md';
export const NEXT_STEPS_TEMPLATE = 'next-steps.md';

export function skillTemplate(id: string): string {
  return `skills/${id}/SKILL.md`;
}

export function templatesRoot(): string {
  return TEMPLATES_ROOT;
}

export function assertTemplatesPresent(): void {
  if (!existsSync(join(TEMPLATES_ROOT, 'zh')) || !existsSync(join(TEMPLATES_ROOT, 'en'))) {
    throw new Error(
      `模板目录缺失(解析到的位置: ${TEMPLATES_ROOT})。` +
        '这通常意味着安装不完整或包布局被改动,请重装:npm cache clean --force && npx cc-kickstart@latest',
    );
  }
}

export async function loadTemplate(lang: Lang, relPath: string): Promise<string> {
  return readFile(join(TEMPLATES_ROOT, lang, relPath), 'utf8');
}

export async function listTemplates(lang: Lang): Promise<string[]> {
  const base = join(TEMPLATES_ROOT, lang);
  const entries = await readdir(base, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => relative(base, join(e.parentPath, e.name)))
    .sort();
}
