import { FileInput, FilePen, FileVideo, Link, Save, Tv } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';

import logo from '../assets/logo.png';
import CmWaitOverlay from '../components/CmWaitOverlay';
import DanmakuLayer from '../components/DanmakuLayer';
import Header from '../components/Header';
import HLSVideo from '../components/HLSVideo';
import LogViewer from '../components/LogViewer';
import ConfirmModal from '../components/modals/ConfirmModal';
import ExportModal from '../components/modals/ExportModal';
import HelpModal from '../components/modals/HelpModal';
import UrlInputModal from '../components/modals/UrlInputModal';
import VideoRequestModal from '../components/modals/VideoRequestModal';
import Sidebar from '../components/Sidebar';
import AbeModeUnlockCelebration from '../components/ui/AbeModeUnlockCelebration';
import UserHistoryModal from '../components/UserHistoryModal';
import VideoControls from '../components/VideoControls';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useDanmakuPlayer } from '../hooks/useDanmakuPlayer';
import { useExtensionSync } from '../hooks/useExtensionSync';
import { useFileImporter } from '../hooks/useFileImporter';
import { useUrlInputHandler } from '../hooks/useUrlInputHandler';
import { checkAbeUnlockCondition } from '../utils/abeMode';
import { formatTime } from '../utils/danmakuUtils';
import { initDebugLogger } from '../utils/debugLogger';
import DesktopLayout from './layout/DesktopLayout';
// import { isHlsUrl } from "./utils/hlsUtils"; // Removed unused

// Initialize debug logger (Ctrl+Shift+D to download logs)
initDebugLogger();

// Desktop version of the app
const DesktopApp = () => {
  // Load UI Settings
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
      imageLayout: 'inline', // 'inline' | 'grouped'
      aaMode: 'auto', // 'auto' | 'off'
    };
  });

  const [enableTreeView, setEnableTreeView] = useState(uiSettings.enableTreeView);
  const [showThreadTitle, setShowThreadTitle] = useState(uiSettings.showThreadTitle);
  const [showImages, setShowImages] = useState(uiSettings.showImages);

  const [aaMode, setAaMode] = useState(uiSettings.aaMode || 'auto');

  // Global Zoomed Image State
  const [zoomedImage, setZoomedImage] = useState(null);

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
      aaMode,
    };
    localStorage.setItem('danmaku_ui_settings', JSON.stringify(newSettings));
  }, [showThreadTitle, enableTreeView, showImages, aaMode]);

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
    handleScrub, // Optimized scrub handler
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
    abeModeUnlocked,
    unlockAbeMode,
    // End Card
    endCardSettings,
    setEndCardSettings,
    showEndCard,
    setShowEndCard,
    showAbeUnlockCelebration,
    closeAbeUnlockCelebration,
  } = useDanmakuPlayer(enableTreeView, aaOverrideMap);

  const { danmakuContainerRef, resetDanmaku, syncLastProcessedTime } = danmaku;
  // --- Local UI State (Purely View related) ---
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);
  // States moved up for persistence
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [showVideoRequestModal, setShowVideoRequestModal] = useState(false);
  const [requestedVideoName, setRequestedVideoName] = useState('');
  const [requestedVideoPath, setRequestedVideoPath] = useState('');
  const [isResizing, setIsResizing] = useState(false);

  // End Card Settings Modal State
  const [showEndCardSettingsModal, setShowEndCardSettingsModal] = useState(false);

  const handleEndCardReplay = useCallback(() => {
    setShowEndCard(false);
    player.seekTo(0);
    // Use timeout to ensure state update propagates before playing (optional but safer)
    setTimeout(() => {
      requestPlay();
    }, 100);
  }, [player, requestPlay, setShowEndCard]);

  // Confirm Modal State
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'info',
  });

  const closeConfirmModal = useCallback(() => {
    setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

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

  // Handler for truncation indicator click - jump to log mode and scroll to comment
  const handleTruncationIndicatorClick = useCallback(
    (rootId) => {
      // Find the root comment from danmakuComments to get its time
      const rootComment = danmakuComments?.find((c) => c.id === rootId);
      if (rootComment) {
        // Switch to log-only mode
        setLogOnlyMode(true);
        // Set scroll target
        // setShowEndCard(false); // Ensure end card is closed if jumping from it? (End card is overlay, might block view)
        setScrollToCommentId(rootId);
        // Jump to that time
        handleCommentClick(rootComment.time);
      }
    },
    [danmakuComments, handleCommentClick] // Added dependencies
  );

  const [showHelpModal, setShowHelpModal] = useState(false);

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
    // handleImport, // Replaced by local handleImport with conflict check
    checkImportConflicts,
    applyImportData,
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

    setRequestedVideoName,
    setShowVideoRequestModal,
    projectFileHandle,
    setProjectFileHandle,
    projectName,
    setProjectName,
    setProjectDirPath,
    setRequestedVideoPath,
    unlockAbeMode,
    setIsAutoScroll,
    endCardSettings,
    setEndCardSettings,
  });

  // Video URL Input State via Hook (Moved after useAppHandlers to resolve dependency)
  const { videoUrlInput, setVideoUrlInput, showUrlModal, setShowUrlModal, handleVideoUrlSubmit } =
    useUrlInputHandler(handleVideoUrlSubmitFromHook);

  // Wrapper for handleLogUrlLoad to check Abe condition safely
  const handleLogUrlLoadWrapper = useCallback(
    (url) => {
      const isUnlockKeyword = checkAbeUnlockCondition(url);
      if (isUnlockKeyword) {
        unlockAbeMode();
      }

      // If it looks like a URL, try to load it. Otherwise, if it was an unlock keyword, stop here.
      const isUrl = url.includes('://') || url.includes('.') || url.startsWith('localhost');

      if (isUnlockKeyword && !isUrl) {
        console.log('Abe Mode Unlocked via log keyword. Not a URL, skipping load.');
        return Promise.resolve(); // Return resolved promise to satisfy caller
      }

      return logSystem.handleUrlLoad(url).then((result) => {
        if (result && (result.title || result.name)) {
          const text = result.title || result.name;
          if (checkAbeUnlockCondition(text)) {
            unlockAbeMode();
          }
        }
        return result;
      });
    },
    [logSystem, unlockAbeMode]
  );

  // Handle Extension Import (URL Params & Messages)
  useExtensionSync({ player, logSystem, unlockAbeMode });

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
        if (newWidth > 350 && newWidth < window.innerWidth * 0.5) setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
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

    if (player.videoSrc && player.videoSrc.startsWith('blob:')) {
      // Native check
      if (p.tagName === 'VIDEO') {
        if (shouldPlay) {
          p.play().catch((e) => console.error('Native play error:', e));
        } else {
          p.pause();
        }
      } else {
        // console.warn("SyncEffect: videoSrc covers blob, but Ref is not VIDEO tag. It is:", p.tagName || p);
      }
    } else if (typeof p.playVideo === 'function') {
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

    if (player.videoSrc && player.videoSrc.startsWith('blob:') && p.tagName === 'VIDEO') {
      // Native
      p.volume = player.volume;
      p.muted = player.isMuted;
    } else if (typeof p.setVolume === 'function') {
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
  }, [logOnlyMode, currentTime, player.isPlaying, togglePlay, syncLastProcessedTime]);

  // --- Keyboard Shortcuts (using handler from useAppHandlers) ---
  useEffect(() => {
    const handleKeyDown = createKeyDownHandler(handleSaveProject);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createKeyDownHandler, handleSaveProject]);

  // Unused handlers removed: handlePlayVideo, handleLoadLog

  // --- Helpers for LogViewer/Sidebar (that were previously local to Sidebar) ---

  // Calculate activeThreadTitle for LogView header
  const activeThreadTitle = React.useMemo(() => {
    const comments = logSystem.visibleComments;
    const loadedFiles = logSystem.loadedFiles;
    if (!loadedFiles || loadedFiles.length === 0 || !comments || comments.length === 0) return null;

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
  }, [logSystem.visibleComments, logSystem.loadedFiles, activeCommentId, currentTime]);

  // --- New Handle Import with Conflict Check via Hook ---
  const { handleImport, isDragOver, handleDragOver, handleDragLeave, handleDrop } = useFileImporter(
    {
      checkImportConflicts,
      applyImportData,
      setConfirmModalState,
      closeConfirmModal,
    }
  );

  // --- Comment Density Calculation for Seek Bar Graph ---

  // --- Handlers for Layout ---
  const handleReset = () => {
    setConfirmModalState({
      isOpen: true,
      title: '設定のリセット',
      message:
        'すべて（ログ、動画、設定）をリセットしますか？\n未保存のプロジェクト内容は失われます。',
      type: 'warning',
      confirmText: 'リセット',
      onConfirm: () => {
        window.location.reload();
      },
      onCancel: closeConfirmModal,
    });
  };

  const handleExportProject = async (fileName) => {
    try {
      const data = getProjectData();

      const jsonString = JSON.stringify(data, null, 2);
      const name = `${fileName || 'project_settings'}.json`;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [
              {
                description: 'Danmaku Project JSON',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();

          setProjectFileHandle(handle);
          setProjectName(fileName || 'project_settings');

          setShowExportModal(false);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('File System Access API failed, falling back...', err);
        }
      }

      const blob = new Blob([jsonString], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.style.display = 'none';
      document.body.appendChild(link);

      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 2000);

      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('エクスポートに失敗しました: ' + err.message);
    }
  };

  return (
    <DesktopLayout
      containerRef={containerRef}
      danmakuContainerRef={danmakuContainerRef}
      progressBarRef={progressBarRef}
      thumbRef={thumbRef}
      autoPlayRequestedRef={autoPlayRequestedRef}
      logScrollPositionsRef={logScrollPositionsRef}
      showSidebar={showSidebar}
      setShowSidebar={setShowSidebar}
      startResizing={startResizing}
      sidebarWidth={sidebarWidth}
      logOnlyMode={logOnlyMode}
      setLogOnlyMode={setLogOnlyMode}
      showControls={showControls}
      showDanmaku={showDanmaku}
      setShowDanmaku={setShowDanmaku}
      projectName={projectName}
      projectDirPath={projectDirPath}
      projectFileHandle={projectFileHandle}
      player={player}
      cmSystem={cmSystem}
      logSystem={logSystem}
      currentTime={currentTime}
      isAutoScroll={isAutoScroll}
      setIsAutoScroll={setIsAutoScroll}
      skipSeconds={skipSeconds}
      setSkipSeconds={setSkipSeconds}
      videoStartTimeStr={videoStartTimeStr}
      setVideoStartTimeStr={setVideoStartTimeStr}
      dmSettings={dmSettings}
      setDmSettings={setDmSettings}
      activeDanmaku={danmaku.activeDanmaku}
      activeCommentId={activeCommentId}
      showThreadTitle={showThreadTitle}
      setShowThreadTitle={setShowThreadTitle}
      enableTreeView={enableTreeView}
      setEnableTreeView={setEnableTreeView}
      showImages={showImages}
      setShowImages={setShowImages}
      aaMode={aaMode}
      setAaMode={setAaMode}
      aaOverrideMap={aaOverrideMap}
      handleToggleAA={handleToggleAA}
      zoomedImage={zoomedImage}
      setZoomedImage={setZoomedImage}
      showExportModal={showExportModal}
      setShowExportModal={setShowExportModal}
      exportFileName={exportFileName}
      setExportFileName={setExportFileName}
      showVideoRequestModal={showVideoRequestModal}
      setShowVideoRequestModal={setShowVideoRequestModal}
      requestedVideoName={requestedVideoName}
      requestedVideoPath={requestedVideoPath}
      setRequestedVideoName={setRequestedVideoName}
      showUrlModal={showUrlModal}
      setShowUrlModal={setShowUrlModal}
      videoUrlInput={videoUrlInput}
      setVideoUrlInput={setVideoUrlInput}
      showHelpModal={showHelpModal}
      setShowHelpModal={setShowHelpModal}
      showAbeUnlockCelebration={showAbeUnlockCelebration}
      closeAbeUnlockCelebration={closeAbeUnlockCelebration}
      abeModeUnlocked={abeModeUnlocked}
      unlockAbeMode={unlockAbeMode}
      confirmModalState={confirmModalState}
      closeConfirmModal={closeConfirmModal}
      userHistoryId={userHistoryId}
      setUserHistoryId={setUserHistoryId}
      handleVideoUrlSubmit={handleVideoUrlSubmit}
      showSettingsPanel={showSettingsPanel}
      setShowSettingsPanel={setShowSettingsPanel}
      activeThreadTitle={activeThreadTitle}
      scrollToCommentId={scrollToCommentId}
      setScrollToCommentId={setScrollToCommentId}
      handleSaveProject={handleSaveProject}
      handleImport={handleImport}
      handleExportProject={handleExportProject}
      onReset={handleReset}
      togglePlay={togglePlay}
      requestPlay={requestPlay}
      handleSeek={handleSeek}
      onScrub={(videoRelativeTime) => {
        const logTime = videoRelativeTime + (cmSystem?.timeOffset || 0);
        handleScrub(logTime);
      }}
      handleSeekStart={handleSeekStart}
      handleSeekEnd={handleSeekEnd}
      handleCommentClick={handleCommentClick}
      handleSeekAndPlay={handleSeekAndPlay}
      handleAnimationEnd={danmaku.handleAnimationEnd}
      handleTruncationIndicatorClick={handleTruncationIndicatorClick}
      handleCmSkip={handleCmSkip}
      handleLogUrlLoadWrapper={handleLogUrlLoadWrapper}
      handleLogFileChange={handleLogFileChange}
      handleSyncButton={handleSyncButton}
      formatTime={formatTime}
      // Drag & Drop
      isDragOver={isDragOver}
      handleDragOver={handleDragOver}
      handleDragLeave={handleDragLeave}
      handleDrop={handleDrop}
      handleMouseMove={handleMouseMove}
      handleMouseLeave={handleMouseLeave}
      logo={logo}
      // End Card
      endCardSettings={endCardSettings}
      showEndCard={showEndCard}
      setShowEndCard={setShowEndCard}
      showEndCardSettingsModal={showEndCardSettingsModal}
      setShowEndCardSettingsModal={setShowEndCardSettingsModal}
      handleSettingsChange={setEndCardSettings}
      handleEndCardReplay={handleEndCardReplay}
      onSetEndCard={(src) => {
        setConfirmModalState({
          isOpen: true,
          title: 'エンドカード設定',
          message: '表示中の画像をエンドカード（終了画面）に設定しますか？',
          confirmText: '設定する',
          type: 'info', // or 'success' visual
          onConfirm: () => {
            setEndCardSettings((prev) => ({
              ...prev,
              enabled: true,
              type: 'url',
              value: src,
              file: null,
            }));
            closeConfirmModal();
          },
          onCancel: closeConfirmModal,
        });
      }}
    />
  );
};

// Main App component - routes between Desktop and Mobile
export default DesktopApp;
