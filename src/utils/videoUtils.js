/**
 * Video URL Parser and Embed Utilities
 */

/**
 * Parse YouTube URL and extract video ID
 * @param {string} url
 * @returns {string|null} Video ID or null
 */
export function parseYouTubeUrl(url) {
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * Parse Niconico URL and extract video ID
 * @param {string} url
 * @returns {string|null} Video ID (sm/nm/so number) or null
 */
export function parseNiconicoUrl(url) {
  // nicovideo.jp/watch/sm123456
  const watchMatch = url.match(/nicovideo\.jp\/watch\/([a-z]{2}\d+)/);
  if (watchMatch) return watchMatch[1];

  // nico.ms/sm123456
  const shortMatch = url.match(/nico\.ms\/([a-z]{2}\d+)/);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * Parse Twitter/X URL and extract tweet ID
 * @param {string} url
 * @returns {string|null} Tweet ID or null
 */
export function parseTwitterUrl(url) {
  // twitter.com/user/status/TWEET_ID or x.com/user/status/TWEET_ID
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Detect video type from URL
 * @param {string} url
 * @returns {'youtube'|'niconico'|'twitter'|null}
 */
export function detectVideoType(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/nicovideo\.jp|nico\.ms/i.test(url)) return 'niconico';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return null;
}

/**
 * Get video info from URL
 * @param {string} url
 * @returns {{type: string, id: string, embedUrl: string, thumbnailUrl: string}|null}
 */
export function getVideoInfo(url) {
  const type = detectVideoType(url);
  if (!type) return null;

  switch (type) {
    case 'youtube': {
      const id = parseYouTubeUrl(url);
      if (!id) return null;
      return {
        type: 'youtube',
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      };
    }
    case 'niconico': {
      const id = parseNiconicoUrl(url);
      if (!id) return null;
      const numericId = id.replace(/[a-z]/gi, '');
      return {
        type: 'niconico',
        id,
        embedUrl: `https://embed.nicovideo.jp/watch/${id}`,
        thumbnailUrl: `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}`,
      };
    }
    case 'twitter': {
      const id = parseTwitterUrl(url);
      if (!id) return null;
      return {
        type: 'twitter',
        id,
        // Twitter embeds require oEmbed API, use link for now
        embedUrl: null,
        thumbnailUrl: null,
      };
    }
    default:
      return null;
  }
}

/**
 * Extract all video URLs from text
 * @param {string} text
 * @returns {Array<{url: string, info: object}>}
 */
export function extractVideoUrls(text) {
  const urlRegex =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|nicovideo\.jp\/watch\/|nico\.ms\/|twitter\.com\/[^/]+\/status\/|x\.com\/[^/]+\/status\/)[^\s<>"\]]+/gi;
  const matches = text.match(urlRegex) || [];

  return matches
    .map((url) => ({
      url,
      info: getVideoInfo(url),
    }))
    .filter((item) => item.info !== null);
}
