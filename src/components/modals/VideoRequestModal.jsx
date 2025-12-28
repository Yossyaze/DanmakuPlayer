import React from 'react';

const VideoRequestModal = ({
    isOpen,
    onClose,
    requestedVideoName,
    onFileChange,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-96">
                <h3 className="text-lg font-bold text-white mb-4">動画ファイルの読み込み</h3>
                <p className="text-sm text-gray-300 mb-4">
                    このプロジェクトには以下の動画ファイルが紐付けられています。<br />
                    <span className="font-bold text-yellow-400">{requestedVideoName}</span><br />
                    読み込みますか？
                </p>
                <div className="space-y-4">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            onFileChange(e);
                            onClose();
                        }}
                        className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-500
                        cursor-pointer"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoRequestModal;
