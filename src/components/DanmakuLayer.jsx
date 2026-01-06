import React from 'react';

import { isProbablyAA } from '../utils/aaUtils';
import { parseAbeKeywords } from '../utils/abeMode';

const DanmakuLayer = ({
  containerRef,
  activeDanmaku,
  settings,
  mode,
  onAnimationEnd,
  aaMode,
  aaOverrideMap = {},
  onImageClick,
  onTruncationClick,
  isEnabled = true,
  isPlaying = false,
  abeMode = false, // 安倍晋三モード
}) => {
  // State for Placeholder Hover
  const [hoveredImage, setHoveredImage] = React.useState(null);

  // Set --play-state CSS variable on mount and when isPlaying changes
  // This ensures correct animation state after remount (e.g., exiting log mode)
  React.useEffect(() => {
    if (containerRef.current) {
      const state = isPlaying ? 'running' : 'paused';
      containerRef.current.style.setProperty('--play-state', state);
      // console.log('[DanmakuLayer] Setting --play-state:', state);
    }
  }, [containerRef, isPlaying]);

  if (mode === 'sidebar') return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[51]"
      // Note: --play-state is now managed within this component
    >
      {activeDanmaku.map((dm) => (
        <DanmakuItem
          key={dm.uniqueId}
          dm={dm}
          settings={settings}
          onAnimationEnd={onAnimationEnd}
          aaMode={aaMode}
          aaOverrideMap={aaOverrideMap}
          setHoveredImage={setHoveredImage}
          onImageClick={isEnabled ? onImageClick : undefined}
          onTruncationClick={isEnabled ? onTruncationClick : undefined}
          abeMode={abeMode}
        />
      ))}

      {/* Hover Popup for Placeholder */}
      {hoveredImage && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in bg-black/80 rounded p-1 border border-gray-600 shadow-xl"
          style={{
            left: hoveredImage.x + 20,
            top: Math.min(hoveredImage.y - 100, window.innerHeight - 300), // simplistic bounds check
          }}
        >
          <img
            src={hoveredImage.url}
            alt="preview"
            className="max-w-[300px] max-h-[300px] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
};

const DanmakuItem = React.memo(
  ({
    dm,
    settings,
    onAnimationEnd,
    aaMode,
    aaOverrideMap,
    setHoveredImage,
    onImageClick,
    onTruncationClick,
    abeMode,
  }) => {
    // Determine AA status
    const isAA = React.useMemo(() => {
      const override = aaOverrideMap[dm.id];
      if (override === true) return true;
      if (override === false) return false;
      if (aaMode === 'off') return false;
      return isProbablyAA(dm.text);
    }, [dm.id, dm.text, aaMode, aaOverrideMap]);

    // Check if this is a tree child (has rootId and is not the root itself)
    const isTreeChild = dm.rootId && dm.id !== dm.rootId && dm.layoutIndex > 0;

    // Font size: children are 10% smaller than parent
    const fontSize = isTreeChild ? settings.fontSize * 0.9 : settings.fontSize;

    // Check if this is a truncation indicator
    const isTruncationIndicator = dm.isTruncationIndicator;

    const commonStyle = {
      top: `${dm.top}px`,
      fontSize: `${fontSize}px`,
      color: dm.color,
      opacity: dm.opacity !== undefined ? dm.opacity * settings.opacity : settings.opacity,
      zIndex: dm.zIndex || 0,
      animationDuration: `${dm.duration}s`,
      animationDelay: dm.animationDelay || '0s',
      '--translate-x-end': `${dm.dist}px`,
      ...dm.style,
    };

    // Handle truncation indicator click
    const handleTruncationClick = (e) => {
      if (onTruncationClick && isTruncationIndicator) {
        e.stopPropagation();
        // Extract rootId from the truncation indicator id (format: "rootId-truncation")
        const rootId = dm.id.replace('-truncation', '');
        onTruncationClick(rootId);
      }
    };

    // Helper to render text with Abe Mode highlighting
    const renderAbeText = (text) => {
      if (!abeMode || !text) return text;
      const { hasMatch, parts } = parseAbeKeywords(text);
      if (!hasMatch) return text;
      return parts.map((part, idx) =>
        part.isAbe ? (
          <span key={idx} className="abe-rainbow">
            {part.text}
          </span>
        ) : (
          part.text
        )
      );
    };

    return (
      <div
        className="absolute animate-danmaku text-shadow-md font-bold"
        style={{
          ...commonStyle,
          textShadow: '1px 1px 2px black, 0 0 1em black',
          whiteSpace: isAA ? 'pre' : 'nowrap',
        }}
        onAnimationEnd={() => onAnimationEnd(dm.uniqueId)}
      >
        {/* Text Row */}
        <div
          className={`flex items-center gap-1 ${isAA ? 'font-aa text-[0.8em] leading-none' : ''}`}
          style={{ whiteSpace: isAA ? 'pre' : undefined }}
        >
          {dm.nodes ? (
            dm.nodes
              .filter((n) => n.type !== 'image')
              .map((node, idx) => {
                if (node.type === 'placeholder') {
                  const hasContent = node.content && node.content.length > 0;
                  return (
                    <span
                      key={idx}
                      className={`shrink-0 ${
                        hasContent
                          ? 'cursor-pointer pointer-events-auto text-cyan-400 hover:text-cyan-300 hover:underline'
                          : 'text-cyan-400'
                      }`}
                      onMouseEnter={
                        hasContent
                          ? (e) =>
                              setHoveredImage({
                                url: node.content,
                                x: e.clientX,
                                y: e.clientY,
                              })
                          : undefined
                      }
                      onMouseLeave={hasContent ? () => setHoveredImage(null) : undefined}
                    >
                      {node.text}
                    </span>
                  );
                }
                if (node.type === 'image_error') {
                  return (
                    <span
                      key={idx}
                      className="shrink-0 text-gray-400"
                      style={{ fontSize: `${settings.fontSize * 0.7}px` }}
                    >
                      {node.text}
                    </span>
                  );
                }
                // Apply Abe Mode to text nodes
                return (
                  <span key={idx} className="shrink-0">
                    {renderAbeText(node.text)}
                  </span>
                );
              })
          ) : // Handle truncation indicator or plain text
          isTruncationIndicator && onTruncationClick ? (
            <span
              className="cursor-pointer pointer-events-auto hover:text-cyan-300 hover:underline"
              onClick={handleTruncationClick}
            >
              {dm.text}
            </span>
          ) : (
            renderAbeText(dm.text)
          )}
        </div>

        {/* Image Row (below text) - indent based on tree depth for child/grandchild */}
        {dm.nodes && dm.nodes.some((n) => n.type === 'image') && (
          <div
            className="flex items-center gap-1 mt-0.5"
            style={{
              marginLeft: dm.depth > 0 ? `${settings.fontSize * 1.2 * dm.depth}px` : 0,
            }}
          >
            {dm.nodes
              .filter((n) => n.type === 'image')
              .map((node, idx) => (
                <div
                  key={idx}
                  className={`shrink-0 relative ${
                    onImageClick
                      ? 'cursor-pointer pointer-events-auto hover:opacity-80'
                      : 'pointer-events-none'
                  }`}
                  style={{
                    height: node.height || `${settings.fontSize * 4}px`,
                  }}
                  onClick={onImageClick ? () => onImageClick(node.content) : undefined}
                >
                  <img
                    src={node.content}
                    alt="danmaku"
                    className="h-full object-contain"
                    onError={(e) => {
                      console.log('[DanmakuLayer] Image load error:', node.content);
                      // Replace with compact error placeholder
                      const container = e.target.parentElement;
                      container.style.height = 'auto';
                      container.innerHTML = `<span style="color: #ff6b6b; font-size: ${
                        settings.fontSize * 0.7
                      }px; white-space: nowrap;">[画像エラー]</span>`;
                    }}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }
);

export default DanmakuLayer;
