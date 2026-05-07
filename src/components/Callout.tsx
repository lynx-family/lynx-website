import {
  Callout as CalloutBase,
  type CalloutProps,
} from '@rspress/core/theme-original';

type CalloutPropsWithoutType = Omit<CalloutProps, 'type'>;

export function Note(props: CalloutPropsWithoutType) {
  return <CalloutBase {...props} type="note" title={props.title ?? 'NOTE'} />;
}

export function Warning(props: CalloutPropsWithoutType) {
  return (
    <CalloutBase {...props} type="warning" title={props.title ?? 'WARNING'} />
  );
}

export function Danger(props: CalloutPropsWithoutType) {
  return (
    <CalloutBase {...props} type="danger" title={props.title ?? 'DANGER'} />
  );
}

export function Tip(props: CalloutPropsWithoutType) {
  return <CalloutBase {...props} type="tip" title={props.title ?? 'TIP'} />;
}

export function Info(props: CalloutPropsWithoutType) {
  return <CalloutBase {...props} type="info" title={props.title ?? 'INFO'} />;
}

export function Details(props: CalloutPropsWithoutType) {
  return <CalloutBase {...props} type="details" />;
}

// For backwards compatibility
type CalloutType = 'note' | 'warning' | 'danger' | 'tip' | 'info' | 'details';

export default function Callout({
  type,
  ...props
}: CalloutProps & {
  type: CalloutType;
}) {
  const defaultTitles: Record<Exclude<CalloutType, 'details'>, string> = {
    note: 'NOTE',
    warning: 'WARNING',
    danger: 'DANGER',
    tip: 'TIP',
    info: 'INFO',
  };
  return (
    <CalloutBase
      {...props}
      type={type}
      title={
        type === 'details'
          ? props.title
          : (props.title ??
            defaultTitles[type as Exclude<CalloutType, 'details'>])
      }
    />
  );
}
