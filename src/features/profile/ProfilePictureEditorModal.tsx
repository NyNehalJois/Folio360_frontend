import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ImagePlus,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { resolveAvatarUrl } from './profileHelpers';
import { profileService } from '@/services/api';
import { ApiClientError } from '@/services/http';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CROP_VIEWPORT_PX = 272;
const OUTPUT_SIZE_PX = 640;

interface ImageDimensions {
  width: number;
  height: number;
}

interface ProfilePictureEditorModalProps {
  open: boolean;
  currentAvatarUrl: string | null;
  onClose: () => void;
  onSaved: (newAvatarUrl: string) => void;
  onRemoved: () => void;
}

function resolveImageMime(file: File): string | null {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return file.type.toLowerCase();
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

export const ProfilePictureEditorModal: React.FC<ProfilePictureEditorModalProps> = ({
  open,
  currentAvatarUrl,
  onClose,
  onSaved,
  onRemoved,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);
  const [outputMime, setOutputMime] = useState<string>('image/jpeg');
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Sync modal state when opened
  useEffect(() => {
    if (!open) return;
    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDimensions(null);
    setSourceUrl(resolveAvatarUrl(currentAvatarUrl));
    setOutputMime('image/jpeg');
  }, [open, currentAvatarUrl]);

  // Revoke temporary object URLs on unmount or replacement
  useEffect(() => {
    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [objectUrlToRevoke]);

  const computeBaseScale = useCallback((dims: ImageDimensions | null): number => {
    if (!dims || dims.width === 0 || dims.height === 0) return 1;
    return Math.max(CROP_VIEWPORT_PX / dims.width, CROP_VIEWPORT_PX / dims.height);
  }, []);

  const clampOffset = useCallback(
    (nextX: number, nextY: number, targetZoom: number, dims: ImageDimensions | null) => {
      if (!dims) return { x: 0, y: 0 };
      const scale = computeBaseScale(dims) * targetZoom;
      const renderedW = dims.width * scale;
      const renderedH = dims.height * scale;
      const maxOffsetX = Math.max(0, (renderedW - CROP_VIEWPORT_PX) / 2);
      const maxOffsetY = Math.max(0, (renderedH - CROP_VIEWPORT_PX) / 2);
      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY)),
      };
    },
    [computeBaseScale],
  );

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so re-selecting the same file still fires onChange
    e.target.value = '';
    if (!file) return;

    setError(null);

    const detectedMime = resolveImageMime(file);
    if (!detectedMime) {
      setError('Unsupported image format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`Image is ${sizeMb} MB, which exceeds the 5 MB maximum size limit.`);
      return;
    }

    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrlToRevoke(nextUrl);
    setSourceUrl(nextUrl);
    setOutputMime(detectedMime);
    setDimensions(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      setError('Unable to read image dimensions.');
      return;
    }
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setOffset({ x: 0, y: 0 });
  };

  const handleImageError = () => {
    setError('Unable to decode the selected image file.');
    setDimensions(null);
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom, dimensions));
  };

  const handleResetCrop = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dimensions || !sourceUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag?.active || !dimensions) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setOffset(clampOffset(drag.originX + dx, drag.originY + dy, zoom, dimensions));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.active) {
      dragStateRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }
    }
  };

  const exportCroppedFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = imgRef.current;
      if (!img || !dimensions) {
        reject(new Error('No image loaded to crop.'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE_PX;
      canvas.height = OUTPUT_SIZE_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context is unavailable.'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const scale = computeBaseScale(dimensions) * zoom;
      const renderedW = dimensions.width * scale;
      const renderedH = dimensions.height * scale;

      const viewLeft = (renderedW - CROP_VIEWPORT_PX) / 2 - offset.x;
      const viewTop = (renderedH - CROP_VIEWPORT_PX) / 2 - offset.y;

      const srcX = Math.max(0, viewLeft / scale);
      const srcY = Math.max(0, viewTop / scale);
      const srcSize = Math.min(
        CROP_VIEWPORT_PX / scale,
        dimensions.width - srcX,
        dimensions.height - srcY,
      );

      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcSize,
        srcSize,
        0,
        0,
        OUTPUT_SIZE_PX,
        OUTPUT_SIZE_PX,
      );

      const ext =
        outputMime === 'image/png' ? 'png' : outputMime === 'image/webp' ? 'webp' : 'jpg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to export cropped image.'));
            return;
          }
          if (blob.size > MAX_FILE_SIZE_BYTES) {
            reject(new Error('Cropped image exceeds the 5 MB maximum size limit.'));
            return;
          }
          resolve(new File([blob], `avatar.${ext}`, { type: outputMime }));
        },
        outputMime,
        0.92,
      );
    });
  };

  const handleSave = async () => {
    if (saving || removing || !dimensions || !sourceUrl) return;
    setError(null);
    setSaving(true);
    try {
      const croppedFile = await exportCroppedFile();
      const res = await profileService.uploadAvatar(croppedFile);
      onSaved(res.avatar_url);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to save profile picture right now.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (saving || removing) return;
    setError(null);
    setRemoving(true);
    try {
      await profileService.removeAvatar();
      onRemoved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Unable to remove profile picture.',
      );
    } finally {
      setRemoving(false);
    }
  };

  const scale = computeBaseScale(dimensions) * zoom;
  const renderedW = dimensions ? dimensions.width * scale : CROP_VIEWPORT_PX;
  const renderedH = dimensions ? dimensions.height * scale : CROP_VIEWPORT_PX;
  const hasImageReady = Boolean(sourceUrl && dimensions);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-editor-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              PROFILE IMAGE
            </p>
            <h2
              id="avatar-editor-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              Edit Profile Picture
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile picture editor"
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Select profile image file"
        />

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs text-[var(--danger-text)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Crop Viewport */}
        <div className="mt-5 flex flex-col items-center">
          {sourceUrl ? (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              style={{
                width: `${CROP_VIEWPORT_PX}px`,
                height: `${CROP_VIEWPORT_PX}px`,
                touchAction: 'none',
              }}
              className="relative overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-secondary)] cursor-grab active:cursor-grabbing select-none"
            >
              <img
                ref={imgRef}
                src={sourceUrl}
                alt="Profile crop preview"
                crossOrigin="anonymous"
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={
                  dimensions
                    ? {
                        width: `${renderedW}px`,
                        height: `${renderedH}px`,
                        maxWidth: 'none',
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }
                    : undefined
                }
                className="pointer-events-none absolute left-1/2 top-1/2"
              />
              {/* Subtle square rule-of-thirds guide */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 border border-white/25 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: `${CROP_VIEWPORT_PX}px`, height: `${CROP_VIEWPORT_PX}px` }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)]/60 p-6 text-center transition-colors hover:border-[var(--text-primary)] cursor-pointer"
            >
              <ImagePlus className="h-7 w-7 text-[var(--accent)]" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Select an image
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                  JPEG, PNG, or WebP · max 5 MB
                </p>
              </div>
            </button>
          )}

          {hasImageReady && (
            <p className="mt-2.5 font-mono text-[11px] text-[var(--text-secondary)]">
              Drag image to reposition · Square 1:1 crop
            </p>
          )}
        </div>

        {/* Zoom & Crop Controls */}
        {hasImageReady && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              aria-label="Zoom out"
              className="rounded-md p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              aria-label="Zoom level"
              className="flex-1 accent-[var(--text-primary)] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              aria-label="Zoom in"
              className="rounded-md p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <span className="w-11 text-right font-mono text-[11px] text-[var(--text-secondary)]">
              {zoom.toFixed(1)}×
            </span>

            <button
              type="button"
              onClick={handleResetCrop}
              title="Reset crop"
              aria-label="Reset crop"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        )}

        {/* File Picker & Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <PillButton
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || removing}
            >
              <Upload className="h-3.5 w-3.5" />
              {sourceUrl ? 'Replace image' : 'Choose image'}
            </PillButton>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving || removing}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--danger-border)] px-3.5 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {removing ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <PillButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving || removing}
            >
              Cancel
            </PillButton>
            <PillButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasImageReady || saving || removing}
            >
              {saving ? 'Saving…' : 'Save photo'}
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};
