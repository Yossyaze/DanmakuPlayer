import React from 'react';

import { formatTime } from '../utils/danmakuUtils';

const CmWaitOverlay = ({
  cmSystem,
  currentTime, // Current log time (updates with CM wait)
  startTimeStr, // For displaying absolute log time (e.g., "22:30:00")
  handleCmSkip,
}) => {
  const currentRange = cmSystem.cmRanges.find(
    (r) => r.id === cmSystem.cmStateRef.current.cmRangeId
  );

  if (!currentRange) {
    return null;
  }

  // Calculate remaining time: CM end time - current log time (both in log time)
  const remaining = Math.max(0, currentRange.logEnd - currentTime);

  // Calculate absolute log time for display
  let absoluteLogSeconds = currentTime;
  if (startTimeStr) {
    const parts = startTimeStr.split(':').map(Number);
    if (parts.length === 3) {
      absoluteLogSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2] + currentTime;
    }
  }

  // Format log time as HH:MM:SS
  const h = Math.floor(absoluteLogSeconds / 3600);
  const m = Math.floor((absoluteLogSeconds % 3600) / 60);
  const s = Math.floor(absoluteLogSeconds % 60);
  const logTimeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="absolute bottom-16 right-4 bg-black/80 text-white p-4 rounded border border-yellow-500/50 backdrop-blur-sm z-floating flex flex-col gap-2 min-w-[200px]">
      <div className="text-yellow-400 font-bold flex items-center gap-2">
        <span className="animate-pulse">●</span> CM待機中
      </div>
      <div className="text-sm text-gray-300 space-y-1">
        <div className="flex justify-between">
          <span>ログ時間:</span>
          <span className="font-mono">{logTimeStr}</span>
        </div>
        <div className="flex justify-between">
          <span>残り時間:</span>
          <span className="font-mono">-{formatTime(remaining)}</span>
        </div>
      </div>
      <button
        onClick={handleCmSkip}
        className="mt-1 w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-xs text-white rounded transition-colors border border-gray-600 hover:border-gray-500"
      >
        スキップ
      </button>
    </div>
  );
};

export default CmWaitOverlay;
