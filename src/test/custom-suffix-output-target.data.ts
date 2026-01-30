export const testData = {
  input: `import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';
import { d as defineCustomElement$5 } from './my-button2.js';
import { d as defineCustomElement$4 } from './my-checkbox2.js';
import { d as defineCustomElement$3 } from './my-icon2.js';
import { d as defineCustomElement$2 } from './my-spinner2.js';

const myComponentCss = "my-button{background-color:#007bff}my-checkbox{border:1px solid #ccc}component{padding:10px}#component{display:block}.component{color:#333}::slotted(my-button){font-weight:bold;}";

const MyComponent$1 = /*@__PURE__*/ proxyCustomElement(class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
    }
    render() {
        this.el.createElement('my-checkbox');
        this.el.querySelector('my-component');
        this.el.querySelector('#my-component');
        this.el.querySelector('.my-component');
        this.el.querySelector('parent > my-component + my-component');
        this.el.querySelector('previous + my-component');
        this.el.querySelector('my-component[attribute="value"]');
        this.el.querySelector('my-component:pseudo-class');
        this.el.querySelector('my-checkbox');
        this.el.querySelector('my-button');
        return (h(Host, { key: '5ef84b3e706ca72cc500a1b61e141eced318a02b' }, h("div", { key: '8f31ecdb2d02770ec98aedb3fb2ecd356cafe70f' }, h("span", { key: '5872f0b4844490cbb16388065d5c1215603fb626' }, "Hello, World!"), h("my-button", { key: '3db7e9a0b09b9a298e47211007819383ef683749' }, "Click me!"), h("my-checkbox", { key: '085ed1f662211ea5ec5f377309cfeb26a8cafcd0' }, "Check me!"))));
    }
    get el() { return this; }
    static get style() { return myComponentCss; }
}, [1, "my-component"]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["my-component", "my-button", "my-checkbox", "my-icon", "my-spinner"];
    components.forEach(tagName => { switch (tagName) {
        case "my-component":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, MyComponent$1);
            }
            break;
        case "my-button":
            if (!customElements.get(tagName)) {
                defineCustomElement$5();
            }
            break;
        case "my-checkbox":
            if (!customElements.get(tagName)) {
                defineCustomElement$4();
            }
            break;
        case "my-icon":
            if (!customElements.get(tagName)) {
                defineCustomElement$3();
            }
            break;
        case "my-spinner":
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
  expectedOutput: `import suffix from "../custom-suffix.json";
import { proxyCustomElement, HTMLElement, h, Host } from "@stencil/core/internal/client";
import { d as defineCustomElement$5 } from "./my-button2.js";
import { d as defineCustomElement$4 } from "./my-checkbox2.js";
import { d as defineCustomElement$3 } from "./my-icon2.js";
import { d as defineCustomElement$2 } from "./my-spinner2.js";
const myComponentCss = \`my-button\${suffix}{background-color:#007bff}my-checkbox\${suffix}{border:1px solid #ccc}component{padding:10px}#component{display:block}.component{color:#333}::slotted(my-button\${suffix}){font-weight:bold;}\`;
const MyComponent$1 = /*@__PURE__*/ proxyCustomElement(class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
    }
    render() {
        this.el.createElement(\`my-checkbox\${suffix}\`);
        this.el.querySelector(\`my-component\${suffix}\`);
        this.el.querySelector("#my-component");
        this.el.querySelector(".my-component");
        this.el.querySelector(\`parent > my-component\${suffix} + my-component\${suffix}\`);
        this.el.querySelector(\`previous + my-component\${suffix}\`);
        this.el.querySelector(\`my-component\${suffix}[attribute="value"]\`);
        this.el.querySelector(\`my-component\${suffix}:pseudo-class\`);
        this.el.querySelector(\`my-checkbox\${suffix}\`);
        this.el.querySelector(\`my-button\${suffix}\`);
        return (h(Host, { key: "5ef84b3e706ca72cc500a1b61e141eced318a02b" }, h("div", { key: "8f31ecdb2d02770ec98aedb3fb2ecd356cafe70f" }, h("span", { key: "5872f0b4844490cbb16388065d5c1215603fb626" }, "Hello, World!"), h("my-button" + suffix, { key: "3db7e9a0b09b9a298e47211007819383ef683749" }, "Click me!"), h("my-checkbox" + suffix, { key: "085ed1f662211ea5ec5f377309cfeb26a8cafcd0" }, "Check me!"))));
    }
    get el() { return this; }
    static get style() { return myComponentCss; }
}, [1, "my-component"]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["my-component", "my-button", "my-checkbox", "my-icon", "my-spinner"];
    components.forEach(tagName => {
        switch (tagName) {
            case "my-component":
                if (!customElements.get(tagName + suffix)) {
                    customElements.define(tagName + suffix, MyComponent$1);
                }
                break;
            case "my-button":
                if (!customElements.get(tagName + suffix)) {
                    defineCustomElement$5();
                }
                break;
            case "my-checkbox":
                if (!customElements.get(tagName + suffix)) {
                    defineCustomElement$4();
                }
                break;
            case "my-icon":
                if (!customElements.get(tagName + suffix)) {
                    defineCustomElement$3();
                }
                break;
            case "my-spinner":
                if (!customElements.get(tagName + suffix)) {
                    defineCustomElement$2();
                }
                break;
        }
    });
}
const MyComponent = MyComponent$1;
const defineCustomElement = defineCustomElement$1;
export { MyComponent, defineCustomElement };
`,
};

export const typesTestData = {
  input: `/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
export { JSXBase } from "@stencil/core/internal";
export namespace Components {
    interface MyComponentOne {
    }
    interface MyComponentTwo {
    }
}
declare global {
    interface HTMLMyComponentOneElement extends Components.MyComponentOne, HTMLStencilElement {
    }
    var HTMLMyComponentOneElement: {
        prototype: HTMLMyComponentOneElement;
        new (): HTMLMyComponentOneElement;
    };
    interface HTMLMyComponentTwoElement extends Components.MyComponentTwo, HTMLStencilElement {
    }
    var HTMLMyComponentTwoElement: {
        prototype: HTMLMyComponentTwoElement;
        new (): HTMLMyComponentTwoElement;
    };
    interface HTMLElementTagNameMap {
        "my-component-one": HTMLMyComponentOneElement;
        "my-component-two": HTMLMyComponentTwoElement;
    }
}
declare namespace LocalJSX {
    interface MyComponentOne {
    }
    interface MyComponentTwo {
    }
    interface IntrinsicElements {
        "my-component-one": MyComponentOne;
        "my-component-two": MyComponentTwo;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "my-component-one": LocalJSX.MyComponentOne & JSXBase.HTMLAttributes<HTMLMyComponentOneElement>;
            "my-component-two": LocalJSX.MyComponentTwo & JSXBase.HTMLAttributes<HTMLMyComponentTwoElement>;
        }
    }
}
`,
  expectedOutput: `/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
export { JSXBase } from "@stencil/core/internal";
export namespace Components {
    interface MyComponentOne {
    }
    interface MyComponentTwo {
    }
}
declare global {
    interface HTMLMyComponentOneElement extends Components.MyComponentOne, HTMLStencilElement {
    }
    var HTMLMyComponentOneElement: {
        prototype: HTMLMyComponentOneElement;
        new (): HTMLMyComponentOneElement;
    };
    interface HTMLMyComponentTwoElement extends Components.MyComponentTwo, HTMLStencilElement {
    }
    var HTMLMyComponentTwoElement: {
        prototype: HTMLMyComponentTwoElement;
        new (): HTMLMyComponentTwoElement;
    };
    interface HTMLElementTagNameMap {
        "my-component-one": HTMLMyComponentOneElement;
        [key: \`my-component-one--\${string}\`]: HTMLMyComponentOneElement;
        "my-component-two": HTMLMyComponentTwoElement;
        [key: \`my-component-two--\${string}\`]: HTMLMyComponentTwoElement;
    }
}
declare namespace LocalJSX {
    interface MyComponentOne {
    }
    interface MyComponentTwo {
    }
    interface IntrinsicElements {
        "my-component-one": MyComponentOne;
        [key: \`my-component-one--\${string}\`]: MyComponentOne;
        "my-component-two": MyComponentTwo;
        [key: \`my-component-two--\${string}\`]: MyComponentTwo;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "my-component-one": LocalJSX.MyComponentOne & JSXBase.HTMLAttributes<HTMLMyComponentOneElement>;
            [key: \`my-component-one--\${string}\`]: LocalJSX.MyComponentOne & JSXBase.HTMLAttributes<HTMLMyComponentOneElement>;
            "my-component-two": LocalJSX.MyComponentTwo & JSXBase.HTMLAttributes<HTMLMyComponentTwoElement>;
            [key: \`my-component-two--\${string}\`]: LocalJSX.MyComponentTwo & JSXBase.HTMLAttributes<HTMLMyComponentTwoElement>;
        }
    }
}
`,
};
