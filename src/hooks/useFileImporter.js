import { useCallback, useState } from 'react';

export const useFileImporter = ({
  checkImportConflicts,
  applyImportData,
  setConfirmModalState,
  closeConfirmModal,
}) => {
  const handleImport = useCallback(
    async (fileOrEvent) => {
      let file = fileOrEvent;
      let fileHandle = null;

      if (fileOrEvent && fileOrEvent.target && fileOrEvent.target.files) {
        file = fileOrEvent.target.files[0];
      }

      const performImport = async (f, fh) => {
        try {
          const { data, conflicts } = await checkImportConflicts(f);

          if (conflicts.length > 0) {
            // Show Conflict Modal
            setConfirmModalState({
              isOpen: true,
              title: '設定の上書き確認',
              message: `現在の設定（${conflicts.join(
                '・'
              )}）が存在します。\nインポートするプロジェクトの設定で上書きしますか？\n\n「いいえ」を選ぶと、現在の設定を維持しつつプロジェクトを結合します。`,
              type: 'info',
              confirmText: '上書きする',
              cancelText: '維持する（いいえ）',
              onConfirm: () => {
                applyImportData(data, f, fh, true); // Overwrite = true
                closeConfirmModal();
              },
              onCancel: () => {
                applyImportData(data, f, fh, false); // Overwrite = false
                closeConfirmModal();
              },
            });
          } else {
            // No conflicts, just apply
            applyImportData(data, f, fh, true);
          }
        } catch (e) {
          alert('Import Error: ' + e.message);
        }
      };

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
            performImport(file, fileHandle);
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
          if (f) performImport(f);
        };
        input.click();
        return;
      }

      performImport(file);
    },
    [checkImportConflicts, applyImportData, setConfirmModalState, closeConfirmModal]
  );

  // --- Drag and Drop Handlers ---
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleImport(files[0]);
      }
    },
    [handleImport]
  );

  return { handleImport, isDragOver, handleDragOver, handleDragLeave, handleDrop };
};
