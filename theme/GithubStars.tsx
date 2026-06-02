import { useEffect, useState } from 'react';
import styles from './GithubStars.module.scss';

const REPO = 'lynx-family/lynx';
const HREF = `https://github.com/${REPO}`;
const STORAGE_KEY = `rspress-github-stars:${REPO}`;
const TTL_MS = 60 * 60 * 1000;

type Cached = { count: number; fetchedAt: number };

function readCache(): Cached | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (
      typeof parsed?.count !== 'number' ||
      typeof parsed?.fetchedAt !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(count: number) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ count, fetchedAt: Date.now() }),
    );
  } catch {
    // Ignore storage errors (quota, private mode, etc.).
  }
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

export function GithubStars() {
  const [count, setCount] = useState<number | null>(() => {
    const cached = readCache();
    return cached ? cached.count : null;
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return;

    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { stargazers_count: number }) => {
        if (cancelled) return;
        const next = data.stargazers_count;
        if (typeof next === 'number') {
          setCount(next);
          writeCache(next);
        }
      })
      .catch(() => {
        // Network or rate-limit errors: keep last known value or icon-only.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.githubStars}
      aria-label={
        count == null
          ? 'Lynx on GitHub'
          : `Lynx on GitHub, ${count.toLocaleString()} stars`
      }
    >
      <svg
        role="img"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
        />
      </svg>
      {count != null && (
        <span className={styles.count}>{formatCount(count)}</span>
      )}
    </a>
  );
}
