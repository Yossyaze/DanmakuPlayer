import { useEffect } from 'react';

import { checkAbeUnlockCondition } from '../utils/abeMode';

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
    const handleImportUrl = (url) => {
      if (isVideoUrl(url)) {
        console.log('Importing as video URL:', url);
        player.setVideoSrc(url);
      } else {
        console.log('Importing as log URL:', url);
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
    if (importUrl) {
      handleImportUrl(importUrl);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Listen for Messages from Content Script (Tab Reuse)
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'DANMAKU_IMPORT' && event.data.url) {
        console.log('Received import message:', event.data.url);
        handleImportUrl(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [logSystem, player, unlockAbeMode]);
};
