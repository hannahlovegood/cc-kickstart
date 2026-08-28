# cc-kickstart

**Interactive scaffolder for CLAUDE.md, Claude Code skills and settings — with a handoff protocol built in.**

[中文文档 →](README.zh-CN.md)

> Unofficial community project. Not affiliated with or endorsed by Anthropic. "Claude" is a trademark of Anthropic, PBC.

<!-- TODO: demo GIF (docs/demo.gif) -->

```bash
npx cc-kickstart
```

Answer a few questions, get a project set up for serious Claude Code work:

- **`CLAUDE.md`** — project overview, real commands (read from your `package.json` scripts, not guessed), ground rules, verified-facts section, and a **handoff protocol** so the next session (or the next tool, or the next person) picks up exactly where you left off. Optional git-worktree rules for parallel tasks.
- **`.claude/skills/`** — two example skills: `commit-helper` (handoff-style commits: *what was done + what comes next*) and `test-gen` (behavior-locking tests, not coverage farming).
- **`.claude/settings.json`** — a curated starter permission allowlist with wildcards (`Bash(npm run:*)` …) instead of the endless one-off approval log, plus a minimal deny list for `.env` files.
- **`AGENTS.md` (optional)** — put the shared rules in AGENTS.md for Codex/Cursor/etc., with CLAUDE.md as a one-line `@AGENTS.md` shell. One rulebook, every tool.

Fully local. No account, no API key, no telemetry, no network.

## Safe to re-run: non-destructive merge

Generated sections are wrapped in markers that carry a content hash:

```
<!-- ck:begin commands h=a1b2c3d4 -->
…
<!-- ck:end commands -->
```

On re-run, cc-kickstart compares three hashes per section (last written / on disk / freshly rendered) and:

- updates only sections **you never touched**;
- **never overwrites a section you edited** (it can tell the difference);
- never touches anything outside the markers — your prose, your headings, byte for byte;
- for an existing CLAUDE.md *without* markers, it defaults to writing a `CLAUDE.kickstart.md` proposal next to it and leaves your file alone (or, interactively, offers to append non-duplicate sections).

Running twice with the same answers reports "nothing to update" and changes nothing. That's a tested invariant, not a hope.

## Flags

| Flag | Effect |
|---|---|
| `--defaults` | non-interactive, use detected defaults (CI-friendly) |
| `--dry-run` | print the file plan, write nothing |
| `--lang zh\|en` | language for UI and generated files |
| `--agents` | AGENTS.md mode in non-interactive runs |
| `--no-promo` | hide the template-pack notice at the end |

## FAQ

**How is this different from `claude-kickstart` (by Cradle)?**
That tool is an environment installer. cc-kickstart codifies the *working agreement* between you and Claude: the handoff protocol, honest commands, safely re-runnable merges — with every word of the generated copy living in plain `templates/*.md` files you can rewrite.

**Will it clobber my existing setup?**
No. Existing skills are never touched, `settings.json` is merged add-only (your values always win), and CLAUDE.md merging follows the rules above.

**Windows?**
macOS/Linux are first-class; Windows is best-effort.

## Template pack

A paid **Claude Code battle-tested template pack** (12+ scenario templates, real project case studies, continuously updated, in Chinese) is in the works. Watch this section for the link.

## Development

```bash
npm install
npm run check   # typecheck + tests + build in one go
```

MIT © hannahlovegood
