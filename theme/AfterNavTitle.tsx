import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import {
  CORE_SUBSITES,
  SUBSITES_CONFIG,
  DROPDOWN_CORE,
  DROPDOWN_JS_FRAMEWORK,
  DROPDOWN_NATIVE_FRAMEWORK,
  getSubItems,
  getLangPrefix,
} from '@site/shared-route-config';
import { Separator } from '@/components/ui/separator';
import { SubsiteLogo } from './subsite-ui';
import { VersionIndicator } from './VersionIndicator';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Subsite = (typeof SUBSITES_CONFIG)[0];

const internalSubsites = CORE_SUBSITES;

function Badge({ text }: { text: string }) {
  return (
    <span className="text-[10px] leading-none font-medium text-muted-foreground/70 border border-border rounded px-1.5 py-0.5">
      {text}
    </span>
  );
}

function SubsiteView({
  subsite,
  lang,
  size = 'default',
}: {
  subsite: Subsite;
  lang: string;
  size?: 'default' | 'large' | 'minimal';
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${size === 'large' ? 'h-8 w-8' : 'h-6 w-6'}`}>
        <SubsiteLogo subsite={subsite} />
      </div>
      <div className="flex flex-col items-start">
        <span
          className={`font-medium text-foreground ${size === 'large' ? 'text-base' : 'text-sm'} flex items-center gap-1.5`}
        >
          {subsite.label}
          {subsite.badge && <Badge text={subsite.badge} />}
        </span>
        {size !== 'minimal' && (
          <span
            className={`text-muted-foreground ${size === 'large' ? 'text-sm' : 'text-xs'}`}
          >
            {lang === 'zh' ? subsite.descriptionZh : subsite.description}
          </span>
        )}
      </div>
    </div>
  );
}

function SubsiteItem({
  subsite,
  onClick,
  size,
  showArrow,
}: {
  subsite: Subsite;
  onClick: () => void;
  size: 'default' | 'large' | 'minimal';
  showArrow?: boolean;
}) {
  const lang = useLang();
  const disabled = subsite.disabled;
  return (
    <div
      className={`rounded-md p-2 flex items-center justify-between ${
        disabled
          ? 'opacity-60 cursor-default'
          : 'cursor-pointer hover:bg-accent'
      }`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
      }
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <SubsiteView subsite={subsite} lang={lang} size={size} />
      {showArrow && (
        <ArrowUpRight
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}

function SubsiteChildItem({
  subsite,
  onClick,
  showArrow,
}: {
  subsite: Subsite;
  onClick: () => void;
  showArrow?: boolean;
}) {
  const lang = useLang();
  return (
    <div
      className="cursor-pointer hover:bg-accent rounded-md p-2 flex items-center justify-between"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative h-5 w-5 shrink-0">
          <SubsiteLogo subsite={subsite} />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
            {subsite.label}
            {subsite.badge && <Badge text={subsite.badge} />}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {lang === 'zh' ? subsite.descriptionZh : subsite.description}
          </span>
        </div>
      </div>
      {showArrow && (
        <ArrowUpRight
          className="h-3 w-3 text-muted-foreground/50 shrink-0"
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {children}
      </span>
    </div>
  );
}

function SubsiteItemWithChildren({
  subsite,
  onNavigate,
  size,
}: {
  subsite: Subsite;
  onNavigate: (s: Subsite) => void;
  size: 'default' | 'large';
}) {
  const children = getSubItems(subsite.value);
  if (children.length === 0) {
    return (
      <SubsiteItem
        subsite={subsite}
        onClick={() => onNavigate(subsite)}
        size={size}
        showArrow={!!subsite.external}
      />
    );
  }
  return (
    <div>
      <SubsiteItem
        subsite={subsite}
        onClick={() => onNavigate(subsite)}
        size={size}
        showArrow={!!subsite.external}
      />
      <div className="flex flex-col gap-0.5 ml-5 pl-3 border-l border-border">
        {children.map((child) => (
          <SubsiteChildItem
            key={child.value}
            subsite={child}
            onClick={() => onNavigate(child)}
            showArrow={!!child.external}
          />
        ))}
      </div>
    </div>
  );
}

function NavColumn({
  label,
  items,
  onNavigate,
  size = 'default',
}: {
  label: string;
  items: Subsite[];
  onNavigate: (s: Subsite) => void;
  size?: 'default' | 'large';
}) {
  return (
    <div>
      <SectionHeader>{label}</SectionHeader>
      <div className="flex flex-col gap-0.5 pt-1">
        {items.map((subsite) => (
          <SubsiteItemWithChildren
            key={subsite.value}
            subsite={subsite}
            onNavigate={onNavigate}
            size={size}
          />
        ))}
      </div>
    </div>
  );
}

function NavContent({
  onSelect,
  isDrawer,
}: {
  onSelect: () => void;
  isDrawer?: boolean;
}) {
  const navigate = useNavigate();
  const lang = useLang();

  const handleSubsiteClick = (subsite: Subsite) => {
    if (subsite.disabled) return;
    if (subsite.external) {
      window.open(subsite.external, '_blank');
    } else {
      navigate(`${getLangPrefix(lang)}${subsite.home}`);
    }
    onSelect();
  };

  const t = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  if (isDrawer) {
    return (
      <div className="flex flex-col gap-2 p-1">
        <NavColumn
          label={t('Platform', '平台')}
          items={DROPDOWN_CORE}
          onNavigate={handleSubsiteClick}
          size="large"
        />
        <Separator />
        <NavColumn
          label={t('UI Framework', 'UI 框架')}
          items={DROPDOWN_JS_FRAMEWORK}
          onNavigate={handleSubsiteClick}
          size="large"
        />
        <Separator />
        <NavColumn
          label={t('App Framework', '应用框架')}
          items={DROPDOWN_NATIVE_FRAMEWORK}
          onNavigate={handleSubsiteClick}
          size="large"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 divide-x divide-border">
      <div className="px-3 pt-0 pb-3">
        <NavColumn
          label={t('Platform', '平台')}
          items={DROPDOWN_CORE}
          onNavigate={handleSubsiteClick}
        />
      </div>
      <div className="px-3 pt-0 pb-3">
        <NavColumn
          label={t('UI Framework', 'UI 框架')}
          items={DROPDOWN_JS_FRAMEWORK}
          onNavigate={handleSubsiteClick}
        />
      </div>
      <div className="px-3 pt-0 pb-3">
        <NavColumn
          label={t('App Framework', '应用框架')}
          items={DROPDOWN_NATIVE_FRAMEWORK}
          onNavigate={handleSubsiteClick}
        />
      </div>
    </div>
  );
}

const Trigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className="flex items-center rounded-md px-1.5 py-2 text-sm text-foreground hover:bg-accent -ml-1 -mb-1"
      {...props}
    >
      <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
});

Trigger.displayName = 'Trigger';

function Slash() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground -m-2"
      role="img"
      aria-label="Slash separator"
    >
      <path d="M17 2l-10 20" />
    </svg>
  );
}

export default function AfterNavTitle() {
  const [isMobile, setIsMobile] = useState(false);
  const { pathname } = useLocation();
  const lang = useLang();
  const [currentSubsite, setCurrentSubsite] = useState(() => {
    const segments = pathname.split('/');
    return (
      internalSubsites.find((s) =>
        segments.some((seg) => seg.replace(/\.html$/, '') === s.value),
      ) || internalSubsites[0]
    );
  });
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();

  useEffect(() => {
    const segments = pathname.split('/');
    const subsite =
      internalSubsites.find((s) =>
        segments.some((seg) => seg.replace(/\.html$/, '') === s.value),
      ) || internalSubsites[0];
    setCurrentSubsite(subsite);
  }, [pathname]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = () => {
    if (!isMobile) {
      clearTimeout(hoverTimeout);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      const timeout = setTimeout(() => setIsOpen(false), 200);
      setHoverTimeout(timeout);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentSubsite.value === 'guide' ? (
        <Link
          href={`${getLangPrefix(lang)}${currentSubsite.home}`}
          className="text-lg font-semibold"
        >
          Lynx
        </Link>
      ) : (
        <>
          <Slash />
          <Link
            href={`${getLangPrefix(lang)}${currentSubsite.home}`}
            className="flex items-center gap-2"
          >
            <div className="relative h-[28px] w-[28px]">
              <SubsiteLogo subsite={currentSubsite} />
            </div>
            <span className="text-base font-medium">
              {currentSubsite.label}
            </span>
          </Link>
        </>
      )}

      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Trigger />
          </DrawerTrigger>
          <DrawerContent>
            <div className="py-5 px-4 pb-7 max-h-[70dvh] overflow-y-auto">
              <NavContent onSelect={() => setIsOpen(false)} isDrawer />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <DropdownMenuTrigger asChild>
              <Trigger />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[720px] p-0" align="start">
              <NavContent onSelect={() => setIsOpen(false)} />
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
      )}
      <VersionIndicator />
    </div>
  );
}
