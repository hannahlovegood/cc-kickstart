---
name: commit-helper
description: Wrap-up commits - review changes, write the commit message in "what was done + next step" format, update the CLAUDE.md progress section. Usage - /commit-helper. Use when the user says "wrap up", "commit", "handoff" or "check in".
---

# Wrap-up commit (handoff-style)

A commit message is a handoff note to the next session, not a changelog entry. Goal: the next session knows where to pick up from `git log` alone.

## 1. Review the changes

- Go through `git status` + `git diff`: confirm no unrelated files slipped in and no sensitive data (.env, keys, real personal data).
{{#if hasLint}}
- Run `{{lintCommand}}`; fix red before committing.
{{/if}}
{{#if hasTests}}
- Run `{{testCommand}}`; never wrap up on failing tests.
{{/if}}

## 2. Update the progress section

- Update "Current progress" in CLAUDE.md: one sentence of status, one of next step; tick off finished items.

## 3. Write the message and commit

- Format: `<project or module>: what was done, next=what comes next`
- "What was done" states outcomes, not process; "next" must be concrete enough to start on — no filler like "keep improving".

## 4. Closing

- Report to the user: what was committed and what comes next — ending with one concrete action doable today.
