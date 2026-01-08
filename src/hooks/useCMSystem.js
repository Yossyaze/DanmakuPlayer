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

// Helper to recalculate videoStart and accumulated CM duration for all ranges
const recalculateCmVideoTimes = (ranges, offset) => {
  const sorted = [...ranges].sort((a, b) => a.logStart - b.logStart);
  let accumulatedCmDuration = 0;
  return sorted.map((range) => {
    // videoStart is relative to Video 0
    // LogStart = VideoStart + accumulatedCmDuration + offset
    // VideoStart = LogStart - accumulatedCmDuration - offset
    const videoStart = range.logStart - accumulatedCmDuration - offset;
    const duration = range.logEnd - range.logStart;
    const accBefore = accumulatedCmDuration;
    accumulatedCmDuration += duration;
    return { ...range, videoStart, accBefore, duration };
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

  // Convert logical time (seekbar time) to log time
  // Logical time = video time + accumulated CM wait time
  // This is the inverse: given a logical time, find the log time
  const logicalTimeToLogTime = useCallback(
    (logicalTime) => {
      return logicalTime + logStartTime;
    },
    [logStartTime]
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
      let logStart = 0;
      let logEnd = 0;

      // 1. Calculate Log Start
      if (startMode === 'log') {
        logStart = parseDateTimeInput(startDateInput, startInput, startDateStr, startTimeStr);
      } else if (startMode === 'video') {
        const logicalTime = parseTimeStr(startInput);
        logStart = logicalTimeToLogTime(logicalTime);
      }

      // 2. Calculate Log End
      if (endMode === 'duration') {
        const duration = parseTimeStr(endInput);
        logEnd = logStart + duration;
      } else if (endMode === 'log') {
        logEnd = parseDateTimeInput(endDateInput, endInput, startDateStr, startTimeStr);
      } else if (endMode === 'video') {
        const videoTime = parseTimeStr(endInput);
        logEnd = videoTimeToLogTime(videoTime);
      }

      // Normalize Labels to Log Time
      const labelStart = formatLogTime(logStart, startTimeStr);
      const labelEnd = formatLogTime(logEnd, startTimeStr);

      addCmRange({
        logStart,
        logEnd,
        labelStart,
        labelEnd,
        startDateStr: startDateInput || '',
        endDateStr: endDateInput || '',
        videoStart: 0,
      });
    },
    [addCmRange, logicalTimeToLogTime, videoTimeToLogTime]
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

      let logStart = 0;
      let logEnd = 0;

      // 1. Calculate Log Start
      if (startMode === 'log') {
        logStart = parseDateTimeInput(startDateInput, startInput, startDateStr, startTimeStr);
      } else if (startMode === 'video') {
        const logicalTime = parseTimeStr(startInput);
        logStart = logicalTimeToLogTime(logicalTime);
      }

      // 2. Calculate Log End
      if (endMode === 'duration') {
        const duration = parseTimeStr(endInput);
        logEnd = logStart + duration;
      } else if (endMode === 'log') {
        logEnd = parseDateTimeInput(endDateInput, endInput, startDateStr, startTimeStr);
      } else if (endMode === 'video') {
        const videoTime = parseTimeStr(endInput);
        logEnd = videoTimeToLogTime(videoTime);
      }

      // Normalize Labels to Log Time
      const labelStart = formatLogTime(logStart, startTimeStr);
      const labelEnd = formatLogTime(logEnd, startTimeStr);

      const updatedRange = {
        ...target,
        logStart,
        logEnd,
        labelStart,
        labelEnd,
        startDateStr: startDateInput || '',
        endDateStr: endDateInput || '',
      };

      setCmRanges((prev) => {
        const newRanges = [...prev];
        newRanges[index] = updatedRange;
        return recalculateCmVideoTimes(newRanges, logStartTime);
      });
    },
    [cmRanges, logStartTime, logicalTimeToLogTime, videoTimeToLogTime]
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
