import path from 'node:path';
import type { OutputTargetCustom } from '@stencil/core/compiler';
import { target } from '../custom-suffix-output-target';
import { testData, typesTestData } from './custom-suffix-output-target.data.ts';

type GeneratorParameters = Parameters<
  NonNullable<OutputTargetCustom['generator']>
>;
type ValidatedConfig = GeneratorParameters[0];
type JsonDocs = GeneratorParameters[3];

interface TestComponent {
  tagName: string;
}

interface TestCompilerContext {
  fs: {
    readFile: (filePath: string) => Promise<string | undefined>;
    writeFile: (filePath: string, content: string) => Promise<unknown>;
  };
}

interface TestBuildContext {
  components: TestComponent[];
  debug: jest.Mock;
}

function invokeGenerator(
  generator: NonNullable<OutputTargetCustom['generator']>,
  config: ValidatedConfig,
  compiler: TestCompilerContext,
  build: TestBuildContext,
  docs: JsonDocs,
) {
  // The fixture provides only the compiler fields used by this output target.
  // @ts-expect-error Deliberately narrowed v5 test double.
  return generator(config, compiler, build, docs);
}

export class TestComponentSetup {
  tagName: string;
  dependencies: string[];
  outputPath: string;
  config: ValidatedConfig;
  compiler: TestCompilerContext;
  build: TestBuildContext;
  fileSystem: Record<string, string>;
  docs: JsonDocs;

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

  async runGenerator() {
    return invokeGenerator(
      target().generator,
      this.config,
      this.compiler,
      this.build,
      this.docs,
    );
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
  setup.config = {
    compat: { additionalTagTransformers: true },
    outputTargets: [{ type: 'standalone', dir: setup.outputPath }],
  } as ValidatedConfig;

  setup.fileSystem = {};
  setup.compiler = {
    fs: {
      readFile: jest.fn(async (filePath: string) => {
        if (filePath.endsWith('2.js')) return undefined;
        if (filePath === setup.typesPath)
          return setup.fileSystem[filePath] ?? typesTestData.input;
        return setup.fileSystem[filePath] ?? testData.input;
      }),
      writeFile: jest.fn(async (filePath: string, content: string) => {
        setup.fileSystem[filePath] = content;
      }),
    },
  };
  setup.build = {
    components: [setup.tagName, ...setup.dependencies].map((tagName) => ({
      tagName,
    })),
    debug: jest.fn(),
  };
};
