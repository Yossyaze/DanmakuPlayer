import { AlignLeft, Eye, Image as ImageIcon, LayoutList, Type, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

const LogViewerSettings = ({ settings, onSettingsChange, onClose, style }) => {
  const panelRef = useRef(null);

  // 外側クリックで閉じる（トグルボタンを除外）
  useEffect(() => {
    const handleClickOutside = (event) => {
      // トグルボタンのクリックは除外（ボタン自体がトグルを処理する）
      if (event.target.closest('[data-panel-toggle="settings"]')) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Helper to update a single setting
  const update = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div
      ref={panelRef}
      className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-72 animate-fade-in"
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-200">表示設定</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Type size={12} />
            <span>文字サイズ</span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-gray-950 p-1 rounded-md border border-gray-800">
            {[
              { id: 'small', label: '小', size: 'text-xs' },
              { id: 'medium', label: '中', size: 'text-sm' },
              { id: 'large', label: '大', size: 'text-base' },
              { id: 'xlarge', label: '特大', size: 'text-lg' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => update('fontSize', opt.id)}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  settings.fontSize === opt.id
                    ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
                title={opt.label}
              >
                <span className={opt.size}>A</span>
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <LayoutList size={12} />
            <span>行間 (密度)</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-md border border-gray-800">
            {[
              { id: 'compact', label: '狭い' },
              { id: 'comfortable', label: '標準' },
              { id: 'spacious', label: '広い' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => update('density', opt.id)}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  settings.density === opt.id
                    ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Eye size={12} />
            <span>表示要素</span>
          </div>
          <div className="space-y-1">
            {[
              { id: 'showImages', label: '画像を表示', icon: ImageIcon },
              {
                id: 'showThumbnails',
                label: '画像を小さく表示',
                icon: null,
                disabled: !settings.showImages,
                indent: true,
              },
              { id: 'showIds', label: 'ID・時間を表示', icon: null },
              { id: 'enableTreeView', label: 'ツリー表示 (階層)', icon: AlignLeft },
              { id: 'aaMode', label: 'AAモード (自動判定)', icon: Type, isSelect: true }, // Not a simple toggle, but maybe reuse toggle UI or make a select? Let's use toggle for now: "Auto" (true) vs "Off" (false)? Need 3 states? 'auto' | 'off'.
              // The current UI uses boolean toggles.
              // I will add a custom AA selector here.
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => !opt.disabled && update(opt.id, !settings[opt.id])}
                disabled={opt.disabled}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                  opt.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-800 cursor-pointer'
                }`}
              >
                <div className={`flex items-center gap-2 ${opt.indent ? 'pl-6' : ''}`}>
                  {opt.icon && <opt.icon size={14} className="text-gray-500" />}
                  <span className={settings[opt.id] ? 'text-gray-200' : 'text-gray-400'}>
                    {opt.label}
                  </span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    settings[opt.id] ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${
                      settings[opt.id] ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            ))}

            {/* Image Layout Selector */}
            {settings.showImages && (
              <div className="w-full flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors pl-9">
                <span className="text-gray-400">画像レイアウト</span>
                <div className="flex bg-gray-700 rounded p-0.5">
                  <button
                    onClick={() => update('imageLayout', 'inline')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${settings.imageLayout === 'inline' || !settings.imageLayout ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    インライン
                  </button>
                  <button
                    onClick={() => update('imageLayout', 'grouped')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${settings.imageLayout === 'grouped' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    まとめて
                  </button>
                </div>
              </div>
            )}

            {/* AA Mode Selector (Custom) */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">AAモード (自動)</span>
              </div>
              <div className="flex bg-gray-700 rounded p-0.5">
                <button
                  onClick={() => update('aaMode', 'auto')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${settings.aaMode === 'auto' || settings.aaMode === true ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Auto
                </button>
                <button
                  onClick={() => update('aaMode', 'off')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${settings.aaMode === 'off' || !settings.aaMode ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  OFF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewerSettings;
