import React from "react";
import { Settings, X } from "lucide-react";
import { playRandomAbeVoice } from "../../utils/abeMode";

const DanmakuSettingsPopover = ({
  dmSettings,
  setDmSettings,
  abeModeUnlocked = false,
  onClose,
  triggerRef,
}) => {
  return (
    <>
      {/* Transparent Backdrop to capture clicks */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          // If click is on the trigger button, let the button handle it (managed by z-index or refs elsewhere usually, but here we just block interactions)
          // Actually, with a fixed inset-0 z-40, this covers everything EXCEPT children with higher z-index.
          // The trigger button is likely under this backdrop in DOM order or z-index context.

          // To allow the toggle button to work naturally if it's ABOVE this backdrop, we don't need to do anything special here as the click wouldn't hit the backdrop.
          // BUT, if the trigger button is BEHIND, this catches it.
          // The user wants to prevent interactions with OTHER elements (video play/pause).
          onClose && onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose && onClose();
        }}
      />

      {/* Popover Content */}
      <div
        className="absolute bottom-12 right-0 w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-4 z-50 text-white animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
          <span className="text-sm font-bold flex items-center gap-2">
            <Settings size={14} /> 弾幕設定
          </span>
          {/* Close button optional if clicking outside closes it, but nice to have */}
        </div>

        <div className="space-y-4">
          {/* Display Duration */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <label>表示時間</label>
              <span className="font-mono text-white">
                {dmSettings.duration}秒
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">短</span>
              <input
                type="range"
                min="2"
                max="15"
                step="0.5"
                value={dmSettings.duration || 5}
                onChange={(e) =>
                  setDmSettings({
                    ...dmSettings,
                    duration: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1 bg-gray-600 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">長</span>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <label>文字サイズ</label>
              <span className="font-mono text-white">
                {dmSettings.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="1"
              value={dmSettings.fontSize || 20}
              onChange={(e) =>
                setDmSettings({
                  ...dmSettings,
                  fontSize: parseInt(e.target.value),
                })
              }
              className="w-full h-1 bg-gray-600 rounded accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <label>不透明度</label>
              <span className="font-mono text-white">
                {Math.round((dmSettings.opacity || 0.7) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={dmSettings.opacity || 0.7}
              onChange={(e) =>
                setDmSettings({
                  ...dmSettings,
                  opacity: parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-gray-600 rounded accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Area */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <label>表示範囲</label>
              <span className="font-mono text-white">
                {dmSettings.area || 100}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">上</span>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={dmSettings.area || 100}
                onChange={(e) =>
                  setDmSettings({
                    ...dmSettings,
                    area: parseInt(e.target.value),
                  })
                }
                className="flex-1 h-1 bg-gray-600 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">全</span>
            </div>
          </div>

          {/* Image Mode */}
          <div className="space-y-1 pt-2 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <label>画像表示</label>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-md border border-gray-700">
              {[
                { id: "none", label: "なし" },
                { id: "image", label: "画像" },
                { id: "placeholder", label: "マーカー" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setDmSettings({ ...dmSettings, imageMode: opt.id })
                  }
                  className={`py-1.5 text-xs font-medium rounded transition-all ${
                    (dmSettings.imageMode || "none") === opt.id
                      ? "bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Abe Mode Setting (Hidden Feature) */}
          {abeModeUnlocked && (
            <div className="space-y-1 pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌈</span>
                  <div>
                    <label className="text-xs text-gray-400">
                      安倍晋三モード
                    </label>
                    <p className="text-[10px] text-gray-600">
                      語録を虹色で強調
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const nextMode = !dmSettings.abeMode;
                    if (nextMode) {
                      playRandomAbeVoice();
                    }
                    setDmSettings({
                      ...dmSettings,
                      abeMode: nextMode,
                    });
                  }}
                  style={{
                    background: dmSettings.abeMode
                      ? "linear-gradient(90deg, #ff4444, #ffaa00, #ffff44, #44ff44, #44aaff, #aa44ff)"
                      : undefined,
                  }}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    !dmSettings.abeMode ? "bg-gray-700" : ""
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white border border-gray-400 rounded-full shadow transition-all ${
                      dmSettings.abeMode ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DanmakuSettingsPopover;
