import { useCallback, useMemo, useState } from 'react';

import { isProbablyAA } from '../utils/aaUtils';
import { buildAllCommentsEnriched, buildVisibleComments } from '../utils/logCommentEnrichment';
import { isVideoFileUrl, loadLogFromUrl } from '../utils/logUrlLoader';

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

      // 動画URLはログとして読み込まない
      if (isVideoFileUrl(url)) {
        return;
      }

      try {
        const { parsed } = await loadLogFromUrl(url);

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
              colorIndex: prev.length, // ログ別色分け用インデックス
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

  // ファイルのカスタムカラーを変更
  const handleFileColorChange = useCallback((fileId, color) => {
    setLoadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, customColor: color } : f)));
  }, []);

  const addLoadedFiles = useCallback(
    (newFiles) => {
      // 既存ファイル数を取得してcolorIndexを計算
      const startIndex = loadedFiles.length;
      const processedFiles = newFiles.map((f, idx) => ({
        ...f,
        isVisible: true,
        colorIndex: startIndex + idx, // ログ別色分け用インデックス
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
    [startDateStr, startTimeStr, loadedFiles.length]
  );

  const loadProject = useCallback((projectLoadedFiles) => {
    // Ensure isVisible is true for all files, and assign colorIndex
    const processedFiles = projectLoadedFiles.map((f, idx) => ({
      ...f,
      isVisible: true,
      colorIndex: f.colorIndex ?? idx, // 既存のcolorIndexを優先、なければインデックス
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
    return buildVisibleComments({
      comments,
      loadedFiles,
      ngSettings,
      startDateStr,
      startTimeStr,
    });
  }, [comments, loadedFiles, ngSettings, startDateStr, startTimeStr]);

  // 全コメントのエンリッチ版（LogViewer用、フィルタなし、絶対時間計算済み）
  const allCommentsEnriched = useMemo(() => {
    return buildAllCommentsEnriched({ comments, loadedFiles, startDateStr, startTimeStr });
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
    handleFileColorChange,
    handleReorderFiles,
    addLoadedFiles,
    loadProject,
  };
};
