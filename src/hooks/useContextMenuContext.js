import { createContext, useContext } from 'react';

// コンテキストメニューの状態を共有するためのコンテキスト
export const ContextMenuContext = createContext(null);

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
