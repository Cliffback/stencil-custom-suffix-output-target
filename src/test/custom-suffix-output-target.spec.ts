import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import * as d from '@stencil/core/internal';
import { testData } from './custom-suffix-output-target.data';
import { TestComponentSetup, setup } from './custom-suffix-output-target.spec-utils.ts';

describe('customSuffixOutputTarget', () => {
  let config: d.ValidatedConfig;
  let compiler: d.CompilerCtx;
  let build: d.BuildCtx;
  let fileSystem: d.CompilerSystem;
  let docs: d.JsonDocs;

  const component = new TestComponentSetup({
    tagName: 'my-component',
    dependencies: ['stn-button', 'stn-checkbox'],
    outputPath: '/mock-output-dir',
  });

  beforeEach(() => {
    ({ config, compiler, build, fileSystem, docs } = setup({ config, compiler, build, fileSystem, docs, component }));
  });

  it('should process files in the output directory', async () => {
    const outputTarget = customSuffixOutputTarget();

    await outputTarget.generator(config, compiler, build, docs);

    expect(compiler.fs.readdir).toHaveBeenCalledWith(component.outputPath);
    expect(compiler.fs.readFile).toHaveBeenCalledWith(component.fullPath);
    expect(compiler.fs.writeFile).toHaveBeenCalledWith(component.fullPath, expect.any(String));

    const patchedContent = await compiler.fs.readFile(component.fullPath);
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
