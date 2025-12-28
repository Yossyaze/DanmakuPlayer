import React, { useState } from 'react';
import { Play, ExternalLink, X } from 'lucide-react';
import { getVideoInfo } from '../../utils/videoUtils';

/**
 * Video Embed Component - Shows thumbnail and plays video on click
 */
const VideoEmbed = ({ url, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const videoInfo = getVideoInfo(url);
    
    if (!videoInfo) return null;
    
    const { type, id, embedUrl, thumbnailUrl } = videoInfo;
    
    // Twitter doesn't support direct embed, show link only
    if (type === 'twitter') {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-blue-400 hover:text-blue-300 text-sm transition-colors ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <Play size={14} />
                <span>Twitter/X 動画</span>
                <ExternalLink size={12} />
            </a>
        );
    }
    
    // YouTube and Niconico - show thumbnail or embed
    if (!isExpanded) {
        return (
            <div 
                className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800 ${className}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                }}
            >
                {thumbnailUrl ? (
                    <img 
                        src={thumbnailUrl} 
                        alt={`${type} video thumbnail`}
                        className="w-full max-w-[320px] h-auto aspect-video object-cover"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full max-w-[320px] aspect-video bg-gray-700 flex items-center justify-center">
                        <Play size={32} className="text-gray-400" />
                    </div>
                )}
                
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play size={24} className="text-white ml-1" fill="white" />
                    </div>
                </div>
                
                {/* Platform label */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white font-bold backdrop-blur-sm">
                    {type === 'youtube' ? 'YouTube' : 'ニコニコ動画'}
                </div>
            </div>
        );
    }
    
    // Expanded - show embed
    return (
        <div className={`relative rounded-lg overflow-hidden bg-gray-900 ${className}`}>
            <iframe
                src={embedUrl}
                className="w-full max-w-[480px] aspect-video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${type} video ${id}`}
            />
        </div>
    );
};

export default VideoEmbed;
