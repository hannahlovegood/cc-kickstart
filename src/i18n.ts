import type { Lang } from './types.js';

const MESSAGES = {
  intro: {
    zh: 'cc-kickstart — 给你的项目配好 CLAUDE.md、示例 skills 和推荐设置(全程本地,不联网)',
    en: 'cc-kickstart — set up CLAUDE.md, example skills and recommended settings (fully local, no network)',
  },
  'q.lang': { zh: '界面和生成文件用哪种语言?', en: 'Language for the UI and generated files?' },
  'q.projectName': { zh: '项目名?', en: 'Project name?' },
  'q.projectName.empty': { zh: '项目名不能为空', en: 'Project name must not be empty' },
  'q.type': { zh: '项目类型?', en: 'Project type?' },
  'type.web': { zh: 'Web 前端', en: 'Web frontend' },
  'type.web.hint': { zh: 'React / Vue / Svelte / Vite 等', en: 'React / Vue / Svelte / Vite etc.' },
  'type.node': { zh: 'Node 后端', en: 'Node backend' },
  'type.fullstack': { zh: '全栈', en: 'Full-stack' },
  'type.python': { zh: 'Python', en: 'Python' },
  'type.other': { zh: '其他', en: 'Other' },
  'q.pm': { zh: '包管理器?', en: 'Package manager?' },
  'q.pm.detected': { zh: '检测到 {file}', en: 'detected {file}' },
  'pm.uv.hint': { zh: '推荐', en: 'recommended' },
  'q.test': { zh: '测试框架?', en: 'Test framework?' },
  'test.node-test': { zh: 'node:test(内置)', en: 'node:test (built-in)' },
  'test.none': { zh: '暂无', en: 'None yet' },
  'q.style': { zh: '代码规范工具?', en: 'Lint/format tooling?' },
  'style.biome': { zh: 'Biome', en: 'Biome' },
  'style.biome.hint': { zh: 'lint + format 一个工具搞定', en: 'lint + format in one tool' },
  'style.eslint-prettier': { zh: 'ESLint + Prettier', en: 'ESLint + Prettier' },
  'style.ruff': { zh: 'Ruff', en: 'Ruff' },
  'style.none': { zh: '暂无', en: 'None yet' },
  'q.worktree': {
    zh: '要用 git worktree 并行开多任务吗?(选是会把 worktree 班规写进交接协议)',
    en: 'Use git worktrees for parallel tasks? (adds worktree rules to the handoff protocol)',
  },
  'q.agents': {
    zh: '同时生成 AGENTS.md(Codex/Cursor 等跨工具通用),CLAUDE.md 只留一行 @AGENTS.md 引用?',
    en: 'Also generate AGENTS.md (shared with Codex/Cursor etc.), keeping CLAUDE.md as a one-line @AGENTS.md shell?',
  },
  'q.skills': {
    zh: '生成哪些示例 skill?(空格勾选,回车确认)',
    en: 'Which example skills to generate? (space to toggle, enter to confirm)',
  },
  'skill.commit-helper': {
    zh: 'commit 规范助手(收工交接式提交)',
    en: 'commit helper (handoff-style commits)',
  },
  'skill.test-gen': { zh: '测试生成器', en: 'test generator' },
  'skill.test-gen.noTest': {
    zh: '你没选测试框架,生成后需自己补命令',
    en: 'no test framework selected — fill in the command later',
  },
  'plan.title': { zh: '将写入以下文件', en: 'Files to be written' },
  'kind.create': { zh: '新建', en: 'create' },
  'kind.update-sections': { zh: '更新 {n} 节', en: 'update {n} section(s)' },
  'kind.sidecar': { zh: '写建议稿(不碰你的原文件)', en: 'write proposal (your file untouched)' },
  'kind.ask-unmarked': {
    zh: '已有文件且无标记,写入前会问你怎么处理',
    en: 'exists without markers — you will be asked how to proceed',
  },
  'kind.merge-json': { zh: '合并(只增不改,新增 {n} 条)', en: 'merge (add-only, {n} addition(s))' },
  'kind.skip-exists': { zh: '已存在,跳过', en: 'exists, skipped' },
  'kind.skip-unchanged': { zh: '无变化', en: 'unchanged' },
  'kind.skip-invalid': { zh: '不是合法 JSON,跳过', en: 'invalid JSON, skipped' },
  'confirm.write': { zh: '确认写入?', en: 'Write these files?' },
  cancelled: { zh: '已取消,没有写入任何文件。', en: 'Cancelled. No files were written.' },
  'merge.selectSections': {
    zh: '{file} 已有 cc-kickstart 标记,勾选要更新的节:',
    en: '{file} has cc-kickstart markers. Select sections to update:',
  },
  'section.updated': { zh: '(有更新)', en: '(updated)' },
  'section.userEdited': {
    zh: '(你改过,勾选会覆盖你的修改)',
    en: '(you edited this — selecting will overwrite your changes)',
  },
  'section.new': { zh: '(新增)', en: '(new)' },
  'unmarked.title': {
    zh: '检测到已有 {file}(无 cc-kickstart 标记),怎么处理?',
    en: 'Existing {file} detected (no cc-kickstart markers). How to proceed?',
  },
  'unmarked.append': {
    zh: '在文件末尾追加推荐段落(自动跳过已有同名标题的节)',
    en: 'Append recommended sections at the end (skipping duplicate headings)',
  },
  'unmarked.sidecar': {
    zh: '写到旁边的 {sidecar},我自己合并',
    en: 'Write to {sidecar} next to it; I will merge manually',
  },
  'unmarked.skip': {
    zh: '跳过 {file},只生成其它文件',
    en: 'Skip {file}; only generate the other files',
  },
  'unmarked.appendSkipped': {
    zh: '已有「{heading}」,该节跳过',
    en: 'heading "{heading}" already exists — section skipped',
  },
  'broken.warn': {
    zh: '{file} 里的 cc-kickstart 标记不完整,按无标记文件处理(不会覆盖任何内容)。',
    en: 'cc-kickstart markers in {file} are incomplete; treating it as unmarked (nothing will be overwritten).',
  },
  'settings.preview': { zh: '.claude/settings.json 将新增:', en: '.claude/settings.json additions:' },
  'settings.conflicts': {
    zh: '这些键与推荐值不同,保留了你现有的值:{paths}',
    en: 'These keys differ from the recommendation; your values were kept: {paths}',
  },
  'settings.invalid.warn': {
    zh: '.claude/settings.json 不是合法 JSON,已跳过(不会覆盖)。',
    en: '.claude/settings.json is not valid JSON; skipped (not overwritten).',
  },
  'shell.skip': {
    zh: '已有 CLAUDE.md,未写 @AGENTS.md 引用壳(内容已进 AGENTS.md)',
    en: 'CLAUDE.md already exists; @AGENTS.md shell not written (content went to AGENTS.md)',
  },
  noChanges: {
    zh: '没有需要更新的内容,一切都是最新的。',
    en: 'Nothing to update — everything is already current.',
  },
  'dryRun.note': { zh: '(dry-run:没有写入任何文件)', en: '(dry-run: no files were written)' },
  'done.written': { zh: '写入 {n} 个文件', en: '{n} file(s) written' },
  'done.skipped': { zh: '跳过 {n} 项', en: '{n} item(s) skipped' },
  'nextSteps.title': { zh: '下一步建议', en: 'Next steps' },
  outro: { zh: '搞定。祝发车顺利!', en: 'Done. Ship it!' },
} as const satisfies Record<string, Record<Lang, string>>;

export type MsgKey = keyof typeof MESSAGES;

export function t(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  let text: string = MESSAGES[key][lang];
  if (vars !== undefined) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
