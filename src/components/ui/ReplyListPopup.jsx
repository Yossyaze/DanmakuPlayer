import React, { useRef, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import LogCommentItem from './LogCommentItem';

const ReplyListPopup = ({
    comments = [], // List of reply comments to display
    parentComment, // The comment being replied to
    position, 
    formatTime,
    timeOffset,
    settings,
    setZoomedImage,
    onClose,
    onAnchorClick, 
    RowComponent = LogCommentItem,
    totalComments,
    onIdClick,
    onReplyCountClick,
    popupClassName = "",
    customWidth,
    parentRect, // New prop to avoid overlap
    style = {}, // Accept style prop for dynamic zIndex
    minX = 10, // Minimum X position (e.g., to avoid sidebar)
    aaOverrideMap = {}, // AA Override Map
}) => {
    const popupRef = useRef(null);


    useLayoutEffect(() => {
        if (popupRef.current) {
            const rect = popupRef.current.getBoundingClientRect();
            let { x, y } = position;
            
            // Overlap Avoidance Logic
            // If we have a parentRect, we want to place it below OR above the parent element
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
                // Legacy fallback for simple anchor clicks
                if (y + rect.height + 10 > window.innerHeight) {
                    y = Math.max(10, window.innerHeight - rect.height - 10);
                } else {
                    y = position.y + 10;
                }

                if (x + rect.width + 10 > window.innerWidth) {
                    x = window.innerWidth - rect.width - 20;
                } else {
                    x = position.x + 10;
                }
            }
            
            if (x < minX) x = minX;
            if (y < 0) y = 10;

            // Direct DOM manipulation to avoid setState warning
            popupRef.current.style.top = `${y}px`;
            popupRef.current.style.left = `${x}px`;
        }
    }, [position, parentRect, comments.length, minX, customWidth]); // Re-adjust if comments change (though improbable here)

    return (
        <>
            {/* Backdrop to prevent click propagation to underlying UI */}
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
                className={`fixed bg-gray-900 border border-gray-600 rounded shadow-2xl animate-fade-in pointer-events-auto flex flex-col max-h-[60vh] ${!customWidth && !popupClassName ? 'w-96' : ''} ${popupClassName}`}
                style={{ 
                    top: position.y, 
                    left: position.x,
                    width: customWidth ? `${customWidth}px` : undefined,
                    zIndex: style.zIndex || 70, // Use dynamic zIndex or fallback
                    ...style
                }}
            >
                <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center shrink-0 select-none">
                    <div className="flex items-center gap-2">
                        <span>Replies: &gt;&gt;{parentComment?.originalResNum || parentComment?.resNum}</span>
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                            {comments.length}件
                        </span>
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
                
                <div className="overflow-y-auto scrollbar-thin p-1">
                    {comments.map((comment, index) => {
                        const prevDepth = index > 0 ? (comments[index - 1].depth || 0) : 0;
                        const currentDepth = comment.depth || 0;
                        const depthDecrease = prevDepth - currentDepth;
                        
                        return (
                            <React.Fragment key={comment.id}>
                                {/* Step line when depth decreases */}
                                {depthDecrease > 0 && index > 0 && (
                                    <div 
                                        className="border-t border-gray-700"
                                        style={{ marginLeft: `${currentDepth * 16}px` }}
                                    />
                                )}
                                <RowComponent 
                                    comment={comment}
                                    depth={currentDepth}
                                    formatTime={formatTime}
                                    timeOffset={timeOffset}
                                    settings={{...settings, density: 'compact'}} 
                                    className="bg-gray-900 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800"
                                    setZoomedImage={setZoomedImage}
                                    onAnchorClick={onAnchorClick}
                                    onReplyCountClick={onReplyCountClick}
                                    onIdClick={onIdClick}
                                    totalComments={totalComments}
                                    aaOverride={aaOverrideMap[comment.id]}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default ReplyListPopup;
