import { basename } from 'node:path';
import * as p from '@clack/prompts';
import { t } from './i18n.js';
import type {
  Answers,
  CliFlags,
  Detected,
  Lang,
  PackageManager,
  SkillId,
  StyleTool,
  TestFramework,
} from './types.js';

const LOCKFILE_NAME: Partial<Record<PackageManager, string>> = {
  npm: 'package-lock.json',
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lock',
  uv: 'uv.lock',
};

/** 任何一问取消(Ctrl-C)→ 立刻退出,此时还没有任何写盘动作。 */
function guard<T>(value: T | symbol, lang: Lang): T {
  if (p.isCancel(value)) {
    p.cancel(t(lang, 'cancelled'));
    process.exit(1);
  }
  return value as T;
}

function defaultProjectName(detected: Detected, cwd: string): string {
  return detected.pkgName ?? basename(cwd);
}

function defaultTest(detected: Detected, isPython: boolean, isOther: boolean): TestFramework {
  if (detected.guessedTest !== undefined) return detected.guessedTest;
  if (isPython) return 'pytest';
  if (isOther) return 'none';
  return 'vitest';
}

export function defaultAnswers(flags: CliFlags, detected: Detected, cwd: string): Answers {
  const projectType = detected.guessedType;
  const isPython = projectType === 'python';
  const pm: PackageManager = isPython ? (detected.lockfilePm === 'uv' ? 'uv' : 'uv') : (detected.lockfilePm ?? 'npm');
  const test = defaultTest(detected, isPython, projectType === 'other');
  return {
    lang: flags.lang ?? 'zh',
    projectName: defaultProjectName(detected, cwd),
    projectType,
    pm,
    test,
    style: detected.guessedStyle ?? 'none',
    worktree: false,
    agentsMd: flags.agents,
    skills: test === 'none' ? ['commit-helper'] : ['commit-helper', 'test-gen'],
  };
}

export async function askAnswers(flags: CliFlags, detected: Detected, cwd: string): Promise<Answers> {
  p.intro('cc-kickstart');

  const lang: Lang =
    flags.lang ??
    guard(
      await p.select({
        message: '界面和生成文件用哪种语言? / Language for the UI and generated files?',
        options: [
          { value: 'zh' as const, label: '中文' },
          { value: 'en' as const, label: 'English' },
        ],
        initialValue: 'zh' as Lang,
      }),
      'zh',
    );

  const projectName = guard(
    await p.text({
      message: t(lang, 'q.projectName'),
      initialValue: defaultProjectName(detected, cwd),
      validate: (v) => ((v ?? '').trim() === '' ? t(lang, 'q.projectName.empty') : undefined),
    }),
    lang,
  ).trim();

  const projectType = guard(
    await p.select({
      message: t(lang, 'q.type'),
      options: [
        { value: 'web' as const, label: t(lang, 'type.web'), hint: t(lang, 'type.web.hint') },
        { value: 'node' as const, label: t(lang, 'type.node') },
        { value: 'fullstack' as const, label: t(lang, 'type.fullstack') },
        { value: 'python' as const, label: t(lang, 'type.python') },
        { value: 'other' as const, label: t(lang, 'type.other') },
      ],
      initialValue: detected.guessedType,
    }),
    lang,
  );
  const isPython = projectType === 'python';
  const isOther = projectType === 'other';

  let pm: PackageManager = 'npm';
  if (isPython) {
    pm = guard(
      await p.select({
        message: t(lang, 'q.pm'),
        options: [
          { value: 'uv' as const, label: 'uv', hint: t(lang, 'pm.uv.hint') },
          { value: 'pip' as const, label: 'pip' },
        ],
        initialValue: detected.lockfilePm === 'uv' ? ('uv' as const) : ('uv' as const),
      }),
      lang,
    );
  } else if (!isOther) {
    const detectedPm = detected.lockfilePm;
    pm = guard(
      await p.select({
        message: t(lang, 'q.pm'),
        options: (['npm', 'pnpm', 'yarn', 'bun'] as const).map((value) => ({
          value,
          label: value,
          ...(value === detectedPm
            ? { hint: t(lang, 'q.pm.detected', { file: LOCKFILE_NAME[value] ?? '' }) }
            : {}),
        })),
        initialValue: detectedPm !== undefined && detectedPm !== 'uv' ? detectedPm : ('npm' as PackageManager),
      }),
      lang,
    );
  }

  const test: TestFramework = guard(
    await p.select({
      message: t(lang, 'q.test'),
      options: isPython
        ? [
            { value: 'pytest' as const, label: 'pytest' },
            { value: 'none' as const, label: t(lang, 'test.none') },
          ]
        : [
            { value: 'vitest' as const, label: 'vitest' },
            { value: 'jest' as const, label: 'jest' },
            { value: 'node-test' as const, label: t(lang, 'test.node-test') },
            { value: 'none' as const, label: t(lang, 'test.none') },
          ],
      initialValue: defaultTest(detected, isPython, isOther),
    }),
    lang,
  );

  const style: StyleTool = guard(
    await p.select({
      message: t(lang, 'q.style'),
      options: isPython
        ? [
            { value: 'ruff' as const, label: t(lang, 'style.ruff') },
            { value: 'none' as const, label: t(lang, 'style.none') },
          ]
        : [
            { value: 'biome' as const, label: t(lang, 'style.biome'), hint: t(lang, 'style.biome.hint') },
            { value: 'eslint-prettier' as const, label: t(lang, 'style.eslint-prettier') },
            { value: 'none' as const, label: t(lang, 'style.none') },
          ],
      initialValue:
        detected.guessedStyle ?? (isPython ? ('none' as StyleTool) : ('none' as StyleTool)),
    }),
    lang,
  );

  const worktree = guard(
    await p.confirm({ message: t(lang, 'q.worktree'), initialValue: false }),
    lang,
  );

  let agentsMd = false;
  if (detected.agentsMd === 'marked') {
    agentsMd = true; // 上次就是 AGENTS.md 模式,延续
  } else if (detected.claudeMd === 'none') {
    agentsMd = guard(
      await p.confirm({ message: t(lang, 'q.agents'), initialValue: flags.agents }),
      lang,
    );
  }

  const skills = guard(
    await p.multiselect({
      message: t(lang, 'q.skills'),
      options: [
        { value: 'commit-helper' as const, label: t(lang, 'skill.commit-helper') },
        {
          value: 'test-gen' as const,
          label: t(lang, 'skill.test-gen'),
          ...(test === 'none' ? { hint: t(lang, 'skill.test-gen.noTest') } : {}),
        },
      ],
      initialValues:
        test === 'none' ? (['commit-helper'] as SkillId[]) : (['commit-helper', 'test-gen'] as SkillId[]),
      required: false,
    }),
    lang,
  );

  return { lang, projectName, projectType, pm, test, style, worktree, agentsMd, skills };
}
