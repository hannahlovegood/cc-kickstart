## Ground rules (read before changing code)

Write the "never do this" list here, each with a why — an AI only respects a rule when it knows the reason behind it.

- Destructive operations (deleting files, touching production data, force-pushing) require asking a human first. No exceptions.
- Report results honestly: if tests are red, say red; if a step was skipped, say so. "Should be fine" is not verification.
{{#if isWeb}}
- UI changes must be verified in a real browser before wrapping up: zero console errors, no horizontal overflow on desktop and mobile viewports, main interaction flow actually clicked through.
{{/if}}
{{#if isPython}}
- Dependencies go into the project manifest (pyproject/requirements) only; no ad-hoc installs without a lockfile update.
{{/if}}
{{#if hasLint}}
- Lint/format must pass before every commit — no bypassing, no disabling rules to get to green.
{{/if}}
- (Add your project's own red lines: which file must never be touched? Which API has a hidden contract? Which incident must not repeat?)
