import { useState, useCallback, useRef } from "react";

/**
 * useLogPopup - ポップアップ(Anchor/Reply)とコンテキストメニューの状態管理
 *
 * @param {Array} filteredComments - フィルタ済みのコメント配列
 * @returns {Object} ポップアップ関連の状態とアクション
 */
export const useLogPopup = (filteredComments = []) => {
  // Unified Popup Stack state for multi-layered popups
  const [popupStack, setPopupStack] = useState([]); // Array of { type: 'anchor'|'reply', comment, position, replies?, parentRect? }
  const [logContextMenu, setLogContextMenu] = useState(null); // { x, y, comment }
  const suppressClickRef = useRef(false); // Flag to suppress onClick after closing layers

  // Close topmost popup (for X button - legacy, kept for compatibility)
  const handleClosePopup = useCallback(() => {
    setPopupStack((prev) => prev.slice(0, -1));
  }, []);

  // Close a specific popup by index (for X button on each popup)
  // This also closes all popups above the clicked one
  const closePopupAtIndex = useCallback((index) => {
    setPopupStack((prev) => prev.slice(0, index));
  }, []);

  // Close all popups above a specific index (for clicking lower layer popup)
  // Sets suppressClick flag to prevent context menu from opening
  const closePopupsAbove = useCallback((index) => {
    setPopupStack((prev) => {
      if (prev.length > index + 1) {
        // We're actually closing something, set suppress flag
        suppressClickRef.current = true;
      }
      return prev.slice(0, index + 1);
    });
  }, []);

  // Clear all popups (for backdrop click)
  const clearPopups = useCallback(() => {
    setPopupStack([]);
    setLogContextMenu(null);
  }, []);

  // Popup Item Click -> Open Context Menu
  const handlePopupRowClick = useCallback((e, comment) => {
    e.stopPropagation();

    // Check suppress flag and reset it
    const wasSuppressed = suppressClickRef.current;
    suppressClickRef.current = false; // Always reset after checking

    if (wasSuppressed) {
      return;
    }

    setLogContextMenu({
      x: e.clientX,
      y: e.clientY,
      comment: comment,
    });
  }, []);

  // Anchor Click -> Open Anchor Popup
  const handleAnchorClick = useCallback(
    (e, targetResNum, sourceFileId, isNested = false) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      // Search for the comment with that resnum
      let targetComment = null;
      if (sourceFileId) {
        targetComment = filteredComments.find(
          (c) =>
            (c.originalResNum || c.resNum) === targetResNum &&
            c.sourceFileId === sourceFileId
        );
      }

      // Fallback if no sourceFileId provided
      if (!targetComment) {
        targetComment = filteredComments.find(
          (c) => (c.originalResNum || c.resNum) === targetResNum
        );
      }

      if (targetComment) {
        const baseRect = e?.target?.getBoundingClientRect() || {
          left: 100,
          bottom: 100,
        };
        const rowElement = e?.target?.closest(".comment-item-row");
        const rowRect = rowElement?.getBoundingClientRect();

        setPopupStack((prev) => [
          ...prev,
          {
            type: "anchor",
            comment: targetComment,
            position: { x: baseRect.left, y: baseRect.bottom },
            parentRect: !isNested ? rowRect : null,
          },
        ]);
      }
    },
    [filteredComments]
  );

  // Reply Count Click -> Build thread tree and open Reply Popup
  const handleReplyCountClick = useCallback(
    (e, comment, isNested = false) => {
      e.stopPropagation();
      if (!comment.replies || comment.replies.length === 0) return;

      const baseRect =
        e.target.closest(".reply-count-indicator")?.getBoundingClientRect() ||
        e.target.getBoundingClientRect();
      const rowElement = e.target.closest(".comment-item-row");
      const rowRect = rowElement?.getBoundingClientRect();

      // 1. Determine if this comment is a "root" or descendant
      const anchorRegex = /(&gt;&gt;|>>)(\d+)/g;
      const hasAnchors = anchorRegex.test(comment.text);

      let rootAncestors = [];

      if (!hasAnchors) {
        rootAncestors = [comment];
      } else {
        const findRoots = (c, visited) => {
          if (visited.has(c.id)) return [];
          visited.add(c.id);

          const matches = Array.from(c.text.matchAll(/(&gt;&gt;|>>)(\d+)/g));
          if (matches.length === 0) return [c];

          let roots = [];
          matches.forEach((m) => {
            const targetResNum = parseInt(m[2]);
            const parent = filteredComments.find(
              (fc) =>
                (fc.originalResNum || fc.resNum) === targetResNum &&
                fc.sourceFileId === c.sourceFileId
            );
            if (parent) {
              roots = [...roots, ...findRoots(parent, visited)];
            } else {
              roots.push(c);
            }
          });
          return roots;
        };

        const rawRoots = findRoots(comment, new Set());
        const uniqueRoots = [];
        const rootIds = new Set();
        rawRoots.forEach((r) => {
          if (!rootIds.has(r.id)) {
            uniqueRoots.push(r);
            rootIds.add(r.id);
          }
        });
        rootAncestors = uniqueRoots.sort(
          (a, b) => (a.resNum || 0) - (b.resNum || 0)
        );
      }

      // 2. Collect everything from all roots
      const allItems = [];
      const visitedItems = new Set();

      const collect = (c, depth, isRoot) => {
        if (visitedItems.has(c.id)) return;
        visitedItems.add(c.id);

        if (!isRoot) {
          allItems.push({ ...c, depth });
        } else if (hasAnchors) {
          allItems.push({ ...c, depth: 0 });
        }

        if (c.replies) {
          c.replies.forEach((r) => {
            collect(r, depth + (isRoot && !hasAnchors ? 0 : 1), false);
          });
        }
      };

      rootAncestors.forEach((root) => {
        collect(root, 0, true);
      });

      setPopupStack((prev) => [
        ...prev,
        {
          type: "reply",
          comment: comment,
          replies: allItems,
          position: { x: baseRect.left, y: baseRect.bottom },
          parentRect: !isNested ? rowRect : null,
        },
      ]);
    },
    [filteredComments]
  );

  return {
    // State
    popupStack,
    setPopupStack,
    logContextMenu,
    setLogContextMenu,

    // Actions
    handleClosePopup,
    closePopupAtIndex,
    closePopupsAbove,
    clearPopups,
    handlePopupRowClick,
    handleAnchorClick,
    handleReplyCountClick,
  };
};

export default useLogPopup;
