import { findRuntimeExport } from '../custom-suffix-output-target';
import {
  standaloneTestData,
  typesTestData,
} from './custom-suffix-output-target.data';
import {
  mockSetup,
  TestComponentSetup,
} from './custom-suffix-output-target.spec-utils.ts';

const SUFFIX_IMPORT = 'import "./custom-suffix.js";';

describe('customSuffixOutputTarget - tag transformer module', () => {
  const setup = new TestComponentSetup({
    tagName: 'my-component',
    dependencies: ['my-button'],
    outputPath: '/mock/dist/components',
  });

  beforeEach(() => {
    mockSetup(setup);
  });

  it('writes a module that sets a suffixing tag transformer', async () => {
    await setup.runGenerator();

    expect(
      setup.fileSystem[setup.suffixModulePath],
    ).toBe(`import suffix from "../custom-suffix.json" with { type: "json" };
import { f as setTagTransformer } from "./runtime.js";
const tagNames = new Set(["my-component","my-button"]);
if (suffix) {
  setTagTransformer((tag) => (tagNames.has(tag) ? tag + suffix : tag));
}
`);
  });

  it('imports the module from the index and component entries', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem[setup.indexPath]).toBe(
      `${SUFFIX_IMPORT}\n${standaloneTestData.index}`,
    );
    expect(setup.fileSystem[setup.fullPath]).toBe(
      `${SUFFIX_IMPORT}\n${standaloneTestData.component}`,
    );
  });

  it('does not import the module twice when rebuilt', async () => {
    await setup.runGenerator();
    await setup.runGenerator();

    expect(setup.fileSystem[setup.fullPath]).toBe(
      `${SUFFIX_IMPORT}\n${standaloneTestData.component}`,
    );
  });

  it('leaves Stencil output otherwise untouched', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem[setup.fullPath]).not.toContain('+ suffix');
    expect(setup.fileSystem[setup.fullPath]).toContain(
      'transformTag("my-button")',
    );
  });

  it('writes an empty suffix config next to the output', async () => {
    await setup.runGenerator();

    expect(setup.fileSystem['/mock/dist/custom-suffix.json']).toBe('""');
  });

  it('warns and skips when additionalTagTransformers is disabled', async () => {
    setup.config.compat = { additionalTagTransformers: false };

    await setup.runGenerator();

    expect(setup.build.diagnostics).toEqual([
      expect.objectContaining({ level: 'warn' }),
    ]);
    expect(setup.compiler.fs.writeFile).not.toHaveBeenCalled();
  });
});

describe('findRuntimeExport', () => {
  it('resolves the runtime export from readable output', () => {
    expect(
      findRuntimeExport(standaloneTestData.index, 'setTagTransformer'),
    ).toEqual({ moduleSpecifier: './runtime.js', exportName: 'f' });
  });

  it('resolves the runtime export from minified output', () => {
    expect(
      findRuntimeExport(standaloneTestData.minifiedIndex, 'setTagTransformer'),
    ).toEqual({ moduleSpecifier: './runtime.js', exportName: 'f' });
  });

  it('returns undefined when the name is not exported', () => {
    expect(
      findRuntimeExport(standaloneTestData.index, 'notExported'),
    ).toBeUndefined();
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
    await setup.runGenerator();

    const transformedTypes = await setup.compiler.fs.readFile(setup.typesPath);
    expect(transformedTypes).toBe(typesTestData.expectedOutput);
  });

  it('should not write components.d.ts if file does not exist', async () => {
    setup.fileSystem[setup.typesPath] = '';

    await setup.runGenerator();

    const typesWriteCalls = (
      setup.compiler.fs.writeFile as jest.Mock
    ).mock.calls.filter((call) => call[0] === setup.typesPath);
    expect(typesWriteCalls.length).toBe(0);
  });
});
