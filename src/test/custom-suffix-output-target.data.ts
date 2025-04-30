export const testData = {
  input: `import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';
import { d as defineCustomElement$5 } from './stn-button2.js';
import { d as defineCustomElement$4 } from './stn-checkbox2.js';
import { d as defineCustomElement$3 } from './stn-icon2.js';
import { d as defineCustomElement$2 } from './stn-spinner2.js';

const myComponentCss = "stn-button{background-color:#007bff}stn-checkbox{border:1px solid #ccc}component{padding:10px}#component{display:block}.component{color:#333}";

const MyComponent$1 = /*@__PURE__*/ proxyCustomElement(class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
    }
    render() {
        this.el.querySelector('my-component');
        this.el.querySelector('#my-component');
        this.el.querySelector('.my-component');
        this.el.querySelector('parent > my-component + my-component');
        this.el.querySelector('previous + my-component');
        this.el.querySelector('my-component[attribute="value"]');
        this.el.querySelector('my-component:pseudo-class');
        this.el.querySelector('stn-checkbox');
        this.el.querySelector('stn-button');
        return (h(Host, { key: '5ef84b3e706ca72cc500a1b61e141eced318a02b' }, h("div", { key: '8f31ecdb2d02770ec98aedb3fb2ecd356cafe70f' }, h("span", { key: '5872f0b4844490cbb16388065d5c1215603fb626' }, "Hello, World!"), h("stn-button", { key: '3db7e9a0b09b9a298e47211007819383ef683749' }, "Click me!"), h("stn-checkbox", { key: '085ed1f662211ea5ec5f377309cfeb26a8cafcd0' }, "Check me!"))));
    }
    get el() { return this; }
    static get style() { return myComponentCss; }
}, [1, "my-component"]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["my-component", "stn-button", "stn-checkbox", "stn-icon", "stn-spinner"];
    components.forEach(tagName => { switch (tagName) {
        case "my-component":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, MyComponent$1);
            }
            break;
        case "stn-button":
            if (!customElements.get(tagName)) {
                defineCustomElement$5();
            }
            break;
        case "stn-checkbox":
            if (!customElements.get(tagName)) {
                defineCustomElement$4();
            }
            break;
        case "stn-icon":
            if (!customElements.get(tagName)) {
                defineCustomElement$3();
            }
            break;
        case "stn-spinner":
            if (!customElements.get(tagName)) {
                defineCustomElement$2();
            }
            break;
    } });
}

const MyComponent = MyComponent$1;
const defineCustomElement = defineCustomElement$1;

export { MyComponent, defineCustomElement };
//# sourceMappingURL=my-component.js.map

//# sourceMappingURL=my-component.js.map
`,
  expectedOutput: `import { proxyCustomElement, HTMLElement, h, Host } from "@stencil/core/internal/client";
import { d as defineCustomElement$5 } from "./stn-button2.js";
import { d as defineCustomElement$4 } from "./stn-checkbox2.js";
import { d as defineCustomElement$3 } from "./stn-icon2.js";
import { d as defineCustomElement$2 } from "./stn-spinner2.js";
const myComponentCss = \`stn-button\${getCustomSuffix()}{background-color:#007bff}stn-checkbox\${getCustomSuffix()}{border:1px solid #ccc}component{padding:10px}#component{display:block}.component{color:#333}\`;
const MyComponent$1 = /*@__PURE__*/ proxyCustomElement(class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
    }
    render() {
        this.el.querySelector(\`my-component\${getCustomSuffix()}\`);
        this.el.querySelector("#my-component");
        this.el.querySelector(".my-component");
        this.el.querySelector(\`parent > my-component\${getCustomSuffix()} + my-component\${getCustomSuffix()}\`);
        this.el.querySelector(\`previous + my-component\${getCustomSuffix()}\`);
        this.el.querySelector(\`my-component\${getCustomSuffix()}[attribute="value"]\`);
        this.el.querySelector(\`my-component\${getCustomSuffix()}:pseudo-class\`);
        this.el.querySelector(\`stn-checkbox\${getCustomSuffix()}\`);
        this.el.querySelector(\`stn-button\${getCustomSuffix()}\`);
        return (h(Host, { key: "5ef84b3e706ca72cc500a1b61e141eced318a02b" }, h("div", { key: "8f31ecdb2d02770ec98aedb3fb2ecd356cafe70f" }, h("span", { key: "5872f0b4844490cbb16388065d5c1215603fb626" }, "Hello, World!"), h("stn-button" + getCustomSuffix(), { key: "3db7e9a0b09b9a298e47211007819383ef683749" }, "Click me!"), h("stn-checkbox" + getCustomSuffix(), { key: "085ed1f662211ea5ec5f377309cfeb26a8cafcd0" }, "Check me!"))));
    }
    get el() { return this; }
    static get style() { return myComponentCss; }
}, [1, "my-component"]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["my-component", "stn-button", "stn-checkbox", "stn-icon", "stn-spinner"];
    components.forEach(tagName => {
        switch (tagName) {
            case "my-component":
                if (!customElements.get(tagName + getCustomSuffix())) {
                    customElements.define(tagName + getCustomSuffix(), MyComponent$1);
                }
                break;
            case "stn-button":
                if (!customElements.get(tagName + getCustomSuffix())) {
                    defineCustomElement$5();
                }
                break;
            case "stn-checkbox":
                if (!customElements.get(tagName + getCustomSuffix())) {
                    defineCustomElement$4();
                }
                break;
            case "stn-icon":
                if (!customElements.get(tagName + getCustomSuffix())) {
                    defineCustomElement$3();
                }
                break;
            case "stn-spinner":
                if (!customElements.get(tagName + getCustomSuffix())) {
                    defineCustomElement$2();
                }
                break;
        }
    });
}
function getCustomSuffix() { return "-test"; }
const MyComponent = MyComponent$1;
const defineCustomElement = defineCustomElement$1;
export { MyComponent, defineCustomElement };
`,
};
