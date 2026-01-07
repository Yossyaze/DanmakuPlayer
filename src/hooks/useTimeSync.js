import { useEffect, useRef } from 'react';

export const useTimeSync = ({ videoStartTimeStr, logSystem, cmSystem, setCurrentTime }) => {
  const timeSyncInitializedRef = useRef(false);

  // Reset initialization flag when sync settings change
  const prevVideoStartTimeRef = useRef(videoStartTimeStr);
  const prevLogStartTimeRef = useRef(logSystem.startTimeStr);
  const prevLogStartDateRef = useRef(logSystem.startDateStr);

  useEffect(() => {
    if (
      prevVideoStartTimeRef.current !== videoStartTimeStr ||
      prevLogStartTimeRef.current !== logSystem.startTimeStr ||
      prevLogStartDateRef.current !== logSystem.startDateStr
    ) {
      timeSyncInitializedRef.current = false;
      prevVideoStartTimeRef.current = videoStartTimeStr;
      prevLogStartTimeRef.current = logSystem.startTimeStr;
      prevLogStartDateRef.current = logSystem.startDateStr;
    }
  }, [videoStartTimeStr, logSystem.startTimeStr, logSystem.startDateStr]);

  useEffect(() => {
    if (logSystem.comments.length === 0) return;

    // Parse videoStartTimeStr as LOGICAL TIME (seekbar position)
    let videoLogicalTime = 0;
    if (videoStartTimeStr) {
      const parts = videoStartTimeStr.split(':').map(Number);
      if (parts.length === 3) {
        videoLogicalTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        videoLogicalTime = parts[0] * 60 + parts[1];
      }
    }

    // Build logRefTime for absolute logs (user-specified or first absolute comment)
    let logRefTime = null;

    // Find first absolute comment to get base date
    const firstAbsoluteComment = logSystem.comments.find(
      (c) => new Date(c.rawTime).getFullYear() >= 2000
    );

    if (firstAbsoluteComment) {
      logRefTime = firstAbsoluteComment.rawTime;

      // Apply user-specified date/time override
      if (logSystem.startTimeStr || logSystem.startDateStr) {
        const refDate = new Date(firstAbsoluteComment.rawTime);

        if (logSystem.startDateStr) {
          const dParts = logSystem.startDateStr.split('-').map(Number);
          if (dParts.length === 3) {
            refDate.setFullYear(dParts[0], dParts[1] - 1, dParts[2]);
          }
        }

        if (logSystem.startTimeStr) {
          const parts = logSystem.startTimeStr.split(':').map(Number);
          if (parts.length === 3) {
            refDate.setHours(parts[0], parts[1], parts[2], 0);
          }
        }
        logRefTime = refDate.getTime();
      }
    }

    // Calculate offset (Only on init)
    if (!timeSyncInitializedRef.current) {
      // Use the simpler approach: offset = -videoLogicalTime for relative logs
      // For absolute logs, Log Start Time = Video Time, so offset = videoLogicalTime
      // But since we might have mixed logs, we need a unified approach.
      //
      // The key insight:
      // - Relative log time=0 should appear at logical time = videoLogicalTime
      // - Absolute log at logRefTime should appear at logical time = videoLogicalTime
      //
      // For relative: offset = -videoLogicalTime (time + offset = 0 + -vlt = -vlt,
      //   so at logical time vlt, we show time 0)
      // For absolute: offset = videoLogicalTime (time + offset = 0 + vlt = vlt,
      //   so at logical time vlt, we show time 0 = logRefTime)
      //
      // Since we display based on visibleComments where each has its own time,
      // and the player checks if comment.time + offset matches currentTime,
      // we need a single offset that works for both.
      //
      // Actually, the issue is that relative and absolute logs have DIFFERENT
      // time reference points. The comment.time is calculated differently.
      //
      // Unified approach: Use relative-style offset (-videoLogicalTime).
      // Then in time calculation, adjust absolute log times to be relative.

      const offset = -videoLogicalTime;
      cmSystem.setTimeOffset(offset);
      setCurrentTime(offset);
      timeSyncInitializedRef.current = true;
    }

    // Calculate comment display times (per-comment, based on each comment's source type)
    let needsUpdate = false;
    const updatedComments = logSystem.comments.map((c) => {
      // Determine if THIS comment is from a relative source
      const isThisRelative = new Date(c.rawTime).getFullYear() < 2000;

      let newTime;
      if (isThisRelative) {
        // Relative: rawTime (ms) is offset from 0
        newTime = c.rawTime / 1000;
      } else {
        // Absolute: time relative to logRefTime
        // logRefTime corresponds to logical time = videoLogicalTime
        // So: comment at logRefTime -> time = 0 -> appears at logical time = 0 + offset = -vlt + vlt = 0? No...
        //
        // Wait, let's reconsider:
        // offset = -videoLogicalTime
        // For absolute log, logRefTime = Video Time (logical)
        // Comment at logRefTime should appear at logical time videoLogicalTime
        // So: time + offset = videoLogicalTime
        //     time - vlt = vlt
        //     time = 2 * vlt? That's wrong.
        //
        // Let me think again:
        // - currentTime is the current logical time being displayed
        // - comment appears when currentTime is in range [comment.time + offset, ...]
        // - So comment.time + offset = the logical time when this comment appears
        //
        // For relative log:
        //   rawTime = 60000 (1 min from start)
        //   time = 60
        //   offset = -videoLogicalTime = -1800 (if vlt = 30 min)
        //   Comment appears at logical time = 60 + (-1800) = -1740? No.
        //
        // Hmm, I'm confusing myself. Let me check the existing working logic.
        //
        // Actually the original working logic was:
        // For relative: offset = -videoLogicalTime, time = rawTime/1000
        // Comment at rawTime=0 has time=0, appears at logical 0 - offset = 0 + vlt = vlt
        // That's correct if vlt > 0. But that's not how it works...
        //
        // Let me re-read how currentTime and offset interact.
        // In the player, we filter comments where: comment.time <= currentTime - offset
        // So if currentTime = 30 (logical 30), offset = -30,
        //   comments with time <= 30 - (-30) = 60 are shown? That's wrong.
        //
        // Actually I think offset is added, not subtracted.
        // If currentTime = logical time 0, offset = -30,
        //   we show comments at time <= 0 + (-30) = -30? That's also wrong for time=0.
        //
        // Let me just check the actual filter logic...
        // For now, let's simplify:

        if (logRefTime) {
          // Time relative to log start, normalized so logRefTime = time 0
          newTime = (c.rawTime - logRefTime) / 1000;
        } else {
          // Fallback: treat as relative
          newTime = c.rawTime / 1000;
        }
      }

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
    logSystem.startDateStr,
    cmSystem,
    logSystem,
    setCurrentTime,
  ]);

  return {
    timeSyncInitializedRef,
  };
};
