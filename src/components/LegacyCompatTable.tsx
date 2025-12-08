import { SimpleAPITable } from '@lynx';

interface Props {
  metadata: string;
  // This is ignored as it's always true in the current usages.
  showPlatformCategoryHead?: boolean | undefined;
}

/**
 * @deprecated
 * Use `APITable` instead.
 */
export default function LegacyCompatTable({ metadata }: Props) {
  // Convert metadata string from "/" to "."
  // const query = metadata.replace(/\//g, '.');
  return <SimpleAPITable query={metadata} />;
}
