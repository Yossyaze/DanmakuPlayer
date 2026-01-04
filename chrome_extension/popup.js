// DanmakuPlayer Helper - Popup Script
// ====================================

/* global chrome */

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Load settings
  const storage = await chrome.storage.local.get('preferProduction');
  document.getElementById('prefer-production').checked = storage.preferProduction || false;

  // Open current page button
  document.getElementById('open-page').addEventListener('click', async () => {
    const preferProduction = document.getElementById('prefer-production').checked;
    await chrome.runtime.sendMessage({
      type: 'OPEN_IN_PLAYER',
      url: tab.url,
      preferProduction,
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
    hlsList.innerHTML = '<p class="empty-message">HLSストリームが検出されていません</p>';
  } else {
    hlsList.innerHTML = streams
      .map((url) => {
        const isBlob = url.startsWith('blob:');
        const shortUrl = url.length > 50 ? '...' + url.slice(-47) : url;
        const icon = isBlob ? '📦' : '🎬';
        const label = isBlob ? '(Blob - コピーのみ)' : '';
        return `
                <div class="hls-item ${
                  isBlob ? 'blob-url' : ''
                }" data-url="${encodeURIComponent(url)}" data-blob="${isBlob}">
                    <span class="icon" title="${
                      isBlob ? 'Blob URL (再生不可)' : 'ストリームURL'
                    }">${icon}</span>
                    <span class="url" title="${url}">${shortUrl}${label ? ' ' + label : ''}</span>
                    <button class="copy-btn" title="URLをコピー">📋</button>
                    ${
                      isBlob
                        ? ''
                        : '<button class="open-btn" title="DanmakuPlayerで開く">▶️</button>'
                    }
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
        const preferProduction = document.getElementById('prefer-production').checked;
        await chrome.runtime.sendMessage({
          type: 'OPEN_IN_PLAYER',
          url,
          preferProduction,
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
        // Don't trigger if clicking a button
        if (e.target.closest('button')) return;
        const url = decodeURIComponent(item.dataset.url);
        const preferProduction = document.getElementById('prefer-production').checked;
        await chrome.runtime.sendMessage({
          type: 'OPEN_IN_PLAYER',
          url,
          preferProduction,
        });
        window.close();
      });
    });
  }

  // Save settings on change
  document.getElementById('prefer-production').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ preferProduction: e.target.checked });
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
