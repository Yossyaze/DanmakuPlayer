import React from 'react';
import { ChevronUp } from 'lucide-react';
import NgList from '../ui/NgList';

/**
 * NG Management panel component for Sidebar
 * Displays and manages NG IDs and NG Comments
 */
const SidebarNGPanel = ({
    ngSettings,
    removeNgId,
    removeNgComment,
    allComments,
    onIdClick,
    onClose
}) => {
    return (
        <>
            <div className="bg-gray-800 border-b border-gray-700 overflow-y-auto max-h-[85vh] scrollbar-thin shrink-0">
                <div className="p-4 space-y-6">
                    {/* NG Management */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">NG管理</h4>

                        {/* NG List Component */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                            <NgList
                                ngSettings={ngSettings}
                                removeNgId={removeNgId}
                                removeNgComment={removeNgComment}
                                allComments={allComments}
                                onIdClick={onIdClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Close NG Panel Button */}
            <div className="relative h-0 z-20 flex justify-center">
                <button
                    onClick={onClose}
                    className="bg-gray-700 border-b border-r border-l border-gray-600 rounded-b-md px-24 py-4 shadow-md hover:bg-gray-600 transition-colors flex items-center justify-center group"
                    title="NG管理を閉じる"
                >
                    <ChevronUp size={18} className="text-gray-400 group-hover:text-white" />
                </button>
            </div>
        </>
    );
};

export default SidebarNGPanel;
