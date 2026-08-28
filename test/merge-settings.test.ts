import { describe, expect, it } from 'vitest';
import { mergeSettings, serializeSettings } from '../src/merge/settingsJson.js';

const INCOMING = {
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  permissions: {
    allow: ['Bash(npm run:*)', 'Bash(git status)'],
    deny: ['Read(.env)', 'Read(.env.*)'],
  },
};

describe('mergeSettings — 只增不改', () => {
  it('空现有配置:全部新增', () => {
    const r = mergeSettings({}, INCOMING);
    expect(r.changed).toBe(true);
    expect(r.merged).toEqual(INCOMING);
    expect(r.conflicts).toEqual([]);
    expect(r.addedLines.length).toBeGreaterThan(0);
  });

  it('数组做保序并集:现有在前,新增去重追加', () => {
    const existing = { permissions: { allow: ['Bash(git status)', 'Bash(自定义)'] } };
    const r = mergeSettings(existing, INCOMING);
    expect((r.merged.permissions as { allow: string[] }).allow).toEqual([
      'Bash(git status)',
      'Bash(自定义)',
      'Bash(npm run:*)',
    ]);
    expect(r.addedLines).toContain('permissions.allow += "Bash(npm run:*)"');
  });

  it('标量冲突:保留现有值并记入 conflicts', () => {
    const existing = { $schema: '别的schema', permissions: { allow: [] } };
    const r = mergeSettings(existing, INCOMING);
    expect(r.merged.$schema).toBe('别的schema');
    expect(r.conflicts).toContain('$schema');
  });

  it('类型冲突(对象 vs 数组):保留现有', () => {
    const existing = { permissions: { deny: { weird: true } } };
    const r = mergeSettings(existing, INCOMING);
    expect((r.merged.permissions as Record<string, unknown>).deny).toEqual({ weird: true });
    expect(r.conflicts).toContain('permissions.deny');
  });

  it('现有的无关深层结构原样保留', () => {
    const existing = { hooks: { Stop: [{ hooks: [] }] }, permissions: { allow: [] } };
    const r = mergeSettings(existing, INCOMING);
    expect(r.merged.hooks).toEqual({ Stop: [{ hooks: [] }] });
  });

  it('幂等:合并结果再合并一次 → changed=false', () => {
    const once = mergeSettings({ permissions: { allow: ['X'] } }, INCOMING);
    const twice = mergeSettings(once.merged, INCOMING);
    expect(twice.changed).toBe(false);
    expect(twice.merged).toEqual(once.merged);
  });
});

describe('serializeSettings', () => {
  it('2 空格缩进 + 末尾换行', () => {
    const s = serializeSettings({ a: 1 });
    expect(s).toBe('{\n  "a": 1\n}\n');
  });
});
