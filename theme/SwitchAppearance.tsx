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
    const root = document.documentElement;
    const isDark =
      root.classList.contains('dark') || root.classList.contains('rp-dark');
    const nextTheme = isDark ? 'light' : 'dark';

    let updated = false;
    const updateTheme = () => {
      updated = true;
      // Rspress 2.0.19 does not suppress surface transitions in setTheme.
      root.classList.add('rp-theme-switching');
      try {
        flushSync(() => {
          setTheme(nextTheme);
          onClick?.();
        });
      } finally {
        void window.getComputedStyle(root).opacity;
        requestAnimationFrame(() => {
          root.classList.remove('rp-theme-switching');
        });
      }
    };

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

      // CSS starts clipping as soon as the snapshots are created.
      root.style.setProperty('--rp-vt-clip-start', clipPath[0]);
      root.style.setProperty('--rp-vt-clip-end', clipPath[1]);
      root.classList.add('rp-appearance-transition');

      const cleanup = () => {
        root.classList.remove('rp-appearance-transition');
        root.style.removeProperty('--rp-vt-clip-start');
        root.style.removeProperty('--rp-vt-clip-end');
        root.classList.remove('rp-theme-switching');
        isAppearanceTransitioning = false;
      };

      try {
        const transition = document.startViewTransition(async () => {
          updateTheme();
        });
        transition.updateCallbackDone.catch(() => {
          transition.skipTransition();
        });
        transition.ready.catch(() => {
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
      updateTheme();
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
