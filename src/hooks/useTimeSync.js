import { useEffect, useRef } from 'react';

export const useTimeSync = ({ videoStartTimeStr, logSystem, cmSystem, setCurrentTime }) => {
  const timeSyncInitializedRef = useRef(false); // Track if time sync has been done

  // --- Time Synchronization ---
  // Reset initialization flag when sync settings change (not when comments change)
  // Use Refs to track 'real' changes to prevent infinite loops or accidental resets
  const prevVideoStartTimeRef = useRef(videoStartTimeStr);
  const prevLogStartTimeRef = useRef(logSystem.startTimeStr);

  useEffect(() => {
    if (
      prevVideoStartTimeRef.current !== videoStartTimeStr ||
      prevLogStartTimeRef.current !== logSystem.startTimeStr
    ) {
      timeSyncInitializedRef.current = false;
      prevVideoStartTimeRef.current = videoStartTimeStr;
      prevLogStartTimeRef.current = logSystem.startTimeStr;
    }
  }, [videoStartTimeStr, logSystem.startTimeStr]);

  useEffect(() => {
    if (logSystem.comments.length === 0) return;

    // Trigger only if settings changed, or first load.
    // IF user manually changed offset, timeSyncInitializedRef is true.
    // We should NOT overwrite unless videoStartTimeStr / logSystem.startTimeStr explicit change detected above.
    if (timeSyncInitializedRef.current) {
      // Already initialized and no config change.
      return;
    }

    // 1. Determine Log Reference Time (Absolute)
    const firstComment = logSystem.comments[0];
    let logRefTime = firstComment.rawTime;
    if (logSystem.startTimeStr) {
      const parts = logSystem.startTimeStr.split(':').map(Number);
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
      const parts = videoStartTimeStr.split(':').map(Number);
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
    cmSystem, // cmSystem object structure should be stable
    logSystem,
    setCurrentTime,
  ]);

  return {
    timeSyncInitializedRef,
  };
};
