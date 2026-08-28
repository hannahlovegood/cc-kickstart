import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** e2e/pack 测试 spawn 的是构建产物,这里保证 dist 存在且新鲜(tsup 是 esbuild,秒级)。 */
export default function setup(): void {
  execSync('npx tsup', { cwd: root, stdio: 'pipe' });
  if (!existsSync(new URL('../dist/index.js', import.meta.url))) {
    throw new Error('global-setup: tsup 构建后 dist/index.js 不存在');
  }
}
