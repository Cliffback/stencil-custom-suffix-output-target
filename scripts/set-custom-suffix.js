#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --set <value> --target <package> --angular <package>')
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
  .option('angular', {
    alias: 'a',
    type: 'string',
    description: 'Path to angular component wrapper',
    demandOption: false,
  })
  .strict()
  .help()
  .parseSync();

const set = String(argv.set);
const target = String(argv.target);
const angular = String(argv.angular);
const suffix = `--${set}`;

function getDistDir(pathStr) {
  try {
    const pkgJsonUrl = import.meta.resolve(`${pathStr}/package.json`);
    const pkgDir = path.dirname(fileURLToPath(new URL(pkgJsonUrl)));
    return path.join(pkgDir, 'dist');
  } catch (err) {
    console.error(`Could not resolve package "${pathStr}".`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const targetDistDir = getDistDir(target);
const configFilePath = path.resolve(targetDistDir, 'custom-suffix.json');

try {
  const distDir = path.dirname(configFilePath);
  if (!fs.existsSync(distDir)) {
    console.error(`Dist folder not found: ${distDir}`);
    process.exit(1);
  }

  fs.writeFileSync(configFilePath, JSON.stringify(suffix, null, 2));
  console.log(
    `custom-suffix config updated successfully for "${target}"\n` +
      `new suffix set: "${suffix}"\n` +
      `file written to: ${configFilePath}`,
  );
} catch (err) {
  console.error(`Failed to write config file at ${configFilePath}`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!angular) {
  process.exit(0);
}

const angularDistDir = getDistDir(angular);

// Function that transforms the selector/tag
function transformTag(str) {
  return suffix ? `${str}${suffix}` : str;
}

// Used to store the original selector in a comment after a transform.
// Useful to keep if one needs to rerun the transform function with the original selector
const originalSelectorComment = 'original-tag: ';

// Regular expression to match component tag (or original tag if present).
// Note: a bit annoying, but sometimes ' is used and other times ".
const tagRegex = `["']([^"'\\[]+)["']`; // ignores directives, i.e. selectors with brackets ('[tag]')
const componentRegex = `${tagRegex}(\\/\\*${originalSelectorComment}${tagRegex}\\*\\/)?`;

// Lookaheads to find location of component tags. Is combined with componentRegex.
const lookaheadRegexList = [
  `(?<=selector:\\s)`, // used in i0.ɵsetClassMetadata: <selector: 'my-button',>
  `(?<=selectors:\\s\\[\\[)`, // used in i0.ɵɵdefineComponent: <selectors: [['my-button']],>
  `(?<=ɵɵComponentDeclaration<[^,]+,\\s*)`, // used in i0.ɵɵComponentDeclaration<MyButton, "my-button",>
];

// Using a lookahead for the tag name, finds all matches and replaces with transformed selector.
function transformTagByLookahead(content, lookahead) {
  const fullRegex = new RegExp(lookahead + componentRegex, 'g');
  return content.replace(fullRegex, (_, tag, __, commentTag) => {
    const originalSelector = commentTag ?? tag;
    return `'${transformTag(originalSelector)}'/*${originalSelectorComment}'${originalSelector}'*/`;
  });
}

function transformTagInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = lookaheadRegexList.reduce(
    (c, l) => transformTagByLookahead(c, l),
    content,
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

const dirEntries = fs.readdirSync(angularDistDir, { withFileTypes: true });
const fesmFiles = dirEntries
  .filter((d) => d.isFile() && /^fesm.*\.js$/i.test(d.name))
  .map((d) => d.name);

const proxiesPath = path.join(angularDistDir, 'directives', 'proxies.d.ts');
const extraFiles = fs.existsSync(proxiesPath)
  ? ['directives/proxies.d.ts']
  : [];

const filesToPatch = [...fesmFiles, ...extraFiles];

if (filesToPatch.length === 0) {
  console.warn(`No files matched in ${angularDistDir}.`);
} else {
  filesToPatch.forEach((f) => {
    const filePath = path.join(angularDistDir, f);
    try {
      transformTagInFile(filePath);
    } catch (err) {
      console.error(`Failed to patch: ${f}`);
      console.error(err instanceof Error ? err.message : err);
    }
  });

  console.log(`\nAngular wrapper patched successfully for "${angular}"`);
  console.log(`Files patched: ${filesToPatch.join(', ')}\n`);
}
