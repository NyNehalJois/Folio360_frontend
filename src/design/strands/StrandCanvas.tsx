import React, { useEffect, useMemo, useRef, useState } from 'react';

export type StrandVariant = 'hero' | 'dashboard-banner' | 'dashboard-card' | 'subtle';

export interface StrandCanvasProps {
  variant?: StrandVariant;
  className?: string;
  interactive?: boolean;
  lightweightMobile?: boolean;
  opacityScale?: number;
}

interface VariantConfig {
  viewBox: string;
  width: number;
  height: number;
  strandCount: number;
  sampleSteps: number;
  strokeWidth: number;
  minOpacity: number;
  maxOpacity: number;
  preserveAspectRatio: string;
  mode: 'hero3d' | 'banner3d' | 'vertical3d';
}

const VARIANT_CONFIGS: Record<StrandVariant, VariantConfig> = {
  hero: {
    viewBox: '0 0 1440 820',
    width: 1440,
    height: 820,
    strandCount: 44,
    sampleSteps: 48,
    strokeWidth: 0.78,
    minOpacity: 0.13,
    maxOpacity: 0.42,
    preserveAspectRatio: 'xMaxYMid slice',
    mode: 'hero3d',
  },
  'dashboard-banner': {
    viewBox: '0 0 960 220',
    width: 960,
    height: 220,
    strandCount: 34,
    sampleSteps: 40,
    strokeWidth: 0.72,
    minOpacity: 0.14,
    maxOpacity: 0.38,
    preserveAspectRatio: 'xMaxYMid slice',
    mode: 'banner3d',
  },
  'dashboard-card': {
    viewBox: '0 0 260 440',
    width: 260,
    height: 440,
    strandCount: 34,
    sampleSteps: 38,
    strokeWidth: 0.75,
    minOpacity: 0.16,
    maxOpacity: 0.44,
    preserveAspectRatio: 'xMidYMid slice',
    mode: 'vertical3d',
  },
  subtle: {
    viewBox: '0 0 1440 820',
    width: 1440,
    height: 820,
    strandCount: 32,
    sampleSteps: 40,
    strokeWidth: 0.7,
    minOpacity: 0.1,
    maxOpacity: 0.3,
    preserveAspectRatio: 'xMidYMid slice',
    mode: 'hero3d',
  },
};

interface Point {
  x: number;
  y: number;
}

/**
 * Converts sampled points into a smooth Catmull-Rom cubic Bezier SVG path.
 */
function pointsToSmoothPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const tension = 0.22;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Computes a 3D twisting silk ribbon strand in normalized parametric space `u` in [-1, 1]
 * driven by a shared clock `time` (seconds) and subtle pointer offset.
 */
function computeStrandPath(
  cfg: VariantConfig,
  u: number,
  time: number,
  pointerX: number,
  pointerY: number,
): string {
  const pts: Point[] = [];
  const steps = cfg.sampleSteps;
  const w = cfg.width;
  const h = cfg.height;

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;

    if (cfg.mode === 'hero3d') {
      // Enters cleanly past the bottom-left-center edge and exits smoothly off the right edge
      const travellingWave = Math.sin(t * Math.PI * 2.5 - time * 0.65);
      const secondaryWave = Math.cos(t * Math.PI * 1.4 + time * 0.38);

      const spineX =
        w * 0.16 +
        t * w * 0.92 +
        24 * Math.sin(t * Math.PI * 1.7 - time * 0.42);

      const crestArch = Math.exp(-Math.pow((t - 0.74) / 0.17, 2));
      const spineY =
        h * 1.18 -
        t * h * 0.68 -
        h * 0.15 * Math.sin(t * Math.PI) -
        h * 0.17 * crestArch +
        26 * travellingWave * Math.sin(t * Math.PI) +
        14 * secondaryWave * Math.sin(t * Math.PI);

      // Travelling waist pinch & breathing width envelope
      const pinchCenter = 0.46 + 0.06 * Math.sin(time * 0.34);
      const waist = 0.22 + 0.78 * Math.pow(Math.abs(t - pinchCenter) * 1.85, 1.15);

      // 3D rotation around ribbon axis with per-strand phase offset `u`
      const twist =
        t * Math.PI * 2.45 +
        time * 0.56 +
        0.92 * Math.sin(t * Math.PI * 1.9 - time * 0.44) +
        u * 0.44 * Math.sin(t * Math.PI * 1.6 + time * 0.32);

      const curlA = Math.exp(-Math.pow((t - 0.29) / 0.12, 2));
      const curlB = Math.exp(-Math.pow((t - 0.72) / 0.12, 2));

      const radiusY = h * 0.25 * waist * (1 + 0.12 * Math.sin(time * 0.4 + t * 4));
      const radiusX = w * 0.048 * (0.45 + curlA * 0.9 + curlB * 1.25);

      // 3D cross-section + perspective projection
      const ry = u * radiusY * Math.cos(twist);
      const rz = u * radiusY * Math.sin(twist);
      const rx =
        u * radiusX * Math.sin(twist * 1.12) -
        curlA * u * (w * 0.025) * Math.sin(t * 8 - time * 0.45) -
        curlB * Math.cos(u * 2.0 + time * 0.38) * (w * 0.036);

      const persp = 1 / (1 - rz * 0.0012);
      const ripple =
        h *
        0.042 *
        Math.sin(t * Math.PI * 3.1 + u * 1.45 - time * 0.58) *
        (1 - 0.3 * Math.abs(u));

      const pInf = Math.sin(t * Math.PI);
      const px = pointerX * 22 * pInf * (0.4 + 0.6 * Math.abs(u));
      const py = pointerY * 26 * pInf * (1 - 0.25 * u);

      pts.push({
        x: spineX + rx * persp + px,
        y: spineY + (ry + ripple) * persp + py,
      });
    } else if (cfg.mode === 'banner3d') {
      const wave = Math.sin(t * Math.PI * 2.3 - time * 0.62);
      const spineX = -w * 0.05 + t * w * 1.12;
      const spineY =
        h * 0.65 -
        Math.sin(t * Math.PI * 1.35 - 0.15) * (h * 0.26) -
        t * h * 0.12 +
        14 * wave * Math.sin(t * Math.PI);

      const pinch = 0.5 + 0.07 * Math.sin(time * 0.38);
      const waist = 0.26 + 0.74 * Math.pow(Math.abs(t - pinch) * 1.85, 1.2);
      const twist =
        t * Math.PI * 2.05 +
        time * 0.54 +
        0.75 * Math.sin(t * Math.PI * 1.8 - time * 0.42) +
        u * 0.38 * Math.sin(t * Math.PI + time * 0.3);

      const curl = Math.exp(-Math.pow((t - 0.68) / 0.14, 2));
      const ry =
        u * (h * 0.34 * waist) * Math.cos(twist) +
        curl * Math.sin(u * 1.8 + time * 0.42) * (h * 0.1);
      const rz = u * (h * 0.34 * waist) * Math.sin(twist);
      const rx =
        u * (w * 0.042 * (0.35 + curl)) * Math.sin(twist) -
        curl * Math.cos(u * 1.8 + time * 0.42) * (w * 0.025);

      const persp = 1 / (1 - rz * 0.0022);
      const pInf = Math.sin(t * Math.PI);

      pts.push({
        x: spineX + rx * persp + pointerX * 12 * pInf,
        y: spineY + ry * persp + pointerY * 14 * pInf,
      });
    } else {
      // Vertical 3D ribbon for the Dashboard card panel
      const wave = Math.sin(t * Math.PI * 2.4 - time * 0.6);
      const spineY = -h * 0.06 + t * h * 1.12;
      const spineX =
        w * 0.5 +
        Math.sin(t * Math.PI * 1.55 + 0.45) * (w * 0.22) +
        14 * wave * Math.sin(t * Math.PI);

      const pinch = 0.48 + 0.07 * Math.sin(time * 0.36);
      const waist = 0.24 + 0.76 * Math.pow(Math.abs(t - pinch) * 1.85, 1.2);
      const twist =
        t * Math.PI * 2.25 +
        time * 0.52 +
        0.78 * Math.sin(t * Math.PI * 1.8 - time * 0.4) +
        u * 0.4 * Math.sin(t * Math.PI + time * 0.32);

      const curl = Math.exp(-Math.pow((t - 0.62) / 0.15, 2));
      const rx =
        u * (w * 0.44 * waist) * Math.cos(twist) +
        curl * Math.sin(u * 1.9 + time * 0.4) * (w * 0.11);
      const rz = u * (w * 0.44 * waist) * Math.sin(twist);
      const ry = u * (h * 0.045 * (0.4 + curl)) * Math.sin(twist);

      const persp = 1 / (1 - rz * 0.0024);
      const pInf = Math.sin(t * Math.PI);

      pts.push({
        x: spineX + rx * persp + pointerX * 8 * pInf,
        y: spineY + ry * persp + pointerY * 8 * pInf,
      });
    }
  }

  return pointsToSmoothPath(pts);
}

export const StrandCanvas: React.FC<StrandCanvasProps> = ({
  variant = 'hero',
  className = '',
  interactive = true,
  lightweightMobile = true,
  opacityScale = 1,
}) => {
  const cfg = VARIANT_CONFIGS[variant];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const strandMeta = useMemo(() => {
    // Lightweight fallback on mobile renders half the strand count to save paint cost
    const activeCount =
      lightweightMobile && isMobile ? Math.ceil(cfg.strandCount / 2) : cfg.strandCount;
    const items: { u: number; opacity: number; delayMs: number }[] = [];
    for (let i = 0; i < activeCount; i++) {
      const norm = activeCount === 1 ? 0.5 : i / (activeCount - 1);
      const u = norm * 2 - 1;
      const edgeWeight = 0.55 + 0.45 * Math.abs(Math.sin(norm * Math.PI * 2.2));
      const opacity =
        (cfg.minOpacity + (cfg.maxOpacity - cfg.minOpacity) * edgeWeight) * opacityScale;
      items.push({
        u,
        opacity: Number(opacity.toFixed(3)),
        delayMs: Math.round(i * 12),
      });
    }
    return items;
  }, [cfg.strandCount, cfg.minOpacity, cfg.maxOpacity, isMobile, lightweightMobile, opacityScale]);

  const initialPaths = useMemo(
    () => strandMeta.map((m) => computeStrandPath(cfg, m.u, 0, 0, 0)),
    [cfg, strandMeta],
  );

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDrawn(true);
      return;
    }

    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reducedQuery?.matches) {
      return;
    }

    let rafId = 0;
    let isVisible = true;
    const startTime = performance.now();
    let lastDrawTime = 0;
    let targetPx = 0;
    let targetPy = 0;
    let currentPx = 0;
    let currentPy = 0;

    const el = containerRef.current;

    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive || !el || isMobile) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetPx = Math.max(-1, Math.min(1, nx));
      targetPy = Math.max(-1, Math.min(1, ny));
    };

    const handlePointerLeave = () => {
      targetPx = 0;
      targetPy = 0;
    };

    if (interactive && !isMobile) {
      window.addEventListener('mousemove', handlePointerMove, { passive: true });
      window.addEventListener('mouseleave', handlePointerLeave, { passive: true });
    }

    let observer: IntersectionObserver | null = null;
    if (el && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.02 },
      );
      observer.observe(el);
    }

    // Mobile lightweight fallback throttles redraws to ~24fps instead of 60fps
    const minFrameIntervalMs = lightweightMobile && isMobile ? 42 : 0;

    const tick = (now: number) => {
      const shouldSkipForThrottle = minFrameIntervalMs > 0 && now - lastDrawTime < minFrameIntervalMs;

      if (
        isVisible &&
        document.visibilityState === 'visible' &&
        !reducedQuery?.matches &&
        !shouldSkipForThrottle
      ) {
        lastDrawTime = now;
        const elapsedSec = (now - startTime) / 1000;

        currentPx += (targetPx - currentPx) * 0.04;
        currentPy += (targetPy - currentPy) * 0.04;

        for (let i = 0; i < strandMeta.length; i++) {
          const node = pathRefs.current[i];
          if (node) {
            node.setAttribute(
              'd',
              computeStrandPath(cfg, strandMeta[i].u, elapsedSec, currentPx, currentPy),
            );
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (interactive && !isMobile) {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseleave', handlePointerLeave);
      }
      observer?.disconnect();
    };
  }, [cfg, interactive, isMobile, lightweightMobile, strandMeta]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox={cfg.viewBox}
        fill="none"
        preserveAspectRatio={cfg.preserveAspectRatio}
        className="h-full w-full block f360-strand-reveal"
      >
        {initialPaths.map((d, idx) => {
          const meta = strandMeta[idx];
          return (
            <path
              key={idx}
              ref={(node) => {
                pathRefs.current[idx] = node;
              }}
              d={d}
              pathLength={1}
              stroke="var(--strand-color)"
              strokeWidth={cfg.strokeWidth}
              strokeOpacity={meta.opacity}
              strokeLinecap="round"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: drawn ? 0 : 1,
                transition: `stroke-dashoffset 1700ms cubic-bezier(0.22, 1, 0.36, 1) ${meta.delayMs}ms`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};
