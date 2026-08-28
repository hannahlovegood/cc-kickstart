import type { KickstartConfig, PackageManager } from './types.js';

const PM_ALLOW: Record<PackageManager, string[]> = {
  npm: ['Bash(npm run:*)', 'Bash(npm test:*)', 'Bash(npm install)'],
  pnpm: ['Bash(pnpm run:*)', 'Bash(pnpm test:*)', 'Bash(pnpm install)'],
  yarn: ['Bash(yarn run:*)', 'Bash(yarn test:*)', 'Bash(yarn install)'],
  bun: ['Bash(bun run:*)', 'Bash(bun test:*)', 'Bash(bun install)'],
  uv: ['Bash(uv run:*)', 'Bash(uv sync)'],
  pip: ['Bash(pytest:*)', 'Bash(pip install -r requirements.txt)'],
};

/**
 * 精选通配的起步 allowlist(替代逐条批准攒出来的一次性流水账)+ 极小 deny 集。
 * 刻意不生成 hooks/env:那些随 Claude Code 版本漂移快,留给用户按需加。
 */
export function buildSettings(cfg: KickstartConfig): Record<string, unknown> {
  const allow = [
    ...PM_ALLOW[cfg.pm],
    'Bash(git status)',
    'Bash(git diff:*)',
    'Bash(git log:*)',
    'Bash(git add:*)',
    'Bash(git commit:*)',
  ];
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    permissions: {
      allow,
      deny: ['Read(.env)', 'Read(.env.*)'],
    },
  };
}
