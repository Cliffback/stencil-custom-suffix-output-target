# Custom Suffix Output Target for Stencil Components

In microfrontend architectures, multiple independently deployed applications may use their own versions of a shared component library. Without isolation, the first project to register a web component locks that tag name globally. This can lead to version conflicts, unexpected behavior, and hard-to-debug issues when other microfrontends attempt to use the same tag name with a different implementation.

This custom output target solves that problem by automatically appending a configurable suffix to all component tag names during build time, ensuring safe coexistence of multiple versions of the same component system.

Known that this output target only patches the components in the `dist` folder (the output of the `dist-custom-elements` output target) 

This was also developed with the intention of being used with an angular wrapper generated with the official `angularOutputTarget`.

## 🛠️ How It Works
### 🔄 Tag Name Transformation
During the build process, the output target:

- Reads the generated JS files for each component.
- Applies a TypeScript AST transformation to:
    - Replace h('my-tag') with h('my-tag' + suffix)
    - Update customElements.get('my-tag') and customElements.define('my-tag')
    - Modify DOM queries like querySelector('my-tag')
    - Adjust string comparisons like if (elem.tagName === 'MY-TAG')
- Applies a PostCSS transformation to update to the CSS selectors targeting component tags in the inline CSS constants.
- The transformation injects a suffix variable into the tag names, which is read from a `custom-suffix.json` file in the `dist` directory at runtime.

### Example
#### Original code before transformation
Before transformation, a component might look like this:

```typescript
customElements.define('my-button', MyButton);
document.querySelector('my-button');
h('my-button');
const myCSS = `
  my-button {
    /* styles */
  }
`;
``` 

#### Code after transformation
```typescript
import suffix from "../custom-suffix.json"
customElements.define('my-button' + suffix, MyButton);
document.querySelector(`my-button${suffix}`);
h('my-button' + suffix);
const myCSS = \`
  my-button${suffix} {
    /* styles */
  }
```

#### Code as interpreted during runtime
```typescript
// Assuming suffix is 'my-project'
customElements.define('my-button-my-project', MyButton);
document.querySelector(`my-button-my-project`);
h('my-button-my-project');
const myCSS = \`
  my-button-my-project {
    /* styles */
  }
\`;
```

## 📦 Installation in the Component Library
Install from npm:
```bash
npm install -D custom-suffix-output-target
```

Add the output target to your Stencil project:
```typescript
import { customSuffixOutputTarget } from './scripts/custom-suffix-output-target';
export const config: Config = {
  // ...other config options
  extras: {
    // Enable tag name transformation, we decided to disable the outputTarget if this is false
    tagNameTransform: true,
  },
  outputTargets: [
    // ... other output targets
    customSuffixOutputTarget(),
  ],
};
```
## 📂 Custom Suffix Configuration
Find a way to update the `custom-suffix.json` file for the consumuing projects of your component library. 

How we do it is add a bin script to the package.json of the component library that updates the suffix in the `custom-suffix.json` file based on the version of the component library. For example:

```json
{
  "bin": {
    "set-custom-suffix": "./scripts/set-custom-config.mjs"
  },
}
```

```javascript
// scripts/set-custom-config.mjs
#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-undef */
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';

// Parse arguments using yargs
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --set <value>')
  .option('set', {
    alias: 's',
    type: 'string',
    demand: true,
    description: 'The suffix to add to the config',
  })
  .help().argv;

const suffix = '-' + argv.set;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const customSuffixFileName = 'custom-suffix.json';
const configFilePath = path.resolve(__dirname, '../dist/' + customSuffixFileName);

fs.writeFileSync(configFilePath, JSON.stringify(suffix, null, 2));
console.log(`custom-suffix config updated successfully\nnew suffix set: "${suffix}"`);
```

## ⚠️ Angular Compatibility
For this to work in Angular projects, the proxy files generated from the `angularOutputTarget` must be updated to include the suffix. We have scripts that do this automatically, not in this repo. I hope to be able to open source them in the future.

## Configuration in the consuming project
In the consuming project `package.json`, add the script to run `postinstall` to set the suffix to something specific to your project:

```json
{
    "postinstall": "set-custom-suffix --set my-project"
}
```

After this, the remaining step is to update all local usages of the component tags to include the suffix. This can be done with a simple find-and-replace across your codebase, or by using a script that updates all instances of the component tags to include the suffix.

In our Angular projects, we have used angular schematics to automate this process.


