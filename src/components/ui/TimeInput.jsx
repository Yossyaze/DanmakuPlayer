import { Clock, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// TimeInput component with linear character editing
// Supports HH:MM:SS or MM:SS based on showHours
const TimeInput = ({ value, onChange, showHours = false }) => {
  const [isFocused, setIsFocused] = useState(false);

  // Local state for display
  const [localValue, setLocalValue] = useState(value || '');
  // Ref to track latest localValue
  const valueRef = useRef(value || '');

  // Cursor Index: 0 to (showHours ? 5 : 3)
  const [cursorIndex, setCursorIndex] = useState(0);

  const inputRef = useRef(null);

  // When format changes (e.g. toggling hours), reset cursor
  useEffect(() => {
    // eslint-disable-next-line
    setCursorIndex(0);
  }, [showHours]);

  // Sync local state when value prop changes
  useEffect(() => {
    // eslint-disable-next-line
    setLocalValue(value || '');
    valueRef.current = value || '';
  }, [value]);

  // Helper to update local
  const updateLocal = (newVal) => {
    setLocalValue(newVal);
    valueRef.current = newVal;
  };

  // --- Parsing & Formatting Helpers ---

  // Converts value "HH:MM:SS" or "MM:SS" to flat char array
  // Output length is always 6 (HHMMSS) or 4 (MMSS)
  const getValueArray = (val) => {
    const cleanFn = (v) => (v || '').replace(/:/g, '');
    let raw = cleanFn(val);

    // Length target
    const targetLen = showHours ? 6 : 4;

    // Pad with placeholders
    raw = raw.padEnd(targetLen, '-');

    const arr = raw.split('').slice(0, targetLen);
    for (let i = 0; i < targetLen; i++) {
      if (!arr[i] || arr[i] === ' ') arr[i] = '-';
    }
    return arr;
  };

  const arrayToValue = (arr) => {
    if (showHours) {
      // HH:MM:SS
      const h = arr.slice(0, 2).join('');
      const m = arr.slice(2, 4).join('');
      const s = arr.slice(4, 6).join('');
      return `${h}:${m}:${s}`;
    } else {
      // MM:SS
      const m = arr.slice(0, 2).join('');
      const s = arr.slice(2, 4).join('');
      return `${m}:${s}`;
    }
  };

  // --- Event Handlers ---

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Commit on blur
    onChange(valueRef.current);

    setIsFocused(false);
    setCursorIndex(0);
  };

  // Clamping helper for Time
  const getClampedTimeArray = (arr, index, char) => {
    const newArr = [...arr];
    newArr[index] = char;
    let step = 1;

    // Indices for HH:MM:SS (showHours=true) -> HH(0,1) MM(2,3) SS(4,5)
    // Indices for MM:SS (showHours=false)    -> MM(0,1) SS(2,3)

    // Determine logical segment
    let isHourTens = false;
    let isMinTens = false;
    let isSecTens = false;

    let hourIndices = [];
    let minIndices = [];
    let secIndices = [];

    if (showHours) {
      if (index === 0) isHourTens = true;
      if (index === 2) isMinTens = true;
      if (index === 4) isSecTens = true;

      hourIndices = [0, 1];
      minIndices = [2, 3];
      secIndices = [4, 5];
    } else {
      if (index === 0) isMinTens = true;
      if (index === 2) isSecTens = true;
      minIndices = [0, 1];
      secIndices = [2, 3];
    }

    // Hour Clamp (0-23)
    if (showHours && hourIndices.includes(index)) {
      if (isHourTens) {
        const val = newArr[index];
        // If >= 3 -> Clamp to 23
        if (val >= '3' && val <= '9') {
          newArr[hourIndices[0]] = '2';
          newArr[hourIndices[1]] = '3';
          step = 2;
        }
      }

      if (newArr[hourIndices[0]] !== '-' && newArr[hourIndices[1]] !== '-') {
        const h = parseInt(newArr[hourIndices[0]] + newArr[hourIndices[1]], 10);
        if (h > 23) {
          newArr[hourIndices[0]] = '2';
          newArr[hourIndices[1]] = '3';
        }
      }
    }

    // Minute Clamp (0-59)
    if (minIndices.includes(index)) {
      // Tens digit check
      if (isMinTens) {
        const val = newArr[index];
        // If >= 6 -> Clamp to 59
        if (val >= '6' && val <= '9') {
          newArr[minIndices[0]] = '5';
          newArr[minIndices[1]] = '9';
          step = 2;
        }
      }
      // Total check (mostly covered by tens clamp, but good for completeness if editing ones)
      if (newArr[minIndices[0]] !== '-' && newArr[minIndices[1]] !== '-') {
        const m = parseInt(newArr[minIndices[0]] + newArr[minIndices[1]], 10);
        if (m > 59) {
          newArr[minIndices[0]] = '5';
          newArr[minIndices[1]] = '9';
        }
      }
    }

    // Second Clamp (0-59)
    if (secIndices.includes(index)) {
      if (isSecTens) {
        const val = newArr[index];
        if (val >= '6' && val <= '9') {
          newArr[secIndices[0]] = '5';
          newArr[secIndices[1]] = '9';
          step = 2;
        }
      }
      if (newArr[secIndices[0]] !== '-' && newArr[secIndices[1]] !== '-') {
        const s = parseInt(newArr[secIndices[0]] + newArr[secIndices[1]], 10);
        if (s > 59) {
          newArr[secIndices[0]] = '5';
          newArr[secIndices[1]] = '9';
        }
      }
    }

    return { arr: newArr, step };
  };

  const handleMouseDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();

    const isAlreadyFocused = document.activeElement === inputRef.current;

    inputRef.current?.focus();

    if (isAlreadyFocused) {
      setCursorIndex(index);
    } else {
      setCursorIndex(0);
    }
  };

  const handleKeyDown = (e) => {
    // If IME is processing, let it happen so we can catch the result in onChange
    if (e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229) {
      return;
    }

    if (e.key === 'Tab') return;
    if (e.key === 'Enter') {
      inputRef.current?.blur();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const isDigit = e.key >= '0' && e.key <= '9';
    const isBackspace = e.key === 'Backspace';
    const isDelete = e.key === 'Delete';
    const isArrowLeft = e.key === 'ArrowLeft';
    const isArrowRight = e.key === 'ArrowRight';

    const maxIndex = showHours ? 5 : 3;

    if (isArrowLeft) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (isArrowRight) {
      setCursorIndex((prev) => Math.min(maxIndex, prev + 1));
      return;
    }

    if (isDigit) {
      const { arr, step } = getClampedTimeArray(getValueArray(localValue), cursorIndex, e.key);

      const newVal = arrayToValue(arr);
      updateLocal(newVal);

      // Advance cursor
      const nextCursor = cursorIndex + step;
      if (nextCursor <= maxIndex) {
        setCursorIndex(nextCursor);
      } else {
        setCursorIndex(Math.min(maxIndex, nextCursor));
        inputRef.current?.blur();
      }
    } else if (isBackspace) {
      const arr = getValueArray(localValue);

      if (cursorIndex > 0) {
        const newIdx = cursorIndex - 1;
        arr[newIdx] = '-';
        setCursorIndex(newIdx);
        updateLocal(arrayToValue(arr));
      } else {
        arr[0] = '-';
        updateLocal(arrayToValue(arr));
      }
    } else if (isDelete) {
      const arr = getValueArray(localValue);
      arr[cursorIndex] = '-';
      updateLocal(arrayToValue(arr));
    }
  };

  const handleHiddenInputChange = (e) => {
    const inputVal = e.target.value;
    if (!inputVal) return;

    // Normalize full-width numbers to half-width
    const normalized = inputVal.replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );

    // Take the last character
    const char = normalized.slice(-1);
    const maxIndex = showHours ? 5 : 3;

    if (char >= '0' && char <= '9') {
      const { arr, step } = getClampedTimeArray(getValueArray(localValue), cursorIndex, char);

      updateLocal(arrayToValue(arr));

      const nextCursor = cursorIndex + step;
      if (nextCursor <= maxIndex) {
        setCursorIndex(nextCursor);
      } else {
        setCursorIndex(Math.min(maxIndex, nextCursor));
        inputRef.current?.blur();
      }
    }

    // Clear input so we can capture next char
    e.target.value = '';
  };

  const handleClear = (e) => {
    e.stopPropagation();
    updateLocal(''); // Clear local only on click
    setCursorIndex(0);
    // Not blurring means no commit technically, but usually clear is 'intermediate'?
    // If user clears and doesn't type, then clicks away -> commit empty.
    // If user clears and types -> commits new value.
    // Seems correct for "edit end" requirement.
  };

  // --- Render Helpers ---

  const renderChar = (char, index) => {
    const isCursor = isFocused && cursorIndex === index;

    let displayChar = char;

    let className = 'w-[9px] text-center inline-block cursor-pointer select-none';
    if (isCursor) {
      className += ' bg-blue-500 text-white animate-pulse';
    } else {
      className += ' text-white';
    }

    return (
      <span key={index} onMouseDown={(e) => handleMouseDown(e, index)} className={className}>
        {displayChar}
      </span>
    );
  };

  const valArray = getValueArray(localValue);

  // Render logic based on showHours
  // HH:MM:SS -> indices 0,1 : 2,3 : 4,5
  // MM:SS    -> indices 0,1 : 2,3

  return (
    <div
      className={`bg-gray-700 rounded pl-2 pr-6 py-1 border flex items-center cursor-text relative group h-[30px] ${
        isFocused ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-600'
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      <Clock size={14} className="text-gray-400 mr-1 pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleHiddenInputChange}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        inputMode="numeric"
      />

      <div className="font-mono text-sm flex items-center justify-center gap-px">
        {showHours && (
          <>
            {valArray.slice(0, 2).map((c, i) => renderChar(c, i))}
            <span className="text-gray-400 select-none">:</span>
            {valArray.slice(2, 4).map((c, i) => renderChar(c, i + 2))}
            <span className="text-gray-400 select-none">:</span>
            {valArray.slice(4, 6).map((c, i) => renderChar(c, i + 4))}
          </>
        )}
        {!showHours && (
          <>
            {valArray.slice(0, 2).map((c, i) => renderChar(c, i))}
            <span className="text-gray-400 select-none">:</span>
            {valArray.slice(2, 4).map((c, i) => renderChar(c, i + 2))}
          </>
        )}
      </div>

      {(value || isFocused) && (
        <button
          onClick={handleClear}
          className="absolute right-1 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          tabIndex={-1}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};

export default TimeInput;
