import { describe, expect, it } from 'vitest';
import { ArgsError, parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('无参数时给出全默认值(promo 默认开)', () => {
    expect(parseArgs([])).toEqual({
      defaults: false,
      dryRun: false,
      promo: true,
      agents: false,
      help: false,
      version: false,
    });
  });

  it('识别全部长短旗标', () => {
    const flags = parseArgs(['--defaults', '--dry-run', '--no-promo', '--agents', '--lang', 'en']);
    expect(flags.defaults).toBe(true);
    expect(flags.dryRun).toBe(true);
    expect(flags.promo).toBe(false);
    expect(flags.agents).toBe(true);
    expect(flags.lang).toBe('en');
    expect(parseArgs(['-v']).version).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('--lang 非 zh/en 报错', () => {
    expect(() => parseArgs(['--lang', 'jp'])).toThrow(ArgsError);
    expect(() => parseArgs(['--lang'])).toThrow(ArgsError);
  });

  it('未知参数报错并提示 --help', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/未知参数.*--help/);
  });
});
