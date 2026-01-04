import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { FileText } from "lucide-react";
import useCommentTree from "../hooks/useCommentTree";
import { Virtuoso } from "react-virtuoso";
import CommentContextMenu from "./ui/CommentContextMenu";
import CommentRow from "./ui/CommentRow";

const CommentList = forwardRef(
  (
    {
      comments,
      activeCommentId,
      currentLogicalTime,
      enableTreeView,
      showImages,
      imageLayout = "inline",
      showThreadTitle,
      visibleThreadTitles,
      onCommentClick,
      onSeekAndPlay, // New prop for seek + play + exit log mode
      onAnchorClick,
      onAnchorMouseEnter, // New prop
      onAnchorMouseLeave, // New prop
      onUrlLoad,
      formatTime,
      setZoomedImage,
      scrollContainerRef,

      isAutoScroll,
      setIsAutoScroll,
      timeOffset = 0,
      onSetLogStart,
      onSetCmStart,
      onSetCmEnd,
      onAddNgId,
      onAddNgComment,
      onIdClick,
      RowComponent, // Optional custom row component
      extraRowProps = {}, // New prop for passing extra data to RowComponent
      onScroll, // New prop for external scroll handling
      isPopupActive = false, // New prop to control interaction
      aaMode, // AA Mode
      aaOverrideMap = {}, // New prop: { [commentId]: boolean }
      onToggleAA, // New prop for AA toggle
      initialScrollIndex = 0, // Initial scroll position
      onScrollIndexChange, // Callback when scroll index changes
      indentSize = 12, // Indent size per depth level (default: 12px for sidebar, 16px for log viewer)
      debugId = "unknown", // DEBUG: identifier for this instance
    },
    ref
  ) => {
    // Default row component if not provided
    const RowToRender = RowComponent || CommentRow;
    const virtuosoRef = useRef(null);
    const virtusoScrollerRef = useRef(null);
    const lastAutoScrollTimeRef = useRef(0); // Timestamp of last auto-scroll trigger
    const [highlightedCommentId, setHighlightedCommentId] = useState(null); // State for temporary highlight
    const [contextMenu, setContextMenu] = useState(null); // { x, y, comment }

    // Use custom hook for tree construction
    const treeRoots = useCommentTree(comments, enableTreeView);

    // Build a map from rootId to root's time for efficient lookup
    const rootTimeMap = React.useMemo(() => {
      if (!enableTreeView) return null;
      const map = new Map();
      treeRoots.forEach((node) => {
        // Root nodes have depth 0 and rootId === node.id
        if (node.depth === 0) {
          map.set(node.id, node.time);
        }
      });
      return map;
    }, [treeRoots, enableTreeView]);

    // Scroll to active comment
    useEffect(() => {
      // DEBUG: Auto-scroll investigation
      console.log(`[CommentList:${debugId}]`, {
        isAutoScroll,
        activeCommentId,
        treeRootsLength: treeRoots.length,
        hasVirtuosoRef: !!virtuosoRef.current,
      });

      if (isAutoScroll && activeCommentId && virtuosoRef.current) {
        const index = treeRoots.findIndex(
          (node) => node.id === activeCommentId
        );
        console.log(
          `[CommentList:${debugId}] Found index:`,
          index,
          "for activeCommentId:",
          activeCommentId
        );
        if (index !== -1) {
          // Update timestamp to ignore subsequent scroll events temporarily
          lastAutoScrollTimeRef.current = Date.now();

          if (enableTreeView) {
            // In tree view mode, try to show entire tree
            // Find tree size by counting consecutive nodes with same rootId
            const rootId = treeRoots[index].rootId;
            let treeEndIndex = index;
            while (
              treeEndIndex + 1 < treeRoots.length &&
              treeRoots[treeEndIndex + 1].rootId === rootId
            ) {
              treeEndIndex++;
            }
            const treeSize = treeEndIndex - index + 1;

            console.log(
              `[CommentList:${debugId}] Tree size:`,
              treeSize,
              "rootIndex:",
              index,
              "endIndex:",
              treeEndIndex
            );

            // Get approximate visible item count (estimate ~40px per item, viewport ~400px)
            // We'll use a threshold to decide: if tree fits, show tree end at bottom
            // Otherwise, show root at top
            const estimatedVisibleItems = 10; // Conservative estimate

            if (treeSize <= estimatedVisibleItems) {
              // Small tree: scroll so tree end is at bottom
              virtuosoRef.current.scrollToIndex({
                index: treeEndIndex,
                align: "end",
                offset: 50,
                behavior: "auto",
              });
            } else {
              // Large tree: scroll so root is at top
              virtuosoRef.current.scrollToIndex({
                index,
                align: "start",
                offset: -20,
                behavior: "auto",
              });
            }
          } else {
            // Non-tree mode: original behavior
            console.log(
              `[CommentList:${debugId}] Calling scrollToIndex:`,
              index
            );
            virtuosoRef.current.scrollToIndex({
              index,
              align: "end",
              offset: 50,
              behavior: "auto",
            });
          }
        }
      }
    }, [activeCommentId, isAutoScroll, treeRoots, debugId, enableTreeView]);

    const [scrollerElement, setScrollerElement] = useState(null);

    // Setup user interaction listeners to disable auto-scroll
    useEffect(() => {
      if (!scrollerElement) return;

      const handleInteraction = (e) => {
        // Ignore interactions from defined non-scroll elements
        if (e.target.closest(".no-scroll-lock")) return;

        // Always disable auto-scroll on user interaction if it's currently on
        if (isAutoScroll) {
          setIsAutoScroll(false);
        }
        // Don't close context menu on mousedown (let click capture handle it to prevent immediate re-opening)
        if (contextMenu && e?.type !== "mousedown") {
          setContextMenu(null);
        }
      };

      // Use wheel/touchmove/keydown to strictly identify user intent
      // Attach with passive: false where appropriate if we wanted to preventDefault, but here we just want to listen.
      // passive: true is better for performance.
      const opts = { passive: true };

      scrollerElement.addEventListener("wheel", handleInteraction, opts);
      scrollerElement.addEventListener("touchmove", handleInteraction, opts);
      scrollerElement.addEventListener("keydown", handleInteraction, opts);
      scrollerElement.addEventListener("mousedown", handleInteraction, opts); // Added mousedown for scrollbar clicks

      return () => {
        scrollerElement.removeEventListener("wheel", handleInteraction, opts);
        scrollerElement.removeEventListener(
          "touchmove",
          handleInteraction,
          opts
        );
        scrollerElement.removeEventListener("keydown", handleInteraction, opts);
        scrollerElement.removeEventListener(
          "mousedown",
          handleInteraction,
          opts
        );
      };
    }, [isAutoScroll, setIsAutoScroll, contextMenu, scrollerElement]);

    // Expose scroll functionality
    const scrollToResNum = useCallback(
      (resNum, sourceFileId) => {
        // Find target in the flattened tree
        // Try same file first
        let index = treeRoots.findIndex(
          (c) => c.originalResNum === resNum && c.sourceFileId === sourceFileId
        );
        // Fallback to any file
        if (index === -1) {
          index = treeRoots.findIndex((c) => c.originalResNum === resNum);
        }

        if (index !== -1) {
          // Disable auto-scroll to allow manual navigation
          setIsAutoScroll(false);

          // Set highlight
          const targetId = treeRoots[index].id;
          setHighlightedCommentId(targetId);
          setTimeout(() => setHighlightedCommentId(null), 1500);

          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index,
              align: "start", // Position at top of view
              behavior: "auto",
            });
          }
          return true;
        } else {
          console.warn("Target comment not found", resNum);
          return false;
        }
      },
      [treeRoots, setIsAutoScroll]
    );

    // Scroll to specific index directly
    const scrollToIndex = useCallback(
      (index) => {
        if (virtuosoRef.current && index >= 0 && index < treeRoots.length) {
          virtuosoRef.current.scrollToIndex({
            index,
            align: "start",
            behavior: "auto",
          });
        }
      },
      [treeRoots.length]
    );

    useImperativeHandle(ref, () => ({
      scrollToResNum,
      scrollToIndex,
    }));

    // Handle Anchor Click
    const handleAnchorClick = useCallback(
      (e, resNum, sourceFileId) => {
        // If external handler provided (e.g., from LogViewer), delegate to it
        if (onAnchorClick) {
          onAnchorClick(e, resNum, sourceFileId);
          return;
        }

        // Default internal virtualization logic
        e.stopPropagation();
        e.preventDefault();

        scrollToResNum(resNum, sourceFileId);
      },
      [onAnchorClick, scrollToResNum]
    );

    // Memoized Row Component
    // Moved outside to prevent re-creation (see bottom of file)

    const handleRowClick = useCallback(
      (e, node) => {
        // If popup is active, don't open context menu. Just allow propagation to close popup.
        if (isPopupActive) return;

        // e.stopPropagation(); // Removed to allow click-outside detection for popups
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          comment: node,
        });
      },
      [isPopupActive]
    );

    const itemContent = useCallback(
      (index, node) => {
        const currentDepth = node.depth || 0;
        const nextDepth =
          index < treeRoots.length - 1 ? treeRoots[index + 1]?.depth || 0 : 0;
        const isLastItem = index === treeRoots.length - 1;

        // Check if depth decreases to next item
        const depthDecreases = !isLastItem && nextDepth < currentDepth;

        // Border logic:
        // - When depth decreases: use complement border only (to extend to next depth)
        // - Otherwise: use normal border-b
        const borderClass = isLastItem
          ? ""
          : depthDecreases
          ? ""
          : "border-b border-gray-700";

        return (
          <>
            <RowToRender
              node={node}
              isActive={
                activeCommentId === node.id ||
                (enableTreeView && node.rootId === activeCommentId)
              }
              isHighlighted={highlightedCommentId === node.id}
              currentLogicalTime={currentLogicalTime}
              rootTime={
                enableTreeView && rootTimeMap
                  ? rootTimeMap.get(node.rootId)
                  : undefined
              }
              showThreadTitle={showThreadTitle}
              visibleThreadTitles={visibleThreadTitles}
              onCommentClick={onCommentClick}
              onAnchorClick={handleAnchorClick}
              onAnchorMouseEnter={onAnchorMouseEnter}
              onAnchorMouseLeave={onAnchorMouseLeave}
              onUrlLoad={onUrlLoad}
              showImages={showImages}
              imageLayout={imageLayout}
              setZoomedImage={setZoomedImage}
              timeOffset={timeOffset}
              onRowClick={handleRowClick}
              totalComments={comments.length}
              onIdClick={onIdClick}
              formatTime={formatTime}
              aaMode={aaMode}
              aaOverride={aaOverrideMap[node.id]}
              className={borderClass}
              {...extraRowProps}
            />
            {/* Complement border when depth decreases - extends to next item's depth */}
            {depthDecreases && (
              <div
                className="border-b border-gray-700"
                style={{
                  marginLeft: `${Math.max(nextDepth * indentSize, 0)}px`,
                }}
              />
            )}
          </>
        );
      },
      [
        RowToRender,
        activeCommentId,
        highlightedCommentId,
        currentLogicalTime,
        handleAnchorClick,
        onAnchorMouseEnter,
        onAnchorMouseLeave,
        onUrlLoad,
        showImages,
        setZoomedImage,
        timeOffset,
        handleRowClick,
        comments.length,
        onIdClick,
        showThreadTitle,
        visibleThreadTitles,
        onCommentClick,
        extraRowProps,
        formatTime,
        aaMode,
        aaOverrideMap,
        enableTreeView,
        rootTimeMap,
        treeRoots,
        imageLayout,
        indentSize,
      ]
    );

    return (
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 relative bg-gray-900/95"
      >
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            <FileText size={48} className="opacity-20" />
            <p>コメントファイルを読み込んでください</p>
          </div>
        ) : (
          <div className="h-full overflow-hidden">
            <Virtuoso
              ref={virtuosoRef}
              scrollerRef={(ref) => {
                virtusoScrollerRef.current = ref;
                setScrollerElement(ref);
              }}
              data={treeRoots}
              itemContent={itemContent}
              className="h-full scrollbar-thin scrollbar-thumb-gray-600"
              overscan={{ main: 2000, reverse: 2000 }} // Increased overscan for smoother scrolling
              onScroll={onScroll} // Pass onScroll prop
              initialTopMostItemIndex={initialScrollIndex}
              rangeChanged={(range) => {
                if (onScrollIndexChange) {
                  onScrollIndexChange(range.startIndex);
                }
              }}
            />
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <CommentContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            comment={contextMenu.comment}
            totalComments={comments.length}
            onClose={() => setContextMenu(null)}
            onSeek={(time) => {
              setIsAutoScroll(true); // Force Auto Mode locally immediately
              // Use onSeekAndPlay if available (includes play + exit log mode), otherwise fallback to onCommentClick
              if (onSeekAndPlay) {
                onSeekAndPlay(time);
              } else {
                onCommentClick(time);
              }
              setContextMenu(null);
            }}
            onSetLogStart={(comment) => {
              onSetLogStart(comment);
              setContextMenu(null);
            }}
            onSetCmStart={(time) => {
              onSetCmStart(time);
              setContextMenu(null);
            }}
            onSetCmEnd={(time) => {
              onSetCmEnd(time);
              setContextMenu(null);
            }}
            onAddNgId={onAddNgId}
            onAddNgComment={onAddNgComment}
            formatTime={formatTime}
            timeOffset={timeOffset}
            aaMode={aaMode}
            aaOverride={aaOverrideMap[contextMenu.comment.id]}
            onToggleAA={(comment, isAA) => {
              onToggleAA && onToggleAA(comment, isAA);
              setContextMenu(null);
            }}
            onCopyId={(id) => navigator.clipboard.writeText(id)}
            onCopyComment={(text) => navigator.clipboard.writeText(text)}
          />
        )}
      </div>
    );
  }
);

export default CommentList;
