import { Config } from '@stencil/core';
import { BuildCtx, CompilerCtx, OutputTargetCustom } from '@stencil/core/internal';
import ts from 'typescript';
import postcss from 'postcss';
import postcssSafeParser from 'postcss-safe-parser';
import postcssSelectorParser, { Root } from 'postcss-selector-parser';
import { CustomSuffixHelper, fileName, relativePath } from './custom-suffix-utils.ts';
import { parse, stringify, SelectorType } from 'css-what';

export const customSuffixOutputTarget = (): OutputTargetCustom => ({
  type: 'custom',
  name: 'custom-suffix-output-target',
  generator: async (_config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) => {
    if (!_config.extras?.tagNameTransform) return;

    const { outputDir, configPath } = new CustomSuffixHelper(_config);

    if (outputDir === undefined) return;

    const tagNames = buildCtx.components.map(cmp => cmp.tagName);

    for (const cmp of buildCtx.components) {
      let filePath = `${outputDir}/${cmp.tagName}2.js`;
      let originalContent = await compilerCtx.fs.readFile(filePath).catch(() => '');

      if (originalContent === undefined) {
        filePath = `${outputDir}/${cmp.tagName}.js`;
        originalContent = await compilerCtx.fs.readFile(filePath).catch(() => '');
      }
      const transformedContent = await applyTransformers(filePath, originalContent, tagNames);

      await compilerCtx.fs.writeFile(filePath, transformedContent);
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
});

async function applyTransformers(fileName: string, content: string, tagNames: string[]): Promise<string> {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);

  const transformer = (context: ts.TransformationContext) => {
    return (rootNode: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        let newNode: ts.Node = node;

        // Find all instances of `h('tagName')` and replace them with `h('tagName' + getCustomSuffix())`
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h') {
          const componentName = node.arguments[0];
          if (ts.isStringLiteral(componentName) && tagNames.some(tag => componentName.text.startsWith(tag))) {
            const customTagNameExpression = ts.factory.createBinaryExpression(
              ts.factory.createStringLiteral(componentName.text),
              ts.SyntaxKind.PlusToken,
              ts.factory.createIdentifier('suffix'),
            );

            newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [customTagNameExpression, ...node.arguments.slice(1)]);
          }
        }

        // Find all instances of query selectors targeting the tagname and add the custom suffix as a template literal
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const SUFFIX_PLACEHOLDER = '__SUFFIX__';
          const methodName = node.expression.name.text;

          if ((methodName === 'querySelector' || methodName === 'querySelectorAll') && node.arguments.length > 0) {
            const selectorArgument = node.arguments[0];

            if (ts.isStringLiteral(selectorArgument)) {
              const selectorText = selectorArgument.text;
              const parsed = parse(selectorText);

              let modified = false;

              const reconstructed = parsed.map(subSelector =>
                subSelector.map(token => {
                  if (token.type === SelectorType.Tag && tagNames.includes(token.name)) {
                    modified = true;
                    return { ...token, name: `${token.name}${SUFFIX_PLACEHOLDER}` };
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
                      index === parts.length - 2 ? ts.factory.createTemplateTail(part) : ts.factory.createTemplateMiddle(part),
                    ),
                  );

                const templateExpression = ts.factory.createTemplateExpression(templateHead, templateSpans);

                newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [templateExpression, ...node.arguments.slice(1)]);
              }
            }
          }
        }

        // Handle cases like `if (elem.tagName === "MY-TAG")`
        if (ts.isStringLiteral(node)) {
          const tagName = node.text;
          if (tagNames.some(tag => tag.toUpperCase() === tagName)) {
            const customTagNameExpression = ts.factory.createBinaryExpression(
              node,
              ts.SyntaxKind.PlusToken,
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('suffix'), ts.factory.createIdentifier('toUpperCase')),
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
            (expression.name.text === 'get' || expression.name.text === 'define') &&
            ts.isIdentifier(expression.expression) &&
            expression.expression.text === 'customElements'
          ) {
            // Replace the tagname with tagName + getCustomSuffix()
            const [firstArg, ...restArgs] = node.arguments;
            if (firstArg && ts.isIdentifier(firstArg) && firstArg.text === 'tagName') {
              const newArgument = ts.factory.createBinaryExpression(firstArg, ts.SyntaxKind.PlusToken, ts.factory.createIdentifier('suffix'));

              newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [newArgument, ...restArgs]);
            }
          }
        }

        return ts.visitEachChild(newNode, visit, context);
      }
      const newSourceFile = ts.factory.updateSourceFile(rootNode, [configImport, ...rootNode.statements]);
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
  while ((match = cssRegex.exec(code)) !== null) {
    const [fullMatch, varName, cssContent] = match as unknown as [string, string, string];
    const result = await postcss([
      (root: postcss.Root) => {
        root.walkRules(rule => {
          rule.selectors = rule.selectors.map(sel => {
            const parsedSelector = postcssSelectorParser().astSync(sel) as unknown as Root;
            parsedSelector.walkTags(tag => {
              if (tagNames.includes(tag.value)) {
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
  }
  return code;
}

const configImport = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(false, ts.factory.createIdentifier('suffix'), undefined),
  ts.factory.createStringLiteral(relativePath + fileName),
);
