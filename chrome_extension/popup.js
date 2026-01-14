// DanmakuPlayer Helper - Popup Script
// ====================================

/* global chrome */

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Load settings
  const storage = await chrome.storage.local.get('preferDevelopment');
  document.getElementById('prefer-development').checked = storage.preferDevelopment || false;

  // Open current page button
  document.getElementById('open-page').addEventListener('click', async () => {
    const preferDevelopment = document.getElementById('prefer-development').checked;
    await chrome.runtime.sendMessage({
      type: 'OPEN_IN_PLAYER',
      url: tab.url,
      preferDevelopment,
    });
    window.close();
  });

  // Get detected HLS streams
  const response = await chrome.runtime.sendMessage({
    type: 'GET_DETECTED_STREAMS',
    tabId: tab.id,
  });

  const hlsList = document.getElementById('hls-list');
  const streams = response?.streams || [];

  if (streams.length === 0) {
    hlsList.innerHTML = '<p class="empty-message">ウェブ動画が検出されていません</p>';
  } else {
    hlsList.innerHTML = streams
      .map((streamInfo) => {
        // streamInfo が文字列（旧形式）かオブジェクト（新形式）かを判定
        const isObject = typeof streamInfo === 'object' && streamInfo !== null;
        const url = isObject ? streamInfo.url : streamInfo;
        const pageTitle = isObject ? streamInfo.pageTitle : '';
        const filename = isObject
          ? streamInfo.filename
          : url.split('/').pop()?.split('?')[0] || 'stream';
        const domain = isObject ? streamInfo.domain : '';

        const isBlob = url.startsWith('blob:');
        const icon = isBlob ? '📦' : '🎬';

        // 表示名を構築
        let displayName = '';
        if (pageTitle) {
          // ページタイトルが30文字を超える場合は省略
          const shortTitle = pageTitle.length > 30 ? pageTitle.substring(0, 27) + '...' : pageTitle;
          displayName = shortTitle;
        }

        // pageUrl を referer として使用
        const referer = isObject && streamInfo.pageUrl ? streamInfo.pageUrl : '';

        return `
          <div class="hls-item ${isBlob ? 'blob-url' : ''}" data-url="${encodeURIComponent(url)}" data-blob="${isBlob}" data-referer="${encodeURIComponent(referer)}">
            <div class="hls-item-main">
              <span class="icon" title="${isBlob ? 'Blob URL (再生不可)' : 'ストリームURL'}">${icon}</span>
              <div class="hls-item-info">
                ${displayName ? `<div class="hls-title" title="${pageTitle}">${displayName}</div>` : ''}
                <div class="hls-filename" title="${url}">
                  ${filename}${domain ? ` <span class="hls-domain">(${domain})</span>` : ''}
                </div>
              </div>
            </div>
            <div class="hls-item-actions">
              <button class="copy-btn" title="URLをコピー">📋</button>
              ${isBlob ? '' : '<button class="open-btn" title="DanmakuPlayerで開く">▶️</button>'}
            </div>
          </div>
        `;
      })
      .join('');

    // Add click handlers for open buttons
    hlsList.querySelectorAll('.open-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.hls-item');
        const url = decodeURIComponent(item.dataset.url);
        const referer = item.dataset.referer ? decodeURIComponent(item.dataset.referer) : '';
        const preferDevelopment = document.getElementById('prefer-development').checked;
        await chrome.runtime.sendMessage({
          type: 'OPEN_IN_PLAYER',
          url,
          preferDevelopment,
          referer,
        });
        window.close();
      });
    });

    // Add click handlers for copy buttons
    hlsList.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.hls-item');
        const url = decodeURIComponent(item.dataset.url);
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = '✅';
          setTimeout(() => {
            btn.textContent = '📋';
          }, 1500);
        } catch (err) {
          console.error('Copy failed:', err);
          btn.textContent = '❌';
          setTimeout(() => {
            btn.textContent = '📋';
          }, 1500);
        }
      });
    });

    // Add click handler for entire row (also opens)
    hlsList.querySelectorAll('.hls-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        // Don't trigger if clicking a button or if it's a blob URL
        if (e.target.closest('button')) return;
        if (item.dataset.blob === 'true') return;

        const url = decodeURIComponent(item.dataset.url);
        const referer = item.dataset.referer ? decodeURIComponent(item.dataset.referer) : '';
        const preferDevelopment = document.getElementById('prefer-development').checked;
        await chrome.runtime.sendMessage({
          type: 'OPEN_IN_PLAYER',
          url,
          preferDevelopment,
          referer,
        });
        window.close();
      });
    });
  }

  // Save settings on change
  document.getElementById('prefer-development').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ preferDevelopment: e.target.checked });
  });

  // Help Toggle
  const helpOverlay = document.getElementById('help-overlay');
  const helpBtn = document.getElementById('help-btn');
  const closeHelpBtn = document.getElementById('close-help-btn');

  if (helpBtn && helpOverlay && closeHelpBtn) {
    helpBtn.addEventListener('click', () => {
      helpOverlay.classList.remove('hidden');
    });

    closeHelpBtn.addEventListener('click', () => {
      helpOverlay.classList.add('hidden');
    });

    // Close on click outside content
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) {
        helpOverlay.classList.add('hidden');
      }
    });
  }
});
