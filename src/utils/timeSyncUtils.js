export const parseSyncTime = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

export const isAbsoluteRawTime = (rawTime) => new Date(rawTime).getFullYear() >= 2000;

export const findFirstAbsoluteComment = (comments) =>
  comments.find((comment) => isAbsoluteRawTime(comment.rawTime)) || null;

export const resolveLogReferenceTime = (comments, startTimeStr, startDateStr) => {
  const firstAbsoluteComment = findFirstAbsoluteComment(comments);
  if (!firstAbsoluteComment) return null;

  const refDate = new Date(firstAbsoluteComment.rawTime);

  if (startDateStr) {
    const dateParts = startDateStr.split('-').map(Number);
    if (dateParts.length === 3) {
      refDate.setFullYear(dateParts[0], dateParts[1] - 1, dateParts[2]);
    }
  }

  if (startTimeStr) {
    const timeParts = startTimeStr.split(':').map(Number);
    if (timeParts.length === 3) {
      refDate.setHours(timeParts[0], timeParts[1], timeParts[2], 0);
    }
  }

  return refDate.getTime();
};

export const getCommentDisplayTime = (comment, logRefTime) => {
  if (!isAbsoluteRawTime(comment.rawTime)) {
    return comment.rawTime / 1000;
  }

  if (logRefTime) {
    return (comment.rawTime - logRefTime) / 1000;
  }

  return comment.rawTime / 1000;
};

export const normalizeCommentTimes = (comments, logRefTime) => {
  let needsUpdate = false;

  const normalizedComments = comments.map((comment) => {
    const time = getCommentDisplayTime(comment, logRefTime);
    if (comment.time === undefined || Math.abs(comment.time - time) > 0.001) {
      needsUpdate = true;
    }
    return { ...comment, time };
  });

  return { comments: normalizedComments, needsUpdate };
};
