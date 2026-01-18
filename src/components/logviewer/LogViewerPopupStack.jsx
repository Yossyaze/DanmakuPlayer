import React from 'react';

import { Z_INDEX } from '../../constants/zIndex';
import CommentPopup from '../ui/CommentPopup';
import LogCommentItem from '../ui/LogCommentItem';

/**
 * LogViewerPopupStack - アンカー/返信ポップアップのスタック管理
 * CommentPopup統合版
 */
const LogViewerPopupStack = ({
  popupStack,
  formatTime,
  logStartTime,
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

  // Base z-index for the first popup is Z_INDEX.popupStack (60)
  const baseZIndex = Z_INDEX.popupStack;

  return (
    <>
      {/* Single backdrop for all popups - z-index below all popups */}
      <div
        className="fixed inset-0 bg-black/0 cursor-default"
        style={{ zIndex: Z_INDEX.backdrop }}
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
      {popupStack.map((popup, index) => (
        <CommentPopup
          key={`${index}-${popup.comment.id}`}
          type={popup.type}
          comment={popup.type === 'anchor' ? popup.comment : undefined}
          comments={popup.type === 'reply' ? popup.replies : undefined}
          parentComment={popup.type === 'reply' ? popup.comment : undefined}
          position={popup.position}
          parentRect={popup.parentRect}
          onClose={() => onCloseAtIndex && onCloseAtIndex(index)}
          onPopupClick={() => onCloseAbove && onCloseAbove(index)}
          isTopmost={index === popupStack.length - 1}
          onClick={
            popup.type === 'anchor' ? (e) => onPopupRowClick(e, popup.comment) : onPopupRowClick
          }
          formatTime={formatTime}
          logStartTime={logStartTime}
          settings={logSettings}
          setZoomedImage={setZoomedImage}
          onAnchorClick={(e, resNum, sourceFileId) => onAnchorClick(e, resNum, sourceFileId, true)}
          onReplyCountClick={(e, c) => onReplyCountClick(e, c, true)}
          onIdClick={onIdClick}
          totalComments={filteredCommentsCount}
          customWidth={containerWidth - 10 * (index + 1)}
          style={{ zIndex: baseZIndex + index * 10 }}
          minX={containerLeft + 10 * (index + 1)}
          aaOverrideMap={aaOverrideMap}
          RowComponent={LogCommentItem}
        />
      ))}
    </>
  );
};

export default LogViewerPopupStack;
