import { useCallback, useMemo, useState } from 'react';

import { isProbablyAA } from '../utils/aaUtils';
import { parseDatBuffer, parseLogFile } from '../utils/logParser';

export const useLogSystem = () => {
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [startDateStr, setStartDateStr] = useState('');

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

  const addNgWord = useCallback((word, isRegex = false) => {
    setNgSettings((prev) => {
      const currentWords = prev.words || [];

      // Check for duplicates
      const exists = currentWords.some((w) => {
        if (typeof w === 'string') return w === word && !isRegex;
        return w.text === word && w.isRegex === isRegex;
      });

      if (exists) return prev;

      const newEntry = isRegex ? { text: word, isRegex: true } : word;

      return { ...prev, words: [...currentWords, newEntry] };
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

  const removeNgWord = useCallback((wordEntry) => {
    setNgSettings((prev) => ({
      ...prev,
      words: (prev.words || []).filter((w) => {
        if (typeof wordEntry === 'string') {
          // If removing a string, filter out exact string matches
          return w !== wordEntry;
        } else {
          // If removing an object (e.g. from NgList), compare text and regex flag
          if (typeof w === 'string') return true; // Keep strings if removing object
          return !(w.text === wordEntry.text && w.isRegex === wordEntry.isRegex);
        }
      }),
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

          // Auto-set start date/time if not manually set and this is an absolute log
          if (!startDateStr && !startTimeStr && parsed.startDate && parsed.startDate > 0) {
            const d = new Date(parsed.startDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            setStartDateStr(`${year}-${month}-${day}`);
            setStartTimeStr(`${hours}:${minutes}:${seconds}`);
          }

          setUrlInput('');
          return parsed; // Return parsed object
        }
      } catch (err) {
        console.error('Failed to load URL:', err);
        alert('URLの読み込みに失敗しました: ' + err.message);
      }
    },
    [urlInput, startDateStr, startTimeStr]
  );

  const handleToggleFileVisibility = useCallback((fileId) => {
    setLoadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isVisible: !f.isVisible } : f))
    );
  }, []);

  // 全ファイルの表示/非表示を一括で設定
  const setAllFilesVisibility = useCallback((visible) => {
    setLoadedFiles((prev) => prev.map((f) => ({ ...f, isVisible: visible })));
  }, []);

  const handleRemoveFile = useCallback(
    (fileId) => {
      // 1. ファイルリストから削除
      setLoadedFiles((prev) => prev.filter((f) => f.id !== fileId));

      // 2. 対応するコメントを削除
      setComments((prev) => {
        const remaining = prev.filter((c) => c.sourceFileId !== fileId);

        // 3. startDateStr/startTimeStr が空の場合のみ、残りのコメントから再計算
        if (!startDateStr && !startTimeStr && remaining.length > 0) {
          // 有効なタイムスタンプを持つコメントを検索
          const validComments = remaining.filter(
            (c) => c.rawTime && !isNaN(c.rawTime) && c.rawTime > 0
          );

          if (validComments.length > 0) {
            // 最も早いタイムスタンプを検索
            const earliestTime = Math.min(...validComments.map((c) => c.rawTime));
            const earliestDate = new Date(earliestTime);

            // 絶対時刻（2000年以降）の場合のみ設定
            if (earliestDate.getFullYear() >= 2000) {
              const year = earliestDate.getFullYear();
              const month = String(earliestDate.getMonth() + 1).padStart(2, '0');
              const day = String(earliestDate.getDate()).padStart(2, '0');
              const hours = String(earliestDate.getHours()).padStart(2, '0');
              const minutes = String(earliestDate.getMinutes()).padStart(2, '0');
              const seconds = String(earliestDate.getSeconds()).padStart(2, '0');

              setStartDateStr(`${year}-${month}-${day}`);
              setStartTimeStr(`${hours}:${minutes}:${seconds}`);
            }
          }
        }

        return remaining;
      });
    },
    [startDateStr, startTimeStr]
  );

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

  const handleRenameFile = useCallback((fileId, newName) => {
    if (!newName || !newName.trim()) return;

    // 1. Update loadedFiles
    setLoadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, title: newName, name: newName } : f))
    );

    // 2. Update comments threadTitle
    setComments((prev) =>
      prev.map((c) => (c.sourceFileId === fileId ? { ...c, threadTitle: newName } : c))
    );
  }, []);

  const addLoadedFiles = useCallback(
    (newFiles) => {
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

      // Auto-set start date/time if not manually set
      if (!startDateStr && !startTimeStr) {
        // Find earliest absolute log start date
        const absoluteFiles = processedFiles.filter((f) => f.startDate && f.startDate > 0);
        if (absoluteFiles.length > 0) {
          const earliest = Math.min(...absoluteFiles.map((f) => f.startDate));
          const d = new Date(earliest);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          setStartDateStr(`${year}-${month}-${day}`);
          setStartTimeStr(`${hours}:${minutes}:${seconds}`);
        }
      }
    },
    [startDateStr, startTimeStr]
  );

  const loadProject = useCallback((projectLoadedFiles) => {
    // Ensure isVisible is true for all files
    const processedFiles = projectLoadedFiles.map((f) => ({
      ...f,
      isVisible: true,
      // For older projects, rawComments may not have isKnownAA
      // but AA check is somewhat expensive, so maybe ok to do on fly if missing?
      // Or just re-calc here if we want to be safe.
      // But re-calc is done in newComments logic below anyway for comments array.
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

    // 0. Base Timestamp Calculation
    let baseTime = null;

    // Priority 1: Manual Setting
    if (startDateStr && startTimeStr) {
      // Parse YYYY-MM-DD HH:mm:ss (Manual implementation for simple parsing or use Date)
      // Assuming format YYYY-MM-DD and HH:mm:ss
      const d = new Date(`${startDateStr}T${startTimeStr}`);
      if (!isNaN(d.getTime())) {
        baseTime = d.getTime();
      }
    }

    // Priority 2: Auto-sync with existing absolute logs (if no manual setting)
    if (baseTime === null) {
      const absoluteFiles = loadedFiles.filter((f) => f.startDate && f.startDate > 0);
      if (absoluteFiles.length > 0) {
        // Use the earliest start date among loaded absolute logs
        baseTime = Math.min(...absoluteFiles.map((f) => f.startDate));
      }
    }

    // Priority 3: Default fallback
    if (baseTime === null) {
      baseTime = new Date('2000-01-01T00:00:00').getTime();
    }

    const visibleFileIds = new Set(loadedFiles.filter((f) => f.isVisible).map((f) => f.id));
    // File Map for calculating offsets
    const fileMap = new Map(loadedFiles.map((f) => [f.id, f]));

    // 1. Filter by File Visibility
    let filtered = comments.filter((c) => visibleFileIds.has(c.sourceFileId));

    // 2. Filter and Enrich
    let enriched = [];
    const ngIds = new Set(ngSettings.ids);
    const ngComments = new Set(ngSettings.comments);

    // Pre-compile regexes
    const compiledRegexes = [];
    const normalWords = [];
    if (ngSettings.words && ngSettings.words.length > 0) {
      ngSettings.words.forEach((w) => {
        if (typeof w === 'object' && w.isRegex) {
          try {
            compiledRegexes.push(new RegExp(w.text));
          } catch {
            // Ignore invalid regex
          }
        } else {
          normalWords.push(typeof w === 'string' ? w : w.text);
        }
      });
    }

    filtered.forEach((c) => {
      // NG Checks
      if (ngIds.has(c.userId)) return;
      if (ngComments.has(c.id)) return;

      const text = c.text;
      if (normalWords.some((w) => text.includes(w))) return;
      if (compiledRegexes.some((r) => r.test(text))) return;

      // Enrichment Logic
      const file = fileMap.get(c.sourceFileId);
      const isRelativeLog = file && file.startDate === 0;

      let vpos = 0;
      let absoluteTime = 0;

      if (isRelativeLog) {
        // Relative Log (Abema): rawTime is ms offset
        vpos = c.rawTime / 1000;

        // Absolute Time Calculation
        // Use calculated baseTime (Manual > Auto > Default)
        absoluteTime = baseTime + c.rawTime;
      } else {
        // Absolute Log (5ch): rawTime is timestamp ms
        absoluteTime = c.rawTime;

        // Calculate vpos relative to baseTime?
        // No, vpos should be relative to THE video start.
        // If we are syncing Abema to 5ch, that means "Video Start" == "5ch Start".
        // So vpos = absoluteTime - baseTime.

        // However, if baseTime was determined by "earliest 5ch log",
        // then baseTime IS the video start time (logically).
        vpos = (c.rawTime - baseTime) / 1000;
      }

      // Date Display Formatting
      // If c.dateDisplay exists and is valid (not relative log default), use it?
      // Abema logs don't have dateDisplay. 5ch logs do.
      // We force override dateDisplay if we have a calculated absoluteTime that differs significantly?
      // Actually, for consistency, let's re-format absoluteTime if it was calculated (Abema).
      // For 5ch, the original date string is fine, but maybe we want unified format?
      // Let's use formatted string for Abema, keep original for 5ch if exists.

      // Date Display Formatting
      // Always re-generate dateDisplay to ensure unified format (YYYY/MM/DD HH:MM:SS.mmm)
      // and remove day of week (e.g. (日)) from 5ch logs.
      const d = new Date(absoluteTime);
      const days = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dayStr = days[d.getDay()];
      const HH = String(d.getHours()).padStart(2, '0');
      const MM = String(d.getMinutes()).padStart(2, '0');
      const SS = String(d.getSeconds()).padStart(2, '0');
      const MMM = String(d.getMilliseconds()).padStart(3, '0');
      const dateDisplay = `${yyyy}/${mm}/${dd}${dayStr} ${HH}:${MM}:${SS}.${MMM}`;

      enriched.push({
        ...c,
        vpos: vpos,
        time: vpos, // Compatible with player
        absoluteTime: absoluteTime,
        dateDisplay: dateDisplay,
      });
    });

    // Calculate user comment counts (index / total)
    // Group by userId
    const userGroups = {};
    enriched.forEach((c) => {
      const uid = c.userId;
      if (!uid) return;
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(c);
    });

    // Create a map for quick lookup: commentId -> { index, total }
    const metaMap = new Map();
    Object.entries(userGroups).forEach(([, group]) => {
      const total = group.length;
      group.forEach((c, i) => {
        metaMap.set(c.id, { userIndex: i + 1, userTotal: total });
      });
    });

    // Sort by vpos (video relative time) to ensure correct order for auto-scroll
    enriched.sort((a, b) => a.vpos - b.vpos);

    // Attach metadata
    const commentsWithMeta = enriched.map((c) => {
      const meta = metaMap.get(c.id);
      if (meta) {
        return { ...c, ...meta };
      }
      return c;
    });

    console.log('Filtered enriched comments:', commentsWithMeta.length);
    return commentsWithMeta;
  }, [comments, loadedFiles, ngSettings, startDateStr, startTimeStr]);

  // 全コメントのエンリッチ版（LogViewer用、フィルタなし、絶対時間計算済み）
  const allCommentsEnriched = useMemo(() => {
    if (loadedFiles.length === 0) return [];

    // Base Timestamp Calculation (Same as above)
    // Base Timestamp Calculation (Same as above)
    let baseTime = null;

    // Priority 1: Manual Setting
    if (startDateStr && startTimeStr) {
      const d = new Date(`${startDateStr}T${startTimeStr}`);
      if (!isNaN(d.getTime())) {
        baseTime = d.getTime();
      }
    }

    // Priority 2: Auto-sync
    if (baseTime === null) {
      const absoluteFiles = loadedFiles.filter((f) => f.startDate && f.startDate > 0);
      if (absoluteFiles.length > 0) {
        baseTime = Math.min(...absoluteFiles.map((f) => f.startDate));
      }
    }

    // Priority 3: Default fallback
    if (baseTime === null) {
      baseTime = new Date('2000-01-01T00:00:00').getTime();
    }

    const fileMap = new Map(loadedFiles.map((f) => [f.id, f]));

    return comments
      .map((c) => {
        const file = fileMap.get(c.sourceFileId);
        const isRelativeLog = file && file.startDate === 0;

        let vpos = 0;
        let absoluteTime = 0;

        if (isRelativeLog) {
          vpos = c.rawTime / 1000;
          absoluteTime = baseTime + c.rawTime;
        } else {
          absoluteTime = c.rawTime;
          vpos = (c.rawTime - baseTime) / 1000;
        }

        // Always re-generate dateDisplay
        const d = new Date(absoluteTime);
        const days = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dayStr = days[d.getDay()];
        const HH = String(d.getHours()).padStart(2, '0');
        const MM = String(d.getMinutes()).padStart(2, '0');
        const SS = String(d.getSeconds()).padStart(2, '0');
        const MMM = String(d.getMilliseconds()).padStart(3, '0');
        const dateDisplay = `${yyyy}/${mm}/${dd}${dayStr} ${HH}:${MM}:${SS}.${MMM}`;

        return {
          ...c,
          vpos: vpos,
          time: vpos,
          absoluteTime: absoluteTime,
          dateDisplay: dateDisplay,
        };
      })
      .sort((a, b) => a.vpos - b.vpos);
  }, [comments, loadedFiles, startDateStr, startTimeStr]);

  return {
    loadedFiles,
    setLoadedFiles,
    comments,
    setComments,
    visibleComments,
    allCommentsEnriched,
    urlInput,
    setUrlInput,
    startTimeStr,
    setStartTimeStr,
    startDateStr,
    setStartDateStr,
    ngSettings,
    setNgSettings,
    addNgId,
    addNgComment,
    addNgWord,
    removeNgId,
    removeNgComment,
    removeNgWord,
    handleUrlLoad,
    handleToggleFileVisibility,
    setAllFilesVisibility,
    handleRemoveFile,
    handleRenameFile,
    handleReorderFiles,
    addLoadedFiles,
    loadProject,
  };
};
