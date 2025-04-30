import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import { Config } from '@stencil/core';
import { CompilerCtx, BuildCtx, JsonDocs } from '@stencil/core/internal';
import * as d from '@stencil/core/internal';
import { mockModule } from '@stencil/core/testing';
import { testData } from './custom-suffix-output-target.data';
// import { mockBuildCtx, mockCompilerCtx, mockCompilerSystem, mockModule, mockValidatedConfig } from '@stencil/core/testing';
import { stubComponentCompilerMeta } from './custom-suffix-output-target.spec-utils.ts';

jest.mock('@stencil/core/internal', () => ({
  ...jest.requireActual('@stencil/core/internal'),
  CompilerCtx: jest.fn(),
  BuildCtx: jest.fn(),
}));

// const setup = () => {
//   const sys = mockCompilerSystem();
//   const config: d.ValidatedConfig = mockValidatedConfig({
//     buildAppCore: true,
//     buildEs5: true,
//     configPath: '/testing-path',
//     namespace: 'TestApp',
//     outputTargets: [{ type: 'dist-custom-elements' }],
//     srcDir: '/scripts/test',
//     sys,
//   });
//   const compilerCtx = mockCompilerCtx(config);
//   const buildCtx = mockBuildCtx(config, compilerCtx);
//
//   compilerCtx.moduleMap.set('test', mockModule());
//
//   return { config, compilerCtx, buildCtx };
// };

describe('customSuffixOutputTarget', () => {
  let mockConfig: Config;
  let mockCompilerCtx: CompilerCtx;
  let mockBuildCtx: BuildCtx;

  let mockFileSystem: Record<string, string>;
  beforeEach(() => {
    mockFileSystem = {};
    mockConfig = {
      extras: { tagNameTransform: true },
      outputTargets: [{ type: 'dist-custom-elements', dir: '/mock-output-dir' }],
    } as unknown as Config;

    mockCompilerCtx = {
      fs: {
        readdir: jest.fn().mockResolvedValue([{ relPath: 'my-component.js' }]),
        readFile: jest.fn((filePath: string) => {
          return mockFileSystem[filePath] || testData.input;
        }),
        writeFile: jest.fn((filePath: string, content: string) => {
          mockFileSystem[filePath] = content;
        }),
      },
      moduleMap: new Map(),
    } as unknown as CompilerCtx;

    mockCompilerCtx.moduleMap.set(
      'test',
      mockModule({
        cmps: [
          stubComponentCompilerMeta({
            tagName: 'my-component',
            dependencies: ['stn-button', 'stn-checkbox'],
          }),
        ],
      }),
    );
    mockBuildCtx = {
      components: [{ tagName: 'my-component' }, { tagName: 'stn-button' }, { tagName: 'stn-checkbox' }],
    } as unknown as BuildCtx;
  });

  it('should process files in the output directory', async () => {
    const outputTarget = customSuffixOutputTarget();
    const mockDocs: JsonDocs = {
      components: [],
      timestamp: '',
      compiler: {
        name: '',
        version: '',
        typescriptVersion: '',
      },
      typeLibrary: {},
    };

    await outputTarget.generator(mockConfig, mockCompilerCtx, mockBuildCtx, mockDocs);

    expect(mockCompilerCtx.fs.readdir).toHaveBeenCalledWith('/mock-output-dir');
    expect(mockCompilerCtx.fs.readFile).toHaveBeenCalledWith('/mock-output-dir/my-component.js');
    expect(mockCompilerCtx.fs.writeFile).toHaveBeenCalledWith('/mock-output-dir/my-component.js', expect.any(String));

    const patchedContent = await mockCompilerCtx.fs.readFile('/mock-output-dir/my-component.js');
    expect(patchedContent).toBe(testData.expectedOutput);
  });

  it('should skip processing if tagNameTransform is not enabled', async () => {
    if (mockConfig.extras) {
      mockConfig.extras.tagNameTransform = false;
      const outputTarget = customSuffixOutputTarget();
      // @ts-expect-error: Ignoring the missing argument for testing purposes
      await outputTarget.generator(mockConfig, mockCompilerCtx, mockBuildCtx);

      expect(mockCompilerCtx.fs.readdir).not.toHaveBeenCalled();
    }
  });
});
