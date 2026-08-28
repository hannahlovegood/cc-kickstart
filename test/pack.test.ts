import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dirs: string[] = [];
afterAll(() => {
  while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

// 全项目头号技术风险的验证:npm 包解开后的真实布局里,
// dist/index.js 能通过 import.meta.url 找到 templates/(npx 冷启动同构)。
describe('npm pack 布局', () => {
  it('打包 → 解包 → 在包外空目录跑 --defaults --dry-run', { timeout: 120_000 }, () => {
    const packDir = mkdtempSync(join(tmpdir(), 'ck-pack-'));
    dirs.push(packDir);
    execFileSync('npm', ['pack', '--pack-destination', packDir], { cwd: ROOT, stdio: 'pipe' });
    const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
    expect(tgz).toBeDefined();

    execFileSync('tar', ['-xzf', tgz as string], { cwd: packDir, stdio: 'pipe' });
    const pkgRoot = join(packDir, 'package');
    // 裸 tarball 没有依赖(npx 安装时才装);软链仓库的 node_modules,
    // 让本测试聚焦在真正的风险——包布局下的模板定位。
    symlinkSync(join(ROOT, 'node_modules'), join(pkgRoot, 'node_modules'), 'dir');
    expect(existsSync(join(pkgRoot, 'dist', 'index.js'))).toBe(true);
    expect(existsSync(join(pkgRoot, 'templates', 'zh', 'claude-md', 'handoff.md'))).toBe(true);
    expect(existsSync(join(pkgRoot, 'templates', 'en', 'claude-md', 'handoff.md'))).toBe(true);
    // 测试夹具不许混进发布包
    expect(existsSync(join(pkgRoot, 'test'))).toBe(false);

    const workDir = mkdtempSync(join(tmpdir(), 'ck-pack-run-'));
    dirs.push(workDir);
    const r = spawnSync(process.execPath, [join(pkgRoot, 'dist', 'index.js'), '--defaults', '--dry-run'], {
      cwd: workDir,
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain('CLAUDE.md');
  });
});
