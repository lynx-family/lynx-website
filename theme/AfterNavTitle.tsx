import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import {
  CORE_SUBSITES,
  ECOSYSTEM_SUBSITES,
  SUBSITES_CONFIG,
  getLangPrefix,
} from '@site/shared-route-config';
import { Separator } from '@/components/ui/separator';
import { SubsiteLogo, SubsiteView } from './subsite-ui';
import { VersionIndicator } from './VersionIndicator';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const internalSubsites = CORE_SUBSITES;
const externalSubsites = ECOSYSTEM_SUBSITES;

function SubsiteItem({
  subsite,
  onClick,
  size,
  showArrow,
}: {
  subsite: (typeof SUBSITES_CONFIG)[0];
  onClick: () => void;
  size: 'default' | 'large' | 'minimal';
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {children}
      </span>
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

  const handleSubsiteClick = (subsite: (typeof SUBSITES_CONFIG)[0]) => {
    if (subsite.external) {
      window.open(subsite.external, '_blank');
    } else {
      navigate(`${getLangPrefix(lang)}${subsite.home}`);
    }
    onSelect();
  };

  if (isDrawer) {
    return (
      <div className="flex flex-col gap-2 p-1">
        {internalSubsites.map((subsite) => (
          <SubsiteItem
            key={subsite.value}
            subsite={subsite}
            onClick={() => handleSubsiteClick(subsite)}
            size="large"
          />
        ))}
        {externalSubsites.length > 0 && (
          <>
            <Separator />
            <SectionHeader>Ecosystem</SectionHeader>
            {externalSubsites.map((subsite) => (
              <SubsiteItem
                key={subsite.value}
                subsite={subsite}
                onClick={() => handleSubsiteClick(subsite)}
                size="large"
                showArrow
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      <div className="px-3 pt-0 pb-3">
        <SectionHeader>Core</SectionHeader>
        <div className="flex flex-col gap-1 pt-1">
          {internalSubsites.map((subsite) => (
            <SubsiteItem
              key={subsite.value}
              subsite={subsite}
              onClick={() => handleSubsiteClick(subsite)}
              size="default"
            />
          ))}
        </div>
      </div>
      <div className="px-3 pt-0 pb-3">
        <SectionHeader>Ecosystem</SectionHeader>
        <div className="flex flex-col gap-1 pt-1">
          {externalSubsites.map((subsite) => (
            <SubsiteItem
              key={subsite.value}
              subsite={subsite}
              onClick={() => handleSubsiteClick(subsite)}
              size="default"
              showArrow
            />
          ))}
        </div>
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
            <div className="py-5 px-4 pb-7">
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
            <DropdownMenuContent className="w-[520px] p-0" align="start">
              <NavContent onSelect={() => setIsOpen(false)} />
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
      )}
      <VersionIndicator />
    </div>
  );
}
