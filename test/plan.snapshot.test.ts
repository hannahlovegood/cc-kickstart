import { describe, expect, it } from 'vitest';
import { buildPlan } from '../src/plan.js';
import { makeCfg } from './helpers.js';

// 固定时间让快照稳定;date 只会出现在首建的进度区
const NOW = new Date(2026, 0, 2, 3, 4, 5);

// 快照即评审界面:改 templates/ 文案后跑测试,diff 里直接看到生成产物的变化。
describe('buildPlan 快照(代表性配置)', () => {
  it('zh · web + pnpm + vitest + eslint-prettier + worktree · 空目录', async () => {
    const cfg = makeCfg(
      {
        projectType: 'web',
        pm: 'pnpm',
        test: 'vitest',
        style: 'eslint-prettier',
        worktree: true,
      },
      { guessedType: 'web', topDirs: ['public', 'src'] },
    );
    const { actions } = await buildPlan(cfg, NOW);
    expect(actions).toMatchSnapshot();
  });

  it('en · python + uv + pytest + ruff', async () => {
    const cfg = makeCfg(
      { lang: 'en', projectType: 'python', pm: 'uv', test: 'pytest', style: 'ruff' },
      { guessedType: 'python', hasPyproject: true },
    );
    const { actions } = await buildPlan(cfg, NOW);
    expect(actions).toMatchSnapshot();
  });

  it('zh · node + npm + 真实 scripts', async () => {
    const cfg = makeCfg(
      {},
      {
        hasPackageJson: true,
        guessedType: 'node',
        scripts: { dev: 'tsx src/index.ts', test: 'vitest run', check: 'a && b' },
      },
    );
    const { actions } = await buildPlan(cfg, NOW);
    expect(actions).toMatchSnapshot();
  });

  it('zh · AGENTS.md 模式 + no-promo:内容进 AGENTS.md,CLAUDE.md 是引用壳', async () => {
    const cfg = makeCfg({ agentsMd: true, targetDoc: 'AGENTS.md', promo: false });
    const { actions, vars } = await buildPlan(cfg, NOW);
    expect(vars.agentsMd).toBe(true);
    const paths = actions.map((a) => `${a.kind}:${a.path}`);
    expect(paths).toContain('create:AGENTS.md');
    expect(paths).toContain('create:CLAUDE.md');
    const shell = actions.find((a) => a.path === 'CLAUDE.md');
    expect(shell?.content?.startsWith('@AGENTS.md')).toBe(true);
    expect(actions).toMatchSnapshot();
  });
});
