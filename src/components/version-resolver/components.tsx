import { Link } from '@rspress/core/theme';
import { QRCodeSVG } from 'qrcode.react';
import { Children } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import type {
  VersionRequest,
  VersionResolver,
  VersionResolverArgs,
  VersionResources,
} from './core';
import type {
  ResolvedVersionResource,
  VersionLabelResolver,
} from './registration';
import styles from './styles.module.scss';

type LinkPresentation = Omit<
  ComponentProps<typeof Link>,
  'href' | 'children'
> & {
  children?: ReactNode;
  /** Wrap the effective link content in code styling; defaults to plain text. */
  code?: boolean;
  href?: never;
};

type QRPresentation = Omit<
  ComponentProps<typeof QRCodeSVG>,
  'value' | 'children' | 'dangerouslySetInnerHTML'
> & {
  /** Visible text below the QR; omission keeps only its accessible default name. */
  label?: string;
  value?: never;
};

/** Call once at module scope to preserve component identity across renders. */
export function createVersionComponents<R extends VersionResources, B>(
  resolver: VersionResolver<R, B>,
  getLabel: VersionLabelResolver<R> = ({ href }) => href,
) {
  type Request = VersionRequest<R, B>;

  function resolve({ resource, params }: Request) {
    return resolver.resolve(
      ...([resource, params] as VersionResolverArgs<R, B>),
    );
  }

  function defaultLabel(result: ReturnType<typeof resolve>) {
    const label = getLabel(result as ResolvedVersionResource<R>);
    return label.trim() ? label : result.href;
  }

  function VersionLink({
    resource,
    params,
    children,
    code = false,
    ...props
  }: Request & LinkPresentation) {
    const result = resolve({ resource, params } as Request);
    const hasContent = Children.toArray(children).some(
      (child) => typeof child !== 'string' || child.trim().length > 0,
    );
    const content = hasContent ? children : defaultLabel(result);
    return (
      <Link {...props} href={result.href}>
        {code ? <code>{content}</code> : content}
      </Link>
    );
  }

  function VersionQRCode({
    resource,
    params,
    label,
    ...props
  }: Request & QRPresentation) {
    const result = resolve({ resource, params } as Request);
    const hasLabel = Boolean(label?.trim());
    const text = hasLabel ? label : defaultLabel(result);

    if (import.meta.env.SSG_MD) {
      return <Link href={result.href}>{text}</Link>;
    }

    return (
      <Link className={styles.qrCode} href={result.href}>
        <QRCodeSVG
          {...props}
          value={result.href}
          aria-hidden="true"
          focusable="false"
        />
        <span className={hasLabel ? styles.label : styles.visuallyHidden}>
          {text}
        </span>
      </Link>
    );
  }

  // Protect the returned pair; module-scope creation keeps component identity stable.
  return Object.freeze({ VersionLink, VersionQRCode });
}
