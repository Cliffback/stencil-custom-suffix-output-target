import { Config } from '@stencil/core';
import { BuildCtx, CompilerCtx, OutputTargetCustom } from '@stencil/core/internal';
import ts from 'typescript';
import * as d from '@stencil/core/internal';
import postcss from 'postcss';
import postcssSafeParser from 'postcss-safe-parser';
import postcssSelectorParser, { Root } from 'postcss-selector-parser';

export const customSuffixOutputTarget = (): OutputTargetCustom => ({
  type: 'custom',
  name: 'custom-suffix-output-target',
  generator: async (_config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) => {
    if (!_config.extras?.tagNameTransform) return;
    const outputDir = _config.outputTargets?.find(target => target.type === 'dist-custom-elements')?.dir;
    let tagNames: string[] = [];

    if (outputDir !== undefined) {
      const files = await compilerCtx.fs.readdir(outputDir);

      // retrieve all tagNames from the components
      for (const file of files) {
        if (file.relPath.endsWith('.js')) {
          const filePath = `${outputDir}/${file.relPath}`;
          const content = await compilerCtx.fs.readFile(filePath);
          getTagNames(file.relPath, content, compilerCtx, buildCtx.components, tagNames);
        }
      }
      // remove duplicates
      tagNames = Array.from(new Set(tagNames));

      // apply the transformers to all files
      for (const file of files) {
        if (file.relPath.endsWith('.js')) {
          const filePath = `${outputDir}/${file.relPath}`;
          const content = await compilerCtx.fs.readFile(filePath);
          const transformedContent = await applyTransformers(file.relPath, content, compilerCtx, buildCtx.components, tagNames);
          await compilerCtx.fs.writeFile(filePath, transformedContent);
        }
      }
    }
  },
});

function getTagNames(fileName: string, content: string, compilerCtx: CompilerCtx, components: d.ComponentCompilerMeta[], tagNames: string[]) {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);

  const transformer = () => {
    return (rootNode: ts.SourceFile) => {
      const moduleFile = getModuleFromSourceFile(compilerCtx, fileName);
      if (moduleFile !== undefined && moduleFile.cmps.length > 0) {
        const mainTagName = moduleFile.cmps[0].tagName;
        tagNames.push(mainTagName);
        moduleFile.cmps.forEach(cmp => {
          cmp.dependencies.forEach(dCmp => {
            if (dCmp === undefined) return;
            const foundDep = components.find((dComp: { tagName: string }) => dComp.tagName === dCmp);
            if (foundDep === undefined) return;
            tagNames.push(foundDep.tagName);
          });
        });
      }
      return rootNode;
    };
  };
  ts.transform(sourceFile, [transformer]);
}

async function applyTransformers(fileName: string, content: string, compilerCtx: CompilerCtx, components: d.ComponentCompilerMeta[], tagNames: string[]): Promise<string> {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);

  const transformer = (context: ts.TransformationContext) => {
    return (rootNode: ts.SourceFile) => {
      const moduleFile = getModuleFromSourceFile(compilerCtx, fileName);
      const localTagNames: string[] = [];
      if (moduleFile !== undefined && moduleFile.cmps.length > 0) {
        const mainTagName = moduleFile.cmps[0].tagName;
        tagNames.push(mainTagName);
        moduleFile.cmps.forEach(cmp => {
          cmp.dependencies.forEach(dCmp => {
            if (dCmp === undefined) return;
            const foundDep = components.find((dComp: { tagName: string }) => dComp.tagName === dCmp);
            if (foundDep === undefined) return;
            localTagNames.push(foundDep.tagName);
          });
        });
      }
      // File is not a component, return the original source file
      if (localTagNames.length === 0) {
        return rootNode;
      }

      const newSourceFile = ts.factory.updateSourceFile(rootNode, [...rootNode.statements.slice(0, -3), runtimeFunction, ...rootNode.statements.slice(-3)]);

      function visit(node: ts.Node): ts.Node {
        let newNode: ts.Node = node;

        // Find all instances of `h('tagName')` and replace them with `h('tagName' + getCustomSuffix())`
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h') {
          const componentName = node.arguments[0];
          if (ts.isStringLiteral(componentName) && tagNames.some(tag => componentName.text.startsWith(tag))) {
            const customTagNameExpression = ts.factory.createBinaryExpression(
              ts.factory.createStringLiteral(componentName.text),
              ts.SyntaxKind.PlusToken,
              ts.factory.createCallExpression(ts.factory.createIdentifier('getCustomSuffix'), undefined, []),
            );

            newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [customTagNameExpression, ...node.arguments.slice(1)]);
          }
        }

        // Find all instances of query selectors targeting the tagname and add the custom suffix as a template literal
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const methodName = node.expression.name.text;
          if ((methodName === 'querySelector' || methodName === 'querySelectorAll') && node.arguments.length > 0) {
            const selectorArgument = node.arguments[0];

            if (ts.isStringLiteral(selectorArgument)) {
              const selectorText = selectorArgument.text;
              // Find all matches of any tagName in selectorText, preferring the longest at each position
              const matches: { tag: string; start: number; end: number }[] = [];
              let i = 0;
              while (i < selectorText.length) {
                let foundTag: string | undefined;
                let foundLength = 0;
                for (const tagName of tagNames) {
                  if (
                    selectorText.startsWith(tagName, i) &&
                    tagName.length > foundLength &&
                    (i === 0 || !/[.#]/.test(selectorText[i - 1])) // Ensure not preceded by . or #
                  ) {
                    foundTag = tagName;
                    foundLength = tagName.length;
                  }
                }
                if (foundTag !== undefined) {
                  matches.push({ tag: foundTag, start: i, end: i + foundLength });
                  i += foundLength;
                } else {
                  i++;
                }
              }

              if (matches.length > 0) {
                let lastIndex = 0;
                const templateSpans: ts.TemplateSpan[] = [];
                const templateHead = selectorText.slice(0, matches[0].start) + matches[0].tag;
                lastIndex = matches[0].end;
                templateSpans.push(
                  ts.factory.createTemplateSpan(
                    ts.factory.createCallExpression(ts.factory.createIdentifier('getCustomSuffix'), undefined, []),
                    matches.length === 1
                      ? ts.factory.createTemplateTail(selectorText.slice(lastIndex))
                      : ts.factory.createTemplateMiddle(selectorText.slice(lastIndex, matches[1].start) + matches[1].tag),
                  ),
                );
                for (let j = 1; j < matches.length; j++) {
                  lastIndex = matches[j].end;
                  templateSpans.push(
                    ts.factory.createTemplateSpan(
                      ts.factory.createCallExpression(ts.factory.createIdentifier('getCustomSuffix'), undefined, []),
                      j === matches.length - 1
                        ? ts.factory.createTemplateTail(selectorText.slice(lastIndex))
                        : ts.factory.createTemplateMiddle(selectorText.slice(lastIndex, matches[j + 1].start) + matches[j + 1].tag),
                    ),
                  );
                }
                const customTagNameExpression = ts.factory.createTemplateExpression(ts.factory.createTemplateHead(templateHead), templateSpans);
                newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [customTagNameExpression, ...node.arguments.slice(1)]);
              }
            }
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
              const newArgument = ts.factory.createBinaryExpression(
                firstArg,
                ts.SyntaxKind.PlusToken,
                ts.factory.createCallExpression(ts.factory.createIdentifier('getCustomSuffix'), undefined, []),
              );

              newNode = ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [newArgument, ...restArgs]);
            }
          }
        }

        return ts.visitEachChild(newNode, visit, context);
      }
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
                tag.value += '${getCustomSuffix()}';
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

// Simplified version of getModuleFromSourceFile from @stencil/core
const getModuleFromSourceFile = (compilerCtx: d.CompilerCtx, fileName: string): d.Module | undefined => {
  const moduleFiles = Array.from(compilerCtx.moduleMap.values());
  return moduleFiles.find(m => {
    const tagName = m.cmps[0]?.tagName;
    return tagName === fileName.replace('.js', '') || tagName === fileName.replace('2.js', '');
  });
};

// TODO: Maybe get the suffix from a js config file in the consuming project, like .custom-suffix.js
const runtimeFunction = ts.factory.createFunctionDeclaration(
  undefined,
  undefined,
  'getCustomSuffix',
  undefined,
  [],
  undefined,
  ts.factory.createBlock([ts.factory.createReturnStatement(ts.factory.createStringLiteral('-test'))]),
);
