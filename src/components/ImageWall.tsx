import React, { useEffect, useId, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const isVideoSrc = (src: string) => {
  const s = src.toLowerCase();
  return s.endsWith('.webm') || s.endsWith('.mp4') || s.endsWith('.ogg');
};

const isAbsoluteSrc = (src: string) => {
  const s = src.trim().toLowerCase();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('//') ||
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('/')
  );
};

const joinSrc = (base: string, src: string) => {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedSrc = src.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedSrc}`;
};

export type ImageWallItem = {
  src?: string;
  filePath?: string;
  alt?: string;
};

export interface ImageWallProps {
  images: ImageWallItem[];
  srcBase?: string;
  rows?: number;
  cols?: number;
  gap?: number;
  tileAspectRatio?: number;
  maxItems?: number;
  colsResponsive?: Partial<
    Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number>
  >;
  gapResponsive?: Partial<
    Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number>
  >;
  tileAspectRatioResponsive?: Partial<
    Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number>
  >;
  className?: string;
  tileClassName?: string;
  enablePreview?: boolean;
  initialIndex?: number;
}

export const ImageWall: React.FC<ImageWallProps> = ({
  images,
  srcBase,
  rows = 2,
  cols = 8,
  gap = 8,
  tileAspectRatio = 1,
  maxItems,
  colsResponsive,
  gapResponsive,
  tileAspectRatioResponsive,
  className,
  tileClassName,
  enablePreview = true,
  initialIndex,
}) => {
  const instanceId = useId();
  const dataAttr = `image-wall-${instanceId.replace(/[:]/g, '')}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(
    typeof initialIndex === 'number' ? initialIndex : null,
  );
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(
    () => new Set(),
  );

  const markLoaded = (index: number) => {
    setLoadedIndices((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const maxCount = Math.max(
    1,
    maxItems ?? Math.max(1, rows) * Math.max(1, cols),
  );
  const shownImages = useMemo(
    () => images.slice(0, maxCount),
    [images, maxCount],
  );

  const responsiveCss = useMemo(() => {
    const selector = `[data-image-wall="${dataAttr}"]`;
    const breakpoints: Array<{
      key: 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
      minWidth?: number;
    }> = [
      { key: 'base' },
      { key: 'sm', minWidth: 640 },
      { key: 'md', minWidth: 768 },
      { key: 'lg', minWidth: 1024 },
      { key: 'xl', minWidth: 1280 },
      { key: '2xl', minWidth: 1536 },
    ];

    const getValue = (
      key: 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl',
      map:
        | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number>>
        | undefined,
      fallback: number,
    ) => {
      return typeof map?.[key] === 'number' ? (map[key] as number) : fallback;
    };

    const baseCols = Math.max(1, getValue('base', colsResponsive, cols));
    const baseGap = Math.max(0, getValue('base', gapResponsive, gap));
    const baseAspect = Math.max(
      0.0001,
      getValue('base', tileAspectRatioResponsive, tileAspectRatio),
    );

    const lines: string[] = [
      `${selector}{--image-wall-cols:${baseCols};--image-wall-gap:${baseGap}px;--image-wall-aspect-ratio:${baseAspect};}`,
    ];

    for (const bp of breakpoints) {
      if (bp.key === 'base') continue;
      const nextCols = Math.max(1, getValue(bp.key, colsResponsive, baseCols));
      const nextGap = Math.max(0, getValue(bp.key, gapResponsive, baseGap));
      const nextAspect = Math.max(
        0.0001,
        getValue(bp.key, tileAspectRatioResponsive, baseAspect),
      );
      if (
        nextCols === baseCols &&
        nextGap === baseGap &&
        nextAspect === baseAspect
      ) {
        continue;
      }
      lines.push(
        `@media (min-width:${bp.minWidth}px){${selector}{--image-wall-cols:${nextCols};--image-wall-gap:${nextGap}px;--image-wall-aspect-ratio:${nextAspect};}}`,
      );
    }

    return lines.join('\n');
  }, [
    cols,
    colsResponsive,
    dataAttr,
    gap,
    gapResponsive,
    tileAspectRatio,
    tileAspectRatioResponsive,
  ]);

  const resolveSrc = (item: ImageWallItem) => {
    const rawSrc = item.src ?? item.filePath ?? '';
    if (!rawSrc) return '';
    if (item.filePath) {
      return srcBase ? joinSrc(srcBase, item.filePath) : item.filePath;
    }
    if (!srcBase || isAbsoluteSrc(rawSrc)) return rawSrc;
    return joinSrc(srcBase, rawSrc);
  };

  const canNavigate = shownImages.length > 1;
  const current =
    activeIndex === null ? null : (shownImages[activeIndex] ?? null);

  const openAt = (index: number) => {
    if (!enablePreview) return;
    setActiveIndex(index);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  const prev = () => {
    if (!canNavigate || activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + shownImages.length) % shownImages.length);
  };

  const next = () => {
    if (!canNavigate || activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % shownImages.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeIndex, canNavigate, shownImages.length]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setActiveIndex(null);
      }}
    >
      <style>{responsiveCss}</style>
      <div
        className={cn(className)}
        data-image-wall={dataAttr}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(var(--image-wall-cols, ${Math.max(
            1,
            cols,
          )}), minmax(0, 1fr))`,
          gap: `var(--image-wall-gap, ${gap}px)`,
        }}
      >
        {shownImages.map((img, i) => {
          const resolvedSrc = resolveSrc(img);
          const isLoaded = loadedIndices.has(i);
          return (
            <button
              key={`${resolvedSrc}-${i}`}
              type="button"
              onClick={() => openAt(i)}
              className={cn(
                'block w-full overflow-hidden rounded-md bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                tileClassName,
              )}
            >
              {!resolvedSrc ? null : (
                <div
                  className="relative w-full"
                  style={{
                    aspectRatio: `var(--image-wall-aspect-ratio, ${tileAspectRatio})`,
                  }}
                >
                  {!isLoaded && (
                    <div className="absolute inset-0 bg-muted/30 animate-pulse" />
                  )}
                  {isVideoSrc(resolvedSrc) ? (
                    <video
                      src={resolvedSrc}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                      onLoadedData={() => markLoaded(i)}
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
                        isLoaded ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  ) : (
                    <img
                      src={resolvedSrc}
                      alt={img.alt ?? ''}
                      loading="lazy"
                      onLoad={() => markLoaded(i)}
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
                        isLoaded ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && current && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <div className="relative w-full max-w-[1200px]">
                  <div className="relative mx-auto flex max-h-[85vh] w-full items-center justify-center overflow-hidden rounded-lg bg-black/30">
                    {(() => {
                      const resolvedSrc = resolveSrc(current);
                      if (!resolvedSrc) return null;
                      return isVideoSrc(resolvedSrc) ? (
                        <video
                          src={resolvedSrc}
                          muted
                          loop
                          autoPlay
                          playsInline
                          controls
                          className="max-h-[85vh] w-auto max-w-[90vw] object-contain"
                        />
                      ) : (
                        <img
                          src={resolvedSrc}
                          alt={current.alt ?? ''}
                          className="max-h-[85vh] w-auto max-w-[90vw] object-contain"
                        />
                      );
                    })()}
                  </div>

                  {canNavigate && (
                    <>
                      <button
                        type="button"
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-black/40 p-2 text-white hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-black/40 p-2 text-white hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-md bg-black/40 p-2 text-white hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
