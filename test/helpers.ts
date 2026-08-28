import type { Answers, Detected, KickstartConfig } from '../src/types.js';

export function makeDetected(over: Partial<Detected> = {}): Detected {
  return {
    scripts: {},
    hasPackageJson: false,
    hasPyproject: false,
    guessedType: 'other',
    topDirs: [],
    claudeMd: 'none',
    agentsMd: 'none',
    settings: null,
    existingSkills: [],
    ...over,
  };
}

export function makeCfg(
  over: Partial<Answers & KickstartConfig> = {},
  detected: Partial<Detected> = {},
): KickstartConfig {
  return {
    lang: 'zh',
    projectName: 'demo',
    projectType: 'node',
    pm: 'npm',
    test: 'vitest',
    style: 'none',
    worktree: false,
    agentsMd: false,
    skills: ['commit-helper', 'test-gen'],
    cwd: '/tmp/demo',
    promo: true,
    dryRun: false,
    nonInteractive: true,
    targetDoc: 'CLAUDE.md',
    ...over,
    detected: makeDetected(detected),
  };
}
