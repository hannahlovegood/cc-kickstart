import * as p from '@clack/prompts';
import { detect } from './detect.js';
import { t } from './i18n.js';
import { buildPlan, writableActions } from './plan.js';
import { askAnswers, defaultAnswers } from './prompts.js';
import { assertTemplatesPresent } from './templates.js';
import type { Answers, CliFlags, Detected, KickstartConfig } from './types.js';
import { applyPlan, finalizeInteractive, printPlan } from './write.js';
import { printReport } from './report.js';

export function resolveConfig(
  flags: CliFlags,
  answers: Answers,
  detected: Detected,
  cwd: string,
): KickstartConfig {
  return {
    ...answers,
    cwd,
    promo: flags.promo,
    dryRun: flags.dryRun,
    nonInteractive: flags.defaults,
    detected,
    // 谁承载 ck 标记:用户选了 AGENTS.md 模式,或磁盘上 AGENTS.md 已带标记(延续上次)
    targetDoc: answers.agentsMd || detected.agentsMd === 'marked' ? 'AGENTS.md' : 'CLAUDE.md',
  };
}

export async function run(flags: CliFlags): Promise<void> {
  assertTemplatesPresent();
  const cwd = process.cwd();
  const detected = await detect(cwd);
  const answers = flags.defaults
    ? defaultAnswers(flags, detected, cwd)
    : await askAnswers(flags, detected, cwd);
  const cfg = resolveConfig(flags, answers, detected, cwd);
  const { actions, vars } = await buildPlan(cfg);

  if (flags.dryRun) {
    printPlan(actions, cfg.lang);
    p.log.info(t(cfg.lang, 'dryRun.note'));
    return;
  }

  let final = actions;
  if (flags.defaults) {
    if (writableActions(actions).length === 0) {
      printPlan(actions, cfg.lang);
      p.log.info(t(cfg.lang, 'noChanges'));
      return;
    }
    printPlan(actions, cfg.lang);
  } else {
    printPlan(actions, cfg.lang);
    final = await finalizeInteractive(actions, cfg);
    if (writableActions(final).length === 0) {
      p.log.info(t(cfg.lang, 'noChanges'));
      p.outro(t(cfg.lang, 'outro'));
      return;
    }
    const ok = await p.confirm({ message: t(cfg.lang, 'confirm.write'), initialValue: true });
    if (p.isCancel(ok) || ok !== true) {
      p.cancel(t(cfg.lang, 'cancelled'));
      return;
    }
  }

  const result = await applyPlan(final, cfg);
  await printReport(result, cfg, vars);
}
