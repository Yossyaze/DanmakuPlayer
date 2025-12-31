import React from 'react';
import AnchorPopup from '../ui/AnchorPopup';
import ReplyListPopup from '../ui/ReplyListPopup';
import LogCommentItem from '../ui/LogCommentItem';

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
    onClosePopup,
    onPopupRowClick,
    onAnchorClick,
    onReplyCountClick,
    onIdClick,
    setZoomedImage
}) => {
    if (popupStack.length === 0) return null;

    return (
        <>
            {popupStack.map((popup, index) => (
                popup.type === 'anchor' ? (
                    <AnchorPopup
                        key={`${index}-${popup.comment.id}`}
                        comment={popup.comment}
                        position={popup.position}
                        parentRect={popup.parentRect}
                        onClose={onClosePopup}
                        onClick={(e) => onPopupRowClick(e, popup.comment)}
                        formatTime={formatTime}
                        timeOffset={timeOffset}
                        settings={logSettings}
                        setZoomedImage={setZoomedImage}
                        onAnchorClick={(e, resNum, sourceFileId) => onAnchorClick(e, resNum, sourceFileId, true)}
                        onReplyCountClick={(e, c) => onReplyCountClick(e, c, true)}
                        onIdClick={onIdClick}
                        totalComments={filteredCommentsCount}
                        customWidth={containerWidth - 10 * (index + 1)}
                        style={{ zIndex: 60 + index * 10 }}
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
                        onClose={onClosePopup}
                        formatTime={formatTime}
                        timeOffset={timeOffset}
                        settings={logSettings}
                        setZoomedImage={setZoomedImage}
                        onAnchorClick={(e, resNum, sourceFileId) => onAnchorClick(e, resNum, sourceFileId, true)}
                        onReplyCountClick={(e, c) => onReplyCountClick(e, c, true)}
                        onIdClick={onIdClick}
                        totalComments={filteredCommentsCount}
                        customWidth={containerWidth - 10 * (index + 1)}
                        style={{ zIndex: 60 + index * 10 }}
                        minX={containerLeft + 10 * (index + 1)}
                        aaOverrideMap={aaOverrideMap}
                        RowComponent={LogCommentItem}
                    />
                )
            ))}
        </>
    );
};

export default LogViewerPopupStack;
