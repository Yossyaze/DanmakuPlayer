import React, { useRef, useLayoutEffect } from "react";
import { X } from "lucide-react";
import LogCommentItem from "./LogCommentItem";

const ReplyListPopup = ({
  comments = [],
  parentComment,
  position,
  formatTime,
  timeOffset,
  settings,
  setZoomedImage,
  onClose,
  onPopupClick, // Click this popup -> close layers above
  isTopmost = true, // Only topmost popup allows context menu
  onClick, // Click on row -> open context menu
  onAnchorClick,
  RowComponent = LogCommentItem,
  totalComments,
  onIdClick,
  onReplyCountClick,
  popupClassName = "",
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
          x = Math.max(
            10,
            Math.min(position.x, window.innerWidth - rect.width - 20)
          );
        }
      } else {
        if (y + rect.height + 10 > window.innerHeight) {
          y = Math.max(10, window.innerHeight - rect.height - 10);
        } else {
          y = position.y + 10;
        }

        if (x + rect.width + 10 > window.innerWidth) {
          x = window.innerWidth - rect.width - 20;
        } else {
          x = position.x + 10;
        }
      }

      if (x < minX) x = minX;
      if (y < 0) y = 10;

      popupRef.current.style.top = `${y}px`;
      popupRef.current.style.left = `${x}px`;
    }
  }, [position, parentRect, comments.length, minX, customWidth]);

  return (
    <div
      ref={popupRef}
      className={`fixed bg-gray-900 border border-gray-600 rounded shadow-2xl animate-fade-in pointer-events-auto flex flex-col max-h-[60vh] ${
        !customWidth && !popupClassName ? "w-96" : ""
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
      <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span>
            Replies: &gt;&gt;
            {parentComment?.originalResNum || parentComment?.resNum}
          </span>
          <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
            {comments.length}件
          </span>
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

      <div className="overflow-y-auto scrollbar-thin p-1">
        {comments.map((comment, index) => {
          const prevDepth = index > 0 ? comments[index - 1].depth || 0 : 0;
          const currentDepth = comment.depth || 0;
          const depthDecrease = prevDepth - currentDepth;

          return (
            <React.Fragment key={comment.id}>
              {depthDecrease > 0 && index > 0 && (
                <div
                  className="border-t border-gray-700"
                  style={{ marginLeft: `${currentDepth * 16}px` }}
                />
              )}
              <RowComponent
                comment={comment}
                depth={currentDepth}
                formatTime={formatTime}
                timeOffset={timeOffset}
                settings={{ ...settings, density: "compact" }}
                className="bg-gray-900 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800"
                onClick={
                  isTopmost ? (e) => onClick && onClick(e, comment) : undefined
                }
                setZoomedImage={setZoomedImage}
                onAnchorClick={onAnchorClick}
                onReplyCountClick={onReplyCountClick}
                onIdClick={onIdClick}
                totalComments={totalComments}
                aaOverride={aaOverrideMap[comment.id]}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ReplyListPopup;
