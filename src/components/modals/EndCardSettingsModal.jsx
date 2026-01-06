import { FileImage, Link, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const EndCardSettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  logComments, // Array of comments to search for images
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState(settings.type);
  const [logImages, setLogImages] = useState([]);

  // Sync with incoming settings when opening
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setActiveTab(settings.type);
    }
  }, [isOpen, settings]);

  // Extract images from log comments
  useEffect(() => {
    if (isOpen && activeTab === 'log' && logComments) {
      const images = [];
      const seen = new Set();
      // Regex copied from useDanmakuPlayer check logic
      const regex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi;

      logComments.forEach((c) => {
        const matches = c.text.matchAll(regex);
        for (const match of matches) {
          const url = match[1];
          if (!seen.has(url)) {
            seen.add(url);
            images.push({ url, commentId: c.id, time: c.time });
          }
        }
      });
      setLogImages(images);
    }
  }, [isOpen, activeTab, logComments]);

  const handleSave = () => {
    onSettingsChange({
      ...localSettings,
      type: activeTab,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full mr-2"></span>
            エンドカード設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between mb-8 bg-gray-800/50 p-4 rounded-xl">
            <div>
              <h3 className="text-white font-bold mb-1">エンドカードを有効にする</h3>
              <p className="text-sm text-gray-400">動画再生終了時に指定した画像を表示します</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localSettings.enabled}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, enabled: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className={`transition-opacity duration-200 ${!localSettings.enabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">画像ソース</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'file', label: 'ファイル', icon: FileImage },
                { id: 'url', label: 'URL', icon: Link },
                { id: 'log', label: 'ログ内の画像', icon: FileImage },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all font-medium ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 min-h-[300px]">
              {/* FILE TAB */}
              {activeTab === 'file' && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-full max-w-sm aspect-video bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700 overflow-hidden relative">
                    {localSettings.file ? (
                      <img
                        src={URL.createObjectURL(localSettings.file)}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-gray-600 flex flex-col items-center">
                        <FileImage size={48} className="mb-2 opacity-50" />
                        <span>No Image Selected</span>
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLocalSettings({ ...localSettings, file, value: '' });
                        }
                      }}
                    />
                    <FileImage size={18} />
                    画像を選択
                  </label>
                  <p className="text-xs text-yellow-500/80">※ ファイル選択はページリロードでリセットされます</p>
                </div>
              )}

              {/* URL TAB */}
              {activeTab === 'url' && (
                <div className="flex flex-col gap-4">
                  <label className="block text-sm font-medium text-gray-400">画像URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                      placeholder="https://example.com/image.png"
                      value={localSettings.value}
                      onChange={(e) => setLocalSettings({ ...localSettings, value: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center min-h-[200px] overflow-hidden">
                    {localSettings.value ? (
                      <img
                        src={localSettings.value}
                        alt="Preview"
                        className="max-w-full max-h-[300px] object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-gray-600">プレビュー</span>
                    )}
                  </div>
                </div>
              )}

              {/* LOG TAB */}
              {activeTab === 'log' && (
                <div className="flex flex-col h-full">
                  <p className="text-sm text-gray-400 mb-4">
                     ログコメントに含まれる画像（{logImages.length}枚）
                  </p>
                  {logImages.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                      {logImages.map((img, idx) => (
                        <button
                          key={`${idx}-${img.time}`}
                          onClick={() => setLocalSettings({ ...localSettings, value: img.url })}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                            localSettings.value === img.url
                              ? 'border-purple-500 ring-2 ring-purple-500/30'
                              : 'border-transparent hover:border-gray-500'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt="Log image"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[10px] text-white truncate">
                             {img.url.split('/').pop()}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                      <FileImage size={48} className="mb-2 opacity-30" />
                      <p>画像を含むコメントが見つかりませんでした</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end gap-3 rounded-b-xl bg-gray-900">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-400 hover:text-white transition-colors font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndCardSettingsModal;
