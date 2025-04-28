import { Config } from '@stencil/core';
import { BuildCtx, CompilerCtx, OutputTargetCustom } from '@stencil/core/internal';
import ts from 'typescript';
import * as d from '@stencil/core/internal';

export const customSuffixOutputTarget = (): OutputTargetCustom => ({
  type: 'custom',
  name: 'custom-suffix-output-target',
  generator: async (_config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) => {
    const outputDir = _config.outputTargets?.find(target => target.type === 'dist-custom-elements')?.dir;

    if (outputDir !== undefined) {
      const files = await compilerCtx.fs.readdir(outputDir);
      for (const file of files) {
        if (file.relPath.endsWith('.js')) {
          console.error(`Processing file: ${file.relPath}`);
          const filePath = `${outputDir}/${file.relPath}`;
          const content = await compilerCtx.fs.readFile(filePath);
          const transformedContent = applyTransformers(file.relPath, content, compilerCtx, buildCtx.components);
          await compilerCtx.fs.writeFile(filePath, transformedContent);
        }
      }
    }
  },
});

function applyTransformers(fileName: string, content: string, compilerCtx: CompilerCtx, components: d.ComponentCompilerMeta[]): string {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);

  // Apply your custom TypeScript AST transformations here
  const transformer = (context: ts.TransformationContext) => {
    return (rootNode: ts.SourceFile) => {
      const moduleFile = getModuleFromSourceFile(compilerCtx, fileName);
      // console.log('Module file:', moduleFile);
      const tagNames: string[] = [];
      if (moduleFile !== undefined && moduleFile.cmps.length > 0) {
        const mainTagName = moduleFile.cmps[0].tagName;
        console.log('Patching:', mainTagName);
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
      console.log('tagNames:', tagNames);
      if (tagNames.length === 0) {
        return rootNode;
      }

      // Create a new variable statement node
      const newVariableStatement = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [ts.factory.createVariableDeclaration(ts.factory.createIdentifier('test'), undefined, undefined, ts.factory.createStringLiteral('This is a test'))],
          ts.NodeFlags.Const,
        ),
      );

      // Add the new node to the beginning of the file
      const updatedStatements = ts.factory.createNodeArray([newVariableStatement, ...rootNode.statements]);

      return ts.factory.updateSourceFile(rootNode, updatedStatements);
    };
  };

  const result = ts.transform(sourceFile, [transformer]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

export const getModuleFromSourceFile = (compilerCtx: d.CompilerCtx, fileName: string): d.Module | undefined => {
  // a key with the `Module`'s filename could not be found, attempt to resolve it by iterating over all modules in the
  // compiler context
  const moduleFiles = Array.from(compilerCtx.moduleMap.values());
  // console.log('Module files:', moduleFiles);
  return moduleFiles.find(m => {
    const tagName = m.cmps[0]?.tagName;
    return tagName === fileName.replace('.js', '');
  });
};
