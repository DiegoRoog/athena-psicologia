import { assetPath } from './asset-path';

/** Scroll, rather than elapsed time, is the single source of truth. */
export const FRAME_COUNT = 240;
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function scrollProgress(scrollY: number, documentHeight: number, viewportHeight: number) {
  const distance = documentHeight - viewportHeight;
  return distance > 0 ? clamp(scrollY / distance) : 0;
}

export function frameIndex(progress: number, count = FRAME_COUNT) {
  if (count <= 1) return 0;
  const normalized = clamp(progress);
  // Reserve the last image for the actual bottom, not the last half-frame interval.
  return normalized >= 1 ? count - 1 : Math.min(count - 2, Math.round(normalized * (count - 1)));
}

export function frameUrl(index: number, mobile = false) {
  const filename = String(clamp(Math.round(index), 0, FRAME_COUNT - 1) + 1).padStart(4, '0');
  return assetPath(`/frames/${mobile ? 'mobile' : 'desktop'}/frame-${filename}.${mobile ? 'webp' : 'jpg'}`);
}

export type DrawRect = { x: number; y: number; width: number; height: number };

/** Focal values describe where the excess image should be cropped. */
export function coverRect(width: number, height: number, sourceWidth = FRAME_WIDTH, sourceHeight = FRAME_HEIGHT, focalX = 0.5, focalY = 0.5): DrawRect {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawnWidth = sourceWidth * scale;
  const drawnHeight = sourceHeight * scale;
  return { x: (width - drawnWidth) * clamp(focalX), y: (height - drawnHeight) * clamp(focalY), width: drawnWidth, height: drawnHeight };
}

export function sequenceRect(width: number, height: number, progress: number): DrawRect {
  // Landscape keeps the original composition. Portrait follows the subject as
  // the final camera movement positions him on the right of the source frame.
  const portrait = width / height < 1;
  const drift = clamp((progress - 0.7) / 0.25);
  const focalX = portrait ? 0.5 + 0.27 * drift : 0.5;
  return coverRect(width, height, FRAME_WIDTH, FRAME_HEIGHT, focalX);
}

export function priorityFrames(target: number, direction: number, radius: number, count = FRAME_COUNT) {
  const result = [target];
  const forward = direction < 0 ? -1 : 1;
  for (let step = 1; step <= radius; step++) {
    for (const index of [target + forward * step, target - forward * step]) {
      if (index >= 0 && index < count) result.push(index);
    }
  }
  return result;
}
