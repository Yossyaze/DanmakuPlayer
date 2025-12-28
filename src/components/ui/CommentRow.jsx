import React from 'react';
import CommentItem from './CommentItem';
import { formatTime as defaultFormatTime } from '../../utils/danmakuUtils';

/**
 * CommentRow - サイドバー用のメモ化されたコメント行コンポーネント
 * 
 * Virtuoso リストで使用され、パフォーマンス最適化のための
 * カスタム比較関数を持つ
 */
const CommentRow = React.memo(({ 
    node, 
    isActive, 
    isHighlighted, 
    currentLogicalTime, 
    rootTime, 
    onAnchorClick, 
    onAnchorMouseEnter, 
    onAnchorMouseLeave, 
    onUrlLoad, 
    showImages,
    imageLayout = 'inline',
    setZoomedImage, 
    timeOffset, 
    formatTime = defaultFormatTime, 
    onRowClick, 
    totalComments, 
    onIdClick, 
    aaMode, 
    aaOverride, 
    onReplyCountClick,
    className = "" // New prop for external border control
}) => {
    return (
        <CommentItem
            comment={node}
            isActive={isActive}
            isHighlighted={isHighlighted}
            currentLogicalTime={currentLogicalTime}
            rootTime={rootTime}
            timeOffset={timeOffset}
            formatTime={formatTime}
            totalComments={totalComments}
            onIdClick={onIdClick}
            onAnchorClick={onAnchorClick}
            onAnchorMouseEnter={onAnchorMouseEnter}
            onAnchorMouseLeave={onAnchorMouseLeave}
            onUrlLoad={onUrlLoad}
            showImages={showImages}
            imageLayout={imageLayout}
            setZoomedImage={setZoomedImage}
            onClick={onRowClick}
            depth={node.depth || 0}
            aaMode={aaMode}
            aaOverride={aaOverride}
            onReplyCountClick={onReplyCountClick}
            className={className}
        />
    );
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    // Use rootTime for tree view descendants, otherwise use node.time
    const prevEffectiveTime = prevProps.rootTime !== undefined ? prevProps.rootTime : prevProps.node.time;
    const nextEffectiveTime = nextProps.rootTime !== undefined ? nextProps.rootTime : nextProps.node.time;
    
    return (
        prevProps.node === nextProps.node &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.isHighlighted === nextProps.isHighlighted && // Check highlight status
        prevProps.rootTime === nextProps.rootTime && // Check rootTime
        // Ignore fine-grained currentLogicalTime changes, only care if it crosses the effective time
        (prevEffectiveTime > prevProps.currentLogicalTime) === (nextEffectiveTime > nextProps.currentLogicalTime) &&
        prevProps.showThreadTitle === nextProps.showThreadTitle &&
        prevProps.visibleThreadTitles === nextProps.visibleThreadTitles &&
        prevProps.timeOffset === nextProps.timeOffset && // Check timeOffset
        prevProps.totalComments === nextProps.totalComments && // Check totalComments
        prevProps.formatTime === nextProps.formatTime && // Check formatTime (crucial for custom formatters)
        prevProps.aaMode === nextProps.aaMode && // Check AA mode
        prevProps.aaOverride === nextProps.aaOverride // Check AA override
    );
});

export default CommentRow;
