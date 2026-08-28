import { createRequire } from 'node:module';
import { ArgsError, helpText, parseArgs } from './args.js';
import { run } from './run.js';

const require = createRequire(import.meta.url);

function version(): string {
  const pkg = require('../package.json') as { version: string };
  return pkg.version;
}

async function main(): Promise<void> {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof ArgsError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  if (flags.help) {
    console.log(helpText());
    return;
  }
  if (flags.version) {
    console.log(version());
    return;
  }
  await run(flags);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
