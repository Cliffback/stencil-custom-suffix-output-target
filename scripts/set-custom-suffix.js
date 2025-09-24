#!/usr/bin/env node
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage(
    'Usage: $0 --set <value> --target <package[@version]> --angular <package[@version]>',
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
    demandOption: true,
    description: 'Target library package name (optionally with @version)',
  })
  .option('angular', {
    alias: 'a',
    type: 'string',
    description: 'Path to angular component wrapper (optionally with @version)',
    demandOption: false,
  })
  .strict()
  .help()
  .parseSync();

const set = String(argv.set);
const target = String(argv.target);
const angular = String(argv.angular);
const suffix = '-' + set;

const require = createRequire(import.meta.url);

// Function to parse package name and version from string like "package@version"
function parsePackageSpec(packageSpec) {
  const atIndex = packageSpec.lastIndexOf('@');
  if (atIndex <= 0) {
    return { name: packageSpec, version: null };
  }
  const name = packageSpec.substring(0, atIndex);
  const version = packageSpec.substring(atIndex + 1);
  return { name, version };
}

// Function to find node_modules directory with .pnpm structure by walking up the directory tree
function findNodeModulesWithPnpm(startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const nodeModulesPath = path.join(currentDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const pnpmPath = path.join(nodeModulesPath, '.pnpm');
      if (fs.existsSync(pnpmPath)) {
        return nodeModulesPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// Function to find the nearest node_modules directory by walking up the directory tree
function findNodeModulesDir(startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const nodeModulesPath = path.join(currentDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// Function to find package directory with version support and pnpm compatibility
function findPackageDirectory(packageSpec) {
  const { name, version } = parsePackageSpec(packageSpec);

  // First try standard npm resolution
  try {
    const resolvedPath = require.resolve(name);
    const packageDir = path.dirname(resolvedPath);

    // If version specified, verify it matches
    if (version) {
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );
        if (packageJson.version !== version) {
          throw new Error(
            `Version mismatch for "${name}": expected ${version}, found ${packageJson.version} at ${packageDir}`,
          );
        }
      } else {
        throw new Error(
          `package.json not found in resolved directory: ${packageDir}`,
        );
      }
    }

    return packageDir;
  } catch (err) {
    // If standard resolution fails and version is specified, try pnpm structure
    if (version) {
      const nodeModulesDir = findNodeModulesWithPnpm();
      if (!nodeModulesDir) {
        throw new Error(
          `No node_modules directory with .pnpm structure found from ${process.cwd()}`,
        );
      }

      const pnpmPath = path.join(
        nodeModulesDir,
        '.pnpm',
        `${name}@${version}`,
        'node_modules',
        name,
      );

      if (fs.existsSync(pnpmPath)) {
        // Verify version in package.json
        const packageJsonPath = path.join(pnpmPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8'),
          );
          if (packageJson.version === version) {
            console.log(
              `Found package "${name}@${version}" in pnpm structure: ${pnpmPath}`,
            );
            return pnpmPath;
          } else {
            throw new Error(
              `Version mismatch in pnpm structure for "${name}": expected ${version}, found ${packageJson.version} at ${pnpmPath}`,
            );
          }
        } else {
          throw new Error(
            `package.json not found in pnpm directory: ${pnpmPath}`,
          );
        }
      }

      // Try to provide helpful error message
      const availablePnpmDirs = [];
      const pnpmBaseDir = path.join(nodeModulesDir, '.pnpm');
      if (fs.existsSync(pnpmBaseDir)) {
        try {
          const entries = fs.readdirSync(pnpmBaseDir);
          entries.forEach((entry) => {
            if (entry.startsWith(`${name}@`)) {
              availablePnpmDirs.push(entry);
            }
          });
        } catch (readErr) {
          // Ignore read errors
        }
      }

      if (availablePnpmDirs.length > 0) {
        throw new Error(
          `Package "${name}@${version}" not found. Available versions in pnpm: ${availablePnpmDirs.join(', ')}`,
        );
      } else {
        throw new Error(
          `Package "${name}@${version}" not found in standard npm resolution or pnpm structure`,
        );
      }
    }

    // Re-throw original error if no version specified
    throw new Error(`Package "${name}" could not be resolved: ${err.message}`);
  }
}

// Set the suffix in the target package
let pkgDir;
try {
  pkgDir = findPackageDirectory(target);
} catch (err) {
  console.error(`Could not resolve target package "${target}".`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const distPrefix = fs.existsSync(path.resolve(pkgDir, 'dist')) ? 'dist/' : '';
const configFilePath = path.resolve(pkgDir, `${distPrefix}custom-suffix.json`);

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

// Patch the angular wrapper package
let angularPkgDir;
try {
  angularPkgDir = findPackageDirectory(angular);
} catch (err) {
  console.error(`Could not resolve angular wrapper package "${angular}".`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

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

const filesToPatch = [
  `${distPrefix}fesm5.js`,
  `${distPrefix}fesm2015.js`,
  `${distPrefix}directives/proxies.d.ts`,
];

filesToPatch.forEach((f) => {
  const filePath = path.join(angularPkgDir, `./${f}`);
  if (fs.existsSync(filePath)) {
    transformTagInFile(filePath);
  } else {
    console.log(`Warning: File not found, skipping: ${filePath}`);
  }
});

console.log(`\nAngular wrapper patched successfully for "${angular}"`);
console.log(`Files patched: ${filesToPatch.join(', ')}\n`);
