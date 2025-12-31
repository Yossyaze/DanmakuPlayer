import React, { useRef, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import LogCommentItem from './LogCommentItem';

const AnchorPopup = ({
    comment, 
    position, 
    formatTime,
    timeOffset,
    settings,
    setZoomedImage,
    onClose,
    onClick, 
    RowComponent = LogCommentItem,
    totalComments,
    onAnchorClick,
    onReplyCountClick,
    onIdClick,
    popupClassName = "",
    customWidth,
    parentRect, // New prop to avoid overlap
    style = {}, // Accept style prop for dynamic zIndex
    minX = 10, // Minimum X position
    aaOverrideMap = {}, // AA Override Map
}) => {
    const popupRef = useRef(null);

    useLayoutEffect(() => {
        if (popupRef.current) {
            const rect = popupRef.current.getBoundingClientRect();
            let { x, y } = position;
            
            // Overlap Avoidance Logic
            const spacing = 4;
            if (parentRect) {
                // Try below first
                if (parentRect.bottom + rect.height + spacing <= window.innerHeight) {
                    y = parentRect.bottom + spacing;
                } 
                // Then try above
                else if (parentRect.top - rect.height - spacing >= 0) {
                    y = parentRect.top - rect.height - spacing;
                }
                // Fallback: stay in viewport
                else {
                    y = Math.max(10, window.innerHeight - rect.height - 10);
                }
                
                // X position: use fixed left align if prop is set, otherwise viewport-relative
                if (customWidth) {
                    // When customWidth is provided (from LogViewer), align to minX
                    x = minX;
                } else {
                    // Fallback to viewport-relative positioning (for Sidebar)
                    x = Math.max(10, Math.min(position.x, window.innerWidth - rect.width - 20));
                }
            } else {
                // Legacy fallback for nested clicks
                if (y + rect.height + 10 > window.innerHeight) {
                    y = Math.max(10, position.y - rect.height - 10);
                } else {
                    y = position.y + 10;
                }

                if (x + rect.width + 10 > window.innerWidth) {
                    x = window.innerWidth - rect.width - 20;
                } else {
                    x = position.x + 10;
                }
            }
            
            if (y < 0) y = 10;
            if (x < minX) x = minX;

            // Direct DOM manipulation to avoid setState warning
            popupRef.current.style.top = `${y}px`;
            popupRef.current.style.left = `${x}px`;
        }
    }, [position, parentRect, minX, customWidth]);

    return (
        <>
            {/* Backdrop to prevent clicks from reaching underlying UI and handle close */}
            <div 
                className="fixed inset-0 z-60 bg-black/0 cursor-default"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onClose && onClose();
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose && onClose();
                }}
            />
            <div 
                ref={popupRef}
                className={`fixed bg-gray-900 border border-gray-600 rounded shadow-2xl animate-fade-in pointer-events-auto ${!customWidth && !popupClassName ? 'w-96' : ''} ${popupClassName}`} 
                style={{ 
                    top: position.y, 
                    left: position.x,
                    width: customWidth ? `${customWidth}px` : undefined,
                    zIndex: style.zIndex || 70, // Use dynamic zIndex or fallback
                    ...style
                }}
                // onMouseEnter={onMouseEnter} // Removed hover props
                // onMouseLeave={onMouseLeave}
            >
                <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center select-none">
                    <div className="flex gap-2">
                        <span>Ref: {comment.originalResNum || comment.resNum}</span>
                        <span>{comment.sourceFileId}</span>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose && onClose();
                        }}
                        className="p-0.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                </div>
                <RowComponent 
                    comment={comment}
                    formatTime={formatTime}
                    timeOffset={timeOffset}
                    settings={{...settings, density: 'compact'}} // Force compact for popup
                    className="bg-gray-900 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800"
                    onClick={onClick} 
                    onAnchorClick={onAnchorClick}
                    onReplyCountClick={onReplyCountClick}
                    onIdClick={onIdClick}
                    setZoomedImage={setZoomedImage}
                    totalComments={totalComments}
                    aaOverride={aaOverrideMap[comment.id]}
                />
            </div>
        </>
    );
};

export default AnchorPopup;
