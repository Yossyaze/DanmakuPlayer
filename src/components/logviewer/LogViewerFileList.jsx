import { Edit2, Trash2 } from 'lucide-react';
import React from 'react';

/**
 * LogViewerFileList - ログビューアの左サイドバー (ファイルリスト)
 */
const LogViewerFileList = ({ files, selectedFileId, onSelectFile, onRemoveFile, onRenameFile }) => {
  const [editingFileId, setEditingFileId] = React.useState(null);
  const [editName, setEditName] = React.useState('');

  const handleStartEdit = (file) => {
    setEditingFileId(file.id);
    setEditName(file.name || file.title || '');
  };

  const handleSaveRename = (fileId) => {
    if (onRenameFile && editName.trim()) {
      onRenameFile(fileId, editName);
    }
    setEditingFileId(null);
  };

  if (files.length === 0) return null;

  return (
    <div className="w-64 h-full shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col min-h-0 transition-all duration-300">
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loaded Logs</h3>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        <button
          onClick={() => onSelectFile('all')}
          className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors ${
            selectedFileId === 'all'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <span className="font-medium block">全て表示</span>
          <div className="text-xs text-gray-500 mt-1">All Comments</div>
        </button>

        {files.map((file) => {
          const isEditing = editingFileId === file.id;

          return (
            <div key={file.id} className="relative group">
              <div
                onClick={() => !isEditing && onSelectFile(file.id)}
                className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors pr-9 cursor-pointer ${
                  selectedFileId === file.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {isEditing ? (
                  <textarea
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveRename(file.id);
                      } else if (e.key === 'Escape') {
                        setEditingFileId(null);
                      }
                      e.stopPropagation();
                    }}
                    className="w-full bg-gray-900 text-white rounded px-1 py-0.5 outline-none border border-blue-500 resize-none text-xs leading-normal"
                    rows={3}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="font-medium text-gray-200 leading-snug wrap-break-word"
                    title={file.name || file.title}
                  >
                    {file.name || file.title || 'Unknown File'}
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-gray-600 group-hover:text-gray-500 mt-1.5">
                  <span className="max-w-[70%] break-all">{file.filename || 'log.dat'}</span>
                  <span>{file.count || 0}</span>
                </div>
              </div>

              {!isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRenameFile) handleStartEdit(file);
                    }}
                    className={`p-1.5 rounded transition-colors ${onRenameFile ? 'text-gray-500 hover:text-blue-400 hover:bg-gray-700/50' : 'text-gray-700 cursor-not-allowed'}`}
                    title="名前を変更"
                    disabled={!onRenameFile}
                  >
                    <Edit2 size={16} />
                  </button>
                  {onRemoveFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('このログファイルを削除しますか？')) {
                          onRemoveFile(file.id);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogViewerFileList;
