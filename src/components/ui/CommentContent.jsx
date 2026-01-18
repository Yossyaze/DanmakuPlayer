import React, { useMemo } from 'react';

import { parseAbeKeywords } from '../../utils/abeMode';

const CommentContent = ({
  text,
  comment,
  onAnchorClick,
  onUrlLoad,
  showImages = true,
  setZoomedImage,
  thumbnailMode = false,
  onAnchorMouseEnter, // New prop
  onAnchorMouseLeave, // New prop
  abeMode = false, // 安倍晋三モード
}) => {
  // Helper to render comment content with URL and Anchor links
  const { textContent, imageUrls } = useMemo(() => {
    if (!text) return { textContent: null, imageUrls: [] };

    // 文頭のアンカーを除去（ツリー表示時の返信コメント用）
    // 削除：サイドバー等では表示するため

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Match >>123 or &gt;&gt;123
    const anchorRegex = /(&gt;&gt;\d+|>>\d+)/g;

    const collectedImages = [];

    // Helper to apply Abe Mode highlighting to a text string
    const applyAbeHighlight = (str, keyPrefix) => {
      if (!abeMode || !str) return str;
      const { hasMatch, parts } = parseAbeKeywords(str);
      if (!hasMatch) return str;
      return parts.map((part, idx) =>
        part.isAbe ? (
          <span key={`${keyPrefix}-abe-${idx}`} className="abe-rainbow">
            {part.text}
          </span>
        ) : (
          part.text
        )
      );
    };

    // First split by URL
    const parts = text.split(urlRegex);

    const rendered = parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const isImage = part.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isThreadUrl = part.match(/bbs\.eddibb\.cc\/|kyodemo\.net\//);

        if (isImage && showImages) {
          // Always collect image for grouped mode
          collectedImages.push(part);
          // Still show the URL as text
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }

        if (isThreadUrl && onUrlLoad) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent comment click
                if (window.confirm(`このURLを読み込みますか？\n${part} `)) {
                  e.preventDefault();
                  onUrlLoad(part);
                }
              }}
            >
              {part}
            </a>
          );
        }

        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }

      // Then split by Anchor
      const subParts = part.split(anchorRegex);
      return subParts.map((subPart, j) => {
        if (subPart.match(anchorRegex)) {
          const resNum = parseInt(subPart.replace(/[^\d]/g, ''));
          // Always render as interactive if we have handlers (even if no click handler?)
          // LogViewer passes click handler locally, so onAnchorClick is likely present.

          const handlers = {
            onClick: (e) => onAnchorClick && onAnchorClick(e, resNum, comment?.sourceFileId),
            onMouseEnter: (e) =>
              onAnchorMouseEnter && onAnchorMouseEnter(e, resNum, comment?.sourceFileId),
            onMouseLeave: (e) => onAnchorMouseLeave && onAnchorMouseLeave(e),
          };

          return (
            <span
              key={`${i}-${j}`}
              className="text-blue-400 cursor-pointer hover:underline relative" // relative for potential positioning reference
              {...handlers}
            >
              {subPart}
            </span>
          );
        }
        // Apply Abe Mode highlighting to regular text
        return (
          <React.Fragment key={`${i}-${j}`}>
            {applyAbeHighlight(subPart, `${i}-${j}`)}
          </React.Fragment>
        );
      });
    });

    return { textContent: rendered, imageUrls: collectedImages };
  }, [
    text,
    comment,
    onAnchorClick,
    onUrlLoad,
    showImages,
    onAnchorMouseEnter,
    onAnchorMouseLeave,
    abeMode,
  ]);

  const imgClass = thumbnailMode
    ? 'max-h-16 max-w-24 rounded border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity object-cover'
    : 'max-h-32 max-w-48 rounded border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity object-cover';

  return (
    <>
      {textContent}
      {/* Grouped images always displayed if present */}
      {imageUrls.length > 0 && setZoomedImage && (
        <div className="flex flex-wrap gap-2 mt-2">
          {imageUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt="comment attachment"
              loading="lazy"
              className={imgClass}
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(url);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default React.memo(CommentContent);
