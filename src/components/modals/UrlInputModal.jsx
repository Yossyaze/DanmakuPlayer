import React from 'react';

const UrlInputModal = ({
    isOpen,
    onClose,
    videoUrlInput,
    setVideoUrlInput,
    onSubmit,
}) => {
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (videoUrlInput) {
            onSubmit(e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-96">
                <h3 className="text-lg font-bold text-white mb-4">動画URLを開く</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-blue-500 outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={!videoUrlInput}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            読み込む
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UrlInputModal;
