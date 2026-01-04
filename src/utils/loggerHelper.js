// Reset logs on page load
fetch('/__reset_logs', { method: 'POST' }).catch(() => {});

// Limit the number of errors sent to prevent flooding
const MAX_ERRORS_PER_SESSION = 50;
let errorCount = 0;

const sendError = (errorData) => {
  if (errorCount >= MAX_ERRORS_PER_SESSION) return;
  errorCount++;

  const payload = {
    timestamp: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    ...errorData,
  };

  // Use fetch with keepalive to ensure delivery even if the page is unloading
  // But be careful with size limits.
  try {
    fetch('/__error_log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Fallback: Original console.error (we can't log here or we loop if not careful,
      // but we are inside the sender, so just ignore or use warning)
      // console.warn('Failed to send error log', err);
    });
  } catch {
    // Ignore errors during sending
  }
};

// 1. Hook console.error
const originalConsoleError = console.error;
console.error = (...args) => {
  // Call the original function so it still shows up in the browser console
  originalConsoleError.apply(console, args);

  // Format arguments into a string message
  const message = args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');

  sendError({
    type: 'console.error',
    message: message,
  });
};

// 2. Hook window.onerror (Uncaught exceptions)
window.onerror = (message, source, lineno, colno, error) => {
  sendError({
    type: 'window.onerror',
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    stack: error ? error.stack : null,
  });
  // Return false to let the default handler run (print to console)
  return false;
};

// 3. Hook unhandledrejection (Promise rejections)
window.onunhandledrejection = (event) => {
  sendError({
    type: 'unhandledrejection',
    message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : null,
  });
};

console.log('[Logger] Browser error logging initialized.');
