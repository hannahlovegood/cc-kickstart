import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  appendToUnmarked,
  assemble,
  composeDoc,
  diffSections,
  parseDoc,
  planAppend,
  sectionBlock,
  sectionHash,
} from '../src/merge/claudeMd.js';

const SECTIONS = [
  { id: 'header', body: '# 示例项目\n\n一句话定位。' },
  { id: 'commands', body: '## 常用命令\n\n```bash\nnpm test\n```' },
  { id: 'handoff', body: '## 交接协议\n\n- 收工要 commit。' },
];

const unmarkedFixture = readFileSync(
  fileURLToPath(new URL('./fixtures/claude-md/unmarked.md', import.meta.url)),
  'utf8',
);

describe('哈希与规整', () => {
  it('行尾空白与首尾空行不影响哈希', () => {
    expect(sectionHash('## A\n内容')).toBe(sectionHash('\n\n## A   \n内容\t\n\n'));
  });
});

describe('parseDoc 四态', () => {
  it('composeDoc → parseDoc 往返:marked,节序与内容保持', () => {
    const doc = composeDoc(SECTIONS, '## 当前进度\n\n- 状态:新建');
    const parsed = parseDoc(doc);
    expect(parsed.state).toBe('marked');
    const ids = parsed.segments.filter((s) => s.kind === 'section').map((s) => s.id);
    expect(ids).toEqual(['header', 'commands', 'handoff']);
    expect(doc).toContain('## 当前进度');
  });

  it('无任何标记 → unmarked', () => {
    expect(parseDoc(unmarkedFixture).state).toBe('unmarked');
  });

  it('begin 无 end / end 无 begin / id 错配 / 嵌套 begin → broken', () => {
    expect(parseDoc('<!-- ck:begin a h=00000000 -->\n内容\n').state).toBe('broken');
    expect(parseDoc('内容\n<!-- ck:end a -->\n').state).toBe('broken');
    expect(
      parseDoc('<!-- ck:begin a h=00000000 -->\n内容\n<!-- ck:end b -->\n').state,
    ).toBe('broken');
    expect(
      parseDoc(
        '<!-- ck:begin a h=00000000 -->\n<!-- ck:begin b h=00000000 -->\nx\n<!-- ck:end b -->\n<!-- ck:end a -->\n',
      ).state,
    ).toBe('broken');
  });

  it('h 缺失的 begin 也能解析,storedHash 为 null', () => {
    const doc = '<!-- ck:begin a -->\n内容\n<!-- ck:end a -->\n';
    const parsed = parseDoc(doc);
    expect(parsed.state).toBe('marked');
    const seg = parsed.segments.find((s) => s.kind === 'section');
    expect(seg?.kind === 'section' && seg.storedHash).toBeNull();
  });
});

describe('diffSections 三态判定', () => {
  it('三哈希相等 → unchanged,默认不动', () => {
    const doc = composeDoc(SECTIONS);
    const changes = diffSections(parseDoc(doc), SECTIONS);
    expect(changes.every((c) => c.status === 'unchanged' && !c.apply)).toBe(true);
  });

  it('盘上没改、渲染结果变了 → template-updated,默认替换', () => {
    const doc = composeDoc(SECTIONS);
    const fresh = SECTIONS.map((s) =>
      s.id === 'commands' ? { ...s, body: '## 常用命令\n\n```bash\npnpm test\n```' } : s,
    );
    const changes = diffSections(parseDoc(doc), fresh);
    const commands = changes.find((c) => c.id === 'commands');
    expect(commands?.status).toBe('template-updated');
    expect(commands?.apply).toBe(true);
    expect(changes.filter((c) => c.id !== 'commands').every((c) => c.status === 'unchanged')).toBe(
      true,
    );
  });

  it('用户改过节内容 → user-edited,默认绝不覆盖', () => {
    const doc = composeDoc(SECTIONS).replace('npm test', 'npm test # 我手动加的注释');
    const changes = diffSections(parseDoc(doc), SECTIONS);
    expect(changes.find((c) => c.id === 'commands')?.status).toBe('user-edited');
    expect(changes.find((c) => c.id === 'commands')?.apply).toBe(false);
  });

  it('用户手动改成了与本次渲染相同的内容 → unchanged', () => {
    const stale = SECTIONS.map((s) =>
      s.id === 'commands' ? { ...s, body: '## 旧内容' } : s,
    );
    // 盘上是旧 h + 用户把 body 改成了 fresh 的样子
    const doc = composeDoc(stale).replace('## 旧内容', '## 常用命令\n\n```bash\nnpm test\n```');
    const changes = diffSections(parseDoc(doc), SECTIONS);
    expect(changes.find((c) => c.id === 'commands')?.status).toBe('unchanged');
  });

  it('h 缺失且内容与 fresh 不同 → 保守判 user-edited', () => {
    const doc = '<!-- ck:begin commands -->\n## 别的内容\n<!-- ck:end commands -->\n';
    const changes = diffSections(parseDoc(doc), [SECTIONS[1] as { id: string; body: string }]);
    expect(changes[0]?.status).toBe('user-edited');
  });

  it('盘上没有的节 → new,默认追加', () => {
    const doc = composeDoc(SECTIONS.slice(0, 2));
    const changes = diffSections(parseDoc(doc), SECTIONS);
    expect(changes.find((c) => c.id === 'handoff')?.status).toBe('new');
    expect(changes.find((c) => c.id === 'handoff')?.apply).toBe(true);
  });
});

describe('assemble 重组', () => {
  const prologue = '用户自由前言,不许动。\n\n';
  const epilogue = '\n\n## 当前进度\n\n- 用户自己的进度区。\n';

  function docWithFreeText(): string {
    return prologue + SECTIONS.map((s) => sectionBlock(s.id, s.body)).join('\n\n') + epilogue;
  }

  it('全 unchanged:输出与原文完全一致(字节级)', () => {
    const doc = docWithFreeText();
    const parsed = parseDoc(doc);
    expect(assemble(parsed, diffSections(parsed, SECTIONS))).toBe(doc);
  });

  it('替换一节:标记外内容一字节不动,h 更新为新哈希', () => {
    const doc = docWithFreeText();
    const parsed = parseDoc(doc);
    const freshCommands = { id: 'commands', body: '## 常用命令\n\n```bash\npnpm test\n```' };
    const fresh = SECTIONS.map((s) => (s.id === 'commands' ? freshCommands : s));
    const out = assemble(parsed, diffSections(parsed, fresh));
    expect(out.startsWith(prologue)).toBe(true);
    expect(out.endsWith(epilogue)).toBe(true);
    expect(out).toContain('pnpm test');
    expect(out).not.toContain('\nnpm test\n');
    expect(out).toContain(`h=${sectionHash(freshCommands.body)}`);
    // 再解析一次,新内容判 unchanged(写入即自洽)
    const again = diffSections(parseDoc(out), fresh);
    expect(again.every((c) => c.status === 'unchanged')).toBe(true);
  });

  it('user-edited 节默认保留;强制 apply 才覆盖', () => {
    const doc = docWithFreeText().replace('npm test', 'npm test # 手改');
    const parsed = parseDoc(doc);
    const changes = diffSections(parsed, SECTIONS);
    expect(assemble(parsed, changes)).toBe(doc);
    const forced = changes.map((c) => (c.id === 'commands' ? { ...c, apply: true } : c));
    expect(assemble(parsed, forced)).not.toContain('手改');
  });

  it('new 节追加到文末,前文原样保留', () => {
    const doc = prologue + sectionBlock('header', SECTIONS[0]!.body) + '\n';
    const parsed = parseDoc(doc);
    const out = assemble(parsed, diffSections(parsed, SECTIONS));
    expect(out.startsWith(prologue)).toBe(true);
    expect(out).toContain('ck:begin commands');
    expect(out).toContain('ck:begin handoff');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('孤儿节(本次不再生成)原样保留', () => {
    const orphan = sectionBlock('legacy', '## 老节\n\n还在。');
    const doc = docWithFreeText() + '\n' + orphan + '\n';
    const parsed = parseDoc(doc);
    const out = assemble(parsed, diffSections(parsed, SECTIONS));
    expect(out).toContain('## 老节');
    expect(out).toContain('ck:begin legacy');
  });
});

describe('无标记文档的追加方案', () => {
  it('planAppend:已有同名标题的节跳过,已有 H1 时 header 跳过', () => {
    const { include, skipped } = planAppend(unmarkedFixture, SECTIONS);
    expect(skipped.map((s) => s.id)).toContain('header');
    expect(skipped.map((s) => s.id)).toContain('commands'); // fixture 里有「## 常用命令」
    expect(include.map((s) => s.id)).toEqual(['handoff']);
  });

  it('appendToUnmarked:原文保留,追加块带标记,文末单个换行', () => {
    const out = appendToUnmarked(unmarkedFixture, [SECTIONS[2] as { id: string; body: string }]);
    expect(out.startsWith(unmarkedFixture.replace(/\s+$/, ''))).toBe(true);
    expect(out).toContain('ck:begin handoff');
    expect(out.endsWith('-->\n')).toBe(true);
  });
});
