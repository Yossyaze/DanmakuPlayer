/**
 * Check if URL is an HLS stream
 * @param {string} url - The URL to check
 * @returns {boolean} - True if URL is an HLS stream
 */
export const isHlsUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.m3u8') || url.includes('application/x-mpegurl');
};
