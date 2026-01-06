import { FileImage, Link, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatTime } from '../../utils/danmakuUtils';
import TimeInput from '../ui/TimeInput';

const EndCardSettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  logComments, // Array of comments to search for images
  currentTime, // New prop
  timeOffset = 0, // Offset for Log vs Logical time
  videoTimeToLogTime, // Function to convert video time to log time
  logTimeToVideoTime, // Function to convert log time to video time
  logStartTime, // "HH:MM:SS" string of log start time
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState(settings.type);
  const [inputMode, setInputMode] = useState('logical'); // 'logical' (Video Time) or 'log' (Log Time)
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
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85vh]">
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
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Settings (30%) */}
          <div className="w-[320px] bg-gray-900/50 border-r border-gray-800 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            
            {/* 1. Main Toggle */}
            <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold text-sm">エンドカード有効化</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.enabled}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, enabled: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                動画再生終了時に指定した画像を表示します
              </p>
            </div>

            {/* 2. Preview Settings */}
            <div className={`transition-opacity duration-200 flex-1 flex flex-col ${!localSettings.enabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
               <div className="flex items-center justify-between mb-4">
                 <div>
                    <h3 className="text-white font-bold text-sm">予告表示 (Preview)</h3>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input
                     type="checkbox"
                     className="sr-only peer"
                     checked={localSettings.previewEnabled || false}
                     onChange={(e) =>
                       setLocalSettings({ ...localSettings, previewEnabled: e.target.checked })
                     }
                   />
                   <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                 </label>
               </div>

               {localSettings.previewEnabled && (
                 <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 flex flex-col gap-4 animate-fade-in">
                   
                   {/* Input Mode */}
                   <div>
                     <label className="block text-xs text-gray-400 mb-2">入力モード</label>
                     <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                        <button
                          onClick={() => setInputMode('logical')}
                          className={`flex-1 py-1.5 text-xs rounded transition-colors ${inputMode === 'logical' ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          論理時間
                        </button>
                        <button
                          onClick={() => setInputMode('log')}
                          className={`flex-1 py-1.5 text-xs rounded transition-colors ${inputMode === 'log' ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          実時間
                        </button>
                     </div>
                   </div>

                   {/* Time Input */}
                   <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        開始時間 ({inputMode === 'logical' ? '動画時間' : '絶対時間'})
                      </label>
                      <TimeInput
                         showHours={true}
                         value={(() => {
                           if (inputMode === 'log') {
                             if (logStartTime && localSettings.previewStartTime !== undefined) {
                                const [h, m, s] = logStartTime.split(':').map(Number);
                                const startSec = h * 3600 + m * 60 + s;
                                let totalSec = startSec + (localSettings.previewStartTime || 0);
                                totalSec %= 86400;
                                const fh = Math.floor(totalSec / 3600);
                                const fm = Math.floor((totalSec % 3600) / 60);
                                const fs = Math.floor(totalSec % 60);
                                return `${fh}:${fm.toString().padStart(2, '0')}:${fs.toString().padStart(2, '0')}`;
                             }
                             return formatTime(localSettings.previewStartTime || 0);
                           }
                           return formatTime(Math.max(0, (localSettings.previewStartTime || 0) - timeOffset));
                         })()}
                         onChange={(val) => {
                           const parts = val.split(':').map(Number);
                           let seconds = 0;
                           if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                           else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                           else seconds = Number(val) || 0;

                           let finalTime = seconds;

                           if (inputMode === 'log') {
                             if (logStartTime) {
                                const [h, m, s] = logStartTime.split(':').map(Number);
                                const startSec = h * 3600 + m * 60 + s;
                                let relLogTime = seconds - startSec;
                                if (relLogTime < -43200) relLogTime += 86400;
                                if (relLogTime > 43200) relLogTime -= 86400;
                                finalTime = relLogTime;
                             } else {
                                finalTime = seconds;
                             }
                           } else {
                              finalTime = seconds + timeOffset;
                           }
                           
                           setLocalSettings({ ...localSettings, previewStartTime: finalTime });
                         }}
                         placeholder={inputMode === 'log' ? "HH:MM:SS" : "00:00"}
                      />
                   </div>

                   {/* Current Time Button */}
                   {currentTime !== undefined && (
                      <button
                        onClick={() => {
                          const logTime = currentTime + timeOffset;
                          setLocalSettings({ ...localSettings, previewStartTime: Math.floor(logTime * 10) / 10 });
                        }}
                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-xs text-white rounded-lg transition-colors flex flex-col items-center justify-center gap-0.5 border border-gray-600 hover:border-gray-500"
                      >
                        <span>現在の時間を設定</span>
                        <span className="font-mono text-gray-300 opacity-80">
                          {(() => {
                             if (inputMode === 'log') {
                               if (logStartTime) {
                                 const curLogTime = currentTime + timeOffset;
                                 const [h, m, s] = logStartTime.split(':').map(Number);
                                 const startSec = h * 3600 + m * 60 + s;
                                 let totalSec = startSec + curLogTime;
                                 totalSec %= 86400;
                                 const fh = Math.floor(totalSec / 3600);
                                 const fm = Math.floor((totalSec % 3600) / 60);
                                 const fs = Math.floor(totalSec % 60);
                                 return `${fh}:${fm.toString().padStart(2, '0')}:${fs.toString().padStart(2, '0')}`;
                               }
                               return formatTime(currentTime + timeOffset);
                             } else {
                               return formatTime(currentTime); 
                             }
                          })()}
                        </span>
                      </button>
                   )}

                   {inputMode === 'log' && !logStartTime && (
                      <p className="text-[10px] text-yellow-500 leading-tight">start_time 不明: 相対ログ時間</p>
                   )}
                   <p className="text-[10px] text-gray-500 leading-tight">
                     ※ 予告は右下に表示されます
                   </p>
                 </div>
               )}
            </div>
          </div>

          {/* RIGHT COLUMN: Image Selection (70%) */}
          <div className={`flex-1 p-6 overflow-hidden flex flex-col transition-opacity duration-200 ${!localSettings.enabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">画像ソース選択</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 shrink-0">
              {[
                { id: 'file', label: 'ファイル', icon: FileImage },
                { id: 'url', label: 'URL', icon: Link },
                { id: 'log', label: 'ログ画像', icon: FileImage },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Area */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 flex-1 overflow-hidden relative">
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4">
              
              {/* FILE TAB */}
              {activeTab === 'file' && (
                <div className="flex flex-col items-center justify-center min-h-full gap-6">
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
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg">
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
                    <FileImage size={20} />
                    ローカル画像を選択
                  </label>
                </div>
              )}

              {/* URL TAB */}
              {activeTab === 'url' && (
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors"
                      placeholder="https://example.com/image.png"
                      value={localSettings.value}
                      onChange={(e) => setLocalSettings({ ...localSettings, value: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden relative">
                    {localSettings.value ? (
                      <img
                        src={localSettings.value}
                        alt="Preview"
                        className="w-full h-full object-contain absolute inset-0"
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
                  <p className="text-xs text-gray-400 mb-3 sticky top-0 bg-gray-900/0 backdrop-blur-sm z-10 py-1">
                     検出された画像: {logImages.length}枚
                  </p>
                  {logImages.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                      {logImages.map((img, idx) => (
                        <button
                          key={`${idx}-${img.time}`}
                          onClick={() => setLocalSettings({ ...localSettings, value: img.url })}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                            localSettings.value === img.url
                              ? 'border-purple-500 ring-2 ring-purple-500/30 ring-offset-1 ring-offset-gray-900'
                              : 'border-transparent hover:border-gray-500'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt="Log image"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
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
            className="px-6 py-2 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndCardSettingsModal;
