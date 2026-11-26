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

const LOOP_PERIOD_SEC = 16;

/**
 * Computes a 3D twisting silk ribbon strand in normalized parametric space `u` in [-1, 1]
 * driven by a seamless periodic clock `time` (seconds) and subtle pointer offset.
 * All temporal frequencies are integer harmonics of `2π / LOOP_PERIOD_SEC` so the loop
 * repeats seamlessly without drift or sudden jumps.
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
  const theta = ((time % LOOP_PERIOD_SEC) / LOOP_PERIOD_SEC) * Math.PI * 2;

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;

    if (cfg.mode === 'hero3d') {
      // Seamless periodic travelling waves (integer harmonics of theta)
      const travellingWave = Math.sin(t * Math.PI * 2.4 - theta * 2);
      const secondaryWave = Math.cos(t * Math.PI * 1.4 + theta);

      const spineX =
        w * 0.16 +
        t * w * 0.92 +
        20 * Math.sin(t * Math.PI * 1.7 - theta);

      const crestArch = Math.exp(-Math.pow((t - 0.74) / 0.17, 2));
      const spineY =
        h * 1.18 -
        t * h * 0.68 -
        h * 0.15 * Math.sin(t * Math.PI) -
        h * 0.17 * crestArch +
        22 * travellingWave * Math.sin(t * Math.PI) +
        12 * secondaryWave * Math.sin(t * Math.PI);

      // Gentle breathing waist pinch
      const pinchCenter = 0.46 + 0.05 * Math.sin(theta);
      const waist = 0.24 + 0.76 * Math.pow(Math.abs(t - pinchCenter) * 1.85, 1.15);

      // Smooth periodic 3D twist around ribbon axis
      const twist =
        t * Math.PI * 2.35 +
        theta +
        0.72 * Math.sin(t * Math.PI * 1.8 - theta) +
        u * 0.36 * Math.sin(t * Math.PI * 1.5 + theta);

      const curlA = Math.exp(-Math.pow((t - 0.29) / 0.12, 2));
      const curlB = Math.exp(-Math.pow((t - 0.72) / 0.12, 2));

      const radiusY = h * 0.24 * waist * (1 + 0.08 * Math.sin(theta + t * Math.PI * 2));
      const radiusX = w * 0.046 * (0.45 + curlA * 0.85 + curlB * 1.15);

      // 3D cross-section + safe perspective projection
      const ry = u * radiusY * Math.cos(twist);
      const rz = u * radiusY * Math.sin(twist);
      const rx =
        u * radiusX * Math.sin(twist) -
        curlA * u * (w * 0.022) * Math.sin(t * 7 - theta) -
        curlB * Math.cos(u * 2.0 + theta) * (w * 0.032);

      const persp = 1 / Math.max(0.68, Math.min(1.45, 1 - rz * 0.0011));
      const ripple =
        h *
        0.036 *
        Math.sin(t * Math.PI * 3.0 + u * 1.4 - theta * 2) *
        (1 - 0.3 * Math.abs(u));

      const pInf = Math.sin(t * Math.PI);
      const px = pointerX * 20 * pInf * (0.4 + 0.6 * Math.abs(u));
      const py = pointerY * 22 * pInf * (1 - 0.25 * u);

      pts.push({
        x: spineX + rx * persp + px,
        y: spineY + (ry + ripple) * persp + py,
      });
    } else if (cfg.mode === 'banner3d') {
      const wave = Math.sin(t * Math.PI * 2.3 - theta * 2);
      const spineX = -w * 0.05 + t * w * 1.12;
      const spineY =
        h * 0.65 -
        Math.sin(t * Math.PI * 1.35 - 0.15) * (h * 0.26) -
        t * h * 0.12 +
        12 * wave * Math.sin(t * Math.PI);

      const pinch = 0.5 + 0.06 * Math.sin(theta);
      const waist = 0.26 + 0.74 * Math.pow(Math.abs(t - pinch) * 1.85, 1.2);
      const twist =
        t * Math.PI * 2.05 +
        theta +
        0.65 * Math.sin(t * Math.PI * 1.8 - theta) +
        u * 0.34 * Math.sin(t * Math.PI + theta);

      const curl = Math.exp(-Math.pow((t - 0.68) / 0.14, 2));
      const ry =
        u * (h * 0.34 * waist) * Math.cos(twist) +
        curl * Math.sin(u * 1.8 + theta) * (h * 0.08);
      const rz = u * (h * 0.34 * waist) * Math.sin(twist);
      const rx =
        u * (w * 0.04 * (0.35 + curl)) * Math.sin(twist) -
        curl * Math.cos(u * 1.8 + theta) * (w * 0.022);

      const persp = 1 / Math.max(0.68, Math.min(1.45, 1 - rz * 0.002));
      const pInf = Math.sin(t * Math.PI);

      pts.push({
        x: spineX + rx * persp + pointerX * 12 * pInf,
        y: spineY + ry * persp + pointerY * 14 * pInf,
      });
    } else {
      // Vertical 3D ribbon for the Dashboard profile card panel (seamless periodic loop)
      const wave = Math.sin(t * Math.PI * 2.2 - theta * 2);
      const spineY = -h * 0.06 + t * h * 1.12;
      const spineX =
        w * 0.5 +
        Math.sin(t * Math.PI * 1.55 + 0.45) * (w * 0.2) +
        11 * wave * Math.sin(t * Math.PI);

      const pinch = 0.48 + 0.06 * Math.sin(theta);
      const waist = 0.26 + 0.74 * Math.pow(Math.abs(t - pinch) * 1.85, 1.2);
      const twist =
        t * Math.PI * 2.2 +
        theta +
        0.62 * Math.sin(t * Math.PI * 1.6 - theta) +
        u * 0.32 * Math.sin(t * Math.PI + theta);

      const curl = Math.exp(-Math.pow((t - 0.62) / 0.15, 2));
      const rx =
        u * (w * 0.42 * waist) * Math.cos(twist) +
        curl * Math.sin(u * 1.8 + theta) * (w * 0.09);
      const rz = u * (w * 0.42 * waist) * Math.sin(twist);
      const ry = u * (h * 0.04 * (0.4 + curl)) * Math.sin(twist);

      const persp = 1 / Math.max(0.68, Math.min(1.45, 1 - rz * 0.002));
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
    if (typeof window === 'undefined') return;

    const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reducedQuery?.matches) {
      return;
    }

    let rafId = 0;
    let isVisible = true;
    let prevNow = performance.now();
    let accumulatedSec = 0;
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
      const dtSec = Math.min(0.05, Math.max(0, (now - prevNow) / 1000));
      prevNow = now;
      const shouldSkipForThrottle = minFrameIntervalMs > 0 && now - lastDrawTime < minFrameIntervalMs;

      if (
        isVisible &&
        document.visibilityState === 'visible' &&
        !reducedQuery?.matches &&
        !shouldSkipForThrottle
      ) {
        lastDrawTime = now;
        accumulatedSec = (accumulatedSec + dtSec) % LOOP_PERIOD_SEC;

        currentPx += (targetPx - currentPx) * 0.06;
        currentPy += (targetPy - currentPy) * 0.06;

        for (let i = 0; i < strandMeta.length; i++) {
          const node = pathRefs.current[i];
          if (node) {
            node.setAttribute(
              'd',
              computeStrandPath(cfg, strandMeta[i].u, accumulatedSec, currentPx, currentPy),
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
              stroke="var(--strand-color)"
              strokeWidth={cfg.strokeWidth}
              strokeOpacity={meta.opacity}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
};
