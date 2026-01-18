import React, { useEffect, useRef } from 'react';

import { LOG_FILE_COLORS } from '../../utils/danmakuUtils';

/**
 * カラーピッカーコンポーネント
 * ログファイル別の弾幕色を選択するためのシンプルなパレットUI
 */
const ColorPicker = ({ selected, onSelect, onClose, triggerRef }) => {
  const paletteRef = useRef(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        onClose();
      }
    };

    // 少し遅らせてイベントを登録（クリックイベントがすぐに発火しないように）
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // トリガー要素の位置を取得してポップアップの位置を計算
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  useEffect(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [triggerRef]);

  return (
    <div
      ref={paletteRef}
      className="fixed bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999, // 最高レベルのz-index
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-5 gap-1.5">
        {LOG_FILE_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
              selected === color
                ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800'
                : 'hover:ring-1 hover:ring-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;
