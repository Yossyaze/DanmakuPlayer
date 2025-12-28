import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, MessageSquare, Maximize, Minimize } from 'lucide-react';
import { formatTime } from '../utils/danmakuUtils';
import DanmakuSettingsPopover from './ui/DanmakuSettingsPopover';

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
    containerRef // For fullscreen
}) => {
    const seekContainerRef = useRef(null);
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
            containerRef.current.requestFullscreen().catch(err => {
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
            thumbRef.current.style.left = `${percentage * 100}%`;
        }
    };

    const handleMouseDown = (e) => {
        if (!seekContainerRef.current) return;
        e.preventDefault(); // Prevent text selection

        isDraggingRef.current = true;
        handleSeekStart();

        const rect = seekContainerRef.current.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startPct = Math.max(0, Math.min(1, startX / rect.width));

        // Immediate UI update
        updateUI(startPct);

        const newTime = startPct * totalDuration;
        handleSeek({ target: { value: newTime } });
        lastSeekTimeRef.current = performance.now();

        const onMouseMove = (moveEvent) => {
            if (!seekContainerRef.current) return;
            const currentRect = seekContainerRef.current.getBoundingClientRect();
            const x = moveEvent.clientX - currentRect.left;
            const percentage = Math.max(0, Math.min(1, x / currentRect.width));

            // Immediate UI update (High Performance)
            updateUI(percentage);

            // Throttle heavy state updates (30ms = ~30fps)
            const now = performance.now();
            if (now - lastSeekTimeRef.current > 30) {
                const time = percentage * totalDuration;
                handleSeek({ target: { value: time } });
                lastSeekTimeRef.current = now;
            }
        };

        const onMouseUp = (upEvent) => {
            isDraggingRef.current = false;

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
        handleSeekStart();

        const touch = e.touches[0];
        const rect = seekContainerRef.current.getBoundingClientRect();
        const startX = touch.clientX - rect.left;
        const startPct = Math.max(0, Math.min(1, startX / rect.width));

        // Immediate UI update
        updateUI(startPct);

        const newTime = startPct * totalDuration;
        handleSeek({ target: { value: newTime } });
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

            // Throttle
            const now = performance.now();
            if (now - lastSeekTimeRef.current > 30) {
                const time = percentage * totalDuration;
                handleSeek({ target: { value: time } });
                lastSeekTimeRef.current = now;
            }
        };

        const onTouchEnd = () => {
            isDraggingRef.current = false;

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
    const previewVideoRef = useRef(null);

    const handleSeekMouseMove = (e) => {
        if (!seekContainerRef.current || totalDuration <= 0) return;
        const rect = seekContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * totalDuration; // This is Video Relative Time (0 to TotalDuration)

        // Thumbnail Width (w-52 = 13rem = 208px approx)
        const halfThumbWidth = 104;
        const padding = 16; // p-4 of parent container

        // Clamp position so thumbnail stays within video container
        // Min: -16 (left edge of parent) + 104 (half thumb) = 88
        // Max: rect.width + 16 (right edge of parent) - 104 = rect.width - 88
        const minPos = halfThumbWidth - padding;
        const maxPos = rect.width + padding - halfThumbWidth;

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

    const handleSeekMouseLeave = () => {
        setHoverTime(null);
    };

    if (!videoSrc) return null;

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
                    {/* Thumbnail Preview (Moved inside seek container for easier positioning) */}
                    <div
                        className="absolute bottom-20 transform -translate-x-1/2 pointer-events-none transition-opacity duration-200 z-50 flex flex-col items-center w-52 min-w-52"
                        style={{
                            left: `${hoverPos}px`, // Use pixels
                            opacity: hoverTime !== null ? 1 : 0,
                            visibility: hoverTime !== null ? 'visible' : 'hidden'
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
                    <div className="relative w-full h-1 group-hover/seek:h-2 transition-all duration-200 bg-gray-600 rounded-lg overflow-hidden">
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
                            style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
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
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none transform -translate-x-1/2 scale-0 group-hover/seek:scale-100 transition-transform"
                        style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                    />
                </div>
            )}

            <div className="flex items-center justify-between">
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
                            className={`transition p-1 rounded-full ${showDanmaku ? 'text-white bg-blue-500' : 'text-white/50 hover:bg-white/10'}`}
                            title={`弾幕 ${showDanmaku ? 'ON' : 'OFF'} (D)`}
                        >
                            <MessageSquare size={20} />
                        </button>
                    )}

                    {/* Settings Button */}
                    {dmSettings && setDmSettings && (
                        <div className="relative">
                            <button 
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`transition p-1 rounded-full ${isSettingsOpen ? 'text-white bg-white/20' : 'text-white hover:bg-white/10'}`}
                                title="弾幕設定"
                            >
                                <Settings size={20} />
                            </button>
                            {isSettingsOpen && (
                                <DanmakuSettingsPopover 
                                    dmSettings={dmSettings} 
                                    setDmSettings={setDmSettings} 
                                    onClose={() => setIsSettingsOpen(false)}
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
