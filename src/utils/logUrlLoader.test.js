import { describe, expect, it } from 'vitest';

import {
  decodeLogBuffer,
  isVideoFileUrl,
  parseFetchedLog,
  resolveLogUrlCandidates,
} from './logUrlLoader';

describe('resolveLogUrlCandidates', () => {
  it('5chのスレッドURLから現行datと過去ログ候補を作る', () => {
    expect(
      resolveLogUrlCandidates('https://hayabusa5.5ch.net/test/read.cgi/livebase/1763886647/')
    ).toEqual([
      'https://hayabusa5.5ch.net/livebase/dat/1763886647.dat',
      'https://hayabusa5.5ch.net/livebase/oyster/1763/1763886647.dat',
    ]);
  });

  it('eddibbのスレッドURLから現行datとkako候補を作る', () => {
    expect(resolveLogUrlCandidates('https://bbs.eddibb.cc/test/read.cgi/live/1763886647')).toEqual([
      'https://bbs.eddibb.cc/live/dat/1763886647.dat',
      'https://bbs.eddibb.cc/live/kako/1763/17638/1763886647.dat',
    ]);
  });

  it('対応外URLはそのまま候補にする', () => {
    expect(resolveLogUrlCandidates('/dummy_log.txt')).toEqual(['/dummy_log.txt']);
  });
});

describe('logUrlLoader helpers', () => {
  it('動画ファイルURLをログ読み込み対象から除外できる', () => {
    expect(isVideoFileUrl('https://example.com/video.mp4')).toBe(true);
    expect(isVideoFileUrl('https://example.com/thread.dat')).toBe(false);
  });

  it('UTF-8のArrayBufferを文字列に戻せる', () => {
    const buffer = new TextEncoder().encode('ログ本文').buffer;
    expect(decodeLogBuffer(buffer)).toBe('ログ本文');
  });

  it('dat以外の取得結果をテキストログとして解析できる', async () => {
    const text = ['URLログ', '1 : Alice 2025/10/12(日) 10:00:00.00 ID:user1', '本文'].join('\n');
    const buffer = new TextEncoder().encode(text).buffer;

    const result = await parseFetchedLog(buffer, 'https://example.com/log.txt');

    expect(result.title).toBe('URLログ');
    expect(result.rawComments[0]).toMatchObject({
      name: 'Alice',
      userId: 'user1',
      text: '本文',
    });
  });
});
