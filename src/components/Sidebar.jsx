import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowDown,
  Ban,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Hash,
  Image,
  Link as LinkIcon,
  Pipette,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { playRandomAbeVoice } from '../utils/abeMode';
import { padTime } from '../utils/sidebarUtils';
import CommentList from './CommentList';
import SidebarNGPanel from './sidebar/SidebarNGPanel'; // Import
import SidebarFileRow from './SidebarFileRow'; // Restore
import AnchorPopup from './ui/AnchorPopup';
import CommentContextMenu from './ui/CommentContextMenu';
import CommentItem from './ui/CommentItem';
import NgList from './ui/NgList';
import ReplyListPopup from './ui/ReplyListPopup';
import TimeInput from './ui/TimeInput';
import DateInput from './ui/DateInput';
import UserHistoryModal from './UserHistoryModal';

const Sidebar = ({
  sidebarWidth,
  showSettingsPanel,
  setShowSettingsPanel,
  loadedFiles,
  handleLogFileChange,
  handleRemoveFile,
  handleRenameFile,
  startTimeStr,
  setStartTimeStr,
  startDateStr,
  setStartDateStr,
  videoStartTimeStr,
  setVideoStartTimeStr,
  totalDuration,
  showThreadTitle,
  setShowThreadTitle,
  enableTreeView,
  setEnableTreeView,
  showImages,
  setShowImages,
  cmStartInput,
  setCmStartInput,
  cmEndInput,
  setCmEndInput,
  cmStartDateInput,
  setCmStartDateInput,
  cmEndDateInput,
  setCmEndDateInput,
  addCmRangeSmart,
  updateCmRange,
  removeCmRange,
  cmRanges,
  aaMode,
  setAaMode,

  comments,
  activeCommentId,
  currentLogicalTime,
  isAutoScroll,
  setIsAutoScroll,
  handleSyncButton,
  onCommentClick,
  onSeekAndPlay,
  formatTime,
  skipSeconds,
  setSkipSeconds,
  handleUrlLoad,
  handleToggleFileVisibility,
  handleReorderFiles,
  urlInput,
  setUrlInput,
  timeOffset = 0,
  onAddNgId,
  onAddNgComment,
  onAddNgWord, // New Prop
  ngSettings,
  removeNgId,
  removeNgComment,
  removeNgWord, // New Prop
  onIdClick,
  allComments,
  userHistoryId,
  onCloseUserHistory,
  aaOverrideMap,
  onToggleAA,
  abeModeUnlocked,
  dmSettings, // Ensure dmSettings is destructured
  setDmSettings, // Ensure setDmSettings is destructured
  onOpenEndCardSettings,
  setZoomedImage,
  onSetEndCardPreview, // New prop
}) => {
  // console.log('Sidebar formatTime:', formatTime);
  // danmakuContainerRef no longer needed for duration-based setting

  // --- Refs and State ---
  const scrollContainerRef = useRef(null);
  const settingsScrollRef = useRef(null); // Ref for settings panel scroll container
  const cmSettingsRef = useRef(null); // Ref for CM settings section
  const activeCommentRef = useRef(null);
  const isAutoScrollRef = useRef(isAutoScroll);
  const [localIsAutoScroll, setLocalIsAutoScroll] = useState(isAutoScroll);
  const [editingCmIndex, setEditingCmIndex] = useState(null);
  // local zoomedImage state removed
  const commentListRef = useRef(null);
  const sidebarContainerRef = useRef(null); // Ref for sidebar container
  const [containerLeft, setContainerLeft] = useState(0); // Left position of sidebar

  // Custom Time Formatter for Comment List
  const customFormatTime = React.useCallback(
    (seconds) => {
      if (totalDuration && seconds > totalDuration && seconds > 0) {
        const extra = seconds - totalDuration;
        const durStr = formatTime(totalDuration);
        const extraStr = formatTime(extra);
        return `${durStr}+${extraStr}`;
      }
      return formatTime(seconds);
    },
    [totalDuration, formatTime]
  );

  // Unified Popup Stack state for multi-layered popups
  const [popupStack, setPopupStack] = useState([]); // Array of { type: 'anchor'|'reply', comment, position, replies? }
  const [sidebarContextMenu, setSidebarContextMenu] = useState(null); // { x, y, comment }
  const suppressClickRef = useRef(false); // Flag to suppress onClick after closing layers

  // AA Override State (Managed by App via props)
  // const [aaOverrideMap, setAaOverrideMap] = useState({}); // Moved to App
  // const handleToggleAA = ... // Moved to App

  // CM Input Modes
  const [cmStartMode, setCmStartMode] = useState('log');
  const [cmEndMode, setCmEndMode] = useState('log');

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    handleUrlLoad(urlInput);
    setUrlInput('');
  };

  // Compute ID Stats (userIndex/userTotal) and Reply Counts
  const enrichedComments = useMemo(() => {
    // 1. Group by userId & Collect Reply Map (using original objects for now)
    const userGroups = {};
    const replyMap = new Map();

    comments.forEach((c) => {
      // ID Stats
      const uid = c.userId;
      if (uid) {
        if (!userGroups[uid]) userGroups[uid] = [];
        userGroups[uid].push(c);
      }

      // Reply Map
      const anchorRegex = /(&gt;&gt;|>>)(\d+)/g;
      const anchorMatches = c.text.matchAll(anchorRegex);
      for (const match of anchorMatches) {
        const targetResNum = parseInt(match[2]);
        if (c.sourceFileId) {
          const key = `${c.sourceFileId}-${targetResNum}`;
          if (!replyMap.has(key)) {
            replyMap.set(key, []);
          }
          const list = replyMap.get(key);
          if (!list.includes(c)) {
            list.push(c);
          }
        }
      }
    });

    // 2. Create the Enriched Base Objects
    const enrichedLookup = new Map();
    const enrichedList = comments.map((c) => {
      const uid = c.userId;
      const group = userGroups[uid] || [];
      const userIndex = group.indexOf(c) + 1;
      const userTotal = group.length;

      const enriched = {
        ...c,
        userIndex,
        userTotal,
        replies: [], // Initialize
        replyCount: 0,
      };
      enrichedLookup.set(c.id, enriched);
      return enriched;
    });

    // 3. Second Pass: Link replies using enriched objects
    enrichedList.forEach((c) => {
      const myResNum = c.originalResNum || c.resNum;
      const myFileId = c.sourceFileId;
      if (myResNum && myFileId) {
        const key = `${myFileId}-${myResNum}`;
        if (replyMap.has(key)) {
          // Get original replies and find their enriched counterparts
          const originalReplies = replyMap.get(key);
          const enrichedReplies = originalReplies
            .map((origR) => enrichedLookup.get(origR.id))
            .filter(Boolean);

          c.replies = enrichedReplies;
          c.replyCount = enrichedReplies.length;
        }
      }
    });

    return enrichedList;
  }, [comments]);

  // Image Navigation Helper
  const handleSetZoomedImage = React.useCallback(
    (url) => {
      // Collect all images from enrichedComments using identical logic to CommentContent
      const allImages = [];
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      enrichedComments.forEach((c) => {
        if (!c.text) return;
        const parts = c.text.split(urlRegex);
        parts.forEach((part) => {
          if (!part.match(urlRegex)) return;
          const isImage = part.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          if (isImage) {
            allImages.push({ src: part, commentId: c.id });
          }
        });
      });

      const currentIndex = allImages.findIndex((img) => img.src === url);

      if (setZoomedImage) {
        setZoomedImage({
          src: url,
          list: allImages,
          index: currentIndex,
        });
      }
    },
    [enrichedComments, setZoomedImage]
  );

  // Measure container left position for popup minX
  useEffect(() => {
    if (!sidebarContainerRef.current) return;

    const updateDimensions = () => {
      if (sidebarContainerRef.current) {
        const rect = sidebarContainerRef.current.getBoundingClientRect();
        setContainerLeft(rect.left);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(sidebarContainerRef.current);

    updateDimensions();

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Anchor Click Handler (for >>resNum)
  const handleAnchorClick = (e, targetResNum, isNested = false) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Find target comment
    const targetComment = enrichedComments.find(
      (c) => (c.originalResNum || c.resNum) === targetResNum
    );
    if (targetComment) {
      const baseRect = e?.target?.getBoundingClientRect() || {
        left: 100,
        bottom: 100,
      };
      const rowElement = e?.target?.closest('.comment-item-row');
      const rowRect = rowElement?.getBoundingClientRect();

      setPopupStack((prev) => [
        ...prev,
        {
          type: 'anchor',
          comment: targetComment,
          position: { x: baseRect.left, y: baseRect.bottom },
          parentRect: !isNested ? rowRect : null,
        },
      ]);
    }
  };

  // Reply Count Click Handler
  const handleReplyCountClick = (e, comment, isNested = false) => {
    e.stopPropagation();
    if (comment.replies && comment.replies.length > 0) {
      const baseRect =
        e.target.closest('.reply-count-indicator')?.getBoundingClientRect() ||
        e.target.getBoundingClientRect();
      const rowElement = e.target.closest('.comment-item-row');
      const rowRect = rowElement?.getBoundingClientRect();

      // 1. Determine if this comment is a "root" (has no anchors) or "descendant" (has anchors)
      const anchorRegex = /(&gt;&gt;|>>)(\d+)/g;
      const hasAnchors = anchorRegex.test(comment.text);

      let rootAncestors = [];

      if (!hasAnchors) {
        // Root case: Just display children
        rootAncestors = [comment];
      } else {
        // Descendant case: Backtrack to find all root ancestors
        const findRoots = (c, visited) => {
          if (visited.has(c.id)) return [];
          visited.add(c.id);

          const matches = Array.from(c.text.matchAll(/(&gt;&gt;|>>)(\d+)/g));
          if (matches.length === 0) return [c];

          let roots = [];
          matches.forEach((m) => {
            const targetResNum = parseInt(m[2]);
            // We need the enriched objects. Let's find by looking at enrichedComments (indirectly via a lookup if we add it, but for now we search)
            // Actually, we can use the enrichedComments lookup if we expose one or just filter
            const parent = enrichedComments.find(
              (ec) =>
                (ec.originalResNum || ec.resNum) === targetResNum &&
                ec.sourceFileId === c.sourceFileId
            );
            if (parent) {
              roots = [...roots, ...findRoots(parent, visited)];
            } else {
              // If parent not found (e.g. out of range), this itself is a root for this branch
              roots.push(c);
            }
          });
          return roots;
        };

        const rawRoots = findRoots(comment, new Set());
        // Unique and sort by resNum
        const uniqueRoots = [];
        const rootIds = new Set();
        rawRoots.forEach((r) => {
          if (!rootIds.has(r.id)) {
            uniqueRoots.push(r);
            rootIds.add(r.id);
          }
        });
        rootAncestors = uniqueRoots.sort((a, b) => (a.resNum || 0) - (b.resNum || 0));
      }

      // 2. Collect everything from all roots
      const allItems = [];
      const visitedItems = new Set();

      const collect = (c, depth, isRoot) => {
        if (visitedItems.has(c.id)) return;
        visitedItems.add(c.id);

        if (!isRoot) {
          allItems.push({ ...c, depth });
        } else if (hasAnchors) {
          // If we backtracked and this is the root, we include it in the display
          allItems.push({ ...c, depth: 0 });
        }

        if (c.replies) {
          c.replies.forEach((r) => {
            // If root case and this is the first level of children, depth remains same as root (0)
            // If descendant case (backtracked), indentation starts at 1
            collect(r, depth + (isRoot && !hasAnchors ? 0 : 1), false);
          });
        }
      };

      rootAncestors.forEach((root) => {
        collect(root, 0, true);
      });

      setPopupStack((prev) => [
        ...prev,
        {
          type: 'reply',
          comment: comment,
          replies: allItems,
          position: { x: baseRect.left, y: baseRect.bottom },
          parentRect: !isNested ? rowRect : null, // Use parentRect only for initial popups
        },
      ]);
    }
  };

  // Close popup handler (for topmost - legacy)
  const handleClosePopup = () => {
    setPopupStack((prev) => prev.slice(0, -1));
  };

  // Close a specific popup by index (for X button)
  const closePopupAtIndex = (index) => {
    setPopupStack((prev) => prev.slice(0, index));
  };

  // Close all popups above a specific index (for clicking lower layer popup)
  const closePopupsAbove = (index) => {
    setPopupStack((prev) => {
      if (prev.length > index + 1) {
        suppressClickRef.current = true;
      }
      return prev.slice(0, index + 1);
    });
  };

  // Clear all popups (for backdrop click)
  const clearPopups = () => {
    setPopupStack([]);
    setSidebarContextMenu(null);
  };

  // Keyboard listener for Escape to close popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (popupStack.length > 0) {
          e.stopPropagation(); // Prevent other handlers
          handleClosePopup();
        } else if (sidebarContextMenu) {
          setSidebarContextMenu(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupStack.length, sidebarContextMenu]);

  // Context menu "Jump to Comment" action
  const handleJumpToComment = (targetComment) => {
    if (!targetComment) return;

    const resNum = targetComment.originalResNum || targetComment.resNum;
    const sourceFileId = targetComment.sourceFileId;

    if (commentListRef.current) {
      commentListRef.current.scrollToResNum(resNum, sourceFileId);
    }

    // Close Popups
    setPopupStack([]); // Clear all popups on jump
    setSidebarContextMenu(null);
    if (userHistoryId) onCloseUserHistory();
  };

  // Click handler for the comment INSIDE the popup -> Open Context Menu
  const handlePopupRowClick = (e, comment) => {
    e.stopPropagation();

    // Check suppress flag and reset it
    const wasSuppressed = suppressClickRef.current;
    suppressClickRef.current = false;

    if (wasSuppressed) {
      return;
    }

    setSidebarContextMenu({
      x: e.clientX,
      y: e.clientY,
      comment: comment,
    });
  };

  // Removed handleAnchorMouseEnter/Leave
  // Removed handleAnchorMouseEnter/Leave

  // Context Menu Handlers
  const handleSetLogStart = (comment) => {
    // Try to parse comment.date or rawTime
    let timeStr = null;
    let dateStr = null;

    // Use rawTime if available (timestamp)
    if (comment.rawTime && comment.rawTime > 0) {
      const date = new Date(comment.rawTime);
      if (date.getFullYear() >= 2000) {
        // Absolute timestamp - extract date and time
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
        timeStr = date.toLocaleTimeString('ja-JP', { hour12: false });
      }
    }

    // Fallback to dateDisplay parsing
    if (!timeStr && comment.dateDisplay) {
      const match = comment.dateDisplay.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (match) {
        timeStr = `${match[1]}:${match[2]}:${match[3]}`;
      }
      // Try to extract date from dateDisplay (format: 2025/01/07(火))
      const dateMatch = comment.dateDisplay.match(/(\d{4})\/(\d{2})\/(\d{2})/);
      if (dateMatch) {
        dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }

    if (timeStr) {
      setStartTimeStr(timeStr);
    }
    if (dateStr) {
      setStartDateStr(dateStr);
    }
    if (timeStr || dateStr) {
      setShowSettingsPanel(true);
    }
  };

  const handleSetCmStart = (time) => {
    const startSec = startTimeStr
      ? startTimeStr.split(':').reduce((acc, v) => acc * 60 + Number(v), 0)
      : 0;
    const targetSec = startSec + time;

    const h = Math.floor(targetSec / 3600);
    const m = Math.floor((targetSec % 3600) / 60);
    const s = Math.floor(targetSec % 60);
    const timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    setCmStartMode('log');
    setCmStartInput(timeStr);
    setShowSettingsPanel(true);
    setTimeout(() => scrollToCmSettings(), 100);
  };

  const handleSetCmEnd = (time) => {
    const startSec = startTimeStr
      ? startTimeStr.split(':').reduce((acc, v) => acc * 60 + Number(v), 0)
      : 0;
    const targetSec = startSec + time;

    const h = Math.floor(targetSec / 3600);
    const m = Math.floor((targetSec % 3600) / 60);
    const s = Math.floor(targetSec % 60);
    const timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    setCmEndMode('log');
    setCmEndInput(timeStr);
    setShowSettingsPanel(true);
    setTimeout(() => scrollToCmSettings(), 100);
  };

  // Helper to scroll to CM settings
  const scrollToCmSettings = () => {
    if (settingsScrollRef.current && cmSettingsRef.current) {
      cmSettingsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // Helper to render time input based on mode
  const renderTimeInput = (mode, value, setValue, placeholder, dateValue, setDateValue) => {
    const handleGetCurrent = () => {
      if (mode === 'video') {
        // Use seekbar time (logical time = log time - timeOffset)
        const seekbarSeconds = Math.floor(currentLogicalTime - timeOffset);
        const h = Math.floor(seekbarSeconds / 3600);
        const m = Math.floor((seekbarSeconds % 3600) / 60);
        const s = Math.floor(seekbarSeconds % 60);

        if (h > 0) {
          setValue(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
          setValue(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      } else if (mode === 'log') {
        // Calculate Log Time: startTimeStr + currentTime
        if (!startTimeStr) return;
        const [h, m, s] = startTimeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m) || isNaN(s)) return;

        const startSec = h * 3600 + m * 60 + s;
        const currentSec = startSec + currentLogicalTime;

        // Handle day overflow
        let days = Math.floor(currentSec / 86400);
        let remainingSec = currentSec % 86400;
        if (remainingSec < 0) {
          days -= 1;
          remainingSec += 86400;
        }

        const hh = Math.floor(remainingSec / 3600);
        const mm = Math.floor((remainingSec % 3600) / 60);
        const ss = Math.floor(remainingSec % 60);

        const formatted = `${hh}:${mm.toString().padStart(2, '0')}:${ss
          .toString()
          .padStart(2, '0')}`;
        setValue(formatted);

        // Always update date based on current time
        if (startDateStr && setDateValue) {
          const baseDate = new Date(startDateStr);
          baseDate.setDate(baseDate.getDate() + days);
          const newDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
          setDateValue(newDateStr);
        }
      }
    };

    if (mode === 'log') {
      return (
        <div className="flex items-center gap-1">
          <DateInput value={dateValue || ''} onChange={setDateValue} />
          <TimeInput value={value} onChange={setValue} showHours={true} placeholder={placeholder} />
          <button
            onClick={handleGetCurrent}
            title="現在の時間を取得"
            className="text-gray-400 hover:text-white"
          >
            <Pipette size={12} />
          </button>
        </div>
      );
    } else if (mode === 'video' || mode === 'duration') {
      return (
        <div className="flex items-center gap-1">
          <TimeInput
            value={value}
            onChange={setValue}
            showHours={false}
            placeholder={placeholder}
          />
          {mode === 'video' && (
            <button
              onClick={handleGetCurrent}
              title="現在の時間を取得"
              className="text-gray-400 hover:text-white"
            >
              <Pipette size={12} />
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  // Sync Ref with prop
  useEffect(() => {
    isAutoScrollRef.current = isAutoScroll;
  }, [isAutoScroll]);

  // Helper to scroll to active comment
  const scrollToActiveComment = (duration = null) => {
    if (activeCommentRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeCommentRef.current;
      const containerHeight = container.clientHeight;
      const elementTop = element.offsetTop;
      const elementHeight = element.clientHeight;
      const targetTop = elementTop - containerHeight + elementHeight + 40;

      if (duration === null) {
        container.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
        return;
      }

      // Custom fast scroll animation
      const startTop = container.scrollTop;
      const distance = targetTop - startTop;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic function for smooth deceleration
        const ease = 1 - Math.pow(1 - progress, 3);

        container.scrollTop = startTop + distance * ease;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  };

  // Auto-scroll effect
  useEffect(() => {
    // Check Ref instead of prop to avoid race conditions
    if (isAutoScrollRef.current) {
      // Use fast duration (100ms) for auto-scroll to keep up with seeks
      scrollToActiveComment(100);
    }
  }, [activeCommentId, isAutoScroll]); // Keep isAutoScroll in deps to re-trigger if re-enabled

  const handleSyncButtonLocal = () => {
    isAutoScrollRef.current = true;
    setLocalIsAutoScroll(true);
    handleSyncButton();
    // Scroll logic is now handled by CommentList via isAutoScroll prop
  };

  // Sync local state with prop
  useEffect(() => {
    setLocalIsAutoScroll(isAutoScroll);
  }, [isAutoScroll]);

  // Handle user scroll interactions to disable auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleInteraction = (e) => {
      // Ignore interactions from defined non-scroll elements (like context menus)
      if (e.target.closest('.no-scroll-lock')) return;

      // Always try to disable auto-scroll on interaction, even if Ref is already false.
      // This ensures that if the Prop is True but Ref is False (desync), we force the Prop to False.

      // Always disable auto-scroll on direct scroll interactions
      if (e.type === 'wheel' || e.type === 'touchmove' || e.type === 'keydown') {
        isAutoScrollRef.current = false;
        setLocalIsAutoScroll(false);
        setIsAutoScroll(false);
      }
      // For mouse interactions, only disable if clicking the scrollbar (container target)
      else if (e.type === 'mousedown') {
        if (e.target === container) {
          isAutoScrollRef.current = false;
          setLocalIsAutoScroll(false);
          setIsAutoScroll(false);
        }
      }
    };

    // Use native event listeners for better reliability
    container.addEventListener('wheel', handleInteraction, { passive: true });
    container.addEventListener('touchmove', handleInteraction, {
      passive: true,
    });
    container.addEventListener('keydown', handleInteraction);
    container.addEventListener('mousedown', handleInteraction);

    return () => {
      container.removeEventListener('wheel', handleInteraction);
      container.removeEventListener('touchmove', handleInteraction);
      container.removeEventListener('keydown', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
    };
  }, [setIsAutoScroll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = loadedFiles.findIndex((file) => file.id === active.id);
      const newIndex = loadedFiles.findIndex((file) => file.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        handleReorderFiles(oldIndex, newIndex);
      }
    }
  };

  // Determine active file IDs and Thread Title based on current comment or time
  const { activeThreadTitle } = useMemo(() => {
    if (!loadedFiles || loadedFiles.length === 0) return { activeThreadTitle: null };
    if (!comments || comments.length === 0) return { activeThreadTitle: null };

    let targetComment = null;

    // 1. Try to find active comment
    if (activeCommentId) {
      targetComment = comments.find((c) => c.id === activeCommentId);
    }

    // 2. If no active comment, find last comment before currentLogicalTime
    if (!targetComment) {
      // Binary search for the last comment <= currentLogicalTime
      let low = 0;
      let high = comments.length - 1;
      let idx = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (comments[mid].time <= currentLogicalTime) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (idx !== -1) {
        targetComment = comments[idx];
      }
    }

    if (targetComment) {
      return {
        activeThreadTitle: targetComment.threadTitle || null,
      };
    }

    return { activeThreadTitle: null };
  }, [activeCommentId, currentLogicalTime, comments, loadedFiles]);

  const [showNgPanel, setShowNgPanel] = useState(false);

  // Exclusive toggle logic
  const toggleSettings = () => {
    if (!showSettingsPanel) setShowNgPanel(false);
    setShowSettingsPanel(!showSettingsPanel);
  };

  const toggleNgPanel = () => {
    if (!showNgPanel) setShowSettingsPanel(false);
    setShowNgPanel(!showNgPanel);
  };

  return (
    <div
      ref={sidebarContainerRef}
      className="flex flex-col bg-gray-900 border-x border-gray-700 h-full"
      style={{ width: sidebarWidth }}
    >
      {/* Tab Bar - Compact with Text */}
      <div className="flex bg-gray-800 border-b border-gray-700 shrink-0">
        {/* Settings Tab */}
        <button
          onClick={toggleSettings}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium transition-colors ${
            showSettingsPanel
              ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          <Settings size={14} />
          <span>設定</span>
        </button>

        {/* NG Tab */}
        <button
          onClick={toggleNgPanel}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium transition-colors ${
            showNgPanel
              ? 'bg-gray-700 text-red-400 border-b-2 border-red-500'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          <Ban size={14} />
          <span>NG</span>
        </button>
      </div>

      {/* Settings Components */}
      {showSettingsPanel && (
        <>
          <div
            ref={settingsScrollRef}
            className="bg-gray-800 border-b border-gray-700 overflow-y-auto max-h-[85vh] scrollbar-thin shrink-0"
          >
            <div className="p-4 space-y-6">
              {/* 1. Log Management */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    ログ読み込み
                  </h4>
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    <Upload size={12} />
                    ファイルを選択
                    <input
                      type="file"
                      accept=".txt,.dat,.json"
                      multiple
                      onChange={handleLogFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={loadedFiles.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                      {loadedFiles.map((file, index) => (
                        <SidebarFileRow
                          key={file.id}
                          file={file}
                          index={index}
                          handleToggleFileVisibility={handleToggleFileVisibility}
                          handleRemoveFile={handleRemoveFile}
                          handleRenameFile={handleRenameFile}
                        />
                      ))}
                      {loadedFiles.length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-4 bg-gray-900/50 rounded border border-dashed border-gray-700">
                          ログファイルがありません
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* URL Input */}
                <form onSubmit={handleUrlSubmit} className="flex gap-1">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <LinkIcon size={12} className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="URLから読み込む (dat/html)"
                      className="w-full bg-gray-900 border border-gray-700 rounded pl-7 pr-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!urlInput}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                  >
                    読込
                  </button>
                </form>
              </div>

              {/* AA Mode Setting */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">AAモード（自動判定）</span>
                <div className="flex bg-gray-700 rounded p-0.5">
                  <button
                    onClick={() => setAaMode('auto')}
                    className={`px-3 py-1 rounded text-[10px] transition-colors ${
                      aaMode === 'auto'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setAaMode('off')}
                    className={`px-3 py-1 rounded text-[10px] transition-colors ${
                      aaMode === 'off'
                        ? 'bg-gray-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>

              {/* Abe Mode Setting (Hidden Feature) */}
              {abeModeUnlocked && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌈</span>
                    <div>
                      <span className="text-gray-400 text-xs block">安倍晋三モード</span>
                      <span className="text-[10px] text-gray-600">語録を虹色で強調</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const nextMode = !dmSettings.abeMode;
                      if (nextMode) {
                        playRandomAbeVoice();
                      }
                      setDmSettings({
                        ...dmSettings,
                        abeMode: nextMode,
                      });
                    }}
                    style={{
                      background: dmSettings.abeMode
                        ? 'linear-gradient(90deg, #ff4444, #ffaa00, #ffff44, #44ff44, #44aaff, #aa44ff)'
                        : undefined,
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${
                      !dmSettings.abeMode ? 'bg-gray-700' : ''
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white border border-gray-400 rounded-full shadow transition-all ${
                        dmSettings.abeMode ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* End Card Setting */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <Image size={16} className="text-purple-400" />
                  <span className="text-gray-400 text-xs">エンドカード</span>
                </div>
                <button
                  onClick={onOpenEndCardSettings}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] rounded transition-colors shadow-sm flex items-center gap-1"
                >
                  <Settings size={12} />
                  設定を開く
                </button>
              </div>

              <div className="h-px bg-gray-700 my-2" />

              {/* 2. Sync Settings */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  同期設定
                </h4>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1 bg-gray-800 p-2 rounded border border-gray-700 items-center">
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-gray-400">ログ開始日時</span>
                      <div className="flex items-center gap-1">
                        <DateInput value={startDateStr} onChange={setStartDateStr} />
                        <TimeInput
                          value={startTimeStr}
                          onChange={setStartTimeStr}
                          showHours={true}
                        />
                        <button
                          onClick={() => {
                            const timeStr = startTimeStr || '00:00:00';
                            const [h, m, s] = timeStr.split(':').map((v) => parseInt(v) || 0);

                            const startSec = h * 3600 + m * 60 + s;
                            const currentSec = startSec + currentLogicalTime;

                            // Handle day overflow
                            let days = Math.floor(currentSec / 86400);
                            let remainingSec = currentSec % 86400;
                            if (remainingSec < 0) {
                              days -= 1;
                              remainingSec += 86400;
                            }

                            const hh = Math.floor(remainingSec / 3600);
                            const mm = Math.floor((remainingSec % 3600) / 60);
                            const ss = Math.floor(remainingSec % 60);

                            const formatted = `${hh}:${mm.toString().padStart(2, '0')}:${ss
                              .toString()
                              .padStart(2, '0')}`;
                            setStartTimeStr(formatted);

                            // Always update date
                            if (startDateStr) {
                              const baseDate = new Date(startDateStr);
                              baseDate.setDate(baseDate.getDate() + days);
                              const newDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
                              setStartDateStr(newDateStr);
                            }
                          }}
                          title="現在の時間を取得"
                          className="text-gray-400 hover:text-white"
                        >
                          <Pipette size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-center text-gray-500 transform rotate-90 text-lg leading-none">
                      =
                    </div>
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-gray-400">動画時間</span>
                      <div className="flex items-center gap-2">
                        <TimeInput
                          value={videoStartTimeStr}
                          onChange={setVideoStartTimeStr}
                          showHours={true}
                          placeholder="00:00"
                        />
                        <button
                          onClick={() => {
                            const totalSec = Math.floor(currentLogicalTime - timeOffset);
                            const h = Math.floor(totalSec / 3600);
                            const m = Math.floor((totalSec % 3600) / 60);
                            const s = Math.floor(totalSec % 60);
                            const val =
                              h > 0
                                ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                                : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                            setVideoStartTimeStr(val);
                          }}
                          title="現在の時間を取得"
                          className="text-gray-400 hover:text-white"
                        >
                          <Pipette size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showThreadTitle}
                        onChange={(e) => setShowThreadTitle(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                      />{' '}
                      スレッドタイトルを表示
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTreeView}
                        onChange={(e) => setEnableTreeView(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                      />{' '}
                      アンカーをツリー表示 (引用)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showImages}
                        onChange={(e) => setShowImages(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                      />{' '}
                      画像URLをインライン表示
                    </label>
                    {showImages && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 ml-5"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              {/* Keyboard Settings */}
              {/* Header / Info */}
              {/* Header / Info (Compact) */}

              <div className="p-4 space-y-5 border-t border-gray-700">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    キーボード操作設定
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <label>スキップ秒数</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="1"
                          value={skipSeconds}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setSkipSeconds('');
                            } else {
                              const num = parseInt(val);
                              if (!isNaN(num)) setSkipSeconds(num);
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) setSkipSeconds(Math.max(1, Math.min(60, val)));
                            else setSkipSeconds(5);
                          }}
                          className="w-12 bg-gray-800 text-right border border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 text-xs"
                        />
                        <span>秒</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="1"
                      value={skipSeconds || 5}
                      onChange={(e) => setSkipSeconds(parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-600 rounded accent-blue-500"
                    />
                  </div>
                </div>
                {/* CM Settings */}
                <div ref={cmSettingsRef} className="space-y-2">
                  <div className="flex flex-col gap-2 bg-gray-800 p-2 rounded border border-gray-700">
                    {/* Start Time Row */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8 shrink-0">開始</span>
                        <select
                          value={cmStartMode}
                          onChange={(e) => setCmStartMode(e.target.value)}
                          className="bg-gray-700 text-white text-[10px] p-1 rounded border border-gray-600 outline-none flex-1"
                        >
                          <option value="log">ログ時間</option>
                          <option value="video">動画時間</option>
                        </select>
                      </div>
                      <div className="flex justify-end w-full">
                        {renderTimeInput(
                          cmStartMode,
                          cmStartInput,
                          setCmStartInput,
                          cmStartMode === 'log' ? '00:00:00' : '00:00',
                          cmStartDateInput,
                          setCmStartDateInput
                        )}
                      </div>
                    </div>

                    {/* End Time Row */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8 shrink-0">終了</span>
                        <select
                          value={cmEndMode}
                          onChange={(e) => setCmEndMode(e.target.value)}
                          className="bg-gray-700 text-white text-[10px] p-1 rounded border border-gray-600 outline-none flex-1"
                        >
                          <option value="log">ログ時間</option>
                          <option value="duration">長さ</option>
                        </select>
                      </div>
                      <div className="flex justify-end w-full">
                        {renderTimeInput(
                          cmEndMode,
                          cmEndInput,
                          setCmEndInput,
                          cmEndMode === 'log' ? '00:00:00' : '00:00',
                          cmEndDateInput,
                          setCmEndDateInput
                        )}
                      </div>
                    </div>

                    {editingCmIndex !== null ? (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => {
                            updateCmRange(
                              editingCmIndex,
                              cmStartMode,
                              cmStartInput,
                              cmEndMode,
                              cmEndInput,

                              startTimeStr,
                              cmStartDateInput,
                              cmEndDateInput,
                              startDateStr
                            );
                            setEditingCmIndex(null);
                            setCmStartInput('');
                            setCmEndInput('');
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1"
                        >
                          <RefreshCw size={14} /> 更新
                        </button>
                        <button
                          onClick={() => {
                            setEditingCmIndex(null);
                            setCmStartInput('');
                            setCmEndInput('');
                          }}
                          className="bg-gray-600 hover:bg-gray-500 text-white p-1.5 rounded text-xs flex items-center justify-center"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          addCmRangeSmart(
                            cmStartMode,
                            cmStartInput,
                            cmEndMode,
                            cmEndInput,
                            startTimeStr,
                            cmStartDateInput,
                            cmEndDateInput,
                            startDateStr
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1 mt-1"
                      >
                        <Plus size={14} /> 追加
                      </button>
                    )}
                  </div>
                  {cmRanges.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {cmRanges.map((range, i) => {
                        // Calculate accumulated CM time before this interval
                        const accumulatedCmTime = cmRanges.slice(0, i).reduce((acc, r) => {
                          return acc + (r.logEnd - r.logStart);
                        }, 0);

                        const vStart = typeof range.videoStart === 'number' ? range.videoStart : 0;
                        const cmDuration = range.logEnd - range.logStart;

                        // Convert to logical time (video time + accumulated CM time)
                        const logicalStart = vStart + accumulatedCmTime;
                        const logicalEnd = logicalStart + cmDuration;

                        return (
                          <div
                            key={i}
                            className={`flex flex-col bg-gray-900 p-1.5 rounded text-xs text-gray-400 gap-1 ${
                              editingCmIndex === i ? 'border border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{`ログ: ${
                                range.startDateStr
                                  ? `${range.startDateStr.split('-').slice(1).join('/')} `
                                  : ''
                              }${range.labelStart} ~ ${
                                range.endDateStr
                                  ? `${range.endDateStr.split('-').slice(1).join('/')} `
                                  : ''
                              }${range.labelEnd}`}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCmIndex(i);
                                    setCmStartMode('log');
                                    setCmEndMode('log');
                                    // Use imported padTime utility
                                    setCmStartInput(padTime(range.labelStart));
                                    setCmEndInput(padTime(range.labelEnd));
                                    // Set Date Inputs
                                    if (setCmStartDateInput)
                                      setCmStartDateInput(range.startDateStr || '');
                                    if (setCmEndDateInput)
                                      setCmEndDateInput(range.endDateStr || '');
                                  }}
                                  className="hover:text-blue-400"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => removeCmRange(i)}
                                  className="hover:text-red-400"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                            <span className="font-mono text-blue-400 text-[10px]">
                              動画: {formatTime(logicalStart)} ~ {formatTime(logicalEnd)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Close Button Panel */}
          <div className="relative h-0 z-20 flex justify-center">
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="bg-gray-700 border-b border-r border-l border-gray-600 rounded-b-md px-24 py-4 shadow-md hover:bg-gray-600 transition-colors flex items-center justify-center group"
              title="設定を閉じる"
            >
              <ChevronUp size={18} className="text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </>
      )}

      {/* NG Panel */}
      {showNgPanel && (
        <SidebarNGPanel
          ngSettings={ngSettings}
          removeNgId={removeNgId}
          removeNgComment={removeNgComment}
          addNgWord={onAddNgWord} // New Prop
          removeNgWord={removeNgWord} // New Prop
          allComments={allComments}
          onIdClick={onIdClick}
          onClose={() => setShowNgPanel(false)}
        />
      )}

      {/* CommentList (ALL comments) */}
      <div className="flex-1 min-h-0 bg-gray-900 overflow-hidden relative flex flex-col">
        {/* Thread Title Header (Fixed) */}
        {showThreadTitle && activeThreadTitle && (
          <div className="shrink-0 bg-gray-800 border-b border-gray-700 p-2 shadow-sm z-10 w-full">
            <div className="flex items-start gap-2">
              <Hash size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="text-gray-200 font-bold text-xs whitespace-pre-wrap leading-snug wrap-break-word">
                {activeThreadTitle}
              </div>
            </div>
          </div>
        )}

        <CommentList
          ref={commentListRef}
          comments={enrichedComments}
          activeCommentId={activeCommentId}
          RowComponent={null}
          currentLogicalTime={currentLogicalTime}
          enableTreeView={enableTreeView}
          showImages={showImages}
          showThreadTitle={showThreadTitle}
          onCommentClick={(time) => onCommentClick && onCommentClick(time)}
          onSeekAndPlay={onSeekAndPlay}
          onAnchorClick={(e, resNum) => handleAnchorClick(e, resNum, false)}
          timeOffset={timeOffset}
          formatTime={customFormatTime}
          isAutoScroll={localIsAutoScroll}
          setIsAutoScroll={setLocalIsAutoScroll}
          activeCommentRef={activeCommentRef}
          isPopupActive={popupStack.length > 0}
          onAddNgId={onAddNgId}
          onAddNgComment={onAddNgComment}
          onSetLogStart={handleSetLogStart}
          onSetCmStart={handleSetCmStart}
          onSetCmEnd={handleSetCmEnd}
          onSetEndCardPreview={onSetEndCardPreview}
          onIdClick={onIdClick}
          setZoomedImage={handleSetZoomedImage}
          extraRowProps={{
            // Pass additional props to CommentRow
            onReplyCountClick: handleReplyCountClick,
            abeMode: abeModeUnlocked && dmSettings.abeMode, // Pass Abe Mode
          }}
          aaMode={aaMode}
          aaOverrideMap={aaOverrideMap}
          onToggleAA={onToggleAA}
        />

        {/* User History Modal (Inside relative container) */}
        {userHistoryId && (
          <UserHistoryModal
            userId={userHistoryId}
            comments={allComments}
            onClose={onCloseUserHistory}
            onSeek={onSeekAndPlay}
            onAddNgId={onAddNgId}
            onAddNgComment={onAddNgComment}
            onSetLogStart={handleSetLogStart}
            onSetCmStart={handleSetCmStart}
            onSetCmEnd={handleSetCmEnd}
            formatTime={formatTime}
            timeOffset={timeOffset}
            totalComments={comments.length}
            isSidebarMode={true}
            className="h-full border-none"
            setZoomedImage={handleSetZoomedImage}
            onAnchorClick={handleAnchorClick}
            onAnchorMouseEnter={() => {}} // Removed
            onAnchorMouseLeave={() => {}} // Removed
            onIdClick={onIdClick} // Allow recursive ID click
            settings={{
              fontSize: dmSettings.fontSize,
              density: dmSettings.density,
              showImages,
            }}
            currentLogicalTime={currentLogicalTime} // Pass currentLogicalTime
          />
        )}

        {/* Sync Button */}
        {!localIsAutoScroll && comments.length > 0 && !userHistoryId && (
          <button
            onClick={handleSyncButtonLocal}
            className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 animate-bounce-small z-30 opacity-90"
            title="現在のコメントへ追従"
          >
            <ArrowDown size={20} />
          </button>
        )}
      </div>

      {/* Active Popups Stack */}
      {popupStack.length > 0 && (
        <>
          {/* Single backdrop for all popups */}
          <div
            className="fixed inset-0 bg-black/0 cursor-default"
            style={{ zIndex: 59 }}
            onMouseDown={(e) => {
              e.stopPropagation();
              clearPopups();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearPopups();
            }}
          />

          {/* Popup stack */}
          {popupStack.map((popup, index) =>
            popup.type === 'anchor' ? (
              <AnchorPopup
                key={`${index}-${popup.comment.id}`}
                comment={popup.comment}
                position={popup.position}
                parentRect={popup.parentRect}
                onClose={() => closePopupAtIndex(index)}
                onPopupClick={() => closePopupsAbove(index)}
                isTopmost={index === popupStack.length - 1}
                onClick={(e) => handlePopupRowClick(e, popup.comment)}
                formatTime={formatTime}
                timeOffset={timeOffset}
                settings={{
                  fontSize: 'small',
                  density: 'compact',
                  showImages: showImages,
                }}
                setZoomedImage={handleSetZoomedImage}
                onAnchorClick={(e, resNum) => handleAnchorClick(e, resNum, true)}
                onReplyCountClick={(e, c) => handleReplyCountClick(e, c, true)}
                onIdClick={onIdClick}
                RowComponent={CommentItem}
                totalComments={comments.length}
                customWidth={sidebarWidth - 10 - 5 * index}
                minX={containerLeft + 5 * (index + 1)}
                style={{ zIndex: 60 + index * 10 }}
              />
            ) : (
              <ReplyListPopup
                key={`${index}-${popup.comment.id}`}
                comments={popup.replies}
                parentComment={popup.comment}
                position={popup.position}
                parentRect={popup.parentRect}
                onClose={() => closePopupAtIndex(index)}
                onPopupClick={() => closePopupsAbove(index)}
                isTopmost={index === popupStack.length - 1}
                onClick={handlePopupRowClick}
                formatTime={formatTime}
                timeOffset={timeOffset}
                settings={{
                  fontSize: 'small',
                  density: 'compact',
                  showImages: showImages,
                }}
                setZoomedImage={handleSetZoomedImage}
                onAnchorClick={(e, resNum) => handleAnchorClick(e, resNum, true)}
                onReplyCountClick={(e, c) => handleReplyCountClick(e, c, true)}
                onIdClick={onIdClick}
                RowComponent={CommentItem}
                totalComments={comments.length}
                customWidth={sidebarWidth - 10 - 5 * index}
                minX={containerLeft + 5 * (index + 1)}
                style={{ zIndex: 60 + index * 10 }}
              />
            )
          )}
        </>
      )}

      {/* Context Menu for Sidebar */}
      {sidebarContextMenu && (
        <CommentContextMenu
          position={{ x: sidebarContextMenu.x, y: sidebarContextMenu.y }}
          comment={sidebarContextMenu.comment} // Pass the comment object
          onClose={() => setSidebarContextMenu(null)}
          onJumpToComment={handleJumpToComment}
          onSeek={(time) => {
            setIsAutoScroll(true); // Force Auto Mode locally immediately
            onSeekAndPlay(time); // Seek, play, and exit log mode
            setSidebarContextMenu(null);
          }}
          onSetLogStart={(comment) => {
            handleSetLogStart(comment);
            setSidebarContextMenu(null);
          }}
          onSetCmStart={(time) => {
            handleSetCmStart(time);
            setSidebarContextMenu(null);
          }}
          onSetCmEnd={(time) => {
            handleSetCmEnd(time);
            setSidebarContextMenu(null);
          }}
          onAddNgId={(userId) => {
            onAddNgId(userId);
            setSidebarContextMenu(null);
          }}
          onAddNgComment={(commentId) => {
            onAddNgComment(commentId);
            setSidebarContextMenu(null);
          }}
          onCopyId={(id) => {
            navigator.clipboard.writeText(id).then(() => {
              // alert?
            });
          }}
          onCopyComment={(text) => {
            navigator.clipboard.writeText(text);
          }}
          onSetEndCardPreview={onSetEndCardPreview}
          formatTime={formatTime}
          timeOffset={timeOffset}
          aaMode={aaMode}
          aaOverride={aaOverrideMap[sidebarContextMenu.comment.id]}
          onToggleAA={onToggleAA}
        />
      )}

      {/* Image Zoom Modal removed - now global */}
    </div>
  );
};

export default Sidebar;
