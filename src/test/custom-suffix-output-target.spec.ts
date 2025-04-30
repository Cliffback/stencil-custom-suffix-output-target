import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import * as d from '@stencil/core/internal';
import { testData } from './custom-suffix-output-target.data';
import { Component, setup } from './custom-suffix-output-target.spec-utils.ts';

describe('customSuffixOutputTarget', () => {
  let config: d.ValidatedConfig;
  let compiler: d.CompilerCtx;
  let build: d.BuildCtx;
  let fileSystem: d.CompilerSystem;
  let docs: d.JsonDocs;

  beforeEach(() => {
    const component: Component = {
      tagName: 'my-component',
      dependencies: ['stn-button', 'stn-checkbox'],
    };
    ({ config, compiler, build, fileSystem, docs } = setup({ config, compiler, build, fileSystem, docs, component }));
  });

  it('should process files in the output directory', async () => {
    const outputTarget = customSuffixOutputTarget();

    await outputTarget.generator(config, compiler, build, docs);

    expect(compiler.fs.readdir).toHaveBeenCalledWith('/mock-output-dir');
    expect(compiler.fs.readFile).toHaveBeenCalledWith('/mock-output-dir/my-component.js');
    expect(compiler.fs.writeFile).toHaveBeenCalledWith('/mock-output-dir/my-component.js', expect.any(String));

    const patchedContent = await compiler.fs.readFile('/mock-output-dir/my-component.js');
    expect(patchedContent).toBe(testData.expectedOutput);
  });

  it('should skip processing if tagNameTransform is not enabled', async () => {
    if (config.extras) {
      config.extras.tagNameTransform = false;
      const outputTarget = customSuffixOutputTarget();
      await outputTarget.generator(config, compiler, build, docs);

      expect(compiler.fs.readdir).not.toHaveBeenCalled();
    }
  });
});
