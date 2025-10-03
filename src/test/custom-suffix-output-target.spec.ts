import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import { testData } from './custom-suffix-output-target.data';
import {
  mockSetup,
  TestComponentSetup,
} from './custom-suffix-output-target.spec-utils.ts';

describe('customSuffixOutputTarget', () => {
  const setup = new TestComponentSetup({
    tagName: 'my-component',
    dependencies: ['stn-button', 'stn-checkbox'],
    outputPath: '/mock-output-dir',
  });

  beforeEach(() => {
    mockSetup(setup);
  });

  it('should process files in the output directory', async () => {
    const outputTarget = customSuffixOutputTarget();

    await outputTarget.generator(...setup.generatorParams);

    expect(setup.compiler.fs.readFile).toHaveBeenCalledWith(setup.fullPath);
    expect(setup.compiler.fs.writeFile).toHaveBeenCalledWith(
      setup.fullPath,
      expect.any(String),
    );

    const patchedContent = await setup.compiler.fs.readFile(setup.fullPath);
    expect(patchedContent).toBe(testData.expectedOutput);
  });

  it('should skip processing if tagNameTransform is not enabled', async () => {
    if (setup.config.extras) {
      setup.config.extras.tagNameTransform = false;
      const outputTarget = customSuffixOutputTarget();
      await outputTarget.generator(...setup.generatorParams);

      expect(setup.compiler.fs.readFile).not.toHaveBeenCalled();
    }
  });
});
