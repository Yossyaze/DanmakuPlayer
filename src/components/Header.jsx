import {
  BookOpen,
  CircleHelp,
  FileInput,
  FilePen,
  FileVideo,
  Image, // Import
  Link as LinkIcon,
  MessageSquare,
  PanelRight,
  RotateCcw, // Import
  Save,
  Tv,
} from 'lucide-react';
import React from 'react';

import pkg from '../../package.json'; // Import package.json

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
  onOpenUrlModal,
  onOpenHelp,
  onReset, // New prop
  onOpenEndCardSettings, // New prop
}) => {
  return (
    <div className="bg-gray-800 py-1 px-2 flex items-center shrink-0 z-20 relative shadow-md gap-4 overflow-x-auto">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="text-white font-bold text-lg tracking-wider flex items-baseline gap-2 select-none">
          DanmakuPlayer
          <span className="text-xs text-blue-400 mt-1 font-mono">v{pkg.version}</span>
        </h1>
        {projectName && (
          <span
            className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded max-w-[400px] truncate"
            title={projectName}
          >
            {projectName}
          </span>
        )}
      </div>

      {/* Spacer - pushes buttons to the right */}
      <div className="flex-1" />

      {/* View Mode Toggles */}
      <div id="header-view-toggles" className="flex bg-gray-900 rounded p-1 gap-1 shrink-0">
        {/* Danmaku & Sidebar Toggles - shown only in video mode */}
        {!logOnlyMode && (
          <>
            {/* Toggles */}
            <button
              id="btn-header-danmaku-toggle"
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
              id="btn-header-sidebar-toggle"
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

            <div className="w-px bg-gray-700 mx-1 self-center h-6"></div>
          </>
        )}

        {/* View Mode Switch (Video / Log) - Click anywhere to toggle */}
        <div
          id="header-view-mode-switch"
          className="flex bg-black/20 rounded-md p-0.5 border border-gray-700/50 cursor-pointer"
          onClick={() => setLogOnlyMode(!logOnlyMode)}
          title={logOnlyMode ? '動画モードに切り替え (V)' : 'ログ読みモードに切り替え (L)'}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
              !logOnlyMode ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'
            }`}
          >
            <Tv size={16} />
          </div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
              logOnlyMode ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400'
            }`}
          >
            <BookOpen size={16} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Project Actions */}
        <div
          id="header-project-actions"
          className="flex items-center gap-1 bg-gray-900/50 rounded p-1"
        >
          <button
            onClick={onSave}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="上書き保存 (Ctrl+S)"
            id="btn-header-save"
          >
            <Save size={18} />
          </button>
          <button
            onClick={onSaveAs}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="名前をつけて保存"
            id="btn-header-save-as"
          >
            <FilePen size={18} />
          </button>
          <button
            onClick={onImport}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="プロジェクトを読み込む"
            id="btn-header-import"
          >
            <FileInput size={18} />
          </button>
          <div className="w-px bg-gray-700 h-6 mx-1"></div>
          <button
            onClick={onReset}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
            title="設定をリセット"
            id="btn-header-reset"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-700 mx-1"></div>

        {/* Video Actions */}
        <div id="header-video-actions" className="flex items-center gap-1">
          <label
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
            title="動画ファイルを開く"
            id="btn-header-open-file"
          >
            <FileVideo size={18} />
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            onClick={onOpenUrlModal}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
            title="動画URLを開く"
            id="btn-header-open-url"
          >
            <LinkIcon size={18} />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-700 mx-1"></div>

        {/* Help Action */}
        <button
          onClick={onOpenHelp}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="ヘルプ・チュートリアル"
          id="btn-header-help"
        >
          <CircleHelp size={18} />
        </button>
      </div>
    </div>
  );
};

export default Header;
