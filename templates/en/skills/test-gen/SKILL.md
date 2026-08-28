---
name: test-gen
description: Add tests for a given file or function - read the implementation and existing test style first, then write minimal but real cases and run them green. Usage - /test-gen src/foo.ts. Use when the user says "add tests", "write tests" or "cover this".
---

# Test generator

The point of adding tests is to lock in behavior, not to farm coverage. One assertion that can fail beats ten that are always green.

## 1. Understand before writing

- Read the target implementation and list its behaviors: happy path, boundaries, error paths.
- Look at how existing tests are organized (file location, naming, assertion style) and stay consistent — do not introduce a second style.

## 2. Write minimal real cases

- One case per behavior, named so it reads "input X → result Y".
- Prefer real inputs over mocks; when mocking is unavoidable, mock only at boundaries (network, clock, filesystem).
{{#if isPython}}
- pytest: merge same-shaped cases with parametrize; shared fixtures go in conftest.py.
{{/if}}

## 3. Run to green

{{#if hasTests}}
- Run `{{testCommand}}` until fully green; also confirm the new cases do not visibly slow down the suite.
{{else}}
- This project has no test command yet: set up the test framework and a test entry first, then come back and run the cases green.
{{/if}}

## 4. Closing

- Report: which behaviors are covered, and which edges were **deliberately left untested** and why — an honest gap beats fake full coverage.
