import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

export const useCMSystem = (videoDuration) => {
    const [cmRanges, setCmRanges] = useState([]);
    const [cmStartInput, setCmStartInput] = useState("");
    const [cmEndInput, setCmEndInput] = useState("");

    // CM Wait State
    const [isWaitingCm, setIsWaitingCm] = useState(false);
    const [currentCmWaitTime, setCurrentCmWaitTime] = useState(0);
    const [totalWaitOffset, setTotalWaitOffset] = useState(0);
    const [timeOffset, setTimeOffset] = useState(0); // Log Time at Video 0

    const cmStateRef = useRef({
        isWaiting: false,
        waitStartTime: 0,
        waitStartLogTime: 0,
        cmRangeId: null,
        justFinishedCmId: null,
        pausedLogTime: null,
        accumulatedWaitTime: 0 // Added for immediate sync
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
            accumulatedWaitTime: 0
        };
    }, []);

    // Helper to recalculate videoStart for all ranges
    const recalculateCmVideoTimes = (ranges, offset = timeOffset) => {
        const sorted = [...ranges].sort((a, b) => a.logStart - b.logStart);
        let accumulatedCmDuration = 0;
        return sorted.map(range => {
            // videoStart is relative to Video 0
            // LogStart = VideoStart + accumulatedCmDuration + offset
            // VideoStart = LogStart - accumulatedCmDuration - offset
            const videoStart = range.logStart - accumulatedCmDuration - offset;
            accumulatedCmDuration += (range.logEnd - range.logStart);
            return { ...range, videoStart };
        });
    };

    // Update ranges when timeOffset changes
    useEffect(() => {
        setCmRanges(prev => recalculateCmVideoTimes(prev, timeOffset));
    }, [timeOffset]);

    const addCmRange = useCallback((range) => {
        setCmRanges(prev => {
            const newRanges = [...prev, { ...range, id: Date.now() }];
            return recalculateCmVideoTimes(newRanges, timeOffset);
        });
    }, [timeOffset]);

    const removeCmRange = useCallback((index) => {
        setCmRanges(prev => {
            const newRanges = prev.filter((_, i) => i !== index);
            return recalculateCmVideoTimes(newRanges, timeOffset);
        });
    }, [timeOffset]);

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

    const getTotalDuration = useMemo(() => {
        const totalCmDuration = cmRanges.reduce((acc, r) => acc + (r.logEnd - r.logStart), 0);
        return (videoDuration || 0) + totalCmDuration;
    }, [videoDuration, cmRanges]);

    const logTimeToVideoTime = useCallback((logTime) => {
        let videoTime = logTime;
        let inCmRange = false;
        let cmRange = null;

        // Sort ranges
        const sorted = [...cmRanges].sort((a, b) => a.logStart - b.logStart);
        let offset = 0;

        for (const range of sorted) {
            if (logTime >= range.logStart && logTime < range.logEnd) {
                inCmRange = true;
                cmRange = range;
                // Use pre-calculated videoStart if available, otherwise fallback
                videoTime = (range.videoStart !== undefined) ? range.videoStart : (range.logStart - offset - timeOffset);
                break;
            }
            if (logTime >= range.logEnd) {
                offset += (range.logEnd - range.logStart);
            }
        }

        if (!inCmRange) {
            videoTime = logTime - offset - timeOffset;
        }

        return { videoTime, inCmRange, cmRange };
    }, [cmRanges, timeOffset]);

    const videoTimeToLogTime = useCallback((videoTime) => {
        // LogTime = VideoTime + Offset + TimeOffset
        const sorted = [...cmRanges].sort((a, b) => a.logStart - b.logStart);
        let offset = 0;

        for (const range of sorted) {
            // videoStart = range.logStart - offset - timeOffset
            const videoStart = range.logStart - offset - timeOffset;
            if (videoTime >= videoStart) {
                offset += (range.logEnd - range.logStart);
            }
        }

        return videoTime + offset + timeOffset;
    }, [cmRanges, timeOffset]);

    // Convert logical time (seekbar time) to log time
    // Logical time = video time + accumulated CM wait time
    // This is the inverse: given a logical time, find the log time
    const logicalTimeToLogTime = useCallback((logicalTime) => {
        // For logical time input, we need to find the corresponding log time
        // Logical time is essentially the "perceived" time on the seekbar
        // which equals video time + CM time that has passed
        // So logicalTime = logTime - timeOffset (assuming no CM midway)
        // But with CM, logicalTime = videoTime + passedCmTime
        // We need: logTime from logicalTime
        // logicalTime = logTime - timeOffset (since logical time 0 = log start)
        // Therefore: logTime = logicalTime + timeOffset
        return logicalTime + timeOffset;
    }, [timeOffset]);

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

    const addCmRangeSmart = useCallback((startMode, startInput, endMode, endInput, startTimeStr) => {
        let logStart = 0;
        let logEnd = 0;

        // 1. Calculate Log Start
        if (startMode === 'log') {
            logStart = parseLogTimeInput(startInput, startTimeStr);
        } else if (startMode === 'video') {
            // User inputs logical time (seekbar time), convert to log time
            const logicalTime = parseTimeStr(startInput);
            logStart = logicalTimeToLogTime(logicalTime);
        }

        // 2. Calculate Log End
        if (endMode === 'duration') {
            const duration = parseTimeStr(endInput);
            logEnd = logStart + duration;
        } else if (endMode === 'log') {
            logEnd = parseLogTimeInput(endInput, startTimeStr);
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
            videoStart: 0 // Will be recalculated
        });
    }, [addCmRange, logicalTimeToLogTime]);

    const updateCmRange = useCallback((index, startMode, startInput, endMode, endInput, startTimeStr) => {
        setCmRanges(prev => {
            const newRanges = [...prev];
            const target = newRanges[index];
            if (!target) return prev;

            let logStart = 0;
            let logEnd = 0;

            // 1. Calculate Log Start
            if (startMode === 'log') {
                logStart = parseLogTimeInput(startInput, startTimeStr);
            } else if (startMode === 'video') {
                // User inputs logical time (seekbar time), convert to log time
                const logicalTime = parseTimeStr(startInput);
                logStart = logicalTimeToLogTime(logicalTime);
            }

            // 2. Calculate Log End
            if (endMode === 'duration') {
                const duration = parseTimeStr(endInput);
                logEnd = logStart + duration;
            } else if (endMode === 'log') {
                logEnd = parseLogTimeInput(endInput, startTimeStr);
            } else if (endMode === 'video') {
                const videoTime = parseTimeStr(endInput);
                logEnd = videoTimeToLogTime(videoTime);
            }

            // Normalize Labels to Log Time
            const labelStart = formatLogTime(logStart, startTimeStr);
            const labelEnd = formatLogTime(logEnd, startTimeStr);

            newRanges[index] = {
                ...target,
                logStart,
                logEnd,
                labelStart,
                labelEnd
            };

            return recalculateCmVideoTimes(newRanges, timeOffset);
        });
    }, [videoTimeToLogTime, timeOffset]);

    return {
        cmRanges,
        setCmRanges,
        cmStartInput,
        setCmStartInput,
        cmEndInput,
        setCmEndInput,
        isWaitingCm,
        setIsWaitingCm,
        currentCmWaitTime,
        setCurrentCmWaitTime,
        totalWaitOffset,
        setTotalWaitOffset,
        timeOffset,
        setTimeOffset,
        cmStateRef,
        resetCmState,
        addCmRange,
        addCmRangeSmart,
        updateCmRange,
        removeCmRange,
        getTotalDuration,
        logTimeToVideoTime,
        videoTimeToLogTime
    };
};
