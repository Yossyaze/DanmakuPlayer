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
        className="absolute bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 shadow-2xl animate-slide-up pointer-events-auto no-scroll-lock"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()} // Prevent auto-scroll disable logic in CommentList
      >
        <div className="bg-gray-950 border-b border-gray-700 border-l-4 border-l-blue-500">
          <CommentItem
            comment={comment}
            formatTime={formatTime}
            logStartTime={logStartTime}
            totalComments={totalComments}
            className="border-none" // Remove border-b as container handles it
          />
        </div>

        <div className="py-2 space-y-1">
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-3 transition-colors active:bg-blue-700"
            onClick={() => {
              onSeek(comment.time);
              onClose();
            }}
          >
            <Play size={16} />
            <span>この時間に移動する</span>
          </button>
          {onJumpToComment && (
            <button
              className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-3 transition-colors active:bg-blue-700"
              onClick={() => {
                onJumpToComment(comment);
                onClose();
              }}
            >
              <ArrowRightToLine size={16} className="rotate-90" />
              <span>このレスの場所へ移動</span>
            </button>
          )}
          <div className="h-px bg-gray-700 mx-2 my-1" />
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => {
              if (onCopyComment) onCopyComment(comment.text);
              onClose();
            }}
          >
            <Copy size={16} className="text-gray-400" />
            <span>コメントをコピー</span>
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => {
              if (onCopyId) onCopyId(comment.userId);
              onClose();
            }}
          >
            <Copy size={16} className="text-gray-400" />
            <span>IDをコピー</span>
          </button>
          <div className="h-px bg-gray-700 mx-2 my-1" />
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => {
              if (onToggleAA) onToggleAA(comment, isAA);
              onClose();
            }}
          >
            <Type size={16} className={isAA ? 'text-blue-400' : 'text-gray-400'} />
            <span>{isAA ? 'AA表示OFF' : 'AA表示ON'}</span>
          </button>
          <div className="h-px bg-gray-700 mx-2 my-1" />
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => onSetLogStart(comment)}
          >
            <Clock size={16} className="text-yellow-500" />
            <span>ログ開始時間に設定</span>
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => onSetCmStart(comment.time)}
          >
            <ArrowRightToLine size={16} className="text-green-500" />
            <span>CM開始時間に設定</span>
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => onSetCmEnd(comment.time)}
          >
            <ArrowLeftToLine size={16} className="text-red-500" />
            <span>CM終了時間に設定</span>
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={() => {
              if (onSetEndCardPreview) onSetEndCardPreview(comment.time);
              onClose();
            }}
          >
            <FileImage size={16} className="text-purple-500" />
            <span>予告開始時間に設定</span>
          </button>
          <div className="h-px bg-gray-700 mx-2 my-1" />
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-red-900/50 hover:text-white flex items-center gap-3 transition-colors active:bg-red-900/70"
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
            <Ban size={16} className="text-gray-400" />
            <span>このIDをNGに追加</span>
          </button>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-red-900/50 hover:text-white flex items-center gap-3 transition-colors active:bg-red-900/70"
            onClick={() => {
              if (window.confirm('このコメントをNGに追加しますか？')) {
                onAddNgComment(comment.id);
                onClose();
              }
            }}
          >
            <Trash2 size={16} className="text-gray-400" />
            <span>このコメントをNGに追加</span>
          </button>
          <div className="h-px bg-gray-700 mx-2 my-1" />
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors active:bg-gray-600"
            onClick={onClose}
          >
            <X size={16} />
            <span>閉じる</span>
          </button>
          {/* Spacer for bottom safe area on mobile if needed, though this is desktop app mostly */}
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
};

export default CommentContextMenu;
