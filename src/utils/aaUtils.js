/**
 * Determines if a given text is likely an ASCII Art (AA).
 * @param {string} text - The text content to analyze.
 * @returns {boolean} - True if the text is likely AA, false otherwise.
 */
export const isProbablyAA = (text) => {
    if (!text || typeof text !== 'string') return false;

    // 1. Line count check: AA is usually multi-line
    const lines = text.split('\n');
    if (lines.length <= 1) return false;

    // 2. Character density check
    // Common AA characters causing shift or used for drawing
    const aaChars = /[／＼│┃║┐└┘┌─━═│｜\u3000]/g;
    const matches = text.match(aaChars);
    
    // Low threshold but requires specific chars
    if (matches && matches.length >= 3) return true;

    // 3. Density of non-standard spaces (often used for alignment in AA)
    // Counting full-width spaces (u3000) specifically
    const fullWidthSpaces = (text.match(/\u3000/g) || []).length;
    if (fullWidthSpaces >= 2 && lines.length >= 3) return true;

    return false;
};
