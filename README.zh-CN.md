# cc-kickstart

**交互式生成 CLAUDE.md、Claude Code skills 与推荐配置——自带交接协议。**

[English →](README.md)

> 非官方社区项目,与 Anthropic 无关联、未获其背书;"Claude" 是 Anthropic, PBC 的商标。

<!-- TODO: 演示 GIF(docs/demo.gif) -->

```bash
npx cc-kickstart
```

回答几个问题,项目就配好了认真使用 Claude Code 需要的一切:

- **`CLAUDE.md`** —— 项目定位、真实可跑的常用命令(从你的 `package.json` scripts 里读,不是编的)、铁律、已查证技术前提,以及一段**交接协议**:让下一个 session(或另一个工具、另一个人)能无损接手。可选 git worktree 并行班规。
- **`.claude/skills/`** —— 两个示例 skill:`commit-helper`(交接式提交:*做了什么 + 下一步*)和 `test-gen`(锁行为的测试,不是凑覆盖率)。
- **`.claude/settings.json`** —— 带通配符的精选权限起步集(`Bash(npm run:*)` 等),替代一条条批出来的流水账;外加 `.env` 的最小 deny 集。
- **`AGENTS.md`(可选)** —— 通用班规放 AGENTS.md 给 Codex/Cursor 等工具共用,CLAUDE.md 只留一行 `@AGENTS.md` 引用壳。一份班规,处处生效。

全程本地:无账号、无 API key、无遥测、不联网。

## 可以放心重跑:非破坏 merge

生成的每一节都包在带内容哈希的标记里:

```
<!-- ck:begin commands h=a1b2c3d4 -->
…
<!-- ck:end commands -->
```

重跑时,cc-kickstart 对每节比较三个哈希(上次写入 / 盘上现状 / 本次渲染):

- 只更新**你从没动过**的节;
- **你改过的节绝不覆盖**(它分得清哪种差异是谁造成的);
- 标记之外的内容一字节不动——你的文字、你的标题,原样保留;
- 已有 CLAUDE.md 但**没有标记**时,默认把建议稿写到旁边的 `CLAUDE.kickstart.md`,你的文件完全不碰(交互模式下也可选择"末尾追加不重复的节")。

同样的回答连跑两次,第二次会告诉你"没有需要更新的内容",什么都不改。这是有测试锁死的硬性质,不是口头承诺。

## 参数

| 参数 | 作用 |
|---|---|
| `--defaults` | 非交互,全用检测出的默认值(适合 CI) |
| `--dry-run` | 只打印文件计划,不写盘 |
| `--lang zh\|en` | 界面与生成文件的语言 |
| `--agents` | 非交互模式下启用 AGENTS.md 双文件架构 |
| `--no-promo` | 关闭结尾的模板包提示 |

## 常见问题

**和 Cradle 公司的 `claude-kickstart` 有什么区别?**
那是一个环境安装器;cc-kickstart 固化的是**你和 Claude 之间的协作班规**:交接协议、诚实的命令清单、可反复安全重跑的 merge——而且生成文案全部放在 `templates/*.md` 纯文本里,每个字都随手可改。

**会不会弄坏我现有的配置?**
不会。已有的 skill 一律跳过;`settings.json` 只增不改(冲突时永远保留你的值);CLAUDE.md 按上面的 merge 规则来。

**Windows 能用吗?**
macOS/Linux 是一等公民,Windows 尽力支持。

## 模板包

付费的「**Claude Code 中文实战模板包**」正在筹备:12+ 场景模板、真实项目案例、持续更新。链接会更新在这一节。

## 开发

```bash
npm install
npm run check   # typecheck + 测试 + 构建一条龙
```

MIT © hannahlovegood
