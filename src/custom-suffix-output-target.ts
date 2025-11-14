import type { Config } from '@stencil/core';
import type {
  BuildCtx,
  CompilerCtx,
  OutputTarget,
  OutputTargetCustom,
} from '@stencil/core/internal';
import { parse, SelectorType, stringify } from 'css-what';
import postcss from 'postcss';
import postcssSafeParser from 'postcss-safe-parser';
import postcssSelectorParser, { type Root } from 'postcss-selector-parser';
import ts from 'typescript';
import {
  CustomSuffixHelper,
  fileName,
  relativePath,
} from './custom-suffix-utils.ts';

export function customSuffixOutputTarget(): OutputTarget {
  const target = {
  type: 'custom',
  name: 'custom-suffix-output-target',
  generator: async (
    _config: Config,
    compilerCtx: CompilerCtx,
    buildCtx: BuildCtx,
  ) => {
    if (!_config.extras?.tagNameTransform) return;

    const { outputDir, configPath, typesPath } = new CustomSuffixHelper(
      _config,
    );

    if (outputDir === undefined) return;

    const tagNames = buildCtx.components.map((cmp) => cmp.tagName);

    for (const cmp of buildCtx.components) {
      let filePath = `${outputDir}/${cmp.tagName}2.js`;
      let originalContent = await compilerCtx.fs
        .readFile(filePath)
        .catch(() => '');

      if (originalContent === undefined) {
        filePath = `${outputDir}/${cmp.tagName}.js`;
        originalContent = await compilerCtx.fs
          .readFile(filePath)
          .catch(() => '');
      }
      const transformedContent = await applyTransformers(
        filePath,
        originalContent,
        tagNames,
      );

      await compilerCtx.fs.writeFile(filePath, transformedContent);
    }

    // Transform components.d.ts
    const componentTypes = await compilerCtx.fs
      .readFile(typesPath)
      .catch(() => undefined);

    if (componentTypes !== undefined) {
      const transformed = transformDtsInterfaces(
        typesPath,
        componentTypes,
        tagNames,
      );
      if (transformed !== componentTypes) {
        await compilerCtx.fs.writeFile(typesPath, transformed);
        buildCtx.debug?.(`Transformed declaration file: ${typesPath}`);
      }
    }

    // Generate the custom suffix config file
    if (fileName === undefined || typeof fileName !== 'string') {
      buildCtx.debug('Custom suffix config file name is undefined');
      return;
    }
    const configContent = JSON.stringify('');

    await compilerCtx.fs.writeFile(configPath, configContent);
    buildCtx.debug('Generated custom suffix config file');
  },
  } satisfies OutputTargetCustom;
  return target;
};

async function applyTransformers(
  fileName: string,
  content: string,
  tagNames: string[],
): Promise<string> {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
  );

  const transformer = (context: ts.TransformationContext) => {
    return (rootNode: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        let newNode: ts.Node = node;

        // Find all instances of `h('tagName')` and replace them with `h('tagName' + getCustomSuffix())`
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'h'
        ) {
          const componentName = node.arguments[0];
          if (
            ts.isStringLiteral(componentName) &&
            tagNames.some((tag) => componentName.text.startsWith(tag))
          ) {
            const customTagNameExpression = ts.factory.createBinaryExpression(
              ts.factory.createStringLiteral(componentName.text),
              ts.SyntaxKind.PlusToken,
              ts.factory.createIdentifier('suffix'),
            );

            newNode = ts.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              [customTagNameExpression, ...node.arguments.slice(1)],
            );
          }
        }

        // Find all instances of query selectors targeting the tagname and add the custom suffix as a template literal
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression)
        ) {
          const SUFFIX_PLACEHOLDER = '__SUFFIX__';
          const methodName = node.expression.name.text;

          if (
            (methodName === 'querySelector' ||
              methodName === 'querySelectorAll' ||
              methodName === 'createElement') &&
            node.arguments.length > 0
          ) {
            const selectorArgument = node.arguments[0];

            if (ts.isStringLiteral(selectorArgument)) {
              const selectorText = selectorArgument.text;
              const parsed = parse(selectorText);

              let modified = false;

              const reconstructed = parsed.map((subSelector) =>
                subSelector.map((token) => {
                  if (
                    token.type === SelectorType.Tag &&
                    tagNames.includes(token.name)
                  ) {
                    modified = true;
                    return {
                      ...token,
                      name: `${token.name}${SUFFIX_PLACEHOLDER}`,
                    };
                  }
                  return token;
                }),
              );

              if (modified) {
                const selectorWithPlaceholder = stringify(reconstructed); // e.g., "div > my-tag__SUFFIX__ + other-tag"
                const parts = selectorWithPlaceholder.split(SUFFIX_PLACEHOLDER);

                const templateHead = ts.factory.createTemplateHead(parts[0]);
                const templateSpans = parts
                  .slice(1)
                  .map((part, index) =>
                    ts.factory.createTemplateSpan(
                      ts.factory.createIdentifier('suffix'),
                      index === parts.length - 2
                        ? ts.factory.createTemplateTail(part)
                        : ts.factory.createTemplateMiddle(part),
                    ),
                  );

                const templateExpression = ts.factory.createTemplateExpression(
                  templateHead,
                  templateSpans,
                );

                newNode = ts.factory.updateCallExpression(
                  node,
                  node.expression,
                  node.typeArguments,
                  [templateExpression, ...node.arguments.slice(1)],
                );
              }
            }
          }
        }

        // Handle cases like `if (elem.tagName === "MY-TAG")`
        if (ts.isStringLiteral(node)) {
          const tagName = node.text;
          if (tagNames.some((tag) => tag.toUpperCase() === tagName)) {
            const customTagNameExpression = ts.factory.createBinaryExpression(
              node,
              ts.SyntaxKind.PlusToken,
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('suffix'),
                  ts.factory.createIdentifier('toUpperCase'),
                ),
                undefined,
                [],
              ),
            );

            return customTagNameExpression;
          }
        }

        // Find all instances of `customElements.get('tagName')` and replace them with `customElements.get('tagName' + getCustomSuffix())`
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (
            ts.isPropertyAccessExpression(expression) &&
            (expression.name.text === 'get' ||
              expression.name.text === 'define') &&
            ts.isIdentifier(expression.expression) &&
            expression.expression.text === 'customElements'
          ) {
            // Replace the tagname with tagName + getCustomSuffix()
            const [firstArg, ...restArgs] = node.arguments;
            if (
              firstArg &&
              ts.isIdentifier(firstArg) &&
              firstArg.text === 'tagName'
            ) {
              const newArgument = ts.factory.createBinaryExpression(
                firstArg,
                ts.SyntaxKind.PlusToken,
                ts.factory.createIdentifier('suffix'),
              );

              newNode = ts.factory.updateCallExpression(
                node,
                node.expression,
                node.typeArguments,
                [newArgument, ...restArgs],
              );
            }
          }
        }

        return ts.visitEachChild(newNode, visit, context);
      }
      const newSourceFile = ts.factory.updateSourceFile(rootNode, [
        configImport,
        ...rootNode.statements,
      ]);
      return ts.visitNode(newSourceFile, visit) as ts.SourceFile;
    };
  };

  const result = ts.transform(sourceFile, [transformer]);
  const printer = ts.createPrinter();
  const transformedCode = printer.printFile(result.transformed[0]);

  // Process CSS asynchronously after the AST transformation
  const processedCode = await processCSS(transformedCode, tagNames);
  return processedCode;
}

async function processCSS(code: string, tagNames: string[]): Promise<string> {
  const cssRegex = /const\s+(\w+Css)\s*=\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  match = cssRegex.exec(code);
  while (match !== null) {
    const [fullMatch, varName, cssContent] = match as unknown as [
      string,
      string,
      string,
    ];
    const result = await postcss([
      (root: postcss.Root) => {
        root.walkRules((rule) => {
          rule.selectors = rule.selectors.map((sel) => {
            const parsedSelector = postcssSelectorParser().astSync(
              sel,
            ) as unknown as Root;
            parsedSelector.walkTags((tag) => {
              if (tagNames.includes(tag.value)) {
                // biome-ignore lint/suspicious/noTemplateCurlyInString: This is intended to create a template literal in the final output
                tag.value += '${suffix}';
              }
            });
            return parsedSelector.toString();
          });
        });
      },
    ]).process(cssContent, { parser: postcssSafeParser, from: undefined });

    const updatedInitializer = `\`${result.css}\``;
    code = code.replace(fullMatch, `const ${varName} = ${updatedInitializer}`);
    match = cssRegex.exec(code);
  }
  return code;
}

/**
 * Transform .d.ts interfaces so that string-literal keys matching a known Stencil tag
 * are extended by template-literal index signatures as well.
 *
 * So instead of just:
 *   "stn-button": HTMLStnButtonElement;
 * we also get:
 *   [key: `stn-button${string}`]: HTMLStnButtonElement;
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
          // Track existing index signatures of the form [key: `tag${string}`]
          const existingIndexKeys = new Set<string>();
          for (const m of node.members) {
            if (!ts.isIndexSignatureDeclaration(m) || m.parameters.length === 0)
              continue;
            const p = m.parameters[0];
            const t = p.type;
            if (t && ts.isTemplateLiteralTypeNode(t)) {
              const head = t.head.text; // literal head text (e.g., "stn-button")
              const oneSpan =
                t.templateSpans.length === 1 &&
                t.templateSpans[0].type.kind === ts.SyntaxKind.StringKeyword &&
                t.templateSpans[0].literal.text === '';
              if (oneSpan) existingIndexKeys.add(head);
            }
          }

          // Rebuild members: drop matching properties, enqueue index signatures to add
          const newMembers: ts.TypeElement[] = [];
          const indexPerTag = new Map<string, ts.TypeNode>(); // tag -> RHS type

          for (const m of node.members) {
            if (
              ts.isPropertySignature(m) &&
              m.name &&
              ts.isStringLiteral(m.name)
            ) {
              const tag = m.name.text;
              if (tagNames.includes(tag)) {
                const rhs =
                  m.type ??
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
                if (!existingIndexKeys.has(tag) && !indexPerTag.has(tag)) {
                  indexPerTag.set(tag, rhs);
                }
                // Keep the original property
                newMembers.push(m);
                // Add the replacement index signature after it
                const param = ts.factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  ts.factory.createIdentifier('key'),
                  undefined,
                  ts.factory.createTemplateLiteralType(
                    ts.factory.createTemplateHead(`${tag}--`),
                    [
                      ts.factory.createTemplateLiteralTypeSpan(
                        ts.factory.createKeywordTypeNode(
                          ts.SyntaxKind.StringKeyword,
                        ),
                        ts.factory.createTemplateTail(''),
                      ),
                    ],
                  ),
                  undefined,
                );
                const indexSig = ts.factory.createIndexSignature(
                  /*modifiers*/ undefined,
                  /*parameters*/ [param],
                  /*type*/ rhs,
                );
                newMembers.push(indexSig);
                continue;
              }
            }
            newMembers.push(m);
          }

          return ts.factory.updateInterfaceDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            newMembers,
          );
        }
        return ts.visitEachChild(node, visit, context);
      };

      return ts.visitNode(root, visit) as ts.SourceFile;
    };

  const result = ts.transform(sourceFile, [transformer]);
  try {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(result.transformed[0]);
  } finally {
    result.dispose?.();
  }
}

const configImport = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier('suffix'),
    undefined,
  ),
  ts.factory.createStringLiteral(relativePath + fileName),
);

export default customSuffixOutputTarget;
