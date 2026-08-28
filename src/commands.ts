import type { KickstartConfig, Lang, PackageManager, ProjectType, StyleTool, TestFramework } from './types.js';

export interface CommandVars {
  commandsBlock: string;
  testCommand: string;
  installCommand: string;
  runPrefix: string;
  lintCommand: string;
  hasRealScripts: boolean;
  hasCheckScript: boolean;
}

interface CmdEntry {
  cmd: string;
  note: Record<Lang, string>;
}

const JS_PMS: readonly PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];

const RUN_PREFIX: Record<PackageManager, string> = {
  npm: 'npm run',
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'bun run',
  uv: 'uv run',
  pip: '',
};

/** 直接执行本地依赖二进制的前缀(无 scripts 时的兜底命令用) */
const EXEC_PREFIX: Record<PackageManager, string> = {
  npm: 'npx',
  pnpm: 'pnpm exec',
  yarn: 'yarn',
  bun: 'bunx',
  uv: 'uv run',
  pip: '',
};

const INSTALL_CMD: Record<PackageManager, CmdEntry> = {
  npm: { cmd: 'npm install', note: { zh: '安装依赖', en: 'install dependencies' } },
  pnpm: { cmd: 'pnpm install', note: { zh: '安装依赖', en: 'install dependencies' } },
  yarn: { cmd: 'yarn install', note: { zh: '安装依赖', en: 'install dependencies' } },
  bun: { cmd: 'bun install', note: { zh: '安装依赖', en: 'install dependencies' } },
  uv: { cmd: 'uv sync', note: { zh: '同步依赖(含锁文件)', en: 'sync dependencies (lockfile)' } },
  pip: {
    cmd: 'pip install -r requirements.txt',
    note: { zh: '安装依赖', en: 'install dependencies' },
  },
};

function testCmd(test: Exclude<TestFramework, 'none'>, pm: PackageManager): CmdEntry {
  const exec = EXEC_PREFIX[pm];
  switch (test) {
    case 'vitest':
      return { cmd: `${exec} vitest run`.trim(), note: { zh: '跑全部测试', en: 'run all tests' } };
    case 'jest':
      return { cmd: `${exec} jest`.trim(), note: { zh: '跑全部测试', en: 'run all tests' } };
    case 'node-test':
      return { cmd: 'node --test', note: { zh: '跑全部测试(内置)', en: 'run all tests (built-in)' } };
    case 'pytest':
      return {
        cmd: pm === 'uv' ? 'uv run pytest' : 'pytest',
        note: { zh: '跑全部测试', en: 'run all tests' },
      };
  }
}

function styleCmds(style: Exclude<StyleTool, 'none'>, pm: PackageManager): CmdEntry[] {
  const exec = EXEC_PREFIX[pm];
  switch (style) {
    case 'biome':
      return [
        { cmd: `${exec} biome check .`.trim(), note: { zh: 'lint + 格式检查', en: 'lint + format check' } },
      ];
    case 'eslint-prettier':
      return [
        { cmd: `${exec} eslint .`.trim(), note: { zh: '代码检查', en: 'lint' } },
        { cmd: `${exec} prettier --check .`.trim(), note: { zh: '格式检查', en: 'format check' } },
      ];
    case 'ruff':
      return [
        {
          cmd: pm === 'uv' ? 'uv run ruff check' : 'ruff check',
          note: { zh: '代码检查', en: 'lint' },
        },
      ];
  }
}

function typeExtras(type: ProjectType, pm: PackageManager): CmdEntry[] {
  const run = RUN_PREFIX[pm];
  switch (type) {
    case 'web':
    case 'fullstack':
      return [
        { cmd: `${run} dev`, note: { zh: '本地开发', en: 'local dev server' } },
        { cmd: `${run} build`, note: { zh: '构建产物', en: 'production build' } },
      ];
    case 'node':
      return [{ cmd: `${run} dev`, note: { zh: '本地开发', en: 'local dev' } }];
    case 'python':
      return [
        {
          cmd: pm === 'uv' ? 'uv run python main.py' : 'python main.py',
          note: { zh: '运行入口(换成你的)', en: 'run entry point (adjust)' },
        },
      ];
    case 'other':
      return [];
  }
}

/** 已知 script 名的展示顺序与现成注释;不在表里的 script 排后面并留待补注释。 */
const KNOWN_SCRIPTS: readonly { name: string; note: Record<Lang, string> }[] = [
  { name: 'dev', note: { zh: '本地开发', en: 'local dev' } },
  { name: 'start', note: { zh: '启动', en: 'start' } },
  { name: 'build', note: { zh: '构建产物', en: 'production build' } },
  { name: 'preview', note: { zh: '预览构建产物', en: 'preview the build' } },
  { name: 'test', note: { zh: '跑全部测试', en: 'run all tests' } },
  { name: 'test:watch', note: { zh: '测试监听模式', en: 'tests in watch mode' } },
  { name: 'test:e2e', note: { zh: '端到端测试', en: 'end-to-end tests' } },
  { name: 'typecheck', note: { zh: '类型检查', en: 'typecheck' } },
  { name: 'lint', note: { zh: '代码检查', en: 'lint' } },
  { name: 'format', note: { zh: '格式化', en: 'format' } },
  { name: 'check', note: { zh: 'typecheck + test + build 一条龙', en: 'typecheck + test + build in one go' } },
];

function scriptCmd(pm: PackageManager, name: string): string {
  const jsPm = (JS_PMS as readonly string[]).includes(pm) ? pm : 'npm';
  switch (jsPm) {
    case 'npm':
      return name === 'test' || name === 'start' ? `npm ${name}` : `npm run ${name}`;
    case 'pnpm':
      return `pnpm ${name}`;
    case 'yarn':
      return `yarn ${name}`;
    default:
      return `bun run ${name}`;
  }
}

function fence(entries: CmdEntry[], lang: Lang, caveat: string | null): string {
  const lines: string[] = [];
  if (caveat !== null) lines.push(`# ${caveat}`);
  if (entries.length === 0) {
    lines.push(
      lang === 'zh' ? '# (把项目的真实命令补在这里)' : '# (fill in your project’s real commands)',
    );
  } else {
    const width = Math.max(...entries.map((e) => e.cmd.length)) + 2;
    for (const e of entries) lines.push(e.cmd.padEnd(width) + `# ${e.note[lang]}`);
  }
  return '```bash\n' + lines.join('\n') + '\n```';
}

export function buildCommandVars(cfg: KickstartConfig): CommandVars {
  const { lang, pm, test, style, projectType } = cfg;
  const scripts = cfg.detected.scripts;
  const scriptNames = Object.keys(scripts);
  const hasRealScripts = scriptNames.length > 0;
  const hasCheckScript = scriptNames.includes('check');

  let entries: CmdEntry[];
  let caveat: string | null = null;
  if (hasRealScripts) {
    const known = KNOWN_SCRIPTS.filter((k) => scriptNames.includes(k.name));
    const rest = scriptNames.filter((n) => !KNOWN_SCRIPTS.some((k) => k.name === n));
    entries = [
      ...known.map((k) => ({ cmd: scriptCmd(pm, k.name), note: k.note })),
      ...rest.map((n) => ({
        cmd: scriptCmd(pm, n),
        note: { zh: '(补一句注释)', en: '(add a note)' } as Record<Lang, string>,
      })),
    ];
  } else {
    entries = [];
    if (projectType !== 'other') {
      entries.push(INSTALL_CMD[pm]);
      entries.push(...typeExtras(projectType, pm));
      if (test !== 'none') entries.push(testCmd(test, pm));
      if (style !== 'none') entries.push(...styleCmds(style, pm));
      caveat =
        lang === 'zh'
          ? '以下按常见约定生成,请对照项目实际校准'
          : 'generated from common conventions — adjust to match reality';
    }
  }

  const testCommand =
    hasRealScripts && scriptNames.includes('test')
      ? scriptCmd(pm, 'test')
      : test !== 'none'
        ? testCmd(test, pm).cmd
        : '';
  const lintCommand =
    hasRealScripts && scriptNames.includes('lint')
      ? scriptCmd(pm, 'lint')
      : style !== 'none'
        ? (styleCmds(style, pm)[0] as CmdEntry).cmd
        : '';

  return {
    commandsBlock: fence(entries, lang, caveat),
    testCommand,
    installCommand: INSTALL_CMD[pm].cmd,
    runPrefix: RUN_PREFIX[pm],
    lintCommand,
    hasRealScripts,
    hasCheckScript,
  };
}
