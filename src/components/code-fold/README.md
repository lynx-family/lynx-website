# CodeFold Component

The `CodeFold` component is a versatile and interactive way to showcase code examples in the Lynx documentation. It provides a split-view interface with code on one side and a visual representation on the other, along with an optional preview-image.

## Features

- Split view with resizable panels for code and image
- The component supports folding display or scrolling display of code areas
- Customizable image display
- Responsive design

## Usage

To use the `CodeFold` component in your documentation:

1. Import the component:

   ```jsx
   import { CodeFold } from '@lynx';
   ```

2. Use it in your MDX files:
   ```jsx
   <CodeFold img="path/to/example/image.webp" height={400} toggle>
     {`Your code example here`}
   </CodeFold>
   ```

## Writing Code Examples

One of the key advantages of using `CodeFold` in MDX files is that you can write typical markdown code blocks as usual. The component will automatically render these code blocks within its interface. For example:

````jsx
<CodeFold img="path/to/button-example.webp" height={300} toggle>
  ```jsx
  <Button
    text="Click me"
    onClick={() => console.log('Button clicked')}
    textStyle={{ color: 'white' }}
    normalStyle={{
      width: '100%',
      height: '50px',
      background: 'blue',
      borderRadius: '5px',
    }}
  />
  <Button
    text="Click me"
    onClick={() => console.log('Button clicked')}
    textStyle={{ color: 'white' }}
    normalStyle={{
      width: '100%',
      height: '50px',
      background: 'blue',
      borderRadius: '5px',
    }}
  />
  ```
</CodeFold>
````

This approach allows you to maintain the familiar markdown syntax while benefiting from the enhanced visualization and interactivity provided by `CodeFold`.

## Props

- `img` (Optional): URL of the example image
- `toggle` (Optional): Enable Code-fold
- `height` (Optional): The height of the code area is 300 by default. If the toggle attribute is set, the portion exceeding 300 will be folded. If the toggle attribute is not set, the code area will support scrolling
- `children` (required): The code example to display

## Example

See `docs/en/api/css/properties/clip-path.mdx`, `docs/en/api/lynx-native-api/resource-fetcher/GenericResourceFetcher.mdx` for practical examples of how to use the `CodeFold` component to document.
