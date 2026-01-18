import { useCallback, useRef } from 'react';

import { checkAbeUnlockCondition } from '../utils/abeMode';

/**
 * useAppHandlers - App.jsx から分離したハンドラーを管理するカスタムフック
 *
 * @param {Object} params - ハンドラーが依存するオブジェクト
 * @returns {Object} - ハンドラー関数群
 */
export function useAppHandlers({
  player,
  cmSystem,
  logSystem,
  resetPlayerState,
  togglePlay,
  handleSeek,
  handleCommentClick,
  requestPlay,
  // resetDanmaku, // Unused
  skipSeconds,
  currentTime,
  logOnlyMode,
  setLogOnlyMode,
  setShowDanmaku,
  setShowSidebar,
  videoStartTimeStr,
  setVideoStartTimeStr,
  dmSettings,
  aaOverrideMap,
  setAaOverrideMap,
  setShowExportModal,

  setRequestedVideoName,
  setRequestedVideoPath,
  setRequestedVideoUrl,
  setRequestedReferer,
  setShowVideoRequestModal,
  projectFileHandle,
  setProjectFileHandle,
  projectName,
  setProjectName,
  setProjectDirPath,
  unlockAbeMode,
  setIsAutoScroll,
  endCardSettings,
  setEndCardSettings,
}) {
  const autoPlayRequestedRef = useRef(false);

  // --- Video URL Submit ---
  const handleVideoUrlSubmit = useCallback(
    (e, videoUrlInput) => {
      e.preventDefault();
      if (videoUrlInput) {
        // Abe Mode Unlock Check

        if (checkAbeUnlockCondition(videoUrlInput)) {
          unlockAbeMode();
        }

        console.log('handleVideoUrlSubmit: Setting video src to', videoUrlInput);
        player.setVideoSrc(videoUrlInput);
        resetPlayerState();
        console.log('handleVideoUrlSubmit: Requesting deferred AutoPlay');
        autoPlayRequestedRef.current = true;
      }
    },
    [player, resetPlayerState, unlockAbeMode]
  );

  // --- Seek and Play (for context menu "Move to this time") ---
  const handleSeekAndPlay = useCallback(
    (time) => {
      setLogOnlyMode(false);
      // Use setTimeout to allow layout to settle before seeking/playing.
      // This is crucial when switching from LogOnlyMode (container width 0) to VideoMode (full width).
      // Without this delay, danmaku calculations use width=0, leading to extremely slow movement.
      setTimeout(() => {
        handleCommentClick(time);
        requestPlay();
      }, 50);
    },
    [handleCommentClick, requestPlay, setLogOnlyMode]
  );

  // --- Keyboard Shortcuts ---
  const createKeyDownHandler = useCallback(
    (handleSaveProject) => {
      return (e) => {
        // Ctrl+S / Cmd+S for Save
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
          e.preventDefault();
          handleSaveProject();
          return;
        }

        // Ctrl+R / Cmd+R for Reload
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyR') {
          // In some Tauri environments, standard reload is blocked.
          // We'll allow it if possible, or force it if it's the expected behavior.
          window.location.reload();
          return;
        }

        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

        switch (e.code) {
          case 'Space':
            e.preventDefault();
            togglePlay();
            break;
          case 'ArrowRight':
            e.preventDefault();
            handleSeek({
              target: {
                value: Math.min(
                  cmSystem.getTotalDuration,
                  currentTime - cmSystem.logStartTime + (Number(skipSeconds) || 5)
                ),
              },
            });
            break;
          case 'ArrowLeft':
            e.preventDefault();
            handleSeek({
              target: {
                value: Math.max(
                  0,
                  currentTime - cmSystem.logStartTime - (Number(skipSeconds) || 5)
                ),
              },
            });
            break;
          case 'KeyD':
            e.preventDefault();
            if (!logOnlyMode) setShowDanmaku((prev) => !prev);
            break;
          case 'KeyS':
            e.preventDefault();
            if (!logOnlyMode) setShowSidebar((prev) => !prev);
            break;
          case 'KeyL':
            e.preventDefault();
            setLogOnlyMode((prev) => !prev);
            break;
          default:
            break;
        }
      };
    },
    [
      togglePlay,
      handleSeek,
      currentTime,
      skipSeconds,
      cmSystem,
      logOnlyMode,
      setShowDanmaku,
      setShowSidebar,
      setLogOnlyMode,
    ]
  );

  // --- Project Data Helper ---
  const getProjectData = useCallback(
    () => ({
      version: '3.4.0',
      timestamp: Date.now(),
      videoStartTimeStr: videoStartTimeStr,
      startTimeStr: logSystem.startTimeStr,
      startDateStr: logSystem.startDateStr, // Add Date
      cmRanges: cmSystem.cmRanges,
      dmSettings: dmSettings,
      loadedFiles: logSystem.loadedFiles,
      videoFileName: player.videoFileName,
      videoFilePath: player.videoFilePath, // Full absolute path for auto-loading
      videoUrl:
        player.videoSrc &&
        (player.videoSrc.startsWith('http') || player.videoSrc.startsWith('https'))
          ? player.videoSrc
          : null,
      referer: player.referer,
      ngSettings: logSystem.ngSettings,
      aaOverrideMap: aaOverrideMap,
      endCardSettings: { ...endCardSettings, file: null },
    }),
    [
      videoStartTimeStr,
      logSystem.startTimeStr,
      logSystem.startDateStr,
      cmSystem.cmRanges,
      dmSettings,
      logSystem.loadedFiles,
      player.videoFileName,
      player.videoFilePath,
      player.videoSrc,
      player.referer,
      logSystem.ngSettings,
      aaOverrideMap,
      endCardSettings,
    ]
  );

  // --- Save Project (Overwrite) ---
  const handleSaveProject = useCallback(async () => {
    if (!projectFileHandle) {
      setShowExportModal(true);
      return;
    }

    if (
      !window.confirm(
        `現在の内容でプロジェクトファイル「${projectName || 'project.json'}」を上書き保存しますか？`
      )
    ) {
      return;
    }

    try {
      const data = getProjectData();
      const jsonString = JSON.stringify(data, null, 2);

      const writable = await projectFileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      console.log('Project saved:', projectName);
    } catch (err) {
      console.error('Save failed:', err);
      if (err.name === 'NotAllowedError') {
        setProjectFileHandle(null);
        setProjectName(null);
        alert('ファイルへのアクセス権限が失われました。新規保存してください。');
      } else {
        alert('保存に失敗しました: ' + err.message);
      }
    }
  }, [
    projectFileHandle,
    projectName,
    getProjectData,
    setShowExportModal,
    setProjectFileHandle,
    setProjectName,
  ]);

  // --- Import Project Helpers ---

  // 1. Check for Conflicts
  const checkImportConflicts = useCallback(
    async (file) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const conflicts = [];
        // Check CM Ranges
        if (cmSystem.cmRanges.length > 0 && data.cmRanges && data.cmRanges.length > 0) {
          conflicts.push('cmRanges');
        }
        // Check Time Sync
        if (
          (videoStartTimeStr || logSystem.startTimeStr || logSystem.startDateStr) &&
          (data.videoStartTimeStr || data.startTimeStr || data.startDateStr)
        ) {
          conflicts.push('timeSync');
        }

        // Return parsed data and conflicts found
        return { data, conflicts, file };
      } catch (e) {
        console.error('Failed to parse project file', e);
        throw new Error('Invalid Project File');
      }
    },
    [cmSystem.cmRanges, videoStartTimeStr, logSystem.startTimeStr, logSystem.startDateStr]
  );

  // 2. Apply Import Data
  const applyImportData = useCallback(
    (data, file, fileHandle = null, overwriteSettings = false) => {
      // Apply Settings (with overwrite check)
      // If overwriteSettings is TRUE, we apply everything from data.
      // If overwriteSettings is FALSE, we ONLY apply if current is empty.

      if (data.cmRanges) {
        if (overwriteSettings || cmSystem.cmRanges.length === 0) {
          // Note: recalculateCmVideoTimes in useCMSystem handles backward compatibility:
          // 1. videoStart (New standard) -> Used as anchor
          // 2. logicalStart (Short-lived format) -> Converted to videoStart
          // 3. logStart (Legacy format) -> Converted to videoStart
          cmSystem.setCmRanges(data.cmRanges);
        }
      }

      if (data.videoStartTimeStr !== undefined) {
        if (overwriteSettings || !videoStartTimeStr) {
          setVideoStartTimeStr(data.videoStartTimeStr);
        }
      }

      if (data.startTimeStr !== undefined) {
        if (overwriteSettings || !logSystem.startTimeStr) {
          logSystem.setStartTimeStr(data.startTimeStr);
        }
      }

      if (data.startDateStr !== undefined) {
        if (overwriteSettings || !logSystem.startDateStr) {
          logSystem.setStartDateStr(data.startDateStr);
        }
      }

      // Always append/merge these or overwrite?
      // For NGs and overrides, merging is safer, but "Project Load" implies state restoration.
      // Let's overwrite NGs if they exist in file to match "Project Load" semantic.
      if (data.ngSettings) {
        logSystem.setNgSettings({
          ids: data.ngSettings.ids || [],
          comments: data.ngSettings.comments || [],
          words: data.ngSettings.words || [],
        });
      }

      // Load Files (Always append or replace? Usually project load implies the workspace state)
      // Let's assume we ADD files from project.
      if (data.loadedFiles) logSystem.loadProject(data.loadedFiles);

      if (data.aaOverrideMap) setAaOverrideMap(data.aaOverrideMap);

      if (data.endCardSettings) {
        if (overwriteSettings || !endCardSettings?.enabled) {
          setEndCardSettings(data.endCardSettings);
        }
      }

      // Force enable auto-scroll on project load to ensure sidebar aligns with initial time
      if (setIsAutoScroll) setIsAutoScroll(true);

      if (fileHandle) {
        setProjectFileHandle(fileHandle);
        setProjectName(file.name.replace('.json', ''));
      } else if (file) {
        setProjectName(file.name.replace('.json', ''));
      }

      // File Path Logic
      if (file) {
        // We can't easily get full path from File object in browser,
        // but if we are using File System Access API (fileHandle), we might have context.
        // However, for web compatibility, we just rely on what we have.
        setProjectDirPath(null); // Reset or Try to infer?
      }

      if (data.videoFileName) {
        setRequestedVideoName(data.videoFileName);
        if (data.videoFilePath) {
          setRequestedVideoPath(data.videoFilePath);
        }
        setShowVideoRequestModal(true);
      }

      if (data.videoUrl) {
        setRequestedVideoUrl(data.videoUrl);
        if (data.referer) {
          setRequestedReferer(data.referer);
        }
      }
    },
    [
      cmSystem,
      logSystem,
      videoStartTimeStr,
      setVideoStartTimeStr,
      setAaOverrideMap,
      setProjectFileHandle,
      setProjectName,
      setRequestedVideoName,
      setRequestedVideoPath,
      setRequestedVideoUrl,
      setRequestedReferer,
      setShowVideoRequestModal,
      setProjectDirPath,
      endCardSettings,
      setEndCardSettings,
      setIsAutoScroll,
    ]
  );

  // Original processImportFile (Restored/Modified for backward compat or simple usage)
  const processImportFile = useCallback(
    async (file, fileHandle = null) => {
      // Note: This function blindly applies without checking conflicts now?
      // Or should we remove it?
      // existing handleImport logic uses checkImportConflicts in App.jsx now.
      // Only kept if used internally or we want a default behavior.
      // Let's delegate to applyImportData with overwrite=true by default for simple load?
      // But wait, the previous logic was "Blindly overwrite".
      // The NEW Requirement is "Do not overwrite".
      // So default behavior here should be overwrite=false or just use new flow.

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        applyImportData(data, file, fileHandle, false); // Default no overwrite for safety?
      } catch (e) {
        console.error(e);
      }
    },
    [applyImportData]
  );

  const handleImport = useCallback(
    async (fileOrEvent) => {
      let file = fileOrEvent;
      let fileHandle = null;

      if (fileOrEvent && fileOrEvent.target && fileOrEvent.target.files) {
        file = fileOrEvent.target.files[0];
      }

      if (!file || !(file instanceof File)) {
        // Use Web File System Access API if available
        if ('showOpenFilePicker' in window) {
          try {
            const [handle] = await window.showOpenFilePicker({
              types: [
                {
                  description: 'Danmaku Project JSON',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            });
            fileHandle = handle;
            file = await handle.getFile();
            processImportFile(file, fileHandle);
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn('File System Access API failed, falling back...', err);
          }
        }

        // Fallback to input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const f = e.target.files[0];
          if (f) processImportFile(f);
        };
        input.click();
        return;
      }

      processImportFile(file);
    },
    [processImportFile]
  );

  // --- CM/NG Handlers ---
  const handleSetCmStart = useCallback(
    (time) => {
      const startSec = logSystem.startTimeStr
        ? logSystem.startTimeStr.split(':').reduce((acc, v) => acc * 60 + Number(v), 0)
        : 0;
      const targetSec = startSec + time;

      // Handle day overflow
      const days = Math.floor(targetSec / 86400);
      const remainingSec = targetSec % 86400;

      const h = Math.floor(remainingSec / 3600);
      const m = Math.floor((remainingSec % 3600) / 60);
      const s = Math.floor(remainingSec % 60);
      const timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      cmSystem.setCmStartInput(timeStr);

      console.log('[handleSetCmStart] InputTime:', time, 'StartDateStr:', logSystem.startDateStr);

      // Handle Date if startDateStr exists
      if (logSystem.startDateStr) {
        // Parse explicitly as local YMD to avoid UTC shifts
        const parts = logSystem.startDateStr.split('-').map(Number);
        if (parts.length === 3) {
          const [oy, om, od] = parts;
          const date = new Date(oy, om - 1, od);

          if (!isNaN(date.getTime())) {
            date.setDate(date.getDate() + days);
            const y = date.getFullYear();
            const mo = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const newDateStr = `${y}-${mo}-${d}`;

            cmSystem.setCmStartDateInput(newDateStr);
            console.log(
              '[handleSetCmStart] Setting Date:',
              newDateStr,
              `(Origin: ${logSystem.startDateStr} + ${days} days)`
            );
          } else {
            console.warn('[handleSetCmStart] Invalid Date Object');
          }
        } else {
          console.warn('[handleSetCmStart] Invalid StartDate format');
        }
      } else {
        console.log('[handleSetCmStart] No startDateStr set');
      }
    },
    [cmSystem, logSystem.startTimeStr, logSystem.startDateStr]
  );

  const handleSetCmEnd = useCallback(
    (time) => {
      const startSec = logSystem.startTimeStr
        ? logSystem.startTimeStr.split(':').reduce((acc, v) => acc * 60 + Number(v), 0)
        : 0;
      const targetSec = startSec + time;

      // Handle day overflow
      const days = Math.floor(targetSec / 86400);
      const remainingSec = targetSec % 86400;

      const h = Math.floor(remainingSec / 3600);
      const m = Math.floor((remainingSec % 3600) / 60);
      const s = Math.floor(remainingSec % 60);
      const timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      cmSystem.setCmEndInput(timeStr);

      console.log('[handleSetCmEnd] InputTime:', time, 'StartDateStr:', logSystem.startDateStr);

      // Handle Date if startDateStr exists
      if (logSystem.startDateStr) {
        // Parse explicitly as local YMD
        const parts = logSystem.startDateStr.split('-').map(Number);
        if (parts.length === 3) {
          const [oy, om, od] = parts;
          const date = new Date(oy, om - 1, od);

          if (!isNaN(date.getTime())) {
            date.setDate(date.getDate() + days);
            const y = date.getFullYear();
            const mo = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const newDateStr = `${y}-${mo}-${d}`;

            cmSystem.setCmEndDateInput(newDateStr);
            console.log(
              '[handleSetCmEnd] Setting Date:',
              newDateStr,
              `(Origin: ${logSystem.startDateStr} + ${days} days)`
            );
          } else {
            console.warn('[handleSetCmEnd] Invalid Date Object');
          }
        } else {
          console.warn('[handleSetCmEnd] Invalid StartDate format');
        }
      } else {
        console.log('[handleSetCmEnd] No startDateStr set');
      }
    },
    [cmSystem, logSystem.startTimeStr, logSystem.startDateStr]
  );

  const handleSetLogStart = useCallback(
    (comment) => {
      console.log('Set Log Start request for comment:', comment.id, comment.time);

      const time = comment.time;
      const h = Math.floor(time / 3600);
      const m = Math.floor((time % 3600) / 60);
      const s = Math.floor(time % 60);
      const timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      logSystem.setStartTimeStr(timeStr);

      // Handle Date if startDateStr exists (Log Start Date Sync)
      // If we are setting the Log Start Time to this comment's times,
      // strictly speaking, we are just changing the OFFSET.
      // But if the user implies "This comment happened at X date",
      // we might need to adjust the start date?
      // For now, let's just set the Time Offset as that is the primary function.
      // But if we want to sync valid date...

      // Handle day overflow for Date as well?
      // If comment time is > 24h, and we set that as Start Time,
      // Valid Start Time usually 0-23.
      // DanmakuPlayer allows >24h start time? Yes.

      console.log('[handleSetLogStart] Set StartTime:', timeStr);
    },
    [logSystem]
  );

  const handleAddNgId = useCallback(
    (userId) => {
      logSystem.addNgId(userId);
    },
    [logSystem]
  );

  const handleAddNgComment = useCallback(
    (text) => {
      logSystem.addNgComment(text);
    },
    [logSystem]
  );

  return {
    autoPlayRequestedRef,
    handleVideoUrlSubmit,
    handleSeekAndPlay,
    createKeyDownHandler,
    getProjectData,
    handleSaveProject,
    processImportFile,
    handleImport, // Kept for file picker fallback, but App.jsx might override
    checkImportConflicts, // Exported
    applyImportData, // Exported
    handleSetCmStart,
    handleSetCmEnd,
    handleSetLogStart,
    handleAddNgId,
    handleAddNgComment,
    handleAddNgWord: logSystem.addNgWord, // Expose
    handleRemoveNgId: logSystem.removeNgId, // Expose (if needed by context menu etc)
    handleRemoveNgComment: logSystem.removeNgComment, // Expose
    handleRemoveNgWord: logSystem.removeNgWord, // Expose
  };
}
