import { describe, expect, it } from 'vitest';
import { buildCommandVars } from '../src/commands.js';
import type { PackageManager, ProjectType, StyleTool, TestFramework } from '../src/types.js';
import { makeCfg } from './helpers.js';

/** 问答流程允许出现的合法组合(python 与 JS 两族不交叉)。 */
function* validCombos(): Generator<{
  projectType: ProjectType;
  pm: PackageManager;
  test: TestFramework;
  style: StyleTool;
}> {
  const jsTypes: ProjectType[] = ['web', 'node', 'fullstack'];
  const jsPms: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];
  const jsTests: TestFramework[] = ['vitest', 'jest', 'node-test', 'none'];
  const jsStyles: StyleTool[] = ['biome', 'eslint-prettier', 'none'];
  for (const projectType of jsTypes)
    for (const pm of jsPms)
      for (const test of jsTests)
        for (const style of jsStyles) yield { projectType, pm, test, style };
  for (const pm of ['uv', 'pip'] as const)
    for (const test of ['pytest', 'none'] as const)
      for (const style of ['ruff', 'none'] as const)
        yield { projectType: 'python', pm, test, style };
  for (const test of jsTests)
    for (const style of jsStyles) yield { projectType: 'other', pm: 'npm', test, style };
}

describe('buildCommandVars — 查表矩阵', () => {
  it('全部合法组合都能产出带围栏的命令块,不抛错', () => {
    let count = 0;
    for (const combo of validCombos()) {
      count++;
      for (const lang of ['zh', 'en'] as const) {
        const vars = buildCommandVars(makeCfg({ ...combo, lang }));
        expect(vars.commandsBlock.startsWith('```bash\n')).toBe(true);
        expect(vars.commandsBlock.endsWith('\n```')).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(100);
  });

  it('无 scripts 的兜底块带「按常见约定生成」提醒;other 类型给占位注释', () => {
    const js = buildCommandVars(makeCfg({ projectType: 'node' }));
    expect(js.commandsBlock).toContain('常见约定');
    expect(js.hasRealScripts).toBe(false);
    const other = buildCommandVars(makeCfg({ projectType: 'other', test: 'none', style: 'none' }));
    expect(other.commandsBlock).toContain('真实命令补在这里');
    expect(other.commandsBlock).not.toContain('npm install');
  });

  it('python + uv 的关键命令走 uv run', () => {
    const vars = buildCommandVars(
      makeCfg({ projectType: 'python', pm: 'uv', test: 'pytest', style: 'ruff' }),
    );
    expect(vars.testCommand).toBe('uv run pytest');
    expect(vars.lintCommand).toBe('uv run ruff check');
    expect(vars.installCommand).toBe('uv sync');
  });
});

describe('buildCommandVars — 真实 scripts 优先', () => {
  const scripts = {
    zzz: 'echo custom',
    dev: 'vite',
    test: 'vitest run',
    check: 'npm run typecheck && npm run test',
  };

  it('已知 script 按固定顺序在前、配现成注释;未知的排后并留占位注释', () => {
    const vars = buildCommandVars(
      makeCfg({ pm: 'pnpm' }, { hasPackageJson: true, scripts }),
    );
    const lines = vars.commandsBlock.split('\n');
    const devIdx = lines.findIndex((l) => l.startsWith('pnpm dev'));
    const testIdx = lines.findIndex((l) => l.startsWith('pnpm test'));
    const checkIdx = lines.findIndex((l) => l.startsWith('pnpm check'));
    const zzzIdx = lines.findIndex((l) => l.startsWith('pnpm zzz'));
    expect(devIdx).toBeGreaterThan(0);
    expect(testIdx).toBeGreaterThan(devIdx);
    expect(checkIdx).toBeGreaterThan(testIdx);
    expect(zzzIdx).toBeGreaterThan(checkIdx);
    expect(lines[checkIdx]).toContain('一条龙');
    expect(lines[zzzIdx]).toContain('(补一句注释)');
    expect(vars.commandsBlock).not.toContain('常见约定');
    expect(vars.hasCheckScript).toBe(true);
  });

  it('npm 的 test/start 用简写,其余走 npm run', () => {
    const vars = buildCommandVars(
      makeCfg({ pm: 'npm' }, { hasPackageJson: true, scripts: { test: 'x', start: 'y', dev: 'z' } }),
    );
    expect(vars.commandsBlock).toContain('\nnpm test ');
    expect(vars.commandsBlock).toContain('\nnpm start ');
    expect(vars.commandsBlock).toContain('\nnpm run dev ');
    expect(vars.testCommand).toBe('npm test');
  });

  it('注释列对齐:每行 # 出现在同一列', () => {
    const vars = buildCommandVars(
      makeCfg({ pm: 'pnpm' }, { hasPackageJson: true, scripts }),
    );
    const cols = vars.commandsBlock
      .split('\n')
      .filter((l) => l.includes('#'))
      .map((l) => l.indexOf('#'));
    expect(new Set(cols).size).toBe(1);
  });
});
