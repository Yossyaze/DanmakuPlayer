import { X } from 'lucide-react';
import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { useContextMenu } from '../../hooks/useContextMenu';
import CommentItem from './CommentItem';
import LogCommentItem from './LogCommentItem';
import { Z_INDEX } from '../../constants/zIndex';

/**
 * CommentPopup - 統合コメントポップアップコンポーネント
 *
 * 3つのモードを1つのコンポーネントで実現:
 * - type="anchor": 単一コメント表示（アンカー参照）
 * - type="reply": 複数コメント表示（返信リスト）
 * - type="userHistory": 複数コメント表示（ユーザー履歴）
 */
const CommentPopup = ({
  // === 表示タイプ ===
  type = 'anchor', // 'anchor' | 'reply' | 'userHistory'

  // === コンテンツ ===
  comment, // 単一コメント（anchor用）
  comments = [], // 複数コメント（reply/userHistory用）
  userId, // ユーザーID（userHistory用）
  parentComment, // 参照元コメント（reply用のヘッダー表示）
  allComments = [], // ユーザー履歴フィルタリング用の全コメント

  // === 位置・サイズ ===
  position = { x: 0, y: 0 },
  parentRect,
  customWidth,
  minX = 10,
  style = {},

  // === 表示設定 ===
  formatTime,
  logStartTime = 0,
  settings = {},
  totalComments,
  RowComponent = null, // null の場合、type に応じてデフォルトを使用

  // === イベントハンドラー ===
  onClose,
  onPopupClick, // ポップアップクリック時（上位レイヤーを閉じる）
  onClick, // 行クリック時（コンテキストメニュー表示）
  onAnchorClick,
  onReplyCountClick,
  onIdClick,
  setZoomedImage,

  // === ポップアップスタック制御 ===
  isTopmost = true,

  // === AA/その他 ===
  aaOverrideMap = {},
  popupClassName = '',

  // === ユーザー履歴用追加props ===
  onSeek,
  onJumpToComment,
  onAddNgId,
  onAddNgComment,
  onSetLogStart,
  onSetCmStart,
  onSetCmEnd,
  onSetEndCardPreview,
  onToggleAA,
  aaMode,
  currentTime,
  maxWidth,
}) => {
  const popupRef = useRef(null);
  const { openMenu, menuState } = useContextMenu();

  // === ユーザー履歴用: コメントフィルタリング ===
  const userComments = useMemo(() => {
    if (type !== 'userHistory' || !userId) return [];
    const filtered = allComments.filter((c) => c.userId === userId).sort((a, b) => a.time - b.time);
    const userTotal = filtered.length;
    return filtered.map((c, index) => ({
      ...c,
      userIndex: index + 1,
      userTotal: userTotal,
    }));
  }, [type, userId, allComments]);

  // 表示するコメントリストを決定
  const displayComments = useMemo(() => {
    if (type === 'anchor') return comment ? [comment] : [];
    if (type === 'userHistory') return userComments;
    return comments;
  }, [type, comment, comments, userComments]);

  // === 位置調整ロジック（userHistoryモードでは使用しない）===
  useLayoutEffect(() => {
    // userHistoryモードは親コンテナに配置されるため位置調整不要
    if (type === 'userHistory') return;
    if (!popupRef.current) return;

    const rect = popupRef.current.getBoundingClientRect();
    let { x, y } = position;

    const spacing = 4;
    if (parentRect) {
      if (parentRect.bottom + rect.height + spacing <= window.innerHeight) {
        y = parentRect.bottom + spacing;
      } else if (parentRect.top - rect.height - spacing >= 0) {
        y = parentRect.top - rect.height - spacing;
      } else {
        y = Math.max(10, window.innerHeight - rect.height - 10);
      }

      if (customWidth) {
        x = minX;
      } else {
        x = Math.max(10, Math.min(position.x, window.innerWidth - rect.width - 20));
      }
    } else {
      if (y + rect.height + 10 > window.innerHeight) {
        y = Math.max(10, window.innerHeight - rect.height - 10);
      } else {
        y = position.y + 10;
      }

      if (x + rect.width + 10 > window.innerWidth) {
        x = window.innerWidth - rect.width - 20;
      } else {
        x = position.x + 10;
      }
    }

    if (x < minX) x = minX;
    if (y < 0) y = 10;

    popupRef.current.style.top = `${y}px`;
    popupRef.current.style.left = `${x}px`;
  }, [type, position, parentRect, displayComments.length, minX, customWidth]);

  // === ヘッダー内容を決定 ===
  const renderHeader = () => {
    switch (type) {
      case 'anchor':
        return (
          <div className="flex gap-2">
            <span>Ref: {comment?.originalResNum || comment?.resNum}</span>
            <span>{comment?.sourceFileId}</span>
          </div>
        );
      case 'reply':
        return (
          <div className="flex items-center gap-2">
            <span>
              Replies: &gt;&gt;
              {parentComment?.originalResNum || parentComment?.resNum}
            </span>
            <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
              {displayComments.length}件
            </span>
          </div>
        );
      case 'userHistory':
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">ID: {userId}</span>
            <span className="text-gray-400">({displayComments.length})</span>
          </div>
        );
      default:
        return null;
    }
  };

  // === 行クリックハンドラー ===
  const handleRowClick = (e, clickedComment) => {
    if (type === 'userHistory') {
      // ユーザー履歴: コンテキストメニューを開く
      openMenu(clickedComment, {
        maxWidth,
        handlers: {
          onSeek,
          onJumpToComment,
          onSetLogStart,
          onSetCmStart,
          onSetCmEnd,
          onSetEndCardPreview,
          onAddNgId,
          onAddNgComment,
          onToggleAA,
        },
        config: {
          formatTime,
          logStartTime,
          totalComments,
          aaMode,
          aaOverride: aaOverrideMap[clickedComment.id],
        },
      });
    } else if (onClick) {
      // anchor/reply: 親から渡された onClick を実行
      onClick(e, clickedComment);
    }
  };

  // === RowComponent の決定 ===
  const ItemComponent = RowComponent || (type === 'userHistory' ? CommentItem : LogCommentItem);

  // === userHistoryモード専用レンダリング ===
  if (type === 'userHistory') {
    return (
      <div ref={popupRef} className="flex flex-col h-full w-full bg-gray-900">
        {/* ヘッダー */}
        <div className="bg-gray-800/80 px-3 py-2 border-b border-gray-700 flex justify-between items-center shrink-0 select-none">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate">ID: {userId}</h2>
            <span className="text-gray-400 text-xs">({displayComments.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto w-full p-0 scrollbar-thin scrollbar-thumb-gray-700">
          {displayComments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">投稿が見つかりませんでした</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {displayComments.map((c) => (
                <ItemComponent
                  key={c.id}
                  comment={c}
                  formatTime={formatTime}
                  logStartTime={logStartTime}
                  totalComments={totalComments}
                  onClick={(e) => handleRowClick(e, c)}
                  className={menuState?.comment?.id === c.id ? 'bg-gray-800!' : ''}
                  onIdClick={undefined}
                  setZoomedImage={setZoomedImage}
                  showImages={settings.showImages !== false}
                  onAnchorClick={onAnchorClick}
                  settings={settings}
                  currentTime={currentTime}
                  depth={0}
                  aaOverride={aaOverrideMap[c.id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === 通常のポップアップレンダリング ===
  return (
    <div
      ref={popupRef}
      className={`fixed bg-gray-900 border border-gray-600 rounded shadow-2xl animate-fade-in pointer-events-auto flex flex-col ${
        type !== 'anchor' ? 'max-h-[60vh]' : ''
      } ${!customWidth && !popupClassName ? 'w-96' : ''} ${popupClassName}`}
      style={{
        top: position.y,
        left: position.x,
        width: customWidth
          ? typeof customWidth === 'number'
            ? `${customWidth}px`
            : customWidth
          : undefined,
        zIndex: style.zIndex || Z_INDEX.popup,
        ...style,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onPopupClick && onPopupClick();
      }}
    >
      {/* ヘッダー */}
      <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center shrink-0 select-none">
        {renderHeader()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose && onClose();
          }}
          className="p-0.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* コンテンツ */}
      <div className={`${type !== 'anchor' ? 'overflow-y-auto scrollbar-thin p-1' : ''}`}>
        {displayComments.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">
            {type === 'userHistory' ? '投稿が見つかりませんでした' : 'コメントがありません'}
          </div>
        ) : (
          displayComments.map((c, index) => {
            // 返信リスト用の階層表示
            const prevDepth = index > 0 ? displayComments[index - 1].depth || 0 : 0;
            const currentDepth = c.depth || 0;
            const depthDecrease = prevDepth - currentDepth;

            return (
              <React.Fragment key={c.id}>
                {type === 'reply' && depthDecrease > 0 && index > 0 && (
                  <div
                    className="border-t border-gray-700"
                    style={{ marginLeft: `${currentDepth * 16}px` }}
                  />
                )}
                <ItemComponent
                  comment={c}
                  depth={type === 'reply' ? currentDepth : 0}
                  formatTime={formatTime}
                  logStartTime={logStartTime}
                  settings={{ ...settings, density: 'compact' }}
                  className={`bg-gray-900 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800 ${
                    menuState?.comment?.id === c.id ? 'bg-gray-800!' : ''
                  }`}
                  onClick={isTopmost ? (e) => handleRowClick(e, c) : undefined}
                  onAnchorClick={onAnchorClick}
                  onReplyCountClick={onReplyCountClick}
                  onIdClick={type === 'userHistory' ? undefined : onIdClick}
                  setZoomedImage={setZoomedImage}
                  totalComments={totalComments}
                  aaOverride={aaOverrideMap[c.id]}
                  showImages={settings.showImages !== false}
                  currentTime={currentTime}
                />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentPopup;
