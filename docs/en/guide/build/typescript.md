# TypeScript

TypeScript works out of the box: `.ts` and `.tsx` files, path aliases, a custom `tsconfig.json` path, transpilation and type checking are all handled by Rsbuild. See the [Rsbuild TypeScript guide](https://rsbuild.rs/guide/basic/typescript) for those.

This page covers the parts that are specific to Lynx.

## Build-time type declarations

The build provides various built-in features like CSS Modules and [static assets](https://rsbuild.rs/guide/basic/static-assets). TypeScript does not know about these features and the corresponding type declarations.

To solve this, add `@rsbuild/core/types` to the `types` array in `tsconfig.json`, keeping the entries already there:

```json title=tsconfig.json
{
  "compilerOptions": {
    "types": ["@rsbuild/core/types"]
  }
}
```

:::tip
[`@lynx-js/create-lynx`](https://www.npmjs.com/package/@lynx-js/create-lynx) will automatically include this for you.
:::

## Extending Lynx types

Lynx provides default types, but you may need to extend or customize certain type definitions for your application.

- [`GlobalProps`](#globalprops): extends the type definition for `lynx.__globalProps`
- [`InitData`](#initdata): extends the return type of [`useInitData()`](/api/react/Hooks/useInitData)
- [`IntrinsicElements`](#intrinsicelements): extends the type definition for elements (e.g: you may have your own `<input>` element)
- [`NativeModules`](#nativemodules): extends the type definition for [custom native modules](/guide/use-native-modules.mdx).

### GlobalProps

You can extend the `interface GlobalProps` from `@lynx-js/types` to add custom properties:

```ts title="src/global-props.d.ts"
declare module '@lynx-js/types' {
  interface GlobalProps {
    foo: string;
    bar: number;
  }
}

export {}; // This export makes the file a module
```

After this extension, TypeScript will recognize and provide type checking for `lynx.__globalProps.foo` and `lynx.__globalProps.bar`.

### InitData

You can extend the `interface InitData` from `@lynx-js/react` to add your custom data properties:

```ts title="src/init-data.d.ts"
declare module '@lynx-js/react' {
  interface InitData {
    foo: string;
    bar: number;
  }
}

export {}; // This export makes the file a module
```

With this extension, TypeScript will provide type checking for `useInitData().foo` and `useInitData().bar` in your components.

### IntrinsicElements

You can extends the `interface IntrinsicElements` from `@lynx-js/types` to add your [custom native element](/guide/custom-native-component.mdx)

Here is an example for a `<input>` element with required `type` and optional `bindinput` and `value`.

```ts title="src/intrinsic-element.d.ts"
import * as Lynx from '@lynx-js/types';

declare module '@lynx-js/types' {
  interface IntrinsicElements extends Lynx.IntrinsicElements {
    input: {
      bindinput?: (e: { type: 'input'; detail: { value: string } }) => void;
      type: string;
      value?: string | undefined;
    };
  }
}
```

### NativeModules

You can extend the `interface NativeModules` from `@lynx-js/types` to add custom [native modules](/guide/use-native-modules.mdx):

Here is an example for a `NativeLocalStorageModule` with 3 methods:

```ts title="src/native-modules.d.ts"
declare module '@lynx-js/types' {
  interface NativeModules {
    NativeLocalStorageModule: {
      clearStorage(): void;
      getStorageItem(key: string): string | null;
      setStorageItem(key: string, value: string): void;
    };
  }
}

export {}; // This export makes the file a module
```
