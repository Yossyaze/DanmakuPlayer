import { useCallback, useMemo, useState } from 'react';

import { isProbablyAA } from '../utils/aaUtils';
import { parseDatBuffer, parseLogFile } from '../utils/logParser';

export const useLogSystem = () => {
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');

  const [ngSettings, setNgSettings] = useState({ ids: [], comments: [] });

  // --- NG Actions ---
  const addNgId = useCallback((userId) => {
    setNgSettings((prev) => {
      if (prev.ids.includes(userId)) return prev;
      return { ...prev, ids: [...prev.ids, userId] };
    });
  }, []);

  const addNgComment = useCallback((commentId) => {
    setNgSettings((prev) => {
      if (prev.comments.includes(commentId)) return prev;
      return { ...prev, comments: [...prev.comments, commentId] };
    });
  }, []);

  const removeNgId = useCallback((userId) => {
    setNgSettings((prev) => ({
      ...prev,
      ids: prev.ids.filter((id) => id !== userId),
    }));
  }, []);

  const removeNgComment = useCallback((commentId) => {
    setNgSettings((prev) => ({
      ...prev,
      comments: prev.comments.filter((id) => id !== commentId),
    }));
  }, []);

  // Also support removing NG? For now just implement Add as per plan.
  // Ideally we need a UI to manage/remove NGs later. (Now implementing!)

  const handleUrlLoad = useCallback(
    async (urlOrEvent) => {
      let url = urlOrEvent;
      if (urlOrEvent && urlOrEvent.preventDefault) {
        urlOrEvent.preventDefault();
        url = urlInput;
      }

      if (!url) return;

      // Simple check for video URL
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return;
      }

      // Helper to resolve .dat URLs from thread URLs
      const resolveDatUrls = (inputUrl) => {
        let board = null;
        let id = null;
        let server = null;

        // Pattern 1: 5ch.net - https://[server].5ch.net/test/read.cgi/[board]/[id]/
        const fivechMatch = inputUrl.match(
          /https?:\/\/([^.]+\.5ch\.net)\/test\/read\.cgi\/([^/]+)\/(\d+)/
        );
        if (fivechMatch) {
          server = fivechMatch[1];
          board = fivechMatch[2];
          id = fivechMatch[3];

          const candidates = [];
          // 1. Current Thread: https://[server]/[board]/dat/[id].dat
          candidates.push(`https://${server}/${board}/dat/${id}.dat`);
          // 2. Past Log (oyster): https://[server]/[board]/oyster/[id first 4 digits]/[id].dat
          if (id.length >= 4) {
            candidates.push(`https://${server}/${board}/oyster/${id.slice(0, 4)}/${id}.dat`);
          }
          return candidates;
        }

        // Pattern 2: bbs.eddibb.cc/board/id or bbs.eddibb.cc/test/read.cgi/board/id
        const eddibbMatch = inputUrl.match(/bbs\.eddibb\.cc\/(?:test\/read\.cgi\/)?([^/]+)\/(\d+)/);
        if (eddibbMatch) {
          board = eddibbMatch[1];
          id = eddibbMatch[2];
        }

        // Pattern 3: kyodemo.net/sdemo/r/e_e_board/id
        const kyodemoMatch = inputUrl.match(/kyodemo\.net\/sdemo\/r\/e_e_([^/]+)\/(\d+)/);
        if (kyodemoMatch) {
          board = kyodemoMatch[1];
          id = kyodemoMatch[2];
        }

        if (board && id) {
          const candidates = [];
          // 1. Current Thread
          candidates.push(`https://bbs.eddibb.cc/${board}/dat/${id}.dat`);
          // 2. Past Log (kako)
          // /board/kako/1763/17638/1763886647.dat
          if (id.length >= 5) {
            candidates.push(
              `https://bbs.eddibb.cc/${board}/kako/${id.slice(0, 4)}/${id.slice(0, 5)}/${id}.dat`
            );
          }
          return candidates;
        }
        return [inputUrl];
      };

      const tryFetch = async (targetUrl) => {
        // Check if URL is from 5ch (requires extension fetch due to strict access control)
        const is5chUrl = targetUrl.includes('.5ch.net');

        // Try extension fetch first for 5ch URLs (via content script)
        if (is5chUrl) {
          try {
            const response = await new Promise((resolve, reject) => {
              const requestId = `fetch_${Date.now()}_${Math.random()}`;

              const handleResponse = (event) => {
                if (event.source !== window) return;
                if (
                  event.data?.type === 'DANMAKU_FETCH_RESPONSE' &&
                  event.data?.requestId === requestId
                ) {
                  window.removeEventListener('message', handleResponse);
                  if (event.data.error) {
                    reject(new Error(event.data.error));
                  } else if (event.data.data) {
                    resolve(event.data);
                  } else {
                    reject(new Error('No data received'));
                  }
                }
              };

              window.addEventListener('message', handleResponse);

              // Send request to content script
              window.postMessage(
                {
                  type: 'DANMAKU_FETCH_REQUEST',
                  requestId,
                  url: targetUrl,
                },
                '*'
              );

              // Timeout after 15 seconds
              setTimeout(() => {
                window.removeEventListener('message', handleResponse);
                reject(new Error('Extension fetch timeout'));
              }, 15000);
            });

            // Decode base64 to ArrayBuffer
            const binaryString = atob(response.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('Fetched via extension:', targetUrl);
            return bytes.buffer;
          } catch (extErr) {
            console.warn('Extension fetch failed, trying CORS proxy:', extErr);
            // Fall through to CORS proxy
          }
        }

        // Use CORS proxy for external URLs
        let fetchUrl = targetUrl;
        if (
          targetUrl.startsWith('http') &&
          !targetUrl.includes('localhost') &&
          !targetUrl.includes('127.0.0.1')
        ) {
          fetchUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.arrayBuffer();
      };

      try {
        const candidates = resolveDatUrls(url);
        let buffer = null;
        let usedUrl = url;
        let lastError = null;

        // Try candidates sequentially
        for (const candidate of candidates) {
          try {
            console.log('Trying to fetch:', candidate);
            buffer = await tryFetch(candidate);
            usedUrl = candidate;
            break; // Success
          } catch (err) {
            console.warn('Fetch failed for:', candidate, err);
            lastError = err;
          }
        }

        if (!buffer) {
          throw lastError || new Error('All fetch attempts failed');
        }

        let parsed;
        // Check if it's a .dat file (either by extension or if we resolved it to one)
        // If we resolved to a .dat URL, treat it as .dat
        if (usedUrl.endsWith('.dat')) {
          // Use parseDatBuffer for .dat files (Shift_JIS)
          // Extract ID from URL for filename/ID
          const idMatch = usedUrl.match(/\/(\d+)\.dat$/);
          const name = idMatch ? `${idMatch[1]}.dat` : usedUrl.split('/').pop();
          parsed = parseDatBuffer(buffer, name);
        } else {
          // Assume UTF-8 text or HTML, but detect encoding
          let text;
          try {
            // Try UTF-8 first
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            text = utf8Decoder.decode(buffer);
          } catch {
            console.log('UTF-8 decode failed, falling back to windows-31j');
            // Fallback to CP932 (Shift_JIS)
            const sjisDecoder = new TextDecoder('windows-31j');
            text = sjisDecoder.decode(buffer);
          }
          parsed = await parseLogFile(text);
        }

        if (parsed) {
          const fileId = Date.now().toString();
          // Assign sourceFileId to comments
          const newComments = parsed.rawComments.map((c) => ({
            ...c,
            sourceFileId: fileId,
            threadTitle: parsed.title || parsed.name, // Inject thread title
            isKnownAA: isProbablyAA(c.text), // Pre-calculate AA status
          }));

          setComments((prev) => [...prev, ...newComments].sort((a, b) => a.rawTime - b.rawTime));

          setLoadedFiles((prev) => [
            ...prev,
            {
              ...parsed,
              id: fileId,
              isVisible: true,
              count: parsed.rawComments.length,
            },
          ]);
          setUrlInput('');
          return parsed; // Return parsed object
        }
      } catch (err) {
        console.error('Failed to load URL:', err);
        alert('URLの読み込みに失敗しました: ' + err.message);
      }
    },
    [urlInput]
  );

  const handleToggleFileVisibility = useCallback((fileId) => {
    setLoadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isVisible: !f.isVisible } : f))
    );
  }, []);

  const handleRemoveFile = useCallback((fileId) => {
    setLoadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleReorderFiles = useCallback((fromIndex, toIndex) => {
    setLoadedFiles((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length)
        return prev;
      const newFiles = [...prev];
      const [movedItem] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedItem);
      return newFiles;
    });
  }, []);

  const addLoadedFiles = useCallback((newFiles) => {
    const processedFiles = newFiles.map((f) => ({
      ...f,
      isVisible: true,
    }));

    const newComments = processedFiles.flatMap((file) =>
      (file.rawComments || []).map((c) => ({
        ...c,
        sourceFileId: file.id,
        threadTitle: file.title || file.name, // Inject thread title
        isKnownAA: isProbablyAA(c.text), // Pre-calculate AA status
      }))
    );

    setComments((prev) => [...prev, ...newComments].sort((a, b) => a.rawTime - b.rawTime));
    setLoadedFiles((prev) => [...prev, ...processedFiles]);
  }, []);

  const loadProject = useCallback((projectLoadedFiles) => {
    // Ensure isVisible is true for all files
    const processedFiles = projectLoadedFiles.map((f) => ({
      ...f,
      isVisible: true,
    }));

    // Reconstruct comments from the files
    const newComments = processedFiles.flatMap((file) =>
      (file.rawComments || []).map((c) => ({
        ...c,
        sourceFileId: file.id,
        threadTitle: file.title || file.name, // Inject thread title
        isKnownAA: isProbablyAA(c.text), // Pre-calculate AA status
      }))
    );

    setLoadedFiles(processedFiles);
    setComments(newComments.sort((a, b) => a.rawTime - b.rawTime));
  }, []);

  const visibleComments = useMemo(() => {
    // logSystem.visibleComments

    // It seems 'comments' state holds ALL comments (maybe sorted).
    // And 'visibleComments' should be filtered by file visibility.

    // However, comments in 'comments' state usually have 'sourceFileId'.
    if (loadedFiles.length === 0) return [];

    const visibleFileIds = new Set(loadedFiles.filter((f) => f.isVisible).map((f) => f.id));
    console.log('Visible File IDs:', Array.from(visibleFileIds));

    // 1. Filter by File Visibility
    let filtered = comments.filter((c) => visibleFileIds.has(c.sourceFileId));

    // 2. Filter by NG Settings (ID and Comment ID)
    if (ngSettings.ids.length > 0) {
      const ngIds = new Set(ngSettings.ids);
      filtered = filtered.filter((c) => !ngIds.has(c.userId));
    }
    if (ngSettings.comments.length > 0) {
      const ngComments = new Set(ngSettings.comments);
      filtered = filtered.filter((c) => !ngComments.has(c.id));
    }

    // Calculate user comment counts (index / total)
    // Group by userId
    const userGroups = {};
    filtered.forEach((c) => {
      const uid = c.userId;
      if (!uid) return;
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(c);
    });

    // Create a map for quick lookup: commentId -> { index, total }
    // We assume comment objects have unique IDs (c.id)
    const metaMap = new Map();
    Object.entries(userGroups).forEach(([, group]) => {
      const total = group.length;
      // Ensure chronological order for index calculation
      // filtered is already sorted by time, but group construction preserves that relative order
      group.forEach((c, i) => {
        metaMap.set(c.id, { userIndex: i + 1, userTotal: total });
      });
    });

    // Attach metadata to comments
    // We create shallow copies to avoid mutating the original state objects
    const commentsWithMeta = filtered.map((c) => {
      const meta = metaMap.get(c.id);
      if (meta) {
        return { ...c, ...meta };
      }
      return c;
    });

    console.log('Filtered visible comments:', commentsWithMeta.length);
    return commentsWithMeta;
  }, [comments, loadedFiles, ngSettings]);

  return {
    loadedFiles,
    setLoadedFiles,
    comments,
    setComments,
    visibleComments,
    urlInput,
    setUrlInput,
    startTimeStr,
    setStartTimeStr,
    ngSettings,
    setNgSettings,
    addNgId,
    addNgComment,
    removeNgId,
    removeNgComment,
    handleUrlLoad,
    handleToggleFileVisibility,
    handleRemoveFile,
    handleReorderFiles,
    addLoadedFiles,
    loadProject,
  };
};
