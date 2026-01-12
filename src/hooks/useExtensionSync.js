import { useEffect } from 'react';

import { checkAbeUnlockCondition } from '../utils/abeMode';
import { sendExtensionLog } from '../utils/debugLogger';

export const useExtensionSync = ({ player, logSystem, unlockAbeMode }) => {
  // Handle Extension Import (URL Params & Messages)
  useEffect(() => {
    // Helper to check if URL is a video/HLS stream
    const isVideoUrl = (url) => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      return (
        lowerUrl.includes('.m3u8') ||
        lowerUrl.includes('.mp4') ||
        lowerUrl.includes('.webm') ||
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be')
      );
    };

    // Handle import URL (video or log)
    const handleImportUrl = (url, referer = '') => {
      if (isVideoUrl(url)) {
        console.log('[ExtensionSync] Importing as video URL:', url, 'Referer:', referer);
        player.setVideoSrc(url);
        if (player.setReferer) {
          console.log('[ExtensionSync] Calling setReferer with:', referer);
          console.log('[ExtensionSync] Calling setReferer with:', referer);
          player.setReferer(referer);
        } else {
          console.warn('[ExtensionSync] player.setReferer is not available!');
        }
      } else {
        console.log('[ExtensionSync] Importing as log URL:', url);
        logSystem
          .handleUrlLoad(url)
          .then((result) => {
            if (result && (result.title || result.name)) {
              const text = result.title || result.name;
              if (checkAbeUnlockCondition(text)) {
                unlockAbeMode();
              }
            }
          })
          .catch((err) => console.error('Auto-import failed:', err));
      }
    };

    // 1. Initial Load via URL Params
    const params = new URLSearchParams(window.location.search);
    const importUrl = params.get('import');
    const importReferer = params.get('referer') || '';
    if (importUrl) {
      handleImportUrl(importUrl, importReferer);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Listen for Messages from Content Script (Tab Reuse)
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'DANMAKU_IMPORT' && event.data.url) {
        console.log('Received import message:', event.data.url);
        handleImportUrl(event.data.url, event.data.referer || '');
      } else if (event.data && event.data.type === 'IMPORT_URL' && event.data.url) {
        // Handle message from extension background script directly to tab
        console.log('Received extension import message:', event.data.url);
        handleImportUrl(event.data.url, event.data.referer || '');
      } else if (event.data && event.data.type === 'EXTENSION_LOG' && event.data.message) {
        // Handle log message from extension
        console.log(event.data.message);
        // Send to extension.log file
        sendExtensionLog(event.data.message);
      }
    };

    // Listen for chrome runtime messages if applicable (though usually window.message is enough if content script forwards it)
    // Actually, background.js uses chrome.tabs.sendMessage, which goes to content script.
    // content script needs to forward it to window, OR we listen to chrome.runtime.onMessage if this is an extension page?
    // DanmakuPlayer is a web app, so content_script forwards it via window.postMessage?
    // Let's assume content_script.js does forwarding or we receive it via window message if we are the destination.
    // background.js sends 'IMPORT_URL' to tab. content_script.js needs to pick it up?
    // Checking content_script.js next might be good, but assuming standard message passing:

    // Listen for extension messages via window (if injected content script forwards them)
    // The background.js sends { type: 'IMPORT_URL', url, referer } to the tab.
    // If the app is running on localhost, content_script.js is injected.

    window.addEventListener('message', handleMessage);
    // Also add listener for chrome.runtime.onMessage if we are in an extension context (optional but safe)
    // Also add listener for chrome.runtime.onMessage if we are in an extension context (optional but safe)
    try {
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
        const runtimeListener = (message) => {
          if (message.type === 'IMPORT_URL') {
            handleImportUrl(message.url, message.referer || '');
          }
        };
        window.chrome.runtime.onMessage.addListener(runtimeListener);
        return () => {
          window.removeEventListener('message', handleMessage);
          try {
            window.chrome.runtime.onMessage.removeListener(runtimeListener);
          } catch {
            /* ignore */
          }
        };
      }
    } catch {
      /* ignore */
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [logSystem, player, unlockAbeMode]);
};
