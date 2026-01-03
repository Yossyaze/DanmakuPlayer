import { useState, useRef, useEffect, useCallback } from "react";
import { measureTextWidth } from "../utils/danmakuUtils";
import { parseCommentToNodes } from "../utils/danmakuProcessor";

export const useDanmaku = (settings, isPlaying) => {
  const [activeDanmaku, setActiveDanmaku] = useState([]);
  const danmakuContainerRef = useRef(null);
  const laneMapRef = useRef({}); // lane -> { startTime, width, isRound2 }
  const laneMapRound2Ref = useRef({}); // lane -> { startTime, width } for Round 2 (offset 0.5 lines)
  const rootStateRef = useRef({}); // rootId -> { startTime, lane, isRound2 }
  const lastProcessedTimeRef = useRef(0);
  const skipNextProcessRef = useRef(false); // Skip first process after resume

  const processDanmaku = useCallback(
    (currentDisplayTime, comments, imageValidityMap = null) => {
      if (!danmakuContainerRef.current) return;

      // Skip first frame after resume to prevent stale comments
      if (skipNextProcessRef.current) {
        skipNextProcessRef.current = false;
        lastProcessedTimeRef.current = currentDisplayTime;
        console.log(
          "[ProcessDanmaku] Skipped first frame after resume, synced to:",
          currentDisplayTime
        );
        return;
      }

      // Time window for processing
      let searchStart = lastProcessedTimeRef.current;
      if (
        currentDisplayTime < searchStart ||
        currentDisplayTime - searchStart > 1.0
      ) {
        console.log("[ProcessDanmaku] Time jump detected:", {
          currentDisplayTime,
          lastProcessed: searchStart,
        });
        searchStart = currentDisplayTime - 0.1;
      }

      const newComments = comments.filter(
        (c) => c.time > searchStart && c.time <= currentDisplayTime
      );

      if (newComments.length > 0) {
        console.log("[ProcessDanmaku] Adding new comments:", {
          count: newComments.length,
          searchStart,
          currentDisplayTime,
        });
        const containerWidth = danmakuContainerRef.current.clientWidth;
        const containerHeight = danmakuContainerRef.current.clientHeight;
        const lineHeight = settings.fontSize * 1.2;
        const childFontScale = 1.0; // Child comments same size as parent
        const maxLanes = Math.floor(
          (containerHeight * (settings.area / 100)) / lineHeight
        );
        const maxLanesRound2 = Math.floor(
          (containerHeight * (settings.area / 100)) / lineHeight - 0.5
        );
        const MAX_CHILDREN_DISPLAY = 5;

        const added = [];

        // ===== Helper: Parse comment into nodes and calculate width =====
        // isChild: if true, use childFontScale for height calculations
        const processCommentData = (c, isChild = false) => {
          return parseCommentToNodes(c, {
            fontSize: settings.fontSize,
            imageMode: settings.imageMode,
            lineHeight,
            isChild,
            childFontScale,
            imageValidityMap,
          });
        };

        // ===== Helper: Find available lane =====
        // With fixed display duration, different width comments have different speeds
        // We need to check:
        // 1. Has the previous comment's tail entered the screen? (basic gap)
        // 2. Will the new comment catch up to the previous one before both exit? (overtake check)
        const findAvailableLane = (newWidth, rowSpan, targetMap, laneLimit) => {
          const now = Date.now();
          const newSpeed = (containerWidth + newWidth) / settings.duration;

          for (let lane = 0; lane <= laneLimit - rowSpan; lane++) {
            let available = true;

            for (let r = 0; r < rowSpan; r++) {
              const laneState = targetMap[lane + r];
              if (laneState) {
                const elapsed = (now - laneState.startTime) / 1000;
                const prevWidth = laneState.width;
                const prevSpeed =
                  (containerWidth + prevWidth) / settings.duration;

                // Current position of previous comment's tail
                const prevHeadPos = prevSpeed * elapsed; // How far head has traveled from right edge
                const prevTailPos = prevHeadPos - prevWidth; // Tail position (negative = still offscreen right)

                // Check 1: Basic gap - has tail entered screen with safety margin?
                const safetyGap = 50; // pixels
                if (prevTailPos < safetyGap) {
                  available = false;
                  break;
                }

                // Check 2: Overtake detection - will new comment catch up?
                // New comment starts at x = 0 (right edge)
                // At time t: newPos = newSpeed * t, prevPos = prevHeadPos + prevSpeed * t
                // Collision when: newPos >= prevPos - prevWidth (new head reaches prev tail)
                // Solve: newSpeed * t >= prevHeadPos + prevSpeed * t - prevWidth
                //        t * (newSpeed - prevSpeed) >= prevHeadPos - prevWidth = prevTailPos

                if (newSpeed > prevSpeed) {
                  // New comment is faster, will eventually catch up
                  const catchUpTime = prevTailPos / (newSpeed - prevSpeed);

                  // If catch up happens before new comment exits screen, it's a collision
                  // New comment exits when its tail leaves left edge: newSpeed * t - newWidth >= containerWidth
                  const newExitTime = (containerWidth + newWidth) / newSpeed;

                  if (catchUpTime < newExitTime && catchUpTime > 0) {
                    // Also check if previous comment is still on screen at catch up time
                    const prevPosAtCatchUp =
                      prevHeadPos + prevSpeed * catchUpTime;
                    const prevTailAtCatchUp = prevPosAtCatchUp - prevWidth;

                    if (prevTailAtCatchUp < containerWidth) {
                      // Collision will happen
                      available = false;
                      break;
                    }
                  }
                }
              }
            }

            if (available) return lane;
          }
          return -1; // Not found
        };

        // ===== Helper: Register lane occupation =====
        const registerLane = (lane, width, rowSpan, targetMap, laneLimit) => {
          const now = Date.now();
          for (let r = 0; r < rowSpan; r++) {
            if (lane + r < laneLimit) {
              targetMap[lane + r] = {
                startTime: now,
                width: width,
              };
            }
          }
        };

        // ===== Process each comment =====
        // Sort: roots first, then children by layoutIndex
        const sorted = [...newComments].sort((a, b) => {
          const aIsRoot = !a.rootId || a.id === a.rootId || a.layoutIndex === 0;
          const bIsRoot = !b.rootId || b.id === b.rootId || b.layoutIndex === 0;
          if (aIsRoot && !bIsRoot) return -1;
          if (!aIsRoot && bIsRoot) return 1;
          return (a.layoutIndex || 0) - (b.layoutIndex || 0);
        });

        // ===== Pre-calculate Tree Hull with Fixed Limit =====
        // Maximum rows for a single tree = 60% of display area (between 50-75%)
        const MAX_TREE_ROWS = Math.max(3, Math.floor(maxLanes * 0.6));
        const treeHullMap = new Map(); // rootId -> { totalRowSpan, maxWidth, truncatedCount }

        // Find all roots and calculate their tree's hull with truncation
        sorted
          .filter((c) => !c.rootId || c.id === c.rootId || c.layoutIndex === 0)
          .forEach((root) => {
            const rootData = processCommentData(root);
            const children = sorted.filter(
              (c) => c.rootId === root.id && c.id !== root.id
            );

            let totalRowSpan = rootData.rowSpan;
            let maxWidth = rootData.totalWidth;
            let truncatedCount = 0;
            let childrenIncluded = 0;

            children.forEach((child) => {
              const childData = processCommentData(child);

              if (childrenIncluded >= MAX_CHILDREN_DISPLAY) {
                truncatedCount++;
                return;
              }

              // Check if adding this child would exceed the limit
              if (totalRowSpan + childData.rowSpan <= MAX_TREE_ROWS) {
                totalRowSpan += childData.rowSpan;
                maxWidth = Math.max(maxWidth, childData.totalWidth);
                childrenIncluded++;
              } else {
                truncatedCount++;
              }
            });

            // If truncated, reserve space for the indicator
            if (truncatedCount > 0) {
              totalRowSpan += 1; // Reserve 1 row for indicator
              const truncText = `... +${truncatedCount}件`;
              const truncWidth = measureTextWidth(
                truncText,
                settings.fontSize * 0.8
              );
              maxWidth = Math.max(maxWidth, truncWidth);
            }

            treeHullMap.set(root.id, {
              totalRowSpan: totalRowSpan,
              maxWidth: maxWidth,
              truncatedCount: truncatedCount,
            });
          });

        // Track accumulated rows per tree for sequential lane assignment
        const treeChildRowsAccum = {}; // rootId -> accumulated rows of children
        const treeChildCountAccum = {}; // rootId -> number of children displayed

        sorted.forEach((c) => {
          // Check if this is a tree child with existing parent
          const isTreeChild =
            c.rootId && c.id !== c.rootId && c.layoutIndex > 0;
          const existingRoot = isTreeChild
            ? rootStateRef.current[c.rootId]
            : null;

          // Process comment data with child flag for proper height calculation
          const { nodes, totalWidth, rowSpan, actualPixelHeight } =
            processCommentData(c, !!existingRoot);

          // Distance to travel (from right edge to completely off left edge)
          const dist = -(containerWidth + totalWidth);

          let lane;
          let isRound2 = false;
          let skip = false;
          let commentDuration;

          if (existingRoot) {
            // Tree child: use parent's speed (calculated from parent's width)
            // Child inherits parent's speed AND round status to stay aligned
            const parentSpeed = existingRoot.speed;
            isRound2 = existingRoot.isRound2; // Inherit round status
            commentDuration = (containerWidth + totalWidth) / parentSpeed;

            // Calculate top position based on accumulated pixel height
            const accumulatedHeight = treeChildRowsAccum[c.rootId] || 0;

            // Parent Top includes Round 2 offset if applicable
            const parentLaneOffset = isRound2 ? 0.5 : 0;
            const parentTop =
              (existingRoot.lane + parentLaneOffset) * lineHeight;

            // Use parent's actual height (includes images) instead of just lineHeight
            const parentHeight = existingRoot.actualHeight || lineHeight;
            const childTop = parentTop + parentHeight + accumulatedHeight; // Parent height + accumulated children heights

            // Check if this child exceeds display area
            const displayLimit = containerHeight * (settings.area / 100);
            // Check absolute number of children limit
            const currentChildCount = treeChildCountAccum[c.rootId] || 0;

            // actualPixelHeight already includes childFontScale from processCommentData
            const childHeight = actualPixelHeight;

            if (currentChildCount >= MAX_CHILDREN_DISPLAY) {
              skip = true;
            } else if (childTop + childHeight > displayLimit) {
              skip = true;
            } else {
              // Check MAX_TREE_ROWS equivalent (relative to parent)
              const maxTreeHeight = lineHeight * (MAX_TREE_ROWS - 1); // Excluding parent
              if (accumulatedHeight + childHeight > maxTreeHeight) {
                skip = true;
              } else {
                treeChildRowsAccum[c.rootId] = accumulatedHeight + childHeight;
                treeChildCountAccum[c.rootId] = currentChildCount + 1;
                lane = -1; // Use pixel-based top instead of lane
              }
            }

            // Store childTop for later use
            c._childTop = childTop;
          } else {
            // Normal comment or root: fixed display duration
            // Duration = settings.duration (how long visible on screen)
            commentDuration = settings.duration;
            const speed = (containerWidth + totalWidth) / settings.duration;

            // Check if this is a root with tree hull data
            const hull = treeHullMap.get(c.id);
            const hullRowSpan = hull?.totalRowSpan || rowSpan;
            const hullWidth = hull?.maxWidth || totalWidth;

            // Try Round 1
            lane = findAvailableLane(
              hullWidth,
              hullRowSpan,
              laneMapRef.current,
              maxLanes
            );

            // If failed, Try Round 2
            if (lane === -1) {
              lane = findAvailableLane(
                hullWidth,
                hullRowSpan,
                laneMapRound2Ref.current,
                maxLanesRound2
              );
              if (lane !== -1) {
                isRound2 = true;
              } else {
                // Fallback: random lane in Round 1
                lane = Math.floor(
                  Math.random() * Math.max(1, maxLanes - hullRowSpan + 1)
                );
                isRound2 = false; // Fallback counts as Round 1 (no offset)
              }
            }

            // If this is a root, save its state for children
            if (c.rootId && c.id === c.rootId) {
              rootStateRef.current[c.id] = {
                startTime: Date.now(),
                lane: lane,
                rowSpan: rowSpan, // Save actual rowSpan for child positioning
                speed: speed, // Save speed for children to inherit
                actualHeight: actualPixelHeight, // Save actual height including images
                isRound2: isRound2, // Save round status
              };
              // Register with hull size (covers entire tree)
              registerLane(
                lane,
                hullWidth,
                hullRowSpan,
                isRound2 ? laneMapRound2Ref.current : laneMapRef.current,
                isRound2 ? maxLanesRound2 : maxLanes
              );
            } else {
              // Non-tree comment: register with own size
              registerLane(
                lane,
                totalWidth,
                rowSpan,
                isRound2 ? laneMapRound2Ref.current : laneMapRef.current,
                isRound2 ? maxLanesRound2 : maxLanes
              );
            }
          }

          if (!skip) {
            const laneOffset = isRound2 ? 0.5 : 0;
            const finalOpacity = isRound2
              ? settings.opacity * 0.7
              : settings.opacity;

            added.push({
              ...c,
              nodes,
              uniqueId: `${c.id}-${Date.now()}-${Math.random()}`,
              top:
                c._childTop !== undefined
                  ? c._childTop
                  : (lane + laneOffset) * lineHeight,
              dist: dist,
              width: totalWidth,
              duration: commentDuration,
              opacity: finalOpacity / settings.opacity, // DanmakuLayer multiplies this by settings.opacity
              zIndex: isRound2 ? 0 : 10, // Round 2 behind Round 1
            });
          }
        });

        // ===== Add truncation indicators for trees with truncated children =====
        treeHullMap.forEach((hull, rootId) => {
          if (hull.truncatedCount > 0) {
            const rootState = rootStateRef.current[rootId];
            if (rootState) {
              // displayedHeight is now in pixels
              const displayedHeight = treeChildRowsAccum[rootId] || 0;
              const truncText = `... +${hull.truncatedCount}件`;
              const truncWidth = measureTextWidth(
                truncText,
                settings.fontSize * 0.8
              );

              // Calculate top: parent top + parent height + children height
              const isRound2 = rootState.isRound2;
              const parentLaneOffset = isRound2 ? 0.5 : 0;
              const parentTop =
                (rootState.lane + parentLaneOffset) * lineHeight;

              // Use parent's actual height (which includes images/newlines)
              const parentHeight = rootState.actualHeight || lineHeight;

              const truncTop = parentTop + parentHeight + displayedHeight;
              const truncDuration =
                (containerWidth + truncWidth) / rootState.speed;

              added.push({
                id: `${rootId}-truncation`,
                text: truncText,
                uniqueId: `${rootId}-truncation-${Date.now()}`,
                top: truncTop,
                dist: -(containerWidth + truncWidth),
                width: truncWidth,
                duration: truncDuration,
                color: "#888888",
                isTruncationIndicator: true,
                opacity: isRound2 ? 0.7 : 1, // Match parent opacity factor
                zIndex: isRound2 ? 0 : 10,
              });
            }
          }
        });

        setActiveDanmaku((prev) => [...prev, ...added]);
      }

      lastProcessedTimeRef.current = currentDisplayTime;
    },
    [settings]
  );

  const handleAnimationEnd = useCallback((uniqueId) => {
    setActiveDanmaku((prev) => prev.filter((dm) => dm.uniqueId !== uniqueId));
  }, []);

  // Set play state on mount AND when isPlaying changes
  // This ensures correct state after DanmakuLayer remounts (e.g., exiting log mode)
  useEffect(() => {
    if (danmakuContainerRef.current) {
      const state = isPlaying ? "running" : "paused";
      danmakuContainerRef.current.style.setProperty("--play-state", state);
      console.log("[Danmaku] Setting --play-state:", state);
    }
  }, [isPlaying]);

  // Also set on initial render (useLayoutEffect to run before paint)
  useEffect(() => {
    if (danmakuContainerRef.current) {
      const state = isPlaying ? "running" : "paused";
      danmakuContainerRef.current.style.setProperty("--play-state", state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const resetDanmaku = useCallback((startTime = 0) => {
    setActiveDanmaku([]);
    laneMapRef.current = {};
    laneMapRound2Ref.current = {};
    rootStateRef.current = {};
    lastProcessedTimeRef.current = startTime;
  }, []);

  // Sync lastProcessedTimeRef without clearing danmaku (for mode switches)
  const syncLastProcessedTime = useCallback((time) => {
    lastProcessedTimeRef.current = time;
  }, []);

  // Skip next processDanmaku call (for playback resume to prevent stale comments)
  const skipNextProcess = useCallback(() => {
    skipNextProcessRef.current = true;
  }, []);

  return {
    activeDanmaku,
    danmakuContainerRef,
    processDanmaku,
    handleAnimationEnd,
    resetDanmaku,
    syncLastProcessedTime,
    skipNextProcess,
  };
};
