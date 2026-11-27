import React, { useEffect, useRef, useState } from 'react';
import { Eye, FileImage, FileText, Loader2 } from 'lucide-react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { documentsService, openDocumentSignedUrl } from '@/services/api';
import type { DocumentRef } from '@/types/api';

interface DocumentThumbnailProps {
  doc: DocumentRef;
  extraCount?: number;
  size?: 'card' | 'modal';
  onPreviewClick?: (doc: DocumentRef) => void;
}

const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_CACHE_ENTRIES = 60;
const renderedThumbnailCache = new Map<string, string>();
const inFlightRenders = new Map<string, Promise<string>>();

export function isImageMimeType(mime: string): boolean {
  return IMAGE_MIME_TYPES.has(mime.toLowerCase());
}

export function isPdfMimeType(mime: string): boolean {
  return mime.toLowerCase() === 'application/pdf';
}

export function formatMimeShort(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower === 'application/pdf') return 'PDF';
  if (lower === 'image/jpeg' || lower === 'image/jpg') return 'JPEG';
  if (lower === 'image/png') return 'PNG';
  if (lower === 'image/webp') return 'WEBP';
  const parts = lower.split('/');
  return (parts[1] ?? lower).toUpperCase();
}

function setCachedThumbnail(key: string, dataUrlOrBlobUrl: string): void {
  if (renderedThumbnailCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = renderedThumbnailCache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldestValue = renderedThumbnailCache.get(oldestKey);
      if (oldestValue?.startsWith('blob:')) {
        URL.revokeObjectURL(oldestValue);
      }
      renderedThumbnailCache.delete(oldestKey);
    }
  }
  renderedThumbnailCache.set(key, dataUrlOrBlobUrl);
}

async function renderPdfFirstPageDataUrl(pdfBytes: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = 280;
    const scale = baseViewport.width > 0 ? targetWidth / baseViewport.width : 1;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.84);
  } finally {
    await pdf.cleanup();
    await loadingTask.destroy();
  }
}

async function fetchAndRenderThumbnail(doc: DocumentRef): Promise<string> {
  const cacheKey = `${doc.id}:${doc.mime_type}`;
  const cached = renderedThumbnailCache.get(cacheKey);
  if (cached) return cached;

  const existingFlight = inFlightRenders.get(cacheKey);
  if (existingFlight) return existingFlight;

  const task = (async () => {
    const signed = await documentsService.getPreviewUrl(doc.id);
    const response = await fetch(signed.url);
    if (!response.ok) {
      throw new Error(`Preview fetch failed (${response.status})`);
    }

    if (isPdfMimeType(doc.mime_type)) {
      const bytes = await response.arrayBuffer();
      const dataUrl = await renderPdfFirstPageDataUrl(bytes);
      setCachedThumbnail(cacheKey, dataUrl);
      return dataUrl;
    }

    if (isImageMimeType(doc.mime_type)) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCachedThumbnail(cacheKey, objectUrl);
      return objectUrl;
    }

    throw new Error('Unsupported thumbnail format');
  })().finally(() => {
    inFlightRenders.delete(cacheKey);
  });

  inFlightRenders.set(cacheKey, task);
  return task;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  doc,
  extraCount = 0,
  size = 'card',
  onPreviewClick,
}) => {
  const cacheKey = `${doc.id}:${doc.mime_type}`;
  const supportsVisualRender = isImageMimeType(doc.mime_type) || isPdfMimeType(doc.mime_type);

  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => size === 'modal' || renderedThumbnailCache.has(cacheKey),
  );
  const [src, setSrc] = useState<string | null>(
    () => renderedThumbnailCache.get(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openingPreview, setOpeningPreview] = useState(false);

  useEffect(() => {
    const cached = renderedThumbnailCache.get(cacheKey) ?? null;
    setSrc(cached);
    setFailed(false);
    setShouldLoad(size === 'modal' || Boolean(cached));
  }, [cacheKey, size]);

  useEffect(() => {
    if (shouldLoad || !supportsVisualRender) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad, supportsVisualRender]);

  useEffect(() => {
    if (!shouldLoad || !supportsVisualRender) return;
    const cached = renderedThumbnailCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setFailed(false);

    fetchAndRenderThumbnail(doc)
      .then((renderedUrl) => {
        if (active) setSrc(renderedUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shouldLoad, supportsVisualRender, cacheKey, doc]);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onPreviewClick) {
      onPreviewClick(doc);
      return;
    }
    if (openingPreview) return;
    setOpeningPreview(true);
    try {
      const signed = await documentsService.getPreviewUrl(doc.id);
      openDocumentSignedUrl(signed.url, 'preview', doc.title);
    } finally {
      setOpeningPreview(false);
    }
  };

  const sizeClass = size === 'card' ? 'h-24 w-28 shrink-0' : 'h-36 w-full';

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={openingPreview}
      title={`Preview ${doc.title}${extraCount > 0 ? ` (+${extraCount} more)` : ''}`}
      aria-label={`Preview attached document ${doc.title}`}
      className={`group relative flex ${sizeClass} cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] p-1 transition-colors hover:border-[var(--accent)] disabled:cursor-wait`}
    >
      {supportsVisualRender ? (
        loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
        ) : src && !failed ? (
          <img
            src={src}
            alt={doc.title}
            onError={() => setFailed(true)}
            className="h-full w-full rounded object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-1.5 text-center">
            {isPdfMimeType(doc.mime_type) ? (
              <FileText className="h-5 w-5 text-[var(--accent)]" />
            ) : (
              <FileImage className="h-5 w-5 text-[var(--accent)]" />
            )}
            <span className="font-mono text-[9px] uppercase text-[var(--text-secondary)]">
              {formatMimeShort(doc.mime_type)}
            </span>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-1 px-1.5 text-center">
          <FileText className="h-5 w-5 text-[var(--accent)]" />
          <span className="font-mono text-[9px] uppercase text-[var(--text-primary)]">
            {formatMimeShort(doc.mime_type)}
          </span>
          <span className="line-clamp-1 text-[9px] text-[var(--text-secondary)]">
            {doc.title}
          </span>
        </div>
      )}

      {/* Format badge on PDFs/images or +N badge */}
      {extraCount > 0 && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full border border-[var(--border-accent)] bg-[var(--surface-elevated)]/95 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--accent)] shadow-xs">
          +{extraCount}
        </span>
      )}

      <span className="pointer-events-none absolute bottom-1 right-1 inline-flex items-center gap-1 rounded border border-[var(--border-medium)] bg-[var(--surface-elevated)]/90 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--text-primary)] opacity-0 transition-opacity group-hover:opacity-100">
        {openingPreview ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-[var(--accent)]" />
        ) : (
          <Eye className="h-2.5 w-2.5 text-[var(--accent)]" />
        )}
        Open
      </span>
    </button>
  );
};
