import { describe, expect, it } from 'vitest';

import {
  findFirstAbsoluteComment,
  getCommentDisplayTime,
  normalizeCommentTimes,
  parseSyncTime,
  resolveLogReferenceTime,
} from './timeSyncUtils';

describe('timeSyncUtils', () => {
  it('時刻文字列を秒に変換できる', () => {
    expect(parseSyncTime('01:02:03')).toBe(3723);
    expect(parseSyncTime('02:03')).toBe(123);
    expect(parseSyncTime('')).toBe(0);
  });

  it('最初の絶対時刻コメントを取得できる', () => {
    const absolute = { id: 'abs', rawTime: new Date('2025-10-12T10:00:00').getTime() };
    const relative = { id: 'rel', rawTime: 5000 };

    expect(findFirstAbsoluteComment([relative, absolute])).toBe(absolute);
  });

  it('手動指定されたログ開始日時を基準時刻にできる', () => {
    const comments = [{ rawTime: new Date('2025-10-12T10:00:00').getTime() }];

    const reference = resolveLogReferenceTime(comments, '12:34:56', '2026-01-02');
    const referenceDate = new Date(reference);

    expect(referenceDate.getFullYear()).toBe(2026);
    expect(referenceDate.getMonth()).toBe(0);
    expect(referenceDate.getDate()).toBe(2);
    expect(referenceDate.getHours()).toBe(12);
    expect(referenceDate.getMinutes()).toBe(34);
    expect(referenceDate.getSeconds()).toBe(56);
  });

  it('相対ログと絶対ログの表示秒を計算できる', () => {
    const base = new Date('2025-10-12T10:00:00').getTime();

    expect(getCommentDisplayTime({ rawTime: 12345 }, base)).toBe(12.345);
    expect(getCommentDisplayTime({ rawTime: base + 5000 }, base)).toBe(5);
  });

  it('コメント配列にtimeを付与し、更新が必要か返せる', () => {
    const base = new Date('2025-10-12T10:00:00').getTime();
    const result = normalizeCommentTimes(
      [
        { id: 'same', rawTime: base + 1000, time: 1 },
        { id: 'new', rawTime: base + 2000 },
      ],
      base
    );

    expect(result.needsUpdate).toBe(true);
    expect(result.comments.map((comment) => comment.time)).toEqual([1, 2]);
  });
});
