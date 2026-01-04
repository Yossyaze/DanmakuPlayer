import React from 'react';

const ExportModal = ({
  isOpen,
  onClose,
  exportFileName,
  setExportFileName,
  videoFileName,
  threadTitle,
  onExport,
}) => {
  if (!isOpen) return null;

  const handleDateSuggestion = () => {
    const now = new Date();
    const str = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    setExportFileName(str);
  };

  const handleVideoNameSuggestion = () => {
    if (videoFileName) {
      const name = videoFileName.replace(/\.[^/.]+$/, '');
      setExportFileName(name);
    }
  };

  const handleThreadTitleSuggestion = () => {
    if (threadTitle) {
      const sanitized = threadTitle.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
      setExportFileName(sanitized);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-96">
        <h3 className="text-lg font-bold text-white mb-4">設定をエクスポート</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">ファイル名</label>
            <input
              type="text"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              placeholder="project_settings"
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-blue-500 outline-none"
            />
            {/* Filename Suggestions */}
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">名前の候補:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDateSuggestion}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                >
                  日時
                </button>

                {videoFileName && (
                  <button
                    onClick={handleVideoNameSuggestion}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                    title={videoFileName}
                  >
                    動画名
                  </button>
                )}

                {threadTitle && (
                  <button
                    onClick={handleThreadTitleSuggestion}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors max-w-[200px] truncate"
                    title={threadTitle}
                  >
                    スレッド名
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              エクスポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
