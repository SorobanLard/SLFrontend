'use client';

import React, {
  useRef, useState, useEffect, useCallback,
  forwardRef, useImperativeHandle
} from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { VideoQualityLevel, VideoQualities } from '@/types';

// ── Types ──────────────────────────────────────────────────────────
interface VideoPlayerProps {
  /** URL of the video to play */
  src: string;
  /** Per-resolution source URLs for the quality selector */
  videoQualities?: VideoQualities;
  /** URL of the WebVTT subtitle track (optional) */
  captionsUrl?: string;
  /** enrollment id — used when saving progress to the API */
  enrollmentId?: string;
  /** lesson id — used when saving progress to the API */
  lessonId?: string;
  /** Called with the current watched seconds whenever progress is saved */
  onProgress?: (watchedSecs: number) => void;
  /** Called once when the video reaches ≥95% of its duration */
  onComplete?: () => void;
  /** Called when the video element fires its 'ended' event */
  onEnded?: () => void;
  /** Whether autoplay-next is currently enabled */
  autoplay?: boolean;
  /** Called when the user toggles the autoplay switch in the controls */
  onAutoplayChange?: (enabled: boolean) => void;
  /** Class name applied to the outermost wrapper */
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────
const AUTOSAVE_INTERVAL_MS  = 30_000; // save every 30 s
const COMPLETION_THRESHOLD  = 0.95;   // 95 %
const CAPTIONS_STORAGE_KEY = 'sorobanlard-captions-enabled';

// ── Component ─────────────────────────────────────────────────────
const VideoPlayerInner = forwardRef<
  HTMLVideoElement,
  VideoPlayerProps
>(function VideoPlayerComponent({
  src,
  videoQualities,
  captionsUrl,
  enrollmentId,
  lessonId,
  onProgress,
  onComplete,
  onEnded,
  autoplay = false,
  onAutoplayChange,
  className = '',
}, ref) {
  // ── Refs ──────────────────────────────────────────────────────
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  useImperativeHandle(ref, () => videoRef.current!, [])
  const wrapperRef    = useRef<HTMLDivElement | null>(null);
  const saveTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef  = useRef(false);        // fire onComplete only once
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionsTrackRef = useRef<HTMLTrackElement | null>(null);

  // ── State ─────────────────────────────────────────────────────
  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [subtitlesOn, setSubtitlesOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(CAPTIONS_STORAGE_KEY) === 'true';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering,    setBuffering]    = useState(false);
  const [showControls, setShowControls] = useState(true);

  // ── Quality state ─────────────────────────────────────────────
  const [quality, setQuality] = useState<VideoQualityLevel>('auto');
  // Tracks the URL currently loaded into the <video> element
  const [activeSrc, setActiveSrc] = useState(src);
  // Stash position before switching so we can restore it after load
  const pendingSeekRef = useRef<number | null>(null);

  // ── Reset quality when the lesson changes ────────────────────
  useEffect(() => {
    setQuality('auto');
    setActiveSrc(src);
    pendingSeekRef.current = null;
    pendingPlayRef.current = false;
  }, [src]);

  // ── Save progress helper ──────────────────────────────────────
  const saveProgress = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || !enrollmentId || !lessonId) return;
    const watched = Math.floor(vid.currentTime);
    try {
      // Dynamic import keeps the heavy API client out of the initial bundle
      const { lessonsApi } = await import('@/lib/api/services');
      await lessonsApi.updateProgress(lessonId, enrollmentId, watched);
      onProgress?.(watched);
    } catch {
      // silently swallow — progress save should never crash the player
    }
  }, [enrollmentId, lessonId, onProgress]);

  // ── Auto-save every 30 s ──────────────────────────────────────
  useEffect(() => {
    saveTimerRef.current = setInterval(saveProgress, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [saveProgress]);

  // ── Sync subtitle track visibility ───────────────────────────
  useEffect(() => {
    window.sessionStorage.setItem(CAPTIONS_STORAGE_KEY, String(subtitlesOn));
  }, [subtitlesOn]);

  const syncCaptionTrack = useCallback(() => {
    const track = captionsTrackRef.current?.track;
    if (track) track.mode = subtitlesOn && captionsUrl ? 'showing' : 'hidden';
  }, [captionsUrl, subtitlesOn]);

  useEffect(() => {
    syncCaptionTrack();
  }, [syncCaptionTrack, activeSrc]);

  // ── Fullscreen change listener ────────────────────────────────
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Only act when the wrapper (or something inside it) has focus,
      // OR when no interactive element outside the player is focused.
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const vid = videoRef.current;
      if (!vid) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, vid.currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(vid.duration || Infinity, vid.currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolume(Math.min(1, vid.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolume(Math.max(0, vid.volume - 0.1));
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (vid.duration) {
            e.preventDefault();
            const pct = parseInt(e.key, 10) / 10;
            handleSeek(vid.duration * pct);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-hide controls after 3 s of inactivity ───────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
  }, []);

  // ── Playback handlers ─────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play();
    } else {
      vid.pause();
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolume = useCallback((v: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = v;
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const handleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void wrapper.requestFullscreen();
    }
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = s;
    setSpeed(s);
  }, []);

  const handleQualityChange = useCallback((level: VideoQualityLevel) => {
    const vid = videoRef.current;
    if (!vid) return;
    const nextSrc = level === 'auto' ? src : videoQualities?.[level];
    if (!nextSrc) return;
    pendingSeekRef.current = vid.currentTime;
    pendingPlayRef.current = !vid.paused;
    setQuality(level);
    setActiveSrc(nextSrc);
  }, [src, videoQualities]);

  const pendingPlayRef = useRef(false);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration || 0);
    if (pendingSeekRef.current != null) {
      vid.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      void vid.play();
    }
    syncCaptionTrack();
  }, [syncCaptionTrack]);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    if (
      !completedRef.current &&
      vid.duration > 0 &&
      vid.currentTime / vid.duration >= COMPLETION_THRESHOLD
    ) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [onComplete]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    setShowControls(true);
  }, []);

  const handleWaiting = useCallback(() => setBuffering(true), []);
  const handlePlaying = useCallback(() => setBuffering(false), []);

  return (
    <div
      ref={wrapperRef}
      className={`relative group bg-black rounded-lg overflow-hidden ${className}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={activeSrc}
        className="w-full h-full"
        playsInline
        autoPlay={autoplay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onClick={togglePlayPause}
      >
        {captionsUrl && (
          <track
            ref={captionsTrackRef}
            kind="subtitles"
            src={captionsUrl}
            srcLang="en"
            label="English"
            default={subtitlesOn}
          />
        )}
      </video>

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      <VideoControls
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        speed={speed}
        quality={quality}
        videoQualities={videoQualities}
        subtitlesOn={subtitlesOn}
        isFullscreen={isFullscreen}
        autoplay={autoplay}
        visible={showControls}
        onPlayPause={togglePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolume}
        onMuteToggle={handleMute}
        onSpeedChange={handleSpeedChange}
        onQualityChange={handleQualityChange}
        onSubtitlesToggle={() => setSubtitlesOn((v) => !v)}
        onFullscreenToggle={toggleFullscreen}
        onAutoplayChange={onAutoplayChange}
      />
    </div>
  );
});

// ── Dynamic wrapper ───────────────────────────────────────────────
// The player is a heavy client component; load it lazily so it does not
// block the initial paint of the lesson sidebar. SSR is disabled because
// the player relies on browser-only APIs (fullscreen, sessionStorage).
const VideoPlayerLoading = () => (
  <div className="flex items-center justify-center bg-black rounded-lg aspect-video">
    <Loader2 className="w-10 h-10 text-white animate-spin" />
  </div>
);

export const VideoPlayer = dynamic(
  () => Promise.resolve({ default: VideoPlayerInner }),
  {
    ssr: false,
    loading: VideoPlayerLoading,
  }
);
