// DanmakuPlayer Helper - Background Service Worker
// ================================================

/* global chrome */

// App URLs (development and production)
const APP_URLS = {
  development: "http://localhost:5174/",
  production: "https://yossyaze.github.io/DanmakuPlayer/",
};

// Detected HLS streams per tab
const detectedStreams = new Map(); // tabId -> Set of m3u8 URLs

// Get all app URL patterns for tab query
const getAppUrlPatterns = () => Object.values(APP_URLS).map((url) => url + "*");

// Create Context Menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Main context menu
  chrome.contextMenus.create({
    id: "open-in-danmaku-player",
    title: "DanmakuPlayerで開く",
    contexts: ["link", "page"],
  });

  // HLS stream submenu (will be populated dynamically)
  chrome.contextMenus.create({
    id: "hls-streams",
    title: "HLSストリーム (検出中...)",
    contexts: ["page"],
    enabled: false,
  });

  console.log("DanmakuPlayer Helper: Context menus created");
});

// ========================================
// HLS (m3u8) Stream Detection
// ========================================

/**
 * Check if URL is an HLS stream
 */
function isHlsUrl(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes(".m3u8") ||
    lowerUrl.includes("application/x-mpegurl") ||
    lowerUrl.includes("application/vnd.apple.mpegurl")
  );
}

/**
 * Handle detected network request
 */
function onRequestCompleted(details) {
  if (!isHlsUrl(details.url)) return;

  const tabId = details.tabId;
  if (tabId < 0) return; // Ignore background requests

  // Store detected URL
  if (!detectedStreams.has(tabId)) {
    detectedStreams.set(tabId, new Set());
  }
  detectedStreams.get(tabId).add(details.url);

  console.log("DanmakuPlayer Helper: HLS detected:", details.url);

  // Update context menu
  updateHlsContextMenu(tabId);

  // Update badge
  updateBadge(tabId);
}

/**
 * Update the badge to show number of detected streams
 */
function updateBadge(tabId) {
  const streams = detectedStreams.get(tabId);
  const count = streams ? streams.size : 0;

  if (count > 0) {
    chrome.action.setBadgeText({ tabId, text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#3B82F6" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
}

/**
 * Update context menu with detected HLS streams
 */
async function updateHlsContextMenu(tabId) {
  const streams = detectedStreams.get(tabId);

  if (!streams || streams.size === 0) {
    chrome.contextMenus.update("hls-streams", {
      title: "HLSストリーム (未検出)",
      enabled: false,
    });
    return;
  }

  // Update parent menu
  chrome.contextMenus.update("hls-streams", {
    title: `HLSストリーム (${streams.size}件検出)`,
    enabled: true,
  });

  // Remove old child items
  const streamArray = Array.from(streams);
  for (let i = 0; i < 10; i++) {
    try {
      await chrome.contextMenus.remove(`hls-stream-${i}`);
    } catch {
      // Ignore if doesn't exist
    }
  }

  // Add new child items (max 10)
  streamArray.slice(0, 10).forEach((url, index) => {
    const shortUrl = url.length > 60 ? url.substring(0, 60) + "..." : url;
    chrome.contextMenus.create({
      id: `hls-stream-${index}`,
      parentId: "hls-streams",
      title: shortUrl,
      contexts: ["page"],
    });
  });
}

// Start listening for network requests
chrome.webRequest.onCompleted.addListener(onRequestCompleted, {
  urls: ["<all_urls>"],
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedStreams.delete(tabId);
});

// Clean up when tab navigates to new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    detectedStreams.delete(tabId);
    updateBadge(tabId);
  }
});

// ========================================
// Open in DanmakuPlayer
// ========================================

/**
 * Open URL in DanmakuPlayer
 * @param {string} url - The URL to import
 * @param {boolean} preferProduction - Prefer production URL over localhost
 */
async function openInPlayer(url, preferProduction = false) {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    console.warn("DanmakuPlayer Helper: Invalid URL:", url);
    return;
  }

  try {
    // Check for existing DanmakuPlayer tabs
    const tabs = await chrome.tabs.query({ url: getAppUrlPatterns() });

    if (tabs.length > 0) {
      // Reuse existing tab
      const tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });

      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "IMPORT_URL",
          url: url,
        });
        console.log("DanmakuPlayer Helper: Sent URL to existing tab:", url);
      } catch {
        // Content script might not be loaded yet, reload and try again
        console.warn(
          "DanmakuPlayer Helper: Content script not ready, reloading tab"
        );
        await chrome.tabs.reload(tab.id);
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: "IMPORT_URL",
              url: url,
            });
          } catch (retryError) {
            console.error(
              "DanmakuPlayer Helper: Failed to send after reload:",
              retryError
            );
          }
        }, 1500);
      }
    } else {
      // Open new tab
      const baseUrl = preferProduction
        ? APP_URLS.production
        : APP_URLS.development;
      const target = `${baseUrl}?import=${encodeURIComponent(url)}`;
      await chrome.tabs.create({ url: target });
      console.log("DanmakuPlayer Helper: Opened new tab with URL:", target);
    }
  } catch (error) {
    console.error("DanmakuPlayer Helper: Error opening URL:", error);
  }
}

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-in-danmaku-player") {
    const targetUrl = info.linkUrl || info.pageUrl;
    openInPlayer(targetUrl);
  } else if (info.menuItemId.startsWith("hls-stream-")) {
    // Handle HLS stream selection
    const index = parseInt(info.menuItemId.replace("hls-stream-", ""));
    const streams = detectedStreams.get(tab.id);
    if (streams) {
      const streamArray = Array.from(streams);
      if (streamArray[index]) {
        openInPlayer(streamArray[index]);
      }
    }
  }
});

// Note: Toolbar icon click is handled by popup.html, not here

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_IN_PLAYER") {
    openInPlayer(message.url, message.preferProduction);
    sendResponse({ success: true });
  } else if (message.type === "FETCH_URL") {
    // Fetch URL via extension (bypasses CORS)
    (async () => {
      try {
        const response = await fetch(message.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        if (!response.ok) {
          sendResponse({ error: `HTTP ${response.status}` });
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        // Convert to base64 for transfer
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        sendResponse({
          data: base64,
          contentType: response.headers.get("content-type"),
        });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  } else if (message.type === "GET_DETECTED_STREAMS") {
    const tabId = sender.tab?.id || message.tabId;
    const streams = detectedStreams.get(tabId);
    sendResponse({ streams: streams ? Array.from(streams) : [] });
  } else if (message.type === "DOM_URLS_FOUND") {
    // Handle URLs found from DOM scanning
    const tabId = sender.tab?.id;
    if (tabId && message.urls && message.urls.length > 0) {
      if (!detectedStreams.has(tabId)) {
        detectedStreams.set(tabId, new Set());
      }
      message.urls.forEach((url) => {
        detectedStreams.get(tabId).add(url);
      });
      console.log(
        "DanmakuPlayer Helper: DOM scan added",
        message.urls.length,
        "URLs for tab",
        tabId
      );
      updateHlsContextMenu(tabId);
      updateBadge(tabId);
    }
    sendResponse({ success: true });
  } else if (message.type === "CONTENT_SCRIPT_READY") {
    sendResponse({ success: true });
  }
  return true;
});
