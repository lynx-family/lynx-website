import { useLang, withBase, usePageData } from '@rspress/core/runtime';
import type BCD from '@lynx-js/lynx-compat-data';
import CompatTable from './CompatTable';
import React from 'react';

type PropsWithQuery = { query: string; locale?: string };
type PropsWithData = {
  query: string;
  data: BCD.Identifier;
  browsers: BCD.Platforms;
  locale?: string;
};

function parseQuery(query: string): { module: string; accessor: string } {
  const parts = query.split('/');
  const last = parts[parts.length - 1];
  const dot = last.indexOf('.');
  if (dot === -1) {
    return { module: query, accessor: parts.join('.') };
  }
  const module = parts.slice(0, -1).join('/') + '/' + last.slice(0, dot);
  const accessor = parts.join('.').replace(/\//g, '.');
  return { module, accessor };
}

function getNestedValue(obj: any, path: string): any {
  return path
    .split('.')
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj,
    );
}

export default function SimpleAPITable(
  props: PropsWithData | Partial<PropsWithQuery>,
) {
  const lang = useLang();
  const lcdBase = withBase('/lynx-compat-data');
  const { page } = usePageData();
  const providedQuery = (props as any).query as string | undefined;
  const query = providedQuery ?? (page?.frontmatter?.api as string | undefined);
  const locale = (props as any).locale ?? lang;

  const [data, setData] = React.useState<BCD.Identifier | null>(
    (props as any).data ?? null,
  );
  const [platforms, setPlatforms] = React.useState<BCD.Platforms | null>(
    (props as any).browsers ?? null,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!query) return;
    if (data && platforms) return;
    const { module, accessor } = parseQuery(query);
    Promise.all([
      fetch(`${lcdBase}/${module}.json`).then((r) => {
        if (!r.ok) throw new Error(r.status.toString());
        return r.json();
      }),
      fetch(`${lcdBase}/platforms/platforms.json`).then((r) => {
        if (!r.ok) throw new Error(r.status.toString());
        return r.json();
      }),
    ])
      .then(([apiData, platformData]) => {
        const identifier = getNestedValue(apiData, accessor);
        setData(identifier);
        setPlatforms(platformData.platforms);
      })
      .catch((e) => setError(e.toString()));
  }, [query]);

  if (!query) return <p>Missing API query</p>;
  if (error) return <p>{error}</p>;
  if (!data || !platforms) return <p>Loading...</p>;

  return (
    <div className="rp-not-doc">
      <CompatTable
        locale={locale}
        query={query.includes('.') ? query.replace(/\//g, '.') : query}
        data={data}
        browsers={platforms}
      />
    </div>
  );
}
