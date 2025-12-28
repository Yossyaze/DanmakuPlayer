import React from 'react';
import { FileVideo, Link as LinkIcon, Save, FilePen, FileInput, MessageSquare, PanelRight, BookOpen, Tv } from 'lucide-react';

const Header = ({
    showDanmaku,
    setShowDanmaku,
    showSidebar,
    setShowSidebar,
    logOnlyMode,
    setLogOnlyMode,
    onSave,
    onSaveAs,
    onImport,
    projectName,

    handleFileChange,
    onOpenUrlModal
}) => {
    return (
        <div className="bg-gray-800 p-2 flex items-center shrink-0 z-20 relative shadow-md gap-6 overflow-x-auto">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-4 shrink-0">
                <h1 className="text-white font-bold text-lg tracking-wider flex items-baseline gap-2 select-none">
                    DanmakuPlayer
                    <span className="text-xs text-gray-500 mt-1 font-mono">v4.0.0</span>
                </h1>
                {projectName && (
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded" title="現在のプロジェクト">
                        {projectName}
                    </span>
                )}
            </div>

            {/* View Mode Toggles */}
            <div className="flex bg-gray-900 rounded p-1 gap-1 shrink-0">
                {/* View Mode Switch (Video / Log) */}
                <div className="flex bg-black/20 rounded-md p-0.5 border border-gray-700/50">
                    <button
                        onClick={() => setLogOnlyMode(false)}
                        className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
                            !logOnlyMode 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                        title="動画モード (V)"
                    >
                        <Tv size={16} />
                    </button>
                    <button
                        onClick={() => setLogOnlyMode(true)}
                        className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
                            logOnlyMode 
                                ? 'bg-purple-600 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                        title="ログ読みモード (L)"
                    >
                        <BookOpen size={16} />
                    </button>
                </div>

                {!logOnlyMode && (
                    <>
                        <div className="w-px bg-gray-700 mx-1 self-center h-6"></div>

                        {/* Toggles */}
                        <button
                            onClick={() => setShowDanmaku(!showDanmaku)}
                            className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                showDanmaku
                                    ? 'bg-blue-600/50 text-blue-200' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title={`弾幕 ${showDanmaku ? 'ON' : 'OFF'} (D)`}
                        >
                            <MessageSquare size={18} />
                        </button>
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                showSidebar 
                                    ? 'bg-blue-600/50 text-blue-200' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title={`サイドバー ${showSidebar ? 'ON' : 'OFF'} (S)`}
                        >
                            <PanelRight size={18} />
                        </button>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Project Actions */}
                <div className="flex items-center gap-1 bg-gray-900/50 rounded p-1">
                    <button
                        onClick={onSave}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="上書き保存 (Ctrl+S)"
                    >
                        <Save size={18} />
                    </button>
                    <button
                        onClick={onSaveAs}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="名前をつけて保存"
                    >
                        <FilePen size={18} />
                    </button>
                    <button
                        onClick={onImport}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="プロジェクトを読み込む"
                    >
                        <FileInput size={18} />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-700 mx-1"></div>

                {/* Video Actions */}
                <div className="flex items-center gap-1">
                    <label className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded cursor-pointer transition-colors" title="動画ファイルを開く">
                        <FileVideo size={18} />
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    <button
                        onClick={onOpenUrlModal}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                        title="動画URLを開く"
                    >
                        <LinkIcon size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Header;
