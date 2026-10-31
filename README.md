# Custom Suffix Output Target for Stencil

> Safely run multiple versions of the same Stencil component library in a **microfrontend** architecture by automatically suffixing component tag names validated at runtime.

[![npm version](https://img.shields.io/npm/v/stencil-custom-suffix-output-target.svg)](https://www.npmjs.com/package/stencil-custom-suffix-output-target)  
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
---

## 📖 Table of Contents
- [❓ Why](#-why)
- [🏗 Microfrontend Scenario](#-microfrontend-scenario)
- [🔧 How It Works](#-how-it-works)
- [📝 Example](#-example)
- [📦 Installation](#-installation)
- [⚡ Configuring the Suffix](#-configuring-the-suffix)
- [🅰 Angular Wrapper Integration](#%F0%9F%85%B0-angular-wrapper-integration)
- [🔃 Updating Tag Names](#-updating-tag-names)
- [❗ Limitations](#-limitations)
- [❓ FAQ](#-faq)

---

## ❓ Why

In **microfrontend architectures**, multiple independently deployed applications may use their own versions of a shared component library.  

Problem:  
- Web components are **global**. The first `customElements.define('my-button')` call locks that tag name.  
- Another microfrontend trying to use the same component library with a different version will lead to problems.  
- This leads to **version conflicts, unexpected behavior, and debugging nightmares**.  

✅ **Solution:** This output target automatically appends a **custom suffix** to all Stencil component tag names at build time. Each app can configure its own suffix, ensuring safe coexistence of multiple versions of the same component system.

---

## 🏗 Microfrontend Scenario
<details>
<summary>📊 Show Mermaid Diagram</summary>
    
```mermaid
flowchart TD
    %% Libraries
    L1["Library v1.0<br>🔵 Blue Button"] --> A["App 1 (App A)<br>Library v1.0<br>🔵 Blue Button"]
    L2["Library v2.3<br>🟢 Green Button"] --> B["App 2 (App B)<br>Library v2.3<br>🟢 Green Button"]
    A --> Shared["Shared Microfrontend Environment"]
    B --> Shared["Shared Microfrontend Environment"]

    %% First action: Checkout
    Shared --> loadApp1["Load App 1 page<br>🔵 Button v1.0"]

    %% Second action: Admin
    loadApp1 --> clickApp2["Navigate to App 2<br>🔵 Button v1.0"]

    %% Third action: Admin
    clickApp2 --> refreshApp2["Refresh App 2<br>🟢 Button v2.3"]

    %% Fourth action: Checkout
    refreshApp2 --> revisitApp1["Navigate to App 1<br>🟢 Button v2.3"]

    %% Apply colors
    style L1 fill:#0052cc
    style L2 fill:#1e7e34 
```

</details>

- **Without suffixing:** both apps try to register `<my-button>` → 💥 conflict.
- **With suffixing:** App A gets `<my-button--checkout>`, App B gets `<my-button--admin>` → ✅ no conflicts, both versions coexist.

---

## 🔧 How It Works

Stencil already routes every tag name through its runtime `transformTag()` when `compat.additionalTagTransformers` is enabled: rendering (`h()`), custom element registration, `querySelector`/`closest` selectors, and tag selectors in component CSS. This output target only supplies the transformer.

During build, the output target:

- Writes a `custom-suffix.js` module to every `standalone` output directory. It reads the suffix from `custom-suffix.json` and calls Stencil's `setTagTransformer()`, appending the suffix to the library's own tag names only.
- Imports that module from `index.js` and every component file, so the transformer is set before any component is defined or rendered.
- Adds `` [key: `my-tag--${string}`] `` index signatures to `components.d.ts`, so suffixed tags are typed.
- Writes an empty `custom-suffix.json` next to the output, which `set-custom-suffix` overwrites in the consuming app.

Component source that compares tag names by hand (e.g. `el.tagName === 'MY-TAG'`) is not transformed. Compare against `transformTag('my-tag')` from `@stencil/core` instead.

---

## 📝 Example

<details>
<summary>Generated <code>custom-suffix.js</code></summary>

```js
import suffix from "../custom-suffix.json" with { type: "json" };
import { f as setTagTransformer } from "./runtime.js";
const tagNames = new Set(["my-button", "my-checkbox"]);
if (suffix) {
  setTagTransformer((tag) => (tagNames.has(tag) ? tag + suffix : tag));
}
```
</details>

<details>
<summary>Component output</summary>

```js
import "./custom-suffix.js";
// ...unchanged Stencil output, e.g.
customElements.define(transformTag("my-button"), MyButton);
const myCss = () => `${transformTag("my-checkbox")} { /* styles */ }`;
```
</details>

---

## 📦 Installation

Install as a dependency (If you're not relying on the `set-custom-suffix` script, or have the package installed in your consuming project, you can install it as a dev dependency in your library):

```bash
npm install stencil-custom-suffix-output-target
```

Add it to your **stencil.config.ts**:

```ts
import { Config } from '@stencil/core';
import { customSuffixOutputTarget } from 'stencil-custom-suffix-output-target';

export const config: Config = {
  compat: {
    // Enable tag name transformation (required for Stencil v5)
    additionalTagTransformers: true,
  },
  outputTargets: [
    { 
      type: 'standalone',
      minify: false,
    },
    customSuffixOutputTarget(),
  ],
};
```

---

## ⚡ Configuring the Suffix

Each consuming project must provide its own suffix.  

This is done by writing a `custom-suffix.json` file to the library’s `dist` folder at build/deploy time.

Example (`dist/custom-suffix.json`):
```json
"--your-suffix"
```

This package provides a simple script that automates this that can be added to your project's `package.json` (requires `stencil-custom-suffix-output-target` to be installed as a dependency in your library, or as a dev dependency in your consuming project):

```bash
"postinstall": "set-custom-suffix --set your-suffix --target @your-org/your-library"
```
---

## 🅰 Angular Wrapper Integration

This plugin was designed with the official [`angularOutputTarget`](https://stenciljs.com/docs/angular) in mind. For the angular wrapper to work with custom suffixes, a manual patch of the different generated files must be done. 

By adding another argument to the `set-custom-suffix` script, this patching can be automated:

```bash
"postinstall": "set-custom-suffix --set your-suffix --target @your-org/your-library --angular @your-org/your-angular-wrapper"
```

This will patch the following files in the angular wrapper project:
- `./fesm5.js`
- `./fesm2015.js`
- `./directives/proxies.d.ts`

These files are generated by the `angular-output-target` in your Stencil library, and is now patched to use the same suffix as the web components. Angular requires static tag names at build time, and cannot resolve them at runtime like web components can, at least as far as I've been able to determine, so a manual patch is necessary.

---

## 🔃 Updating Tag Names

After configuring the suffix (and running the angular patch if applicable), you must update all places where the tag names from the component library are used in your consuming app. This includes test, html templates, and any `querySelector` calls. Any reference to the original tag names must be updated to include the suffix.

--- 

## ❗ Limitations

- Only transforms **`standalone`** output targets (not `loader-bundle`).
- Requires `compat.additionalTagTransformers: true`.
- All packages need to be in the same node_modules tree.
- Requires consumer apps to manage and update `custom-suffix.json`.  
- Multiple apps must use **different suffixes** to avoid conflicts.
- Multiple versions of the same library in one app is not supported.
- Requres manual updating of all places where tag names from the component library are used in the consuming app (e.g. in Angular templates, or `querySelector` calls).

---

## ❓ FAQ

**Q: What happens if two apps use the same suffix?**  
Then you’re back to name collisions. Each app must choose a unique suffix.  

**Q: Does this affect performance?**  
No, the suffix is resolved at build time and read once at runtime.  

**Q: Can I use this without Angular?**  
Yes — it works with plain web components or other frameworks as long as you manage `custom-suffix.json` and consume the components from the `dist-custom-elements` output target (in the `dist/components` folder).

**Q: What if I forget to set a suffix?**  
If no suffix is set, the default tag names will be used, which may cause conflicts if multiple versions are loaded together, but it will not break the build as long as the tag names in your source corresponds with the suffix.

---
