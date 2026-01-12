// DanmakuPlayer Helper - Background Service Worker
// ================================================

/* global chrome */

// App URLs (development and production)
const APP_URLS = {
  development: 'http://localhost:5173/',
  developmentAlt: 'http://localhost:5174/',
  production: 'https://yossyaze.github.io/DanmakuPlayer/',
};

// Detected HLS streams per tab
// 各ストリームは { url, pageTitle, filename, domain } の形式で保存
const detectedStreams = new Map(); // tabId -> Array of stream objects

// Get all app URL patterns for tab query
// Get all app URL patterns for tab query
const getAppUrlPatterns = () => Object.values(APP_URLS).map((url) => url + '*');

// Helper to log to the DanmakuPlayer app tab(s)
async function logToTab(message) {
  try {
    // 開発中と本番環境の両方のURLパターンでタブを検索
    const patterns = getAppUrlPatterns();
    const tabs = await chrome.tabs.query({ url: patterns });

    // 見つかったすべてのタブにログを送信
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'EXTENSION_LOG',
            message: `[Extension] ${message}`,
          })
          .catch(() => {
            // エラーは無視（タブが閉じている等）
          });
      }
    }
    // 念のためバックグラウンドコンソールにも出す
    console.log(`[LogToTab] ${message}`);
  } catch (err) {
    console.error('logToTab failed:', err);
  }
}

// Create Context Menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Main context menu
  chrome.contextMenus.create({
    id: 'open-in-danmaku-player',
    title: 'DanmakuPlayerで開く',
    contexts: ['link', 'page'],
  });

  // HLS stream submenu (will be populated dynamically)
  chrome.contextMenus.create({
    id: 'hls-streams',
    title: 'HLSストリーム (検出中...)',
    contexts: ['page'],
    enabled: false,
  });

  console.log('DanmakuPlayer Helper: Context menus created');
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
    lowerUrl.includes('.m3u8') ||
    lowerUrl.includes('application/x-mpegurl') ||
    lowerUrl.includes('application/vnd.apple.mpegurl')
  );
}

/**
 * URLからファイル名を抽出
 */
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'stream';
    // クエリパラメータを除去
    return filename.split('?')[0];
  } catch {
    return 'stream.m3u8';
  }
}

/**
 * URLからドメインを抽出
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Map to store referers by request ID
const requestReferers = new Map();

/**
 * Capture Referer header from outgoing requests
 */
function onBeforeSendHeaders(details) {
  if (!isHlsUrl(details.url)) return;

  const refererHeader = details.requestHeaders?.find((h) => h.name.toLowerCase() === 'referer');

  if (refererHeader && refererHeader.value) {
    requestReferers.set(details.requestId, refererHeader.value);
    // 冗長になるためコメントアウト解除は慎重に (量が多いため)
    // console.log(`DanmakuPlayer Helper: Captured Referer for ${details.requestId}: ${refererHeader.value}`);
  }
}

/**
 * Handle detected network request
 */
async function onRequestCompleted(details) {
  if (!isHlsUrl(details.url)) return;

  const tabId = details.tabId;
  const requestId = details.requestId;

  // Clean up refers for non-tab requests or errors (though this is success handler)
  // We'll clean up at the end of this function

  if (tabId < 0) {
    requestReferers.delete(requestId);
    return; // Ignore background requests
  }

  // URLが既に登録済みかチェック
  if (!detectedStreams.has(tabId)) {
    detectedStreams.set(tabId, []);
  }
  const streams = detectedStreams.get(tabId);

  // 重複チェック前にRefererを取得しておく (同一URLでもRefererが違う可能性は低いが念のため)
  const capturedReferer = requestReferers.get(requestId);
  requestReferers.delete(requestId); // cleanup

  if (streams.some((s) => s.url === details.url)) {
    return; // 重複スキップ
  }

  // ページタイトルとURLを取得
  let pageTitle = '';
  let pageUrl = '';
  try {
    const tab = await chrome.tabs.get(tabId);
    pageTitle = tab.title || '';
    pageUrl = tab.url || '';
  } catch {
    // タブ取得失敗時は空文字
  }

  // Stream Info
  // 優先順位: キャプチャしたReferer > タブのURL
  // Stream Info
  // 優先順位: キャプチャしたReferer > タブのURL
  const finalReferer = capturedReferer || pageUrl;

  // Logic Check ログは冗長なため無効化
  // logToTab(
  //   `Logic Check: requestId=${requestId}, captured=${capturedReferer}, page=${pageUrl}, final=${finalReferer}`
  // );

  // ストリーム情報を保存
  const streamInfo = {
    url: details.url,
    pageTitle: pageTitle,
    pageUrl: finalReferer, // pageUrlフィールドだが実質Refererとして扱う
    filename: extractFilename(details.url),
    domain: extractDomain(details.url),
    detectedAt: Date.now(),
  };
  streams.push(streamInfo);

  logToTab(`HLS detected: ${JSON.stringify(streamInfo)}`);
  // REFERER DEBUG ログは冗長なため無効化
  // logToTab(`[REFERER DEBUG] URL: ${details.url}`);
  // logToTab(`[REFERER DEBUG] Detected Referer: ${capturedReferer || '(none)'}`);
  // logToTab(`[REFERER DEBUG] Page URL: ${pageUrl}`);
  // logToTab(`[REFERER DEBUG] Applied Referer: ${finalReferer}`);

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
  const count = streams ? streams.length : 0;

  if (count > 0) {
    chrome.action.setBadgeText({ tabId, text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#3B82F6' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

/**
 * Update context menu with detected HLS streams
 */
async function updateHlsContextMenu(tabId) {
  const streams = detectedStreams.get(tabId);

  if (!streams || streams.length === 0) {
    chrome.contextMenus.update('hls-streams', {
      title: 'HLSストリーム (未検出)',
      enabled: false,
    });
    return;
  }

  // Update parent menu
  chrome.contextMenus.update('hls-streams', {
    title: `HLSストリーム (${streams.length}件検出)`,
    enabled: true,
  });

  // Remove old child items
  for (let i = 0; i < 10; i++) {
    try {
      await chrome.contextMenus.remove(`hls-stream-${i}`);
    } catch {
      // Ignore if doesn't exist
    }
  }

  // Add new child items (max 10)
  streams.slice(0, 10).forEach((streamInfo, index) => {
    // ページタイトルがあれば表示、なければファイル名
    const displayName = streamInfo.pageTitle
      ? `${streamInfo.pageTitle.substring(0, 30)} - ${streamInfo.filename}`
      : streamInfo.filename;
    const title = displayName.length > 60 ? displayName.substring(0, 57) + '...' : displayName;
    chrome.contextMenus.create({
      id: `hls-stream-${index}`,
      parentId: 'hls-streams',
      title: title,
      contexts: ['page'],
    });
  });
}

// Start listening for network requests
// onBeforeSendHeaders needs access to requestHeaders
chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, { urls: ['<all_urls>'] }, [
  'requestHeaders',
  'extraHeaders',
]);

chrome.webRequest.onCompleted.addListener(onRequestCompleted, {
  urls: ['<all_urls>'],
});

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (requestReferers.has(details.requestId)) {
      requestReferers.delete(details.requestId);
    }
  },
  { urls: ['<all_urls>'] }
);

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedStreams.delete(tabId);
});

// Clean up when tab navigates to new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    detectedStreams.delete(tabId);
    updateBadge(tabId);
  }
});

// ========================================
// Open in DanmakuPlayer
// ========================================

async function openInPlayer(url, preferProduction = false, referer = '') {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    console.warn('DanmakuPlayer Helper: Invalid URL:', url);
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
          type: 'IMPORT_URL',
          url: url,
          referer: referer,
        });
        console.log('DanmakuPlayer Helper: Sent URL to existing tab:', url);
      } catch {
        // Content script might not be loaded yet, reload and try again
        console.warn('DanmakuPlayer Helper: Content script not ready, reloading tab');
        await chrome.tabs.reload(tab.id);
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'IMPORT_URL',
              url: url,
              referer: referer,
            });
          } catch (retryError) {
            console.error('DanmakuPlayer Helper: Failed to send after reload:', retryError);
          }
        }, 1500);
      }
    } else {
      // Open new tab
      const baseUrl = preferProduction ? APP_URLS.production : APP_URLS.development;
      let target = `${baseUrl}?import=${encodeURIComponent(url)}`;
      if (referer) {
        target += `&referer=${encodeURIComponent(referer)}`;
      }
      await chrome.tabs.create({ url: target });
      console.log('DanmakuPlayer Helper: Opened new tab with URL:', target);
    }
  } catch (error) {
    console.error('DanmakuPlayer Helper: Error opening URL:', error);
  }
}

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open-in-danmaku-player') {
    const targetUrl = info.linkUrl || info.pageUrl;
    openInPlayer(targetUrl);
  } else if (info.menuItemId.startsWith('hls-stream-')) {
    // Handle HLS stream selection
    const index = parseInt(info.menuItemId.replace('hls-stream-', ''));
    const streams = detectedStreams.get(tab.id);
    if (streams && streams[index]) {
      openInPlayer(streams[index].url, false, streams[index].pageUrl);
    }
  }
});

// Note: Toolbar icon click is handled by popup.html, not here

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_IN_PLAYER') {
    openInPlayer(message.url, message.preferProduction, message.referer);
    sendResponse({ success: true });
  } else if (message.type === 'FETCH_URL') {
    // Fetch URL via extension (bypasses CORS)
    (async () => {
      try {
        const response = await fetch(message.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (!response.ok) {
          sendResponse({ error: `HTTP ${response.status}` });
          return;
        }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          sendResponse({
            data: base64data,
            contentType: response.headers.get('content-type'),
          });
        };
        reader.onerror = () => {
          sendResponse({ error: 'Failed to convert response to base64' });
        };
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  } else if (message.type === 'FETCH_HLS') {
    // HLSリクエストをCookie付きでプロキシ（TVer等の認証付きストリーム用）
    (async () => {
      try {
        // URLからドメインを抽出
        const url = new URL(message.url);
        const domain = url.hostname;

        // 関連するドメインの Cookie を取得
        // リクエスト先ドメインのCookieは常に取得対象とする
        const domains = [domain];

        // TVer等の特定サイト向けの追加ドメイン設定
        if (domain.includes('streaks.jp')) {
          domains.push('tver.jp');
          domains.push('.tver.jp');
        }

        let cookieString = '';
        for (const d of domains) {
          try {
            const cookies = await chrome.cookies.getAll({ domain: d });
            const cookieParts = cookies.map((c) => `${c.name}=${c.value}`);
            if (cookieParts.length > 0) {
              cookieString += (cookieString ? '; ' : '') + cookieParts.join('; ');
            }
          } catch (e) {
            console.log('Cookie fetch failed for domain:', d, e);
          }
        }

        console.log('FETCH_HLS: Cookies collected:', cookieString.length, 'chars for', domain);

        const headers = {
          Accept: '*/*',
        };

        // Cookie があれば設定
        if (cookieString) {
          headers['Cookie'] = cookieString;
        }

        // Referer があれば declarativeNetRequest でルールを設定（fetchのheadersでは効かないため）
        if (message.referer) {
          // ドメインごとのユニークID生成 (簡易ハッシュ)
          const domainHash = domain.split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0);
          const ruleId = Math.abs(domainHash) + 1;

          // ルール更新
          const rule = {
            id: ruleId,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                { header: 'Referer', operation: 'set', value: message.referer },
                { header: 'Origin', operation: 'set', value: new URL(message.referer).origin },
              ],
            },
            condition: {
              urlFilter: `||${domain}`,
              resourceTypes: ['xmlhttprequest', 'other'], // fetchはxmlhttprequestまたはother扱い
            },
          };

          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId],
            addRules: [rule],
          });
          console.log(
            `FETCH_HLS: Updated DNR rule ${ruleId} for ${domain} -> Referer: ${message.referer}`
          );
          console.log(
            `DanmakuPlayer Helper: [PROXY DEBUG] Applying Referer to Proxy Request: ${message.referer}`
          );
        } else {
          console.log(`DanmakuPlayer Helper: [PROXY DEBUG] No Referer to apply for ${message.url}`);
        }

        const response = await fetch(message.url, {
          credentials: 'include',
          headers,
          referrer: message.referer, // 念のため指定（効かない可能性大）
          referrerPolicy: 'unsafe-url', // これも念のため
        });

        if (!response.ok) {
          console.error('FETCH_HLS: HTTP error', response.status, message.url);
          sendResponse({ error: `HTTP ${response.status}` });
          return;
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          sendResponse({
            data: base64data,
            contentType: response.headers.get('content-type'),
          });
        };
        reader.onerror = () => {
          sendResponse({ error: 'Failed to convert response to base64' });
        };
      } catch (error) {
        console.error('FETCH_HLS: Error', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  } else if (message.type === 'GET_DETECTED_STREAMS') {
    const tabId = sender.tab?.id || message.tabId;
    const streams = detectedStreams.get(tabId);
    // ストリーム情報オブジェクト配列をそのまま返す
    sendResponse({ streams: streams || [] });
  } else if (message.type === 'DOM_URLS_FOUND') {
    // Handle URLs found from DOM scanning
    const tabId = sender.tab?.id;
    if (tabId && message.urls && message.urls.length > 0) {
      if (!detectedStreams.has(tabId)) {
        detectedStreams.set(tabId, []);
      }
      const streams = detectedStreams.get(tabId);
      let addedCount = 0;
      message.urls.forEach((url) => {
        // 重複チェック
        if (!streams.some((s) => s.url === url)) {
          streams.push({
            url: url,
            pageTitle: message.pageTitle || '',
            filename: extractFilename(url),
            domain: extractDomain(url),
            detectedAt: Date.now(),
          });
          addedCount++;
        }
      });
      if (addedCount > 0) {
        console.log('DanmakuPlayer Helper: DOM scan added', addedCount, 'URLs for tab', tabId);
        updateHlsContextMenu(tabId);
        updateBadge(tabId);
      }
    }
    sendResponse({ success: true });
  } else if (message.type === 'CONTENT_SCRIPT_READY') {
    sendResponse({ success: true });
  }
  return true;
});
