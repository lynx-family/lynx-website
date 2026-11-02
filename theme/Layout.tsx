import {
  Head,
  removeBase,
  useLocation,
  usePageData,
} from '@rspress/core/runtime';
import { Layout as BaseLayout } from '@rspress/core/theme-original';
import { useEffect } from 'react';
import { Footer } from '@/components/home-comps';
import AfterNavTitle from './AfterNavTitle';
import BeforeDocContent from './BeforeDocContent';
import BeforeSidebar from './BeforeSidebar';
import OgHead from './OgHead';
import { isGeneratedApiPage } from './api-reference';
import { subsiteOf } from './api-subsites';
import PageSdkSince from './versioning/PageSdkSince';

const NULL_BYTE_RE = /\u0000/g;

/** Remove MDX escape markers from rendered heading IDs and their anchor links. */
const sanitizeHeadingAnchors = () => {
  document
    .querySelectorAll<HTMLElement>(
      '.rspress-doc h1[id], .rspress-doc h2[id], .rspress-doc h3[id], .rspress-doc h4[id], .rspress-doc h5[id], .rspress-doc h6[id]',
    )
    .forEach((heading) => {
      if (heading.id.includes('\u0000')) {
        heading.id = heading.id.replace(NULL_BYTE_RE, '');
      }

      const anchor = heading.querySelector<HTMLAnchorElement>(
        'a.rp-header-anchor[href]',
      );
      const href = anchor?.getAttribute('href');
      if (anchor && href?.includes('\u0000')) {
        anchor.setAttribute('href', href.replace(NULL_BYTE_RE, ''));
      }
    });
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      htmlAttrs: unknown;
    }
  }
}

/**
 * Apply document metadata and shared slot defaults to the Rspress layout.
 * Supplied beforeDocContent replaces the default, including explicit null.
 * The shared content and composition contract live in BeforeDocContent.tsx.
 */
export default function Layout({
  afterNavTitle = <AfterNavTitle />,
  beforeDocContent = <BeforeDocContent />,
  ...props
}: Parameters<typeof BaseLayout>[0]) {
  const { pathname } = useLocation();
  const { page } = usePageData();
  const subsite = subsiteOf(pathname);
  const isApiReference = isGeneratedApiPage(page.pagePath);
  const normalizedPath = removeBase(pathname);
  const pathNoLang = normalizedPath.replace(/^\/zh\//, '/');
  const isStatusRoute = /^\/api\/status\/?$/.test(pathNoLang);

  useEffect(() => {
    sanitizeHeadingAnchors();
  }, [pathname]);

  return (
    <>
      <Head>
        <htmlAttrs
          data-subsite={subsite}
          data-api-reference={isApiReference ? 'true' : null}
          data-scroll-locked={isStatusRoute ? 'true' : null}
        />
      </Head>
      <OgHead />
      {/* Rspress omits document slots when exporting Markdown. */}
      {import.meta.env?.SSG_MD && <PageSdkSince />}
      <BaseLayout
        {...props}
        afterNavTitle={afterNavTitle}
        beforeSidebar={<BeforeSidebar />}
        beforeDocContent={beforeDocContent}
        bottom={<Footer />}
      />
    </>
  );
}
