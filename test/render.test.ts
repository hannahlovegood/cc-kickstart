import { describe, expect, it } from 'vitest';
import { TemplateError, render } from '../src/render.js';

describe('render — 变量插值', () => {
  it('替换 {{var}},支持多行值', () => {
    expect(render('你好 {{name}}!', { name: '世界' })).toBe('你好 世界!');
    expect(render('A\n{{block}}\nB', { block: 'x\ny' })).toBe('A\nx\ny\nB');
  });

  it('缺变量抛 TemplateError,信息含变量名与模板名', () => {
    expect(() => render('{{missing}}', {}, 'foo.md')).toThrowError(TemplateError);
    expect(() => render('{{missing}}', {}, 'foo.md')).toThrow(/foo\.md.*missing/);
  });

  it('布尔值不能作为文本插值', () => {
    expect(() => render('{{flag}}', { flag: true })).toThrow(/布尔/);
  });

  it('不合法的 {{ … }} 原样保留(含 GitHub Actions 语法)', () => {
    expect(render('${{ secrets.X }} 和 {{ 带空格 }}', {})).toBe('${{ secrets.X }} 和 {{ 带空格 }}');
  });
});

describe('render — 条件块', () => {
  it('if 真假分支与 else', () => {
    const tpl = '{{#if on}}开{{else}}关{{/if}}';
    expect(render(tpl, { on: true })).toBe('开');
    expect(render(tpl, { on: false })).toBe('关');
  });

  it('嵌套 if', () => {
    const tpl = '{{#if a}}A{{#if b}}B{{/if}}{{/if}}';
    expect(render(tpl, { a: true, b: true })).toBe('AB');
    expect(render(tpl, { a: true, b: false })).toBe('A');
    expect(render(tpl, { a: false, b: true })).toBe('');
  });

  it('独占一行的块标签整行移除,不留空行', () => {
    const tpl = '- a\n{{#if x}}\n- b\n{{/if}}\n- c\n';
    expect(render(tpl, { x: false })).toBe('- a\n- c\n');
    expect(render(tpl, { x: true })).toBe('- a\n- b\n- c\n');
  });

  it('行内块标签不受整行移除影响', () => {
    expect(render('a {{#if x}}b{{/if}} c', { x: true })).toBe('a b c');
    expect(render('a {{#if x}}b{{/if}} c', { x: false })).toBe('a  c');
  });

  it('未闭合 / 多余标签抛错', () => {
    expect(() => render('{{#if x}}没关', { x: true })).toThrow(/没有对应的/);
    expect(() => render('多余{{/if}}', {})).toThrow(/多余的/);
    expect(() => render('{{else}}', {})).toThrow(/之外/);
  });

  it('缺条件变量、条件变量非布尔都抛错', () => {
    expect(() => render('{{#if nope}}x{{/if}}', {})).toThrow(/缺少条件变量/);
    expect(() => render('{{#if s}}x{{/if}}', { s: 'str' })).toThrow(/必须是布尔/);
  });
});
