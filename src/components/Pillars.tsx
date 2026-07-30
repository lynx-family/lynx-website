import { Card, CardContent } from './ui/card';

export interface Pillar {
  description: string;
  number: string;
  title: string;
}

interface PillarsProps {
  items: Pillar[];
}

/**
 * A responsive group of short, numbered arguments or features.
 *
 * The cards render as one column by default and as three columns on wide
 * screens. The titles intentionally use styled text rather than headings so
 * they do not appear in a page's table of contents.
 */
export function Pillars({ items }: PillarsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3" role="list">
      {items.map(({ description, number, title }) => (
        <div className="h-full" key={`${number}-${title}`} role="listitem">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <span className="text-sm font-semibold text-primary">
                {number}
              </span>
              <span className="text-lg font-semibold leading-snug">
                {title}
              </span>
              <span className="text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
