export type Lang = 'zh' | 'en';
export type ProjectType = 'web' | 'node' | 'fullstack' | 'python' | 'other';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'uv' | 'pip';
export type TestFramework = 'vitest' | 'jest' | 'node-test' | 'pytest' | 'none';
export type StyleTool = 'biome' | 'eslint-prettier' | 'ruff' | 'none';
export type SkillId = 'commit-helper' | 'test-gen';

export const SKILL_IDS: readonly SkillId[] = ['commit-helper', 'test-gen'];

export interface CliFlags {
  defaults: boolean;
  dryRun: boolean;
  /** 默认 true;--no-promo 关闭结尾的模板包链接 */
  promo: boolean;
  lang?: Lang;
  agents: boolean;
  help: boolean;
  version: boolean;
}

/** 标记文档的四态:不存在 / 带 ck 标记 / 存在但无标记 / 标记损坏 */
export type DocState = 'none' | 'marked' | 'unmarked' | 'broken';

export interface Detected {
  pkgName?: string;
  scripts: Record<string, string>;
  hasPackageJson: boolean;
  hasPyproject: boolean;
  lockfilePm?: PackageManager;
  guessedType: ProjectType;
  guessedTest?: TestFramework;
  guessedStyle?: StyleTool;
  /** 一层子目录名,已排除 node_modules/.git 等噪音,封顶 12 个 */
  topDirs: string[];
  claudeMd: DocState;
  claudeMdText?: string;
  agentsMd: DocState;
  agentsMdText?: string;
  /** null=不存在;'invalid'=存在但不是合法 JSON */
  settings: Record<string, unknown> | null | 'invalid';
  existingSkills: string[];
}

export interface Answers {
  lang: Lang;
  projectName: string;
  projectType: ProjectType;
  pm: PackageManager;
  test: TestFramework;
  style: StyleTool;
  worktree: boolean;
  agentsMd: boolean;
  skills: SkillId[];
}

export interface KickstartConfig extends Answers {
  cwd: string;
  promo: boolean;
  dryRun: boolean;
  nonInteractive: boolean;
  detected: Detected;
  /** ck 标记块住在哪个文件(agentsMd 开、或磁盘上 AGENTS.md 已带标记时为 AGENTS.md) */
  targetDoc: 'CLAUDE.md' | 'AGENTS.md';
}

export type SectionStatus =
  /** 三哈希相等,无需动 */
  | 'unchanged'
  /** 用户没改过,但本次渲染结果不同(模板/配置更新了) */
  | 'template-updated'
  /** 用户改过节内内容——默认绝不覆盖 */
  | 'user-edited'
  /** 盘上还没有这个节 */
  | 'new';

export interface SectionChange {
  id: string;
  status: SectionStatus;
  /** 本次渲染出的节内容(不含标记行) */
  fresh: string;
  freshHash: string;
  /** 是否应用;交互模式由用户勾选,--defaults 按安全策略定 */
  apply: boolean;
}

export type ActionKind =
  | 'create'
  | 'update-sections'
  | 'sidecar'
  /** 存量文件无标记(或标记损坏),交互模式需三选一;--defaults 下会被解析成 sidecar */
  | 'ask-unmarked'
  | 'merge-json'
  | 'skip-exists'
  | 'skip-unchanged'
  | 'skip-invalid';

export interface FileAction {
  /** 相对 cwd 的路径 */
  path: string;
  kind: ActionKind;
  /** create/sidecar 的完整文件内容 */
  content?: string;
  /** update-sections/ask-unmarked 的逐节变更 */
  sections?: SectionChange[];
  /** merge-json 的合并结果(序列化好的 JSON 文本) */
  mergedJson?: string;
  /** settings 合并新增的行(预览用) */
  addedLines?: string[];
  /** 打印给用户看的一句话说明 */
  note?: string;
}

export interface WriteResult {
  written: string[];
  skipped: { path: string; note: string }[];
}
