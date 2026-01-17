import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Ban,
  Clock,
  Copy,
  FileImage,
  Play,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { isProbablyAA } from '../../utils/aaUtils';
import CommentItem from './CommentItem';

const CommentContextMenu = ({
  comment,
  onClose,
  onSeek,
  onSetLogStart,
  onSetCmStart,
  onSetCmEnd,
  onSetEndCardPreview,
  onAddNgId,
  onAddNgComment,
  onCopyId,
  onCopyComment,
  formatTime,
  logStartTime = 0,
  totalComments = 0,
  onJumpToComment,
  onToggleAA,
  aaMode,
  aaOverride,
  maxWidth, // 新規: 最大横幅（ピクセル値）
}) => {
  const menuRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('contextmenu', handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, [onClose]);

  // Calculate current AA state to show correct label
  const isAA = React.useMemo(() => {
    if (aaOverride === true) return true;
    if (aaOverride === false) return false;
    if (aaMode === 'off') return false;
    return isProbablyAA(comment.text);
  }, [comment.text, aaMode, aaOverride]);

  return (
    <div className="fixed inset-0 z-100 pointer-events-none overflow-hidden">
      {/* Backdrop removed to allow scroll-through */}

      <div
        ref={menuRef}
        className={`absolute bottom-0 bg-gray-800 border-t border-gray-700 shadow-2xl animate-slide-up pointer-events-auto no-scroll-lock ${maxWidth ? 'right-0' : 'left-0'}`}
        style={
          maxWidth
            ? { width: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }
            : { width: '100%' }
        }
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()} // Prevent auto-scroll disable logic in CommentList
      >
        <div className="bg-gray-900 border-b border-gray-700 border-l-4 border-l-blue-500">
          <CommentItem
            comment={comment}
            formatTime={formatTime}
            logStartTime={logStartTime}
            totalComments={totalComments}
            className="border-none" // Remove border-b as container handles it
          />
        </div>

        {/* Content Container */}
        {maxWidth ? (
          // Standard Sidebar Single Column Layout
          // Standard Sidebar 2-Column Grid Layout with borders
          // Standard Sidebar 2-Column Grid Layout with borders and colors
          <div className="p-2 grid grid-cols-2 gap-2">
            <button
              className={`w-full text-left px-3 py-2 text-sm text-gray-200 bg-blue-900/40 border border-blue-800 hover:bg-blue-600 hover:text-white hover:border-blue-500 flex items-center gap-2 transition-colors active:bg-blue-700 rounded shadow-sm ${
                !onJumpToComment ? 'col-span-2' : ''
              }`}
              onClick={() => {
                onSeek(comment.time);
                onClose();
              }}
            >
              <Play size={16} className="shrink-0 text-blue-400 group-hover:text-white" />
              <span className="truncate text-xs font-medium">この時間に移動</span>
            </button>
            {onJumpToComment && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-blue-900/40 border border-blue-800 hover:bg-blue-600 hover:text-white hover:border-blue-500 flex items-center gap-2 transition-colors active:bg-blue-700 rounded shadow-sm"
                onClick={() => {
                  onJumpToComment(comment);
                  onClose();
                }}
              >
                <ArrowRightToLine
                  size={16}
                  className="rotate-90 shrink-0 text-blue-400 group-hover:text-white"
                />
                <span className="truncate text-xs font-medium">このコメントへ移動</span>
              </button>
            )}

            <div className="col-span-2 h-px bg-gray-700 my-1" />

            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => {
                if (onCopyComment) onCopyComment(comment.text);
                onClose();
              }}
            >
              <Copy size={16} className="text-gray-400 shrink-0" />
              <span className="truncate text-xs">本文をコピー</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => {
                if (onCopyId) onCopyId(comment.userId);
                onClose();
              }}
            >
              <Copy size={16} className="text-gray-400 shrink-0" />
              <span className="truncate text-xs">IDをコピー</span>
            </button>

            <div className="col-span-2 h-px bg-gray-700 my-1" />

            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => {
                if (onToggleAA) onToggleAA(comment, isAA);
                onClose();
              }}
            >
              <Type size={16} className={isAA ? 'text-blue-400' : 'text-gray-400'} />
              <span className="truncate text-xs">{isAA ? 'AA表示 (ON)' : 'AA表示 (OFF)'}</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => onSetLogStart(comment)}
            >
              <Clock size={16} className="text-yellow-500 shrink-0" />
              <span className="truncate text-xs">ログ開始時間に設定</span>
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => onSetCmStart(comment.time)}
            >
              <ArrowRightToLine size={16} className="text-green-500 shrink-0" />
              <span className="truncate text-xs">CM開始時間にセット</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => onSetCmEnd(comment.time)}
            >
              <ArrowLeftToLine size={16} className="text-red-500 shrink-0" />
              <span className="truncate text-xs">CM終了時間にセット</span>
            </button>

            <button
              className="col-span-2 w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center gap-2 transition-colors active:bg-gray-600 rounded shadow-sm"
              onClick={() => {
                if (onSetEndCardPreview) onSetEndCardPreview(comment.time);
                onClose();
              }}
            >
              <FileImage size={16} className="text-purple-500 shrink-0" />
              <span className="truncate text-xs">エンドカード予告開始時間に設定</span>
            </button>

            <div className="col-span-2 h-px bg-gray-700 my-1" />

            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-red-900/20 border border-red-900/40 hover:bg-red-900/60 hover:text-white hover:border-red-600 flex items-center gap-2 transition-colors active:bg-red-900/80 rounded shadow-sm"
              onClick={() => {
                if (
                  window.confirm(
                    `ID:${comment.userId} をNGに追加しますか？\nこのIDの書き込みが表示されなくなります。`
                  )
                ) {
                  onAddNgId(comment.userId);
                  onClose();
                }
              }}
            >
              <Ban size={16} className="text-red-400 shrink-0" />
              <span className="truncate text-xs">ID NG追加</span>
            </button>
            <button
              className="w-full text-left px-3 py-2.5 text-sm text-gray-200 bg-red-900/20 border border-red-900/40 hover:bg-red-900/60 hover:text-white hover:border-red-600 flex items-center gap-2 transition-colors active:bg-red-900/80 rounded shadow-sm"
              onClick={() => {
                if (window.confirm('このコメントをNGに追加しますか？')) {
                  onAddNgComment(comment.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={16} className="text-red-400 shrink-0" />
              <span className="truncate text-xs">コメNG追加</span>
            </button>

            <div className="col-span-2 h-px bg-gray-700 my-1" />

            <button
              className="col-span-2 w-full text-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600 rounded transition-colors"
              onClick={onClose}
            >
              <span className="truncate text-xs font-bold">閉じる</span>
            </button>
            <div className="col-span-2 h-1"></div>
          </div>
        ) : (
          // Wide Mode (Grid Layout)
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1.2fr_0.4fr] gap-4">
            {/* Column 1: Navigation & Copy */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">
                操作・コピー
              </h3>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/50 hover:bg-blue-600 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => {
                  onSeek(comment.time);
                  onClose();
                }}
              >
                <Play size={16} />
                <span>この時間に移動</span>
              </button>
              {onJumpToComment && (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/50 hover:bg-blue-600 hover:text-white rounded flex items-center gap-3 transition-colors"
                  onClick={() => {
                    onJumpToComment(comment);
                    onClose();
                  }}
                >
                  <ArrowRightToLine size={16} className="rotate-90" />
                  <span>このコメントへ移動</span>
                </button>
              )}
              <div className="h-px bg-gray-700 my-1" />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-2 transition-colors"
                  onClick={() => {
                    if (onCopyComment) onCopyComment(comment.text);
                    onClose();
                  }}
                >
                  <Copy size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate">本文をコピー</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-2 transition-colors"
                  onClick={() => {
                    if (onCopyId) onCopyId(comment.userId);
                    onClose();
                  }}
                >
                  <Copy size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate">IDをコピー</span>
                </button>
              </div>
            </div>

            {/* Column 2: Time Settings */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">
                同期設定
              </h3>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => onSetLogStart(comment)}
              >
                <Clock size={16} className="text-yellow-500" />
                <span>ログ開始時間に設定</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-2 transition-colors"
                  onClick={() => onSetCmStart(comment.time)}
                >
                  <ArrowRightToLine size={16} className="text-green-500 shrink-0" />
                  <span className="truncate">CM開始時間にセット</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-2 transition-colors"
                  onClick={() => onSetCmEnd(comment.time)}
                >
                  <ArrowLeftToLine size={16} className="text-red-500 shrink-0" />
                  <span className="truncate">CM終了時間にセット</span>
                </button>
              </div>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => {
                  if (onSetEndCardPreview) onSetEndCardPreview(comment.time);
                  onClose();
                }}
              >
                <FileImage size={16} className="text-purple-500" />
                <span>予告開始時間に設定</span>
              </button>
            </div>

            {/* Column 3: Display & NG */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">
                表示・NG
              </h3>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-gray-700/30 hover:bg-gray-600 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => {
                  if (onToggleAA) onToggleAA(comment, isAA);
                  onClose();
                }}
              >
                <Type size={16} className={isAA ? 'text-blue-400' : 'text-gray-400'} />
                <span>{isAA ? 'AA表示 (ON)' : 'AA表示 (OFF)'}</span>
              </button>
              <div className="h-px bg-gray-700 my-1" />
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-red-900/20 hover:bg-red-900/50 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => {
                  if (
                    window.confirm(
                      `ID:${comment.userId} をNGに追加しますか？\nこのIDの書き込みが表示されなくなります。`
                    )
                  ) {
                    onAddNgId(comment.userId);
                    onClose();
                  }
                }}
              >
                <Ban size={16} className="text-red-400" />
                <span>このIDをNGに追加</span>
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 bg-red-900/20 hover:bg-red-900/50 hover:text-white rounded flex items-center gap-3 transition-colors"
                onClick={() => {
                  if (window.confirm('このコメントをNGに追加しますか？')) {
                    onAddNgComment(comment.id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={16} className="text-red-400" />
                <span>このコメントをNGに追加</span>
              </button>
            </div>

            {/* Column 4: Close / Spacer */}
            <div className="flex flex-col justify-end">
              <button
                className="w-full text-center px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white rounded border border-gray-700 transition-colors"
                onClick={onClose}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentContextMenu;
