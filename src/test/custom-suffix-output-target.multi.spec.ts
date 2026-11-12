import path from 'node:path';
import {
  chunkedStandaloneTestData,
  standaloneTestData,
} from './custom-suffix-output-target.data.ts';
import {
  mockSetup,
  TestComponentSetup,
} from './custom-suffix-output-target.spec-utils.ts';

const SUFFIX_IMPORT = 'import "./custom-suffix.js";';
const chunkedDir = '/mock/dist/react/components';

describe('customSuffixOutputTarget - multiple standalone outputs', () => {
  const setup = new TestComponentSetup({
    tagName: 'my-component',
    dependencies: ['my-button'],
    outputPath: '/mock/dist/components',
  });
  const chunked = (file: string) => path.join(chunkedDir, file);

  beforeEach(() => {
    mockSetup(setup);
    setup.config.outputTargets = [
      { type: 'standalone', dir: setup.outputPath },
      {
        type: 'standalone',
        dir: chunkedDir,
        minify: true,
        externalRuntime: false,
      },
    ] as typeof setup.config.outputTargets;
    Object.assign(setup.fileSystem, {
      [chunked('index.js')]: chunkedStandaloneTestData.index,
      [chunked('my-component.js')]: chunkedStandaloneTestData.component,
      [chunked('my-button.js')]: chunkedStandaloneTestData.dependency,
    });
  });

  it('writes a suffix module to every output using its own runtime', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem[setup.suffixModulePath]).toContain(
      'import { f as setTagTransformer } from "./runtime.js";',
    );
    expect(setup.fileSystem[chunked('custom-suffix.js')]).toContain(
      'import { c as setTagTransformer } from "./p-runtime.js";',
    );
  });

  it('points every suffix module at the shared config', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem[setup.suffixModulePath]).toContain(
      'import suffix from "../custom-suffix.json"',
    );
    expect(setup.fileSystem[chunked('custom-suffix.js')]).toContain(
      'import suffix from "../../custom-suffix.json"',
    );
    const configs = Object.keys(setup.fileSystem).filter((file) =>
      file.endsWith('custom-suffix.json'),
    );
    expect(configs).toEqual(['/mock/dist/custom-suffix.json']);
  });

  it('imports the suffix module from the entries of every output', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem[setup.fullPath]).toBe(
      `${SUFFIX_IMPORT}\n${standaloneTestData.component}`,
    );
    expect(setup.fileSystem[chunked('index.js')]).toBe(
      `${SUFFIX_IMPORT}\n${chunkedStandaloneTestData.index}`,
    );
    expect(setup.fileSystem[chunked('my-component.js')]).toBe(
      `${SUFFIX_IMPORT}\n${chunkedStandaloneTestData.component}`,
    );
    expect(setup.fileSystem[chunked('my-button.js')]).toBe(
      `${SUFFIX_IMPORT}\n${chunkedStandaloneTestData.dependency}`,
    );
  });
});
