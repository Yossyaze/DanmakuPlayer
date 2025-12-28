import React from 'react';
import CommentContent from './CommentContent';
import { formatTime as defaultFormatTime } from '../../utils/danmakuUtils';
import { MessageCircle } from 'lucide-react';
import { isProbablyAA } from '../../utils/aaUtils';
import { extractVideoUrls } from '../../utils/videoUtils';
import VideoEmbed from './VideoEmbed';

const LogCommentItem = ({
    comment,
    formatTime = defaultFormatTime,
    timeOffset = 0,
    totalComments = 0,
    onIdClick,
    onAnchorClick,
    onUrlLoad,
    onClick,
    depth = 0,
    setZoomedImage,
    className = "",
    settings, // New prop
    onAnchorMouseEnter, // New prop
    onAnchorMouseLeave, // New prop
    onReplyCountClick, // New prop
    isHighlighted, // Added prop
    aaOverride // true/false/undefined
}) => {
    // Default settings if not provided
    const safeSettings = settings || {
        fontSize: 'medium',
        density: 'comfortable',
        showImages: true,
        showThumbnails: false,
        showIds: true,
    };

    // Calculate ID color
    let idColorClass = "text-gray-400"; // Default (1 comment)
    if (comment.userTotal && comment.userTotal > 1 && totalComments > 0) {
        const percentage = (comment.userTotal / totalComments) * 100;
        if (percentage >= 0.5) {
            idColorClass = "text-red-400";
        } else if (percentage >= 0.25) {
            idColorClass = "text-green-400";
        } else {
            idColorClass = "text-blue-400";
        }
    }

    // Dynamic Classes
    const fontSizeMap = {
        small: 'text-xs',
        medium: 'text-sm', // default text-base was a bit big for medium? let's align
        large: 'text-base',
        xlarge: 'text-lg',
        sidebar: 'text-[10px]', // Matches sidebar list style
    };
    
    // Body font size is usually one step larger or same as metadata? Log style usually matches.
    // Let's use metadata = size, body = size + 1 step? Or just same.
    // Current design: Metadata small, Body base.
    // If settings.fontSize = small (xs). Metadata: xs, Body: sm.
    // If settings.fontSize = medium (sm). Metadata: sm, Body: base.
    // If settings.fontSize = large (base). Metadata: base, Body: lg.
    
    const baseSize = safeSettings.fontSize || 'medium';
    const metadataSize = fontSizeMap[baseSize];
    const bodySize = baseSize === 'small' ? 'text-sm' : 
                     baseSize === 'medium' ? 'text-base' : 
                     baseSize === 'large' ? 'text-lg' : 
                     baseSize === 'sidebar' ? 'text-sm' : 'text-xl';

    const paddingMap = {
        compact: 'py-1 px-2',
        comfortable: 'py-2 px-3',
        spacious: 'p-4',
    };
    const densityClass = paddingMap[safeSettings.density || 'comfortable'];

    const effectiveDepth = settings?.enableTreeView === false ? 0 : depth;

    // AA Logic
    const aaMode = settings?.aaMode || 'auto'; // Default to auto if not in settings map
    const isAA = React.useMemo(() => {
        if (aaOverride === true) return true;
        if (aaOverride === false) return false;
        if (aaMode === 'off') return false;
        return isProbablyAA(comment.text);
    }, [comment.text, aaMode, aaOverride]);

    // Extract video URLs
    const videoUrls = React.useMemo(() => {
        if (!safeSettings.showImages) return []; // Hide videos if images are hidden (can add separate setting later)
        return extractVideoUrls(comment.text);
    }, [comment.text, safeSettings.showImages]);

    return (
        <div
            id={`comment-${comment.id}`}
            onClick={(e) => onClick && onClick(e, comment)}
            className={`comment-item-row ${densityClass} transition-colors duration-500 ease-out ${isHighlighted ? 'bg-yellow-500/20' : 'hover:bg-gray-800/50'} ${className}`}
            style={{
                marginLeft: effectiveDepth > 0 ? `${effectiveDepth * 16}px` : '0',
                borderLeft: effectiveDepth > 0 ? '2px solid #374151' : 'none',
                paddingLeft: effectiveDepth > 0 ? '16px' : ''
            }}
        >
            {/* Header Line */}
            <div className={`flex flex-nowrap items-center gap-x-2 ${metadataSize} text-gray-400 mb-1`}>
                <span className="font-bold text-gray-300 whitespace-nowrap shrink-0">
                    {comment.originalResNum || comment.resNum}
                </span>

                {/* Reply Count Indicator */}
                {comment.replyCount > 0 && (
                    <span 
                        className="reply-count-indicator flex items-center gap-1 text-blue-400 cursor-pointer hover:bg-blue-600/20 px-1 rounded transition-colors whitespace-nowrap shrink-0"
                        onClick={(e) => onReplyCountClick && onReplyCountClick(e, comment)}
                        title={`${comment.replyCount}件の返信`}
                    >
                         <MessageCircle size={12} className="fill-blue-400/20" />
                         <span className="text-xs font-bold">{comment.replyCount}</span>
                    </span>
                 )}

                <span className="text-gray-500 truncate max-w-[200px] min-w-0">
                    {comment.name || '名無しさん'}
                </span>
                
                {safeSettings.showIds && (
                    <>
                        <span className="text-gray-500 font-mono whitespace-nowrap shrink-0">
                            {comment.dateDisplay || 'YYYY/MM/DD(Day) HH:MM:SS.ms'}
                        </span>
                        <span
                            className={`font-mono cursor-pointer hover:underline whitespace-nowrap shrink-0 ${idColorClass}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onIdClick) onIdClick(comment.userId);
                            }}
                        >
                            ID:{comment.userId}
                            {comment.userIndex && comment.userTotal && (
                                <span className="text-xs ml-1 opacity-75">
                                    ({comment.userIndex}/{comment.userTotal})
                                </span>
                            )}
                        </span>
                    </>
                )}
                
                {safeSettings.showIds && ( 
                     <span className="text-gray-600 font-mono text-xs ml-auto">
                        {formatTime(comment.time - timeOffset)} (動画時間)
                     </span>
                )}
            </div>

            {/* Body */}
            <div className={`text-gray-100 ${bodySize} leading-relaxed wrap-break-word whitespace-pre-wrap pl-2 ${isAA ? 'font-aa text-[12px]' : ''}`}>
                <CommentContent
                    text={comment.text}
                    comment={comment}
                    onAnchorClick={onAnchorClick}
                    onUrlLoad={onUrlLoad}
                    showImages={safeSettings.showImages}
                    setZoomedImage={setZoomedImage}
                    thumbnailMode={safeSettings.showThumbnails}
                    imageLayout={safeSettings.imageLayout || 'inline'}
                    onAnchorMouseEnter={onAnchorMouseEnter}
                    onAnchorMouseLeave={onAnchorMouseLeave}
                />
                
                {/* Video Embeds */}
                {videoUrls.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                        {videoUrls.map((video, idx) => (
                            <VideoEmbed 
                                key={idx} 
                                url={video.url} 
                                className="w-full max-w-[320px]"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(LogCommentItem);
