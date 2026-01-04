/**
 * Sidebar utility functions
 */

/**
 * Pad time string to HH:MM:SS format
 * @param {string} t - Time string in H:MM:SS or M:SS format
 * @returns {string} Time string padded to HH:MM:SS format
 */
export const padTime = (t) => {
  if (!t) return t;
  const parts = t.split(':');
  if (parts.length === 2) {
    return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return t;
};

/**
 * Format seconds to time string (H:MM:SS or M:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatCmTime = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Parse time string to seconds
 * @param {string} str - Time string in H:MM:SS or M:SS format
 * @returns {number} Time in seconds
 */
export const parseTimeStr = (str) => {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};
