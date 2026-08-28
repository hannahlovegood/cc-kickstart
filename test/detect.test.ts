import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detect } from '../src/detect.js';
import { composeDoc } from '../src/merge/claudeMd.js';

const dirs: string[] = [];
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-detect-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

describe('detect', () => {
  it('空目录:other / 全 none / settings null', async () => {
    const d = await detect(scratch());
    expect(d.guessedType).toBe('other');
    expect(d.hasPackageJson).toBe(false);
    expect(d.claudeMd).toBe('none');
    expect(d.agentsMd).toBe('none');
    expect(d.settings).toBeNull();
    expect(d.existingSkills).toEqual([]);
  });

  it('react + pnpm-lock + vitest + eslint 配置 → web/pnpm/vitest/eslint-prettier', async () => {
    const dir = scratch();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        scripts: { dev: 'vite' },
        dependencies: { react: '^19' },
        devDependencies: { vitest: '^4' },
      }),
    );
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
    writeFileSync(join(dir, 'eslint.config.js'), '');
    mkdirSync(join(dir, 'src'));
    mkdirSync(join(dir, 'node_modules'));
    mkdirSync(join(dir, '.claude'));
    const d = await detect(dir);
    expect(d.pkgName).toBe('my-app');
    expect(d.guessedType).toBe('web');
    expect(d.lockfilePm).toBe('pnpm');
    expect(d.guessedTest).toBe('vitest');
    expect(d.guessedStyle).toBe('eslint-prettier');
    expect(d.scripts).toEqual({ dev: 'vite' });
    expect(d.topDirs).toEqual(['src']); // node_modules 与 .claude 被排除
  });

  it('pyproject(含 pytest/ruff)+ uv.lock → python/uv/pytest/ruff', async () => {
    const dir = scratch();
    writeFileSync(
      join(dir, 'pyproject.toml'),
      '[project]\nname = "py-app"\n[tool.ruff]\n[tool.pytest.ini_options]\n',
    );
    writeFileSync(join(dir, 'uv.lock'), '');
    const d = await detect(dir);
    expect(d.guessedType).toBe('python');
    expect(d.lockfilePm).toBe('uv');
    expect(d.guessedTest).toBe('pytest');
    expect(d.guessedStyle).toBe('ruff');
  });

  it('CLAUDE.md 三态 + AGENTS.md 标记 + settings 有效/无效 + 已有 skills', async () => {
    const dir = scratch();
    writeFileSync(join(dir, 'CLAUDE.md'), '# 手写的\n\n没有标记。\n');
    writeFileSync(join(dir, 'AGENTS.md'), composeDoc([{ id: 'header', body: '# A' }]));
    mkdirSync(join(dir, '.claude', 'skills', 'commit-helper'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'settings.json'), '{ 不是JSON');
    const d = await detect(dir);
    expect(d.claudeMd).toBe('unmarked');
    expect(d.agentsMd).toBe('marked');
    expect(d.settings).toBe('invalid');
    expect(d.existingSkills).toEqual(['commit-helper']);

    const dir2 = scratch();
    writeFileSync(join(dir2, 'CLAUDE.md'), '<!-- ck:begin a h=00000000 -->\n断头\n');
    writeFileSync(join(dir2, '.claude') + '.tmp', ''); // 干扰项
    mkdirSync(join(dir2, '.claude'));
    writeFileSync(join(dir2, '.claude', 'settings.json'), '{"permissions":{"allow":[]}}');
    const d2 = await detect(dir2);
    expect(d2.claudeMd).toBe('broken');
    expect(d2.settings).toEqual({ permissions: { allow: [] } });
  });
});
