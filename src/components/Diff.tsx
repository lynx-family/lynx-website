import * as React from 'react';
import { DiffEditor, Monaco } from '@monaco-editor/react';

export default function Diff(): React.ReactElement {
  return (
    <DiffEditor
      height="200px" // By default, it fully fits with its parent
      theme="vs-dark"
      language="typescript"
      loading={'Loading...'}
      originalLanguage="javascript"
      modifiedLanguage="javascript"
      original={`const CONST = 1
class A extends Component {
    render() { ... }
}`}
      modified={`class A extends Component {
    state = {
        CONST: 1,
    }
    render() { ... }
}`}
      options={{ fontSize: 20, scrollbar: { alwaysConsumeMouseWheel: false } }}
      beforeMount={(monaco: Monaco) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
        });
      }}
    />
  );
}
