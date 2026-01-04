import { X } from 'lucide-react';
import React from 'react';

const NgList = ({ ngSettings, removeNgId, removeNgComment, allComments, onIdClick }) => {
  return (
    <div className="space-y-5">
      {/* NG IDs */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>ID ({ngSettings?.ids?.length || 0})</span>
        </div>
        {ngSettings?.ids?.length > 0 ? (
          <div className="bg-gray-950 border border-gray-800 rounded max-h-48 overflow-y-auto scrollbar-thin p-1 space-y-1">
            {ngSettings.ids.map((id) => {
              // Find representative comment for this ID
              const comment = allComments ? allComments.find((c) => c.userId === id) : null;

              if (!comment) {
                // Fallback if no comment found for this ID
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between text-xs bg-gray-900 p-2 rounded border border-gray-800/50 text-gray-500"
                  >
                    <span
                      className="font-mono truncate max-w-[180px] cursor-pointer hover:underline"
                      onClick={() => onIdClick && onIdClick(id)}
                      title="このIDを抽出"
                    >
                      ID:{id} (ログなし)
                    </span>
                    <button
                      onClick={() => removeNgId && removeNgId(id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                      title="解除"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={id}
                  className="flex flex-col gap-1 text-xs bg-gray-900 p-2 rounded border border-gray-800/50 hover:border-gray-700 transition-colors group"
                >
                  {/* Header: ResNum Name Date ID */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap gap-x-2 text-[10px] text-gray-500 leading-tight">
                      <span className="font-bold text-gray-400">
                        {comment.originalResNum || comment.resNum}
                      </span>
                      <span className="truncate max-w-20">{comment.name || '名無しさん'}</span>
                      <span>{comment.dateDisplay}</span>
                      <span
                        className="font-mono text-red-400 font-bold cursor-pointer hover:underline"
                        onClick={() => onIdClick && onIdClick(id)}
                        title="このIDを抽出"
                      >
                        ID:{id}
                      </span>
                    </div>
                    <button
                      onClick={() => removeNgId && removeNgId(id)}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 -mt-1 -mr-1"
                      title="解除"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="text-gray-300 line-clamp-2 leading-snug wrap-break-word">
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-600 text-center py-4 bg-gray-950/50 rounded border border-dashed border-gray-800">
            NG IDはありません
          </div>
        )}
      </div>

      {/* NG Comments */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>単発 ({ngSettings?.comments?.length || 0})</span>
        </div>
        {ngSettings?.comments?.length > 0 ? (
          <div className="bg-gray-950 border border-gray-800 rounded max-h-64 overflow-y-auto scrollbar-thin p-1 space-y-1">
            {ngSettings.comments.map((commentId) => {
              const comment = allComments ? allComments.find((c) => c.id === commentId) : null;
              if (!comment) {
                // Fallback for unknown comments
                return (
                  <div
                    key={commentId}
                    className="flex items-center justify-between text-xs bg-gray-900 p-1.5 rounded text-gray-500"
                  >
                    <span>(不明なコメント: {commentId})</span>
                    <button
                      onClick={() => removeNgComment && removeNgComment(commentId)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                      title="解除"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={commentId}
                  className="flex flex-col gap-1 text-xs bg-gray-900 p-2 rounded border border-gray-800/50 hover:border-gray-700 transition-colors group"
                >
                  {/* Header: ResNum Name Date ID */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap gap-x-2 text-[10px] text-gray-500 leading-tight">
                      <span className="font-bold text-gray-400">
                        {comment.originalResNum || comment.resNum}
                      </span>
                      <span className="truncate max-w-20">{comment.name || '名無しさん'}</span>
                      <span>{comment.dateDisplay}</span>
                      <span className="font-mono">ID:{comment.userId}</span>
                    </div>
                    <button
                      onClick={() => removeNgComment && removeNgComment(commentId)}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 -mt-1 -mr-1"
                      title="解除"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="text-gray-300 line-clamp-2 leading-snug wrap-break-word">
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-600 text-center py-4 bg-gray-950/50 rounded border border-dashed border-gray-800">
            単発NGはありません
          </div>
        )}
      </div>
    </div>
  );
};

export default NgList;
