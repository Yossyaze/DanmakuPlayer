import { ChevronUp, Regex } from 'lucide-react';
import React, { useState } from 'react';

import NgList from '../ui/NgList';

/**
 * NG Management panel component for Sidebar
 * Displays and manages NG IDs and NG Comments
 */
const SidebarNGPanel = ({
  ngSettings,
  removeNgId,
  removeNgComment,
  addNgWord, // Add prop
  removeNgWord, // Add prop
  allComments,
  onIdClick,
  onClose,
}) => {
  const [isRegexMode, setIsRegexMode] = useState(false);

  return (
    <>
      <div className="bg-gray-800 border-b border-gray-700 overflow-y-auto max-h-[85vh] scrollbar-thin shrink-0">
        <div className="p-4 space-y-6">
          {/* NG Management */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">NG管理</h4>

            {/* NG List Component */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              {/* NG Word Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="NGワードを追加"
                  className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addNgWord && addNgWord(e.target.value.trim(), isRegexMode);
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
                      addNgWord && addNgWord(input.value.trim(), isRegexMode);
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
                onIdClick={onIdClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Close NG Panel Button */}
      <div className="relative h-0 z-20 flex justify-center">
        <button
          onClick={onClose}
          className="bg-gray-700 border-b border-r border-l border-gray-600 rounded-b-md px-24 py-4 shadow-md hover:bg-gray-600 transition-colors flex items-center justify-center group"
          title="NG管理を閉じる"
        >
          <ChevronUp size={18} className="text-gray-400 group-hover:text-white" />
        </button>
      </div>
    </>
  );
};

export default SidebarNGPanel;
