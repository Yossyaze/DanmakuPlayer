import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import React from 'react';

const SidebarFileRow = ({
  file,
  handleToggleFileVisibility,
  handleRemoveFile,
  handleRenameFile,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(file.title || file.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  const dateStr = file.startDate
    ? new Date(file.startDate).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleSaveName = () => {
    if (editName && editName.trim() && editName !== (file.title || file.name)) {
      handleRenameFile(file.id, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(file.title || file.name);
      setIsEditing(false);
    }
    e.stopPropagation(); // Prevent sidebar generic key handlers
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between bg-gray-900 p-2 rounded border border-gray-700 text-xs gap-2 group/item touch-none ${
        isEditing ? 'border-blue-500 ring-1 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-2 overflow-hidden pointer-events-none flex-1 min-w-0">
        <div
          className="mt-0.5 text-gray-600 group-hover/item:text-gray-400 pointer-events-auto cursor-grab active:cursor-grabbing outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
        <div className="flex flex-col overflow-hidden pointer-events-auto flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleFileVisibility(file.id)}
              className={`shrink-0 ${file.isVisible !== false ? 'text-blue-400' : 'text-gray-600'}`}
              title={file.isVisible !== false ? '非表示にする' : '表示する'}
            >
              {file.isVisible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="bg-gray-800 text-white px-1 py-0.5 rounded outline-none w-full min-w-0"
                autoFocus
              />
            ) : (
              <span
                className={`font-mono break-all truncate ${
                  file.isVisible === false ? 'text-gray-600' : 'text-gray-300'
                }`}
                title={file.title || file.name}
              >
                {file.title || file.name}
              </span>
            )}
          </div>
          {!isEditing && dateStr && (
            <span
              className={`text-gray-500 text-[10px] ml-6 ${
                file.isVisible === false ? 'opacity-30' : ''
              }`}
            >
              {dateStr} ({file.rawComments.length})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
        {!isEditing && (
          <button
            onClick={() => {
              setEditName(file.title || file.name);
              setIsEditing(true);
            }}
            className="text-gray-500 hover:text-blue-400 p-1 transition opacity-0 group-hover/item:opacity-100"
            title="名前を変更"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button
          onClick={() => handleRemoveFile(file.id)}
          className="text-gray-500 hover:text-red-400 p-1 transition"
          title="削除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default SidebarFileRow;
