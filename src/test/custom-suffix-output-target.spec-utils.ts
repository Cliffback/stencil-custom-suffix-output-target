import path from 'node:path';
import type { FsWriteResults } from '@stencil/core/compiler/sys/in-memory-fs';
import type * as d from '@stencil/core/internal';
import {
  mockBuildCtx,
  mockCompilerCtx,
  mockModule,
  mockValidatedConfig,
  mockComponentMeta,
} from '@stencil/core/testing';
import { testData, typesTestData } from './custom-suffix-output-target.data.ts';

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

  get typesPath(): string {
    return path.join(this.outputPath, '../', 'types/components.d.ts');
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
        if (filePath === setup.typesPath) {
          return Promise.resolve(
            setup.fileSystem[filePath] ?? typesTestData.input,
          );
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
        mockComponentMeta({
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
      mockComponentMeta({ tagName: tagName }),
    ),
  };
};

