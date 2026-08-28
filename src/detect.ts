import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDoc } from './merge/claudeMd.js';
import type { Detected, DocState, PackageManager, ProjectType } from './types.js';

const WEB_DEPS = [
  'react',
  'vue',
  'svelte',
  'astro',
  'next',
  'nuxt',
  'solid-js',
  'preact',
  '@angular/core',
];

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'target',
  '__pycache__',
  'venv',
]);

const LOCKFILES: readonly { file: string; pm: PackageManager }[] = [
  { file: 'pnpm-lock.yaml', pm: 'pnpm' },
  { file: 'yarn.lock', pm: 'yarn' },
  { file: 'bun.lockb', pm: 'bun' },
  { file: 'bun.lock', pm: 'bun' },
  { file: 'package-lock.json', pm: 'npm' },
  { file: 'uv.lock', pm: 'uv' },
];

const ESLINT_CONFIGS = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
];

async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

function docState(text: string | undefined): DocState {
  if (text === undefined) return 'none';
  return parseDoc(text).state;
}

/** 全部只读探测,任何单项失败都退回保守默认,绝不抛错中断问答。 */
export async function detect(cwd: string): Promise<Detected> {
  let pkgName: string | undefined;
  let scripts: Record<string, string> = {};
  let deps: Record<string, string> = {};
  let hasPackageJson = false;
  const pkgText = await readTextIfExists(join(cwd, 'package.json'));
  if (pkgText !== undefined) {
    hasPackageJson = true;
    try {
      const pkg = JSON.parse(pkgText) as {
        name?: string;
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      pkgName = pkg.name;
      scripts = pkg.scripts ?? {};
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      // package.json 不合法:仍算存在,但拿不到细节
    }
  }

  const pyprojectText = await readTextIfExists(join(cwd, 'pyproject.toml'));
  const hasPyproject =
    pyprojectText !== undefined ||
    existsSync(join(cwd, 'requirements.txt')) ||
    existsSync(join(cwd, 'setup.py'));

  let lockfilePm: PackageManager | undefined;
  for (const { file, pm } of LOCKFILES) {
    if (existsSync(join(cwd, file))) {
      lockfilePm = pm;
      break;
    }
  }

  let guessedType: ProjectType = 'other';
  if (hasPackageJson) {
    guessedType = WEB_DEPS.some((d) => d in deps) ? 'web' : 'node';
  } else if (hasPyproject) {
    guessedType = 'python';
  }

  const guessedTest =
    'vitest' in deps
      ? ('vitest' as const)
      : 'jest' in deps
        ? ('jest' as const)
        : guessedType === 'python' && (pyprojectText?.includes('pytest') ?? false)
          ? ('pytest' as const)
          : undefined;

  const guessedStyle =
    existsSync(join(cwd, 'biome.json')) || existsSync(join(cwd, 'biome.jsonc'))
      ? ('biome' as const)
      : ESLINT_CONFIGS.some((f) => existsSync(join(cwd, f)))
        ? ('eslint-prettier' as const)
        : pyprojectText?.includes('ruff')
          ? ('ruff' as const)
          : undefined;

  let topDirs: string[] = [];
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    topDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !IGNORED_DIRS.has(e.name))
      .map((e) => e.name)
      .sort()
      .slice(0, 12);
  } catch {
    // 读不了目录就留空
  }

  const claudeMdText = await readTextIfExists(join(cwd, 'CLAUDE.md'));
  const agentsMdText = await readTextIfExists(join(cwd, 'AGENTS.md'));

  let settings: Detected['settings'] = null;
  const settingsText = await readTextIfExists(join(cwd, '.claude', 'settings.json'));
  if (settingsText !== undefined) {
    try {
      const parsed: unknown = JSON.parse(settingsText);
      settings =
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : 'invalid';
    } catch {
      settings = 'invalid';
    }
  }

  let existingSkills: string[] = [];
  try {
    const entries = await readdir(join(cwd, '.claude', 'skills'), { withFileTypes: true });
    existingSkills = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // 没有 skills 目录
  }

  return {
    pkgName,
    scripts,
    hasPackageJson,
    hasPyproject,
    lockfilePm,
    guessedType,
    guessedTest,
    guessedStyle,
    topDirs,
    claudeMd: docState(claudeMdText),
    claudeMdText,
    agentsMd: docState(agentsMdText),
    agentsMdText,
    claudeSidecarText: await readTextIfExists(join(cwd, 'CLAUDE.kickstart.md')),
    agentsSidecarText: await readTextIfExists(join(cwd, 'AGENTS.kickstart.md')),
    settings,
    existingSkills,
  };
}
