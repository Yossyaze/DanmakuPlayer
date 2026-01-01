import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePlayer } from "./usePlayer";
import { useCMSystem } from "./useCMSystem";
import { useLogSystem } from "./useLogSystem";
import { useDanmaku } from "./useDanmaku";
import { useDanmakuTree } from "./useDanmakuTree";
import { parseLogFile } from "../utils/logParser";
import { checkImageUrl } from "../utils/imageChecker";

export const useDanmakuPlayer = (enableTreeView = false) => {
  // --- Custom Hooks ---
  const player = usePlayer();
  const cmSystem = useCMSystem(player.duration);
  const logSystem = useLogSystem();

  // --- Local State ---
  const [currentTime, setCurrentTime] = useState(0);

  // Hidden Abe Mode unlock state (persisted)
  const [abeModeUnlocked, setAbeModeUnlocked] = useState(() => {
    try {
      return localStorage.getItem("abe_mode_unlocked") === "true";
    } catch {
      return false;
    }
  });

  // Unlock Abe Mode (called from search)
  const unlockAbeMode = useCallback(() => {
    if (!abeModeUnlocked) {
      setAbeModeUnlocked(true);
      localStorage.setItem("abe_mode_unlocked", "true");
    }
  }, [abeModeUnlocked]);
  const [dmSettings, setDmSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("danmaku_settings");
      if (saved) {
        return {
          ...{
            duration: 5,
            fontSize: 20,
            opacity: 0.7,
            area: 100,
            imageMode: "image", // none, image, placeholder
            abeMode: false, // 安倍晋三モード
          },
          ...JSON.parse(saved),
        };
      }
    } catch (e) {
      console.error("Failed to load danmaku settings", e);
    }
    return {
      duration: 5,
      fontSize: 20,
      opacity: 0.7,
      area: 100,
      imageMode: "image",
      abeMode: false, // 安倍晋三モード
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("danmaku_settings", JSON.stringify(dmSettings));
  }, [dmSettings]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const [skipSeconds, setSkipSeconds] = useState(() => {
    const saved = localStorage.getItem("danmaku_skip_seconds");
    return saved ? Number(saved) : 5;
  });

  useEffect(() => {
    localStorage.setItem("danmaku_skip_seconds", skipSeconds);
  }, [skipSeconds]);
  const [videoStartTimeStr, setVideoStartTimeStr] = useState("");

  // UI State that is tightly coupled with logic
  const [showControls, setShowControls] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // --- Refs ---
  const controlsTimeoutRef = useRef(null);

  // Show controls on video load
  useEffect(() => {
    if (player.videoSrc) {
      setShowControls(true);
      // Hide after 3 seconds if playing
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (player.isPlaying) setShowControls(false);
      }, 3000);
    }
  }, [player.videoSrc, player.isPlaying]);
  const animationFrameRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);
  const lastProcessedTimeRef = useRef(0);
  const progressBarRef = useRef(null);
  const thumbRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const timeSyncInitializedRef = useRef(false); // Track if time sync has been done

  // --- Danmaku Hook ---
  const danmaku = useDanmaku(dmSettings, player.isPlaying);
  const { processDanmaku, resetDanmaku, danmakuContainerRef, skipNextProcess } =
    danmaku;

  // --- Image Validity Checking ---
  const imageValidityMapRef = useRef(new Map());
  const checkedUrlsRef = useRef(new Set());

  // Effect to pre-check image URLs when comments change
  useEffect(() => {
    const extractAndCheckImages = async () => {
      const comments = logSystem.visibleComments || [];
      const imageUrls = [];

      // Extract image URLs from comments
      comments.forEach((c) => {
        const matches = c.text.matchAll(
          /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi
        );
        for (const match of matches) {
          const url = match[1];
          if (!checkedUrlsRef.current.has(url)) {
            imageUrls.push(url);
          }
        }
      });

      // Check new URLs in parallel
      if (imageUrls.length > 0) {
        const checkPromises = imageUrls.map(async (url) => {
          checkedUrlsRef.current.add(url);
          const isValid = await checkImageUrl(url);
          imageValidityMapRef.current.set(url, isValid);
        });
        await Promise.all(checkPromises);
      }
    };

    if (dmSettings.imageMode === "image") {
      extractAndCheckImages();
    }
  }, [logSystem.visibleComments, dmSettings.imageMode]);

  // --- Reset Logic ---
  const resetPlayerState = useCallback(() => {
    player.setPlayingState(false);
    // Reset to Video Start (offset), not Log Start (0)
    setCurrentTime(cmSystem.timeOffset);
    resetDanmaku();
    lastProcessedTimeRef.current = cmSystem.timeOffset;
    cmSystem.resetCmState();
  }, [player, resetDanmaku, cmSystem]);

  // --- Seek Logic ---
  const performSeek = useCallback(
    (targetLogTime) => {
      // if (!player.videoRef.current) return; // Allow seek without video (for Log Mode)

      // Video Time Calculation
      const { videoTime, inCmRange, cmRange } =
        cmSystem.logTimeToVideoTime(targetLogTime);
      // Debug logs removed

      if (player.videoRef.current) {
        player.seekTo(videoTime);
      }

      resetDanmaku();
      lastProcessedTimeRef.current = targetLogTime;

      if (inCmRange && cmRange) {
        cmSystem.cmStateRef.current.isWaiting = true;
        cmSystem.cmStateRef.current.waitStartTime = performance.now();
        cmSystem.cmStateRef.current.waitStartLogTime = targetLogTime;
        cmSystem.cmStateRef.current.cmRangeId = cmRange.id;
        cmSystem.setIsWaitingCm(true);
      } else {
        cmSystem.cmStateRef.current.isWaiting = false;
        cmSystem.cmStateRef.current.cmRangeId = null;
        cmSystem.setIsWaitingCm(false);
      }

      setCurrentTime(targetLogTime);

      const totalCmDuration = cmSystem.cmRanges
        .filter((r) => r.logEnd <= targetLogTime)
        .reduce((acc, r) => acc + (r.logEnd - r.logStart), 0);
      cmSystem.setTotalWaitOffset(totalCmDuration);

      if (inCmRange && cmRange) {
        const waitTime = targetLogTime - cmRange.logStart;
        cmSystem.setCurrentCmWaitTime(waitTime);
        cmSystem.cmStateRef.current.accumulatedWaitTime = waitTime;

        cmSystem.cmStateRef.current.isWaiting = true;
        cmSystem.cmStateRef.current.cmRangeId = cmRange.id;
        // waitStartLogTime needs to be set to the start of CM, not user seek time?
        // Actually waitStartLogTime is used to calculate elapsed.
        // If we seek to middle of CM, we want elapsed to reflect that?
        // No, accumulatedWaitTime takes care of the offset.
        // waitStartTime needs to be NOW.
        cmSystem.cmStateRef.current.waitStartTime = performance.now();
        cmSystem.cmStateRef.current.waitStartLogTime = cmRange.logStart; // Reset to start of CM range

        cmSystem.setIsWaitingCm(true);
      } else {
        cmSystem.setCurrentCmWaitTime(0);
        cmSystem.cmStateRef.current.accumulatedWaitTime = 0;

        // Clear CM wait state (Moved from top)
        cmSystem.cmStateRef.current.isWaiting = false;
        cmSystem.cmStateRef.current.cmRangeId = null;
        cmSystem.setIsWaitingCm(false);

        // If we seeked out of CM range and we are supposed to be playing, resume video
        if (player.isPlaying) {
          player.safePlay();
        }
      }
    },
    [cmSystem, resetDanmaku, player]
  );

  const handleSeek = (e) => {
    const targetVideoRelativeTime = parseFloat(e.target.value);
    // Convert Video Relative Time to Log Time
    const targetLogTime = targetVideoRelativeTime + cmSystem.timeOffset;
    setCurrentTime(targetLogTime);
    performSeek(targetLogTime);
  };

  const handleSeekStart = () => {
    wasPlayingRef.current = player.isPlaying;
    isDraggingRef.current = true;
    player.setPlayingState(false);
  };

  const handleSeekEnd = () => {
    isDraggingRef.current = false;
    if (wasPlayingRef.current) {
      player.setPlayingState(true);
      if (!cmSystem.cmStateRef.current.isWaiting && player.videoRef.current) {
        player.safePlay();
      }
    }
  };

  // --- Danmaku Tree Logic (delegated to useDanmakuTree) ---
  const danmakuComments = useDanmakuTree(
    logSystem.visibleComments,
    enableTreeView
  );

  // --- Helper for CM Detection ---
  const checkCmCollision = useCallback(
    (vidTime, lookAhead = 0) => {
      const sortedRanges = [...cmSystem.cmRanges].sort(
        (a, b) => a.logStart - b.logStart
      );
      let accDuration = 0;

      for (const range of sortedRanges) {
        // Use pre-calculated videoStart which includes timeOffset
        const videoStart =
          range.videoStart !== undefined
            ? range.videoStart
            : range.logStart - accDuration - cmSystem.timeOffset;

        if (cmSystem.cmStateRef.current.justFinishedCmId === range.id) {
          if (Math.abs(vidTime - videoStart) > 1.0) {
            // Reset ignore flag if we moved away
          } else {
            // Ignore this range
            accDuration += range.logEnd - range.logStart;
            continue;
          }
        }

        // Check collision with lookahead
        // If vidTime is slightly BEFORE start, or IN start range
        // Original: vidTime >= videoStart && vidTime < videoStart + 0.25
        // New with LookAhead: vidTime >= videoStart - lookAhead && vidTime < videoStart + 0.25 + lookAhead

        if (
          vidTime >= videoStart - lookAhead &&
          vidTime < videoStart + 0.25 + lookAhead
        ) {
          return { range, logStart: range.logStart };
        }
        accDuration += range.logEnd - range.logStart;
      }
      return null;
    },
    [cmSystem.cmRanges, cmSystem.timeOffset, cmSystem.cmStateRef]
  );

  // --- Play Request with CM Safety ---
  const requestPlay = useCallback(() => {
    // If already waiting in CM, resume waiting
    if (cmSystem.cmStateRef.current.isWaiting) {
      if (!player.isPlaying) {
        player.setIsPlaying(true);
        cmSystem.cmStateRef.current.waitStartTime = performance.now();
      }
      return;
    }

    if (!player.videoRef.current) return;

    // NEW: Check if player is ready
    if (!player.isReady) {
      console.warn("requestPlay ignored: Player not ready");
      return;
    }

    // If already playing, do nothing
    if (player.isPlaying) return;

    // PLAY - Check for collision first to avoid AbortError
    const vidTime = player.getCurrentTime();

    // Use LookAhead of 0.5s to prevent immediate collision after play
    // Valid vidTime check
    if (!isFinite(vidTime)) {
      console.warn("Invalid video time in requestPlay:", vidTime);
      return;
    }

    // Check for collision.
    // 1. Immediate check (are we INSIDE a CM right now?)
    const immediateCollision = checkCmCollision(vidTime, 0);
    // 2. Predictive check (are we about to enter a CM?)
    const predCollision = checkCmCollision(vidTime, 0.5);

    const collision = immediateCollision || predCollision;

    if (collision) {
      console.log("SafePlay prevented collision:", collision);
      // Enter CM Wait directly instead of playing
      cmSystem.cmStateRef.current.isWaiting = true;
      cmSystem.cmStateRef.current.cmRangeId = collision.range.id;
      cmSystem.cmStateRef.current.waitStartLogTime = collision.logStart;
      cmSystem.cmStateRef.current.waitStartTime = performance.now();
      cmSystem.cmStateRef.current.accumulatedWaitTime = 0;
      cmSystem.setIsWaitingCm(true);
      cmSystem.setCurrentCmWaitTime(0);

      // Allow logical playback (App loop) to run, but Video will be paused by App.jsx
      player.setIsPlaying(true);
      return;
    }

    console.log("SafePlay allowed. vidTime:", vidTime);
    if (danmakuContainerRef.current) {
      danmakuContainerRef.current.style.setProperty("--play-state", "running");
    }
    player.setIsPlaying(true);
  }, [player, cmSystem, checkCmCollision, danmakuContainerRef]);

  // --- Play/Pause Toggle with CM Support ---
  const togglePlay = () => {
    if (player.isPlaying) {
      // PAUSE Logic
      if (cmSystem.cmStateRef.current.isWaiting) {
        player.setIsPlaying(false);
        const elapsed =
          (performance.now() - cmSystem.cmStateRef.current.waitStartTime) /
          1000;
        cmSystem.cmStateRef.current.accumulatedWaitTime += elapsed;
        cmSystem.setCurrentCmWaitTime(
          cmSystem.cmStateRef.current.accumulatedWaitTime
        );
      } else {
        if (danmakuContainerRef.current) {
          danmakuContainerRef.current.style.setProperty(
            "--play-state",
            "paused"
          );
        }
        player.setIsPlaying(false);
      }
    } else {
      // PLAY Logic -> Delegate to requestPlay
      requestPlay();
    }
  };

  // --- Main Loop ---
  const processDanmakuFrame = useCallback(() => {
    if (!player.videoRef.current) return;

    let displayTime = 0;

    if (cmSystem.cmStateRef.current.isWaiting) {
      // [CM MODE]
      const activeRange = cmSystem.cmRanges.find(
        (r) => r.id === cmSystem.cmStateRef.current.cmRangeId
      );

      if (activeRange) {
        if (player.isPlaying) {
          const elapsed =
            (performance.now() - cmSystem.cmStateRef.current.waitStartTime) /
            1000;
          // displayTime = CM Start + Accumulated Wait (Ref) + Current Session Elapsed
          displayTime =
            activeRange.logStart +
            cmSystem.cmStateRef.current.accumulatedWaitTime +
            elapsed;

          if (displayTime >= activeRange.logEnd) {
            // Exit CM
            cmSystem.cmStateRef.current.isWaiting = false;
            cmSystem.cmStateRef.current.cmRangeId = null;
            cmSystem.cmStateRef.current.justFinishedCmId = activeRange.id;
            cmSystem.setIsWaitingCm(false);

            // Sync video time
            const { videoTime } = cmSystem.logTimeToVideoTime(
              activeRange.logEnd
            );
            if (Math.abs(player.getCurrentTime() - videoTime) > 0.5) {
              player.seekTo(videoTime);
            }

            displayTime = activeRange.logEnd;
            cmSystem.setTotalWaitOffset(
              (prev) => prev + (activeRange.logEnd - activeRange.logStart)
            );

            // Resume video playback
            player.safePlay();
          }
        } else {
          // Paused in CM
          // displayTime = CM Start + Accumulated Wait (Ref)
          displayTime =
            activeRange.logStart +
            cmSystem.cmStateRef.current.accumulatedWaitTime;
        }
      } else {
        // Fallback if range not found
        cmSystem.cmStateRef.current.isWaiting = false;
        cmSystem.setIsWaitingCm(false);
        player.safePlay();
        displayTime = cmSystem.videoTimeToLogTime(player.getCurrentTime());
      }
    } else {
      // [VIDEO MODE]
      const vidTime = player.getCurrentTime();
      displayTime = cmSystem.videoTimeToLogTime(vidTime);

      if (player.isPlaying) {
        // Check for ignore reset
        const justFinishedCmId = cmSystem.cmStateRef.current.justFinishedCmId;
        if (justFinishedCmId) {
          // Find that range to check distance
          // Optimization: checkCmCollision handles iteration, so maybe we just reset if needed here
          // But checkCmCollision logic is cleaner.
          // IMPORTANT: We must perform the reset logic here because checkCmCollision is pure-ish
          const range = cmSystem.cmRanges.find(
            (r) => r.id === justFinishedCmId
          );
          if (range) {
            // Calculate videoStart approx
            // This is tricky without the accumulation map.
            // Simpler: iterate to find video start for this ID
            let d = 0;
            for (const r of [...cmSystem.cmRanges].sort(
              (a, b) => a.logStart - b.logStart
            )) {
              if (r.id === justFinishedCmId) {
                const vs =
                  r.videoStart !== undefined
                    ? r.videoStart
                    : r.logStart - d - cmSystem.timeOffset;
                if (Math.abs(vidTime - vs) > 1.0) {
                  cmSystem.cmStateRef.current.justFinishedCmId = null;
                }
                break;
              }
              d += r.logEnd - r.logStart;
            }
          }
        }

        const collision = checkCmCollision(vidTime, 0.5); // Use lookahead here too
        if (collision) {
          console.log(
            "FrameLoop: Collision detected. Entering Wait Mode.",
            collision
          );
          // Do NOT stop playing state. We keep isPlaying=true so the loop continues.
          // player.setPlayingState(false);

          cmSystem.cmStateRef.current.isWaiting = true;
          cmSystem.cmStateRef.current.cmRangeId = collision.range.id;
          cmSystem.cmStateRef.current.waitStartLogTime = collision.logStart;
          cmSystem.cmStateRef.current.waitStartTime = performance.now();
          cmSystem.cmStateRef.current.accumulatedWaitTime = 0; // Reset accumulated time
          cmSystem.setIsWaitingCm(true);
          cmSystem.setCurrentCmWaitTime(0); // Reset UI wait time

          displayTime = collision.logStart;
        }
      }
    }

    // DOM Updates
    if (
      progressBarRef.current &&
      cmSystem.getTotalDuration > 0 &&
      !isDraggingRef.current
    ) {
      // Display Time is Log Time. We want to show progress relative to Video Start (which is at Log Time = timeOffset).
      // So relative time = displayTime - timeOffset.
      const relativeTime = displayTime - cmSystem.timeOffset;
      const percent = (relativeTime / cmSystem.getTotalDuration) * 100;
      progressBarRef.current.style.width = `${Math.max(
        0,
        Math.min(100, percent)
      )}%`;
    }
    if (
      thumbRef.current &&
      cmSystem.getTotalDuration > 0 &&
      !isDraggingRef.current
    ) {
      const relativeTime = displayTime - cmSystem.timeOffset;
      const percent = (relativeTime / cmSystem.getTotalDuration) * 100;
      thumbRef.current.style.left = `${Math.max(0, Math.min(100, percent))}%`;
    }

    if (Math.abs(displayTime - lastTimeUpdateRef.current) > 0.5) {
      setCurrentTime(displayTime);
      lastTimeUpdateRef.current = displayTime;
    }

    // Use danmakuComments for Danmaku display (Tree support)
    processDanmaku(displayTime, danmakuComments, imageValidityMapRef.current);

    if (player.isPlaying || cmSystem.cmStateRef.current.isWaiting) {
      animationFrameRef.current = requestAnimationFrame(processDanmakuFrame);
    }
  }, [cmSystem, processDanmaku, danmakuComments, checkCmCollision, player]);

  // Track previous isPlaying state for detecting play start
  const prevIsPlayingRef = useRef(player.isPlaying);

  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    const nowPlaying = player.isPlaying;

    if (!wasPlaying && nowPlaying) {
      // Playback just started - skip first processDanmaku to prevent stale comments
      // This handles the case where user paused, browsed log, then resumed
      console.log("[PlayStart] Skipping next process frame");
      skipNextProcess();
    }

    if (nowPlaying) {
      animationFrameRef.current = requestAnimationFrame(processDanmakuFrame);
    } else {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    }

    prevIsPlayingRef.current = nowPlaying;

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [player.isPlaying, processDanmakuFrame, skipNextProcess]);

  // --- Time Synchronization ---
  // Reset initialization flag when sync settings change (not when comments change)
  useEffect(() => {
    timeSyncInitializedRef.current = false;
  }, [videoStartTimeStr, logSystem.startTimeStr]);

  useEffect(() => {
    if (logSystem.comments.length === 0) return;

    // 1. Determine Log Reference Time (Absolute)
    const firstComment = logSystem.comments[0];
    let logRefTime = firstComment.rawTime;
    if (logSystem.startTimeStr) {
      const parts = logSystem.startTimeStr.split(":").map(Number);
      if (parts.length === 3) {
        const h = parts[0];
        const m = parts[1];
        const s = parts[2];
        const refDate = new Date(firstComment.rawTime);
        refDate.setHours(h, m, s, 0);
        logRefTime = refDate.getTime();
      }
    }

    // 2. Determine Video Reference Time (Relative duration from 0:00)
    let videoRefDuration = 0;
    if (videoStartTimeStr) {
      const parts = videoStartTimeStr.split(":").map(Number);
      if (parts.length === 3) {
        videoRefDuration = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      } else if (parts.length === 2) {
        videoRefDuration = (parts[0] * 60 + parts[1]) * 1000;
      }
    }

    // 3. Calculate Video Start Timestamp (Absolute time when video is at 0:00)
    const videoStartTimestamp = logRefTime - videoRefDuration;

    // 4. Calculate Time Offset (Log Time at Video 0)
    // If video starts 10 mins after log, offset is 600s.
    // Video 0 -> Log 600.
    const offset = (videoStartTimestamp - logRefTime) / 1000;
    cmSystem.setTimeOffset(offset);

    // Reset currentTime to offset (Video Time 0:00) ONLY on first initialization
    // This prevents the seek bar from jumping to a non-zero video time when loading a project
    // but avoids resetting currentTime during playback when comments update
    if (!timeSyncInitializedRef.current) {
      setCurrentTime(offset);
      timeSyncInitializedRef.current = true;
    }

    // Check if we need to update to avoid infinite loop
    let needsUpdate = false;
    const updatedComments = logSystem.comments.map((c) => {
      // Comment Time is relative to Log Start (logRefTime)
      const newTime = (c.rawTime - logRefTime) / 1000;
      if (c.time === undefined || Math.abs(c.time - newTime) > 0.001) {
        needsUpdate = true;
      }
      return { ...c, time: newTime };
    });

    if (needsUpdate) {
      logSystem.setComments(updatedComments);
    }
  }, [
    videoStartTimeStr,
    logSystem.comments,
    logSystem.startTimeStr,
    cmSystem.setTimeOffset,
    logSystem,
    cmSystem,
  ]); // Added startTimeStr dependency

  // --- Derived State for Active Comment ID ---
  // Use visibleComments (time-sorted) instead of danmakuComments (tree-sorted)
  // to ensure stable activeCommentId calculation
  // In tree view mode, only track root comments (those without anchors)
  const activeCommentId = useMemo(() => {
    const sourceComments = logSystem.visibleComments;
    if (!sourceComments || sourceComments.length === 0) return null;

    // Regex to detect anchor references (>>123, ＞＞123, &gt;&gt;123)
    const anchorRegex = /(?:>>|＞＞|&gt;&gt;)\s*\d+/;

    for (let i = sourceComments.length - 1; i >= 0; i--) {
      if (sourceComments[i].time <= currentTime) {
        // In tree view mode, skip non-root comments (those with anchors)
        if (enableTreeView && anchorRegex.test(sourceComments[i].text)) {
          continue;
        }
        console.log("[ActiveCommentId]", {
          currentTime,
          commentTime: sourceComments[i].time,
          id: sourceComments[i].id,
          index: i,
        });
        return sourceComments[i].id;
      }
    }
    return null;
  }, [logSystem.visibleComments, currentTime, enableTreeView]);

  // --- Event Handlers ---
  const handleCommentClick = (time) => {
    performSeek(time);
    setIsAutoScroll(true);
    setShowScrollButton(false);
  };

  const handleSyncButton = () => {
    setIsAutoScroll(true);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (player.isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (player.isPlaying) setShowControls(false);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  };

  const handleLogFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFiles = [];
    for (const file of files) {
      try {
        const result = await parseLogFile(file);
        if (result && result.rawComments && result.rawComments.length > 0) {
          newFiles.push(result);
        }
      } catch (err) {
        console.error("Error parsing file:", file.name, err);
      }
    }

    if (newFiles.length > 0) {
      logSystem.addLoadedFiles(newFiles);
      if (!logSystem.startTimeStr && newFiles[0].startDate) {
        const date = new Date(newFiles[0].startDate);
        const timeStr = date.toTimeString().split(" ")[0];
        logSystem.setStartTimeStr(timeStr);
      }
    }
  };

  const handleCmSkip = useCallback(() => {
    const currentRangeId = cmSystem.cmStateRef.current.cmRangeId;
    if (!currentRangeId) return;

    const currentRange = cmSystem.cmRanges.find((r) => r.id === currentRangeId);
    if (!currentRange) return;

    // Prevent re-triggering for this specific CM range
    cmSystem.cmStateRef.current.justFinishedCmId = currentRangeId;

    // Clear waiting state
    cmSystem.cmStateRef.current.isWaiting = false;
    cmSystem.setIsWaitingCm(false);

    // Seek to end of CM (plus small buffer to ensure we are out of range)
    performSeek(currentRange.logEnd + 0.1);

    // Resume playback with a slight delay to ensure seek is complete and pause events are cleared
    setTimeout(() => {
      player.safePlay();
    }, 100);
  }, [cmSystem, player, performSeek]);

  return {
    // Systems
    player,
    cmSystem,
    logSystem,
    danmaku,

    // State
    currentTime,
    dmSettings,
    setDmSettings,
    abeModeUnlocked,
    unlockAbeMode,
    isAutoScroll,
    setIsAutoScroll,
    skipSeconds,
    setSkipSeconds,
    videoStartTimeStr,
    setVideoStartTimeStr,
    showControls,
    setShowControls,
    showScrollButton,
    setShowScrollButton,
    activeCommentId,
    danmakuComments, // Export for tree popup

    // Refs
    progressBarRef,
    thumbRef,

    // Actions
    togglePlay,
    requestPlay, // Export safety play
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    handleCmSkip, // Exported
    handleCommentClick,
    handleSyncButton,
    handleMouseMove,
    handleMouseLeave,
    handleLogFileChange,
    resetPlayerState,
  };
};
