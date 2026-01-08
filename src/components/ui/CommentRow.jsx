import React from 'react';

import { formatTime as defaultFormatTime } from '../../utils/danmakuUtils';
import CommentItem from './CommentItem';

/**
 * CommentRow - サイドバー用のメモ化されたコメント行コンポーネント
 *
 * Virtuoso リストで使用され、パフォーマンス最適化のための
 * カスタム比較関数を持つ
 */
const CommentRow = React.memo(
  ({
    node,
    isActive,
    isHighlighted,
    currentTime,
    rootTime,
    onAnchorClick,
    onAnchorMouseEnter,
    onAnchorMouseLeave,
    onUrlLoad,
    showImages,
    imageLayout = 'inline',
    setZoomedImage,
    logStartTime,
    formatTime = defaultFormatTime,
    onRowClick,
    totalComments,
    onIdClick,
    aaMode,
    aaOverride,
    onReplyCountClick,
    abeMode, // New prop
    className = '', // New prop for external border control
  }) => {
    return (
      <CommentItem
        comment={node}
        isActive={isActive}
        isHighlighted={isHighlighted}
        currentTime={currentTime}
        rootTime={rootTime}
        logStartTime={logStartTime}
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
        abeMode={abeMode} // Pass through
        className={className}
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for performance
    // Use rootTime for tree view descendants, otherwise use node.time
    const prevEffectiveTime =
      prevProps.rootTime !== undefined ? prevProps.rootTime : prevProps.node.time;
    const nextEffectiveTime =
      nextProps.rootTime !== undefined ? nextProps.rootTime : nextProps.node.time;

    return (
      prevProps.node === nextProps.node &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isHighlighted === nextProps.isHighlighted && // Check highlight status
      prevProps.rootTime === nextProps.rootTime && // Check rootTime
      // Ignore fine-grained currentTime changes, only care if it crosses the effective time
      prevEffectiveTime > prevProps.currentTime ===
        nextEffectiveTime > nextProps.currentTime &&
      prevProps.showThreadTitle === nextProps.showThreadTitle &&
      prevProps.visibleThreadTitles === nextProps.visibleThreadTitles &&
      prevProps.logStartTime === nextProps.logStartTime && // Check logStartTime
      prevProps.totalComments === nextProps.totalComments && // Check totalComments
      prevProps.formatTime === nextProps.formatTime && // Check formatTime (crucial for custom formatters)
      prevProps.aaMode === nextProps.aaMode && // Check AA mode
      prevProps.aaOverride === nextProps.aaOverride && // Check AA override
      prevProps.abeMode === nextProps.abeMode // Check Abe Mode
    );
  }
);

export default CommentRow;
