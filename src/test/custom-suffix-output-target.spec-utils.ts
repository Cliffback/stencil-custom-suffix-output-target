import * as d from '@stencil/core/internal';
import { mockModule, mockCompilerCtx, mockBuildCtx, mockValidatedConfig } from '@stencil/core/testing';
import { testData } from './custom-suffix-output-target.data';
import { FsWriteResults } from '@stencil/core/compiler/sys/in-memory-fs';

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

interface SetupParams {
  config: d.ValidatedConfig;
  compiler: d.CompilerCtx;
  build: d.BuildCtx;
  fileSystem: d.CompilerSystem;
  docs: d.JsonDocs;
  component?: TestComponentSetup;
}

export class TestComponentSetup {
  tagName: string;
  dependencies: string[];
  outputPath: string;

  constructor({ tagName, dependencies, outputPath }: { tagName: string; dependencies: string[]; outputPath: string }) {
    this.tagName = tagName;
    this.dependencies = dependencies;
    this.outputPath = outputPath;
  }

  get fullPath(): string {
    return `${this.outputPath}/${this.tagName}.js`;
  }
}

export const setup = ({ config, compiler, build, fileSystem, docs, component }: SetupParams): SetupParams => {
  if (component === undefined) {
    throw new Error('Component is required');
  }

  docs = {
    components: [],
    timestamp: '',
    compiler: {
      name: '',
      version: '',
      typescriptVersion: '',
    },
    typeLibrary: {},
  };
  config = mockValidatedConfig({
    extras: { tagNameTransform: true },
    outputTargets: [{ type: 'dist-custom-elements', dir: component.outputPath }],
  });

  fileSystem = config.sys;

  compiler = mockCompilerCtx(config);

  compiler = {
    ...compiler,
    fs: {
      ...compiler.fs,
      readdir: jest.fn().mockResolvedValue([{ relPath: component.tagName + '.js' }]),
      readFile: jest.fn((filePath: string) => {
        return Promise.resolve(fileSystem[filePath] ?? testData.input);
      }),
      writeFile: jest.fn((filePath: string, content: string) => {
        fileSystem[filePath] = content;
        return Promise.resolve({} as FsWriteResults);
      }),
    },
  };

  compiler.moduleMap.set(
    'test',
    mockModule({
      cmps: [
        stubComponentCompilerMeta({
          tagName: component.tagName,
          dependencies: component.dependencies,
        }),
      ],
    }),
  );
  build = mockBuildCtx(config, compiler);
  build = {
    ...build,
    components: [component.tagName, ...component.dependencies].map(tagName => stubComponentCompilerMeta({ tagName: tagName })),
  };

  return { config, compiler, build, fileSystem, docs };
};

// Function not exported in @stencil/core/internal so we copied it
const stubComponentCompilerMeta = (overrides: Partial<d.ComponentCompilerMeta> = {}): d.ComponentCompilerMeta => ({
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
