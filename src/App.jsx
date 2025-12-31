import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tv, Link, FileVideo, FileInput, FilePen, Save } from "lucide-react";
import YouTube from "react-youtube";
import { useDanmakuPlayer } from "./hooks/useDanmakuPlayer";
import { useAppHandlers } from "./hooks/useAppHandlers";
import { useIsMobile } from "./hooks/useMediaQuery";
import { formatTime } from "./utils/danmakuUtils";
import { initDebugLogger } from "./utils/debugLogger";
import DanmakuLayer from "./components/DanmakuLayer";
import Header from "./components/Header";
import VideoControls from "./components/VideoControls";
import Sidebar from "./components/Sidebar";
import UserHistoryModal from "./components/UserHistoryModal";
import CmWaitOverlay from "./components/CmWaitOverlay";
import LogViewer from "./components/LogViewer";
import ExportModal from "./components/modals/ExportModal";
import VideoRequestModal from "./components/modals/VideoRequestModal";
import UrlInputModal from "./components/modals/UrlInputModal";
import MobileApp from "./mobile/MobileApp";

// Initialize debug logger (Ctrl+Shift+D to download logs)
initDebugLogger();

// Desktop version of the app
const DesktopApp = () => {
  // Load UI Settings
  const [uiSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("danmaku_ui_settings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load UI settings", e);
    }
    return {
      showThreadTitle: true,
      enableTreeView: false,
      showImages: true,
      imageLayout: "inline", // 'inline' | 'grouped'
      aaMode: "auto", // 'auto' | 'off'
    };
  });

  const [enableTreeView, setEnableTreeView] = useState(
    uiSettings.enableTreeView
  );
  const [showThreadTitle, setShowThreadTitle] = useState(
    uiSettings.showThreadTitle
  );
  const [showImages, setShowImages] = useState(uiSettings.showImages);
  const [imageLayout, setImageLayout] = useState(
    uiSettings.imageLayout || "inline"
  );
  const [aaMode, setAaMode] = useState(uiSettings.aaMode || "auto");

  // State for expanded danmaku image modal
  const [expandedDanmakuImage, setExpandedDanmakuImage] = useState(null);

  // AA Override State (Shared between Sidebar and Overlay)
  const [aaOverrideMap, setAaOverrideMap] = useState({}); // { [commentId]: boolean }

  const handleToggleAA = useCallback((comment, isCurrentlyAA) => {
    setAaOverrideMap((prev) => {
      // Directly set to the opposite of current display state
      const next = !isCurrentlyAA;
      return { ...prev, [comment.id]: next };
    });
  }, []);

  // Save UI Settings Effect
  useEffect(() => {
    const newSettings = {
      showThreadTitle,
      enableTreeView,
      showImages,
      imageLayout,
      aaMode,
    };
    localStorage.setItem("danmaku_ui_settings", JSON.stringify(newSettings));
  }, [showThreadTitle, enableTreeView, showImages, imageLayout, aaMode]);

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
    setSkipSeconds,
    videoStartTimeStr,
    setVideoStartTimeStr,
    showControls,
    activeCommentId,
    progressBarRef,
    thumbRef,
    togglePlay,
    requestPlay,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    handleCmSkip,
    handleCommentClick,
    handleSyncButton,
    handleMouseMove,
    handleMouseLeave,
    handleLogFileChange,
    resetPlayerState,
    danmakuComments,
  } = useDanmakuPlayer(enableTreeView);

  const {
    activeDanmaku,
    danmakuContainerRef,
    handleAnimationEnd,
    resetDanmaku,
    syncLastProcessedTime,
  } = danmaku;
  // --- Local UI State (Purely View related) ---
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);
  // States moved up for persistence
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState("");
  const [showVideoRequestModal, setShowVideoRequestModal] = useState(false);
  const [requestedVideoName, setRequestedVideoName] = useState("");
  const [requestedVideoPath, setRequestedVideoPath] = useState("");
  const [isResizing, setIsResizing] = useState(false);

  // Project file state for overwrite save
  const [projectFileHandle, setProjectFileHandle] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [projectDirPath, setProjectDirPath] = useState(null);

  // View Mode State (replacing old 4-mode system)
  const [showDanmaku, setShowDanmaku] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [logOnlyMode, setLogOnlyMode] = useState(false);
  const [scrollToCommentId, setScrollToCommentId] = useState(null);

  // Scroll position storage for LogViewer (keyed by fileId: 'all' | file.id)
  const logScrollPositionsRef = useRef({});

  // Log viewer sidebar visibility state
  const [logSidebarOpen, setLogSidebarOpen] = useState(true);

  // Handler for truncation indicator click - jump to log mode and scroll to comment
  const handleTruncationIndicatorClick = useCallback(
    (rootId) => {
      // Find the root comment from danmakuComments to get its time
      const rootComment = danmakuComments?.find((c) => c.id === rootId);
      if (rootComment) {
        // Switch to log-only mode
        setLogOnlyMode(true);
        // Set scroll target
        setScrollToCommentId(rootId);
        // Jump to that time
        handleCommentClick(rootComment.time);
      }
    },
    [danmakuComments, handleCommentClick]
  );

  // Video URL Input State
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);

  // User History Modal State
  const [userHistoryId, setUserHistoryId] = useState(null);
  // Unused vars removed: showSidebar, zoomedImage

  const containerRef = useRef(null);

  // --- Use App Handlers Hook ---
  const {
    autoPlayRequestedRef,
    handleVideoUrlSubmit: handleVideoUrlSubmitFromHook,
    handleSeekAndPlay,
    createKeyDownHandler,
    getProjectData,
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
    setShowSidebar,
    videoStartTimeStr,
    setVideoStartTimeStr,
    dmSettings,
    aaOverrideMap,
    setAaOverrideMap,
    setShowExportModal,
    setShowUrlModal,
    setRequestedVideoName,
    setShowVideoRequestModal,
    projectFileHandle,
    setProjectFileHandle,
    projectName,
    setProjectName,
    setProjectDirPath,
    setRequestedVideoPath,
  });

  // Wrapper for handleVideoUrlSubmit to pass videoUrlInput
  const handleVideoUrlSubmit = (e) =>
    handleVideoUrlSubmitFromHook(e, videoUrlInput);

  // Handle Extension Import (URL Params & Messages)
  useEffect(() => {
    // 1. Initial Load via URL Params
    const params = new URLSearchParams(window.location.search);
    const importUrl = params.get("import");
    if (importUrl) {
      logSystem
        .handleUrlLoad(importUrl)
        .catch((err) => console.error("Auto-import failed:", err));
      window.history.replaceState({}, "", window.location.pathname);
    }

    // 2. Listen for Messages from Content Script (Tab Reuse)
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (
        event.data &&
        event.data.type === "DANMAKU_IMPORT" &&
        event.data.url
      ) {
        console.log("Received import message:", event.data.url);
        logSystem
          .handleUrlLoad(event.data.url)
          .catch((err) => alert("Import failed: " + err.message));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [logSystem]);

  // --- Resize Logic ---
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);
  const resize = useCallback(
    (e) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 350 && newWidth < window.innerWidth * 0.5)
          setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- Native Video Sync Effects ---
  // Sync Play/Pause
  // Sync Play/Pause
  // Sync Play/Pause
  // Sync Play/Pause
  useEffect(() => {
    const p = player.playerRef.current;

    // console.log("SyncEffect: isPlaying=", player.isPlaying, "Src=", player.videoSrc, "Ref=", p);

    if (!p) return;

    const shouldPlay = player.isPlaying && !cmSystem.isWaitingCm;

    if (player.videoSrc && player.videoSrc.startsWith("blob:")) {
      // Native check
      if (p.tagName === "VIDEO") {
        if (shouldPlay) {
          p.play().catch((e) => console.error("Native play error:", e));
        } else {
          p.pause();
        }
      } else {
        // console.warn("SyncEffect: videoSrc covers blob, but Ref is not VIDEO tag. It is:", p.tagName || p);
      }
    } else if (typeof p.playVideo === "function") {
      // YouTube API
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

    if (
      player.videoSrc &&
      player.videoSrc.startsWith("blob:") &&
      p.tagName === "VIDEO"
    ) {
      // Native
      p.volume = player.volume;
      p.muted = player.isMuted;
    } else if (typeof p.setVolume === "function") {
      // YouTube (0-100)
      p.setVolume(player.volume * 100);
      if (player.isMuted) {
        p.mute();
      } else {
        p.unMute();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.volume, player.isMuted, player.videoSrc, player.isReady]); // Re-run when ready

  // --- Log Only Mode: Pause Video and preserve danmaku state ---
  const logModeEntryTimeRef = useRef(null);
  const prevLogOnlyModeRef = useRef(logOnlyMode);

  useEffect(() => {
    const wasLogMode = prevLogOnlyModeRef.current;
    const isLogMode = logOnlyMode;

    if (!wasLogMode && isLogMode) {
      // Entering log mode: save current time and pause video
      logModeEntryTimeRef.current = currentTime;
      if (player.isPlaying) {
        togglePlay();
      }
      // Sync danmaku time to prevent new comments when we exit
      syncLastProcessedTime(currentTime);
    } else if (wasLogMode && !isLogMode) {
      // Exiting log mode (not via "Move to this time" which resets danmaku)
      // Sync to the time we entered log mode
      if (logModeEntryTimeRef.current !== null) {
        syncLastProcessedTime(logModeEntryTimeRef.current);
      }
    }

    prevLogOnlyModeRef.current = isLogMode;
  }, [
    logOnlyMode,
    currentTime,
    player.isPlaying,
    togglePlay,
    syncLastProcessedTime,
  ]);

  // --- Keyboard Shortcuts (using handler from useAppHandlers) ---
  useEffect(() => {
    const handleKeyDown = createKeyDownHandler(handleSaveProject);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createKeyDownHandler, handleSaveProject]);

  // Unused handlers removed: handlePlayVideo, handleLoadLog

  // --- Helpers for LogViewer/Sidebar (that were previously local to Sidebar) ---

  // Calculate activeThreadTitle for LogView header
  const activeThreadTitle = React.useMemo(() => {
    const comments = logSystem.visibleComments;
    const loadedFiles = logSystem.loadedFiles;
    if (
      !loadedFiles ||
      loadedFiles.length === 0 ||
      !comments ||
      comments.length === 0
    )
      return null;

    let targetComment = null;
    if (activeCommentId) {
      targetComment = comments.find((c) => c.id === activeCommentId);
    }

    if (!targetComment) {
      // Binary search for closest previous comment
      let low = 0;
      let high = comments.length - 1;
      let idx = -1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (comments[mid].time <= currentTime) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      if (idx !== -1) targetComment = comments[idx];
    }

    return targetComment ? targetComment.threadTitle || null : null;
  }, [
    logSystem.visibleComments,
    logSystem.loadedFiles,
    activeCommentId,
    currentTime,
  ]);

  return (
    <div className="flex flex-col h-screen text-white bg-black overflow-hidden select-none">
      {/* Header - Full Width */}
      <Header
        showDanmaku={showDanmaku}
        setShowDanmaku={setShowDanmaku}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        logOnlyMode={logOnlyMode}
        setLogOnlyMode={setLogOnlyMode}
        handleFileChange={player.handleFileChange}
        onSave={handleSaveProject}
        onSaveAs={() => setShowExportModal(true)}
        onImport={handleImport}
        projectName={projectName}
        onOpenUrlModal={() => setShowUrlModal(true)}
      />

      {/* Content Area - Video/LogViewer + Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* --- Main Content (Video) --- */}
            <div
              ref={containerRef}
              className="flex-1 flex flex-col min-w-0 relative group"
              style={{
                visibility: logOnlyMode ? "hidden" : "visible",
                position: logOnlyMode ? "absolute" : "relative",
                pointerEvents: logOnlyMode ? "none" : "auto",
                width: logOnlyMode ? 0 : "auto",
                height: logOnlyMode ? 0 : "auto",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* --- Video Layer --- */}
              <div
                className="flex-1 relative bg-black flex items-center justify-center overflow-hidden cursor-pointer"
                ref={containerRef}
                onClick={togglePlay}
              >
                {/* Video Area */}
                {/* Video Area */}
                {/* Video Area */}
                {console.log("App Render: videoSrc =", player.videoSrc)}
                {!player.videoSrc ? (
                  <div className="text-gray-500 flex flex-col items-center justify-center h-full space-y-8 p-8">
                    {/* App Logo & Name */}
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <div className="p-6 bg-gray-800/50 rounded-2xl border border-gray-700 shadow-2xl">
                        <Tv size={64} className="text-blue-500" />
                      </div>
                      <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        DanmakuPlayer
                      </h1>
                      <p className="text-gray-400">
                        動画ファイルを読み込んでコメントを楽しもう
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-4 w-full max-w-md">
                      {/* File Upload */}
                      <label className="flex items-center justify-center gap-3 w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-xl cursor-pointer transition-all group">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={player.handleFileChange}
                          className="hidden"
                        />
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                          <FileVideo size={24} className="text-blue-400" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-gray-200 group-hover:text-white">
                            動画ファイルを選択
                          </span>
                          <span className="text-xs text-gray-500">
                            MP4, WebM, Ogg 対応
                          </span>
                        </div>
                      </label>

                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-800"></div>
                        <span className="text-xs text-gray-600 font-bold">
                          OR
                        </span>
                        <div className="h-px flex-1 bg-gray-800"></div>
                      </div>

                      {/* URL Input */}
                      <form
                        onSubmit={handleVideoUrlSubmit}
                        className="relative group"
                      >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Link
                            size={16}
                            className="text-gray-500 group-focus-within:text-blue-500 transition-colors"
                          />
                        </div>
                        <input
                          type="text"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="動画のURLを入力 (https://...)"
                          className="w-full bg-gray-900/50 border border-gray-700 focus:border-blue-500 rounded-xl py-3 pl-10 pr-12 text-sm text-white placeholder-gray-600 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!videoUrlInput}
                          className="absolute inset-y-1 right-1 px-3 bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Link size={16} />
                        </button>
                      </form>

                      {/* Project Actions */}
                      <div className="flex flex-col gap-2 mt-4">
                        {/* Overwrite Save - only show if project is loaded */}
                        {projectFileHandle && (
                          <button
                            onClick={handleSaveProject}
                            className="flex items-center justify-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all group"
                          >
                            <Save
                              size={18}
                              className="text-blue-400 group-hover:text-blue-300"
                            />
                            <span className="text-sm text-blue-400 group-hover:text-blue-300 font-medium">
                              上書き保存 {projectName && `(${projectName})`}
                            </span>
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowExportModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl cursor-pointer transition-all group"
                          >
                            <FilePen
                              size={18}
                              className="text-gray-400 group-hover:text-white"
                            />
                            <span className="text-sm text-gray-400 group-hover:text-white font-medium">
                              名前をつけて保存
                            </span>
                          </button>
                          <button
                            onClick={handleImport}
                            className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl cursor-pointer transition-all group"
                          >
                            <FileInput
                              size={18}
                              className="text-gray-400 group-hover:text-white shrink-0"
                            />
                            <span className="text-sm text-gray-400 group-hover:text-white font-medium whitespace-nowrap">
                              プロジェクトを読み込む
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : player.videoSrc.startsWith("blob:") ? (
                  /* Native Video for Local Files */
                  <video
                    ref={player.playerRef}
                    src={player.videoSrc}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                    onLoadStart={() => console.log("NativeVideo: onLoadStart")}
                    onLoadedData={() =>
                      console.log("NativeVideo: onLoadedData")
                    }
                    onCanPlay={() => {
                      console.log("NativeVideo: onCanPlay");
                      // Backup ready trigger
                      if (!player.isReady) {
                        console.log(
                          "NativeVideo: Setting isReady=true via onCanPlay"
                        );
                        player.setIsReady(true);
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      console.log("NativeVideo: onLoadedMetadata");
                      const d = e.target.duration;
                      if (d) player.handleDuration(d);
                      // Sync volume initially
                      e.target.volume = player.volume;
                      e.target.muted = player.isMuted;

                      // Native Ready
                      console.log(
                        "NativeVideo: Setting isReady=true via onLoadedMetadata"
                      );
                      player.setIsReady(true);

                      // Native AutoPlay logic
                      if (autoPlayRequestedRef.current) {
                        console.log("NativeVideo: Handling deferred AutoPlay");
                        autoPlayRequestedRef.current = false;
                        requestPlay();
                      }
                    }}
                    onEnded={() => player.setPlayingState(false)}
                    onPause={() => {
                      console.log("NativeVideo: onPause triggered");
                      const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                      // Use Ref to check immediately if we are waiting for CM
                      // State might be slightly delayed during seek
                      if (!isWaiting) {
                        player.setPlayingState(false);
                      }
                    }}
                    onPlay={() => player.setPlayingState(true)}
                    onError={(e) =>
                      console.error("NativeVideo: onError", e.nativeEvent)
                    }
                  />
                ) : (
                  /* YouTube Player */
                  <div className="w-full h-full relative pointer-events-auto">
                    <YouTube
                      videoId={
                        player.videoSrc.includes("v=")
                          ? player.videoSrc.split("v=")[1].split("&")[0]
                          : player.videoSrc
                      } // Extract ID roughly or let library handle if valid? Library wants ID usually.
                      // Actually react-youtube takes a videoId prop, OR opts.
                      // Wait, react-youtube requires valid videoID, not full URL.
                      // I need to parse the ID.
                      opts={{
                        height: "100%",
                        width: "100%",
                        playerVars: {
                          autoplay: 0, // Manual control via isReady/isPlaying
                          controls: 0, // Hide native controls
                          origin: window.location.origin,
                          fs: 0, // Prevent fullscreen takeover if preferred, or allow
                          disablekb: 1, // Let app handle keys
                          iv_load_policy: 3,
                          rel: 0,
                        },
                      }}
                      className="w-full h-full"
                      onReady={(event) => {
                        console.log("YouTube Player: onReady");
                        // Store the player instance (event.target) in the ref
                        player.setPlayerInstance(event.target);

                        // Fix Duration handling for YouTube API
                        const d = event.target.getDuration();
                        if (d) player.handleDuration(d);

                        player.setIsReady(true);

                        if (autoPlayRequestedRef.current) {
                          console.log("YouTube: Handling deferred AutoPlay");
                          autoPlayRequestedRef.current = false;
                          requestPlay();
                        }
                      }}
                      onStateChange={(event) => {
                        // event.data: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                        console.log("YouTube State Change:", event.data);
                        if (event.data === 1) {
                          // Playing
                          // If app thinks it's paused, sync?
                          // But we control playback mostly.
                          // If user uses YouTube controls, we need to sync app state.
                          if (!player.isPlaying) player.setPlayingState(true);
                        } else if (event.data === 2) {
                          // Paused
                          const isWaiting =
                            cmSystem.cmStateRef.current.isWaiting;
                          console.log(
                            `[App] YouTube Paused. isPlaying:${player.isPlaying} isWaitingRef:${isWaiting}`
                          );
                          // Use Ref for immediate check
                          if (player.isPlaying && !isWaiting) {
                            player.setPlayingState(false);
                          } else if (isWaiting) {
                            console.log(
                              "[App] Ignored Pause because isWaiting is true"
                            );
                          }
                        } else if (event.data === 0) {
                          // Ended
                          player.setPlayingState(false);
                        }
                      }}
                      onError={(e) => {
                        console.error("YouTube Error:", e);
                        alert("YouTube Error: " + e.data);
                      }}
                    />
                  </div>
                )}

                {/* Danmaku Layer - always render, hide with CSS to preserve animation state */}
                <div
                  style={{
                    visibility:
                      !logOnlyMode && showDanmaku ? "visible" : "hidden",
                    pointerEvents:
                      !logOnlyMode && showDanmaku ? "auto" : "none",
                  }}
                >
                  <DanmakuLayer
                    containerRef={danmakuContainerRef}
                    activeDanmaku={activeDanmaku}
                    settings={dmSettings}
                    onAnimationEnd={handleAnimationEnd}
                    aaMode={aaMode}
                    aaOverrideMap={aaOverrideMap}
                    onImageClick={(url) => setExpandedDanmakuImage(url)}
                    onTruncationClick={handleTruncationIndicatorClick}
                    isEnabled={
                      dmSettings.enabled && showDanmaku && !logOnlyMode
                    }
                    isPlaying={player.isPlaying}
                  />
                </div>

                {/* Expanded Danmaku Image Modal */}
                {expandedDanmakuImage && (
                  <div
                    className="fixed inset-0 z-9999 bg-black/90 flex items-center justify-center cursor-pointer animate-fade-in"
                    onClick={() => setExpandedDanmakuImage(null)}
                  >
                    <img
                      src={expandedDanmakuImage}
                      alt="expanded"
                      className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl"
                      onClick={() => setExpandedDanmakuImage(null)}
                    >
                      ×
                    </button>
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

                {!logOnlyMode && (
                  <VideoControls
                    visible={showControls}
                    isPlaying={player.isPlaying}
                    togglePlay={togglePlay}
                    currentTime={currentTime - cmSystem.timeOffset}
                    totalDuration={cmSystem.getTotalDuration} // Use Total Duration (Video + CM)
                    handleSeek={handleSeek}
                    // onSync={handleSyncButton} // VideoControls doesn't support generic onSync yet, irrelevant
                    handleSeekStart={handleSeekStart}
                    handleSeekEnd={handleSeekEnd}
                    volume={player.volume}
                    onVolumeChange={player.handleVolumeChange}
                    isMuted={player.isMuted}
                    toggleMute={player.toggleMute}
                    dmSettings={dmSettings}
                    setDmSettings={setDmSettings}
                    // ... other props if any were missed in previous view (logTimeToVideoTime was added recently in another task?)
                    // Wait, I saw logTimeToVideoTime in VideoControls props definition but not in App usage in previous view.
                    // Let's check if logTimeToVideoTime is available in App.jsx scope.
                    // cmSystem usually has logTimeToVideoTime.
                    logTimeToVideoTime={cmSystem.logTimeToVideoTime}
                    progressBarRef={progressBarRef}
                    thumbRef={thumbRef}
                    skipSeconds={skipSeconds}
                    setSkipSeconds={setSkipSeconds}
                    showExportModal={showExportModal}
                    setShowExportModal={setShowExportModal}
                    exportFileName={exportFileName}
                    setExportFileName={setExportFileName}
                    showVideoRequestModal={showVideoRequestModal}
                    setShowVideoRequestModal={setShowVideoRequestModal}
                    requestedVideoName={requestedVideoName}
                    setRequestedVideoName={setRequestedVideoName}
                    videoRef={player.videoRef}
                    cmRanges={cmSystem.cmRanges}
                    videoSrc={player.videoSrc}
                    timeOffset={cmSystem.timeOffset}
                    showDanmaku={showDanmaku}
                    setShowDanmaku={setShowDanmaku}
                    containerRef={containerRef}
                  />
                )}
              </div>
            </div>

            {logOnlyMode && (
              <LogViewer
                comments={logSystem.comments} // Pass ALL comments
                files={logSystem.loadedFiles} // Pass loaded files list
                activeCommentId={activeCommentId}
                activeThreadTitle={activeThreadTitle}
                currentLogicalTime={currentTime}
                timeOffset={cmSystem.timeOffset}
                onCommentClick={handleCommentClick}
                onSeekAndPlay={handleSeekAndPlay}
                aaOverrideMap={aaOverrideMap}
                onToggleAA={handleToggleAA}
                scrollToCommentId={scrollToCommentId}
                onScrollComplete={() => setScrollToCommentId(null)}
                // onIdClick removed to allow LogViewer to handle ID clicking internally with its own modal
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
                sidebarOpen={logSidebarOpen}
                onToggleSidebar={() => setLogSidebarOpen(!logSidebarOpen)}
              />
            )}
          </div>
        </div>

        {/* --- Resizer --- */}
        {showSidebar && !logOnlyMode && (
          <div
            className="w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors z-50"
            onMouseDown={startResizing}
          />
        )}

        {showExportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-96">
              <h3 className="text-lg font-bold text-white mb-4">
                設定をエクスポート
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    ファイル名
                  </label>
                  <input
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    placeholder="project_settings"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-blue-500 outline-none"
                  />
                  {/* Filename Suggestions */}
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      名前の候補:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {/* 1. Date/Time */}
                      <button
                        onClick={() => {
                          const now = new Date();
                          const str = `${now.getFullYear()} -${String(
                            now.getMonth() + 1
                          ).padStart(2, "0")} -${String(now.getDate()).padStart(
                            2,
                            "0"
                          )}_${String(now.getHours()).padStart(
                            2,
                            "0"
                          )} -${String(now.getMinutes()).padStart(2, "0")} `;
                          setExportFileName(str);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                      >
                        日時
                      </button>

                      {/* 2. Video Name */}
                      {player.videoFileName && (
                        <button
                          onClick={() => {
                            const name = player.videoFileName.replace(
                              /\.[^/.]+$/,
                              ""
                            ); // Remove extension
                            setExportFileName(name);
                          }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                          title={player.videoFileName}
                        >
                          動画名
                        </button>
                      )}

                      {/* 3. Thread Title */}
                      {logSystem.loadedFiles.length > 0 &&
                        (logSystem.loadedFiles[0].title ||
                          logSystem.loadedFiles[0].name) && (
                          <button
                            onClick={() => {
                              let title =
                                logSystem.loadedFiles[0].title ||
                                logSystem.loadedFiles[0].name;
                              // Sanitize
                              title = title
                                .replace(/[\\/:*?"<>|]/g, "_")
                                .substring(0, 50);
                              setExportFileName(title);
                            }}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                            title={
                              logSystem.loadedFiles[0].title ||
                              logSystem.loadedFiles[0].name
                            }
                          >
                            スレッド名
                          </button>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const data = getProjectData();

                        const jsonString = JSON.stringify(data, null, 2);
                        const fileName = `${
                          exportFileName || "project_settings"
                        }.json`;

                        // 1. Try File System Access API (Modern Browsers)
                        if ("showSaveFilePicker" in window) {
                          try {
                            const handle = await window.showSaveFilePicker({
                              suggestedName: fileName,
                              types: [
                                {
                                  description: "Danmaku Project JSON",
                                  accept: { "application/json": [".json"] },
                                },
                              ],
                            });
                            const writable = await handle.createWritable();
                            await writable.write(jsonString);
                            await writable.close();

                            // Save handle for overwrite save
                            setProjectFileHandle(handle);
                            setProjectName(
                              exportFileName || "project_settings"
                            );

                            setShowExportModal(false);
                            return; // Success
                          } catch (err) {
                            if (err.name === "AbortError") return; // User cancelled
                            console.warn(
                              "File System Access API failed, falling back...",
                              err
                            );
                            // Fallback continues below
                          }
                        }

                        // 2. Fallback: Classic Download
                        const blob = new Blob([jsonString], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);

                        const link = document.createElement("a");
                        link.href = url;
                        link.download = fileName;
                        link.style.display = "none";
                        document.body.appendChild(link);

                        link.click();

                        // Longer timeout for cleanup
                        setTimeout(() => {
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }, 2000);

                        setShowExportModal(false);
                      } catch (err) {
                        console.error("Export failed:", err);
                        alert("エクスポートに失敗しました: " + err.message);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                  >
                    エクスポート
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <VideoRequestModal
          isOpen={showVideoRequestModal}
          onClose={() => setShowVideoRequestModal(false)}
          requestedVideoName={requestedVideoName}
          requestedVideoPath={requestedVideoPath}
          onFileChange={player.handleFileChange}
          onLoadVideoFromFile={player.loadVideoFromFile}
          projectDirPath={projectDirPath}
        />

        {/* --- Sidebar --- */}
        {/* --- Log Viewer (Full Screen) --- */}

        {/* --- Sidebar (Right) --- */}
        {/* Show Sidebar when showSidebar is true and not in logOnlyMode */}
        {showSidebar && !logOnlyMode && (
          <Sidebar
            sidebarWidth={sidebarWidth}
            showSettingsPanel={showSettingsPanel}
            setShowSettingsPanel={setShowSettingsPanel}
            urlInput={logSystem.urlInput}
            setUrlInput={logSystem.setUrlInput}
            handleUrlSubmit={logSystem.handleUrlLoad}
            handleFileChange={player.handleFileChange}
            handleLogFileChange={handleLogFileChange}
            handleUrlLoad={logSystem.handleUrlLoad}
            startTimeStr={logSystem.startTimeStr}
            setStartTimeStr={logSystem.setStartTimeStr}
            videoStartTimeStr={videoStartTimeStr}
            setVideoStartTimeStr={setVideoStartTimeStr}
            totalDuration={cmSystem.getTotalDuration} // Use Total Duration (Video + CM)
            cmStartInput={cmSystem.cmStartInput}
            setCmStartInput={cmSystem.setCmStartInput}
            cmEndInput={cmSystem.cmEndInput}
            setCmEndInput={cmSystem.setCmEndInput}
            addCmRange={cmSystem.addCmRange}
            addCmRangeSmart={cmSystem.addCmRangeSmart}
            updateCmRange={cmSystem.updateCmRange}
            cmRanges={cmSystem.cmRanges}
            removeCmRange={cmSystem.removeCmRange}
            comments={logSystem.visibleComments}
            allComments={logSystem.comments}
            activeCommentId={activeCommentId}
            currentLogicalTime={currentTime}
            handleCommentClick={handleCommentClick}
            onCommentClick={handleCommentClick}
            onSeekAndPlay={handleSeekAndPlay}
            isAutoScroll={isAutoScroll}
            setIsAutoScroll={setIsAutoScroll}
            handleSyncButton={handleSyncButton}
            dmSettings={dmSettings}
            setDmSettings={setDmSettings}
            showThreadTitle={showThreadTitle}
            setShowThreadTitle={setShowThreadTitle}
            enableTreeView={enableTreeView}
            setEnableTreeView={setEnableTreeView}
            showImages={showImages}
            setShowImages={setShowImages}
            imageLayout={imageLayout}
            setImageLayout={setImageLayout}
            aaMode={aaMode}
            setAaMode={setAaMode}
            loadedFiles={logSystem.loadedFiles}
            handleToggleFileVisibility={logSystem.handleToggleFileVisibility}
            handleRemoveFile={logSystem.handleRemoveFile}
            danmakuContainerRef={danmakuContainerRef}
            handleReorderFiles={logSystem.handleReorderFiles}
            formatTime={formatTime}
            skipSeconds={skipSeconds}
            setSkipSeconds={setSkipSeconds}
            timeOffset={cmSystem.timeOffset}
            onAddNgId={logSystem.addNgId}
            onAddNgComment={logSystem.addNgComment}
            removeNgId={logSystem.removeNgId}
            removeNgComment={logSystem.removeNgComment}
            ngSettings={logSystem.ngSettings}
            onIdClick={setUserHistoryId}
            userHistoryId={userHistoryId}
            onCloseUserHistory={() => setUserHistoryId(null)}
            aaOverrideMap={aaOverrideMap}
            onToggleAA={handleToggleAA}
          />
        )}
        {/* --- URL Input Modal --- */}
        <UrlInputModal
          isOpen={showUrlModal}
          onClose={() => setShowUrlModal(false)}
          videoUrlInput={videoUrlInput}
          setVideoUrlInput={setVideoUrlInput}
          onSubmit={handleVideoUrlSubmit}
        />
      </div>
    </div>
  );
};

// Main App component - routes between Desktop and Mobile
const App = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default App;
