# TypeScript

TypeScript 开箱可用：`.ts` / `.tsx` 文件、路径别名、自定义 `tsconfig.json` 路径、编译与类型检查都由 Rsbuild 负责，参见 [Rsbuild 的 TypeScript 指南](https://rsbuild.rs/zh/guide/basic/typescript)。

本页只讲 Lynx 特有的部分。

## 构建期类型声明

构建提供了 CSS Modules、[静态资源](https://rsbuild.rs/zh/guide/basic/static-assets)等内置功能，这些功能需要添加对应的类型声明。

请在 `tsconfig.json` 的 `types` 数组中追加 `@rsbuild/core/types`，保留已有的项：

```json title=tsconfig.json
{
  "compilerOptions": {
    "types": ["@rsbuild/core/types"]
  }
}
```

:::tip
[`@lynx-js/create-lynx`](https://www.npmjs.com/package/@lynx-js/create-lynx) 在创建项目时会自动包含该配置。
:::

## 扩展 Lynx 类型

Lynx 提供了默认类型，但你可能需要为你的应用扩展或自定义某些类型定义。

- [`GlobalProps`](#globalprops)：扩展 `lynx.__globalProps` 的类型定义
- [`InitData`](#initdata)：扩展 [`useInitData()`](/api/react/Hooks/useInitData) 的返回类型
- [`IntrinsicElements`](#intrinsicelements): 扩展元件的类型（例如：可以为 `<input>` 元件定义类型）
- [`NativeModules`](#nativemodules): 扩展[原生模块](/guide/use-native-modules.mdx)的类型定义

### GlobalProps

你可以扩展 `@lynx-js/types` 中的 `interface GlobalProps` 来添加自定义属性：

```ts title="src/global-props.d.ts"
declare module '@lynx-js/types' {
  interface GlobalProps {
    foo: string;
    bar: number;
  }
}

export {}; // 这个导出使文件成为一个模块
```

完成此扩展后，TypeScript 将识别并为 `lynx.__globalProps.foo` 和 `lynx.__globalProps.bar` 提供类型检查。

### InitData

你可以扩展 `@lynx-js/react` 中的 `interface InitData` 来添加自定义数据属性：

```ts title="src/init-data.d.ts"
declare module '@lynx-js/react' {
  interface InitData {
    foo: string;
    bar: number;
  }
}

export {}; // 这个导出使文件成为一个模块
```

通过这个扩展，TypeScript 将为组件中的 `useInitData().foo` 和 `useInitData().bar` 提供类型检查。

### IntrinsicElements

你可以扩展 `@lynx-js/types` 中的 `interface IntrinsicElements` 来添加你的[自定义元件](/guide/custom-native-component.mdx)类型定义。

以下是一个 `<input>` 元件的示例，它具有必需的 `type` 属性和可选的 `bindinput` 和 `value` 属性。

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

你可以扩展 `@lynx-js/types` 中的 `interface NativeModules` 来添加自定义[原生模块](/guide/use-native-modules.mdx)。

下面这个示例定义了一个有三个方法的 `NativeLocalStorageModule` 模块：

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
