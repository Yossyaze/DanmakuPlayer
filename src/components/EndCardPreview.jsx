import React, { useMemo } from 'react';

const EndCardPreview = ({ settings, onClick }) => {
  const imageUrl = useMemo(() => {
    if (!settings) return null;

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

  if (!imageUrl) return null;

  return (
    <div
      onClick={() => onClick && onClick(imageUrl)}
      className="absolute bottom-40 right-4 z-40 w-64 aspect-video bg-black/80 rounded-lg shadow-2xl border border-white/20 overflow-hidden animate-slide-up-fade origin-bottom-right group cursor-pointer transition-all hover:scale-105 opacity-70 hover:opacity-100"
    >
      <div className="absolute top-0 left-0 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-br z-10">
        エンドカード
      </div>
      <img src={imageUrl} alt="End Card Preview" className="w-full h-full object-cover" />
      {/* Optional: Add Overlay? */}
    </div>
  );
};

export default EndCardPreview;
