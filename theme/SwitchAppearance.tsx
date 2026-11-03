import { ThemeContext, useLang, useSite } from '@rspress/core/runtime';
import { IconMoon, IconSun, SvgWrapper } from '@rspress/core/theme-original';
import { type MouseEvent, useContext } from 'react';
import { flushSync } from 'react-dom';
import { getClipPath } from './getClipPath';
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
      if (
        event.detail === 0 ||
        (x === 0 && y === 0) ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
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

      const clipPath = getClipPath({
        height: window.innerHeight,
        width: window.innerWidth,
        x,
        y,
      });

      const root = document.documentElement;
      root.classList.add('rp-appearance-transition');

      // Clip the new light snapshot before the animation is attached.
      if (!willBeDark) {
        root.style.setProperty('--rp-vt-clip-initial', clipPath[0]);
        root.classList.add('rp-transition-dark-to-light');
      }

      let anim: Animation | null = null;
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) {
          return;
        }
        cleaned = true;
        anim?.cancel();
        root.classList.remove('rp-appearance-transition');
        root.classList.remove('rp-transition-dark-to-light');
        root.style.removeProperty('--rp-vt-clip-initial');
        isAppearanceTransitioning = false;
      };

      let updated = false;
      const updateTheme = () => {
        updated = true;
        flushSync(() => {
          setTheme(nextTheme);
          onClick?.();
        });
      };

      try {
        const transition = document.startViewTransition(async () => {
          updateTheme();
        });
        transition.updateCallbackDone.catch(() => {
          transition.skipTransition();
        });

        transition.ready
          .then(() => {
            if (cleaned) {
              return;
            }
            anim = root.animate(
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
          })
          .catch(() => {
            // Skipping still runs the update callback. Keep ownership until
            // finished settles so a late callback cannot race another switch.
            transition.skipTransition();
          });
        transition.finished.then(cleanup, cleanup);
      } catch {
        cleanup();
        if (!updated) {
          updateTheme();
        }
      }
    } else {
      setTheme(nextTheme);
      onClick?.();
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
