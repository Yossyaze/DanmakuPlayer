import { FileVideo, FolderOpen } from 'lucide-react';
import React from 'react';

const VideoRequestModal = ({ isOpen, onClose, requestedVideoName, onFileChange }) => {
  if (!isOpen) return null;

  const handleManualSelect = () => {
    const input = document.getElementById('video-fallback-input');
    if (input) input.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100 backdrop-blur-sm p-4">
      <div className="bg-gray-800 p-5 rounded-xl shadow-2xl border border-gray-700 w-full max-w-sm">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <FileVideo size={18} className="text-blue-400" />
          動画の読み込み
        </h3>

        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg mb-4">
          <p className="text-[10px] text-gray-500 mb-1">リクエストされたファイル</p>
          <span className="font-mono text-yellow-400 text-xs break-all font-bold">
            {requestedVideoName || '（ファイル名なし）'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleManualSelect}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all"
          >
            <FolderOpen size={16} />
            選択
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
          >
            閉じる
          </button>
        </div>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            onFileChange(e);
            onClose();
          }}
          className="hidden"
          id="video-fallback-input"
        />
      </div>
    </div>
  );
};

export default VideoRequestModal;
