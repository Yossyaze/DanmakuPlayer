import {
  Maximize,
  MessageSquare,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { formatTime } from '../utils/danmakuUtils';
import DanmakuSettingsPopover from './ui/DanmakuSettingsPopover';

// Helper to generate a smooth Bezier path from data points (Open Path for Stroke)
const generateSmoothPath = (points, width, height) => {
  if (points.length < 2) return '';

  const maxY = height;
  const ratioX = width / (points.length - 1);
  const ratioY = maxY;

  const data = points.map((val, i) => ({
    x: i * ratioX,
    y: maxY - val * ratioY,
  }));

  let d = `M ${data[0].x} ${data[0].y}`;

  // Bezier control point calculation (simple smoothing)
  for (let i = 0; i < data.length - 1; i++) {
    const p0 = data[i - 1] || data[i];
    const p1 = data[i];
    const p2 = data[i + 1];
    const p3 = data[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
};

const VideoControls = ({
  isPlaying,
  togglePlay,
  currentTime,
  totalDuration,
  handleSeek,
  handleSeekStart,
  handleSeekEnd,
  volume,
  onVolumeChange,
  isMuted,
  toggleMute,
  progressBarRef,
  thumbRef,
  cmRanges,
  timeOffset = 0,
  logTimeToVideoTime, // Added prop
  visible = true, // Default to true
  videoSrc,
  dmSettings, // New prop
  setDmSettings, // New prop
  showDanmaku, // Danmaku visibility toggle
  setShowDanmaku, // Danmaku visibility setter
  containerRef, // For fullscreen
  abeModeUnlocked = false, // Hidden Abe Mode unlock state
  commentDensity = [], // Array of normalized values (0-1)
  onScrub, // New prop for optimized scrubbing (video relative time)
}) => {
  const seekContainerRef = useRef(null);

  // Debug log for comment density
  useEffect(() => {
    if (commentDensity.length > 0) {
      const maxVal = Math.max(...commentDensity);
      console.log(
        `[VideoControls] Graph Rendering: ${commentDensity.length} points, Max Density: ${maxVal}`
      );
    } else {
      console.log('[VideoControls] No comment density data available.');
    }
  }, [commentDensity]);

  const settingsBtnRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Watch for fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef?.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const updateUI = (percentage) => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${percentage * 100}%`;
    }
    if (thumbRef.current) {
      const pct = percentage * 100;
      thumbRef.current.style.left = `max(6px, min(calc(100% - 6px), ${pct}%))`;
    }
  };

  const updateHover = (clientX) => {
    if (!seekContainerRef.current || totalDuration <= 0) return;
    const rect = seekContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * totalDuration;

    // Thumbnail Width (w-52 = 13rem = 208px approx)
    const halfThumbWidth = 104;

    // Clamp position so thumbnail stays within video container
    const minPos = halfThumbWidth;
    const maxPos = rect.width - halfThumbWidth;

    // If seek bar is too narrow, center it
    let clampedX;
    if (maxPos < minPos) {
      clampedX = rect.width / 2;
    } else {
      clampedX = Math.max(minPos, Math.min(maxPos, x));
    }

    setHoverPos(clampedX);
    setHoverTime(time);

    if (previewVideoRef.current) {
      // Convert Video Relative Time to Log Time
      const logTime = time + timeOffset;

      // Convert Log Time to Video Time (handling CMs)
      let videoTime = logTime;
      if (logTimeToVideoTime) {
        const result = logTimeToVideoTime(logTime);
        videoTime = result.videoTime;
      }

      // Check if time difference is significant to avoid stuttering updates
      if (Math.abs(previewVideoRef.current.currentTime - videoTime) > 0.5) {
        previewVideoRef.current.currentTime = videoTime;
      }
    }
  };

  const handleMouseDown = (e) => {
    if (!seekContainerRef.current) return;
    e.preventDefault(); // Prevent text selection

    isDraggingRef.current = true;
    setIsDragging(true);
    handleSeekStart();

    const rect = seekContainerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startPct = Math.max(0, Math.min(1, startX / rect.width));

    // Immediate UI update
    updateUI(startPct);

    const newTime = startPct * totalDuration;
    if (onScrub) {
      onScrub(newTime);
    } else {
      handleSeek({ target: { value: newTime } });
    }
    lastSeekTimeRef.current = performance.now();

    const onMouseMove = (moveEvent) => {
      if (!seekContainerRef.current) return;
      const currentRect = seekContainerRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - currentRect.left;
      const percentage = Math.max(0, Math.min(1, x / currentRect.width));

      // Immediate UI update (High Performance)
      updateUI(percentage);

      const time = percentage * totalDuration;

      if (onScrub) {
        // High performance mode: No throttling here, rely on handler efficiency
        onScrub(time);
      } else {
        // Legacy mode: Throttled
        const throttleTime = 30;
        const now = performance.now();
        if (now - lastSeekTimeRef.current > throttleTime) {
          handleSeek({ target: { value: time } });
          lastSeekTimeRef.current = now;
        }
      }

      updateHover(moveEvent.clientX);
    };

    const onMouseUp = (upEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);

      // Final update to ensure sync
      if (seekContainerRef.current) {
        const currentRect = seekContainerRef.current.getBoundingClientRect();
        const x = upEvent.clientX - currentRect.left;
        const percentage = Math.max(0, Math.min(1, x / currentRect.width));
        const time = percentage * totalDuration;
        handleSeek({ target: { value: time } });
      }

      handleSeekEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e) => {
    if (!seekContainerRef.current) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    handleSeekStart();

    const touch = e.touches[0];
    const rect = seekContainerRef.current.getBoundingClientRect();
    const startX = touch.clientX - rect.left;
    const startPct = Math.max(0, Math.min(1, startX / rect.width));

    // Immediate UI update
    updateUI(startPct);

    const newTime = startPct * totalDuration;
    if (onScrub) {
      onScrub(newTime);
    } else {
      handleSeek({ target: { value: newTime } });
    }
    lastSeekTimeRef.current = performance.now();

    const onTouchMove = (moveEvent) => {
      moveEvent.preventDefault(); // Prevent scrolling
      if (!seekContainerRef.current) return;

      const t = moveEvent.touches[0];
      const currentRect = seekContainerRef.current.getBoundingClientRect();
      const x = t.clientX - currentRect.left;
      const percentage = Math.max(0, Math.min(1, x / currentRect.width));

      // Immediate UI update
      updateUI(percentage);

      const time = percentage * totalDuration;

      if (onScrub) {
        onScrub(time);
      } else {
        const now = performance.now();
        if (now - lastSeekTimeRef.current > 30) {
          handleSeek({ target: { value: time } });
          lastSeekTimeRef.current = now;
        }
      }

      updateHover(t.clientX);
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);

      // For touch end, we might not have coordinates if finger lifted.
      // But we can rely on the last throttled update or the last move event.
      // Ideally we just finish here.

      handleSeekEnd();
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const [hoverTime, setHoverTime] = React.useState(null);
  const [hoverPos, setHoverPos] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const previewVideoRef = useRef(null);

  const handleSeekMouseMove = (e) => {
    updateHover(e.clientX);
  };

  const handleSeekMouseLeave = () => {
    if (!isDraggingRef.current) {
      setHoverTime(null);
    }
  };

  if (!videoSrc) return null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent transition-opacity duration-300 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to video container (which toggles play)
    >
      {/* Custom Seek Bar with Color Segments */}
      {videoSrc && (
        <div
          ref={seekContainerRef}
          className="relative w-full h-8 mb-1 flex items-center cursor-pointer touch-none group/seek"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={handleSeekMouseLeave}
        >
          {' '}
          {/* Comment Momentum Graph (Hover Only) */}
          {/* Comment Momentum Graph (Hover Only) */}
          {commentDensity.length > 0 && (
            <div
              className={`absolute bottom-5 left-0 right-0 h-16 pointer-events-none transition-opacity duration-300 flex items-end ${
                isDragging ? 'opacity-100' : 'opacity-0 group-hover/seek:opacity-100'
              }`}
            >
              {/* Rectangular Fade Background (Top only) - Full Width */}
              <div
                className="absolute inset-0 -left-4 -right-4 w-auto h-full bg-black/40"
                style={{
                  maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
                }}
              />
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 200 64"
                preserveAspectRatio="none"
                className="relative w-full h-full overflow-visible z-10"
              >
                <defs>
                  <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {(() => {
                  const width = 200;
                  const height = 60;
                  const curvePath = generateSmoothPath(commentDensity, width, height);
                  const fillPath = `${curvePath} L ${width} ${height} L 0 ${height} Z`;

                  return (
                    <>
                      <path
                        d={fillPath}
                        transform="translate(0, 4)"
                        fill="url(#momentumGradient)"
                        stroke="none"
                      />
                      <path
                        d={curvePath}
                        transform="translate(0, 4)"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
          {/* Thumbnail Preview (Moved inside seek container for easier positioning) */}
          <div
            className="absolute bottom-20 transform -translate-x-1/2 pointer-events-none transition-opacity duration-200 z-50 flex flex-col items-center w-52 min-w-52"
            style={{
              left: `${hoverPos}px`, // Use pixels
              opacity: hoverTime !== null ? 1 : 0,
              visibility: hoverTime !== null ? 'visible' : 'hidden',
            }}
          >
            <video
              ref={previewVideoRef}
              src={videoSrc || null}
              className="w-full rounded-lg shadow-xl border-2 border-white/20 bg-black object-cover aspect-video"
              muted
              preload="auto"
              disablePictureInPicture
            />
            <div className="text-xs font-mono mt-1 text-white bg-black/70 px-2 py-0.5 rounded">
              {formatTime(hoverTime || 0)}
            </div>
          </div>
          {/* Background Track */}
          <div
            className={`relative w-full transition-all duration-200 bg-gray-600 rounded-lg overflow-hidden ${
              isDragging ? 'h-2' : 'h-1 group-hover/seek:h-2'
            }`}
          >
            {/* Layer 2: Unplayed CM Ranges (Yellow) */}
            {cmRanges.map((range, i) => {
              const start = range.logStart - timeOffset;
              const end = range.logEnd - timeOffset;
              const duration = end - start;
              const leftPct = totalDuration > 0 ? (start / totalDuration) * 100 : 0;
              const widthPct = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
              return (
                <div
                  key={`cm-bg-${i}`}
                  className="absolute top-0 h-full bg-yellow-500/70"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`CM: ${range.labelStart} ~ ${range.labelEnd}`}
                />
              );
            })}

            {/* Layer 3: Progress Bar (Blue) */}
            <div
              ref={progressBarRef}
              className="absolute top-0 left-0 h-full bg-blue-500 pointer-events-none"
              style={{
                width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
              }}
            />

            {/* Layer 4: Played CM Ranges (Green) */}
            {cmRanges.map((range, i) => {
              const start = range.logStart - timeOffset;
              const end = range.logEnd - timeOffset;
              const overlapEnd = Math.min(currentTime, end);
              const overlapStart = Math.max(0, start);
              const overlapDur = Math.max(0, overlapEnd - overlapStart);

              if (overlapDur <= 0) return null;

              const leftPct = totalDuration > 0 ? (start / totalDuration) * 100 : 0;
              const widthPct = totalDuration > 0 ? (overlapDur / totalDuration) * 100 : 0;

              return (
                <div
                  key={`cm-played-${i}`}
                  className="absolute top-0 h-full bg-green-500"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              );
            })}
          </div>
          {/* Thumb */}
          <div
            ref={thumbRef}
            className={`absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow pointer-events-none transform -translate-x-1/2 transition-transform ${
              isDragging ? 'scale-100' : 'scale-0 group-hover/seek:scale-100'
            }`}
            style={{
              width: '12px',
              height: '12px',
              left: (() => {
                if (totalDuration <= 0) return '6px';
                const ratio = currentTime / totalDuration;
                const safePct = Number.isFinite(ratio) ? ratio * 100 : 0;
                // Use max/min standard syntax for widest compatibility
                return `max(6px, min(calc(100% - 6px), ${safePct}%))`;
              })(),
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <div className="flex items-center gap-4">
          <button onClick={togglePlay} className="hover:text-blue-400 transition text-white">
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div className="flex items-center gap-2 group/vol">
            <button onClick={toggleMute} className="text-white">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={onVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded accent-white"
            />
          </div>
          <span className="text-sm font-mono text-white">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>
        {/* Settings Section */}
        <div className="flex items-center gap-1">
          {/* Danmaku Toggle */}
          {setShowDanmaku && (
            <button
              onClick={() => setShowDanmaku(!showDanmaku)}
              className={`transition p-1 rounded-full ${
                showDanmaku ? 'text-white bg-blue-500' : 'text-white/50 hover:bg-white/10'
              }`}
              title={`弾幕 ${showDanmaku ? 'ON' : 'OFF'} (D)`}
            >
              <MessageSquare size={20} />
            </button>
          )}

          {/* Settings Button */}
          {dmSettings && setDmSettings && (
            <div className="relative">
              <button
                ref={settingsBtnRef}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`transition p-1 rounded-full ${
                  isSettingsOpen ? 'text-white bg-white/20' : 'text-white hover:bg-white/10'
                }`}
                title="弾幕設定"
              >
                <Settings size={20} />
              </button>
              {isSettingsOpen && (
                <DanmakuSettingsPopover
                  dmSettings={dmSettings}
                  setDmSettings={setDmSettings}
                  abeModeUnlocked={abeModeUnlocked}
                  onClose={() => setIsSettingsOpen(false)}
                  triggerRef={settingsBtnRef}
                />
              )}
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="transition p-1 rounded-full text-white hover:bg-white/10"
            title={isFullscreen ? '縮小' : '全画面'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;
