1. Open CLAUDE.md and replace the (parenthesized) placeholders with your project's reality — "Ground rules" and "Directory structure" are worth filling in first.
2. Start claude and say "read CLAUDE.md and restate the working rules as you understand them" to verify the handoff protocol actually took effect.
3. After finishing one task, try the wrap-up flow: tell Claude "wrap up" and it will follow the commit-helper skill through commit and progress update.
{{#if agentsMd}}
4. Codex / Cursor and other tools read AGENTS.md directly — one set of rules, effective on both sides, no duplicate maintenance.
{{/if}}
{{#if promo}}

Found the templates useful? A full "Claude Code battle-tested template pack" is in the works (12+ scenario templates, real project case studies, continuously updated):
https://github.com/hannahlovegood/cc-kickstart#template-pack
(Use --no-promo to turn this notice off)
{{/if}}
