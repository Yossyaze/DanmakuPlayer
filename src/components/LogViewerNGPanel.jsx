import React, { useRef, useEffect } from 'react';
import { X, Ban } from 'lucide-react';
import NgList from './ui/NgList';

const LogViewerNGPanel = ({ ngSettings, removeNgId, removeNgComment, allComments, onClose, style, onIdClick }) => {
    const panelRef = useRef(null);

    // 外側クリックで閉じる（トグルボタンを除外）
    useEffect(() => {
        const handleClickOutside = (event) => {
            // トグルボタンのクリックは除外（ボタン自体がトグルを処理する）
            if (event.target.closest('[data-panel-toggle="ng"]')) {
                return;
            }
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={panelRef}
            className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-72 animate-fade-in"
            style={style}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                    <Ban size={16} className="text-red-400" />
                    <span>NG管理</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="p-4">
                <NgList 
                    ngSettings={ngSettings}
                    removeNgId={removeNgId}
                    removeNgComment={removeNgComment}
                    allComments={allComments}
                    onIdClick={onClose ? (id) => { onIdClick && onIdClick(id); onClose(); } : onIdClick} 
                />
            </div>
        </div>
    );
};

export default LogViewerNGPanel;
