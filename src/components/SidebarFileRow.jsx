import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import React from 'react';

import { getLogFileColor } from '../utils/danmakuUtils';
import ColorPicker from './ui/ColorPicker';

const SidebarFileRow = ({
  file,
  handleToggleFileVisibility,
  handleRemoveFile,
  handleRenameFile,
  onColorChange, // (fileId, color) => void - カスタムカラー変更
  firstAbsoluteTime, // 計算済みの最初のコメントのabsoluteTime（Abemaログ用）
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(file.title || file.name);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const colorButtonRef = React.useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  // 日時の取得: startDate優先、なければfirstAbsoluteTime、なければrawCommentsから計算
  const getDisplayDate = () => {
    // 1. startDateが存在する場合（従来ログ）
    if (file.startDate && file.startDate > 0) {
      return file.startDate;
    }

    // 2. 親から渡されたfirstAbsoluteTimeを使用（Abemaログなど）
    if (firstAbsoluteTime && firstAbsoluteTime > 0) {
      return firstAbsoluteTime;
    }

    // 3. rawCommentsから取得を試みる（フォールバック）
    if (file.rawComments && file.rawComments.length > 0) {
      const firstComment = file.rawComments[0];

      // absoluteTimeが既に設定されている場合
      if (firstComment.absoluteTime && firstComment.absoluteTime > 0) {
        return firstComment.absoluteTime;
      }

      // rawTimeが絶対時間として有効な場合（2000年以降）
      if (firstComment.rawTime && firstComment.rawTime > 946684800000) {
        return firstComment.rawTime;
      }
    }

    return null;
  };

  const displayDate = getDisplayDate();
  const dateStr = displayDate
    ? new Date(displayDate).toLocaleString('ja-JP', {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch bg-gray-900 p-2 rounded border border-gray-700 text-xs gap-2 group/item touch-none ${
        isEditing ? 'border-blue-500 ring-1 ring-blue-500' : ''
      }`}
    >
      {/* 左側: ドラッグハンドル + Eye + カラー */}
      <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
        {/* ドラッグハンドル */}
        <div
          className="text-gray-600 group-hover/item:text-gray-400 cursor-grab active:cursor-grabbing outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
        {/* Eye + カラー縦配置 */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleToggleFileVisibility(file.id)}
            className={`${file.isVisible !== false ? 'text-blue-400' : 'text-gray-600'}`}
            title={file.isVisible !== false ? '非表示にする' : '表示する'}
          >
            {file.isVisible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {onColorChange && (
            <div className="relative">
              <button
                ref={colorButtonRef}
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-3.5 h-3.5 rounded-full border border-gray-600 hover:border-gray-400 transition"
                style={{
                  backgroundColor: file.customColor || getLogFileColor(file.colorIndex ?? 0),
                }}
                title="色を変更"
              />
              {showColorPicker && (
                <ColorPicker
                  selected={file.customColor}
                  onSelect={(color) => {
                    onColorChange(file.id, color);
                    setShowColorPicker(false);
                  }}
                  onClose={() => setShowColorPicker(false)}
                  triggerRef={colorButtonRef}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 中央: ログ名 + 日時 */}
      <div className="flex flex-col justify-center overflow-hidden pointer-events-auto flex-1 min-w-0">
        {isEditing ? (
          <textarea
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveName();
              } else if (e.key === 'Escape') {
                setEditName(file.title || file.name);
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
            className="bg-gray-800 text-white px-1 py-0.5 rounded outline-none w-full min-w-0 resize-none text-xs leading-normal"
            rows={3}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span
              className={`font-mono break-all leading-tight ${
                file.isVisible === false ? 'text-gray-600' : 'text-gray-300'
              }`}
              title={file.title || file.name}
            >
              {file.title || file.name}
            </span>
            <span
              className={`text-gray-500 text-[10px] ${
                file.isVisible === false ? 'opacity-30' : ''
              }`}
            >
              {dateStr && `${dateStr} `}({file.rawComments?.length || 0})
            </span>
          </>
        )}
      </div>

      {/* 右側: Edit + 削除縦配置 */}
      <div className="flex flex-col items-center justify-center gap-1 shrink-0 pointer-events-auto">
        {!isEditing && (
          <button
            onClick={() => {
              setEditName(file.title || file.name);
              setIsEditing(true);
            }}
            className="text-gray-500 hover:text-blue-400 p-0.5 transition"
            title="名前を変更"
          >
            <Edit2 size={12} />
          </button>
        )}
        <button
          onClick={() => handleRemoveFile(file.id)}
          className="text-gray-500 hover:text-red-400 p-0.5 transition"
          title="削除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default SidebarFileRow;
