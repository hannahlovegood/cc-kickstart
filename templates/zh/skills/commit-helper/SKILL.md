---
name: commit-helper
description: 收工提交:盘点改动、按「做了什么+下一步」格式写 commit message、更新 CLAUDE.md 进度区。用法:/commit-helper。用户说"收工/提交/commit/交接"时用这个。
---

# 收工提交(交接式 commit)

commit message 是写给下一个 session 的交接便条,不是流水账。目标:下一手只看 `git log` 就知道从哪接。

## 1. 盘点改动

- `git status` + `git diff` 过一遍:确认没有混进无关文件,没有敏感信息(.env、密钥、真实个人数据)。
{{#if hasLint}}
- 跑 `{{lintCommand}}`,红灯先修再提交。
{{/if}}
{{#if hasTests}}
- 跑 `{{testCommand}}`,测试不过不收工。
{{/if}}

## 2. 更新进度区

- 更新 CLAUDE.md 的「当前进度」:状态一句话、下一步一句话,勾掉已完成的事项。

## 3. 写 message 并提交

- 格式:`<项目或模块>: 做了什么,下一步=什么`
- "做了什么"写结果不写过程;"下一步"具体到能直接开工,不写"继续优化"这类空话。

## 4. 结束语

- 向用户汇报:提交了什么、下一步是什么——最后落到一个今天就能做的具体动作。
