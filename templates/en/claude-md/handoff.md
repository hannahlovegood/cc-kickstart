## Handoff protocol (mandatory at the end of every session)

Make sure the next session (or another AI tool, or another person) can pick up without loss. Handoff lives in **files and git**, not in chat memory — conversations end, files stay.

**When starting**: read the "Current progress" section of this file plus `git log --oneline -10`. Confirm where the last session stopped and what the agreed next step is. Do not skip this and start coding.

**When wrapping up, do these three things in order:**

1. **Update "Current progress"**: one sentence of status, one sentence of next step. Keep process details out of the progress section — put them under "Verified technical facts" or a separate note.
2. **Commit**: message format `{{projectName}}: what was done, next=what comes next`. "What was done" states outcomes, not process; "next" must be concrete enough to start on directly.{{#if hasTests}} Run `{{testCommand}}` before committing — never wrap up on red.{{/if}}
3. **Write new conventions back**: any new workflow established or new pitfall hit this session goes back into the matching section of this file (ground rules / commands / facts). A convention that only lives in chat does not exist.
{{#if worktree}}

**Worktree rules** (for parallel tasks):

- One worktree per parallel task: `git worktree add ../{{projectName}}-<task> -b <task>`
- Each worktree only touches the files it owns; never edit the same file from two worktrees.
- On completion: merge back to main → `git worktree remove <path>` to clean up. Handoff state lives only in the progress section on main.
{{/if}}

**Closing convention**: end every wrap-up report with one concrete action doable today — never with "polish another round".
