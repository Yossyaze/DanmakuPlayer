import { Calendar, X } from 'lucide-react';
import React, { useState, useRef } from 'react';

// DateInput component with segment-based editing (similar to TimeInput)
// Supports both manual digit input and calendar picker
const DateInput = ({ value, onChange, placeholder = 'YYYY/MM/DD' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [editDigits, setEditDigits] = useState('');
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  // Segment editing: 'y', 'm', 'd', or null
  const [editingSegment, setEditingSegment] = useState(null);
  const [segmentInput, setSegmentInput] = useState('');
  const inputRef = useRef(null);
  const calendarRef = useRef(null);

  // Parse value into segments (YYYY-MM-DD)
  const parseValue = (val) => {
    if (!val) return { y: '----', m: '--', d: '--' };
    // Support both - and / separators
    const parts = val.split(/[-/]/);
    if (parts.length === 3) {
      return { y: parts[0], m: parts[1], d: parts[2] };
    }
    return { y: '----', m: '--', d: '--' };
  };

  const getDigits = (val) => {
    if (!val) return '';
    return val.replace(/[^\d]/g, '');
  };

  const formatForCommit = (rawDigits) => {
    if (!rawDigits || rawDigits.length < 4) return '';
    const padded = rawDigits.padStart(8, '0');
    const y = padded.slice(0, -4) || new Date().getFullYear().toString();
    const m = padded.slice(-4, -2);
    const d = padded.slice(-2);
    return `${y.padStart(4, '0')}-${m}-${d}`;
  };

  const formatForDisplay = (rawDigits) => {
    const padded = rawDigits.padStart(8, '-');
    const y = padded.slice(0, -4);
    const m = padded.slice(-4, -2);
    const d = padded.slice(-2);
    return `${y}/${m}/${d}`;
  };

  // Commit segment edit to value
  const commitSegment = () => {
    if (!editingSegment) return;

    const segments = parseValue(value);

    if (editingSegment === 'y') {
      segments.y = (segmentInput || new Date().getFullYear().toString()).padStart(4, '0');
    } else if (editingSegment === 'm') {
      const monthNum = Math.min(12, Math.max(1, parseInt(segmentInput) || 1));
      segments.m = String(monthNum).padStart(2, '0');
    } else if (editingSegment === 'd') {
      const dayNum = Math.min(31, Math.max(1, parseInt(segmentInput) || 1));
      segments.d = String(dayNum).padStart(2, '0');
    }

    // Only commit if we have a valid year
    if (segments.y && segments.y !== '----') {
      onChange(`${segments.y}-${segments.m}-${segments.d}`);
    }

    setEditingSegment(null);
    setSegmentInput('');
  };

  const handleFocus = () => {
    setIsFocused(true);
    setHasStartedTyping(false);
    setEditDigits(getDigits(value));
  };

  const handleBlur = (e) => {
    // Don't blur if clicking calendar button
    if (calendarRef.current && calendarRef.current.contains(e.relatedTarget)) {
      return;
    }

    if (editingSegment) {
      commitSegment();
    } else if (hasStartedTyping) {
      onChange(formatForCommit(editDigits));
    }
    setIsFocused(false);
    setHasStartedTyping(false);
    setEditingSegment(null);
  };

  const handleSegmentClick = (seg) => (e) => {
    e.stopPropagation();

    if (editingSegment && editingSegment !== seg) {
      commitSegment();
    }

    setEditingSegment(seg);
    const segments = parseValue(value);
    setSegmentInput(segments[seg].replace(/-/g, ''));
    setHasStartedTyping(false);

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.blur();
      }
      return;
    }

    const isDigit = e.key >= '0' && e.key <= '9';
    const isBackspace = e.key === 'Backspace' || e.key === 'Delete';

    if (!isDigit && !isBackspace) return;
    e.preventDefault();

    if (editingSegment) {
      // Segment editing mode
      let newVal = segmentInput;
      const maxLen = editingSegment === 'y' ? 4 : 2;

      if (isDigit) {
        if (!hasStartedTyping) {
          setHasStartedTyping(true);
          newVal = e.key;
        } else {
          newVal = segmentInput + e.key;
          if (newVal.length > maxLen) {
            newVal = newVal.slice(-maxLen);
          }
        }
      } else if (isBackspace) {
        newVal = segmentInput.slice(0, -1);
      }
      setSegmentInput(newVal);
    } else {
      // Full edit mode
      let newDigits = editDigits;
      if (isDigit) {
        if (!hasStartedTyping) {
          setHasStartedTyping(true);
          newDigits = e.key;
        } else {
          newDigits = editDigits + e.key;
        }
      } else if (isBackspace) {
        newDigits = editDigits.slice(0, -1);
        setHasStartedTyping(true);
      }
      if (newDigits.length <= 8) {
        setEditDigits(newDigits);
      }
    }
  };

  const handleCalendarChange = (e) => {
    onChange(e.target.value);
    setEditingSegment(null);
    setSegmentInput('');
    setHasStartedTyping(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setEditDigits('');
    setSegmentInput('');
    setEditingSegment(null);
  };

  // Render
  const segments = parseValue(value);

  const renderSeg = (seg, width) => {
    const isEditing = editingSegment === seg;
    const maxLen = seg === 'y' ? 4 : 2;
    const display = isEditing ? (segmentInput || '').padStart(maxLen, '-') : segments[seg];

    return (
      <span
        key={seg}
        onClick={handleSegmentClick(seg)}
        className={`cursor-pointer rounded px-0.5 ${width} text-center ${
          isEditing
            ? 'bg-blue-500 text-white'
            : isFocused
              ? 'hover:bg-gray-600 text-blue-400'
              : 'text-white'
        }`}
      >
        {display}
      </span>
    );
  };

  return (
    <div
      className={`bg-gray-700 rounded px-2 py-1 border flex items-center cursor-text relative group ${
        isFocused ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-600'
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        type="text"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        inputMode="numeric"
      />

      {/* Display area */}
      <div className="font-mono text-sm select-none flex-1">
        {!value && !isFocused ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : isFocused && hasStartedTyping && !editingSegment ? (
          <span className="text-blue-400">{formatForDisplay(editDigits)}</span>
        ) : (
          <span className="flex items-center gap-0">
            {renderSeg('y', 'w-10')}
            <span className={isFocused ? 'text-blue-400' : 'text-white'}>/</span>
            {renderSeg('m', 'w-6')}
            <span className={isFocused ? 'text-blue-400' : 'text-white'}>/</span>
            {renderSeg('d', 'w-6')}
          </span>
        )}
      </div>

      {/* Calendar button */}
      <div ref={calendarRef} className="relative ml-1">
        <input
          type="date"
          value={value || ''}
          onChange={handleCalendarChange}
          className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer"
          tabIndex={-1}
        />
        <Calendar
          size={14}
          className="text-gray-400 hover:text-white transition-colors pointer-events-none"
        />
      </div>

      {/* Clear button */}
      {value && (
        <button
          onClick={handleClear}
          className="ml-1 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          tabIndex={-1}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};

export default DateInput;
