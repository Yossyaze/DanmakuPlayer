import { useEffect, useRef } from 'react';

import {
  normalizeCommentTimes,
  parseSyncTime,
  resolveLogReferenceTime,
} from '../utils/timeSyncUtils';

export const useTimeSync = ({ videoStartTimeStr, logSystem, cmSystem, setCurrentTime }) => {
  const timeSyncInitializedRef = useRef(false);
  const hasEverInitializedRef = useRef(false); // Track if we've ever done initial sync

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

    const videoLogicalTime = parseSyncTime(videoStartTimeStr);
    const logRefTime = resolveLogReferenceTime(
      logSystem.comments,
      logSystem.startTimeStr,
      logSystem.startDateStr
    );

    // Calculate offset and update logStartTime
    // On first init: set currentTime to offset (start at 0:00 on seekbar)
    // On subsequent changes: preserve the seekbar position
    if (!timeSyncInitializedRef.current) {
      const offset = -videoLogicalTime;
      const prevOffset = cmSystem.logStartTime;
      const isFirstEverInit = !hasEverInitializedRef.current;

      cmSystem.setTimeOffset(offset);

      if (isFirstEverInit) {
        // True first initialization: start at seekbar 0:00
        setCurrentTime(offset);
        hasEverInitializedRef.current = true;
      } else if (prevOffset !== offset) {
        // Re-init with offset change: adjust currentTime by delta
        const delta = offset - prevOffset;
        setCurrentTime((prevCurrentTime) => prevCurrentTime + delta);
      }
      // If offset is the same (log start time change only), just skip - don't reset currentTime

      timeSyncInitializedRef.current = true;
    }

    const { comments: updatedComments, needsUpdate } = normalizeCommentTimes(
      logSystem.comments,
      logRefTime
    );

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
