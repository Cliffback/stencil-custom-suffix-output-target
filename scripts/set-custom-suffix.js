#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --set <value> --target <package>')
  .option('set', {
    alias: 's',
    type: 'string',
    demandOption: true,
    description: 'The suffix to add to the config',
  })
  .option('target', {
    alias: 't',
    type: 'string',
    demandOption: true,
    description: 'Target library package name',
  })
  .strict()
  .help()
  .parseSync();

const set = String(argv.set);
const target = String(argv.target);
const suffix = '-' + set;

const require = createRequire(import.meta.url);

let pkgEntry;
try {
  pkgEntry = require.resolve(target);
} catch (err) {
  console.error(`ÔØî Could not resolve target package "${target}".`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const pkgDir = path.dirname(pkgEntry);
const configFilePath = path.resolve(pkgDir, 'custom-suffix.json');

try {
  const distDir = path.dirname(configFilePath);
  if (!fs.existsSync(distDir)) {
    console.error(`ÔØî Dist folder not found: ${distDir}`);
    process.exit(1);
  }

  fs.writeFileSync(configFilePath, JSON.stringify(suffix, null, 2));
  console.log(`custom-suffix config updated successfully for "${target}"\n` + `new suffix set: "${suffix}"\n` + `file written to: ${configFilePath}`);
} catch (err) {
  console.error(`ÔØî Failed to write config file at ${configFilePath}`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
