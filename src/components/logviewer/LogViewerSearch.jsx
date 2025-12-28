import React, { useRef, useEffect } from 'react';
import { Search, X, Filter, Image, Flame, Hash, Type, Video } from 'lucide-react';

const FILTER_OPTIONS = [
    { id: 'image', label: '画像付き', icon: <Image size={14} /> },
    { id: 'popular', label: '人気のコメント', icon: <Flame size={14} /> },
    { id: 'url', label: 'URLを含む', icon: <Hash size={14} /> },
    { id: 'video', label: '動画URLを含む', icon: <Video size={14} /> },
    { id: 'aa', label: 'アスキーアート', icon: <Type size={14} /> },
];

const LogViewerSearch = ({
    // Search state
    searchQuery,
    setSearchQuery,
    setActiveSearchQuery,
    // History
    searchHistory,
    searchHistoryIndex,
    setSearchHistoryIndex,
    showSearchDropdown,
    setShowSearchDropdown,
    addToHistory,
    // Filter
    activeFilter,
    setActiveFilter,
    showFilterMenu,
    setShowFilterMenu,
    // Popup control
    setShowResultsPopup,
    // Keyboard handler
    handleSearchKeyDown,
}) => {
    const filterMenuRef = useRef(null);

    // フィルターメニューの外側クリックで閉じる
    useEffect(() => {
        if (!showFilterMenu) return;
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilterMenu, setShowFilterMenu]);

    const handleSearchClick = () => {
        if (searchQuery.trim()) {
            addToHistory(searchQuery.trim());
            setActiveSearchQuery(searchQuery.trim());
            setActiveFilter('none');
            setShowResultsPopup(true);
            setShowSearchDropdown(false);
            setSearchHistoryIndex(-1);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setActiveSearchQuery('');
        if (activeFilter === 'none') setShowResultsPopup(false);
    };

    const handleHistorySelect = (query) => {
        setSearchQuery(query);
        addToHistory(query);
        setActiveSearchQuery(query);
        setShowResultsPopup(true);
        setShowSearchDropdown(false);
        // フォーカスを解除
        document.activeElement?.blur();
    };

    const handleFilterSelect = (filter) => {
        setActiveFilter(filter);
        setActiveSearchQuery('');
        setSearchQuery('');
        setShowResultsPopup(true);
        setShowFilterMenu(false);
    };

    return (
        <>
            {/* Search Input */}
            <div className="relative">
                <div className="relative flex items-center">
                    <div 
                        className="absolute inset-y-0 left-0 pl-2 flex items-center cursor-pointer text-gray-400 hover:text-white transition-colors z-10"
                        onClick={handleSearchClick}
                    >
                        <Search size={14} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSearchHistoryIndex(-1);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => setShowSearchDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                        placeholder="本文を検索... (Enter)"
                        className="w-48 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-lg py-1.5 pl-8 pr-8 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-2 text-gray-500 hover:text-gray-300"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Search History Dropdown */}
                {showSearchDropdown && searchHistory.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                        <div className="px-2 py-1.5 text-xs text-gray-500 border-b border-gray-800">検索履歴</div>
                        {searchHistory.map((query, idx) => (
                            <button
                                key={idx}
                                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                                    idx === searchHistoryIndex 
                                    ? 'bg-blue-600/20 text-blue-400' 
                                    : 'text-gray-300 hover:bg-gray-800'
                                }`}
                                onMouseEnter={() => setSearchHistoryIndex(idx)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleHistorySelect(query);
                                }}
                            >
                                {query}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Filter Menu Dropdown */}
            <div ref={filterMenuRef} className="relative">
                <button
                    onClick={() => {
                        setShowFilterMenu(!showFilterMenu);
                        setShowSearchDropdown(false);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                        activeFilter !== 'none'
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title="フィルター"
                >
                    <Filter size={20} />
                </button>
                
                {showFilterMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-60">
                        <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-800 uppercase tracking-wider">
                            絞り込み
                        </div>
                        {FILTER_OPTIONS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleFilterSelect(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                    activeFilter === item.id 
                                    ? 'bg-blue-600/20 text-blue-400' 
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default LogViewerSearch;
