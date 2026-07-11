const DEFAULT_BASE_TIME = new Date('2000-01-01T00:00:00').getTime();

export const resolveBaseTime = (loadedFiles, startDateStr, startTimeStr) => {
  if (startDateStr && startTimeStr) {
    const date = new Date(`${startDateStr}T${startTimeStr}`);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  const absoluteFiles = loadedFiles.filter((file) => file.startDate && file.startDate > 0);
  if (absoluteFiles.length > 0) {
    return Math.min(...absoluteFiles.map((file) => file.startDate));
  }

  return DEFAULT_BASE_TIME;
};

export const formatAbsoluteTime = (absoluteTime) => {
  const date = new Date(absoluteTime);
  const days = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dayStr = days[date.getDay()];
  const HH = String(date.getHours()).padStart(2, '0');
  const MM = String(date.getMinutes()).padStart(2, '0');
  const SS = String(date.getSeconds()).padStart(2, '0');
  const MMM = String(date.getMilliseconds()).padStart(3, '0');
  return `${yyyy}/${mm}/${dd}${dayStr} ${HH}:${MM}:${SS}.${MMM}`;
};

const enrichComment = (comment, file, baseTime) => {
  const isRelativeLog = file && file.startDate === 0;
  const absoluteTime = isRelativeLog ? baseTime + comment.rawTime : comment.rawTime;
  const vpos = isRelativeLog ? comment.rawTime / 1000 : (comment.rawTime - baseTime) / 1000;

  return {
    ...comment,
    vpos,
    time: vpos,
    absoluteTime,
    dateDisplay: formatAbsoluteTime(absoluteTime),
    fileColorIndex: file?.colorIndex ?? 0,
    fileCustomColor: file?.customColor || null,
  };
};

const buildNgMatchers = (ngSettings = {}) => {
  const regexes = [];
  const words = [];

  (ngSettings.words || []).forEach((wordEntry) => {
    if (typeof wordEntry === 'object' && wordEntry.isRegex) {
      try {
        regexes.push(new RegExp(wordEntry.text));
      } catch {
        // 不正な正規表現は無視する
      }
      return;
    }
    words.push(typeof wordEntry === 'string' ? wordEntry : wordEntry.text);
  });

  return {
    ids: new Set(ngSettings.ids || []),
    comments: new Set(ngSettings.comments || []),
    words,
    regexes,
  };
};

const isBlockedByNg = (comment, matchers) => {
  if (matchers.ids.has(comment.userId)) return true;
  if (matchers.comments.has(comment.id)) return true;
  if (matchers.words.some((word) => comment.text.includes(word))) return true;
  return matchers.regexes.some((regex) => regex.test(comment.text));
};

const addUserCommentMeta = (comments) => {
  const userGroups = {};
  comments.forEach((comment) => {
    const uid = comment.userId;
    if (!uid) return;
    if (!userGroups[uid]) userGroups[uid] = [];
    userGroups[uid].push(comment);
  });

  const metaMap = new Map();
  Object.entries(userGroups).forEach(([, group]) => {
    const total = group.length;
    group.forEach((comment, index) => {
      metaMap.set(comment.id, { userIndex: index + 1, userTotal: total });
    });
  });

  return comments.map((comment) => ({ ...comment, ...(metaMap.get(comment.id) || {}) }));
};

export const buildVisibleComments = ({
  comments,
  loadedFiles,
  ngSettings,
  startDateStr,
  startTimeStr,
}) => {
  if (loadedFiles.length === 0) return [];

  const baseTime = resolveBaseTime(loadedFiles, startDateStr, startTimeStr);
  const visibleFileIds = new Set(
    loadedFiles.filter((file) => file.isVisible).map((file) => file.id)
  );
  const fileMap = new Map(loadedFiles.map((file) => [file.id, file]));
  const ngMatchers = buildNgMatchers(ngSettings);

  const enriched = comments
    .filter((comment) => visibleFileIds.has(comment.sourceFileId))
    .filter((comment) => !isBlockedByNg(comment, ngMatchers))
    .map((comment) => enrichComment(comment, fileMap.get(comment.sourceFileId), baseTime))
    .sort((a, b) => a.vpos - b.vpos);

  return addUserCommentMeta(enriched);
};

export const buildAllCommentsEnriched = ({ comments, loadedFiles, startDateStr, startTimeStr }) => {
  if (loadedFiles.length === 0) return [];

  const baseTime = resolveBaseTime(loadedFiles, startDateStr, startTimeStr);
  const fileMap = new Map(loadedFiles.map((file) => [file.id, file]));

  return comments
    .map((comment) => enrichComment(comment, fileMap.get(comment.sourceFileId), baseTime))
    .sort((a, b) => a.vpos - b.vpos);
};
