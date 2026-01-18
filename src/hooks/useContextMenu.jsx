import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import CommentContextMenu from '../components/ui/CommentContextMenu';

// コンテキストメニューのコンテキスト
const ContextMenuContext = createContext(null);

/**
 * コンテキストメニューのプロバイダー
 * アプリレベルで1つだけCommentContextMenuを持ち、全コンポーネントから統一的に呼び出せるようにする
 */
export const ContextMenuProvider = ({ children }) => {
  const [menuState, setMenuState] = useState(null);
  // menuState: { comment, maxWidth, handlers, config }

  /**
   * コンテキストメニューを開く
   * @param {Object} comment - 対象のコメントオブジェクト
   * @param {Object} options - オプション
   * @param {number} options.maxWidth - メニューの最大横幅
   * @param {Object} options.handlers - コンポーネント固有のハンドラー
   * @param {Object} options.config - 表示設定（formatTime, logStartTimeなど）
   */
  const openMenu = useCallback((comment, options = {}) => {
    setMenuState({
      comment,
      maxWidth: options.maxWidth || null,
      handlers: options.handlers || {},
      config: options.config || {},
    });
  }, []);

  /**
   * コンテキストメニューを閉じる
   */
  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  // Escapeキーでメニューを閉じる
  useEffect(() => {
    if (!menuState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuState, closeMenu]);

  return (
    <ContextMenuContext.Provider value={{ menuState, openMenu, closeMenu }}>
      {children}

      {/* グローバルなコンテキストメニュー */}
      {menuState && (
        <>
          {/* 1. 全画面クリック検知用（透明） */}
          <div className="fixed inset-0 z-context-backdrop" onClick={closeMenu} />

          {/* 2. 暗転用レイヤー（視覚効果のみ） */}
          <div
            className="fixed bg-black/50 z-context pointer-events-none"
            style={
              menuState.maxWidth
                ? { top: 0, bottom: 0, right: 0, width: menuState.maxWidth }
                : { inset: 0 }
            }
          />

          <CommentContextMenu
            comment={menuState.comment}
            maxWidth={menuState.maxWidth}
            onClose={closeMenu}
            // ナビゲーション
            onSeek={(time) => {
              menuState.handlers.onSeek?.(time);
              closeMenu();
            }}
            onJumpToComment={
              menuState.handlers.onJumpToComment
                ? (comment) => {
                    menuState.handlers.onJumpToComment(comment);
                    closeMenu();
                  }
                : undefined
            }
            // 時間設定
            onSetLogStart={(comment) => {
              menuState.handlers.onSetLogStart?.(comment);
              closeMenu();
            }}
            onSetCmStart={(time) => {
              menuState.handlers.onSetCmStart?.(time);
              closeMenu();
            }}
            onSetCmEnd={(time) => {
              menuState.handlers.onSetCmEnd?.(time);
              closeMenu();
            }}
            onSetEndCardPreview={(time) => {
              menuState.handlers.onSetEndCardPreview?.(time);
              closeMenu();
            }}
            // NG管理
            onAddNgId={(userId) => {
              menuState.handlers.onAddNgId?.(userId);
              closeMenu();
            }}
            onAddNgComment={(commentId) => {
              menuState.handlers.onAddNgComment?.(commentId);
              closeMenu();
            }}
            // コピー
            onCopyId={(id) => {
              navigator.clipboard.writeText(id);
              closeMenu();
            }}
            onCopyComment={(text) => {
              navigator.clipboard.writeText(text);
              closeMenu();
            }}
            // AA表示
            aaMode={menuState.config.aaMode}
            aaOverride={menuState.config.aaOverride}
            onToggleAA={(comment, isAA) => {
              menuState.handlers.onToggleAA?.(comment, isAA);
              closeMenu();
            }}
            // 表示設定
            formatTime={menuState.config.formatTime}
            logStartTime={menuState.config.logStartTime}
            totalComments={menuState.config.totalComments}
          />
        </>
      )}
    </ContextMenuContext.Provider>
  );
};

/**
 * コンテキストメニューを操作するためのフック
 * @returns {{ openMenu: Function, closeMenu: Function, menuState: Object|null }}
 */
export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider');
  }
  return context;
};

export default useContextMenu;
