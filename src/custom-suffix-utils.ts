import path from 'node:path';
import type { Config } from '@stencil/core';

export const outputTarget = 'dist-custom-elements';
export const standaloneOutputTarget = 'standalone';
export const relativePath = '../';
export const fileName = 'custom-suffix.json';
export const compnentTypesFile = 'types/components.d.ts';

function hasOutputDirectory(
  target: Config['outputTargets'][number],
): target is Config['outputTargets'][number] & { dir?: string } {
  return 'dir' in target;
}

export class CustomSuffixHelper {
  constructor(stencilConfig: Config) {
    const target = stencilConfig.outputTargets?.find(
      (output) =>
        output.type === standaloneOutputTarget ||
        String(output.type) === outputTarget,
    );
    this.outputDir =
      target && hasOutputDirectory(target) ? (target.dir ?? '') : '';
    this.configPath = path.join(this.outputDir, relativePath, fileName);
    this.typesPath = path.join(this.outputDir, relativePath, compnentTypesFile);
  }
  outputDir: string;
  configPath: string;
  typesPath: string;
}
