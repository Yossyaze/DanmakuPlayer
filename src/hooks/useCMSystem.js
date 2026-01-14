import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- Pure Helper Functions ---

// Helper to parse time string "HH:MM:SS" or "MM:SS" to seconds
const parseTimeStr = (str) => {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

// Helper to convert absolute time string to relative log time
const parseLogTimeInput = (inputStr, startTimeStr) => {
  const inputSec = parseTimeStr(inputStr);
  if (!startTimeStr) return inputSec;
  const startSec = parseTimeStr(startTimeStr);
  return inputSec - startSec;
};

// Parse date+time to absolute seconds from a reference date
// Returns seconds relative to (startDateStr + startTimeStr)
const parseDateTimeInput = (dateStr, timeStr, startDateStr, startTimeStr) => {
  // If no date provided, fall back to time-only parsing
  if (!dateStr || !startDateStr) {
    return parseLogTimeInput(timeStr, startTimeStr);
  }

  // Parse input date+time to timestamp
  const inputTime = parseTimeStr(timeStr);
  const inputDate = new Date(dateStr);
  if (isNaN(inputDate.getTime())) {
    // Fallback: if dateStr is partial, try to fix it or use startDateStr
    const fixedDateStr = dateStr.replace(/-+$/, '');
    const retryDate = new Date(fixedDateStr);
    if (isNaN(retryDate.getTime())) {
      return parseLogTimeInput(timeStr, startTimeStr);
    }
    inputDate.setTime(retryDate.getTime());
  }
  inputDate.setHours(0, 0, 0, 0);
  const inputTimestamp = inputDate.getTime() / 1000 + inputTime;

  // Parse start date+time to timestamp
  const startTime = parseTimeStr(startTimeStr || '00:00:00');
  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) return inputTimestamp - startTime; // Should not happen with valid startDateStr
  startDate.setHours(0, 0, 0, 0);
  const startTimestamp = startDate.getTime() / 1000 + startTime;

  // Return relative seconds
  return inputTimestamp - startTimestamp;
};

// Helper to format log time back to string
const formatLogTime = (logSec, startTimeStr) => {
  let totalSec = logSec;
  if (startTimeStr) {
    const startSec = parseTimeStr(startTimeStr);
    totalSec += startSec;
  }
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper to recalculate videoStart, logStart, and accumulated CM duration for all ranges
// Now uses videoStart (Video Time) as the anchor for CM start position
const recalculateCmVideoTimes = (ranges, offset) => {
  // Sort by videoStart (Video Time) if available
  // Fallback to logStart - offset for legacy data
  const sorted = [...ranges].sort((a, b) => {
    const aStart = a.videoStart !== undefined ? a.videoStart : a.logStart - offset;
    const bStart = b.videoStart !== undefined ? b.videoStart : b.logStart - offset;
    return aStart - bStart;
  });

  let accumulatedCmDuration = 0;
  return sorted.map((range) => {
    let videoStart;

    if (range.videoStart !== undefined) {
      // Primary Source: Video Time
      videoStart = range.videoStart;
    } else if (range.logicalStart !== undefined) {
      // Migration: Convert from ephemeral logicalStart format
      // logicalStart = videoStart + accBefore
      videoStart = range.logicalStart - accumulatedCmDuration;
    } else {
      // Legacy: Convert from logStart
      // logStart = videoStart + accBefore + offset
      videoStart = range.logStart - accumulatedCmDuration - offset;
    }

    // Recalculate derived values based on current sequence
    // logStart (Log Time) = videoStart + accumulatedCmDuration + offset
    const logStart = videoStart + accumulatedCmDuration + offset;

    // logicalStart (Seekbar Time) = videoStart + accumulatedCmDuration
    const logicalStart = videoStart + accumulatedCmDuration;

    // duration is derived from logEnd (fixed anchor) - logStart (calculated)
    const duration = range.logEnd - logStart;
    const accBefore = accumulatedCmDuration;
    accumulatedCmDuration += duration;

    // Return normalized object with videoStart as the preserved anchor
    return { ...range, videoStart, logStart, logicalStart, accBefore, duration };
  });
};

export const useCMSystem = (videoDuration) => {
  const [cmRanges, setCmRanges] = useState([]);
  const [cmStartInput, setCmStartInput] = useState('');
  const [cmEndInput, setCmEndInput] = useState('');
  const [cmStartDateInput, setCmStartDateInput] = useState('');
  const [cmEndDateInput, setCmEndDateInput] = useState('');

  // CM Wait State
  const [isWaitingCm, setIsWaitingCm] = useState(false);
  const [currentCmWaitTime, setCurrentCmWaitTime] = useState(0);
  const [totalWaitOffset, setTotalWaitOffset] = useState(0);
  const [logStartTime, setTimeOffset] = useState(0); // Log Time at Video 0

  const cmStateRef = useRef({
    isWaiting: false,
    waitStartTime: 0,
    waitStartLogTime: 0,
    cmRangeId: null,
    justFinishedCmId: null,
    pausedLogTime: null,
    accumulatedWaitTime: 0, // Added for immediate sync
  });

  const resetCmState = useCallback(() => {
    setIsWaitingCm(false);
    setCurrentCmWaitTime(0);
    setTotalWaitOffset(0);
    cmStateRef.current = {
      isWaiting: false,
      waitStartTime: 0,
      waitStartLogTime: 0,
      cmRangeId: null,
      justFinishedCmId: null,
      pausedLogTime: null,
      accumulatedWaitTime: 0,
    };
  }, []);

  // Safe CM State Updater
  const updateCmState = useCallback((partialState) => {
    cmStateRef.current = { ...cmStateRef.current, ...partialState };
  }, []);

  // Update ranges when logStartTime changes
  useEffect(() => {
    // eslint-disable-next-line
    setCmRanges((prev) => recalculateCmVideoTimes(prev, logStartTime));
  }, [logStartTime]);

  const addCmRange = useCallback(
    (range) => {
      setCmRanges((prev) => {
        const newRanges = [...prev, { ...range, id: Date.now() }];
        return recalculateCmVideoTimes(newRanges, logStartTime);
      });
    },
    [logStartTime]
  );

  const removeCmRange = useCallback(
    (index) => {
      setCmRanges((prev) => {
        const newRanges = prev.filter((_, i) => i !== index);
        return recalculateCmVideoTimes(newRanges, logStartTime);
      });
    },
    [logStartTime]
  );

  const getTotalDuration = useMemo(() => {
    const totalCmDuration = cmRanges.reduce((acc, r) => acc + (r.logEnd - r.logStart), 0);
    return (videoDuration || 0) + totalCmDuration;
  }, [videoDuration, cmRanges]);

  const logTimeToVideoTime = useCallback(
    (logTime) => {
      let videoTime = logTime;
      let inCmRange = false;
      let cmRange = null;

      // cmRanges should already be sorted and have accBefore/videoStart from recalculateCmVideoTimes
      // Find the relevant range
      let offset = 0;
      for (const range of cmRanges) {
        if (logTime >= range.logStart && logTime < range.logEnd) {
          // Inside this CM range
          inCmRange = true;
          cmRange = range;
          videoTime =
            range.videoStart !== undefined
              ? range.videoStart
              : range.logStart - (range.accBefore || 0) - logStartTime;
          break;
        }
        if (logTime >= range.logEnd) {
          // Use pre-calculated duration if available
          offset =
            range.accBefore !== undefined
              ? range.accBefore + range.duration
              : offset + (range.logEnd - range.logStart);
        }
      }

      if (!inCmRange) {
        videoTime = logTime - offset - logStartTime;
      }

      return { videoTime, inCmRange, cmRange };
    },
    [cmRanges, logStartTime]
  );

  const videoTimeToLogTime = useCallback(
    (videoTime) => {
      // cmRanges should already be sorted and have pre-calculated videoStart, accBefore, duration
      // LogTime = VideoTime + accumulated offset + logStartTime
      let offset = 0;

      for (const range of cmRanges) {
        // Use pre-calculated videoStart if available
        const videoStart =
          range.videoStart !== undefined
            ? range.videoStart
            : range.logStart - (range.accBefore || 0) - logStartTime;
        if (videoTime >= videoStart) {
          // Use pre-calculated values if available
          offset =
            range.accBefore !== undefined
              ? range.accBefore + range.duration
              : offset + (range.logEnd - range.logStart);
        }
      }

      return videoTime + offset + logStartTime;
    },
    [cmRanges, logStartTime]
  );

  const addCmRangeSmart = useCallback(
    (
      startMode,
      startInput,
      endMode,
      endInput,
      startTimeStr,
      startDateInput,
      endDateInput,
      startDateStr
    ) => {
      let logStartInput = 0;
      let logEnd = 0;

      // 1. Calculate Log Start Input (Temporary, to get Video Time)
      if (startMode === 'log') {
        logStartInput = parseDateTimeInput(startDateInput, startInput, startDateStr, startTimeStr);
      } else if (startMode === 'video') {
        const logicalTime = parseTimeStr(startInput);
        logStartInput = logicalTime + logStartTime;
      }

      // 2. Calculate Video Start (The Anchor)
      // Use existing ranges to find where this log time maps to in Video Time
      const { videoTime: videoStart } = logTimeToVideoTime(logStartInput);

      // 3. Calculate Log End (Log Time)
      // Duration is based on the ephemeral logStartInput
      if (endMode === 'duration') {
        const duration = parseTimeStr(endInput);
        logEnd = logStartInput + duration;
      } else if (endMode === 'log') {
        logEnd = parseDateTimeInput(endDateInput, endInput, startDateStr, startTimeStr);
      } else if (endMode === 'video') {
        const videoTime = parseTimeStr(endInput);
        logEnd = videoTimeToLogTime(videoTime);
      }

      // Normalize Labels (Display Purpose)
      const labelStart = formatLogTime(logStartInput, startTimeStr);
      const labelEnd = formatLogTime(logEnd, startTimeStr);

      addCmRange({
        videoStart, // 動画時間で保存（新形式）
        logEnd, // ログ時間で保存
        labelStart,
        labelEnd,
        startDateStr: startDateInput || '',
        endDateStr: endDateInput || '',
      });
    },
    [addCmRange, logStartTime, logTimeToVideoTime, videoTimeToLogTime]
  );

  const updateCmRange = useCallback(
    (
      index,
      startMode,
      startInput,
      endMode,
      endInput,
      startTimeStr,
      startDateInput,
      endDateInput,
      startDateStr
    ) => {
      const target = cmRanges[index];
      if (!target) return;

      let logStartInput = 0;
      let logEnd = 0;

      // 1. Calculate Log Start Input
      if (startMode === 'log') {
        logStartInput = parseDateTimeInput(startDateInput, startInput, startDateStr, startTimeStr);
      } else if (startMode === 'video') {
        const logicalTime = parseTimeStr(startInput);
        logStartInput = logicalTime + logStartTime;
      }

      // 2. Calculate Video Start
      // IMPORTANT: When updating, we need to be careful if we are moving the range itself?
      // logTimeToVideoTime uses current ranges. If we are updating range[i], its current position affects the calculation?
      // "logTimeToVideoTime" excludes the time inside CM ranges.
      // If we are just moving the start time of THIS range, we should ideally exclude THIS range from the calculation context
      // to find the pure video time at that log point?
      // Actually, logTimeToVideoTime is designed to map any log time to video time.
      // If logStartInput falls inside another CM, videoTime will be the start of that CM.
      // If it falls inside THIS CM (which is being updated), it might be tricky.

      // Ideally, we should calculate video time "as if this CM didn't exist" if we are moving it?
      // But simpler approach: Calculate videoStart based on the input log time using global context.
      // IF the user specifies a time that is currently inside a CM, they probably mean that log time.
      // The resulting videoStart will correspond to the video frame at that log time.

      const { videoTime: videoStart } = logTimeToVideoTime(logStartInput);

      // 3. Calculate Log End
      if (endMode === 'duration') {
        const duration = parseTimeStr(endInput);
        logEnd = logStartInput + duration;
      } else if (endMode === 'log') {
        logEnd = parseDateTimeInput(endDateInput, endInput, startDateStr, startTimeStr);
      } else if (endMode === 'video') {
        const videoTime = parseTimeStr(endInput);
        logEnd = videoTimeToLogTime(videoTime);
      }

      // Normalize Labels
      const labelStart = formatLogTime(logStartInput, startTimeStr);
      const labelEnd = formatLogTime(logEnd, startTimeStr);

      const updatedRange = {
        ...target,
        videoStart, // 動画時間で更新
        logEnd,
        labelStart,
        labelEnd,
        startDateStr: startDateInput || '',
        endDateStr: endDateInput || '',
      };

      // Remove obsolete logicalStart if present
      delete updatedRange.logicalStart;

      setCmRanges((prev) => {
        const newRanges = [...prev];
        newRanges[index] = updatedRange;
        return recalculateCmVideoTimes(newRanges, logStartTime);
      });
    },
    [cmRanges, logStartTime, logTimeToVideoTime, videoTimeToLogTime]
  );

  return {
    cmRanges,
    setCmRanges,
    cmStartInput,
    setCmStartInput,
    cmEndInput,
    setCmEndInput,
    cmStartDateInput,
    setCmStartDateInput,
    cmEndDateInput,
    setCmEndDateInput,
    isWaitingCm,
    setIsWaitingCm,
    currentCmWaitTime,
    setCurrentCmWaitTime,
    totalWaitOffset,
    setTotalWaitOffset,
    logStartTime,
    setTimeOffset,
    cmStateRef,
    updateCmState,
    resetCmState,
    addCmRange,
    addCmRangeSmart,
    updateCmRange,
    removeCmRange,
    getTotalDuration,
    logTimeToVideoTime,
    videoTimeToLogTime,
  };
};
