// DanmakuPlayer Helper - Content Script
// =====================================
// Bridges communication between Extension Background and Web App

/* global chrome */

/**
 * Check if URL is a video/stream URL
 */
function isVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(".m3u8") ||
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mkv") ||
    lower.includes("application/x-mpegurl") ||
    lower.includes("application/vnd.apple.mpegurl")
  );
}

/**
 * Extract video URLs from DOM elements
 */
function extractVideoUrlsFromDom() {
  const urls = new Set();

  // 1. <video> src attribute (including blob: URLs)
  document.querySelectorAll("video[src]").forEach((el) => {
    const src = el.src;
    if (src) {
      // Add blob: URLs or video URLs
      if (src.startsWith("blob:") || isVideoUrl(src)) {
        urls.add(src);
      }
    }
  });

  // 2. <source> src attribute inside <video>
  document.querySelectorAll("video source[src]").forEach((el) => {
    if (isVideoUrl(el.src)) urls.add(el.src);
  });

  // 3. <a> href with video extensions
  document
    .querySelectorAll('a[href*=".m3u8"], a[href*=".mp4"]')
    .forEach((el) => {
      if (isVideoUrl(el.href)) urls.add(el.href);
    });

  // 4. <iframe> with video in src
  document.querySelectorAll("iframe[src]").forEach((el) => {
    if (isVideoUrl(el.src)) urls.add(el.src);
  });

  // 5. data-* attributes containing video URLs
  document
    .querySelectorAll("[data-src], [data-url], [data-video], [data-stream]")
    .forEach((el) => {
      ["data-src", "data-url", "data-video", "data-stream"].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val && isVideoUrl(val)) urls.add(val);
      });
    });

  // 6. Check inline scripts for m3u8 URLs (basic regex)
  document.querySelectorAll("script:not([src])").forEach((script) => {
    const matches = script.textContent.match(
      /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi
    );
    if (matches) {
      matches.forEach((url) => urls.add(url));
    }
  });

  return Array.from(urls);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPORT_URL") {
    console.log("DanmakuPlayer Helper: Received import URL:", message.url);

    // Dispatch event to the page window (DanmakuPlayer App listens for this)
    window.postMessage(
      {
        type: "DANMAKU_IMPORT",
        url: message.url,
        source: "danmaku-player-helper",
      },
      "*"
    );

    sendResponse({ received: true });
  } else if (message.type === "SCAN_DOM") {
    // Scan DOM for video URLs
    const urls = extractVideoUrlsFromDom();
    console.log("DanmakuPlayer Helper: DOM scan found", urls.length, "URLs");
    sendResponse({ urls });
  }
  return true; // Keep message channel open
});

// Listen for fetch requests from web page (for 5ch URLs that need extension fetch)
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "DANMAKU_FETCH_REQUEST") return;

  const { requestId, url } = event.data;
  console.log("DanmakuPlayer Helper: Fetch request for:", url);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_URL",
      url: url,
    });

    if (response?.error) {
      window.postMessage(
        {
          type: "DANMAKU_FETCH_RESPONSE",
          requestId,
          error: response.error,
        },
        "*"
      );
    } else if (response?.data) {
      window.postMessage(
        {
          type: "DANMAKU_FETCH_RESPONSE",
          requestId,
          data: response.data,
          contentType: response.contentType,
        },
        "*"
      );
    } else {
      window.postMessage(
        {
          type: "DANMAKU_FETCH_RESPONSE",
          requestId,
          error: "No data received from extension",
        },
        "*"
      );
    }
  } catch (error) {
    window.postMessage(
      {
        type: "DANMAKU_FETCH_RESPONSE",
        requestId,
        error: error.message,
      },
      "*"
    );
  }
});

// Initial DOM scan on load
function sendInitialScan() {
  const urls = extractVideoUrlsFromDom();
  if (urls.length > 0) {
    chrome.runtime
      .sendMessage({
        type: "DOM_URLS_FOUND",
        urls,
      })
      .catch(() => {
        // Ignore errors
      });
  }
}

// Scan immediately and also after DOM is fully loaded
sendInitialScan();
if (document.readyState !== "complete") {
  window.addEventListener("load", sendInitialScan);
}

// MutationObserver for dynamically added content
const observer = new MutationObserver(() => {
  sendInitialScan();
});
observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});

// Optional: Notify background that content script is ready
chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" }).catch(() => {
  // Ignore errors if background is not listening
});

console.log("DanmakuPlayer Helper: Content script loaded with DOM scanning");
