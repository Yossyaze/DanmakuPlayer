import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  BookOpen,
  Edit2,
  FileInput,
  FilePen,
  FileVideo,
  GripVertical,
  Maximize,
  Menu,
  MessageSquare,
  Minimize,
  Pause,
  Play,
  Plus,
  Save,
  Settings,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';

import CmWaitOverlay from '../components/CmWaitOverlay';
import CommentList from '../components/CommentList';
import DanmakuLayer from '../components/DanmakuLayer';
import LogViewer from '../components/LogViewer';
import VideoRequestModal from '../components/modals/VideoRequestModal';
import AbeModeUnlockCelebration from '../components/ui/AbeModeUnlockCelebration';
import NgList from '../components/ui/NgList';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useDanmakuPlayer } from '../hooks/useDanmakuPlayer';
import { formatTime } from '../utils/danmakuUtils';

/**
 * Sortable file row component for drag-and-drop reordering
 */
const MobileSortableFileRow = ({ file, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="text-xs text-gray-400 bg-gray-800 p-2 rounded flex items-center gap-2 border border-gray-700 touch-none"
    >
      {/* Drag handle */}
      <div
        className="text-gray-500 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </div>
      {/* File info */}
      <div className="flex-1 min-w-0">
        <span className="break-all">{file.title || file.name}</span>
        <span className="ml-2 text-gray-500">{file.rawComments.length}件</span>
      </div>
      {/* Delete button */}
      <button onClick={onRemove} className="text-gray-500 hover:text-red-400 p-1 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
};

/**
 * Mobile-specific App component
 * Headerless design with video on top and comments below
 */
const MobileApp = () => {
  // --- Use existing hooks for shared logic ---
  const [uiSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('danmaku_ui_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load UI settings', e);
    }
    return {
      showThreadTitle: true,
      enableTreeView: false,
      showImages: true,
      imageLayout: 'inline',
      aaMode: 'auto',
    };
  });

  const [enableTreeView, setEnableTreeView] = useState(uiSettings.enableTreeView);
  const [showImages, setShowImages] = useState(uiSettings.showImages);
  const [showThreadTitle, setShowThreadTitle] = useState(uiSettings.showThreadTitle ?? true);
  const [imageLayout, setImageLayout] = useState(uiSettings.imageLayout || 'inline');
  const [aaMode, setAaMode] = useState(uiSettings.aaMode || 'auto');
  const [aaOverrideMap, setAaOverrideMap] = useState({});
  const [expandedDanmakuImage, setExpandedDanmakuImage] = useState(null);

  const handleToggleAA = useCallback((comment, isCurrentlyAA) => {
    setAaOverrideMap((prev) => {
      const next = !isCurrentlyAA;
      return { ...prev, [comment.id]: next };
    });
  }, []);

  // --- Use DanmakuPlayer Hook ---
  const {
    player,
    cmSystem,
    logSystem,
    danmaku,
    currentTime,
    dmSettings,
    setDmSettings,
    isAutoScroll,
    setIsAutoScroll,
    skipSeconds,
    videoStartTimeStr,
    setVideoStartTimeStr,
    activeCommentId,
    togglePlay,
    requestPlay,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    handleCmSkip,
    handleCommentClick,
    handleLogFileChange,
    handleSyncButton,
    resetPlayerState,
    unlockAbeMode,
    showAbeUnlockCelebration,
    closeAbeUnlockCelebration,
  } = useDanmakuPlayer(enableTreeView, aaOverrideMap);

  const { activeDanmaku, danmakuContainerRef, handleAnimationEnd, resetDanmaku } = danmaku;

  // --- Mobile-specific state ---
  const [showDanmaku, setShowDanmaku] = useState(true);
  const [logOnlyMode, setLogOnlyMode] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // null | 'settings' | 'ng'
  const [scrollToCommentId, setScrollToCommentId] = useState(null);
  const logScrollPositionsRef = useRef({});
  const [logSidebarOpen, setLogSidebarOpen] = useState(false); // Sidebar visibility state

  // Video overlay controls
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [showDanmakuSettings, setShowDanmakuSettings] = useState(false);
  const [showVideoRequestModal, setShowVideoRequestModal] = useState(false);
  const [requestedVideoName, setRequestedVideoName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayTimeoutRef = useRef(null);

  const containerRef = useRef(null);

  // Seekbar state
  const seekContainerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState(null);
  const [seekPreviewPos, setSeekPreviewPos] = useState(0);

  // Project file state
  const [projectFileHandle, setProjectFileHandle] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [_showExportModal, setShowExportModal] = useState(false);
  const [showFileReorderModal, setShowFileReorderModal] = useState(false);

  // DnD sensors for file reordering
  const fileDndSensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // CM Settings state
  const [cmStartInput, setCmStartInput] = useState('');
  const [cmEndInput, setCmEndInput] = useState('');
  const [cmStartMode, setCmStartMode] = useState('log'); // 'log' | 'video'
  const [cmEndMode, setCmEndMode] = useState('log'); // 'log' | 'duration'
  const [editingCmIndex, setEditingCmIndex] = useState(null);

  // --- Use App Handlers Hook ---
  const {
    autoPlayRequestedRef,
    handleSeekAndPlay,
    handleSaveProject,
    handleImport,
    handleSetCmStart,
    handleSetCmEnd,
    handleSetLogStart,
    handleAddNgId,
    handleAddNgComment,
  } = useAppHandlers({
    player,
    cmSystem,
    logSystem,
    resetPlayerState,
    togglePlay,
    handleSeek,
    handleCommentClick,
    requestPlay,
    resetDanmaku,
    skipSeconds,
    currentTime,
    logOnlyMode,
    setLogOnlyMode,
    setShowDanmaku,
    setShowSidebar: () => {}, // Not used in mobile
    videoStartTimeStr,
    setVideoStartTimeStr,
    dmSettings,
    aaOverrideMap,
    setAaOverrideMap,
    setShowExportModal,
    setShowUrlModal: () => {},
    setRequestedVideoName,
    setShowVideoRequestModal,
    projectFileHandle,
    setProjectFileHandle,
    projectName,
    setProjectName,
  });

  // --- Video Sync Effects ---
  useEffect(() => {
    const p = player.playerRef.current;
    if (!p) return;

    const shouldPlay = player.isPlaying && !cmSystem.isWaitingCm;

    if (player.videoSrc && player.videoSrc.startsWith('blob:')) {
      if (p.tagName === 'VIDEO') {
        if (shouldPlay) {
          p.play().catch((e) => console.error('Native play error:', e));
        } else {
          p.pause();
        }
      }
    } else if (typeof p.playVideo === 'function') {
      if (shouldPlay) {
        p.playVideo();
      } else {
        p.pauseVideo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isPlaying, player.videoSrc, cmSystem.isWaitingCm]);

  // Sync Volume/Mute
  useEffect(() => {
    const p = player.playerRef.current;
    if (!p) return;

    if (player.videoSrc && player.videoSrc.startsWith('blob:') && p.tagName === 'VIDEO') {
      p.volume = player.volume;
      p.muted = player.isMuted;
    } else if (typeof p.setVolume === 'function') {
      p.setVolume(player.volume * 100);
      if (player.isMuted) {
        p.mute();
      } else {
        p.unMute();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.volume, player.isMuted, player.videoSrc, player.isReady]);

  // Calculate progress percentage
  const totalDuration = cmSystem.getTotalDuration || 0;
  const progressPercent =
    totalDuration > 0 ? ((currentTime - cmSystem.timeOffset) / totalDuration) * 100 : 0;

  // Ref to track last seek time for throttling
  const lastSeekTimeRef = useRef(0);

  // Seekbar touch handler - matching desktop VideoControls pattern
  const handleSeekTouchStart = useCallback(
    (e) => {
      if (!seekContainerRef.current || totalDuration <= 0) return;

      setIsSeeking(true);
      handleSeekStart();

      const touch = e.touches[0];
      const rect = seekContainerRef.current.getBoundingClientRect();
      const startX = touch.clientX - rect.left;
      const startPct = Math.max(0, Math.min(1, startX / rect.width));
      const newTime = startPct * totalDuration;

      // Clamp thumbnail position (w-32 = 128px, half = 64px)
      const halfThumbWidth = 64;
      const clampedPos = Math.max(halfThumbWidth, Math.min(rect.width - halfThumbWidth, startX));

      // Show preview
      setSeekPreviewTime(newTime);
      setSeekPreviewPos(clampedPos);

      // Immediate seek
      handleSeek({ target: { value: newTime } });
      lastSeekTimeRef.current = performance.now();

      // Update preview video
      if (previewVideoRef.current && player.videoSrc) {
        const logTime = newTime + cmSystem.timeOffset;
        const videoTime = cmSystem.logTimeToVideoTime
          ? cmSystem.logTimeToVideoTime(logTime).videoTime
          : newTime;
        previewVideoRef.current.currentTime = videoTime;
      }

      const onTouchMove = (moveEvent) => {
        moveEvent.preventDefault();
        if (!seekContainerRef.current) return;

        const t = moveEvent.touches[0];
        const currentRect = seekContainerRef.current.getBoundingClientRect();
        const x = t.clientX - currentRect.left;
        const percentage = Math.max(0, Math.min(1, x / currentRect.width));
        const time = percentage * totalDuration;

        // Clamp thumbnail position so it stays within container
        // Thumbnail width: w-32 = 128px, half = 64px
        const halfThumbWidth = 64;
        const clampedPos = Math.max(
          halfThumbWidth,
          Math.min(currentRect.width - halfThumbWidth, x)
        );

        // Update preview
        setSeekPreviewTime(time);
        setSeekPreviewPos(clampedPos);

        // Update preview video
        if (previewVideoRef.current && player.videoSrc) {
          const logTime = time + cmSystem.timeOffset;
          const videoTime = cmSystem.logTimeToVideoTime
            ? cmSystem.logTimeToVideoTime(logTime).videoTime
            : time;
          if (Math.abs(previewVideoRef.current.currentTime - videoTime) > 0.5) {
            previewVideoRef.current.currentTime = videoTime;
          }
        }

        // Throttle seek updates (30ms)
        const now = performance.now();
        if (now - lastSeekTimeRef.current > 30) {
          handleSeek({ target: { value: time } });
          lastSeekTimeRef.current = now;
        }
      };

      const onTouchEnd = () => {
        setIsSeeking(false);
        setSeekPreviewTime(null);
        handleSeekEnd();
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    },
    [totalDuration, handleSeekStart, handleSeekEnd, handleSeek, cmSystem, player.videoSrc]
  );

  // Toggle controls overlay
  const toggleControlsOverlay = useCallback(() => {
    // Clear existing timeout
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    setShowControlsOverlay((prev) => !prev);
  }, []);

  // Reset overlay timeout on interaction
  const resetOverlayTimeout = useCallback(() => {
    // Only set timeout when playing and settings panel is closed
    if (showControlsOverlay && !showDanmakuSettings && player.isPlaying) {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      overlayTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false);
        setShowDanmakuSettings(false);
      }, 2500);
    }
  }, [showControlsOverlay, showDanmakuSettings, player.isPlaying]);

  // Dynamically manage auto-hide based on current state
  useEffect(() => {
    if (!showControlsOverlay) {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
      return;
    }

    if (player.isPlaying && !showDanmakuSettings) {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      overlayTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false);
        setShowDanmakuSettings(false);
      }, 2500);
    } else {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    }
  }, [showControlsOverlay, player.isPlaying, showDanmakuSettings]);

  // Show controls on video load
  useEffect(() => {
    if (player.videoSrc) {
      setShowControlsOverlay(true);
    }
  }, [player.videoSrc]);

  // Watch for fullscreen changes and manage orientation
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // When exiting fullscreen, lock back to portrait
      if (!isNowFullscreen && screen.orientation?.lock) {
        try {
          await screen.orientation.lock('portrait');
        } catch (e) {
          console.log('Portrait lock not supported:', e);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Lock to portrait on initial load
  useEffect(() => {
    const lockPortrait = async () => {
      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock('portrait');
        } catch (e) {
          console.log('Portrait lock not supported:', e);
        }
      }
    };
    lockPortrait();
  }, []);

  // Toggle fullscreen with landscape lock
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        // Try to lock orientation to landscape (skip if not supported)
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock('landscape');
          } catch (e) {
            console.log('Orientation lock not supported:', e);
          }
        }
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none">
      {/* Video Area */}
      {!logOnlyMode && (
        <div
          ref={containerRef}
          className={`relative shrink-0 bg-black ${isFullscreen ? 'h-screen' : ''}`}
          style={isFullscreen ? {} : { height: '45vh' }}
          onClick={(e) => {
            // Toggle overlay on video area tap (except when clicking buttons/inputs)
            const tag = e.target.tagName;
            if (
              tag !== 'BUTTON' &&
              tag !== 'INPUT' &&
              tag !== 'LABEL' &&
              !e.target.closest('button')
            ) {
              toggleControlsOverlay();
              // Also close settings if open
              if (showDanmakuSettings) setShowDanmakuSettings(false);
            }
          }}
        >
          {/* Top Controls - Left side (弾幕, ミュート, 設定) */}
          <div
            className={`absolute top-2 left-2 z-30 flex gap-1 transition-opacity ${
              showControlsOverlay || !player.videoSrc
                ? 'opacity-100 duration-150'
                : 'opacity-0 pointer-events-none duration-500'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDanmaku(!showDanmaku);
              }}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
                showDanmaku ? 'bg-blue-600/50 text-white' : 'bg-black/40 text-gray-400'
              }`}
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                player.toggleMute();
              }}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300"
            >
              {player.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const opening = !showDanmakuSettings;
                setShowDanmakuSettings(opening);
                // Clear timeout when opening settings panel
                if (opening && overlayTimeoutRef.current) {
                  clearTimeout(overlayTimeoutRef.current);
                  overlayTimeoutRef.current = null;
                }
              }}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
                showDanmakuSettings ? 'bg-blue-600/50 text-white' : 'bg-black/40 text-gray-300'
              }`}
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Top Controls - Right side (モード切替) */}
          <div
            className={`absolute top-2 right-2 z-30 transition-opacity ${
              showControlsOverlay || !player.videoSrc
                ? 'opacity-100 duration-150'
                : 'opacity-0 pointer-events-none duration-500'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLogOnlyMode(true);
                setActiveTab(null);
              }}
              className="p-2 rounded-lg backdrop-blur-sm bg-purple-600/50 text-white"
              title="ログ読みモード"
            >
              <BookOpen size={18} />
            </button>
          </div>

          {/* Danmaku Settings Popover - Visible when settings button is clicked */}
          {showControlsOverlay && showDanmakuSettings && (
            <div
              className="absolute top-14 left-2 z-40 w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-3 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                <span className="text-xs font-bold flex items-center gap-2">
                  <Settings size={12} /> 弾幕設定
                </span>
                <button
                  onClick={() => setShowDanmakuSettings(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Duration */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>表示時間</span>
                    <span className="font-mono text-white">{dmSettings?.duration ?? 5}秒</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="0.5"
                    value={dmSettings?.duration ?? 5}
                    onChange={(e) =>
                      setDmSettings((prev) => ({
                        ...prev,
                        duration: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                  />
                </div>

                {/* Font Size */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>文字サイズ</span>
                    <span className="font-mono text-white">{dmSettings?.fontSize ?? 20}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={dmSettings?.fontSize ?? 20}
                    onChange={(e) =>
                      setDmSettings((prev) => ({
                        ...prev,
                        fontSize: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>不透明度</span>
                    <span className="font-mono text-white">
                      {Math.round((dmSettings?.opacity ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={dmSettings?.opacity ?? 0.7}
                    onChange={(e) =>
                      setDmSettings((prev) => ({
                        ...prev,
                        opacity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                  />
                </div>

                {/* Area */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>表示範囲</span>
                    <span className="font-mono text-white">{dmSettings?.area ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={dmSettings?.area ?? 100}
                    onChange={(e) =>
                      setDmSettings((prev) => ({
                        ...prev,
                        area: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                  />
                </div>

                {/* Image Mode */}
                <div className="space-y-1 pt-2 border-t border-gray-700">
                  <span className="text-[10px] text-gray-400">画像表示</span>
                  <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded border border-gray-700">
                    {[
                      { id: 'none', label: 'なし' },
                      { id: 'image', label: '画像' },
                      { id: 'placeholder', label: 'マーカー' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() =>
                          setDmSettings((prev) => ({
                            ...prev,
                            imageMode: opt.id,
                          }))
                        }
                        className={`py-1 text-[10px] font-medium rounded transition-all ${
                          (dmSettings?.imageMode ?? 'none') === opt.id
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Project Controls - fade animation (top center-right, avoiding mode toggle) */}
          <div
            className={`absolute top-12 right-2 z-30 flex gap-1 transition-opacity ${
              showControlsOverlay || !player.videoSrc
                ? 'opacity-100 duration-150'
                : 'opacity-0 pointer-events-none duration-500'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveProject();
              }}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300"
              title="保存"
            >
              <Save size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportModal(true);
              }}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300"
              title="名前を付けて保存"
            >
              <FilePen size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImport();
              }}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300"
              title="プロジェクト読込"
            >
              <FileInput size={18} />
            </button>
            <label
              className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300 cursor-pointer"
              title="動画読込"
              onClick={(e) => e.stopPropagation()}
            >
              <FileVideo size={18} />
              <input
                type="file"
                accept="video/*"
                onChange={player.handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Time Display and Fullscreen Button - fade animation */}
          {player.videoSrc && (
            <div
              className={`absolute bottom-8 left-2 right-2 z-30 flex items-center justify-between transition-opacity ${
                showControlsOverlay
                  ? 'opacity-100 duration-150'
                  : 'opacity-0 pointer-events-none duration-500'
              }`}
            >
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                {formatTime(currentTime - cmSystem.timeOffset)} / {formatTime(totalDuration)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 rounded-lg backdrop-blur-sm bg-black/40 text-gray-300"
                title={isFullscreen ? '縮小' : '全画面'}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          )}

          {/* Center Play/Pause - fade animation */}
          {player.videoSrc && (
            <div
              className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity ${
                showControlsOverlay
                  ? 'opacity-100 duration-150'
                  : 'opacity-0 pointer-events-none duration-500'
              }`}
            >
              <button
                className="p-4 bg-black/50 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                  resetOverlayTimeout();
                }}
              >
                {player.isPlaying ? (
                  <Pause size={48} className="text-white" />
                ) : (
                  <Play size={48} className="text-white" />
                )}
              </button>
            </div>
          )}

          {/* Video Player */}
          <div className="w-full h-full flex items-center justify-center">
            {!player.videoSrc ? (
              <div className="text-gray-300 flex flex-col items-center gap-4 p-4">
                <Tv size={48} className="text-blue-500" />
                <p className="text-sm text-center text-gray-400">動画を読み込んでください</p>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2"
                >
                  <FileInput size={16} />
                  プロジェクト読込
                </button>
                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-sm flex items-center gap-2">
                  <FileVideo size={16} />
                  動画選択
                  <input
                    type="file"
                    accept="video/*"
                    onChange={player.handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : player.videoSrc.startsWith('blob:') ? (
              <video
                ref={player.playerRef}
                src={player.videoSrc}
                className="w-full h-full object-contain"
                onLoadedMetadata={(e) => {
                  const d = e.target.duration;
                  if (d) player.handleDuration(d);
                  e.target.volume = player.volume;
                  e.target.muted = player.isMuted;
                  player.setIsReady(true);
                  if (autoPlayRequestedRef.current) {
                    autoPlayRequestedRef.current = false;
                    requestPlay();
                  }
                }}
                onEnded={() => player.setPlayingState(false)}
                onPause={() => {
                  const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                  if (!isWaiting) {
                    player.setPlayingState(false);
                  }
                }}
                onPlay={() => player.setPlayingState(true)}
              />
            ) : (
              <YouTube
                videoId={
                  player.videoSrc.includes('v=')
                    ? player.videoSrc.split('v=')[1].split('&')[0]
                    : player.videoSrc
                }
                opts={{
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    autoplay: 0,
                    controls: 0,
                    fs: 0,
                    disablekb: 1,
                  },
                }}
                className="w-full h-full"
                onReady={(event) => {
                  player.setPlayerInstance(event.target);
                  const d = event.target.getDuration();
                  if (d) player.handleDuration(d);
                  player.setIsReady(true);
                  if (autoPlayRequestedRef.current) {
                    autoPlayRequestedRef.current = false;
                    requestPlay();
                  }
                }}
                onStateChange={(event) => {
                  if (event.data === 1 && !player.isPlaying) player.setPlayingState(true);
                  else if (event.data === 2) {
                    const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                    if (player.isPlaying && !isWaiting) player.setPlayingState(false);
                  } else if (event.data === 0) player.setPlayingState(false);
                }}
              />
            )}
          </div>

          {/* Danmaku Layer */}
          {showDanmaku && (
            <div className="absolute inset-0 pointer-events-none">
              <DanmakuLayer
                containerRef={danmakuContainerRef}
                activeDanmaku={activeDanmaku}
                settings={dmSettings}
                onAnimationEnd={handleAnimationEnd}
                aaMode={aaMode}
                aaOverrideMap={aaOverrideMap}
                onImageClick={(url) => setExpandedDanmakuImage(url)}
                isEnabled={dmSettings.enabled && showDanmaku}
                isPlaying={player.isPlaying}
                abeMode={dmSettings.abeMode}
              />
            </div>
          )}

          {/* Bottom Seekbar - Always at bottom edge */}
          {player.videoSrc && (
            <div
              ref={seekContainerRef}
              className="absolute bottom-0 left-0 right-0 h-6 touch-none flex items-end z-20"
              onTouchStart={(e) => {
                e.stopPropagation();
                handleSeekTouchStart(e);
                resetOverlayTimeout();
              }}
            >
              {/* Thumbnail Preview */}
              {isSeeking && seekPreviewTime !== null && (
                <div
                  className="absolute bottom-8 transform -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center"
                  style={{ left: `${seekPreviewPos}px` }}
                >
                  <video
                    ref={previewVideoRef}
                    src={player.videoSrc}
                    className="w-32 rounded shadow-xl border border-white/30 bg-black aspect-video"
                    muted
                    preload="auto"
                  />
                  <div className="text-xs font-mono mt-1 text-white bg-black/70 px-2 py-0.5 rounded">
                    {formatTime(seekPreviewTime)}
                  </div>
                </div>
              )}

              {/* Track - Expands in overlay mode */}
              <div
                className={`w-full ${
                  showControlsOverlay || isSeeking ? 'h-2' : 'h-1'
                } bg-gray-700/50 relative overflow-hidden transition-all duration-200`}
              >
                {/* CM Ranges - Unplayed (Yellow) */}
                {cmSystem.cmRanges &&
                  cmSystem.cmRanges.map((range, i) => {
                    const start = range.logStart - cmSystem.timeOffset;
                    const end = range.logEnd - cmSystem.timeOffset;
                    const duration = end - start;
                    const leftPct = totalDuration > 0 ? (start / totalDuration) * 100 : 0;
                    const widthPct = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
                    return (
                      <div
                        key={`cm-bg-${i}`}
                        className="absolute top-0 h-full bg-yellow-500/70"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                    );
                  })}

                {/* Progress Bar (Blue) */}
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500"
                  style={{
                    width: `${
                      isSeeking && seekPreviewTime !== null
                        ? (seekPreviewTime / totalDuration) * 100
                        : Math.min(progressPercent, 100)
                    }%`,
                  }}
                />

                {/* CM Ranges - Played (Green) */}
                {cmSystem.cmRanges &&
                  cmSystem.cmRanges.map((range, i) => {
                    const start = range.logStart - cmSystem.timeOffset;
                    const end = range.logEnd - cmSystem.timeOffset;
                    const logicalCurrent = currentTime - cmSystem.timeOffset;
                    const overlapEnd = Math.min(logicalCurrent, end);
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

                {/* Thumb - Visible only in overlay mode or while seeking */}
                {(showControlsOverlay || isSeeking) && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transform -translate-x-1/2"
                    style={{
                      left: `${
                        isSeeking && seekPreviewTime !== null
                          ? (seekPreviewTime / totalDuration) * 100
                          : progressPercent
                      }%`,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* CM Wait Overlay */}
          {cmSystem.isWaitingCm && (
            <CmWaitOverlay
              cmSystem={cmSystem}
              currentLogicalTime={currentTime}
              startTimeStr={logSystem.startTimeStr}
              handleCmSkip={handleCmSkip}
            />
          )}
        </div>
      )}

      {/* Log Only Mode Header */}
      {logOnlyMode && (
        <div className="shrink-0 bg-gray-900 p-2 flex items-center gap-2">
          <button
            onClick={() => setLogSidebarOpen(!logSidebarOpen)}
            className="p-2 bg-gray-800 rounded-lg text-gray-300"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm text-purple-400 font-bold flex-1">ログ読みモード</span>
          <button
            onClick={() => setLogOnlyMode(false)}
            className="p-2 rounded-lg bg-purple-600/50 text-white"
            title="動画モード"
          >
            <Tv size={18} />
          </button>
        </div>
      )}

      {/* Bottom Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
        {/* Tab Bar - Hidden in log only mode */}
        {!logOnlyMode && (
          <div className="shrink-0 flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab(activeTab === 'settings' ? null : 'settings')}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              設定
            </button>
            <div className="w-px self-stretch bg-gray-700" />
            <button
              onClick={() => setActiveTab(activeTab === 'ng' ? null : 'ng')}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                activeTab === 'ng'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              NG管理
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {!activeTab ? (
            logOnlyMode ? (
              <LogViewer
                comments={logSystem.comments}
                files={logSystem.loadedFiles}
                sidebarOpen={logSidebarOpen}
                activeCommentId={activeCommentId}
                currentLogicalTime={currentTime}
                timeOffset={cmSystem.timeOffset}
                onCommentClick={handleCommentClick}
                onSeekAndPlay={handleSeekAndPlay}
                aaOverrideMap={aaOverrideMap}
                onToggleAA={handleToggleAA}
                scrollToCommentId={scrollToCommentId}
                onScrollComplete={() => setScrollToCommentId(null)}
                onSetCmStart={handleSetCmStart}
                onSetCmEnd={handleSetCmEnd}
                onSetLogStart={handleSetLogStart}
                onAddNgId={handleAddNgId}
                onAddNgComment={handleAddNgComment}
                ngSettings={logSystem.ngSettings}
                removeNgId={logSystem.removeNgId}
                removeNgComment={logSystem.removeNgComment}
                allComments={logSystem.comments}
                formatTime={formatTime}
                totalDuration={cmSystem.getTotalDuration}
                scrollPositionsRef={logScrollPositionsRef}
                unlockAbeMode={unlockAbeMode}
              />
            ) : (
              <div className="h-full min-h-0 flex flex-col relative">
                <CommentList
                  comments={logSystem.visibleComments}
                  activeCommentId={activeCommentId}
                  currentLogicalTime={currentTime}
                  onCommentClick={handleCommentClick}
                  onSeekAndPlay={handleSeekAndPlay}
                  isAutoScroll={isAutoScroll}
                  setIsAutoScroll={setIsAutoScroll}
                  formatTime={formatTime}
                  aaOverrideMap={aaOverrideMap}
                  onToggleAA={handleToggleAA}
                  showImages={showImages}
                  timeOffset={cmSystem.timeOffset}
                  onSetCmStart={handleSetCmStart}
                  onSetCmEnd={handleSetCmEnd}
                  onSetLogStart={handleSetLogStart}
                  onAddNgId={handleAddNgId}
                  onAddNgComment={handleAddNgComment}
                  enableTreeView={enableTreeView}
                  debugId="mobile-bottom-panel"
                />
                {/* Floating Sync Button - visible in manual mode */}
                {!isAutoScroll && logSystem.visibleComments?.length > 0 && (
                  <button
                    onClick={handleSyncButton}
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg transition-all z-30 animate-bounce"
                    title="現在のコメントへ追従"
                  >
                    <ArrowDown size={20} />
                  </button>
                )}
              </div>
            )
          ) : activeTab === 'settings' ? (
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              {/* Log File Input */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase">ログ読み込み</h4>
                <label className="flex items-center justify-center gap-2 p-3 bg-gray-800 rounded-lg cursor-pointer">
                  <FileVideo size={16} className="text-blue-400" />
                  <span className="text-sm">ログファイルを選択</span>
                  <input
                    type="file"
                    accept=".txt,.dat,.json"
                    multiple
                    onChange={handleLogFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Loaded Files */}
              {logSystem.loadedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">読み込み済みログ</h4>
                    {logSystem.loadedFiles.length > 1 && (
                      <button
                        onClick={() => setShowFileReorderModal(true)}
                        className="text-xs text-blue-400 font-bold flex items-center gap-1 bg-blue-400/10 px-2 py-1 rounded"
                      >
                        <Edit2 size={12} />
                        順序を変更
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {logSystem.loadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="text-xs text-gray-400 bg-gray-800 p-2 rounded flex justify-between items-center"
                      >
                        <span className="break-all flex-1 pr-2">{file.title || file.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{file.rawComments.length}件</span>
                          <button
                            onClick={() => {
                              const newName = prompt('新しい名前を入力:', file.title || file.name);
                              if (newName && newName.trim()) {
                                logSystem.handleRenameFile(file.id, newName);
                              }
                            }}
                            className="text-gray-500 hover:text-blue-400 p-1"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => logSystem.handleRemoveFile(file.id)}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AA Mode Setting */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">AAモード</span>
                <div className="flex bg-gray-700 rounded p-0.5">
                  <button
                    onClick={() => setAaMode('auto')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      aaMode === 'auto'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setAaMode('off')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      aaMode === 'off'
                        ? 'bg-gray-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-700" />

              {/* Sync Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase">同期設定</h4>

                {/* Time Settings */}
                <div className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">ログ開始時間</span>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={logSystem.startDateStr}
                        onChange={(e) => logSystem.setStartDateStr(e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={logSystem.startTimeStr}
                        onChange={(e) => logSystem.setStartTimeStr(e.target.value)}
                        placeholder="00:00:00"
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">動画時間</span>
                    <input
                      type="text"
                      value={videoStartTimeStr}
                      onChange={(e) => setVideoStartTimeStr(e.target.value)}
                      placeholder="00:00"
                      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                    />
                  </div>
                </div>

                {/* Display Options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showThreadTitle}
                      onChange={(e) => setShowThreadTitle(e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    スレッドタイトルを表示
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTreeView}
                      onChange={(e) => setEnableTreeView(e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    アンカーをツリー表示
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showImages}
                      onChange={(e) => setShowImages(e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    画像URLをインライン表示
                  </label>
                  {showImages && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 ml-5">
                      <span>レイアウト:</span>
                      <button
                        onClick={() => setImageLayout('inline')}
                        className={`px-2 py-0.5 rounded text-xs ${
                          imageLayout === 'inline'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        インライン
                      </button>
                      <button
                        onClick={() => setImageLayout('grouped')}
                        className={`px-2 py-0.5 rounded text-xs ${
                          imageLayout === 'grouped'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        まとめて
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-700" />

              {/* CM Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase">CM区間設定</h4>

                {/* CM Input Form */}
                <div className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
                  {/* Start Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8 shrink-0">開始</span>
                    <select
                      value={cmStartMode}
                      onChange={(e) => setCmStartMode(e.target.value)}
                      className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600"
                    >
                      <option value="log">ログ時間</option>
                      <option value="video">動画時間</option>
                    </select>
                    <input
                      type="text"
                      value={cmStartInput}
                      onChange={(e) => setCmStartInput(e.target.value)}
                      placeholder={cmStartMode === 'log' ? '00:00:00' : '00:00'}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                    />
                  </div>

                  {/* End Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8 shrink-0">終了</span>
                    <select
                      value={cmEndMode}
                      onChange={(e) => setCmEndMode(e.target.value)}
                      className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600"
                    >
                      <option value="log">ログ時間</option>
                      <option value="duration">長さ</option>
                    </select>
                    <input
                      type="text"
                      value={cmEndInput}
                      onChange={(e) => setCmEndInput(e.target.value)}
                      placeholder={cmEndMode === 'log' ? '00:00:00' : '00:00'}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                    />
                  </div>

                  {/* Add/Update Buttons */}
                  {editingCmIndex !== null ? (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          cmSystem.updateCmRange(
                            editingCmIndex,
                            cmStartMode,
                            cmStartInput,
                            cmEndMode,
                            cmEndInput,
                            logSystem.startTimeStr
                          );
                          setEditingCmIndex(null);
                          setCmStartInput('');
                          setCmEndInput('');
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white p-2 rounded text-xs flex items-center justify-center gap-1"
                      >
                        更新
                      </button>
                      <button
                        onClick={() => {
                          setEditingCmIndex(null);
                          setCmStartInput('');
                          setCmEndInput('');
                        }}
                        className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded text-xs"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        cmSystem.addCmRangeSmart(
                          cmStartMode,
                          cmStartInput,
                          cmEndMode,
                          cmEndInput,
                          logSystem.startTimeStr
                        );
                        setCmStartInput('');
                        setCmEndInput('');
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded text-xs flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> 追加
                    </button>
                  )}
                </div>

                {/* CM Ranges List */}
                {cmSystem.cmRanges && cmSystem.cmRanges.length > 0 && (
                  <div className="space-y-1">
                    {cmSystem.cmRanges.map((range, i) => {
                      const accumulatedCmTime = cmSystem.cmRanges.slice(0, i).reduce((acc, r) => {
                        return acc + (r.logEnd - r.logStart);
                      }, 0);
                      const vStart = typeof range.videoStart === 'number' ? range.videoStart : 0;
                      const cmDuration = range.logEnd - range.logStart;
                      const logicalStart = vStart + accumulatedCmTime;
                      const logicalEnd = logicalStart + cmDuration;

                      return (
                        <div
                          key={i}
                          className={`flex flex-col bg-gray-800 p-2 rounded text-xs gap-1 ${
                            editingCmIndex === i
                              ? 'border border-blue-500'
                              : 'border border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">
                              ログ: {range.labelStart} ~ {range.labelEnd}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingCmIndex(i);
                                  setCmStartMode('log');
                                  setCmEndMode('log');
                                  setCmStartInput(range.labelStart || '');
                                  setCmEndInput(range.labelEnd || '');
                                }}
                                className="text-gray-400 hover:text-blue-400"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => cmSystem.removeCmRange(i)}
                                className="text-gray-400 hover:text-red-400"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <span className="font-mono text-blue-400 text-xs">
                            動画: {formatTime(logicalStart)} ~ {formatTime(logicalEnd)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* NG Management Tab */
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase">NG管理</h4>
                <p className="text-xs text-gray-500">
                  NGに設定したIDやコメントは弾幕とコメント欄に表示されなくなります。
                </p>
                <NgList
                  ngSettings={logSystem.ngSettings}
                  removeNgId={logSystem.removeNgId}
                  removeNgComment={logSystem.removeNgComment}
                  allComments={logSystem.comments}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Reorder Modal */}
      {showFileReorderModal && (
        <div className="fixed inset-0 z-60 bg-gray-950 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GripVertical size={20} className="text-blue-400" />
              順序を変更
            </h3>
            <button
              onClick={() => setShowFileReorderModal(false)}
              className="p-2 bg-gray-800 rounded-full text-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            ログの重なり順序を変更します。上が背面、下が前面に表示されます。
          </p>

          <DndContext
            sensors={fileDndSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (active.id !== over?.id) {
                const oldIndex = logSystem.loadedFiles.findIndex((f) => f.id === active.id);
                const newIndex = logSystem.loadedFiles.findIndex((f) => f.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                  logSystem.handleReorderFiles(oldIndex, newIndex);
                }
              }
            }}
          >
            <SortableContext
              items={logSystem.loadedFiles.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 pb-24">
                {logSystem.loadedFiles.map((file) => (
                  <MobileSortableFileRow
                    key={file.id}
                    file={file}
                    onRemove={() => logSystem.handleRemoveFile(file.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="fixed bottom-6 left-4 right-4">
            <button
              onClick={() => setShowFileReorderModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              完了
            </button>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedDanmakuImage && (
        <div
          className="fixed inset-0 z-9999 bg-black/90 flex items-center justify-center"
          onClick={() => setExpandedDanmakuImage(null)}
        >
          <img
            src={expandedDanmakuImage}
            alt="expanded"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}

      <VideoRequestModal
        isOpen={showVideoRequestModal}
        onClose={() => setShowVideoRequestModal(false)}
        requestedVideoName={requestedVideoName}
        onFileChange={player.handleFileChange}
      />

      {/* --- Abe Mode Unlock Celebration --- */}
      <AbeModeUnlockCelebration
        isVisible={showAbeUnlockCelebration}
        onClose={closeAbeUnlockCelebration}
      />
    </div>
  );
};

export default MobileApp;
