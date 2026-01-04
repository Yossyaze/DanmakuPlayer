import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import React from 'react';

const SidebarFileRow = ({ file, index, handleToggleFileVisibility, handleRemoveFile }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between bg-gray-900 p-2 rounded border border-gray-700 text-xs gap-2 group/item touch-none`}
    >
      <div className="flex items-start gap-2 overflow-hidden pointer-events-none">
        <div
          className="mt-0.5 text-gray-600 group-hover/item:text-gray-400 pointer-events-auto cursor-grab active:cursor-grabbing outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
        <div className="flex flex-col overflow-hidden pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleFileVisibility(file.id)}
              className={`shrink-0 ${file.isVisible !== false ? 'text-blue-400' : 'text-gray-600'}`}
              title={file.isVisible !== false ? '非表示にする' : '表示する'}
            >
              {file.isVisible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <span
              className={`font-mono break-all ${file.isVisible === false ? 'text-gray-600' : 'text-gray-300'}`}
              title={file.name}
            >
              {file.name}
            </span>
          </div>
          {dateStr && (
            <span
              className={`text-gray-500 text-[10px] ml-6 ${file.isVisible === false ? 'opacity-30' : ''}`}
            >
              {dateStr} ({file.rawComments.length})
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => handleRemoveFile(file.id)}
        className="text-gray-500 hover:text-red-400 p-1 transition shrink-0 pointer-events-auto"
        title="削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default SidebarFileRow;
