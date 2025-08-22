#!/usr/bin/env node
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --set <value>')
  .option('set', {
    alias: 's',
    type: 'string',
    demand: true,
    description: 'The suffix to add to the config',
  })
  .help().argv;

const suffix = '-' + argv.set;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const customSuffixFileName = 'custom-suffix.json';
const configFilePath = path.resolve(__dirname, '../dist/' + customSuffixFileName);

fs.writeFileSync(configFilePath, JSON.stringify(suffix, null, 2));
console.log(`custom-suffix config updated successfully\nnew suffix set: "${suffix}"`);
