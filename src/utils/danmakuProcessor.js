import { measureTextWidth } from './danmakuUtils';

/**
 * parseCommentToNodes - コメントをノード配列に分解し、幅を計算
 *
 * @param {Object} comment - コメントオブジェクト
 * @param {Object} options - オプション
 * @param {number} options.fontSize - フォントサイズ
 * @param {string} options.imageMode - 画像表示モード ('image', 'url', 'placeholder')
 * @param {number} options.lineHeight - 行の高さ
 * @param {boolean} options.isChild - 子コメントかどうか
 * @param {number} options.childFontScale - 子コメントのフォントスケール
 * @param {Map} options.imageValidityMap - 画像の有効性キャッシュ
 * @returns {Object} { nodes, totalWidth, rowSpan, isAA, actualPixelHeight }
 */
export function parseCommentToNodes(comment, options) {
  const {
    fontSize,
    imageMode,
    lineHeight,
    isChild = false,
    childFontScale = 0.9,
    imageValidityMap = null,
  } = options;

  const nodes = [];
  let textWidth = 0; // Width of text row
  let imageWidth = 0; // Width of image row (below text)
  let rowSpan = 1;
  let imageCount = 0;
  let hasText = false; // Track if there's any text content
  let imageHeight = 0; // Track image height for rowSpan calculation
  const effectiveLineHeight = isChild ? lineHeight * childFontScale : lineHeight;

  // Check if this might be AA (Ascii Art)
  const lines = comment.text.split('\n');
  const textWithoutTreeIndicators = comment.text.replace(/[└├│┌┐┘┬┴┼]/g, '');
  const matchesAACriteria =
    lines.length >= 3 &&
    (comment.text.includes('　') || // Full-width space
      /[─━┃┏┓┗┛┣┫┳┻╋]/.test(textWithoutTreeIndicators) || // Box drawing
      /[○●◎◇◆□■△▲▽▼]/.test(comment.text)); // Geometric shapes

  // 1. Try to parse as Image/URL content first
  const parts = comment.text.split(/(https?:\/\/[^\s]+)/g);

  parts.forEach((part) => {
    if (!part) return;
    const urlMatch = part.match(/^(https?:\/\/[^\s]+)$/);
    if (urlMatch) {
      const url = urlMatch[1];
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(url);

      if (isImage) {
        imageCount++;
        if (imageMode === 'image') {
          // Check if image is valid (use cached result or assume valid)
          const cachedValidity = imageValidityMap?.get(url);
          const isValid = cachedValidity !== false; // null means not checked yet, treat as valid

          if (isValid) {
            const imageRows = 4;
            imageHeight = effectiveLineHeight * imageRows;
            const w = imageHeight * (16 / 9);
            // Check for duplicate keys in object (fixed)
            nodes.push({
              type: 'image',
              content: url,
              width: w,
              height: imageHeight,
              valid: cachedValidity !== false,
            });
            console.log(
              `[DanmakuProcessor] Added image node: ${url} (${w}x${imageHeight}) Valid: ${
                cachedValidity !== false
              }`
            );
            imageWidth += w + 4; // 4px gap between images
          } else {
            // Image is known to be invalid, treat as error placeholder
            const errorText = '[画像エラー]';
            const w = measureTextWidth(errorText, fontSize * 0.7);
            nodes.push({
              type: 'image_error',
              content: url,
              text: errorText,
              width: w,
            });
            console.log(`[DanmakuProcessor] Image error placeholder for ${url}`);
            textWidth += w;
          }
        }
        // url mode: display as text
        if (imageMode === 'url') {
          const w = measureTextWidth(url, fontSize);
          nodes.push({ type: 'text', text: url, width: w });
          textWidth += w;
          hasText = true;
        }
        // placeholder mode: defer to end
      } else {
        // Non-image URL: just render as text
        const w = measureTextWidth(url, fontSize);
        nodes.push({ type: 'text', text: url, width: w });
        textWidth += w;
        hasText = true;
      }
    } else {
      const trimmed = part.trim();
      if (trimmed) hasText = true;
      const w = measureTextWidth(part, fontSize);
      nodes.push({ type: 'text', text: part, width: w });
      textWidth += w;
    }
  });

  // 2. Decide if we should treat this as AA
  // Priority: If images exist, it's NOT AA (render as image)
  // If no images BUT matches AA criteria, treat as AA
  const isAA = imageCount === 0 && matchesAACriteria;

  if (isAA) {
    // Re-calculate for AA specific layout (block text)
    const aaFontSize = fontSize * 0.8;
    let maxLineWidth = 0;
    lines.forEach((line) => {
      const w = measureTextWidth(line, aaFontSize);
      if (w > maxLineWidth) maxLineWidth = w;
    });
    // Clear nodes and replace with single AA text node
    const aaNodes = [{ type: 'text', text: comment.text, width: maxLineWidth }];
    const actualPixelHeight = lines.length * aaFontSize;
    return {
      nodes: aaNodes,
      totalWidth: maxLineWidth,
      rowSpan: lines.length,
      isAA: true,
      actualPixelHeight,
    };
  }

  // 3. Finish processing for normal/image comments
  // Add placeholder for images in placeholder mode
  if (imageMode === 'placeholder' && imageCount > 0) {
    const text = imageCount === 1 ? '[画像]' : `[画像x${imageCount}]`;
    const w = measureTextWidth(text, fontSize);
    nodes.push({
      type: 'placeholder',
      content: '',
      text,
      width: w,
      imageCount,
    });
    textWidth += w;
    hasText = true;
  }

  // Calculate rowSpan for images
  if (imageCount > 0 && imageMode === 'image') {
    const imageMargin = hasText ? 2 : 0; // Only apply margin if there's text
    const adjustedImageHeight = imageHeight - imageMargin;
    // Update node heights with adjusted value
    nodes.forEach((n) => {
      if (n.type === 'image') n.height = adjustedImageHeight;
    });
    const totalHeight = hasText ? lineHeight + adjustedImageHeight : adjustedImageHeight;
    rowSpan = Math.max(rowSpan, Math.ceil(totalHeight / lineHeight));
  }

  // Total width is the max of text row and image row (since they stack vertically)
  const totalWidth = Math.max(textWidth, imageWidth);

  // Calculate actual pixel height for this comment (text + images)
  let actualPixelHeight = effectiveLineHeight; // Base text height
  if (imageCount > 0 && imageMode === 'image') {
    actualPixelHeight = hasText ? effectiveLineHeight + imageHeight : imageHeight;
  }

  return { nodes, totalWidth, rowSpan, isAA: false, actualPixelHeight };
}
