import { Filter, Search, X } from 'lucide-react';
import React from 'react';

import LogCommentItem from '../ui/LogCommentItem';

/**
 * LogViewerSearchResults - 検索・フィルター結果のポップアップ
 */
const LogViewerSearchResults = ({
  show,
  displayResults,
  activeFilter,
  activeSearchQuery,
  containerWidth,
  currentLogicalTime,
  timeOffset,
  formatTime,
  logSettings,
  aaOverrideMap,
  onClose,
  onRowClick,
  onIdClick,
  onAnchorClick,
  onReplyCountClick,
  setZoomedImage,
}) => {
  if (!show) return null;

  const getTitle = () => {
    switch (activeFilter) {
      case 'image':
        return '画像付きコメント';
      case 'popular':
        return '人気のコメント（返信3件以上）';
      case 'url':
        return 'URLを含むコメント';
      case 'video':
        return '動画URLを含むコメント';
      case 'aa':
        return 'アスキーアート';
      default:
        return `「${activeSearchQuery}」の検索結果`;
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ width: containerWidth ? `${containerWidth * 0.95}px` : '100%', maxWidth: '95vw' }}
      >
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {activeFilter !== 'none' ? (
              <Filter size={18} className="text-blue-400" />
            ) : (
              <Search size={18} className="text-blue-400" />
            )}
            <span className="font-bold text-white">{getTitle()}</span>
            <span className="text-sm text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
              {displayResults.length}件
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto bg-gray-900">
          {displayResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {activeFilter !== 'none' ? (
                <Filter size={32} className="mx-auto mb-3 opacity-50" />
              ) : (
                <Search size={32} className="mx-auto mb-3 opacity-50" />
              )}
              <p>結果が見つかりませんでした</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {displayResults.map((comment) => (
                <div
                  key={comment.id}
                  className="hover:bg-gray-800/30 cursor-pointer transition-colors"
                  onClick={(e) => onRowClick(e, comment)}
                >
                  <LogCommentItem
                    comment={comment}
                    isActive={false}
                    isHighlighted={false}
                    currentLogicalTime={currentLogicalTime}
                    timeOffset={timeOffset}
                    formatTime={formatTime}
                    totalComments={displayResults.length}
                    onIdClick={onIdClick}
                    onAnchorClick={onAnchorClick}
                    showImages={logSettings.showImages}
                    setZoomedImage={setZoomedImage}
                    depth={0}
                    settings={logSettings}
                    onReplyCountClick={onReplyCountClick}
                    aaOverride={aaOverrideMap[comment.id]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewerSearchResults;
