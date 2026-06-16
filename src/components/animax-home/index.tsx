import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang, withBase } from '@rspress/core/runtime';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import './index.scss';

const SHOWCASE_ASSET_BASE =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/animax/docs/';

const SHOWCASE_VIDEO_SOURCES = [
  {
    key: 'vector',
    video: 'vector.mp4',
    image: 'vector_fallback.png',
  },
  {
    key: 'alpha-video',
    video: 'alpha_video.mp4',
    image: 'alpha_video_fallback.png',
  },
  {
    key: 'vector2',
    video: 'vector2.mp4',
    image: 'vector2_fallback.png',
  },
  {
    key: 'image',
    video: 'image.mp4',
    image: 'image_fallback.png',
  },
  {
    key: 'text',
    video: 'text.mp4',
    image: 'text_fallback.png',
  },
] as const;

const SHOWCASE_POSITIONS = [-2, -1, 0, 1, 2] as const;
const SHOWCASE_INITIAL_INDEX = 2;

const copy = {
  en: {
    released: 'AnimaX is released',
    title: 'Cross-Platform Animation Engine',
    tagline:
      'Keep your Lottie workflow while unlocking consistent rendering and advanced capabilities.',
    getStarted: 'Get Started',
    introduction: 'Introduction',
    showcaseTitle: 'Built for mixed motion layers',
    whyTitle: 'Why AnimaX ?',
    whyBody:
      'While Lottie popularized vector animations on mobile and web, reproducing complex After Effects features often forces compromises. Designers may have to rely on large image sequences, inconsistent native rendering, or main-thread performance drops.',
    learnMore: 'Learn more',
    ctaTitle: 'Start building with Animax',
    license:
      'Except as otherwise noted, this work is licensed under a Creative Commons Attribution 4.0 International License, and code samples are licensed under the Apache License 2.0.',
    showcase: [
      'Vector Layer',
      'Alpha Video Layer',
      'Vector Layer',
      'Image Layer',
      'Text Layer',
    ],
    features: [
      {
        title: 'Full Lottie Compatibility',
        body: (
          <>
            AnimaX is 100% compatible with the Lottie format and plays existing
            Lottie JSON files directly. The After Effects{' '}
            <a href={withBase('/animax/start/afx.html')}>AFX</a> plugin exports
            assets with instant result previews, helping designers catch issues
            earlier without rebuilding their motion workflow.
          </>
        ),
        wide: true,
      },
      {
        title: 'Advanced After Effects Rendering',
        body: 'Combine Lottie vector layers with Alpha Video to render complex After Effects visuals that pure vector playback cannot express.',
      },
      {
        title: 'Consistent Rendering',
        body: (
          <>
            A unified C++ renderer powered by{' '}
            <a
              href="https://github.com/lynx-family/skity"
              target="_blank"
              rel="noreferrer"
            >
              Skity
            </a>{' '}
            keeps the open-sourced Android and iOS runtimes pixel-consistent.
            More platforms will be open-sourced later.
          </>
        ),
      },
      {
        title: 'Advanced Interactivity',
        body: 'Dynamic properties let apps update animation attributes at runtime and respond to user interaction without exporting new assets.',
      },
      {
        title: 'Uncompromised Performance',
        body: 'Expensive graphics rendering is offloaded from the main thread, keeping complex layer stacks smooth even on lower-end devices.',
      },
    ],
  },
  zh: {
    released: 'AnimaX 正式发布',
    title: '跨平台动画引擎',
    tagline: '保留现有 Lottie 工作流，同时解锁一致渲染与高级能力。',
    getStarted: '快速开始',
    introduction: '介绍',
    showcaseTitle: '面向混合动效图层',
    whyTitle: '为什么选择 AnimaX ?',
    whyBody:
      'Lottie 推动了移动端与 Web 矢量动效的普及，但复现复杂 After Effects 效果时经常需要妥协：庞大的图片序列、各端渲染不一致，或传统播放器主线程解析与渲染带来的性能下降。',
    learnMore: '了解更多',
    ctaTitle: '开始使用 Animax 构建',
    license:
      '除非另有说明，本项目采用知识共享署名 4.0 国际许可协议进行许可，代码示例采用 Apache License 2.0 许可协议进行许可。',
    showcase: [
      '矢量图层',
      'Alpha 视频图层',
      '矢量图层',
      '图片图层',
      '文本图层',
    ],
    features: [
      {
        title: '完整兼容 Lottie',
        body: (
          <>
            AnimaX 100% 兼容 Lottie 格式，可直接播放现有 Lottie JSON。After
            Effects <a href={withBase('/zh/animax/start/afx.html')}>AFX</a>{' '}
            插件支持资产导出与结果即时预览，帮助设计师更早发现问题，无需重建动效工作流。
          </>
        ),
        wide: true,
      },
      {
        title: '进阶 After Effects 渲染能力',
        body: '将 Lottie 矢量图层与 Alpha Video 混合使用，渲染纯矢量播放难以表达的复杂 After Effects 视觉效果。',
      },
      {
        title: '一致渲染',
        body: (
          <>
            基于{' '}
            <a
              href="https://github.com/lynx-family/skity"
              target="_blank"
              rel="noreferrer"
            >
              Skity
            </a>{' '}
            的统一 C++ 渲染器，让已开源的 Android 和 iOS
            运行时保持像素级一致；更多平台将陆续开源。
          </>
        ),
      },
      {
        title: '高级互动能力',
        body: '通过动态属性在运行时更新动画参数并响应用户交互，无需重新导出动画资产。',
      },
      {
        title: '极致性能',
        body: '将高成本图形渲染从主线程中移出，即使面对复杂图层栈，也能在低端设备上保持流畅。',
      },
    ],
  },
} as const;

function asset(name: string) {
  return withBase(`/assets/animax/${name}`);
}

function useAnimaxCopy() {
  const lang = useLang();
  return {
    lang,
    text: lang === 'zh' ? copy.zh : copy.en,
    prefix: lang === 'zh' ? '/zh' : '',
  };
}

function getWrappedIndex(index: number) {
  const length = SHOWCASE_VIDEO_SOURCES.length;
  return (index + length) % length;
}

const HERO_METEOR_GRID_SIZE = 120;
const HERO_METEOR_COUNT = 3;

const HERO_METEOR_DIRECTION = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
} as const;

type HeroMeteorDirection =
  (typeof HERO_METEOR_DIRECTION)[keyof typeof HERO_METEOR_DIRECTION];

type HeroMeteor = {
  x: number;
  y: number;
  direction: HeroMeteorDirection;
  speed: number;
  length: number;
  opacity: number;
};

function resetHeroMeteor(meteor: HeroMeteor, width: number, height: number) {
  const getMiddlePosition = (size: number) => {
    const margin = size * 0.2;
    return margin + Math.random() * (size * 0.6);
  };

  meteor.direction = Math.floor(Math.random() * 4) as HeroMeteorDirection;
  meteor.speed = 2 + Math.random() * 3;
  meteor.length = HERO_METEOR_GRID_SIZE * (1 + Math.random() * 2);
  meteor.opacity = 0.52 + Math.random() * 0.28;

  switch (meteor.direction) {
    case HERO_METEOR_DIRECTION.UP:
      meteor.x =
        Math.floor(getMiddlePosition(width) / HERO_METEOR_GRID_SIZE) *
        HERO_METEOR_GRID_SIZE;
      meteor.y = height;
      break;
    case HERO_METEOR_DIRECTION.RIGHT:
      meteor.x = 0;
      meteor.y =
        Math.floor(getMiddlePosition(height) / HERO_METEOR_GRID_SIZE) *
        HERO_METEOR_GRID_SIZE;
      break;
    case HERO_METEOR_DIRECTION.DOWN:
      meteor.x =
        Math.floor(getMiddlePosition(width) / HERO_METEOR_GRID_SIZE) *
        HERO_METEOR_GRID_SIZE;
      meteor.y = 0;
      break;
    case HERO_METEOR_DIRECTION.LEFT:
      meteor.x = width;
      meteor.y =
        Math.floor(getMiddlePosition(height) / HERO_METEOR_GRID_SIZE) *
        HERO_METEOR_GRID_SIZE;
      break;
  }
}

function createHeroMeteor(width: number, height: number): HeroMeteor {
  const meteor: HeroMeteor = {
    x: 0,
    y: 0,
    direction: HERO_METEOR_DIRECTION.UP,
    speed: 0,
    length: 0,
    opacity: 0,
  };

  resetHeroMeteor(meteor, width, height);
  return meteor;
}

function updateHeroMeteor(meteor: HeroMeteor, width: number, height: number) {
  switch (meteor.direction) {
    case HERO_METEOR_DIRECTION.UP:
      meteor.y -= meteor.speed;
      if (meteor.y + meteor.length < 0) resetHeroMeteor(meteor, width, height);
      break;
    case HERO_METEOR_DIRECTION.RIGHT:
      meteor.x += meteor.speed;
      if (meteor.x > width) resetHeroMeteor(meteor, width, height);
      break;
    case HERO_METEOR_DIRECTION.DOWN:
      meteor.y += meteor.speed;
      if (meteor.y > height) resetHeroMeteor(meteor, width, height);
      break;
    case HERO_METEOR_DIRECTION.LEFT:
      meteor.x -= meteor.speed;
      if (meteor.x + meteor.length < 0) resetHeroMeteor(meteor, width, height);
      break;
  }
}

function drawHeroGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isDark: boolean,
) {
  ctx.strokeStyle = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(128, 128, 128, 0.1)';
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += HERO_METEOR_GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += HERO_METEOR_GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawHeroMeteor(
  ctx: CanvasRenderingContext2D,
  meteor: HeroMeteor,
  isDark: boolean,
) {
  let startX = meteor.x;
  let startY = meteor.y;
  let endX = meteor.x;
  let endY = meteor.y;

  switch (meteor.direction) {
    case HERO_METEOR_DIRECTION.UP:
      endY = meteor.y + meteor.length;
      break;
    case HERO_METEOR_DIRECTION.RIGHT:
      endX = meteor.x - meteor.length;
      break;
    case HERO_METEOR_DIRECTION.DOWN:
      endY = meteor.y - meteor.length;
      break;
    case HERO_METEOR_DIRECTION.LEFT:
      endX = meteor.x + meteor.length;
      break;
  }

  const opacity = isDark ? meteor.opacity * 0.82 : meteor.opacity * 0.76;
  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);

  gradient.addColorStop(0, `rgba(241, 255, 51, ${opacity})`);
  gradient.addColorStop(0.1, `rgba(241, 255, 51, ${opacity * 0.86})`);
  gradient.addColorStop(0.28, `rgba(154, 230, 0, ${opacity * 0.62})`);
  gradient.addColorStop(1, 'rgba(154, 230, 0, 0)');

  ctx.beginPath();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function AnimaxHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let meteors: HeroMeteor[] = [];
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      meteors = Array.from({ length: HERO_METEOR_COUNT }, () =>
        createHeroMeteor(width, height),
      );
    };

    const draw = () => {
      const isDark = document.documentElement.classList.contains('dark');

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      drawHeroGrid(ctx, width, height, isDark);

      if (!reducedMotionQuery.matches) {
        meteors.forEach((meteor) => {
          updateHeroMeteor(meteor, width, height);
          drawHeroMeteor(ctx, meteor, isDark);
        });
      }

      if (!reducedMotionQuery.matches) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="animax-hero__canvas"
      ref={canvasRef}
    />
  );
}

function ShowcaseVideo({
  label,
  source,
  isActive,
}: {
  label: string;
  source: (typeof SHOWCASE_VIDEO_SOURCES)[number];
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    let isCancelled = false;

    const markVideoReady = () => {
      if (isCancelled) {
        return;
      }

      setIsVideoReady(true);
    };

    setIsVideoReady(false);
    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markVideoReady();
    } else {
      video.addEventListener('loadeddata', markVideoReady, { once: true });
    }

    return () => {
      isCancelled = true;
      video.removeEventListener('loadeddata', markVideoReady);
    };
  }, [source.video]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!isVideoReady) {
      video.loop = false;
      video.pause();
      return;
    }

    if (isActive) {
      video.loop = true;
      void video.play().catch(() => undefined);
      return;
    }

    video.loop = false;
    video.pause();

    try {
      video.currentTime = 0;
    } catch {
      // Some browsers delay seeking until metadata is available.
    }
  }, [isActive, isVideoReady, source.video]);

  return (
    <div className="animax-player-shell">
      <img
        className={`animax-player-fallback ${isVideoReady ? 'is-hidden' : ''}`}
        src={`${SHOWCASE_ASSET_BASE}${source.image}`}
        alt=""
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        className={`animax-player ${isVideoReady ? 'is-ready' : ''}`}
        src={`${SHOWCASE_ASSET_BASE}${source.video}`}
        poster={`${SHOWCASE_ASSET_BASE}${source.image}`}
        muted
        playsInline
        preload="auto"
        loop={isActive && isVideoReady}
        aria-label={label}
      />
    </div>
  );
}

export default function AnimaxHome() {
  const { text, prefix } = useAnimaxCopy();
  const [activeIndex, setActiveIndex] = useState(SHOWCASE_INITIAL_INDEX);

  const href = (path: string) => withBase(`${prefix}${path}`);

  const visibleItems = useMemo(
    () =>
      SHOWCASE_POSITIONS.map((offset, position) => {
        const sourceIndex = getWrappedIndex(activeIndex + offset);
        return {
          sourceIndex,
          position,
          item: SHOWCASE_VIDEO_SOURCES[sourceIndex],
          label: text.showcase[sourceIndex],
        };
      }),
    [activeIndex, text.showcase],
  );

  const goPrevious = () => {
    setActiveIndex((current) => getWrappedIndex(current - 1));
  };

  const goNext = () => {
    setActiveIndex((current) => getWrappedIndex(current + 1));
  };

  return (
    <main className="animax-home rp-not-doc">
      <section className="animax-hero">
        <AnimaxHeroBackground />
        <div className="animax-hero__glow" aria-hidden="true" />

        <a
          className="animax-release"
          href={href('/blog/animax')}
          aria-label={text.released}
        >
          <img src={asset('release-mark.svg')} alt="" />
          <span>{text.released}</span>
          <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />
        </a>

        <h1>{text.title}</h1>
        <p>{text.tagline}</p>

        <div className="animax-actions">
          <a
            className="animax-button animax-button--primary"
            href={href('/animax/start/quick-start')}
          >
            <span>{text.getStarted}</span>
          </a>
          <a
            className="animax-button animax-button--secondary"
            href={href('/animax/introduction')}
          >
            <span>{text.introduction}</span>
          </a>
        </div>
      </section>

      <section className="animax-showcase" aria-label={text.showcaseTitle}>
        <div className="animax-showcase__stage">
          <button
            className="animax-showcase__arrow animax-showcase__arrow--prev"
            type="button"
            onClick={goPrevious}
            aria-label="Previous showcase item"
          >
            <ChevronLeft size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="animax-showcase__row">
            {visibleItems.map(({ item, label, position, sourceIndex }) => (
              <figure
                className={`animax-motion-card animax-motion-card--${position}`}
                key={item.key}
              >
                <ShowcaseVideo
                  label={label}
                  source={item}
                  isActive={sourceIndex === activeIndex}
                />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
          <button
            className="animax-showcase__arrow animax-showcase__arrow--next"
            type="button"
            onClick={goNext}
            aria-label="Next showcase item"
          >
            <ChevronRight size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section
        className="animax-features"
        aria-labelledby="animax-features-title"
      >
        <div className="animax-features__intro">
          <h2 id="animax-features-title">{text.whyTitle}</h2>
          <div>
            <p>{text.whyBody}</p>
            <a href={href('/animax/introduction')}>
              {text.learnMore}
              <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="animax-feature-grid">
          {text.features.map((feature) => (
            <article
              className={
                'wide' in feature && feature.wide
                  ? 'animax-feature-cell is-wide'
                  : 'animax-feature-cell'
              }
              key={feature.title}
            >
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="animax-cta">
        <h2>{text.ctaTitle}</h2>
        <div className="animax-cta__actions">
          <a
            className="animax-button animax-button--primary"
            href={href('/animax/start/quick-start')}
          >
            <span>{text.getStarted}</span>
          </a>
        </div>
      </section>

      <footer className="animax-footer">{text.license}</footer>
    </main>
  );
}
