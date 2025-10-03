import path from 'node:path';
import type { Config } from '@stencil/core';

export const outputTarget = 'dist-custom-elements';
export const relativePath = '../';
export const fileName = 'custom-suffix.json';

export class CustomSuffixHelper {
  constructor(stencilConfig: Config) {
    this.outputDir =
      stencilConfig.outputTargets?.find(
        (target) => target.type === 'dist-custom-elements',
      )?.dir ?? '';
    this.configPath = path.join(this.outputDir, relativePath, fileName);
  }
  outputDir: string;
  configPath: string;
}
