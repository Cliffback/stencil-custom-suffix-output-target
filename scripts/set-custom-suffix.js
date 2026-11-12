#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage(
    'Usage: $0 --set <value> (--target <package> | --target-dir <path>) [--angular <package> | --angular-dir <path>]',
  )
  .option('set', {
    alias: 's',
    type: 'string',
    demandOption: true,
    description: 'The suffix to add to the config',
  })
  .option('target', {
    alias: 't',
    type: 'string',
    description: 'Target library package name',
  })
  .option('target-dir', {
    type: 'string',
    description:
      'Path to the target library package directory, e.g. a `pnpm patch` edit dir',
  })
  .option('angular', {
    alias: 'a',
    type: 'string',
    description: 'Angular component wrapper package name',
  })
  .option('angular-dir', {
    type: 'string',
    description: 'Path to the angular component wrapper package directory',
  })
  .conflicts('target', 'target-dir')
  .conflicts('angular', 'angular-dir')
  .check((args) => {
    if (!args.target && !args.targetDir) {
      throw new Error('One of --target or --target-dir is required');
    }
    return true;
  })
  .strict()
  .help()
  .parseSync();

const suffix = `--${String(argv.set)}`;

function getPackageDir(packageName) {
  const pkgJsonUrl = import.meta.resolve(`${packageName}/package.json`);
  return path.dirname(fileURLToPath(new URL(pkgJsonUrl)));
}

function resolveDistDir(packageName, packageDir) {
  const baseDir = packageDir
    ? path.resolve(packageDir)
    : getPackageDir(packageName);
  return path.join(baseDir, 'dist');
}

// Package managers such as pnpm and bun hardlink node_modules files to a global store
// shared by every project on the machine. Writing to a temp file and renaming it over the
// original replaces the link instead of editing the shared inode.
function writeFileUnlinked(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}

const target = argv.target ?? argv.targetDir;
const targetDistDir = resolveDistDir(argv.target, argv.targetDir);
if (!fs.existsSync(targetDistDir)) {
  throw new Error(`Dist folder not found: ${targetDistDir}`);
}

const configFilePath = path.join(targetDistDir, 'custom-suffix.json');
writeFileUnlinked(configFilePath, JSON.stringify(suffix, null, 2));
console.log(
  `custom-suffix config updated successfully for "${target}"\n` +
    `new suffix set: "${suffix}"\n` +
    `file written to: ${configFilePath}`,
);

const angular = argv.angular || argv.angularDir;
if (!angular) {
  process.exit(0);
}

const angularDistDir = resolveDistDir(argv.angular, argv.angularDir);

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

  writeFileUnlinked(filePath, content);
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
  throw new Error(`No files matched in ${angularDistDir}.`);
}

filesToPatch.forEach((f) => {
  const filePath = path.join(angularDistDir, f);
  transformTagInFile(filePath);
});

console.log(`\nAngular wrapper patched successfully for "${angular}"`);
console.log(`Files patched: ${filesToPatch.join(', ')}\n`);
