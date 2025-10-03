import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import { testData, typesTestData } from './custom-suffix-output-target.data';
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

describe('customSuffixOutputTarget - components.d.ts transformation', () => {
  const setup = new TestComponentSetup({
    tagName: 'my-component-one',
    dependencies: ['my-component-two'],
    outputPath: '/mock-output-dir',
  });

  beforeEach(() => {
    mockSetup(setup);
  });

  it('should transform components.d.ts with suffixed interface entries', async () => {
    const outputTarget = customSuffixOutputTarget();

    await outputTarget.generator(...setup.generatorParams);

    // Check that the types file was read and written
    expect(setup.compiler.fs.readFile).toHaveBeenCalledWith(setup.typesPath);
    expect(setup.compiler.fs.writeFile).toHaveBeenCalledWith(
      setup.typesPath,
      expect.any(String),
    );

    // Verify the transformed content
    const transformedTypes = await setup.compiler.fs.readFile(setup.typesPath);
    expect(transformedTypes).toBe(typesTestData.expectedOutput);
  });

  it('should not write components.d.ts if file does not exist', async () => {
    // Mock the readFile to return undefined for types file
    setup.compiler.fs.readFile = jest.fn((filePath: string) => {
      if (filePath === setup.typesPath) {
        return Promise.resolve(undefined);
      }
      if (filePath.endsWith('2.js')) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(testData.input);
    });

    const outputTarget = customSuffixOutputTarget();
    await outputTarget.generator(...setup.generatorParams);

    // Check that we tried to read the types file
    expect(setup.compiler.fs.readFile).toHaveBeenCalledWith(setup.typesPath);

    // Check that we didn't write the types file (since it doesn't exist)
    const writeFileCalls = (setup.compiler.fs.writeFile as jest.Mock).mock
      .calls;
    const typesWriteCalls = writeFileCalls.filter(
      (call) => call[0] === setup.typesPath,
    );
    expect(typesWriteCalls.length).toBe(0);
  });
});
