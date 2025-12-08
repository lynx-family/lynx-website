import React, { useState } from 'react';
import SimpleAPITable from '../api-table/SimpleAPITable';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

const examples = [
  'test/api',
  'test/sub-category/mod-bar',
  'test/api.api_with_nested_api',
  'test/api.api_with_nested_api.nested_api',
];

const APITableExplorer: React.FC = () => {
  const [query, setQuery] = useState(examples[0]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Search for an API query</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            className="font-mono"
            type="text"
            placeholder="Search API..."
            value={query}
            onChange={handleInputChange}
          />
          <p>Try the following examples:</p>
          <div className="flex flex-wrap gap-x-2">
            {examples.map((example) => (
              <Button
                className="p-0"
                key={example}
                variant="link"
                size="sm"
                onClick={() => handleExampleClick(example)}
              >
                <code>{example}</code>
              </Button>
            ))}
          </div>
          <p className="mt-4">
            Below is the render output of{' '}
            <code>{`<SimpleAPITable query="${query}" />`}</code>
          </p>
        </CardContent>
      </Card>
      <div>
        <SimpleAPITable query={query} />
      </div>
    </div>
  );
};

export default APITableExplorer;
