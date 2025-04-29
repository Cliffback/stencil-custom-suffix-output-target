import { customSuffixOutputTarget } from '../custom-suffix-output-target';
import { Config } from '@stencil/core';
import { CompilerCtx, BuildCtx, JsonDocs } from '@stencil/core/internal';
import * as d from '@stencil/core/internal';
import { mockModule } from '@stencil/core/testing';
// import { mockBuildCtx, mockCompilerCtx, mockCompilerSystem, mockModule, mockValidatedConfig } from '@stencil/core/testing';

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

export const stubComponentCompilerMeta = (overrides: Partial<d.ComponentCompilerMeta> = {}): d.ComponentCompilerMeta => ({
  assetsDirs: [],
  attachInternalsMemberName: null,
  componentClassName: 'StubCmp',
  dependencies: [],
  dependents: [],
  directDependencies: [],
  directDependents: [],
  docs: { text: 'docs', tags: [] },
  elementRef: '',
  encapsulation: 'none',
  events: [],
  excludeFromCollection: false,
  formAssociated: false,
  hasAttribute: false,
  hasAttributeChangedCallbackFn: false,
  hasComponentDidLoadFn: false,
  hasComponentDidRenderFn: false,
  hasComponentDidUpdateFn: false,
  hasComponentShouldUpdateFn: false,
  hasComponentWillLoadFn: false,
  hasComponentWillRenderFn: false,
  hasComponentWillUpdateFn: false,
  hasConnectedCallbackFn: false,
  hasDisconnectedCallbackFn: false,
  hasElement: false,
  hasEvent: false,
  hasLifecycle: false,
  hasListener: false,
  hasListenerTarget: false,
  hasListenerTargetBody: false,
  hasListenerTargetDocument: false,
  hasListenerTargetParent: false,
  hasListenerTargetWindow: false,
  hasMember: false,
  hasMethod: false,
  hasMode: false,
  hasModernPropertyDecls: false,
  hasProp: false,
  hasPropBoolean: false,
  hasPropMutable: false,
  hasPropNumber: false,
  hasPropString: false,
  hasReflect: false,
  hasRenderFn: false,
  hasState: false,
  hasStyle: false,
  hasVdomAttribute: false,
  hasVdomClass: false,
  hasVdomFunctional: false,
  hasVdomKey: false,
  hasVdomListener: false,
  hasVdomPropOrAttr: false,
  hasVdomRef: false,
  hasVdomRender: false,
  hasVdomStyle: false,
  hasVdomText: false,
  hasVdomXlink: false,
  hasWatchCallback: false,
  htmlAttrNames: [],
  htmlParts: [],
  htmlTagNames: [],
  internal: false,
  isCollectionDependency: false,
  isPlain: false,
  isUpdateable: false,
  jsFilePath: '/some/stubbed/path/my-component.js',
  listeners: [],
  methods: [],
  potentialCmpRefs: [],
  properties: [],
  shadowDelegatesFocus: false,
  sourceFilePath: '/some/stubbed/path/my-component.tsx',
  sourceMapPath: '/some/stubbed/path/my-component.js.map',
  states: [],
  styleDocs: [],
  styles: [],
  tagName: 'stub-cmp',
  virtualProperties: [],
  watchers: [],
  ...overrides,
});

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
        readdir: jest.fn().mockResolvedValue([{ relPath: 'component.js' }]),
        readFile: jest.fn((filePath: string) => {
          return mockFileSystem[filePath] || "document.querySelector('component');";
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
            tagName: 'component',
            dependencies: ['dep1'],
          }),
        ],
      }),
    );
    mockBuildCtx = {
      components: [{ tagName: 'component' }],
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
    expect(mockCompilerCtx.fs.readFile).toHaveBeenCalledWith('/mock-output-dir/component.js');
    expect(mockCompilerCtx.fs.writeFile).toHaveBeenCalledWith('/mock-output-dir/component.js', expect.any(String));

    const patchedContent = await mockCompilerCtx.fs.readFile('/mock-output-dir/component.js');
    expect(patchedContent).toBe('expected string content');
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
