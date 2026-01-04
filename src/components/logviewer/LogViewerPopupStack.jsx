import React from 'react';

import AnchorPopup from '../ui/AnchorPopup';
import LogCommentItem from '../ui/LogCommentItem';
import ReplyListPopup from '../ui/ReplyListPopup';

/**
 * LogViewerPopupStack - アンカー/返信ポップアップのスタック管理
 */
const LogViewerPopupStack = ({
  popupStack,
  formatTime,
  timeOffset,
  logSettings,
  aaOverrideMap,
  containerWidth,
  containerLeft = 0,
  filteredCommentsCount,
  onCloseAtIndex, // Close popup at specific index (for X button)
  onBackdropClick, // Click outside popups -> clear all
  onCloseAbove, // Click on lower layer popup -> close layers above
  onPopupRowClick,
  onAnchorClick,
  onReplyCountClick,
  onIdClick,
  setZoomedImage,
}) => {
  if (popupStack.length === 0) return null;

  // Base z-index for the first popup is 60
  const baseZIndex = 60;

  return (
    <>
      {/* Single backdrop for all popups - z-index below all popups */}
      <div
        className="fixed inset-0 bg-black/0 cursor-default"
        style={{ zIndex: baseZIndex - 1 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onBackdropClick && onBackdropClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBackdropClick && onBackdropClick();
        }}
      />

      {/* Popup stack */}
      {popupStack.map((popup, index) =>
        popup.type === 'anchor' ? (
          <AnchorPopup
            key={`${index}-${popup.comment.id}`}
            comment={popup.comment}
            position={popup.position}
            parentRect={popup.parentRect}
            onClose={() => onCloseAtIndex && onCloseAtIndex(index)}
            onPopupClick={() => onCloseAbove && onCloseAbove(index)}
            isTopmost={index === popupStack.length - 1}
            onClick={(e) => onPopupRowClick(e, popup.comment)}
            formatTime={formatTime}
            timeOffset={timeOffset}
            settings={logSettings}
            setZoomedImage={setZoomedImage}
            onAnchorClick={(e, resNum, sourceFileId) =>
              onAnchorClick(e, resNum, sourceFileId, true)
            }
            onReplyCountClick={(e, c) => onReplyCountClick(e, c, true)}
            onIdClick={onIdClick}
            totalComments={filteredCommentsCount}
            customWidth={containerWidth - 10 * (index + 1)}
            style={{ zIndex: baseZIndex + index * 10 }}
            minX={containerLeft + 10 * (index + 1)}
            aaOverrideMap={aaOverrideMap}
            RowComponent={LogCommentItem}
          />
        ) : (
          <ReplyListPopup
            key={`${index}-${popup.comment.id}`}
            comments={popup.replies}
            parentComment={popup.comment}
            position={popup.position}
            parentRect={popup.parentRect}
            onClose={() => onCloseAtIndex && onCloseAtIndex(index)}
            onPopupClick={() => onCloseAbove && onCloseAbove(index)}
            isTopmost={index === popupStack.length - 1}
            onClick={onPopupRowClick}
            formatTime={formatTime}
            timeOffset={timeOffset}
            settings={logSettings}
            setZoomedImage={setZoomedImage}
            onAnchorClick={(e, resNum, sourceFileId) =>
              onAnchorClick(e, resNum, sourceFileId, true)
            }
            onReplyCountClick={(e, c) => onReplyCountClick(e, c, true)}
            onIdClick={onIdClick}
            totalComments={filteredCommentsCount}
            customWidth={containerWidth - 10 * (index + 1)}
            style={{ zIndex: baseZIndex + index * 10 }}
            minX={containerLeft + 10 * (index + 1)}
            aaOverrideMap={aaOverrideMap}
            RowComponent={LogCommentItem}
          />
        )
      )}
    </>
  );
};

export default LogViewerPopupStack;
