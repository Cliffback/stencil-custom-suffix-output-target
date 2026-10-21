import path from 'node:path';
import type { OutputTarget, OutputTargetCustom } from '@stencil/core/compiler';
import ts from 'typescript';
import {
  CustomSuffixHelper,
  suffixModuleFileName,
} from './custom-suffix-utils.ts';

type CompilerFs = {
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<unknown>;
};

const SET_TAG_TRANSFORMER = 'setTagTransformer';
const INDEX_FILE = 'index.js';

const targetObject = {
  type: 'custom',
  name: 'custom-suffix-output-target',
  generator: async (config, compilerCtx, buildCtx) => {
    if (!config.compat?.additionalTagTransformers) {
      buildCtx.diagnostics.push({
        level: 'warn',
        type: 'build',
        header: 'custom-suffix-output-target',
        messageText:
          '`compat.additionalTagTransformers` is not enabled, so tag names will not be suffixed.',
        lines: [],
      });
      return;
    }

    const { outputDirs, configPath, typesPath } = new CustomSuffixHelper(
      config,
    );
    const tagNames = buildCtx.components.map((cmp) => cmp.tagName);

    for (const outputDir of outputDirs) {
      await writeSuffixModule(compilerCtx.fs, outputDir, configPath, tagNames);
    }

    await transformComponentTypes(compilerCtx.fs, typesPath, tagNames);

    await compilerCtx.fs.writeFile(configPath, JSON.stringify(''));
    buildCtx.debug('Generated custom suffix config file');
  },
} satisfies OutputTargetCustom;

/**
 * Writes a module that registers a Stencil tag transformer appending the
 * runtime suffix, and imports it from every entry so it runs before any
 * component is defined or rendered.
 */
async function writeSuffixModule(
  fs: CompilerFs,
  outputDir: string,
  configPath: string,
  tagNames: string[],
): Promise<void> {
  const indexContent = await readOptional(fs, path.join(outputDir, INDEX_FILE));
  if (indexContent === undefined) return;

  const runtimeImport = findRuntimeExport(indexContent, SET_TAG_TRANSFORMER);
  if (runtimeImport === undefined) {
    throw new Error(
      `custom-suffix-output-target: could not find \`${SET_TAG_TRANSFORMER}\` in ${path.join(outputDir, INDEX_FILE)}`,
    );
  }

  const suffixModule = createSuffixModule(
    toImportPath(path.relative(outputDir, configPath)),
    runtimeImport,
    tagNames,
  );
  await fs.writeFile(path.join(outputDir, suffixModuleFileName), suffixModule);

  const entryFiles = [
    INDEX_FILE,
    ...tagNames.flatMap((tag) => [`${tag}.js`, `${tag}2.js`]),
  ];
  for (const entryFile of entryFiles) {
    await prependSuffixImport(fs, path.join(outputDir, entryFile));
  }
}

export function createSuffixModule(
  configImportPath: string,
  runtimeImport: RuntimeExport,
  tagNames: string[],
): string {
  return [
    `import suffix from ${JSON.stringify(configImportPath)} with { type: "json" };`,
    `import { ${runtimeImport.exportName} as ${SET_TAG_TRANSFORMER} } from ${JSON.stringify(runtimeImport.moduleSpecifier)};`,
    `const tagNames = new Set(${JSON.stringify(tagNames)});`,
    'if (suffix) {',
    `  ${SET_TAG_TRANSFORMER}((tag) => (tagNames.has(tag) ? tag + suffix : tag));`,
    '}',
    '',
  ].join('\n');
}

async function prependSuffixImport(
  fs: CompilerFs,
  filePath: string,
): Promise<void> {
  const content = await readOptional(fs, filePath);
  if (content === undefined) return;

  const suffixImport = `import "./${suffixModuleFileName}";`;
  if (content.startsWith(suffixImport)) return;

  await fs.writeFile(filePath, `${suffixImport}\n${content}`);
}

export interface RuntimeExport {
  moduleSpecifier: string;
  exportName: string;
}

/**
 * Resolves where `publicName` is imported from in the generated `index.js`.
 * The runtime chunk mangles its export names, but the index re-exports the
 * public name, so following that export back to its import gives the
 * runtime module and its mangled export name, even in minified output.
 */
export function findRuntimeExport(
  indexContent: string,
  publicName: string,
): RuntimeExport | undefined {
  const sourceFile = ts.createSourceFile(
    INDEX_FILE,
    indexContent,
    ts.ScriptTarget.Latest,
  );

  const localName = findExportedLocalName(sourceFile, publicName);
  if (localName === undefined) return undefined;

  return findImportOfLocal(sourceFile, localName);
}

function findExportedLocalName(
  sourceFile: ts.SourceFile,
  publicName: string,
): string | undefined {
  for (const statement of sourceFile.statements) {
    if (!isNamedExportWithoutSource(statement)) continue;

    for (const specifier of statement.exportClause.elements) {
      if (specifier.name.text !== publicName) continue;
      return (specifier.propertyName ?? specifier.name).text;
    }
  }
  return undefined;
}

function isNamedExportWithoutSource(
  statement: ts.Statement,
): statement is ts.ExportDeclaration & { exportClause: ts.NamedExports } {
  return (
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier === undefined &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
  );
}

function findImportOfLocal(
  sourceFile: ts.SourceFile,
  localName: string,
): RuntimeExport | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const specifier of namedBindings.elements) {
      if (specifier.name.text !== localName) continue;
      return {
        moduleSpecifier: statement.moduleSpecifier.text,
        exportName: (specifier.propertyName ?? specifier.name).text,
      };
    }
  }
  return undefined;
}

async function transformComponentTypes(
  fs: CompilerFs,
  typesPath: string,
  tagNames: string[],
): Promise<void> {
  const componentTypes = await readOptional(fs, typesPath);
  if (!componentTypes) return;

  const transformed = transformDtsInterfaces(
    typesPath,
    componentTypes,
    tagNames,
  );
  if (transformed !== componentTypes) {
    await fs.writeFile(typesPath, transformed);
  }
}

/**
 * Transform .d.ts interfaces so that string-literal keys matching a known Stencil tag
 * are extended by template-literal index signatures as well.
 *
 * So instead of just:
 *   "stn-button": HTMLStnButtonElement;
 * we also get:
 *   [key: `stn-button--${string}`]: HTMLStnButtonElement;
 *
 * Works across all interfaces in the file. Keeps the original RHS type intact.
 */
function transformDtsInterfaces(
  fileName: string,
  content: string,
  tagNames: string[],
): string {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const transformer: ts.TransformerFactory<ts.SourceFile> =
    (context) => (root) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isInterfaceDeclaration(node)) {
          return ts.factory.updateInterfaceDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            addSuffixIndexSignatures(node.members, tagNames),
          );
        }
        return ts.visitEachChild(node, visit, context);
      };

      return ts.visitNode(root, visit, ts.isSourceFile);
    };

  const result = ts.transform(sourceFile, [transformer]);
  try {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(result.transformed[0]);
  } finally {
    result.dispose?.();
  }
}

function addSuffixIndexSignatures(
  members: ts.NodeArray<ts.TypeElement>,
  tagNames: string[],
): ts.TypeElement[] {
  const existingIndexKeys = new Set(
    members.flatMap((member) => {
      const head = suffixIndexSignatureHead(member);
      return head === undefined ? [] : [head];
    }),
  );

  return members.flatMap((member) => {
    if (
      !ts.isPropertySignature(member) ||
      !ts.isStringLiteral(member.name) ||
      !tagNames.includes(member.name.text) ||
      existingIndexKeys.has(`${member.name.text}--`)
    ) {
      return [member];
    }

    const type =
      member.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    return [member, createSuffixIndexSignature(member.name.text, type)];
  });
}

function suffixIndexSignatureHead(member: ts.TypeElement): string | undefined {
  if (!ts.isIndexSignatureDeclaration(member)) return undefined;

  const type = member.parameters[0]?.type;
  if (!type || !ts.isTemplateLiteralTypeNode(type)) return undefined;

  const [span] = type.templateSpans;
  const isStringSuffix =
    type.templateSpans.length === 1 &&
    span.type.kind === ts.SyntaxKind.StringKeyword &&
    span.literal.text === '';
  return isStringSuffix ? type.head.text : undefined;
}

function createSuffixIndexSignature(
  tag: string,
  type: ts.TypeNode,
): ts.IndexSignatureDeclaration {
  const parameter = ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    ts.factory.createIdentifier('key'),
    undefined,
    ts.factory.createTemplateLiteralType(
      ts.factory.createTemplateHead(`${tag}--`),
      [
        ts.factory.createTemplateLiteralTypeSpan(
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ts.factory.createTemplateTail(''),
        ),
      ],
    ),
    undefined,
  );
  return ts.factory.createIndexSignature(undefined, [parameter], type);
}

async function readOptional(
  fs: CompilerFs,
  filePath: string,
): Promise<string | undefined> {
  return fs.readFile(filePath).catch(() => undefined);
}

function toImportPath(relativePath: string): string {
  const posixPath = relativePath.split(path.sep).join('/');
  return posixPath.startsWith('.') ? posixPath : `./${posixPath}`;
}

export const target = (): OutputTargetCustom => targetObject;

export function customSuffixOutputTarget(): OutputTarget {
  return target();
}
