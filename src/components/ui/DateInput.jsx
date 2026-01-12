import { Calendar, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// DateInput component with linear character editing
const DateInput = ({ value, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);

  // Local state for display
  const [localValue, setLocalValue] = useState(value || '');
  // Ref to track latest localValue for synchronous access in handleBlur
  const valueRef = useRef(value || '');

  // Cursor Position: 0-7 (YYYYMMDD)
  const [cursorIndex, setCursorIndex] = useState(0);

  const inputRef = useRef(null);
  const calendarRef = useRef(null);

  // Sync local state when external value changes (only if not focused?)
  // Actually, strictly syncing is safer to avoid drift if parent overrides.
  // But strictly syncing while typing might be annoying if parent reformats.
  // Given we control the format, syncing on prop change is fine.
  useEffect(() => {
    // eslint-disable-next-line
    setLocalValue(value || '');
    valueRef.current = value || '';
  }, [value]);

  // Helper to update local value and ref
  const updateLocal = (newVal) => {
    setLocalValue(newVal);
    valueRef.current = newVal;
  };

  // --- Parsing & Formatting Helpers ---

  // Converts value string (YYYY-MM-DD) to flat array of 8 chars
  const getValueArray = (val) => {
    const raw = (val || '').replace(/[-/]/g, '').padEnd(8, '-');
    const arr = raw.split('').slice(0, 8);
    // Ensure placeholders for empty spots
    for (let i = 0; i < 8; i++) {
      if (!arr[i] || arr[i] === ' ') arr[i] = '-';
    }
    return arr;
  };

  // Converts flat array back to YYYY-MM-DD string
  const arrayToValue = (arr) => {
    const y = arr.slice(0, 4).join('');
    const m = arr.slice(4, 6).join('');
    const d = arr.slice(6, 8).join('');
    return `${y}-${m}-${d}`;
  };

  // Helper to determine max days in a month (handles leap years)
  const getDaysInMonth = (yArr, mArr) => {
    const yStr = yArr.join('');
    const mStr = mArr.join('');

    // If Month not fully entered, we can't be strict yet.
    // But if first char is '0' or '1', we might guess?
    // Safest: if invalid/incomplete, return 31 (allow max typing).
    // However, user specifically asked for dynamic limits.
    // Let's rely on valid parsing.

    if (yStr.includes('-') || mStr.includes('-')) {
      // If only month is '02', we might want to default to 29?
      // If Y is unknown but M is 02, safe max is 29.
      // If M is 04, 06, 09, 11, max is 30.
      // If M is 01, 03, ... max is 31.

      if (!mStr.includes('-')) {
        const m = parseInt(mStr, 10);
        if (m === 2) return 29; // Allow 29 just in case it becomes leap year
        if ([4, 6, 9, 11].includes(m)) return 30;
        return 31;
      }
      return 31;
    }

    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);

    if (m === 0 || m > 12) return 31; // Should correspond to clamped month logic

    // Standard JS: Day 0 of next month gives last day of current month
    return new Date(y, m, 0).getDate();
  };

  const getClampedDateArray = (arr, index, char) => {
    const newArr = [...arr];
    newArr[index] = char;
    let step = 1;

    // --- 1. Clamp Month First ---
    // Month: indices 4, 5
    if (index === 4 || index === 5) {
      if (index === 4) {
        const m1 = newArr[4];
        // If M1 > 1 (2-9) -> Clamp to 12
        if (m1 >= '2' && m1 <= '9') {
          newArr[4] = '1';
          newArr[5] = '2';
          step = 2;
        }
      }

      if (newArr[4] !== '-' && newArr[5] !== '-') {
        const val = parseInt(newArr[4] + newArr[5], 10);
        if (val > 12) {
          newArr[4] = '1';
          newArr[5] = '2';
        } else if (val === 0) {
          // 00 -> 01? Or keep 00 invalid?
          // If user inputs 00, maybe clamp to 01?
          // For now, simple clamping to max. Min clamping is tricky while typing "0...".
        }
      }
    }

    // --- 2. Clamp Day Based on Year & Month ---
    // Whether we edited Year, Month, or Day, we check Day validity

    // Extract Year (0-3), Month (4-5) for calculation
    const currentY = newArr.slice(0, 4);
    const currentM = newArr.slice(4, 6);

    const maxDays = getDaysInMonth(currentY, currentM);

    // If editing Day directly...
    if (index === 6 || index === 7) {
      if (index === 6) {
        const d1 = newArr[6];
        // Basic decimal checks
        // If d1 > 3 -> clamp to maxDays (or 3x)
        // But maxDays could be 28, 29, 30, 31.
        // If maxDays is 29, and user Types '3' -> clamp to '29'? Or '2'?
        // Standard convenience: if first digit > max first digit, assume user meant max day.

        const maxTens = Math.floor(maxDays / 10).toString();
        if (d1 > maxTens) {
          const maxStr = maxDays.toString();
          newArr[6] = maxStr[0];
          newArr[7] = maxStr[1];
          step = 2;
        }
      }
    }

    // Final Check: If Day exists, clamp to maxDays
    // This catches:
    // 1. User typed Day > maxDays
    // 2. User changed Year/Month such that existing Day > maxDays
    if (newArr[6] !== '-' && newArr[7] !== '-') {
      const currentD = parseInt(newArr[6] + newArr[7], 10);
      if (currentD > maxDays) {
        const maxStr = maxDays.toString();
        newArr[6] = maxStr[0];
        newArr[7] = maxStr[1];
      }
      if (currentD === 0) {
        // newArr[6] = '0'; newArr[7] = '1'; // Optional min clamping
      }
    }

    return { arr: newArr, step };
  };

  // --- Event Handlers ---

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    if (calendarRef.current && calendarRef.current.contains(e.relatedTarget)) {
      return;
    }

    // Commit on blur
    onChange(valueRef.current);

    setIsFocused(false);
    // Reset cursor to 0 on blur for consistent re-entry
    setCursorIndex(0);
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

    if (isArrowLeft) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (isArrowRight) {
      setCursorIndex((prev) => Math.min(7, prev + 1));
      return;
    }

    if (isDigit) {
      const { arr, step } = getClampedDateArray(getValueArray(localValue), cursorIndex, e.key);

      const newVal = arrayToValue(arr);
      updateLocal(newVal);

      // Advance cursor
      const nextCursor = cursorIndex + step;
      if (nextCursor <= 7) {
        setCursorIndex(nextCursor);
      } else {
        // Finished
        // Ensure we don't go out of bounds? nextCursor could be 8
        setCursorIndex(Math.min(7, nextCursor));
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
        // At start, just clear current
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

    if (char >= '0' && char <= '9') {
      const { arr, step } = getClampedDateArray(getValueArray(localValue), cursorIndex, char);

      const newVal = arrayToValue(arr);
      updateLocal(newVal);

      const nextCursor = cursorIndex + step;
      if (nextCursor <= 7) {
        setCursorIndex(nextCursor);
      } else {
        setCursorIndex(Math.min(7, nextCursor));
        inputRef.current?.blur();
      }
    }

    // Clear input so we can capture next char
    e.target.value = '';
  };

  const handleCalendarChange = (e) => {
    // Calendar pick acts as immediate commit
    const newVal = e.target.value;
    updateLocal(newVal);
    onChange(newVal);
    setCursorIndex(0);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    // Clearing clears local -> if user leaves, commits empty.
    updateLocal('');
    // Keep focus or not? Usually X button might want to keep focus to let user re-type?
    // But if user wants to just clear, they might click X.
    // If we don't commit, 'X' visually clears but 'value' prop is still old until blur.
    // Let's keep it simple: just update local. Commit happens on blur.
    setCursorIndex(0);
  };

  // --- Render Helpers ---

  const renderChar = (char, index) => {
    const isCursor = isFocused && cursorIndex === index;

    let displayChar = char;

    let className = 'w-[9px] text-center inline-block cursor-pointer select-none';
    if (isCursor) {
      // Block cursor style
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

  return (
    <div
      className={`bg-gray-700 rounded pl-2 pr-6 py-1 border flex items-center cursor-text relative group h-[30px] ${
        isFocused ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-600'
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={calendarRef} className="relative mr-1">
        <input
          type="date"
          value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
          onChange={handleCalendarChange}
          className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer"
          tabIndex={-1}
        />
        <Calendar
          size={14}
          className="text-gray-400 hover:text-white transition-colors pointer-events-none"
        />
      </div>

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
        {/* Year */}
        {valArray.slice(0, 4).map((c, i) => renderChar(c, i))}
        <span className="text-gray-400 select-none">/</span>
        {/* Month */}
        {valArray.slice(4, 6).map((c, i) => renderChar(c, i + 4))}
        <span className="text-gray-400 select-none">/</span>
        {/* Day */}
        {valArray.slice(6, 8).map((c, i) => renderChar(c, i + 6))}
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

export default DateInput;
