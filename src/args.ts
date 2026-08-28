import type { CliFlags, Lang } from './types.js';

export class ArgsError extends Error {}

const HELP_TEXT = `cc-kickstart — scaffold CLAUDE.md, Claude Code skills and settings
用法: npx cc-kickstart [选项]

  --defaults      跳过问答,全部使用默认值(非交互)
  --dry-run       只打印将写入的文件计划,不落盘
  --lang zh|en    界面与生成文件的语言(默认进问答第一题选)
  --agents        同时生成 AGENTS.md + CLAUDE.md 引用壳(--defaults 时生效)
  --no-promo      不打印结尾的模板包链接
  -v, --version   版本号
  -h, --help      本帮助
`;

export function helpText(): string {
  return HELP_TEXT;
}

export function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    defaults: false,
    dryRun: false,
    promo: true,
    agents: false,
    help: false,
    version: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--defaults':
        flags.defaults = true;
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--no-promo':
        flags.promo = false;
        break;
      case '--agents':
        flags.agents = true;
        break;
      case '--lang': {
        const value = argv[++i];
        if (value !== 'zh' && value !== 'en') {
          throw new ArgsError(`--lang 只接受 zh 或 en,收到: ${value ?? '(空)'}`);
        }
        flags.lang = value satisfies Lang;
        break;
      }
      case '-h':
      case '--help':
        flags.help = true;
        break;
      case '-v':
      case '--version':
        flags.version = true;
        break;
      default:
        throw new ArgsError(`未知参数: ${arg}(--help 查看用法)`);
    }
  }
  return flags;
}
