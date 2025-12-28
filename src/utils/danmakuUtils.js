
let canvasContext = null;

/**
 * Measures the width of text with a given font size using a shared canvas context.
 * @param {string} text - The text to measure.
 * @param {number} fontSize - The font size in pixels.
 * @returns {number} - The width of the text in pixels.
 */
export const measureTextWidth = (text, fontSize) => {
    if (!canvasContext) {
        const canvas = document.createElement('canvas');
        canvasContext = canvas.getContext('2d');
    }
    canvasContext.font = `bold ${fontSize}px sans-serif`;
    return canvasContext.measureText(text).width;
};

/**
 * Calculates the best lane for a new danmaku comment.
 * @param {object} laneMap - The current map of occupied lanes.
 * @param {number} maxLanes - Maximum number of available lanes.
 * @param {number} containerWidth - Width of the container.
 * @param {number} textWidth - Width of the new comment text.
 * @param {number} duration - Animation duration in seconds.
 * @param {number} rowSpan - Number of lanes this comment (or group) occupies. Default 1.
 * @param {object} reservedLanes - Map of reserved lanes (Set-like object or specific logic).
 * @param {Array<number>} candidateLanes - Optional list of specific lanes to check in order.
 * @returns {object} - { lane: number, isOverlap: boolean, speed: number }
 */
export const findBestLane = (laneMap, maxLanes, containerWidth, textWidth, rowSpan = 1, reservedLanes = null, candidateLanes = null) => {
    // Speed is controlled by useDanmaku hook (Constant Velocity)
    let bestLane = -1;
    let isOverlap = false;

    // Helper to check if a single lane is valid
    const isLaneValid = (idx) => {
        // Check if lane or any part of the span is reserved by other groups
        if (reservedLanes && reservedLanes.has(idx)) return false;

        const laneState = laneMap[idx];
        if (!laneState) return true; // Empty lane

        const now = Date.now();
        const timeSinceLast = (now - laneState.startTime) / 1000; // seconds
        const lastDist = laneState.speed * timeSinceLast; // Distance traveled by tail? No, typically speed*time is distance of HEAD. 
        // We need tail clearance.
        // If laneState tracks the PREVIOUS comment:
        // 'width' is the width of that comment.
        // 'lastDist' is how far its HEAD has moved from right edge (starts at 0).
        // Its TAIL is at 'lastDist - laneState.width'.
        // We need TAIL > some_gap (e.g. 20px) to start a new one at 0.
        // So: lastDist - laneState.width > 20
        // Or: lastDist > laneState.width + 20
        
        // With Constant Velocity, we don't need to check "catch up" because 
        // if we start safe, we stay safe (speed is identical).
        
        return lastDist > (laneState.width + 30); // 30px safety gap
    };

    // Helper to check a BLOCK of lanes
    const isBlockValid = (startIdx) => {
        if (startIdx + rowSpan > maxLanes) return false;
        for (let r = 0; r < rowSpan; r++) {
            if (!isLaneValid(startIdx + r)) return false;
        }
        return true;
    };

    // Search Strategy
    const lanesToCheck = candidateLanes || Array.from({ length: maxLanes }, (_, i) => i);

    for (const i of lanesToCheck) {
        if (isBlockValid(i)) {
            bestLane = i;
            break;
        }
    }

    // Fallback: Random lane (Overlap)
    if (bestLane === -1) {
        if (candidateLanes && candidateLanes.length > 0) {
            // Pick random from candidates to distribute overlap load
             bestLane = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
        } else {
             bestLane = Math.floor(Math.random() * (maxLanes - rowSpan + 1));
        }
        isOverlap = true;
    }

    return { lane: bestLane, isOverlap };
};

/**
 * Formats seconds into MM:SS or HH:MM:SS string.
 * @param {number} seconds 
 * @returns {string}
 */
export const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);

    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = Math.floor(absSeconds % 60);

    const timeStr = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;

    return isNegative ? `-${timeStr}` : timeStr;
};
