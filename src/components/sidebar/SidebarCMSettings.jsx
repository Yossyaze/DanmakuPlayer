import { Edit2, Pipette, Plus, RefreshCw, X } from 'lucide-react';
import React, { useState } from 'react';

import { padTime } from '../../utils/sidebarUtils';
import DateInput from '../ui/DateInput';
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
  cmStartDateInput,
  setCmStartDateInput,
  cmEndDateInput,
  setCmEndDateInput,
  addCmRangeSmart,
  updateCmRange,
  removeCmRange,
  cmRanges,
  startTimeStr,
  startDateStr,
  currentTime,
  logStartTime = 0,
  formatTime,
}) => {
  const [editingCmIndex, setEditingCmIndex] = useState(null);
  const [cmStartMode, setCmStartMode] = useState('log');
  const [cmEndMode, setCmEndMode] = useState('log');

  // Helper to render time input based on mode
  const renderTimeInput = (mode, value, setValue, dateValue, setDateValue, placeholder) => {
    const handleGetCurrent = () => {
      if (mode === 'video') {
        // Use seekbar time (logical time = log time - logStartTime)
        const seekbarSeconds = Math.floor(currentTime - logStartTime);
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
        const currentSec = startSec + currentTime;

        // Handle day overflow
        let days = Math.floor(currentSec / 86400);
        let remainingSec = currentSec % 86400;
        if (remainingSec < 0) {
          days -= 1;
          remainingSec += 86400;
        }

        const hh = Math.floor(remainingSec / 3600);
        const mm = Math.floor((remainingSec % 3600) / 60);
        const ss = Math.floor(remainingSec % 60);

        const formatted = `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        setValue(formatted);

        // Update date if needed
        if (startDateStr && days !== 0) {
          const baseDate = new Date(startDateStr);
          baseDate.setDate(baseDate.getDate() + days);
          const newDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
          setDateValue(newDateStr);
        } else if (startDateStr && !dateValue) {
          setDateValue(startDateStr);
        }
      }
    };

    if (mode === 'log') {
      return (
        <div className="flex items-center gap-1">
          <DateInput value={dateValue} onChange={setDateValue} placeholder="日付" />
          <TimeInput value={value} onChange={setValue} showHours={true} placeholder={placeholder} />
          <button
            onClick={handleGetCurrent}
            title="現在の時間を取得"
            className="text-gray-400 hover:text-white"
          >
            <Pipette size={12} />
          </button>
        </div>
      );
    } else if (mode === 'video' || mode === 'duration') {
      return (
        <div className="flex items-center gap-1">
          <TimeInput
            value={value}
            onChange={setValue}
            showHours={false}
            placeholder={placeholder}
          />
          {mode === 'video' && (
            <button
              onClick={handleGetCurrent}
              title="現在の時間を取得"
              className="text-gray-400 hover:text-white"
            >
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
        <div className="flex flex-col gap-1">
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
          </div>
          <div className="ml-10">
            {renderTimeInput(
              cmStartMode,
              cmStartInput,
              setCmStartInput,
              cmStartDateInput,
              setCmStartDateInput,
              cmStartMode === 'log' ? '00:00:00' : '00:00'
            )}
          </div>
        </div>

        {/* End Time Row */}
        <div className="flex flex-col gap-1">
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
          </div>
          <div className="ml-10">
            {renderTimeInput(
              cmEndMode,
              cmEndInput,
              setCmEndInput,
              cmEndDateInput,
              setCmEndDateInput,
              cmEndMode === 'log' ? '00:00:00' : '00:00'
            )}
          </div>
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
                  startTimeStr,
                  cmStartDateInput,
                  cmEndDateInput,
                  startDateStr
                );
                setEditingCmIndex(null);
                setCmStartInput('');
                setCmEndInput('');
                setCmStartDateInput('');
                setCmEndDateInput('');
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
                setCmStartDateInput('');
                setCmEndDateInput('');
              }}
              className="bg-gray-600 hover:bg-gray-500 text-white p-1.5 rounded text-xs flex items-center justify-center"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              addCmRangeSmart(
                cmStartMode,
                cmStartInput,
                cmEndMode,
                cmEndInput,
                startTimeStr,
                cmStartDateInput,
                cmEndDateInput,
                startDateStr
              )
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

            // logicalStart is now directly available from the range object (calculated in useCMSystem)
            // Fallback to calculation if undefined (though useCMSystem should ensure it's there)
            const logicalStart =
              range.logicalStart !== undefined ? range.logicalStart : vStart + accumulatedCmTime;
            const logicalEnd = logicalStart + cmDuration;

            // Format label with date if available
            const startLabel = range.startDateStr
              ? `${range.startDateStr.slice(5)} ${range.labelStart}`
              : range.labelStart;
            const endLabel = range.endDateStr
              ? `${range.endDateStr.slice(5)} ${range.labelEnd}`
              : range.labelEnd;

            return (
              <div
                key={i}
                className={`flex flex-col bg-gray-900 p-1.5 rounded text-xs text-gray-400 gap-1 ${editingCmIndex === i ? 'border border-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span>{`ログ: ${startLabel} ~ ${endLabel}`}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCmIndex(i);
                        setCmStartMode('log');
                        setCmEndMode('log');
                        setCmStartInput(padTime(range.labelStart));
                        setCmEndInput(padTime(range.labelEnd));
                        setCmStartDateInput(range.startDateStr || startDateStr || '');
                        setCmEndDateInput(range.endDateStr || startDateStr || '');
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
