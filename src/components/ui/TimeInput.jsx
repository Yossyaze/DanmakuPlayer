import React, { useState } from 'react';
import { X } from 'lucide-react';

// Helper Component for Calculator-Style Time Input
const TimeInput = ({ value, onChange, showHours = false, placeholder = "00:00" }) => {
    const [isFocused, setIsFocused] = useState(false);
    // We keep local digits state only while focused to allow "raw" editing view
    const [editDigits, setEditDigits] = useState("");

    // Helper to extract digits from formatted string
    const getDigits = (val) => {
        if (!val) return "";
        return val.replace(/[^\d]/g, '');
    };

    // Initialize editDigits on focus
    // Initialize editDigits on focus
    const handleFocus = () => {
        setIsFocused(true);
        // Clear value on focus as requested
        setEditDigits("");
    };

    // Helper to format digits for DISPLAY (during edit)
    // Shows mask with hyphens: --:-- or --:--:--
    const formatForDisplay = (rawDigits) => {
        // Determine mode: use hours if showHours is true OR if we have enough digits
        const useHours = showHours || rawDigits.length > 4;
        const totalDigits = useHours ? 6 : 4;

        // Pad with hyphens to represent empty slots
        const padded = rawDigits.padStart(totalDigits, '-');

        if (useHours) {
            // H:MM:SS
            const s = padded.slice(-2);
            const m = padded.slice(-4, -2);
            const h = padded.slice(0, -4);
            return `${h}:${m}:${s}`;
        } else {
            // MM:SS
            const s = padded.slice(-2);
            const m = padded.slice(0, -2);
            return `${m}:${s}`;
        }
    };

    // Helper to format digits for COMMIT (on blur)
    // Full padding: 123 -> 01:23 (or 00:01:23)
    const formatForCommit = (rawDigits) => {
        if (!rawDigits) return ""; // Or return "00:00"?

        let padded = rawDigits;

        if (showHours) {
            // Force HH:MM:SS
            padded = rawDigits.padStart(6, '0');
            const s = padded.slice(-2);
            const m = padded.slice(-4, -2);
            const h = padded.slice(0, -4);
            // Ensure h is at least 0 if empty? padStart handles it.
            // But we might want to allow > 99 hours?
            // If rawDigits is longer than 6, we shouldn't truncate hours.
            if (rawDigits.length > 6) {
                const s = rawDigits.slice(-2);
                const m = rawDigits.slice(-4, -2);
                const h = rawDigits.slice(0, -4);
                return `${h}:${m}:${s}`;
            }
            return `${parseInt(h)}:${m}:${s}`; // parseInt(h) to remove leading zero from hours if preferred, or keep it?
            // Standard is usually H:MM:SS or HH:MM:SS. Let's stick to what we had: H:MM:SS
        } else {
            // MM:SS default
            if (rawDigits.length > 4) {
                // Upgrade to H:MM:SS
                padded = rawDigits.padStart(6, '0');
                const s = padded.slice(-2);
                const m = padded.slice(-4, -2);
                const h = padded.slice(0, -4);
                return `${parseInt(h)}:${m}:${s}`;
            } else {
                padded = rawDigits.padStart(4, '0');
                const s = padded.slice(-2);
                const m = padded.slice(-4, -2);
                return `${m}:${s}`;
            }
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (editDigits === "") {
            onChange(""); // Keep empty if cleared
        } else {
            onChange(formatForCommit(editDigits));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            if (e.key === 'Enter') e.target.blur();
            return;
        }

        if ((e.key >= '0' && e.key <= '9') || e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            return;
        } else {
            return;
        }

        let newDigits = editDigits;

        if (e.key >= '0' && e.key <= '9') {
            newDigits = editDigits + e.key;
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            newDigits = editDigits.slice(0, -1);
        }

        if (newDigits.length > 9) return;
        setEditDigits(newDigits);
    };

    // What to show?
    // If focused: show formatted editDigits (minimal)
    // If not focused: show value (which is fully formatted by parent/commit)
    const displayValue = isFocused ? formatForDisplay(editDigits) : value;

    const handleClear = (e) => {
        e.stopPropagation(); // Prevent triggering focus on parent div
        setEditDigits("");
        onChange("");
        // If we want to keep focus, we can. If we want to blur, we can.
        // Usually 'X' keeps focus so user can re-type.
        if (!isFocused) {
            // If not focused, just clear.
        } else {
            // If focused, clear editDigits and keep focus
            // input ref needed?
        }
        // Actually, simple clear is enough.
    };

    return (
        <div
            className={`bg-gray-700 rounded px-2 py-1 border flex items-center cursor-text relative group ${isFocused ? 'border-blue-500' : 'border-gray-600'}`}
            onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
        >
            <input
                type="text"
                value={displayValue}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onChange={() => { }} // Controlled by onKeyDown
                placeholder={placeholder}
                className="bg-transparent text-white text-sm outline-none font-mono text-center w-24 placeholder-gray-500 caret-transparent cursor-pointer"
                inputMode="numeric"
                autoComplete="off"
            />
            {/* Clear Button - Visible on hover or when focused/has value */}
            {(value || isFocused) && (
                <button
                    onClick={handleClear}
                    className="absolute right-1 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="クリア"
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
};

export default TimeInput;
