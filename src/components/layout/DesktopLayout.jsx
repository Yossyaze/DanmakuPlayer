import { FileInput, FilePen, FileVideo, Link, Save, Tv } from 'lucide-react';
import React from 'react';
import YouTube from 'react-youtube';

import { isHlsUrl } from '../../utils/hlsUtils';
import CmWaitOverlay from '../CmWaitOverlay';
import DanmakuLayer from '../DanmakuLayer';
import EndCard from '../EndCard';
import EndCardPreview from '../EndCardPreview';
import Header from '../Header';
import HLSVideo from '../HLSVideo';
import LogViewer from '../LogViewer';
import ConfirmModal from '../modals/ConfirmModal';
import EndCardSettingsModal from '../modals/EndCardSettingsModal';
import HelpModal from '../modals/HelpModal';
import ImageDisplayModal from '../modals/ImageDisplayModal';
import UrlInputModal from '../modals/UrlInputModal';
import VideoRequestModal from '../modals/VideoRequestModal';
import Sidebar from '../Sidebar';
import AbeModeUnlockCelebration from '../ui/AbeModeUnlockCelebration';
import DanmakuSettingsPopover from '../ui/DanmakuSettingsPopover';
import VideoControls from '../VideoControls';

const DesktopLayout = ({
  // Refs
  containerRef,
  danmakuContainerRef,
  progressBarRef,
  thumbRef,
  autoPlayRequestedRef,
  logScrollPositionsRef,

  // UI State
  showSidebar,
  setShowSidebar,
  startResizing,
  sidebarWidth,
  logOnlyMode,
  setLogOnlyMode,
  showControls,

  // Danmaku Visibility State
  showDanmaku,
  setShowDanmaku,

  // Project State
  projectName,
  projectDirPath,
  projectFileHandle,

  // Data Objects
  player,
  cmSystem,
  logSystem,

  // Handlers
  handleSetCmStart,
  handleSetCmEnd,
  handleSetLogStart,
  handleAddNgId,
  handleAddNgComment,
  handleAddNgWord,
  handleRemoveNgId,
  handleRemoveNgComment,
  handleRemoveNgWord,

  // Player & Time State
  currentTime,
  isAutoScroll,
  setIsAutoScroll,
  skipSeconds,
  setSkipSeconds,
  videoStartTimeStr,
  setVideoStartTimeStr,

  // Comments / Danmaku Data
  dmSettings,
  setDmSettings,
  activeDanmaku,
  activeCommentId,
  activeThreadTitle,

  // Sidebar Settings
  showThreadTitle,
  setShowThreadTitle,
  enableTreeView,
  setEnableTreeView,
  showImages,
  setShowImages,
  imageLayout,
  setImageLayout,
  aaMode,
  setAaMode,
  aaOverrideMap,
  handleToggleAA,

  // Modals State
  zoomedImage,
  setZoomedImage,
  forceRender, // Tutorial force render

  showExportModal,
  setShowExportModal,
  exportFileName,
  setExportFileName,

  showVideoRequestModal,
  setShowVideoRequestModal,
  requestedVideoName,
  setRequestedVideoName,
  requestedVideoPath,

  showUrlModal,
  setShowUrlModal,
  videoUrlInput,
  setVideoUrlInput,

  showHelpModal,
  setShowHelpModal,

  showAbeUnlockCelebration,
  closeAbeUnlockCelebration,
  abeModeUnlocked,
  unlockAbeMode,

  confirmModalState,
  closeConfirmModal,

  userHistoryId,
  setUserHistoryId, // For Sidebar

  // Handlers
  handleVideoUrlSubmit,

  handleSaveProject, // Overwrite save
  handleImport, // File Picker import
  handleExportProject, // Extracted Export Logic

  onReset, // Reset handler

  togglePlay,
  requestPlay,
  handleSeek,
  handleSeekStart,
  handleSeekEnd,
  handleCommentClick,
  handleSeekAndPlay,
  // Debug logSystem
  // console.log('DesktopLayout logSystem:', logSystem, 'handleRenameFile:', logSystem?.handleRenameFile);

  handleAnimationEnd, // Danmaku end
  handleTruncationIndicatorClick,
  handleCmSkip,

  handleLogUrlLoadWrapper,
  handleLogFileChange,
  handleSyncButton,

  formatTime, // util
  handleMouseMove,
  handleMouseLeave,
  logo,
  showSettingsPanel,
  setShowSettingsPanel,
  scrollToCommentId,
  setScrollToCommentId,
  // D&D
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop,

  onScrub, // New prop
  // End Card
  endCardSettings,
  showEndCard,
  setShowEndCard,
  showEndCardSettingsModal,
  setShowEndCardSettingsModal,
  handleSettingsChange, // For EndCard settings

  handleEndCardReplay,
  onSetEndCard,
  forceShowDanmakuSettings, // チュートリアル用：強制的に弾幕設定を開く
  onDanmakuSettingsOpened, // チュートリアル用：弾幕設定が開いた時のコールバック
  onStartTutorial,
}) => {
  const [showDanmakuSettings, setShowDanmakuSettings] = React.useState(false);

  // チュートリアル用：外部から弾幕設定ポップオーバーを制御
  React.useEffect(() => {
    if (forceShowDanmakuSettings !== undefined) {
      setShowDanmakuSettings(forceShowDanmakuSettings);
    }
  }, [forceShowDanmakuSettings]);

  // チュートリアル用：弾幕設定が開いた時に親に通知
  const handleToggleDanmakuSettings = () => {
    const nextValue = !showDanmakuSettings;
    setShowDanmakuSettings(nextValue);
    if (nextValue && onDanmakuSettingsOpened) {
      onDanmakuSettingsOpened();
    }
  };

  const {
    playerRef,
    videoSrc,
    videoFileName,
    isPlaying: playerIsPlaying, // alias to avoid conflict if any (though isPlaying is not in props? Wait, togglePlay is. isPlaying is not.)
    volume,
    isMuted,
    handleDuration,
    handleVolumeChange,
    toggleMute,
    handleFileChange: playerHandleFileChange,
    loadVideoFromFile,
    videoRef,
  } = player;

  // HLS Quality State
  const [qualityLevels, setQualityLevels] = React.useState([]);
  const [currentLevel, setCurrentLevel] = React.useState(-1);
  const [manualQuality, setManualQuality] = React.useState(-1);
  const [retryWithProxy, setRetryWithProxy] = React.useState(false);

  // Reset proxy retry when video source changes
  React.useEffect(() => {
    setRetryWithProxy(false);
  }, [videoSrc]);

  // CM Wait中はビデオを一時停止、終了時に再開
  // また、_isWaitingCm フラグを設定して usePlayer.js での再生を抑制
  React.useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    // フラグを設定（usePlayer.js でチェックされる）
    video._isWaitingCm = cmSystem.isWaitingCm;

    if (cmSystem.isWaitingCm) {
      // CM待機中はビデオを明示的に一時停止
      if (typeof video.pause === 'function') {
        video.pause();
      }
    } else if (player.isPlaying) {
      // CM待機終了後、再生状態なら再生再開
      if (typeof video.play === 'function') {
        video.play().catch((e) => console.error('Resume play after CM wait failed:', e));
      }
    }
  }, [cmSystem.isWaitingCm, player.isPlaying, playerRef]);

  const handleLevelsLoaded = React.useCallback((levels) => {
    setQualityLevels(levels);
  }, []);

  const handleLevelChange = React.useCallback((level) => {
    setCurrentLevel(level);
  }, []);

  const handleQualitySelect = React.useCallback(
    (levelIndex) => {
      setManualQuality(levelIndex);
      if (playerRef.current && playerRef.current.setLevel) {
        playerRef.current.setLevel(levelIndex);
      }
    },
    [playerRef]
  );

  const handleSetEndCardPreview = React.useCallback(
    (logTime) => {
      // Use Log Time directly as requested
      // const { videoTime } = cmSystem.logTimeToVideoTime(logTime);
      console.log('[EndCard] handleSetEndCardPreview called', { logTime });

      handleSettingsChange((prev) => {
        const newState = {
          ...prev,
          previewEnabled: true,
          previewStartTime: Math.floor(logTime * 10) / 10, // Round to 1 decimal place, Log Time
        };
        console.log('[EndCard] handleSetEndCardPreview updating state', { prev, newState });
        return newState;
      });
      // Optional: Show toast or confirmation?
    },
    [handleSettingsChange] // Removed cmSystem dependency for this function
  );

  // Player de-structuring moved to top

  // DEBUG: Monitor End Card Settings prop
  // DEBUG: Monitor End Card Settings prop
  // console.log('[EndCard] DesktopLayout Render settings:', endCardSettings);

  return (
    <div
      className="flex flex-col h-screen text-white bg-black overflow-hidden select-none relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none m-4 border-4 border-blue-500/50 border-dashed rounded-2xl animate-fade-in">
          <div className="text-center">
            <FileVideo size={64} className="mx-auto text-blue-400 mb-4 animate-bounce" />
            <p className="text-3xl font-bold text-white mb-2">ファイルをドロップ</p>
            <p className="text-blue-300">ここに追加して読み込みます</p>
          </div>
        </div>
      )}

      {/* Header - Full Width */}
      <Header
        logo={logo}
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
        onOpenHelp={() => setShowHelpModal(true)}
        unlockAbeMode={unlockAbeMode}
        onReset={onReset}
        onOpenEndCardSettings={() => setShowEndCardSettingsModal(true)}
      />

      <ConfirmModal
        {...confirmModalState}
        onCancel={confirmModalState.onCancel || closeConfirmModal}
      />

      {/* Content Area - Video/LogViewer + Sidebar */}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* --- Main Content (Video) --- */}
            <div
              className="flex-1 flex flex-col min-w-0 relative group"
              style={{
                visibility: logOnlyMode ? 'hidden' : 'visible',
                position: logOnlyMode ? 'absolute' : 'relative',
                pointerEvents: logOnlyMode ? 'none' : 'auto',
                width: logOnlyMode ? 0 : 'auto',
                height: logOnlyMode ? 0 : 'auto',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* --- Video Layer --- */}
              <div
                id="main-video-layer"
                className="flex-1 relative bg-black flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={togglePlay}
              >
                {/* Video Area */}
                {!player.videoSrc ? (
                  <div className="text-gray-500 flex flex-col items-center justify-center h-full space-y-8 p-8">
                    {/* App Logo & Name */}
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <img
                        src={logo}
                        alt="DanmakuPlayer Logo"
                        className="w-24 h-24 object-contain"
                      />
                      <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        DanmakuPlayer
                      </h1>
                      <p className="text-gray-400">動画ファイルを読み込んでコメントを楽しもう</p>
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
                          <span className="text-xs text-gray-500">MP4, WebM, Ogg 対応</span>
                        </div>
                      </label>

                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-800"></div>
                        <span className="text-xs text-gray-600 font-bold">OR</span>
                        <div className="h-px flex-1 bg-gray-800"></div>
                      </div>

                      {/* URL Input */}
                      <form onSubmit={handleVideoUrlSubmit} className="relative group">
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
                            <Save size={18} className="text-blue-400 group-hover:text-blue-300" />
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
                            <FilePen size={18} className="text-gray-400 group-hover:text-white" />
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
                ) : isHlsUrl(player.videoSrc) ? (
                  /* HLS Video Player */
                  <HLSVideo
                    ref={playerRef}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                    volume={volume}
                    muted={isMuted}
                    onDuration={(d) => handleDuration(d)}
                    // TVer等の認証が必要なサービスは拡張機能プロキシを使用
                    useExtensionProxy={
                      retryWithProxy ||
                      videoSrc.includes('tver.jp') ||
                      videoSrc.includes('stream.tver') ||
                      videoSrc.includes('streaks.jp') || // TVer CDN
                      videoSrc.includes('nhkplus') ||
                      videoSrc.includes('fod-sp.fujitv')
                    }
                    referer={(() => {
                      // 優先順位を明確に定義
                      // 1. 特定サービス向けの固定Referer
                      if (videoSrc.includes('tver') || videoSrc.includes('streaks.jp')) {
                        return 'https://tver.jp/';
                      }
                      if (videoSrc.includes('nhkplus')) {
                        return 'https://www.nhk.jp/';
                      }
                      // 2. 拡張機能から渡されたReferer（最優先）
                      if (player.referer) {
                        // console.log('[DesktopLayout] Using player.referer:', player.referer);
                        return player.referer;
                      }
                      // 3. プロキシ再試行時のフォールバック
                      if (retryWithProxy) {
                        const fallback = new URL(videoSrc).origin + '/';
                        // console.log('[DesktopLayout] Using retryWithProxy fallback:', fallback);
                        return fallback;
                      }
                      // 4. それ以外は空
                      return '';
                    })()}
                    onReady={() => {
                      console.log('HLSVideo: Ready');
                      player.setIsReady(true);
                      if (autoPlayRequestedRef.current) {
                        console.log('HLSVideo: Handling deferred AutoPlay');
                        autoPlayRequestedRef.current = false;
                        requestPlay();
                      }
                    }}
                    onCanPlay={() => {
                      console.log('HLSVideo: onCanPlay');
                      if (!player.isReady) player.setIsReady(true);
                    }}
                    onEnded={() => {
                      player.setPlayingState(false);
                      setShowEndCard(true);
                    }}
                    onPause={() => {
                      console.log('HLSVideo: onPause triggered');
                      const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                      if (!isWaiting) player.setPlayingState(false);
                    }}
                    onPlay={() => player.setPlayingState(true)}
                    onError={(e) => {
                      console.error('HLSVideo: onError', e);
                      // HLS Network Error (CORS code 0 or HTTP 403) -> Retry with proxy
                      const responseCode = e?.response?.code;
                      if (
                        e?.type === 'networkError' &&
                        (responseCode === 0 || responseCode === 403)
                      ) {
                        console.log(
                          `DesktopLayout: Detected network error (code: ${responseCode}), enabling extension proxy...`
                        );
                        setRetryWithProxy(true);
                        return;
                      }
                      // If already using proxy or other error, show alert (debounce/filtering needed?)
                      if (!retryWithProxy) {
                        alert(
                          'HLS再生エラー: ストリームを読み込めませんでした。拡張機能を再確認してください。'
                        );
                      }
                    }}
                    onLevelsLoaded={handleLevelsLoaded}
                    onLevelChange={handleLevelChange}
                  />
                ) : videoSrc.startsWith('blob:') ? (
                  /* Native Video for Local Files */
                  <video
                    ref={playerRef}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                    onLoadStart={() => console.log('NativeVideo: onLoadStart')}
                    onLoadedData={() => console.log('NativeVideo: onLoadedData')}
                    onCanPlay={() => {
                      console.log('NativeVideo: onCanPlay');
                      // Backup ready trigger
                      if (!player.isReady) {
                        console.log('NativeVideo: Setting isReady=true via onCanPlay');
                        player.setIsReady(true);
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      console.log('NativeVideo: onLoadedMetadata');
                      const d = e.target.duration;
                      if (d) player.handleDuration(d);
                      // Sync volume initially
                      e.target.volume = player.volume;
                      e.target.muted = player.isMuted;

                      // Native Ready
                      console.log('NativeVideo: Setting isReady=true via onLoadedMetadata');
                      player.setIsReady(true);

                      // Native AutoPlay logic
                      if (autoPlayRequestedRef.current) {
                        console.log('NativeVideo: Handling deferred AutoPlay');
                        autoPlayRequestedRef.current = false;
                        requestPlay();
                      }
                    }}
                    onEnded={() => {
                      player.setPlayingState(false);
                      setShowEndCard(true);
                    }}
                    onPause={() => {
                      console.log('NativeVideo: onPause triggered');
                      const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                      // Use Ref to check immediately if we are waiting for CM
                      // State might be slightly delayed during seek
                      if (!isWaiting) {
                        player.setPlayingState(false);
                      }
                    }}
                    onPlay={() => player.setPlayingState(true)}
                    onError={(e) => console.error('NativeVideo: onError', e.nativeEvent)}
                  />
                ) : (
                  /* YouTube Player */
                  <div className="w-full h-full relative pointer-events-auto">
                    <YouTube
                      videoId={
                        videoSrc.includes('v=') ? videoSrc.split('v=')[1].split('&')[0] : videoSrc
                      }
                      opts={{
                        height: '100%',
                        width: '100%',
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
                        console.log('YouTube Player: onReady');
                        // Store the player instance (event.target) in the ref
                        player.setPlayerInstance(event.target);

                        // Fix Duration handling for YouTube API
                        const d = event.target.getDuration();
                        if (d) player.handleDuration(d);

                        player.setIsReady(true);

                        if (autoPlayRequestedRef.current) {
                          console.log('YouTube: Handling deferred AutoPlay');
                          autoPlayRequestedRef.current = false;
                          requestPlay();
                        }
                      }}
                      onStateChange={(event) => {
                        // event.data: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                        console.log('YouTube State Change:', event.data);
                        if (event.data === 1) {
                          // Playing
                          if (!player.isPlaying) player.setPlayingState(true);
                        } else if (event.data === 2) {
                          // Paused
                          const isWaiting = cmSystem.cmStateRef.current.isWaiting;
                          console.log(
                            `[App] YouTube Paused. isPlaying:${player.isPlaying} isWaitingRef:${isWaiting}`
                          );
                          // Use Ref for immediate check
                          if (player.isPlaying && !isWaiting) {
                            player.setPlayingState(false);
                          } else if (isWaiting) {
                            console.log('[App] Ignored Pause because isWaiting is true');
                          }
                        } else if (event.data === 0) {
                          // Ended
                          player.setPlayingState(false);
                          setShowEndCard(true);
                        }
                      }}
                      onError={(e) => {
                        console.error('YouTube Error:', e);
                        alert('YouTube Error: ' + e.data);
                      }}
                    />
                  </div>
                )}

                {/* Danmaku Layer - always render, hide with CSS to preserve animation state */}
                <div
                  style={{
                    visibility: !logOnlyMode && showDanmaku ? 'visible' : 'hidden',
                    pointerEvents: !logOnlyMode && showDanmaku ? 'auto' : 'none',
                  }}
                >
                  <DanmakuLayer
                    containerRef={danmakuContainerRef}
                    activeDanmaku={activeDanmaku}
                    settings={dmSettings}
                    onAnimationEnd={handleAnimationEnd}
                    aaMode={aaMode}
                    aaOverrideMap={aaOverrideMap}
                    onImageClick={(url) => setZoomedImage(url)}
                    onTruncationClick={handleTruncationIndicatorClick}
                    isEnabled={dmSettings.enabled && showDanmaku && !logOnlyMode}
                    isPlaying={playerIsPlaying || showEndCard}
                    abeMode={dmSettings.abeMode}
                  />
                </div>

                {/* Global Image Display Modal is rendered at root level */}
                {/* Removed local inline Expanded Danmaku Image Modal */}

                {/* CM Wait Overlay */}
                {cmSystem.isWaitingCm && (
                  <CmWaitOverlay
                    cmSystem={cmSystem}
                    currentTime={currentTime}
                    startTimeStr={logSystem.startTimeStr}
                    handleCmSkip={handleCmSkip}
                  />
                )}

                {/* End Card Overlay */}
                {showEndCard && (
                  <EndCard
                    settings={endCardSettings}
                    onClose={() => setShowEndCard(false)}
                    onReplay={handleEndCardReplay}
                  />
                )}

                {/* End Card Preview */}
                {!showEndCard &&
                  endCardSettings?.enabled &&
                  endCardSettings?.previewEnabled &&
                  currentTime >= endCardSettings.previewStartTime && (
                    <EndCardPreview
                      settings={endCardSettings}
                      onClick={(src) => setZoomedImage({ src })}
                    />
                  )}

                {!logOnlyMode && (
                  <>
                    {/* Danmaku Settings Popover (Lifted up for Z-Index Control) */}
                    {showDanmakuSettings && (
                      <div className="absolute inset-0 z-70 pointer-events-none">
                        {/* Wrap in a container to match positioning context if needed, 
                            but the popover itself positions absolute bottom-12 right-0
                            relative to this container (video area).
                             pointer-events-none on wrapper so it doesn't block video, 
                             popover will have pointer-events-auto via its own CSS or we add it. 
                             Actually DanmakuSettingsPopover has a backdrop that captures clicks.
                             So we need pointer-events-auto on the popover elements.
                        */}
                        <DanmakuSettingsPopover
                          dmSettings={dmSettings}
                          setDmSettings={setDmSettings}
                          abeModeUnlocked={abeModeUnlocked}
                          onClose={() => setShowDanmakuSettings(false)}
                        />
                      </div>
                    )}

                    <VideoControls
                      visible={showControls}
                      isPlaying={playerIsPlaying}
                      togglePlay={togglePlay}
                      currentTime={currentTime - cmSystem.logStartTime}
                      totalDuration={cmSystem.getTotalDuration} // Use Total Duration (Video + CM)
                      handleSeek={handleSeek}
                      // onSync={handleSyncButton} // VideoControls doesn't support generic onSync yet, irrelevant
                      handleSeekStart={handleSeekStart}
                      handleSeekEnd={handleSeekEnd}
                      volume={volume}
                      onVolumeChange={handleVolumeChange}
                      isMuted={player.isMuted}
                      toggleMute={toggleMute}
                      dmSettings={dmSettings}
                      setDmSettings={setDmSettings}
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
                      videoRef={videoRef}
                      cmRanges={cmSystem.cmRanges}
                      videoSrc={videoSrc}
                      logStartTime={cmSystem.logStartTime}
                      showDanmaku={showDanmaku}
                      setShowDanmaku={setShowDanmaku}
                      showSidebar={showSidebar}
                      setShowSidebar={setShowSidebar}
                      containerRef={containerRef}
                      abeModeUnlocked={abeModeUnlocked}
                      commentDensity={logSystem.commentDensity} // Was it passed?
                      // Line 1027 in App.jsx: commentDensity={commentDensity}
                      // logSystem hook returns commentDensity.
                      // So logSystem.commentDensity is the way.
                      onScrub={onScrub}
                      onToggleSettings={handleToggleDanmakuSettings}
                      // Quality Props
                      qualityLevels={qualityLevels}
                      currentLevel={currentLevel}
                      manualQuality={manualQuality}
                      onQualitySelect={handleQualitySelect}
                      // Speed Props
                      playbackRate={player.playbackRate}
                      onPlaybackRateChange={player.setPlaybackRate}
                      forceRender={forceRender}
                    />
                  </>
                )}
              </div>
            </div>

            {logOnlyMode && (
              <LogViewer
                comments={logSystem.allCommentsEnriched || logSystem.comments} // Pass ALL enriched comments
                files={logSystem.loadedFiles} // Pass loaded files list
                onRemoveFile={logSystem.handleRemoveFile}
                activeCommentId={activeCommentId}
                activeThreadTitle={activeThreadTitle}
                currentTime={currentTime}
                logStartTime={cmSystem.logStartTime}
                onCommentClick={handleCommentClick}
                onSeekAndPlay={handleSeekAndPlay}
                aaOverrideMap={aaOverrideMap}
                onToggleAA={handleToggleAA}
                scrollToCommentId={scrollToCommentId}
                onScrollComplete={() => setScrollToCommentId(null)}
                // setZoomedImage passed for LogViewer image handling
                setZoomedImage={setZoomedImage}
                onSetCmStart={handleSetCmStart}
                onSetCmEnd={handleSetCmEnd}
                onSetLogStart={handleSetLogStart}
                onAddNgId={handleAddNgId}
                onAddNgComment={handleAddNgComment}
                onAddNgWord={handleAddNgWord}
                ngSettings={logSystem.ngSettings}
                removeNgId={handleRemoveNgId}
                removeNgComment={handleRemoveNgComment}
                removeNgWord={handleRemoveNgWord}
                allComments={logSystem.allCommentsEnriched || logSystem.comments}
                formatTime={formatTime}
                totalDuration={cmSystem.getTotalDuration}
                scrollPositionsRef={logScrollPositionsRef}
                sidebarOpen={showSidebar}
                onToggleSidebar={() => setShowSidebar(!showSidebar)}
                onRenameFile={logSystem.handleRenameFile}
                unlockAbeMode={unlockAbeMode}
                abeModeUnlocked={abeModeUnlocked}
                abeMode={abeModeUnlocked && dmSettings.abeMode}
                onSetEndCardPreview={handleSetEndCardPreview}
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
              <h3 className="text-lg font-bold text-white mb-4">設定をエクスポート</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ファイル名</label>
                  <input
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    placeholder="project_settings"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-blue-500 outline-none"
                  />
                  {/* Filename Suggestions */}
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">名前の候補:</label>
                    <div className="flex flex-wrap gap-2">
                      {/* 1. Date/Time */}
                      <button
                        onClick={() => {
                          const now = new Date();
                          const str = `${now.getFullYear()} -${String(now.getMonth() + 1).padStart(
                            2,
                            '0'
                          )} -${String(now.getDate()).padStart(2, '0')}_${String(
                            now.getHours()
                          ).padStart(2, '0')} -${String(now.getMinutes()).padStart(2, '0')} `;
                          setExportFileName(str);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                      >
                        日時
                      </button>

                      {/* 2. Video Name */}
                      {videoFileName && (
                        <button
                          onClick={() => {
                            const name = videoFileName.replace(/\.[^/.]+$/, ''); // Remove extension
                            setExportFileName(name);
                          }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                          title={videoFileName}
                        >
                          動画名
                        </button>
                      )}

                      {/* 3. Thread Title */}
                      {logSystem.loadedFiles.length > 0 &&
                        (logSystem.loadedFiles[0].title || logSystem.loadedFiles[0].name) && (
                          <button
                            onClick={() => {
                              let title =
                                logSystem.loadedFiles[0].title || logSystem.loadedFiles[0].name;
                              // Sanitize
                              title = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
                              setExportFileName(title);
                            }}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                            title={logSystem.loadedFiles[0].title || logSystem.loadedFiles[0].name}
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
                    onClick={() => handleExportProject(exportFileName)}
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
          onFileChange={playerHandleFileChange}
          onLoadVideoFromFile={loadVideoFromFile}
          projectDirPath={projectDirPath}
        />

        <EndCardSettingsModal
          isOpen={showEndCardSettingsModal}
          onClose={() => setShowEndCardSettingsModal(false)}
          settings={endCardSettings}
          onSettingsChange={handleSettingsChange}
          logComments={logSystem.visibleComments} // Use visible comments for finding images
          currentTime={currentTime - cmSystem.logStartTime}
          logStartTime={cmSystem.logStartTime}
          videoTimeToLogTime={cmSystem.videoTimeToLogTime}
          logTimeToVideoTime={cmSystem.logTimeToVideoTime}
          startTimeStr={logSystem.startTimeStr}
          totalDuration={cmSystem.getTotalDuration}
        />

        {/* --- Sidebar (Right) --- */}

        {/* --- Sidebar (Right) --- */}
        {/* Show Sidebar when showSidebar is true and not in logOnlyMode */}
        {showSidebar && !logOnlyMode && (
          <Sidebar
            sidebarWidth={sidebarWidth}
            showSettingsPanel={showSettingsPanel}
            setShowSettingsPanel={setShowSettingsPanel}
            urlInput={logSystem.urlInput}
            setUrlInput={logSystem.setUrlInput}
            handleUrlSubmit={handleLogUrlLoadWrapper}
            handleFileChange={playerHandleFileChange} // Wait, sidebar uses handleFileChange for LOG files?
            // Sidebar logic says handleFileChange for log files?
            // App.jsx line 1250 passed player.handleFileChange... that seems wrong if it's for logs.
            // Ah, for video file change?
            handleLogFileChange={handleLogFileChange}
            handleUrlLoad={handleLogUrlLoadWrapper}
            startTimeStr={logSystem.startTimeStr}
            setStartTimeStr={logSystem.setStartTimeStr}
            startDateStr={logSystem.startDateStr}
            setStartDateStr={logSystem.setStartDateStr}
            videoStartTimeStr={videoStartTimeStr}
            setVideoStartTimeStr={setVideoStartTimeStr}
            totalDuration={cmSystem.getTotalDuration} // Use Total Duration (Video + CM)
            cmStartInput={cmSystem.cmStartInput}
            setCmStartInput={cmSystem.setCmStartInput}
            cmEndInput={cmSystem.cmEndInput}
            setCmEndInput={cmSystem.setCmEndInput}
            cmStartDateInput={cmSystem.cmStartDateInput}
            setCmStartDateInput={cmSystem.setCmStartDateInput}
            cmEndDateInput={cmSystem.cmEndDateInput}
            setCmEndDateInput={cmSystem.setCmEndDateInput}
            addCmRange={cmSystem.addCmRange}
            addCmRangeSmart={cmSystem.addCmRangeSmart}
            updateCmRange={cmSystem.updateCmRange}
            cmRanges={cmSystem.cmRanges}
            removeCmRange={cmSystem.removeCmRange}
            comments={logSystem.visibleComments}
            allComments={logSystem.allCommentsEnriched || logSystem.comments}
            activeCommentId={activeCommentId}
            currentTime={currentTime}
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
            onOpenEndCardSettings={() => setShowEndCardSettingsModal(true)}
            setZoomedImage={setZoomedImage}
            loadedFiles={logSystem.loadedFiles}
            handleToggleFileVisibility={logSystem.handleToggleFileVisibility}
            handleRemoveFile={logSystem.handleRemoveFile}
            handleRenameFile={logSystem.handleRenameFile}
            danmakuContainerRef={danmakuContainerRef}
            handleReorderFiles={logSystem.handleReorderFiles}
            formatTime={formatTime}
            skipSeconds={skipSeconds}
            setSkipSeconds={setSkipSeconds}
            logStartTime={cmSystem.logStartTime}
            onAddNgId={logSystem.addNgId} // Wait, use handlers or direct? LogViewer used handlers.
            // Sidebar props are onAddNgId. LogViewer props are onAddNgId.
            // LogViewer used logSystem.handleAddNgId (wrapper from useAppHandlers?)
            // No, logSystem is passed as prop.
            // In DesktopLayout, logSystem prop comes from App.
            // Let's check App.jsx later, but here we use logSystem object.
            // logSystem.addNgId is from useLogSystem directly?
            // Re-check useLogSystem.
            // useLogSystem returns { addNgId, ... }
            // So logSystem.addNgId is correct.
            onAddNgComment={logSystem.addNgComment}
            onAddNgWord={logSystem.addNgWord} // Add prop
            removeNgId={logSystem.removeNgId}
            removeNgComment={logSystem.removeNgComment}
            removeNgWord={logSystem.removeNgWord} // Add prop
            ngSettings={logSystem.ngSettings}
            onIdClick={setUserHistoryId}
            userHistoryId={userHistoryId}
            onCloseUserHistory={() => setUserHistoryId(null)}
            aaOverrideMap={aaOverrideMap}
            onToggleAA={handleToggleAA}
            abeModeUnlocked={abeModeUnlocked}
            onSetEndCardPreview={handleSetEndCardPreview}
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

        {/* --- Help Modal --- */}
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          onStartTutorial={onStartTutorial}
        />

        {/* --- Abe Mode Unlock Celebration --- */}
        <AbeModeUnlockCelebration
          isVisible={showAbeUnlockCelebration}
          onClose={closeAbeUnlockCelebration}
        />

        {/* --- Global Image Display Modal --- */}
        <ImageDisplayModal
          src={typeof zoomedImage === 'string' ? zoomedImage : zoomedImage?.src}
          currentIndex={typeof zoomedImage === 'object' ? zoomedImage?.index : 0}
          imageList={typeof zoomedImage === 'object' ? zoomedImage?.list : []}
          onClose={() => setZoomedImage(null)}
          onJumpTo={(index) => {
            if (zoomedImage && typeof zoomedImage === 'object' && zoomedImage.list) {
              if (index >= 0 && index < zoomedImage.list.length) {
                setZoomedImage({
                  ...zoomedImage,
                  src: zoomedImage.list[index].src,
                  index: index,
                });
              }
            }
          }}
          onSetEndCard={onSetEndCard}
          onNext={() => {
            if (zoomedImage && typeof zoomedImage === 'object' && zoomedImage.list) {
              const nextIndex = zoomedImage.index + 1;
              if (nextIndex < zoomedImage.list.length) {
                setZoomedImage({
                  ...zoomedImage,
                  src: zoomedImage.list[nextIndex].src,
                  index: nextIndex,
                });
              }
            }
          }}
          onPrev={() => {
            if (zoomedImage && typeof zoomedImage === 'object' && zoomedImage.list) {
              const prevIndex = zoomedImage.index - 1;
              if (prevIndex >= 0) {
                setZoomedImage({
                  ...zoomedImage,
                  src: zoomedImage.list[prevIndex].src,
                  index: prevIndex,
                });
              }
            }
          }}
          hasNext={
            zoomedImage &&
            typeof zoomedImage === 'object' &&
            zoomedImage.list &&
            zoomedImage.index < zoomedImage.list.length - 1
          }
          hasPrev={
            zoomedImage &&
            typeof zoomedImage === 'object' &&
            zoomedImage.list &&
            zoomedImage.index > 0
          }
        />
      </div>
    </div>
  );
};

export default DesktopLayout;
