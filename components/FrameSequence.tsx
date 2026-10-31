'use client';

import { useEffect, useRef } from 'react';
import { assetPath } from '../lib/asset-path';
import { frameIndex, frameUrl, priorityFrames, scrollProgress, sequenceRect } from '../lib/sequence';

type DecodedFrame = {
  source: CanvasImageSource;
  dispose: () => void;
};

type Props = { onProgress?: (progress: number, frame: number) => void };

async function decodeFrame(blob: Blob): Promise<DecodedFrame> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, dispose: () => bitmap.close() };
    } catch {
      // Some browsers expose ImageBitmap but reject a supported image format.
      // Their ordinary image decoder can still provide the Canvas source.
    }
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    return { source: image, dispose: () => { image.src = ''; URL.revokeObjectURL(url); } };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** One rendering loop; React is never updated on an animation frame. */
export default function FrameSequence({ onProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const callbackRef = useRef(onProgress);
  useEffect(() => { callbackRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const poster = posterRef.current;
    const foreground = foregroundRef.current;
    if (!canvas || !poster) return;
    const context = canvas.getContext('2d', { alpha: false });
    const foregroundContext = foreground?.getContext('2d');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const cache = new Map<number, DecodedFrame>();
    const pending = new Map<number, AbortController>();
    const failures = new Map<number, number>();
    let alive = true;
    let generation = 0;
    let tick = 0;
    let progress = 0;
    let target = 0;
    let drawn = -1;
    let direction = 1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resized = true;
    let mobile = mobileQuery.matches;
    let reduced = motionQuery.matches;
    let lastProgress = -1;

    function paintForeground(source: CanvasImageSource, rect: ReturnType<typeof sequenceRect>) {
      if (!foreground || !foregroundContext) return;
      const nextWidth = canvas!.clientWidth || window.innerWidth;
      const nextHeight = canvas!.clientHeight || window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      if (foreground.width !== Math.round(nextWidth * ratio) || foreground.height !== Math.round(nextHeight * ratio)) {
        foreground.width = Math.round(nextWidth * ratio);
        foreground.height = Math.round(nextHeight * ratio);
      }
      foregroundContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      foregroundContext.clearRect(0, 0, nextWidth, nextHeight);
      foreground.style.opacity = progress < 0.14 || reduced ? '1' : '0';
      if (progress >= 0.14 && !reduced) return;
      foregroundContext.save();
      foregroundContext.translate(rect.x, rect.y);
      foregroundContext.scale(rect.width / 1280, rect.height / 720);
      // An in-image silhouette mask traced from the provided first frame. This
      // repeats the exact same pixels in alignment, never a second sculpture.
      const contour = [[626,55],[657,54],[681,76],[689,102],[682,132],[679,163],[714,165],[747,181],[770,207],[781,251],[790,276],[807,313],[813,355],[811,407],[820,505],[808,531],[817,603],[805,646],[808,710],[415,718],[435,648],[474,645],[485,553],[479,500],[471,458],[470,426],[482,390],[523,366],[504,350],[498,326],[504,297],[515,271],[522,233],[531,211],[548,196],[581,184],[603,168],[601,144],[598,124],[591,109],[591,84],[604,66]];
      foregroundContext.beginPath();
      contour.forEach(([x, y], index) => index === 0 ? foregroundContext.moveTo(x, y) : foregroundContext.lineTo(x, y));
      foregroundContext.closePath();
      foregroundContext.clip();
      foregroundContext.drawImage(source, 0, 0, 1280, 720);
      foregroundContext.restore();
    }

    function clearDecoded() {
      generation++;
      pending.forEach(controller => controller.abort());
      pending.clear();
      cache.forEach(frame => frame.dispose());
      cache.clear();
      failures.clear();
      canvas!.dataset.cacheSize = '0';
      canvas!.dataset.handsOpen = 'false';
    }

    function prune() {
      const limit = mobile ? 18 : 24;
      while (cache.size > limit) {
        const victim = [...cache.keys()].find(index => index !== target);
        if (victim === undefined) break;
        cache.get(victim)?.dispose();
        cache.delete(victim);
      }
      canvas!.dataset.cacheSize = String(cache.size);
    }

    function requestRender() {
      if (alive && !tick && !document.hidden) tick = requestAnimationFrame(render);
    }

    function load(index: number) {
      const controller = new AbortController();
      const requestGeneration = generation;
      pending.set(index, controller);
      fetch(frameUrl(index, mobile), { signal: controller.signal, cache: 'force-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`Frame ${index + 1}: ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          if (controller.signal.aborted || requestGeneration !== generation || !alive) return null;
          return decodeFrame(blob);
        })
        .then(frame => {
          if (!frame) return;
          if (!alive || controller.signal.aborted || requestGeneration !== generation) {
            frame.dispose();
            return;
          }
          cache.get(index)?.dispose();
          cache.set(index, frame);
          prune();
          requestRender();
        })
        .catch(() => {
          if (!controller.signal.aborted && requestGeneration === generation) {
            failures.set(index, (failures.get(index) ?? 0) + 1);
            if (index === target) {
              canvas!.dataset.status = 'fallback';
              canvas!.dataset.handsOpen = 'false';
            }
          }
        })
        .finally(() => {
          if (pending.get(index) === controller) pending.delete(index);
          if (alive && requestGeneration === generation) pump();
        });
    }

    function pump() {
      if (!alive || reduced || document.hidden || !context) return;
      const radius = mobile ? 7 : 10;
      // Drop work for a region the reader has already left, without retaining
      // obsolete fetches in front of the newest target.
      for (const [index, controller] of pending) {
        if (Math.abs(index - target) > radius + 2) {
          controller.abort();
          pending.delete(index);
        }
      }
      const maxConcurrent = mobile ? 3 : 4;
      if (!cache.has(target) && !pending.has(target) && pending.size >= maxConcurrent && (failures.get(target) ?? 0) < 2) {
        let farthest = -1;
        for (const index of pending.keys()) {
          if (farthest < 0 || Math.abs(index - target) > Math.abs(farthest - target)) farthest = index;
        }
        // A new exact target takes precedence over speculative nearby frames.
        pending.get(farthest)?.abort();
        pending.delete(farthest);
      }
      for (const index of priorityFrames(target, direction, radius)) {
        if (pending.size >= maxConcurrent) break;
        if (!cache.has(index) && !pending.has(index) && (failures.get(index) ?? 0) < 2) load(index);
      }
    }

    function render() {
      tick = 0;
      if (!alive || document.hidden) return;
      progress = scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
      const next = frameIndex(progress);
      if (next !== target) direction = next > target ? 1 : -1;
      target = next;
      canvas!.dataset.targetFrame = String(target);
      canvas!.dataset.progress = progress.toFixed(6);
      canvas!.dataset.reducedMotion = String(reduced);
      if (foreground && progress >= 0.14 && !reduced) foreground.style.opacity = '0';
      if (progress !== lastProgress || resized) {
        callbackRef.current?.(progress, target);
        lastProgress = progress;
      }
      if (reduced || !context) {
        canvas!.style.opacity = '0';
        poster!.style.opacity = '1';
        canvas!.dataset.frame = '0';
        canvas!.dataset.handsOpen = 'false';
        canvas!.dataset.status = reduced ? 'reduced-motion' : 'fallback';
        if (poster!.complete && poster!.naturalWidth) paintForeground(poster!, sequenceRect(canvas!.clientWidth || window.innerWidth, canvas!.clientHeight || window.innerHeight, 0));
        resized = false;
        return;
      }

      const nextWidth = canvas!.clientWidth || window.innerWidth;
      const nextHeight = canvas!.clientHeight || window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      if (width !== nextWidth || height !== nextHeight || dpr !== nextDpr) {
        width = nextWidth;
        height = nextHeight;
        dpr = nextDpr;
        // Hide the canvas during the backing-store resize until a valid image
        // has been redrawn. The always-present poster covers this interval.
        canvas!.width = Math.round(width * dpr);
        canvas!.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        resized = true;
      }

      let best = cache.has(target) ? target : -1;
      if (best < 0) {
        for (const index of cache.keys()) {
          if (best < 0 || Math.abs(index - target) < Math.abs(best - target)) best = index;
        }
      }
      if (best >= 0) canvas!.dataset.status = best === target ? 'ready' : 'buffering';
      const foregroundNeedsRestore = progress < 0.14 && foreground?.style.opacity !== '1';
      if (best >= 0 && (best !== drawn || resized || foregroundNeedsRestore)) {
        const frame = cache.get(best)!;
        const rect = sequenceRect(width, height, best / 239);
        context.drawImage(frame.source, rect.x, rect.y, rect.width, rect.height);
        paintForeground(frame.source, rect);
        // Touch the frame to make this a bounded least-recently-used cache.
        cache.delete(best);
        cache.set(best, frame);
        drawn = best;
        canvas!.dataset.frame = String(best);
        canvas!.dataset.status = best === target ? 'ready' : 'buffering';
        canvas!.style.opacity = '1';
        poster!.style.opacity = '0';
        resized = false;
      } else if (drawn < 0) {
        canvas!.style.opacity = '0';
        poster!.style.opacity = '1';
        canvas!.dataset.handsOpen = 'false';
        if (poster!.complete && poster!.naturalWidth) paintForeground(poster!, sequenceRect(width, height, 0));
      }
      // A failed target may have hidden the emblem without changing the valid
      // retained frame. Derive this on every render, even when no redraw occurs.
      if (drawn >= 0) canvas!.dataset.handsOpen = String(drawn >= 51 && drawn <= 100);
      pump();
    }

    function handleResize() { resized = true; requestRender(); }
    function handleVisibility() {
      if (document.hidden) {
        if (tick) cancelAnimationFrame(tick);
        tick = 0;
        pending.forEach(controller => controller.abort());
        pending.clear();
      } else requestRender();
    }
    function handleMedia() {
      const changed = mobile !== mobileQuery.matches || reduced !== motionQuery.matches;
      mobile = mobileQuery.matches;
      reduced = motionQuery.matches;
      if (changed) {
        clearDecoded();
        drawn = -1;
        canvas!.style.opacity = '0';
        poster!.style.opacity = '1';
        resized = true;
        requestRender();
      }
    }

    window.addEventListener('scroll', requestRender, { passive: true });
    poster.addEventListener('load', requestRender);
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pageshow', requestRender);
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', handleMedia);
    mobileQuery.addEventListener('change', handleMedia);
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.documentElement);
    document.fonts.ready.then(() => { if (alive) handleResize(); });
    requestRender();

    return () => {
      alive = false;
      if (tick) cancelAnimationFrame(tick);
      clearDecoded();
      observer.disconnect();
      window.removeEventListener('scroll', requestRender);
      poster.removeEventListener('load', requestRender);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pageshow', requestRender);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMedia);
      mobileQuery.removeEventListener('change', handleMedia);
    };
  }, []);

  return (
    <>
    <div className="sequence-background" aria-hidden="true">
      {/* An ordinary image deliberately survives unavailable JS or Canvas. */}
      <img ref={posterRef} className="sequence-poster" src={assetPath('/frames/desktop/frame-0001.jpg')} width="1280" height="720" alt="" fetchPriority="high" />
      <canvas ref={canvasRef} className="sequence-canvas" data-frame="0" data-target-frame="0" data-progress="0" data-cache-size="0" data-hands-open="false" data-status="poster" style={{ opacity: 0 }} />
    </div>
    <canvas ref={foregroundRef} className="sequence-foreground" aria-hidden="true" style={{ pointerEvents: 'none' }} />
    </>
  );
}
