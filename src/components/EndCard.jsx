import { RotateCcw, X } from 'lucide-react';
import React, { useMemo } from 'react';

const EndCard = ({
  settings,
  onClose,
  onReplay,
}) => {
  const imageUrl = useMemo(() => {
    if (!settings || !settings.enabled) return null;

    if (settings.type === 'file' && settings.file) {
      return URL.createObjectURL(settings.file);
    }
    if (settings.type === 'url' && settings.value) {
      return settings.value;
    }
    if (settings.type === 'log' && settings.value) {
      return settings.value;
    }
    return null;
  }, [settings]);

  // if (!imageUrl) return null; // Logic changed to allow rendering without image

  return (
    <div 
      className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in group"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Background with blur effect */}
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}

      {/* Main Image */}
      {imageUrl && (
        <div className="relative z-10 max-w-[90%] max-h-[80%] shadow-2xl rounded-lg overflow-hidden border border-white/10">
          <img 
            src={imageUrl} 
            alt="End Card" 
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      )}

      {/* Actions */}
      <div className="relative z-10 flex gap-4 mt-8">
        <button
          onClick={onReplay}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
        >
          <RotateCcw size={20} />
          もう一度見る
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full font-medium transition-all"
        >
          <X size={20} />
          閉じる
        </button>
      </div>
    </div>
  );
};

export default EndCard;
