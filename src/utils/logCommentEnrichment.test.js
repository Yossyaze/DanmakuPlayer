import { describe, expect, it } from 'vitest';

import {
  buildAllCommentsEnriched,
  buildVisibleComments,
  formatAbsoluteTime,
  resolveBaseTime,
} from './logCommentEnrichment';

const absoluteBase = new Date('2025-10-12T10:00:00').getTime();

const files = [
  { id: 'absolute-log', isVisible: true, startDate: absoluteBase, colorIndex: 1 },
  { id: 'relative-log', isVisible: true, startDate: 0, colorIndex: 2, customColor: '#ff0000' },
  { id: 'hidden-log', isVisible: false, startDate: absoluteBase, colorIndex: 3 },
];

const comments = [
  {
    id: 'abs-1',
    sourceFileId: 'absolute-log',
    rawTime: absoluteBase + 1000,
    userId: 'user-a',
    text: '表示するコメント',
  },
  {
    id: 'rel-1',
    sourceFileId: 'relative-log',
    rawTime: 5000,
    userId: 'user-a',
    text: '相対ログ',
  },
  {
    id: 'hidden-1',
    sourceFileId: 'hidden-log',
    rawTime: absoluteBase + 2000,
    userId: 'user-b',
    text: '非表示ファイル',
  },
  {
    id: 'ng-1',
    sourceFileId: 'absolute-log',
    rawTime: absoluteBase + 3000,
    userId: 'blocked-user',
    text: 'NGユーザー',
  },
];

describe('logCommentEnrichment', () => {
  it('基準時刻を手動設定、絶対ログ、既定値の順に決める', () => {
    expect(resolveBaseTime(files, '2026-01-02', '12:34:56')).toBe(
      new Date('2026-01-02T12:34:56').getTime()
    );
    expect(resolveBaseTime(files, '', '')).toBe(absoluteBase);
    expect(resolveBaseTime([], '', '')).toBe(new Date('2000-01-01T00:00:00').getTime());
  });

  it('絶対時刻を表示用文字列に整形する', () => {
    expect(formatAbsoluteTime(absoluteBase)).toMatch(/^2025\/10\/12\(日\) 10:00:00\.000$/);
  });

  it('表示対象ファイルとNG設定を反映してコメントを加工する', () => {
    const result = buildVisibleComments({
      comments,
      loadedFiles: files,
      ngSettings: { ids: ['blocked-user'], comments: [], words: [] },
      startDateStr: '',
      startTimeStr: '',
    });

    expect(result.map((comment) => comment.id)).toEqual(['abs-1', 'rel-1']);
    expect(result[0]).toMatchObject({
      vpos: 1,
      time: 1,
      fileColorIndex: 1,
      userIndex: 1,
      userTotal: 2,
    });
    expect(result[1]).toMatchObject({
      vpos: 5,
      time: 5,
      fileColorIndex: 2,
      fileCustomColor: '#ff0000',
      userIndex: 2,
      userTotal: 2,
    });
  });

  it('LogViewer用には非表示ファイルやNGを除外せず加工する', () => {
    const result = buildAllCommentsEnriched({
      comments,
      loadedFiles: files,
      startDateStr: '',
      startTimeStr: '',
    });

    expect(result.map((comment) => comment.id)).toEqual(['abs-1', 'hidden-1', 'ng-1', 'rel-1']);
  });
});
