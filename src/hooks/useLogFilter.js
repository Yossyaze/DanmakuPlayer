import { useCallback, useMemo, useState } from 'react';

import { isProbablyAA } from '../utils/aaUtils';

/**
 * useLogFilter - 検索クエリとフィルタの状態管理を行うカスタムフック
 *
 * @param {Array} filteredComments - NG・ファイルフィルタ済みのコメント配列
 * @returns {Object} 検索・フィルタ関連の状態とアクション
 */
// Keywords that unlock Abe Mode
const ABE_UNLOCK_KEYWORDS = ['安倍', '晋三', '安倍晋三'];

export const useLogFilter = (filteredComments = [], unlockAbeMode = null) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('none'); // 'none' | 'image' | 'popular' | 'url' | 'video' | 'aa' | 'user'
  const [activeUserId, setActiveUserId] = useState(null);

  const [showResultsPopup, setShowResultsPopup] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchHistoryIndex, setSearchHistoryIndex] = useState(-1);

  // Search History (persisted in localStorage)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('danmaku_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Add to search history
  const addToHistory = useCallback((query) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q !== query);
      const newHistory = [query, ...filtered].slice(0, 10); // Max 10 items
      localStorage.setItem('danmaku_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Clear active filter and search
  const clearFilter = useCallback(() => {
    setActiveFilter('none');
    setActiveUserId(null); // Clear user ID
    setActiveSearchQuery('');
    setShowResultsPopup(false);
  }, []);

  // Set active user ID helper
  const setActiveUserIdHelper = useCallback((userId) => {
    setActiveUserId(userId);
    setActiveFilter('user');
    setActiveSearchQuery('');
    setSearchQuery('');
    setShowResultsPopup(true);
    setShowFilterMenu(false);
  }, []);

  // Set active filter helper (clears user ID)
  const setActiveFilterHelper = useCallback((filter) => {
    setActiveFilter(filter);
    setActiveUserId(null); // Clear user ID when changing filter
    setActiveSearchQuery('');
    setSearchQuery('');
    if (filter !== 'none') {
      setShowResultsPopup(true);
    } else {
      setShowResultsPopup(false);
    }
    setShowFilterMenu(false);
  }, []);


  // Handle Enter key and Arrow keys for search
  const handleSearchKeyDown = useCallback(
    (e) => {
      // Ignore Enter during IME composition (e.g., Japanese input)
      if (e.nativeEvent?.isComposing || e.isComposing) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setShowSearchDropdown(true);
        setSearchHistoryIndex((prev) => {
          const next = prev + 1;
          return next >= searchHistory.length ? 0 : next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setShowSearchDropdown(true);
        setSearchHistoryIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? searchHistory.length - 1 : next;
        });
      } else if (e.key === 'Enter') {
        let queryToUse = searchQuery.trim();

        // If selecting from history
        if (searchHistoryIndex >= 0 && searchHistory[searchHistoryIndex]) {
          queryToUse = searchHistory[searchHistoryIndex];
          setSearchQuery(queryToUse);
        }

        if (queryToUse) {
          addToHistory(queryToUse);
          setActiveSearchQuery(queryToUse);
          setActiveFilter('none'); // Clear filter when searching
          setActiveUserId(null); // Clear user ID when searching
          setShowResultsPopup(true);
          setShowSearchDropdown(false);
          setSearchHistoryIndex(-1);
          // フォーカスを解除
          e.target.blur();

          // Check for Abe Mode unlock keywords
          if (unlockAbeMode && ABE_UNLOCK_KEYWORDS.some((kw) => queryToUse.includes(kw))) {
            unlockAbeMode();
          }
        }
      } else if (e.key === 'Escape') {
        setShowSearchDropdown(false);
        setShowResultsPopup(false);
        setShowFilterMenu(false);
        setSearchHistoryIndex(-1);
      }
    },
    [searchQuery, searchHistory, searchHistoryIndex, addToHistory, unlockAbeMode]
  );

  // Search or Filter results (separate from main list)
  const displayResults = useMemo(() => {
    if (activeFilter !== 'none') {
      switch (activeFilter) {
        case 'user':
          return activeUserId ? filteredComments.filter((c) => c.userId === activeUserId) : [];
        case 'image':
          return filteredComments.filter(
            (c) =>
              (c.imageUrls && c.imageUrls.length > 0) ||
              /https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(c.text)
          );
        case 'popular':
          return filteredComments
            .filter((c) => c.replyCount >= 3)
            .sort((a, b) => a.resNum - b.resNum); // 時系列順
        case 'url':
          // URLを含む（画像・動画を除く）
          return filteredComments.filter((c) => {
            if (!/https?:\/\//.test(c.text)) return false;
            // 画像URLを除外
            if (/https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(c.text)) return false;
            // 動画URLを除外 (YouTube, ニコニコ, etc.)
            if (/youtube\.com|youtu\.be|nicovideo\.jp|nico\.ms|twitter\.com|x\.com/i.test(c.text))
              return false;
            return true;
          });
        case 'video':
          // 動画URL (YouTube, ニコニコ, Twitter/X)
          return filteredComments.filter((c) =>
            /youtube\.com|youtu\.be|nicovideo\.jp|nico\.ms|twitter\.com|x\.com/i.test(c.text)
          );
        case 'aa':
          return filteredComments
            .filter((c) => isProbablyAA(c.text))
            .sort((a, b) => a.resNum - b.resNum);
        default:
          return [];
      }
    }

    if (!activeSearchQuery.trim()) return [];
    const query = activeSearchQuery.trim().toLowerCase();
    return filteredComments.filter((c) => c.text && c.text.toLowerCase().includes(query));
  }, [filteredComments, activeSearchQuery, activeFilter]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    showResultsPopup,
    setShowResultsPopup,
    showSearchDropdown,
    setShowSearchDropdown,
    activeSearchQuery,
    setActiveSearchQuery,
    showFilterMenu,
    setShowFilterMenu,
    searchHistoryIndex,
    setSearchHistoryIndex,
    searchHistory,

    // Actions
    addToHistory,
    clearFilter,
    handleSearchKeyDown,

    // Derived
    displayResults,
    activeUserId,
    setActiveUserId: setActiveUserIdHelper,
    setActiveFilter: setActiveFilterHelper, // Override setActiveFilter to handle clearing user ID
  };
};

export default useLogFilter;
