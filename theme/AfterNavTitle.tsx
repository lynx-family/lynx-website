import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import { SUBSITES_CONFIG, getLangPrefix } from '@site/shared-route-config';
import { SubsiteLogo, SubsiteView } from './subsite-ui';
import { VersionIndicator } from './VersionIndicator';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    navigate(`${getLangPrefix(lang)}${subsite.home}`);
    onSelect();
  };

  return (
    <div className="flex flex-col gap-2 p-1">
      {SUBSITES_CONFIG.map((subsite) => (
        <div
          key={subsite.value}
          className="cursor-pointer hover:bg-accent rounded-md p-2"
          onClick={() => handleSubsiteClick(subsite)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSubsiteClick(subsite);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <SubsiteView
            subsite={subsite}
            lang={lang}
            size={isDrawer ? 'large' : 'default'}
          />
        </div>
      ))}
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
    return (
      SUBSITES_CONFIG.find((s) => pathname.includes(s.value)) ||
      SUBSITES_CONFIG[0]
    );
  });
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();

  useEffect(() => {
    const subsite =
      SUBSITES_CONFIG.find((s) => pathname.includes(s.value)) ||
      SUBSITES_CONFIG[0];
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
            <DropdownMenuContent className="w-56 p-0" align="start">
              <NavContent onSelect={() => setIsOpen(false)} />
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
      )}
      <VersionIndicator />
    </div>
  );
}
