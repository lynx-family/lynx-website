# TypeScript

Lynx supports TypeScript through Rsbuild. See the [Rsbuild TypeScript guide](https://rsbuild.rs/guide/basic/typescript) for transpilation, path aliases, `tsconfig.json` configuration and type checking. **Transpilation does not perform type checking**; configure a type checking plugin or run `tsc` separately.

For build-time types such as CSS Modules and static assets, use [Rsbuild's preset types](https://rsbuild.rs/guide/basic/typescript#preset-types) by adding `@rsbuild/core/types` to your existing `compilerOptions.types` array.

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

You can extend the `interface IntrinsicElements` from `@lynx-js/types` to add your [custom native element](/guide/custom-native-component.mdx)

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
