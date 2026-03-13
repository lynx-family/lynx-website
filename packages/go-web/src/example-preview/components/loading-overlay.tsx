import { useDark } from '@rspress/core/runtime';

const LOGO_LIGHT =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg';
const LOGO_DARK =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg';

export const LoadingOverlay = ({ visible }: { visible: boolean }) => {
  const isDark = useDark();
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        zIndex: 1,
        background: isDark ? '#1b1b1f' : '#ffffff',
      }}
    >
      <img
        src={isDark ? LOGO_DARK : LOGO_LIGHT}
        alt="Lynx"
        width={40}
        height={40}
        style={{ opacity: 0.5 }}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isDark
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(0,0,0,0.25)',
              animation: `web-iframe-bounce 1.2s ${i * 0.15}s ease-in-out infinite`,
            }}
          />
        ))}
        <style>{`@keyframes web-iframe-bounce {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}`}</style>
      </div>
    </div>
  );
};
