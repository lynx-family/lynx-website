import { ThemeContext, useLang, useSite } from '@rspress/core/runtime';
import { IconMoon, IconSun, SvgWrapper } from '@rspress/core/theme-original';
import { type MouseEvent, useContext } from 'react';
import { flushSync } from 'react-dom';
import './switch-appearance.scss';

const supportAppearanceTransition = () => {
  return (
    typeof document?.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};

// Global lock to prevent re-entrant transition aborts during rapid clicking
let isAppearanceTransitioning = false;

export function SwitchAppearance({ onClick }: { onClick?: () => void }) {
  const { setTheme = () => {} } = useContext(
    ThemeContext as unknown as React.Context<{
      theme?: string;
      setTheme?: (theme: string) => void;
    }>,
  );
  const { site } = useSite();
  const lang = useLang();
  const ariaLabel =
    lang === 'zh' ? '切换浅色和深色外观' : 'Toggle light and dark appearance';

  const handleClick = (event: MouseEvent) => {
    // If a view transition is already in flight, ignore clicks to prevent aborting
    // the running transition mid-animation which causes visual snapping/flickering.
    if (isAppearanceTransitioning) {
      return;
    }

    const supported = supportAppearanceTransition();
    const enabled = site?.themeConfig?.enableAppearanceAnimation;

    // Use DOM ground-truth class to determine current theme
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.classList.contains('rp-dark');
    const nextTheme = isDark ? 'light' : 'dark';
    const willBeDark = nextTheme === 'dark';

    if (supported && enabled) {
      isAppearanceTransitioning = true;
      let x = event.clientX;
      let y = event.clientY;

      // Handle keyboard activation or synthetic click with missing coordinates
      if ((x === 0 && y === 0) || typeof x !== 'number' || Number.isNaN(x)) {
        const rect = (
          event.currentTarget as HTMLElement
        )?.getBoundingClientRect();
        if (rect && rect.width > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        } else {
          x = window.innerWidth / 2;
          y = window.innerHeight / 2;
        }
      }

      // Compute radius to cover the furthest viewport corner
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      // Cancel any leftover view-transition animations from previous runs
      document.getAnimations().forEach((a) => {
        const pseudo = (a.effect as KeyframeEffect)?.pseudoElement;
        if (pseudo?.includes('view-transition')) {
          a.cancel();
        }
      });

      const root = document.documentElement;
      root.classList.add('rp-appearance-transition');

      // For Dark -> Light only: set the initial clip-path variable so the
      // light snapshot does not flash full-screen on Frame 0 before JS runs.
      if (!willBeDark) {
        root.style.setProperty(
          '--rp-vt-clip-initial',
          `circle(0px at ${x}px ${y}px)`,
        );
        root.classList.add('rp-transition-dark-to-light');
      }

      let anim: Animation | null = null;
      const cleanup = () => {
        anim?.cancel();
        root.classList.remove('rp-appearance-transition');
        root.classList.remove('rp-transition-dark-to-light');
        root.style.removeProperty('--rp-vt-clip-initial');
        root.classList.remove('rp-theme-switching');
        isAppearanceTransitioning = false;
      };

      try {
        const transition = document.startViewTransition(async () => {
          root.classList.add('rp-theme-switching');

          flushSync(() => {
            setTheme(nextTheme);
            onClick?.();
          });

          // Allow DOM to settle, then remove transition suppression
          window.getComputedStyle(root).opacity;
          requestAnimationFrame(() => {
            root.classList.remove('rp-theme-switching');
          });
        });

        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        transition.ready.then(() => {
          anim = document.documentElement.animate(
            {
              clipPath: willBeDark ? [...clipPath].reverse() : clipPath,
            },
            {
              duration: 400,
              easing: 'ease-in',
              fill: 'both',
              pseudoElement: willBeDark
                ? '::view-transition-old(root)'
                : '::view-transition-new(root)',
            },
          );
        });

        transition.finished.then(cleanup, cleanup);
      } catch {
        cleanup();
      }
    } else {
      const root = document.documentElement;
      root.classList.add('rp-theme-switching');
      setTheme(nextTheme);
      onClick?.();
      window.getComputedStyle(root).opacity;
      requestAnimationFrame(() => {
        root.classList.remove('rp-theme-switching');
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rp-switch-appearance"
      aria-label={ariaLabel}
    >
      <SvgWrapper
        className="rp-switch-appearance__icon rp-switch-appearance__icon--sun"
        icon={IconSun}
        fill="currentColor"
      />
      <SvgWrapper
        className="rp-switch-appearance__icon rp-switch-appearance__icon--moon"
        icon={IconMoon}
        fill="currentColor"
      />
    </button>
  );
}
