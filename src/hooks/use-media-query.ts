import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

// Convenience hook for detecting desktop (md breakpoint and above)
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

// Convenience hook for detecting mobile (below md breakpoint)
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
