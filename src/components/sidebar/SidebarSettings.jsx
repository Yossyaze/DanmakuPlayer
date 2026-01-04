import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronUp, Clock, Link as LinkIcon, RefreshCw, Upload } from 'lucide-react';
import React from 'react';

import SidebarFileRow from '../SidebarFileRow';
import TimeInput from '../ui/TimeInput';
import SidebarCMSettings from './SidebarCMSettings';

/**
 * Settings panel component for Sidebar
 * Manages: Log files, Sync settings, Keyboard settings, CM settings
 */
const SidebarSettings = ({
  // Refs
  settingsScrollRef,
  cmSettingsRef,

  // File Management
  loadedFiles,
  handleLogFileChange,
  handleReorderFiles,
  handleToggleFileVisibility,
  handleRemoveFile,

  // URL Loading
  urlInput,
  setUrlInput,
  handleUrlLoad,

  // Time Settings
  startTimeStr,
  setStartTimeStr,
  videoStartTimeStr,
  setVideoStartTimeStr,
  currentLogicalTime,
  timeOffset,
  formatTime,

  // Display Options
  showThreadTitle,
  setShowThreadTitle,
  enableTreeView,
  setEnableTreeView,
  showImages,
  setShowImages,
  aaMode,
  setAaMode,

  // Keyboard Settings
  skipSeconds,
  setSkipSeconds,

  // CM Settings
  cmStartInput,
  setCmStartInput,
  cmEndInput,
  setCmEndInput,
  addCmRangeSmart,
  updateCmRange,
  removeCmRange,
  cmRanges,

  // Auto-scroll

  // Panel control
  onClose,
}) => {
  // Debug: Check if handleReorderFiles is passed correctly
  React.useEffect(() => {
    console.log(
      '[SidebarSettings] mounted. handleReorderFiles:',
      typeof handleReorderFiles,
      handleReorderFiles
    );
    console.log('[SidebarSettings] loadedFiles:', loadedFiles?.length);
  }, [handleReorderFiles, loadedFiles]);

  // DnD Sensors for file reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    console.log('[SidebarSettings] handleDragEnd called', event);
    const { active, over } = event;
    console.log('[SidebarSettings] active:', active?.id, 'over:', over?.id);
    if (active.id !== over?.id) {
      const oldIndex = loadedFiles.findIndex((file) => file.id === active.id);
      const newIndex = loadedFiles.findIndex((file) => file.id === over.id);
      console.log('[SidebarSettings] oldIndex:', oldIndex, 'newIndex:', newIndex);
      if (oldIndex !== -1 && newIndex !== -1) {
        console.log('[SidebarSettings] Calling handleReorderFiles', typeof handleReorderFiles);
        handleReorderFiles(oldIndex, newIndex);
      }
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    handleUrlLoad(urlInput);
    setUrlInput('');
  };

  return (
    <>
      <div
        ref={settingsScrollRef}
        className="bg-gray-800 border-b border-gray-700 overflow-y-auto max-h-[85vh] scrollbar-thin shrink-0"
      >
        <div className="p-4 space-y-6">
          {/* 1. Log Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                ログ読み込み
              </h4>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors">
                <Upload size={12} />
                ファイルを選択
                <input
                  type="file"
                  accept=".txt,.dat,.json"
                  multiple
                  onChange={handleLogFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) =>
                console.log('[SidebarSettings] onDragStart', event.active?.id)
              }
              onDragMove={(event) => console.log('[SidebarSettings] onDragMove', event.active?.id)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={loadedFiles.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                  {loadedFiles.map((file, index) => (
                    <SidebarFileRow
                      key={file.id}
                      file={file}
                      index={index}
                      handleToggleFileVisibility={handleToggleFileVisibility}
                      handleRemoveFile={handleRemoveFile}
                    />
                  ))}
                  {loadedFiles.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-4 bg-gray-900/50 rounded border border-dashed border-gray-700">
                      ログファイルがありません
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* URL Input */}
            <form onSubmit={handleUrlSubmit} className="flex gap-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <LinkIcon size={12} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="URLから読み込む (dat/html)"
                  className="w-full bg-gray-900 border border-gray-700 rounded pl-7 pr-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!urlInput}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                読込
              </button>
            </form>
          </div>

          {/* AA Mode Setting */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">AAモード（自動判定）</span>
            <div className="flex bg-gray-700 rounded p-0.5">
              <button
                onClick={() => setAaMode('auto')}
                className={`px-3 py-1 rounded text-[10px] transition-colors ${aaMode === 'auto' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Auto
              </button>
              <button
                onClick={() => setAaMode('off')}
                className={`px-3 py-1 rounded text-[10px] transition-colors ${aaMode === 'off' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                OFF
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-700 my-2" />

          {/* 2. Sync Settings */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">同期設定</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">ログ開始時間</span>
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-blue-400" />
                    <TimeInput value={startTimeStr} onChange={setStartTimeStr} showHours={true} />
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-4">=</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">動画時間</span>
                  <TimeInput
                    value={videoStartTimeStr}
                    onChange={setVideoStartTimeStr}
                    showHours={true}
                    placeholder="00:00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showThreadTitle}
                    onChange={(e) => setShowThreadTitle(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600"
                  />{' '}
                  スレッドタイトルを表示
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableTreeView}
                    onChange={(e) => setEnableTreeView(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600"
                  />{' '}
                  アンカーをツリー表示 (引用)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showImages}
                    onChange={(e) => setShowImages(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600"
                  />{' '}
                  画像URLをインライン表示
                </label>
              </div>
            </div>
          </div>

          {/* Keyboard Settings */}
          <div className="p-4 space-y-5 border-t border-gray-700">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                キーボード操作設定
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <label>スキップ秒数</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      value={skipSeconds}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSkipSeconds('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) setSkipSeconds(num);
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setSkipSeconds(Math.max(1, Math.min(60, val)));
                        else setSkipSeconds(5);
                      }}
                      className="w-12 bg-gray-800 text-right border border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 text-xs"
                    />
                    <span>秒</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={skipSeconds || 5}
                  onChange={(e) => setSkipSeconds(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                />
              </div>
            </div>

            {/* CM Settings */}
            <SidebarCMSettings
              cmSettingsRef={cmSettingsRef}
              cmStartInput={cmStartInput}
              setCmStartInput={setCmStartInput}
              cmEndInput={cmEndInput}
              setCmEndInput={setCmEndInput}
              addCmRangeSmart={addCmRangeSmart}
              updateCmRange={updateCmRange}
              removeCmRange={removeCmRange}
              cmRanges={cmRanges}
              startTimeStr={startTimeStr}
              currentLogicalTime={currentLogicalTime}
              timeOffset={timeOffset}
              formatTime={formatTime}
            />
          </div>
        </div>
      </div>

      {/* Close Button Panel */}
      <div className="relative h-0 z-20 flex justify-center">
        <button
          onClick={onClose}
          className="bg-gray-700 border-b border-r border-l border-gray-600 rounded-b-md px-24 py-4 shadow-md hover:bg-gray-600 transition-colors flex items-center justify-center group"
          title="設定を閉じる"
        >
          <ChevronUp size={18} className="text-gray-400 group-hover:text-white" />
        </button>
      </div>
    </>
  );
};

export default SidebarSettings;
