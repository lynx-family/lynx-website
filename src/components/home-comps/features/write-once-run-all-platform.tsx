import React, { ReactNode } from 'react';
import styles from './write-once-run-all-platform.module.less';

export const WriteOnceRunAllPlatform = () => {
  return (
    <div className={styles['write-once-run-all-platform-container']}>
      <div style={{ width: '33%' }}>
        <LeftLine></LeftLine>
      </div>
      <ContainerWithHexagonBackground className={styles['outer-hexagon']}>
        <ContainerWithHexagonBackground className={styles['inner-hexagon']}>
          <div className={styles['lynx-logo']}></div>
        </ContainerWithHexagonBackground>
      </ContainerWithHexagonBackground>
      <RightPlatforms></RightPlatforms>
    </div>
  );
};

/// ----- right ----- ///

const RightPlatforms = () => {
  return (
    <div className={styles['right-container']}>
      <div>
        <RightlineGoesUp></RightlineGoesUp>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80px',
        }}
      >
        <AnimationLine className={styles['right-line']} />
      </div>
      <div>
        <RightlineGoesDown></RightlineGoesDown>
      </div>
    </div>
  );
};

const RightlineGoesUp = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="48"
      viewBox="0 0 153 48"
      fill="none"
    >
      <defs>
        <linearGradient id="grad" x1="0%" y1="100%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff00" />
          <stop offset="100%" stopColor="#ff351a" />
        </linearGradient>
      </defs>
      <path
        className={styles['svg-stroke']}
        id="rightLineUp"
        d="M0.896946 46.6357 C46.8318 46.6357 64.4141 46.6357 81.6857 42 C98.9573 37.3643 123.275 17.363 151.645 1.53027"
        stroke={'transparent'}
        strokeOpacity="0.08"
        strokeWidth="1.5"
      />
      <rect
        transform="translate(-10, -0.5)"
        fill="url(#grad)"
        width="10"
        height="1"
      >
        <animateMotion
          origin="path"
          rotate="auto"
          path="M0.896946 46.6357 C46.8318 46.6357 64.4141 46.6357 81.6857 42 C98.9573 37.3643 123.275 17.363 151.645 1.53027"
          dur="2s"
          begin="1s"
          restart="always"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
};

const RightlineGoesDown = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="48"
      viewBox="0 0 153 48"
      fill="none"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="100%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff00" />
          <stop offset="100%" stopColor="#12e5e5" />
        </linearGradient>
      </defs>
      <path
        id="rightLineDown"
        className={styles['svg-stroke']}
        d="M0.896946 1.66309H46.8318C64.4141 1.66309 81.6857 6.29883 96.9051 15.1029L151.645 46.7686"
        stroke={'transparent'}
        strokeOpacity="0.08"
        strokeWidth="1.5"
      />
      <rect
        transform="translate(-10, -0.5)"
        fill="url(#grad1)"
        width="10"
        height="1"
      >
        <animateMotion
          origin="path"
          rotate="auto"
          path="M0.896946 1.66309H46.8318C64.4141 1.66309 81.6857 6.29883 96.9051 15.1029L151.645 46.7686"
          dur="2s"
          begin="0.5s"
          restart="always"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
};

///-----left------///

const LeftLine = () => {
  return <AnimationLine className={styles['left-line']} />;
};

///----- center -----///
/// the two same center hexagon

const ContainerWithHexagonBackground = (props: {
  color?: string;
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <div
      className={
        styles['container-with-hexagon-background'] + ' ' + props.className
      }
    >
      <div className={styles['hexagon-as-bg']}>
        <HexagonSVG color={props.color ?? 'transparent'} />
      </div>
      {props.children}
    </div>
  );
};

const HexagonSVG = (props: { color: string; children?: ReactNode }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 170 188"
      fill="none"
    >
      <path
        d="M97.3728 4.15852C89.7925 -0.217983 80.4531 -0.217983 72.8728 4.15852L13.6449 38.3538C6.0646 42.7303 1.39493 50.8184 1.39493 59.5714V127.962C1.39493 136.715 6.0646 144.803 13.6449 149.179L72.8728 183.375C80.4531 187.751 89.7925 187.751 97.3728 183.375L156.601 149.179C164.181 144.803 168.851 136.715 168.851 127.962V59.5714C168.851 50.8184 164.181 42.7303 156.601 38.3538L97.3728 4.15852Z"
        fill={props.color}
        fillOpacity="0.6"
        stroke="url(#paint0_linear_2002_13582)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2002_13582"
          x1="27.4883"
          y1="5.50123"
          x2="201.311"
          y2="169.623"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#111113" stopOpacity="0.12" />
          <stop offset="1" stopColor="#111113" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/// ---- shared ---- ///

const AnimationLine = (props: { className: string }) => {
  return (
    <div className={styles['animation-line-background']}>
      <div className={props.className + ' ' + styles['animation-line-dot']} />
    </div>
  );
};
