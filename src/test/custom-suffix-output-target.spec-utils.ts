import type { FsWriteResults } from '@stencil/core/compiler/sys/in-memory-fs';
import type * as d from '@stencil/core/internal';
import {
  mockBuildCtx,
  mockCompilerCtx,
  mockModule,
  mockValidatedConfig,
} from '@stencil/core/testing';
import { testData } from './custom-suffix-output-target.data.ts';

export class TestComponentSetup {
  tagName: string;
  dependencies: string[];
  outputPath: string;
  config: d.ValidatedConfig;
  compiler: d.CompilerCtx;
  build: d.BuildCtx;
  fileSystem: d.CompilerSystem;
  docs: d.JsonDocs;

  constructor({
    tagName,
    dependencies,
    outputPath,
  }: { tagName: string; dependencies: string[]; outputPath: string }) {
    this.tagName = tagName;
    this.dependencies = dependencies;
    this.outputPath = outputPath;
  }

  get fullPath(): string {
    return `${this.outputPath}/${this.tagName}.js`;
  }

  get generatorParams(): [
    d.ValidatedConfig,
    d.CompilerCtx,
    d.BuildCtx,
    d.JsonDocs,
  ] {
    return [this.config, this.compiler, this.build, this.docs];
  }
}

export const mockSetup = (setup: TestComponentSetup) => {
  if (setup === undefined) {
    throw new Error('Component is required');
  }

  setup.docs = {
    components: [],
    timestamp: '',
    compiler: {
      name: '',
      version: '',
      typescriptVersion: '',
    },
    typeLibrary: {},
  };
  setup.config = mockValidatedConfig({
    extras: { tagNameTransform: true },
    outputTargets: [{ type: 'dist-custom-elements', dir: setup.outputPath }],
  });

  setup.fileSystem = setup.config.sys;

  setup.compiler = mockCompilerCtx(setup.config);

  setup.compiler = {
    ...setup.compiler,
    fs: {
      ...setup.compiler.fs,
      readFile: jest.fn((filePath: string) => {
        if (filePath.endsWith('2.js')) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(setup.fileSystem[filePath] ?? testData.input);
      }),
      writeFile: jest.fn((filePath: string, content: string) => {
        setup.fileSystem[filePath] = content;
        return Promise.resolve({} as FsWriteResults);
      }),
    },
  };

  setup.compiler.moduleMap.set(
    'test',
    mockModule({
      cmps: [
        stubComponentCompilerMeta({
          tagName: setup.tagName,
          dependencies: setup.dependencies,
        }),
      ],
    }),
  );
  setup.build = mockBuildCtx(setup.config, setup.compiler);
  setup.build = {
    ...setup.build,
    components: [setup.tagName, ...setup.dependencies].map((tagName) =>
      stubComponentCompilerMeta({ tagName: tagName }),
    ),
  };
};

// Function not exported in @stencil/core/internal so we copied it
const stubComponentCompilerMeta = (
  overrides: Partial<d.ComponentCompilerMeta> = {},
): d.ComponentCompilerMeta => ({
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
