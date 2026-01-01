import React, { useState } from "react";
import CommentList from "./CommentList";
import LogCommentItem from "./ui/LogCommentItem";
import { Hash, Settings, Ban, Menu } from "lucide-react";
import LogViewerSearch from "./logviewer/LogViewerSearch";
import LogViewerFileList from "./logviewer/LogViewerFileList";
import LogViewerSearchResults from "./logviewer/LogViewerSearchResults";
import LogViewerPopupStack from "./logviewer/LogViewerPopupStack";
import UserHistoryModal from "./UserHistoryModal";
import LogViewerSettings from "./LogViewerSettings";
import LogViewerNGPanel from "./LogViewerNGPanel";
import CommentContextMenu from "./ui/CommentContextMenu";
import { useLogFilter } from "../hooks/useLogFilter";
import { useLogPopup } from "../hooks/useLogPopup";

// Wrapper for LogCommentItem to act as row component for CommentList
const LogCommentItemWrapper = React.memo(
  ({
    node,
    isActive,
    isHighlighted,
    currentLogicalTime,
    onAnchorClick,
    onUrlLoad,
    showImages,
    setZoomedImage,
    timeOffset,
    formatTime,
    onRowClick,
    totalComments,
    onIdClick,
    settings,
    onReplyCountClick,
    aaOverride,
    className = "",
  }) => {
    return (
      <LogCommentItem
        comment={node}
        isActive={isActive}
        isHighlighted={isHighlighted}
        currentLogicalTime={currentLogicalTime}
        timeOffset={timeOffset}
        formatTime={formatTime}
        totalComments={totalComments}
        onIdClick={onIdClick}
        onAnchorClick={onAnchorClick}
        onUrlLoad={onUrlLoad}
        showImages={showImages}
        setZoomedImage={setZoomedImage}
        onClick={onRowClick}
        depth={node.depth || 0}
        settings={settings}
        onReplyCountClick={onReplyCountClick}
        aaOverride={aaOverride}
        className={className}
      />
    );
  }
);

const DEFAULT_SETTINGS = {
  fontSize: "medium", // small, medium, large, xlarge
  density: "comfortable", // compact, comfortable, spacious
  showImages: true,
  imageLayout: "inline", // 'inline' | 'grouped'
  showThumbnails: false,
  showIds: true,
  enableTreeView: true,
};

const LogViewer = ({
  comments = [],
  files = [], // New prop
  activeCommentId,
  // activeThreadTitle, // Unused here, we calculate locally to support filtering
  currentLogicalTime,
  timeOffset,
  onCommentClick,
  onSeekAndPlay, // New prop for seek + play + exit log mode
  onIdClick,
  onSetCmStart,
  onSetCmEnd,
  onSetLogStart,
  onAddNgId,
  onAddNgComment,
  aaOverrideMap,
  onToggleAA,
  formatTime,
  activeCommentRef,
  totalDuration,
  ngSettings = { ids: [], comments: [] }, // Receive NG Settings
  removeNgId,
  removeNgComment,
  allComments,
  scrollToCommentId, // New prop for external scroll trigger
  onScrollComplete, // Callback after scroll completes
  scrollPositionsRef, // Ref for storing scroll positions per file
  sidebarOpen = true, // Control sidebar visibility from outside
  onToggleSidebar, // Callback to toggle sidebar
}) => {
  // --- Refs ---
  const internalActiveCommentRef = React.useRef(null);
  const refToUse = activeCommentRef || internalActiveCommentRef;
  const commentListRef = React.useRef(null); // Ref for accessing CommentList methods

  // External scroll trigger effect
  React.useEffect(() => {
    if (scrollToCommentId && commentListRef.current) {
      // Find the comment in comments to get resNum and sourceFileId
      const targetComment = comments.find((c) => c.id === scrollToCommentId);
      if (targetComment) {
        const resNum = targetComment.originalResNum || targetComment.resNum;
        const sourceFileId = targetComment.sourceFileId;
        // Use setTimeout to ensure component is mounted
        setTimeout(() => {
          if (commentListRef.current) {
            commentListRef.current.scrollToResNum(resNum, sourceFileId);
          }
          if (onScrollComplete) {
            onScrollComplete();
          }
        }, 100);
      } else if (onScrollComplete) {
        onScrollComplete();
      }
    }
  }, [scrollToCommentId, comments, onScrollComplete]);

  const [zoomedImage, setZoomedImage] = useState(null);
  const [userHistoryId, setUserHistoryId] = useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState("all");
  // showFileList removed, always visible
  const [initialScrollIndex, setInitialScrollIndex] = React.useState(0);
  const currentScrollIndexRef = React.useRef(0);

  // Save scroll position when file selection changes or component unmounts
  const saveCurrentScrollPosition = React.useCallback(() => {
    if (scrollPositionsRef) {
      scrollPositionsRef.current[selectedFileId] =
        currentScrollIndexRef.current;
    }
  }, [scrollPositionsRef, selectedFileId]);

  // Handle file selection change: save old position, load new position
  const handleFileSelect = React.useCallback(
    (newFileId) => {
      // Save current scroll position
      saveCurrentScrollPosition();
      // Switch file
      setSelectedFileId(newFileId);
      // Load saved scroll position for the new file (or 0 if none saved)
      const savedIndex = scrollPositionsRef?.current[newFileId] || 0;
      setInitialScrollIndex(savedIndex);
    },
    [saveCurrentScrollPosition, scrollPositionsRef]
  );

  // Save scroll position when component unmounts (mode switch)
  React.useEffect(() => {
    return () => {
      saveCurrentScrollPosition();
    };
  }, [saveCurrentScrollPosition]);

  // Restore scroll position when coming back to log mode or switching files
  React.useEffect(() => {
    const savedIndex = scrollPositionsRef?.current[selectedFileId];
    if (
      savedIndex !== undefined &&
      savedIndex > 0 &&
      commentListRef.current?.scrollToIndex
    ) {
      // Delay to ensure Virtuoso is mounted
      setTimeout(() => {
        commentListRef.current?.scrollToIndex?.(savedIndex);
      }, 50);
    }
  }, [selectedFileId, scrollPositionsRef]);

  // Container width and left position measurement for popups
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [containerLeft, setContainerLeft] = React.useState(0);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerLeft(rect.left);
      }
    };

    // Use ResizeObserver for reliable size change detection
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      console.log(
        "[LogViewer] ResizeObserver triggered, containerWidth:",
        containerRef.current?.getBoundingClientRect().width
      );
    });
    resizeObserver.observe(containerRef.current);

    // Initial measurement
    updateDimensions();

    // Also listen for window resize
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []); // Run once, ResizeObserver handles all size changes
  // AA Override State (Managed by App via props)
  // const [aaOverrideMap, setAaOverrideMap] = useState({}); // Moved to App
  // const handleToggleAA = ... // Moved to App

  // Settings State
  const [showSettings, setShowSettings] = React.useState(false);
  const [showNgPanel, setShowNgPanel] = React.useState(false); // NG Panel State

  // Initialize settings from localStorage lazily
  const [logSettings, setLogSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("danmaku_log_settings");
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load log settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage
  const handleSettingsChange = (newSettings) => {
    setLogSettings(newSettings);
    localStorage.setItem("danmaku_log_settings", JSON.stringify(newSettings));
  };

  // Filter and enrich comments with ID stats & Reply Counts
  // (Must be defined before hooks that depend on it)
  const filteredComments = React.useMemo(() => {
    // 1. Filter by selected File and NG
    let baseList = comments;
    if (selectedFileId !== "all") {
      baseList = comments.filter((c) => c.sourceFileId === selectedFileId);
    }
    if (ngSettings.ids && ngSettings.ids.length > 0) {
      const ngIdsSet = new Set(ngSettings.ids);
      baseList = baseList.filter((c) => !ngIdsSet.has(c.userId));
    }
    if (ngSettings.comments && ngSettings.comments.length > 0) {
      const ngCommentsSet = new Set(ngSettings.comments);
      baseList = baseList.filter((c) => !ngCommentsSet.has(c.id));
    }

    // 2. Pre-calculation for ID Stats and Reply Map
    const userGroups = {};
    const replyMap = new Map();

    baseList.forEach((c) => {
      // ID Stats collection
      const uid = c.userId;
      if (uid) {
        if (!userGroups[uid]) userGroups[uid] = [];
        userGroups[uid].push(c);
      }

      // Reply Map collection
      if (c.sourceFileId) {
        const anchorRegex = /(&gt;&gt;|>>)(\d+)/g;
        const anchorMatches = c.text.matchAll(anchorRegex);
        for (const match of anchorMatches) {
          const targetResNum = parseInt(match[2]);
          const key = `${c.sourceFileId}-${targetResNum}`;
          if (!replyMap.has(key)) {
            replyMap.set(key, []);
          }
          const list = replyMap.get(key);
          if (!list.includes(c)) {
            list.push(c);
          }
        }
      }
    });

    // 3. Create Enriched Base Objects
    const enrichedLookup = new Map();
    const enrichedList = baseList.map((c) => {
      const uid = c.userId;
      const group = userGroups[uid] || [];
      const userIndex = group.indexOf(c) + 1;
      const userTotal = group.length;

      const enriched = {
        ...c,
        userIndex,
        userTotal,
        replies: [],
        replyCount: 0,
      };
      enrichedLookup.set(c.id, enriched);
      return enriched;
    });

    // 4. Link replies using enriched objects
    enrichedList.forEach((c) => {
      const myResNum = c.originalResNum || c.resNum;
      const myFileId = c.sourceFileId;
      if (myResNum && myFileId) {
        const key = `${myFileId}-${myResNum}`;
        if (replyMap.has(key)) {
          const originalReplies = replyMap.get(key);
          const enrichedReplies = originalReplies
            .map((origR) => enrichedLookup.get(origR.id))
            .filter(Boolean);

          c.replies = enrichedReplies;
          c.replyCount = enrichedReplies.length;
        }
      }
    });

    return enrichedList;
  }, [comments, selectedFileId, ngSettings]);

  // Popup & Context Menu Hook (uses filteredComments)
  const {
    popupStack,
    logContextMenu,
    setLogContextMenu,
    handleClosePopup,
    closePopupAtIndex,
    closePopupsAbove,
    clearPopups,
    handlePopupRowClick,
    handleAnchorClick,
    handleReplyCountClick,
  } = useLogPopup(filteredComments);

  // Search & Filter Hook (uses filteredComments)
  const {
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    showResultsPopup,
    setShowResultsPopup,
    showSearchDropdown,
    setShowSearchDropdown,
    activeSearchQuery,
    setActiveSearchQuery,
    showFilterMenu,
    setShowFilterMenu,
    searchHistoryIndex,
    setSearchHistoryIndex,
    searchHistory,
    addToHistory,
    handleSearchKeyDown,
    displayResults,
  } = useLogFilter(filteredComments);

  // displayResults is now provided by useLogFilter hook

  // Calculate active thread title locally based on filtered comments
  const localActiveThreadTitle = React.useMemo(() => {
    if (filteredComments.length === 0) return "";
    let active = null;
    for (let i = filteredComments.length - 1; i >= 0; i--) {
      if (filteredComments[i].time <= currentLogicalTime) {
        active = filteredComments[i];
        break;
      }
    }
    if (!active) active = filteredComments[0];
    return active ? active.threadTitle || active.sourceFileId : "";
  }, [filteredComments, currentLogicalTime]);
  // Jump Logic (for Context Menu)
  const handleJumpToComment = (targetComment) => {
    if (!targetComment) return;

    // 2. Jump to it (Logical Time)
    if (onCommentClick) {
      onCommentClick(targetComment.time);
    }

    // 3. Scroll to it (Physical Scroll)
    const resNum = targetComment.originalResNum || targetComment.resNum;
    const sourceFileId = targetComment.sourceFileId;

    if (commentListRef.current) {
      commentListRef.current.scrollToResNum(resNum, sourceFileId);
    }

    // Close Popups (using hook action)
    clearPopups();
    setUserHistoryId(null);
    setShowResultsPopup(false);
  };

  const handleIdClick = (userId) => {
    if (onIdClick) {
      onIdClick(userId);
    } else {
      setUserHistoryId(userId);
    }
  };

  // handleAnchorClick, handleClosePopup, handlePopupRowClick, handleReplyCountClick
  // are now provided by useLogPopup hook

  // Custom Time Formatter for Comment List (Copied from Sidebar)
  const customFormatTime = React.useCallback(
    (seconds) => {
      if (totalDuration && seconds > totalDuration && seconds > 0) {
        const extra = seconds - totalDuration;
        const durStr = formatTime(totalDuration);
        const extraStr = formatTime(extra);
        return `${durStr}+${extraStr}`;
      }
      return formatTime(seconds);
    },
    [totalDuration, formatTime]
  );

  return (
    <div className="flex-1 min-h-0 bg-gray-900 overflow-hidden relative flex flex-row">
      {/* Left Sidebar: File List - Width collapses when closed */}
      <div
        className={`h-full transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <LogViewerFileList
          files={files}
          selectedFileId={selectedFileId}
          onSelectFile={handleFileSelect}
        />
      </div>

      {/* Show File List Button when hidden - REMOVED to avoid useless space */}
      {/* Control moved to Header */}

      {/* Main Content Area (Center) */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-900 border-x border-gray-800 shadow-xl relative"
      >
        {/* Thread Title Header */}
        <div className="shrink-0 bg-gray-800/80 backdrop-blur border-b border-gray-700 py-1.5 px-2 shadow-sm z-10 sticky top-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Hamburger Menu Button */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  sidebarOpen
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title={
                  sidebarOpen ? "ファイルリストを隠す" : "ファイルリストを表示"
                }
              >
                <Menu size={18} />
              </button>
            )}
            {localActiveThreadTitle && (
              <>
                <Hash size={18} className="text-blue-400 shrink-0" />
                <h2
                  className="text-gray-100 font-bold text-sm leading-tight line-clamp-1 overflow-hidden"
                  title={localActiveThreadTitle}
                >
                  {localActiveThreadTitle}
                </h2>
              </>
            )}
          </div>

          {/* Settings Button */}
          <div className="relative shrink-0 flex items-center gap-2">
            <LogViewerSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setActiveSearchQuery={setActiveSearchQuery}
              searchHistory={searchHistory}
              searchHistoryIndex={searchHistoryIndex}
              setSearchHistoryIndex={setSearchHistoryIndex}
              showSearchDropdown={showSearchDropdown}
              setShowSearchDropdown={setShowSearchDropdown}
              addToHistory={addToHistory}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              showFilterMenu={showFilterMenu}
              setShowFilterMenu={setShowFilterMenu}
              setShowResultsPopup={setShowResultsPopup}
              handleSearchKeyDown={handleSearchKeyDown}
            />

            {/* NG Toggle Button */}
            <button
              data-panel-toggle="ng"
              onClick={() => {
                setShowNgPanel(!showNgPanel);
                if (!showNgPanel) setShowSettings(false); // Close settings if opening NG
              }}
              className={`p-2 rounded-lg transition-colors ${
                showNgPanel
                  ? "bg-red-600/20 text-red-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              title="NG管理"
            >
              <Ban size={20} />
            </button>

            {/* Settings Toggle Button */}
            <button
              data-panel-toggle="settings"
              onClick={() => {
                setShowSettings(!showSettings);
                if (!showSettings) setShowNgPanel(false); // Close NG if opening settings
              }}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              title="表示設定"
            >
              <Settings size={20} />
            </button>

            {/* Settings Panel */}
            {showSettings && (
              <LogViewerSettings
                settings={logSettings}
                onSettingsChange={handleSettingsChange}
                onClose={() => setShowSettings(false)}
                style={{ top: "100%", right: 0, marginTop: "0.5rem" }}
              />
            )}

            {/* NG Panel */}
            {showNgPanel && (
              <LogViewerNGPanel
                onClose={() => setShowNgPanel(false)}
                style={{ top: "100%", right: 0, marginTop: "0.5rem" }}
                ngSettings={ngSettings}
                removeNgId={removeNgId}
                removeNgComment={removeNgComment}
                allComments={allComments || comments}
                onIdClick={handleIdClick}
              />
            )}
          </div>
        </div>

        <CommentList
          key={selectedFileId} // Force remount when file changes for independent scroll
          ref={commentListRef}
          comments={filteredComments}
          activeCommentId={activeCommentId}
          RowComponent={LogCommentItemWrapper}
          indentSize={16}
          currentLogicalTime={currentLogicalTime}
          enableTreeView={logSettings.enableTreeView}
          showImages={logSettings.showImages}
          showThreadTitle={false}
          onCommentClick={onCommentClick}
          onSeekAndPlay={onSeekAndPlay}
          onAnchorClick={(e, resNum, sourceFileId) =>
            handleAnchorClick(e, resNum, sourceFileId, false)
          }
          onIdClick={handleIdClick}
          aaMode={logSettings.aaMode} // Pass AA Mode
          aaOverrideMap={aaOverrideMap} // Pass Override Map
          onToggleAA={onToggleAA}
          onAddNgId={onAddNgId}
          onAddNgComment={onAddNgComment}
          onSetLogStart={onSetLogStart}
          onSetCmStart={onSetCmStart}
          onSetCmEnd={onSetCmEnd}
          formatTime={customFormatTime}
          setZoomedImage={setZoomedImage}
          activeCommentRef={refToUse}
          isAutoScroll={false}
          setIsAutoScroll={() => {}}
          timeOffset={timeOffset}
          isPopupActive={popupStack.length > 0} // Pass isPopupActive to prevent context menu
          initialScrollIndex={initialScrollIndex}
          onScrollIndexChange={(index) => {
            currentScrollIndexRef.current = index;
          }}
          extraRowProps={{
            settings: logSettings,
            onReplyCountClick: handleReplyCountClick,
          }}
          debugId="logviewer"
        />

        {/* Center Filter/Search Results Popup */}
        <LogViewerSearchResults
          show={showResultsPopup}
          displayResults={displayResults}
          activeFilter={activeFilter}
          activeSearchQuery={activeSearchQuery}
          containerWidth={containerWidth}
          currentLogicalTime={currentLogicalTime}
          timeOffset={timeOffset}
          formatTime={customFormatTime}
          logSettings={logSettings}
          aaOverrideMap={aaOverrideMap}
          onClose={() => {
            setShowResultsPopup(false);
            setActiveFilter("none");
          }}
          onRowClick={(e, comment) => {
            e.stopPropagation();
            setLogContextMenu({
              x: e.clientX,
              y: e.clientY,
              comment: comment,
              fromSearch: true,
            });
          }}
          onIdClick={handleIdClick}
          onAnchorClick={(e, resNum, sourceFileId) =>
            handleAnchorClick(e, resNum, sourceFileId, false)
          }
          onReplyCountClick={handleReplyCountClick}
          setZoomedImage={setZoomedImage}
        />
      </div>

      {/* Active Popups Stack */}
      <LogViewerPopupStack
        popupStack={popupStack}
        formatTime={formatTime}
        timeOffset={timeOffset}
        logSettings={logSettings}
        aaOverrideMap={aaOverrideMap}
        containerWidth={containerWidth}
        containerLeft={containerLeft}
        filteredCommentsCount={filteredComments.length}
        onCloseAtIndex={closePopupAtIndex}
        onBackdropClick={clearPopups}
        onCloseAbove={closePopupsAbove}
        onPopupRowClick={handlePopupRowClick}
        onAnchorClick={handleAnchorClick}
        onReplyCountClick={handleReplyCountClick}
        onIdClick={handleIdClick}
        setZoomedImage={setZoomedImage}
      />

      {/* Context Menu (for Popup/Log) */}
      {logContextMenu && (
        <CommentContextMenu
          position={{ x: logContextMenu.x, y: logContextMenu.y }}
          comment={logContextMenu.comment}
          totalComments={filteredComments.length}
          onClose={() => setLogContextMenu(null)}
          onSeek={onSeekAndPlay}
          onJumpToComment={handleJumpToComment} // Implemented in this file
          onSetLogStart={onSetLogStart}
          onSetCmStart={onSetCmStart}
          onSetCmEnd={onSetCmEnd}
          onAddNgId={onAddNgId}
          onAddNgComment={onAddNgComment}
          onCopyId={(id) => navigator.clipboard.writeText(id)}
          onCopyComment={(text) => navigator.clipboard.writeText(text)}
          formatTime={formatTime}
          timeOffset={timeOffset}
          aaMode={logSettings.aaMode}
          aaOverride={aaOverrideMap[logContextMenu.comment.id]}
          onToggleAA={onToggleAA}
        />
      )}

      {/* Reuse UserHistoryModal if needed */}
      {userHistoryId && (
        <div
          className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setUserHistoryId(null)}
        >
          <div
            className="w-full max-w-3xl h-[85vh] bg-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <UserHistoryModal
              isSidebarMode={true}
              userId={userHistoryId}
              comments={allComments || comments} // Use unfiltered comments to allow viewing NG'd users
              onClose={() => setUserHistoryId(null)}
              onSeek={onSeekAndPlay}
              onAddNgId={onAddNgId}
              onAddNgComment={onAddNgComment}
              onSetLogStart={onSetLogStart}
              onSetCmStart={onSetCmStart}
              onSetCmEnd={onSetCmEnd}
              formatTime={formatTime}
              timeOffset={timeOffset}
              totalComments={filteredComments.length}
              className="h-full w-full"
              setZoomedImage={setZoomedImage}
              onAnchorClick={(e, resNum, sourceFileId) =>
                handleAnchorClick(e, resNum, sourceFileId, false)
              }
              RowComponent={LogCommentItem}
              settings={logSettings}
              currentLogicalTime={currentLogicalTime}
            />
          </div>
        </div>
      )}

      {/* Center Filter/Search Results Popup */}
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-200 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-full max-h-full rounded shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
export default LogViewer;
