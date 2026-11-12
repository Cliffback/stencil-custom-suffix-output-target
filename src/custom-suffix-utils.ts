import path from 'node:path';
import type { Config } from '@stencil/core';

export const outputTarget = 'standalone';
export const typesOutputTarget = 'types';
export const relativePath = '../';
export const fileName = 'custom-suffix.json';
export const suffixModuleFileName = 'custom-suffix.js';
export const componentTypesFile = 'components.d.ts';
export const fallbackTypesDir = 'types';

type ConfigOutputTarget = NonNullable<Config['outputTargets']>[number];

function hasOutputDirectory(
  target: ConfigOutputTarget,
): target is ConfigOutputTarget & { dir?: string } {
  return 'dir' in target && typeof target.dir === 'string';
}

function outputDirsOfType(stencilConfig: Config, type: string): string[] {
  return (stencilConfig.outputTargets ?? []).flatMap((target) =>
    String(target.type) === type &&
    hasOutputDirectory(target) &&
    target.dir !== undefined
      ? [target.dir]
      : [],
  );
}

export class CustomSuffixHelper {
  constructor(stencilConfig: Config) {
    this.outputDirs = outputDirsOfType(stencilConfig, outputTarget);
    const primaryDir = this.outputDirs[0] ?? '';
    this.configPath = path.join(primaryDir, relativePath, fileName);

    const typesDir =
      outputDirsOfType(stencilConfig, typesOutputTarget)[0] ??
      path.join(primaryDir, relativePath, fallbackTypesDir);
    this.typesPath = path.join(typesDir, componentTypesFile);
  }
  outputDirs: string[];
  configPath: string;
  typesPath: string;
}
