import {
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Z_INDEX } from '../../constants/zIndex';

/**
 * ImageDisplayModal - 拡大画像を表示するモーダル
 *
 * @param {string} src - 画像のURL
 * @param {function} onClose - 閉じるコールバック
 */
const ImageDisplayModal = ({
  src,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  imageList,
  onJumpTo,
  onSetEndCard,
}) => {
  const [showGrid, setShowGrid] = useState(false);
  // ESCキーと矢印キーで操作
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (onPrev && hasPrev) onPrev();
      } else if (e.key === 'ArrowRight') {
        if (onNext && hasNext) onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  // Swipe Handling
  const touchStartRef = useRef(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNext) {
      onNext();
    } else if (isRightSwipe && hasPrev && onPrev) {
      onPrev();
    }
    touchStartRef.current = null;
  };

  // Trackpad / Mouse Wheel Handling
  const lastWheelTimeRef = useRef(0);
  const handleWheel = (e) => {
    // Only handle horizontal scrolling
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 500) return; // Debounce 500ms

      if (e.deltaX > 0 && hasNext && onNext) {
        onNext();
        lastWheelTimeRef.current = now;
      } else if (e.deltaX < 0 && hasPrev && onPrev) {
        onPrev();
        lastWheelTimeRef.current = now;
      }
    }
  };

  const prevIndexRef = useRef(currentIndex);
  const directionRef = useRef(null);

  if (prevIndexRef.current !== currentIndex) {
    if (currentIndex > prevIndexRef.current) {
      directionRef.current = 'next';
    } else {
      directionRef.current = 'prev';
    }
    prevIndexRef.current = currentIndex;
  }

  if (!src) return null;

  let animationClass = 'animate-fade-in';
  if (directionRef.current === 'next') {
    animationClass = 'animate-slide-in-right';
  } else if (directionRef.current === 'prev') {
    animationClass = 'animate-slide-in-left';
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 animate-fade-in"
      style={{ zIndex: Z_INDEX.imageViewer }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <img
        key={src} // Key change triggers animation
        src={src}
        alt="Zoomed"
        className={`max-w-full max-h-full rounded shadow-2xl object-contain select-none ${animationClass}`}
        onClick={(e) => e.stopPropagation()} // 画像クリックでは閉じない（オプション：好みに応じて変更可）
      />

      {/* 閉じるボタン (PCではマウスでも直感的に閉じられるように、スマホではタップしやすい位置に) */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition-colors cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="閉じる"
      >
        <X size={24} />
      </button>

      {/* Download Button */}
      <button
        className={`absolute top-4 ${imageList && imageList.length > 1 ? 'right-28' : 'right-16'} text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition-colors cursor-pointer`}
        onClick={async (e) => {
          e.stopPropagation();
          try {
            const response = await fetch(src);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Infer filename from URL, fallback to 'download'
            const filename = src.split('/').pop().split('?')[0] || 'download';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (err) {
            console.error('Download failed, opening in new tab', err);
            window.open(src, '_blank');
          }
        }}
        title="画像を保存"
      >
        <Download size={24} />
      </button>

      {/* Set End Card Button */}
      {onSetEndCard && (
        <button
          className={`absolute top-4 ${imageList && imageList.length > 1 ? 'right-40' : 'right-28'} text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition-colors cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            onSetEndCard(src);
          }}
          title="エンドカードに設定"
        >
          <ImageIcon size={24} />
        </button>
      )}

      {/* Grid View Toggle Button (Only if list exists) */}
      {imageList && imageList.length > 1 && (
        <button
          className="absolute top-4 right-16 text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowGrid(!showGrid);
          }}
          title={showGrid ? '画像を一枚表示' : '画像一覧'}
        >
          <LayoutGrid size={24} />
        </button>
      )}

      {/* Grid View Overlay */}
      {showGrid && imageList && (
        <div
          className="absolute inset-x-0 bottom-0 top-16 bg-black/90 p-4 overflow-y-auto animate-slide-up z-floating rounded-t-xl border-t border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {imageList.map((img, idx) => (
              <div
                key={`${idx}-${img.src}`}
                className={`aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all hover:opacity-80 ${
                  idx === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-transparent'
                }`}
                onClick={() => {
                  if (onJumpTo) onJumpTo(idx);
                  setShowGrid(false);
                }}
              >
                <img
                  src={img.src}
                  alt={`Thumbnail ${idx}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Arrows (Visible on hover or always on touch if implemented differently, but here just standard buttons) */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-3 transition-colors cursor-pointer hidden md:flex"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          title="前の画像"
        >
          <ChevronLeft size={36} />
        </button>
      )}

      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-3 transition-colors cursor-pointer hidden md:flex"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          title="次の画像"
        >
          <ChevronRight size={36} />
        </button>
      )}
    </div>
  );
};

export default ImageDisplayModal;
