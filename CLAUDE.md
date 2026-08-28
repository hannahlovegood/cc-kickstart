# cc-kickstart

交互式脚手架 CLI:为任意项目生成 CLAUDE.md、.claude/skills/ 示例 skill 与 .claude/settings.json 推荐配置,并支持对已有文件的非破坏 merge。开源(MIT)引流入口,配套付费「Claude Code 中文实战模板包」。
边界:零后端、零 API key、零遥测、无 GUI、无云端账号——纯本地文件生成,永不联网。

## 铁律(改代码前先读)

- **逻辑归代码,文案归模板**:templates/ 里的 .md 是给用户亲手打磨的,任何"按条件变化的文本拼装"必须在 src/ 里做完、以单变量注入,不许把逻辑塞进模板。两处已论证的例外:settings.json 由 src/settings.ts 代码生成(模板渲染 JSON 会被手改打坏语法);CLI 问句文案在 src/i18n.ts。
- **merge 非破坏铁律**:ck 标记外的内容一字节不许动;用户改过的节(current ≠ stored 哈希)在 --defaults 下绝不覆盖;skills 目录已存在即跳过。任何 merge 改动必须先有 fixtures 测试。
- **幂等硬指标**:同参数连跑两次,第二次必须"无变化"。因此 ck 标记节内禁放时间戳等不确定内容,date 只进首建的进度区。
- **不加运行时依赖**:runtime 依赖只有 @clack/prompts + picocolors,新增依赖先在本文件记录理由再装。
- templates/zh 与 templates/en 逐文件镜像、插槽集合一致——改一边必须同步另一边,templates.test.ts 会红给你看。
- 发布相关(bin/files/publishConfig)不许拍脑袋改:本仓库是这个 vault 第一个 npm 包,没有旧例可抄,改动要过 test/pack.test.ts。

## 常用命令

```bash
npm run dev          # tsx 直跑 src/index.ts(开发用)
npm run build        # tsup → dist/index.js(ESM 单文件,shebang 由 banner 注入)
npm run test         # vitest 全部测试(globalSetup 会先构建一次 dist 供 e2e 用)
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + test + build 一条龙,收工前跑它
```

## 目录结构

- `src/` —— CLI 实现:index(入口)→ args → detect → prompts/i18n → commands(查表)→ render(mini 模板引擎)→ plan(纯计算出文件计划)→ write(唯一写盘处)→ report;merge/ 下是标记块三态判定与 settings 深合并
- `templates/zh|en/` —— 全部用户可见文案:claude-md/ 六个标记节 + progress、agents-shell、sidecar-note、next-steps、skills/ 两个示例
- `test/` —— vitest 单测 + fixtures/(merge 四态样本、settings 样本)+ e2e/pack 冒烟

## 已查证的技术前提(别再踩)

- npm 上 `claude-kickstart` 已被日本 Cradle 公司同类产品占用(2026-03),故名 cc-kickstart;`create-claude`/`claude-init`/`claude-md` 也全被占。备胎名:kickstart-md、ck-kickstart。
- 模板定位唯一可靠方式是 `new URL('../templates/', import.meta.url)`——npx/pnpm dlx 的缓存目录布局各异,凡 process.cwd() 相对路径必炸;pack.test.ts 在真实解包布局下验证这条。
- shebang 放 tsup `banner: { js: '#!/usr/bin/env node' }`,不写在 src 源文件顶部(入口重构会静默丢 hashbang)。
- picocolors 必须显式声明进 dependencies:pnpm 严格 node_modules 不允许裸 import 传递依赖。
- @clack/prompts 现役版本是 1.x(设计期资料多为 0.x,API 以装到的版本为准)。

## 交接协议(每次收工必做)

开工:先读下方「当前进度」+ `git log --oneline -10`。
收工三件事:①更新「当前进度」(状态/下一步各一句)②commit,message 格式 `cc-kickstart: 做了什么,下一步=什么`,提交前 `npm run check` 绿 ③新约定回写本文件对应小节。
本仓库是 vault 嵌套独立仓库:在本仓库 commit + push;外层 vault 只在里程碑收工时更新 `_dashboard.md`。
完整设计方案存档:`~/.claude/plans/claude-kickstart-claude-md-squishy-wigderson.md`。

## 当前进度

- 状态:M2 完成(2026-08-28)——全链路可跑:问答/defaults → detect → plan → merge 三态 → 写盘 → 报告;66 个测试全绿(渲染器/查表矩阵/探测/模板镜像/merge 四态 fixtures/settings 合并/快照×4/e2e 幂等双跑/pack 布局);拿 gloss-auditor 真实手写 CLAUDE.md 实弹演练过:旁车生成、原文件逐字节未动。
- 下一步:M3——双语 README(GIF 占位+非官方声明+竞品差异 FAQ)、npm pack 清单人工过一遍、(可选)ci.yml、外层看板收工;发布卡在 npm 登录。
- 已知边界:交互分支(clack 多选/三选一)无法在无 TTY 的自动化里跑,靠共享的 plan/write 纯函数测试兜底,发布前建议真人跑一遍交互流程。
- 用户待办(卡点):① npm 账号注册/登录(`npm login`,发布必需)② 爱发电/Gumroad 商品页(现用 GitHub README 锚点占位,上架后替换 templates/*/next-steps.md 与 README 里的链接)。
- 最近一次交接:2026-08-28 M2 收工,核心实现+测试全绿。
