import * as p from '@clack/prompts';
import { t } from './i18n.js';
import { render, type TemplateVars } from './render.js';
import { NEXT_STEPS_TEMPLATE, loadTemplate } from './templates.js';
import type { KickstartConfig, WriteResult } from './types.js';

export async function printReport(
  result: WriteResult,
  cfg: KickstartConfig,
  vars: TemplateVars,
): Promise<void> {
  const { lang } = cfg;
  const summary: string[] = [];
  if (result.written.length > 0) {
    summary.push(t(lang, 'done.written', { n: result.written.length }));
  }
  if (result.skipped.length > 0) {
    summary.push(t(lang, 'done.skipped', { n: result.skipped.length }));
  }
  if (summary.length > 0) p.log.success(summary.join(' · '));

  const tpl = await loadTemplate(lang, NEXT_STEPS_TEMPLATE);
  const steps = render(tpl, vars, NEXT_STEPS_TEMPLATE).trimEnd();
  p.note(steps, t(lang, 'nextSteps.title'));
  p.outro(t(lang, 'outro'));
}
