import React, { useMemo } from 'react';

const CommentContent = ({
    text,
    comment,
    onAnchorClick,
    onUrlLoad,
    showImages = true,
    setZoomedImage,
    thumbnailMode = false,
    imageLayout = 'inline', // 'inline' | 'grouped'
    onAnchorMouseEnter, // New prop
    onAnchorMouseLeave  // New prop
}) => {
    // Helper to render comment content with URL and Anchor links
    const { textContent, imageUrls } = useMemo(() => {
        if (!text) return { textContent: null, imageUrls: [] };

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // Match >>123 or &gt;&gt;123
        const anchorRegex = /(&gt;&gt;\d+|>>\d+)/g;

        const collectedImages = [];

        // First split by URL
        const parts = text.split(urlRegex);

        const rendered = parts.map((part, i) => {
            if (part.match(urlRegex)) {
                const isImage = part.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isThreadUrl = part.match(/bbs\.eddibb\.cc\/|kyodemo\.net\//);

                if (isImage && showImages) {
                    // Collect image for grouped mode
                    if (imageLayout === 'grouped') {
                        collectedImages.push(part);
                        // Still show the URL as text
                        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-xs" onClick={(e) => e.stopPropagation()}>{part}</a>;
                    }

                    // Inline mode: show URL + image together
                    const imgClass = thumbnailMode 
                        ? "max-h-16 max-w-xs rounded mt-1 border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity" // Compact
                        : "max-w-full max-h-40 rounded mt-1 border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity"; // Default

                    return (
                        <span key={i} className="block mt-1">
                            <a href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-xs" onClick={(e) => e.stopPropagation()}>{part}</a>
                            {setZoomedImage && (
                                <img
                                    src={part}
                                    alt="comment attachment"
                                    loading="lazy"
                                    className={imgClass}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setZoomedImage(part);
                                    }}
                                />
                            )}
                        </span>
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

                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all" onClick={(e) => e.stopPropagation()}>{part}</a>;
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
                        onMouseEnter: (e) => onAnchorMouseEnter && onAnchorMouseEnter(e, resNum, comment?.sourceFileId),
                        onMouseLeave: (e) => onAnchorMouseLeave && onAnchorMouseLeave(e)
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
                return subPart;
            });
        });

        return { textContent: rendered, imageUrls: collectedImages };
    }, [text, comment, onAnchorClick, onUrlLoad, showImages, setZoomedImage, thumbnailMode, imageLayout, onAnchorMouseEnter, onAnchorMouseLeave]);

    const imgClass = thumbnailMode 
        ? "max-h-16 max-w-24 rounded border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity object-cover"
        : "max-h-32 max-w-48 rounded border border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity object-cover";

    return (
        <>
            {textContent}
            {/* Grouped images at the end */}
            {imageLayout === 'grouped' && imageUrls.length > 0 && setZoomedImage && (
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
