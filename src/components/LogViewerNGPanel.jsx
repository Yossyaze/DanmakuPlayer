import { Ban, Regex, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Z_INDEX } from '../constants/zIndex';

import NgList from './ui/NgList';

const LogViewerNGPanel = ({
  ngSettings,
  removeNgId,
  removeNgComment,
  addNgWord, // Add prop
  removeNgWord, // Add prop
  allComments,
  onClose,
  style,
  onIdClick,
}) => {
  const panelRef = useRef(null);
  const [isRegexMode, setIsRegexMode] = useState(false);

  // 外側クリックで閉じる（トグルボタンを除外）
  useEffect(() => {
    const handleClickOutside = (event) => {
      // トグルボタンのクリックは除外（ボタン自体がトグルを処理する）
      if (event.target.closest('[data-panel-toggle="ng"]')) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-72 animate-fade-in"
      style={{ zIndex: Z_INDEX.floating, ...style }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
          <Ban size={16} className="text-red-400" />
          <span>NG管理</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        {/* NG Word Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="NGワードを追加"
            className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter' && e.target.value.trim()) {
                if (addNgWord) addNgWord(e.target.value.trim(), isRegexMode); // Check if function exists
                e.target.value = '';
              }
            }}
          />
          <button
            className={`px-2 rounded transition-colors border ${
              isRegexMode
                ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setIsRegexMode(!isRegexMode)}
            title="正規表現モード"
          >
            <Regex size={14} />
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition-colors"
            onClick={(e) => {
              const input = e.currentTarget.parentElement.querySelector('input');
              if (input.value.trim()) {
                if (addNgWord) addNgWord(input.value.trim(), isRegexMode);
                input.value = '';
              }
            }}
          >
            追加
          </button>
        </div>

        <NgList
          ngSettings={ngSettings}
          removeNgId={removeNgId}
          removeNgComment={removeNgComment}
          removeNgWord={removeNgWord}
          allComments={allComments}
          onIdClick={
            onClose
              ? (id) => {
                  onIdClick && onIdClick(id);
                  onClose();
                }
              : onIdClick
          }
        />
      </div>
    </div>
  );
};

export default LogViewerNGPanel;
