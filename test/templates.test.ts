import { describe, expect, it } from 'vitest';
import { extractSlots, render } from '../src/render.js';
import { listTemplates, loadTemplate } from '../src/templates.js';

// 模板与 plan.ts 之间的契约:模板只许用这些插槽,plan 保证全部提供。
// 想在模板里用新插槽?先在这里登记,再去 plan.ts 里供给它。
const KNOWN_STRING_VARS = new Set([
  'projectName',
  'date',
  'commandsBlock',
  'dirTree',
  'testCommand',
  'lintCommand',
]);
const KNOWN_FLAGS = new Set([
  'isPython',
  'isWeb',
  'isNode',
  'isFullstack',
  'isOther',
  'worktree',
  'hasTests',
  'hasLint',
  'showCheckTip',
  'agentsMd',
  'promo',
]);

function fullVars(allFlags: boolean): Record<string, string | boolean> {
  const vars: Record<string, string | boolean> = {};
  for (const v of KNOWN_STRING_VARS) vars[v] = `<${v}>`;
  for (const f of KNOWN_FLAGS) vars[f] = allFlags;
  return vars;
}

describe('templates — zh/en 镜像与插槽契约', () => {
  it('zh 与 en 的文件清单完全一致', async () => {
    const [zh, en] = await Promise.all([listTemplates('zh'), listTemplates('en')]);
    expect(en).toEqual(zh);
  });

  it('每对文件的插槽集合一致,且都在白名单内', async () => {
    const files = await listTemplates('zh');
    for (const file of files) {
      const [zhTpl, enTpl] = await Promise.all([loadTemplate('zh', file), loadTemplate('en', file)]);
      const zhSlots = extractSlots(zhTpl);
      const enSlots = extractSlots(enTpl);
      expect([...enSlots.vars].sort(), `${file}: 变量插槽 zh/en 漂移`).toEqual([...zhSlots.vars].sort());
      expect([...enSlots.flags].sort(), `${file}: 条件插槽 zh/en 漂移`).toEqual(
        [...zhSlots.flags].sort(),
      );
      for (const v of zhSlots.vars) {
        expect(KNOWN_STRING_VARS.has(v), `${file}: 未登记的变量 {{${v}}}`).toBe(true);
      }
      for (const f of zhSlots.flags) {
        expect(KNOWN_FLAGS.has(f), `${file}: 未登记的条件 {{#if ${f}}}`).toBe(true);
      }
    }
  });

  it('全部模板在满配变量下可渲染(条件全真 + 全假两个方向)', async () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const file of await listTemplates(lang)) {
        const tpl = await loadTemplate(lang, file);
        expect(() => render(tpl, fullVars(true), `${lang}/${file}`)).not.toThrow();
        expect(() => render(tpl, fullVars(false), `${lang}/${file}`)).not.toThrow();
      }
    }
  });
});
