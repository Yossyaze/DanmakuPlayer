import { MessageCircle } from 'lucide-react';
import React from 'react';

import { isProbablyAA } from '../../utils/aaUtils';
import { formatTime as defaultFormatTime } from '../../utils/danmakuUtils';
import CommentContent from './CommentContent';

const CommentItem = ({
  comment,
  formatTime = defaultFormatTime,
  timeOffset = 0,
  totalComments = 0,
  onIdClick,
  onAnchorClick,
  onAnchorMouseEnter, // New prop
  onAnchorMouseLeave, // New prop
  onUrlLoad,
  onReplyCountClick, // Re-add
  onClick,
  isActive = false,
  isHighlighted = false,
  currentTime,
  depth = 0,
  rootTime, // Time of the root comment in tree view
  showImages = true,
  setZoomedImage,
  className = '',
  isLogMode = false,
  aaMode = 'auto', // 'auto' | 'off'
  aaOverride, // true=Forced ON, false=Forced OFF, undefined=Auto
  abeMode = false, // 安倍晋三モード
}) => {
  // Calculate ID color
  let idColorClass = 'text-gray-400'; // Default (1 comment)
  if (comment.userTotal && comment.userTotal > 1 && totalComments > 0) {
    const percentage = (comment.userTotal / totalComments) * 100;
    if (percentage >= 0.5) {
      idColorClass = 'text-red-400';
    } else if (percentage >= 0.25) {
      idColorClass = 'text-green-400';
    } else {
      idColorClass = 'text-blue-400';
    }
  }

  // In tree view mode (rootTime provided), use rootTime for the past/future calculation
  // This ensures descendants are marked as "played" when their root is played
  const effectiveTime = rootTime !== undefined ? rootTime : comment.time;
  const isFuture =
    !isLogMode && currentTime !== undefined && effectiveTime > currentTime;
  const shouldHighlightActive = !isLogMode && isActive;

  // AA Logic
  const isAA = React.useMemo(() => {
    if (aaOverride === true) return true;
    if (aaOverride === false) return false;
    if (aaMode === 'off') return false;
    // Use pre-calculated status if available
    return comment.isKnownAA !== undefined ? comment.isKnownAA : isProbablyAA(comment.text);
  }, [comment.text, comment.isKnownAA, aaMode, aaOverride]);

  return (
    <div
      id={`comment-${comment.id}`}
      onClick={(e) => onClick && onClick(e, comment)}
      className={`comment-item-row cursor-pointer transition-colors duration-200 ${
        shouldHighlightActive
          ? 'bg-blue-600/20'
          : isHighlighted
            ? 'bg-yellow-500/20'
            : isFuture
              ? 'opacity-40 grayscale-50'
              : 'hover:bg-gray-800/60'
      } ${isLogMode ? 'text-base py-3 px-3' : 'text-sm py-1 px-2'} ${className}`}
      style={{
        marginLeft: depth > 0 ? `${depth * (isLogMode ? 16 : 12)}px` : '0',
        borderLeft: depth > 0 ? '2px solid #374151' : 'none',
        paddingLeft: depth > 0 ? (isLogMode ? '12px' : '8px') : '',
      }}
    >
      <div className="flex gap-2">
        {/* Time & Date (Left Column) - 3 rows: video time, date, log time */}
        <div className="flex flex-col items-end shrink-0 w-12">
          <span className="text-blue-400 font-mono text-[9px] whitespace-nowrap">
            {formatTime(comment.time - timeOffset)}
          </span>
          <span className="text-gray-600 font-mono text-[9px] whitespace-nowrap">
            {(() => {
              // Extract date part: "2025/12/31(火)" -> "12/31(火)"
              const match = comment.dateDisplay?.match(/(\d{1,2})\/(\d{1,2})(\([^)]+\))/);
              if (match) return `${match[1]}/${match[2]}${match[3]}`;
              return '';
            })()}
          </span>
          <span className="text-gray-500 font-mono text-[9px] whitespace-nowrap">
            {comment.dateDisplay?.split(' ')[1]?.split('.')[0] || ''}
          </span>
        </div>

        {/* Content (Right Column) */}
        <div className="flex-1 min-w-0">
          {/* Header: ResNum Name ID */}
          <div className="text-[10px] text-gray-400 flex justify-between gap-2 mb-0.5 items-baseline">
            <span className="flex items-center gap-1 min-w-0 flex-1">
              <span className="font-bold shrink-0">
                {comment.originalResNum || comment.resNum}:
              </span>
              {comment.replyCount > 0 && (
                <span
                  className="reply-count-indicator flex items-center gap-0.5 text-blue-400 cursor-pointer hover:bg-blue-600/20 px-0.5 rounded transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplyCountClick && onReplyCountClick(e, comment);
                  }}
                  title={`${comment.replyCount}件の返信`}
                >
                  <MessageCircle size={10} className="fill-blue-400/20" />
                  <span className="text-[9px] font-bold">{comment.replyCount}</span>
                </span>
              )}
              <span className="text-gray-500 truncate ml-1 flex-1">{comment.name}</span>
            </span>
            <span></span>
            <span
              className={`${idColorClass} hover:underline cursor-pointer whitespace-nowrap shrink-0 ml-2`}
              onClick={(e) => {
                e.stopPropagation();
                if (onIdClick) onIdClick(comment.userId);
              }}
            >
              ID:{comment.userId}
              {comment.userIndex && comment.userTotal && (
                <span className="ml-1">
                  ({comment.userIndex}/{comment.userTotal})
                </span>
              )}
            </span>
          </div>
          {/* Body */}
          <div
            className={`text-white break-all whitespace-pre-wrap text-sm leading-snug ${
              isAA ? 'font-aa text-[12px]' : ''
            }`}
          >
            <CommentContent
              text={comment.text}
              comment={comment}
              onAnchorClick={onAnchorClick}
              onAnchorMouseEnter={onAnchorMouseEnter}
              onAnchorMouseLeave={onAnchorMouseLeave}
              onUrlLoad={onUrlLoad}
              showImages={showImages}
              setZoomedImage={setZoomedImage}
              abeMode={abeMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CommentItem);
