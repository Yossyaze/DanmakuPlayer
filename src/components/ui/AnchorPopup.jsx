import { X } from 'lucide-react';
import React, { useLayoutEffect, useRef } from 'react';

import LogCommentItem from './LogCommentItem';

const AnchorPopup = ({
  comment,
  position,
  formatTime,
  logStartTime,
  settings,
  setZoomedImage,
  onClose,
  onPopupClick, // Click this popup -> close layers above
  isTopmost = true, // Only topmost popup allows context menu
  onClick,
  RowComponent = LogCommentItem,
  totalComments,
  onAnchorClick,
  onReplyCountClick,
  onIdClick,
  popupClassName = '',
  customWidth,
  parentRect,
  style = {},
  minX = 10,
  aaOverrideMap = {},
}) => {
  const popupRef = useRef(null);

  useLayoutEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      let { x, y } = position;

      const spacing = 4;
      if (parentRect) {
        if (parentRect.bottom + rect.height + spacing <= window.innerHeight) {
          y = parentRect.bottom + spacing;
        } else if (parentRect.top - rect.height - spacing >= 0) {
          y = parentRect.top - rect.height - spacing;
        } else {
          y = Math.max(10, window.innerHeight - rect.height - 10);
        }

        if (customWidth) {
          x = minX;
        } else {
          x = Math.max(10, Math.min(position.x, window.innerWidth - rect.width - 20));
        }
      } else {
        if (y + rect.height + 10 > window.innerHeight) {
          y = Math.max(10, position.y - rect.height - 10);
        } else {
          y = position.y + 10;
        }

        if (x + rect.width + 10 > window.innerWidth) {
          x = window.innerWidth - rect.width - 20;
        } else {
          x = position.x + 10;
        }
      }

      if (y < 0) y = 10;
      if (x < minX) x = minX;

      popupRef.current.style.top = `${y}px`;
      popupRef.current.style.left = `${x}px`;
    }
  }, [position, parentRect, minX, customWidth]);

  return (
    <div
      ref={popupRef}
      className={`fixed bg-gray-900 border border-gray-600 rounded shadow-2xl animate-fade-in pointer-events-auto ${
        !customWidth && !popupClassName ? 'w-96' : ''
      } ${popupClassName}`}
      style={{
        top: position.y,
        left: position.x,
        width: customWidth ? `${customWidth}px` : undefined,
        zIndex: style.zIndex || 70,
        ...style,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onPopupClick && onPopupClick();
      }}
    >
      <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center select-none">
        <div className="flex gap-2">
          <span>Ref: {comment.originalResNum || comment.resNum}</span>
          <span>{comment.sourceFileId}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose && onClose();
          }}
          className="p-0.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <RowComponent
        comment={comment}
        formatTime={formatTime}
        logStartTime={logStartTime}
        settings={{ ...settings, density: 'compact' }}
        className="bg-gray-900 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800"
        onClick={isTopmost ? onClick : undefined}
        onAnchorClick={onAnchorClick}
        onReplyCountClick={onReplyCountClick}
        onIdClick={onIdClick}
        setZoomedImage={setZoomedImage}
        totalComments={totalComments}
        aaOverride={aaOverrideMap[comment.id]}
      />
    </div>
  );
};

export default AnchorPopup;
