import { cn } from '@/lib/utils';
import { Link } from '@rspress/core/theme';
import { useI18n, useLang, withBase } from '@rspress/core/runtime';
import { useEffect, useRef } from 'react';
import { BorderBeam } from '@/components/home-comps/border-beam';
import { getLangPrefix } from '../../../shared-route-config';
import './TutorialTabs.scss';

export interface TutorialTabItem {
  slug: string;
  /** Resolved href (already locale-prefixed by the caller). */
  href: string;
  /** Display label. */
  label: string;
}

interface TutorialTabsProps {
  tabs: TutorialTabItem[];
  active: string;
  className?: string;
}

export const TutorialTabs = ({
  tabs,
  active,
  className,
}: TutorialTabsProps) => {
  // On narrow viewports the track scrolls horizontally (see SCSS). If the
  // active tab lives past the right edge — e.g. user lands on /product-detail
  // on a phone — center it into view so the selected state is visible on
  // arrival. Only runs when the track actually overflows; on desktop the
  // track fits all tabs and this is a no-op.
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = trackRef.current;
    const card = activeRef.current;
    if (!track || !card) return;
    if (track.scrollWidth <= track.clientWidth) return;
    track.scrollLeft =
      card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
  }, [active]);

  return (
    <div className={cn('tutorial-tabs', className)}>
      <div className="tutorial-tabs__track" ref={trackRef}>
        {tabs.map((tab) => {
          const isActive = tab.slug === active;
          const cls = cn(
            'tutorial-tabs__tab',
            isActive && 'tutorial-tabs__tab--active',
          );
          if (isActive) {
            return (
              <div
                key={tab.slug}
                ref={activeRef}
                className={cls}
                aria-current="page"
              >
                <BorderBeam duration={3} size={2} />
                <span className="tutorial-tabs__label">{tab.label}</span>
              </div>
            );
          }
          return (
            <Link key={tab.slug} href={tab.href} className={cls}>
              <span className="tutorial-tabs__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const DEFAULT_TABS: Array<{ slug: string; labelKey: string; path: string }> = [
  { slug: 'gallery', labelKey: 'learn.gallery', path: '/learn/gallery' },
  {
    slug: 'product-detail',
    labelKey: 'learn.product-detail',
    path: '/learn/product-detail',
  },
];

interface LearnTutorialTabsProps {
  active: string;
  className?: string;
}

/** Convenience wrapper that resolves labels via i18n and prefixes locale. */
export const LearnTutorialTabs = ({
  active,
  className,
}: LearnTutorialTabsProps) => {
  const t = useI18n();
  const lang = useLang();
  const langPrefix = getLangPrefix(lang);
  const tabs: TutorialTabItem[] = DEFAULT_TABS.map((d) => ({
    slug: d.slug,
    href: withBase(`${langPrefix}${d.path}`),
    label: t(d.labelKey as any) as string,
  }));
  return <TutorialTabs tabs={tabs} active={active} className={className} />;
};
