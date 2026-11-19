import { ThemeContext, useLang, useSite } from '@rspress/core/runtime';
import { IconMoon, IconSun, SvgWrapper } from '@rspress/core/theme-original';
// Load the shared rules even when the original switch is tree-shaken.
import '@rspress/core/dist/theme/components/SwitchAppearance/global.css';
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

// Shared by the desktop and mobile controls, as in Rspress's switch.
let isAppearanceTransitioning = false;

type SwitchAppearanceProps = {
  onClick?: () => void;
};

// Keep native button semantics and a keyboard animation origin until Rspress
// provides them. The transition lifecycle follows the released implementation.
export function SwitchAppearance({ onClick }: SwitchAppearanceProps) {
  const { theme, setTheme = () => {} } = useContext(ThemeContext);
  const { site } = useSite();
  const lang = useLang();
  const ariaLabel =
    lang === 'zh' ? '切换浅色和深色外观' : 'Toggle light and dark appearance';

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // If a view transition is already in flight, ignore clicks to prevent aborting
    // the running transition mid-animation which causes visual snapping/flickering.
    if (isAppearanceTransitioning) {
      return;
    }

    const supported = supportAppearanceTransition();
    const enabled = site?.themeConfig?.enableAppearanceAnimation;

    const root = document.documentElement;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    let updated = false;
    const updateTheme = () => {
      updated = true;
      flushSync(() => {
        setTheme(nextTheme);
        onClick?.();
      });
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
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
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
