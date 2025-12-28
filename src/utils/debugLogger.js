/**
 * Debug Logger - sends console logs to server for file logging
 * Uses the same /__error_log endpoint as loggerHelper.js
 */

let debugLogCount = 0;
const MAX_DEBUG_LOGS = 500;
let originalConsoleLog = null;
let isInitialized = false;

const sendDebugLog = (message) => {
    if (debugLogCount >= MAX_DEBUG_LOGS) return;
    debugLogCount++;

    const payload = {
        timestamp: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        type: 'debug',
        message: message
    };

    try {
        fetch('/__debug_log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => {});
    } catch {
        // Ignore
    }
};

export const initDebugLogger = () => {
    if (isInitialized) return;
    isInitialized = true;
    
    originalConsoleLog = console.log;
    
    // Override console.log to capture and send debug logs
    console.log = (...args) => {
        // Call original
        originalConsoleLog.apply(console, args);
        
        // Filter: only capture logs starting with [ (our debug logs)
        const firstArg = args[0];
        if (typeof firstArg === 'string' && firstArg.startsWith('[')) {
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            
            sendDebugLog(message);
        }
    };
    
    console.log('[DebugLogger] Debug logging initialized. Logs sent to /__debug_log');
};
