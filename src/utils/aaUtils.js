/**
 * Determines if a given text is likely an ASCII Art (AA).
 * Uses ratio-based detection for more accurate results.
 * @param {string} text - The text content to analyze.
 * @returns {boolean} - True if the text is likely AA, false otherwise.
 */
export const isProbablyAA = (text) => {
  if (!text || typeof text !== 'string') return false;

  // 0. Strip System Indentation (Critical for Danmaku Overlay)
  // useDanmakuTree adds "\u3000\u3000└ " which contains full-width spaces.
  // These must be removed BEFORE analysis to ensure consistency.
  const cleanText = text.replace(/^[\u3000\s]*[└├│┌┐┘┬┴┼]\s?/, '');

  const lines = cleanText.split('\n');
  // Minimum line count requirement
  if (lines.length < 3) return false;

  // Remove tree indicators for symbol analysis
  const textWithoutTreeIndicators = cleanText.replace(/[└├│┌┐┘┬┴┼]/g, '');

  // Calculate total character count (excluding whitespace for ratio calculation)
  const totalChars = textWithoutTreeIndicators.replace(/\s/g, '').length;
  if (totalChars === 0) return false;

  // 1. AA-specific character ratio check
  // Common AA characters used for drawing
  const aaChars = /[／＼│┃║┐└┘┌─━═｜]/g;
  const aaMatches = textWithoutTreeIndicators.match(aaChars) || [];
  const aaCharRatio = aaMatches.length / totalChars;

  // If AA characters make up more than 5% of the text, likely AA
  if (aaCharRatio >= 0.05) return true;

  // 2. Box drawing / Geometric shape check with minimum count
  const boxDrawingChars = /[─━┃┏┓┗┛┣┫┳┻╋]/g;
  const geometricChars = /[○●◎◇◆□■△▲▽▼]/g;

  const boxMatches = textWithoutTreeIndicators.match(boxDrawingChars) || [];
  const geoMatches = cleanText.match(geometricChars) || [];

  // Need at least 3 of these special characters AND they should be 3% of content
  const specialCount = boxMatches.length + geoMatches.length;
  const specialRatio = specialCount / totalChars;

  if (specialCount >= 3 && specialRatio >= 0.03) return true;

  // 3. Line uniformity check (AA typically has consistent line lengths)
  // Calculate standard deviation of line lengths
  // 3. Line uniformity check (AA typically has consistent line lengths)
  // Calculate standard deviation of line lengths
  const lineLengths = lines.map((l) => l.length).filter((len) => len > 0);
  if (lineLengths.length >= 3) {
    const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;
    const variance =
      lineLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lineLengths.length;
    const stdDev = Math.sqrt(variance);

    // Low standard deviation + presence of some AA chars = likely AA
    // (Uniform line lengths are a strong AA indicator)
    if (stdDev < 5 && avgLength > 10 && aaMatches.length >= 2) {
      return true;
    }
  }

  return false;
};
