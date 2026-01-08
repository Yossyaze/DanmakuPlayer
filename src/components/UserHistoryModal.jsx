import { Calendar, X } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import CommentContextMenu from './ui/CommentContextMenu';
import CommentItem from './ui/CommentItem';

const UserHistoryModal = ({
  userId,
  comments, // Expected to be the full list or visible list
  onClose,
  onSeek,
  onAddNgId,
  onAddNgComment,
  onSetLogStart,
  onSetCmStart,
  onSetCmEnd,
  formatTime,
  timeOffset = 0,
  totalComments, // Pass total to calculate ratio correctly
  isSidebarMode = false,
  className = '',
  setZoomedImage,
  onAnchorClick,
  onAnchorMouseEnter,
  onAnchorMouseLeave,
  isPopupActive = false, // New prop
  settings = {}, // Allow passing settings
  currentTime, // Add currentTime for LogCommentItem
  RowComponent = null, // Optional custom row component (e.g., LogCommentItem)
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const containerRef = useRef(null);

  // Filter comments by userId and enrich with userIndex/userTotal
  const userComments = useMemo(() => {
    const filtered = comments.filter((c) => c.userId === userId).sort((a, b) => a.time - b.time);
    // Add userIndex and userTotal for ID color/count display
    const userTotal = filtered.length;
    return filtered.map((c, index) => ({
      ...c,
      userIndex: index + 1,
      userTotal: userTotal,
    }));
  }, [comments, userId]);

  // Handle background click to close modal
  const handleBackgroundClick = (e) => {
    if (!isSidebarMode && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRowClick = (e, comment) => {
    // If popup is active, don't open context menu. Just allow propagation to close popup.
    if (isPopupActive) return;

    // e.stopPropagation(); // Removed to allow click-outside detection
    setContextMenu({
      x: e.clientX, // Keep x/y for potential future use, though currently unused by CommentContextMenu
      y: e.clientY,
      comment,
    });
  };

  // --- Sidebar Mode ---
  if (isSidebarMode) {
    return (
      <div
        ref={containerRef}
        className={`flex flex-col bg-gray-900 border-l border-gray-700 ${className}`}
        onClick={handleBackgroundClick} // Technically unnecessary if isSidebarMode checks logic, but safe
      >
        {/* Header (Sidebar style) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0 bg-gray-800/80">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">ID: {userId}</h2>
              <span className="text-gray-400 text-xs truncate">({userComments.length})</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto w-full p-0 scrollbar-thin scrollbar-thumb-gray-700">
          {userComments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">投稿が見つかりませんでした</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {userComments.map((comment, index) => {
                const ItemComponent = RowComponent || CommentItem;
                return (
                  <ItemComponent
                    key={`${comment.id}-${index}`}
                    comment={comment}
                    formatTime={formatTime}
                    timeOffset={timeOffset}
                    totalComments={totalComments}
                    onClick={(e) => handleRowClick(e, comment)}
                    // Context menu check for bg color
                    className={`${contextMenu?.comment?.id === comment.id ? 'bg-gray-800!' : ''}`}
                    onIdClick={undefined}
                    setZoomedImage={setZoomedImage}
                    showImages={settings.showImages !== false}
                    onAnchorClick={onAnchorClick}
                    onAnchorMouseEnter={onAnchorMouseEnter}
                    onAnchorMouseLeave={onAnchorMouseLeave}
                    settings={settings} // Pass settings
                    currentTime={currentTime} // Pass currentTime
                    depth={0}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Local Context Menu */}
        {contextMenu && (
          <div className="fixed inset-0 z-100 pointer-events-none">
            <CommentContextMenu
              comment={contextMenu.comment}
              onClose={() => setContextMenu(null)}
              onSeek={(time) => {
                onSeek(time);
                setContextMenu(null);
              }}
              onSetLogStart={(c) => {
                onSetLogStart?.(c);
                setContextMenu(null);
              }}
              onSetCmStart={(t) => {
                onSetCmStart?.(t);
                setContextMenu(null);
              }}
              onSetCmEnd={(t) => {
                onSetCmEnd?.(t);
                setContextMenu(null);
              }}
              onAddNgId={(id) => {
                onAddNgId(id);
                setContextMenu(null);
              }}
              onAddNgComment={(txt) => {
                onAddNgComment(txt);
                setContextMenu(null);
              }}
              formatTime={formatTime}
              timeOffset={timeOffset}
              totalComments={totalComments}
              onCopyId={(id) => navigator.clipboard.writeText(id)}
              onCopyComment={(text) => navigator.clipboard.writeText(text)}
            />
          </div>
        )}
      </div>
    );
  }

  // --- Modal Mode (Legacy) ---
  return (
    <div
      className="fixed inset-0 z-100 bg-black/80 flex items-center justify-center p-4"
      onClick={handleBackgroundClick}
    >
      <div
        ref={containerRef}
        className="bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-lg shadow-2xl border border-gray-700 flex flex-col relative"
      >
        {/* Header (Modal style) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>ID: {userId}</span>
              <span className="text-gray-400 text-sm font-normal">
                の投稿一覧 ({userComments.length}件)
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-700">
          {userComments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">投稿が見つかりませんでした</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {userComments.map((comment, index) => {
                const ItemComponent = RowComponent || CommentItem;
                return (
                  <ItemComponent
                    key={`${comment.id}-${index}`}
                    comment={comment}
                    formatTime={formatTime}
                    timeOffset={timeOffset}
                    totalComments={totalComments}
                    onClick={(e) => handleRowClick(e, comment)}
                    className={`px-6 py-3 ${
                      contextMenu?.comment?.id === comment.id ? 'bg-gray-800!' : ''
                    }`}
                    setZoomedImage={setZoomedImage}
                    showImages={settings.showImages !== false}
                    onAnchorClick={onAnchorClick}
                    onAnchorMouseEnter={onAnchorMouseEnter}
                    onAnchorMouseLeave={onAnchorMouseLeave}
                    settings={settings}
                    currentTime={currentTime}
                    depth={0}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Local Context Menu */}
        {contextMenu && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <CommentContextMenu
              comment={contextMenu.comment}
              onClose={() => setContextMenu(null)}
              onSeek={(time) => {
                onSeek(time);
                setContextMenu(null);
              }}
              onSetLogStart={(c) => {
                onSetLogStart?.(c);
                setContextMenu(null);
              }}
              onSetCmStart={(t) => {
                onSetCmStart?.(t);
                setContextMenu(null);
              }}
              onSetCmEnd={(t) => {
                onSetCmEnd?.(t);
                setContextMenu(null);
              }}
              onAddNgId={(id) => {
                onAddNgId(id);
                setContextMenu(null);
              }}
              onAddNgComment={(txt) => {
                onAddNgComment(txt);
                setContextMenu(null);
              }}
              formatTime={formatTime}
              timeOffset={timeOffset}
              totalComments={totalComments}
              onCopyId={(id) => navigator.clipboard.writeText(id)}
              onCopyComment={(text) => navigator.clipboard.writeText(text)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHistoryModal;
