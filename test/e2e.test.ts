import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const CLI = fileURLToPath(new URL('../dist/index.js', import.meta.url));

const dirs: string[] = [];
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-e2e-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

function runCli(args: string[], cwd: string): { stdout: string; status: number } {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { stdout: r.stdout + r.stderr, status: r.status ?? -1 };
}

describe('e2e(构建产物冒烟)', () => {
  it('--version / --help', () => {
    const dir = scratch();
    const v = runCli(['--version'], dir);
    expect(v.status).toBe(0);
    expect(v.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    const h = runCli(['--help'], dir);
    expect(h.status).toBe(0);
    expect(h.stdout).toContain('--defaults');
    expect(runCli(['--nope'], dir).status).toBe(1);
  });

  it('--defaults --dry-run:打印计划,不写任何文件', () => {
    const dir = scratch();
    const r = runCli(['--defaults', '--dry-run'], dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('CLAUDE.md');
    expect(r.stdout).toContain('dry-run');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('--defaults 实写(带 package.json 的 node 项目)+ 第二次跑幂等', () => {
    const dir = scratch();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'e2e-app',
        scripts: { test: 'vitest run' },
        devDependencies: { vitest: '^4' },
      }),
    );
    const first = runCli(['--defaults'], dir);
    expect(first.status).toBe(0);

    const claudeMd = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd.match(/<!-- ck:begin /g)?.length).toBe(6);
    expect(claudeMd).toContain('## 当前进度');
    for (const skill of ['commit-helper', 'test-gen']) {
      const skillMd = readFileSync(join(dir, '.claude', 'skills', skill, 'SKILL.md'), 'utf8');
      expect(skillMd.startsWith(`---\nname: ${skill}\n`)).toBe(true);
    }
    const settings = JSON.parse(
      readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(
      ((settings.permissions as Record<string, unknown>).allow as string[]).length,
    ).toBeGreaterThan(0);

    const second = runCli(['--defaults'], dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('没有需要更新');
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe(claudeMd);
  });

  it('空目录 --defaults:推断为「其他」类型,只生成 commit-helper', () => {
    const dir = scratch();
    expect(runCli(['--defaults'], dir).status).toBe(0);
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toContain('真实命令补在这里');
    expect(existsSync(join(dir, '.claude', 'skills', 'commit-helper', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(dir, '.claude', 'skills', 'test-gen'))).toBe(false);
  });

  it('--defaults --agents:AGENTS.md 带标记,CLAUDE.md 是引用壳', () => {
    const dir = scratch();
    expect(runCli(['--defaults', '--agents'], dir).status).toBe(0);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents.match(/<!-- ck:begin /g)?.length).toBe(6);
    const shell = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    expect(shell.startsWith('@AGENTS.md')).toBe(true);
  });

  it('--lang en:生成英文内容;promo 开关生效', () => {
    const withPromo = scratch();
    const r1 = runCli(['--defaults', '--lang', 'en'], withPromo);
    expect(r1.status).toBe(0);
    expect(readFileSync(join(withPromo, 'CLAUDE.md'), 'utf8')).toContain('## Ground rules');
    expect(r1.stdout).toContain('github.com/hannahlovegood/cc-kickstart');

    const noPromo = scratch();
    const r2 = runCli(['--defaults', '--no-promo'], noPromo);
    expect(r2.status).toBe(0);
    expect(r2.stdout).not.toContain('github.com/hannahlovegood/cc-kickstart');
  });

  it('存量无标记 CLAUDE.md:--defaults 走旁车,原文件一字节不动;再跑幂等', () => {
    const dir = scratch();
    const original = '# 我的手写班规\n\n## 常用命令\n\n自定义内容。\n';
    writeFileSync(join(dir, 'CLAUDE.md'), original);
    expect(runCli(['--defaults'], dir).status).toBe(0);
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe(original);
    const sidecar = readFileSync(join(dir, 'CLAUDE.kickstart.md'), 'utf8');
    expect(sidecar).toContain('ck:begin header');

    const again = runCli(['--defaults'], dir);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('没有需要更新');
  });

  it('标记损坏的 CLAUDE.md:按无标记处理并告警,原文件不动', () => {
    const dir = scratch();
    const brokenText = '<!-- ck:begin header h=00000000 -->\n断头文件\n';
    writeFileSync(join(dir, 'CLAUDE.md'), brokenText);
    const r = runCli(['--defaults'], dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('标记不完整');
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe(brokenText);
    expect(readFileSync(join(dir, 'CLAUDE.kickstart.md'), 'utf8')).toContain('ck:begin');
  });

  it('已有同名 skill 与合法 settings:跳过 skill,settings 只增不改', () => {
    const dir = scratch();
    const mine = '---\nname: commit-helper\n---\n\n# 我自己的版本\n';
    const settingsBefore = { permissions: { allow: ['Bash(自定义)'], deny: [] }, model: 'opus' };
    const skillDir = join(dir, '.claude', 'skills', 'commit-helper');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), mine);
    writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify(settingsBefore));

    expect(runCli(['--defaults'], dir).status).toBe(0);
    expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf8')).toBe(mine);
    const merged = JSON.parse(
      readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'),
    ) as typeof settingsBefore;
    expect(merged.model).toBe('opus');
    expect(merged.permissions.allow[0]).toBe('Bash(自定义)');
    expect(merged.permissions.allow).toContain('Bash(npm run:*)');
  });
});
