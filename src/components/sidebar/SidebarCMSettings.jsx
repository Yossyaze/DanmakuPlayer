import { Edit2, Pipette, Plus, RefreshCw, X } from 'lucide-react';
import React, { useState } from 'react';

import { padTime } from '../../utils/sidebarUtils';
import TimeInput from '../ui/TimeInput';

/**
 * SidebarCMSettings - CM (Commercial Message) 設定セクション
 */
const SidebarCMSettings = ({
  cmSettingsRef,
  cmStartInput,
  setCmStartInput,
  cmEndInput,
  setCmEndInput,
  addCmRangeSmart,
  updateCmRange,
  removeCmRange,
  cmRanges,
  startTimeStr,
  currentLogicalTime,
  timeOffset = 0,
  formatTime,
}) => {
  const [editingCmIndex, setEditingCmIndex] = useState(null);
  const [cmStartMode, setCmStartMode] = useState('log');
  const [cmEndMode, setCmEndMode] = useState('log');

  // Helper to render time input based on mode
  const renderTimeInput = (mode, value, setValue, placeholder) => {
    const handleGetCurrent = () => {
      if (mode === 'video') {
        // Use seekbar time (logical time = log time - timeOffset)
        const seekbarSeconds = Math.floor(currentLogicalTime - timeOffset);
        const h = Math.floor(seekbarSeconds / 3600);
        const m = Math.floor((seekbarSeconds % 3600) / 60);
        const s = Math.floor(seekbarSeconds % 60);

        if (h > 0) {
          setValue(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
          setValue(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      } else if (mode === 'log') {
        if (!startTimeStr) return;
        const [h, m, s] = startTimeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m) || isNaN(s)) return;

        const startSec = h * 3600 + m * 60 + s;
        const currentSec = startSec + currentLogicalTime;

        const hh = Math.floor(currentSec / 3600);
        const mm = Math.floor((currentSec % 3600) / 60);
        const ss = Math.floor(currentSec % 60);

        const formatted = `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        setValue(formatted);
      }
    };

    if (mode === 'log' || mode === 'video' || mode === 'duration') {
      const showHours = mode === 'log';
      return (
        <div className="flex items-center gap-1">
          <TimeInput
            value={value}
            onChange={setValue}
            showHours={showHours}
            placeholder={placeholder}
          />
          {(mode === 'video' || mode === 'log') && (
            <button onClick={handleGetCurrent} title="現在の時間を取得">
              <Pipette size={12} />
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={cmSettingsRef} className="space-y-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">CM設定</h4>
      <div className="space-y-2">
        {/* Start Time Row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8 shrink-0">開始</span>
          <select
            value={cmStartMode}
            onChange={(e) => setCmStartMode(e.target.value)}
            className="bg-gray-700 text-white text-[10px] p-1 rounded border border-gray-600 outline-none"
          >
            <option value="log">ログ時間</option>
            <option value="video">動画時間</option>
          </select>
          {renderTimeInput(
            cmStartMode,
            cmStartInput,
            setCmStartInput,
            cmStartMode === 'log' ? '00:00:00' : '00:00'
          )}
        </div>

        {/* End Time Row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8 shrink-0">終了</span>
          <select
            value={cmEndMode}
            onChange={(e) => setCmEndMode(e.target.value)}
            className="bg-gray-700 text-white text-[10px] p-1 rounded border border-gray-600 outline-none"
          >
            <option value="log">ログ時間</option>
            <option value="duration">長さ</option>
          </select>
          {renderTimeInput(
            cmEndMode,
            cmEndInput,
            setCmEndInput,
            cmEndMode === 'log' ? '00:00:00' : '00:00'
          )}
        </div>

        {editingCmIndex !== null ? (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                updateCmRange(
                  editingCmIndex,
                  cmStartMode,
                  cmStartInput,
                  cmEndMode,
                  cmEndInput,
                  startTimeStr
                );
                setEditingCmIndex(null);
                setCmStartInput('');
                setCmEndInput('');
              }}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1"
            >
              <RefreshCw size={14} /> 更新
            </button>
            <button
              onClick={() => {
                setEditingCmIndex(null);
                setCmStartInput('');
                setCmEndInput('');
              }}
              className="bg-gray-600 hover:bg-gray-500 text-white p-1.5 rounded text-xs flex items-center justify-center"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              addCmRangeSmart(cmStartMode, cmStartInput, cmEndMode, cmEndInput, startTimeStr)
            }
            className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1 mt-1"
          >
            <Plus size={14} /> 追加
          </button>
        )}
      </div>
      {cmRanges.length > 0 && (
        <div className="space-y-1 mt-1">
          {cmRanges.map((range, i) => {
            // Calculate accumulated CM time before this interval
            const accumulatedCmTime = cmRanges.slice(0, i).reduce((acc, r) => {
              return acc + (r.logEnd - r.logStart);
            }, 0);

            const vStart = typeof range.videoStart === 'number' ? range.videoStart : 0;
            const cmDuration = range.logEnd - range.logStart;

            // Convert to logical time (video time + accumulated CM time)
            const logicalStart = vStart + accumulatedCmTime;
            const logicalEnd = logicalStart + cmDuration;

            return (
              <div
                key={i}
                className={`flex flex-col bg-gray-900 p-1.5 rounded text-xs text-gray-400 gap-1 ${editingCmIndex === i ? 'border border-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span>{`ログ: ${range.labelStart} ~ ${range.labelEnd}`}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCmIndex(i);
                        setCmStartMode('log');
                        setCmEndMode('log');
                        setCmStartInput(padTime(range.labelStart));
                        setCmEndInput(padTime(range.labelEnd));
                      }}
                      className="hover:text-blue-400"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => removeCmRange(i)} className="hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <span className="font-mono text-blue-400 text-[10px]">
                  動画: {formatTime(logicalStart)} ~ {formatTime(logicalEnd)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarCMSettings;
