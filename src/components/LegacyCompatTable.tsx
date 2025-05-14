import { APITable } from '@lynx';

interface Props {
  metadata: string;
  // This is ignored as it's always true in the current usages.
  showPlatformCategoryHead?: boolean | undefined;
}

// Polyfilled from the APITable component.
// This is a legacy version left for compatibility reasons
export default function LegacyCompatTable({ metadata }: Props) {
  // Convert metadata string from "/" to "."
  // const query = metadata.replace(/\//g, '.');
  return <APITable query={metadata} />;
}
