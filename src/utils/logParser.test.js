import { describe, expect, it } from 'vitest';

import { parseDatBuffer, parseLogFile } from './logParser';

describe('parseLogFile', () => {
  it('5ch風のテキストログをタイトルと本文つきで解析できる', async () => {
    const text = [
      'テストスレッド',
      '1 : Alice 2025/10/12(日) 10:00:00.00 ID:user1',
      'こんにちは',
      '>>2',
      '2 : Bob 2025/10/12(日) 10:00:05.00 ID:user2',
      '返信です',
    ].join('\n');
    const file = {
      name: 'thread.txt',
      text: async () => text,
    };

    const result = await parseLogFile(file, 'file-1');

    expect(result.title).toBe('テストスレッド');
    expect(result.rawComments).toHaveLength(2);
    expect(result.rawComments[0]).toMatchObject({
      id: 'file-1-1',
      originalResNum: 1,
      name: 'Alice',
      userId: 'user1',
      text: 'こんにちは\n>>2',
      sourceFileId: 'file-1',
    });
    expect(result.rawComments[1].text).toBe('返信です');
  });

  it('JSON形式の相対時間ログを解析できる', async () => {
    const file = {
      name: 'abema.json',
      text: async () =>
        JSON.stringify([{ time: 12.345, formattedTime: '00:12', comment: 'テストコメント' }]),
    };

    const result = await parseLogFile(file, 'json-1');

    expect(result.title).toBe('Abema Log');
    expect(result.startDate).toBe(0);
    expect(result.rawComments[0]).toMatchObject({
      id: 'json-1-0',
      rawTime: 12345,
      text: 'テストコメント',
    });
  });

  it('文字列入力がHTMLでない場合はテキストログとして解析できる', async () => {
    const text = ['URLログ', '1 : Alice 2025/10/12(日) 10:00:00.00 ID:user1', '本文'].join('\n');

    const result = await parseLogFile(text, 'url-text-1');

    expect(result.title).toBe('URLログ');
    expect(result.rawComments[0]).toMatchObject({
      id: 'url-text-1-1',
      name: 'Alice',
      userId: 'user1',
      text: '本文',
    });
  });

  it('datログのHTMLタグとエンティティを本文として読める', () => {
    const datText =
      'Alice<>sage<>2025/10/12(日) 10:00:00.00 ID:user1<>body&lt;br&gt;<br>&gt;&gt;2<>dat title';
    const buffer = new TextEncoder().encode(datText).buffer;

    const result = parseDatBuffer(buffer, 'thread.dat');

    expect(result.title).toBe('dat title');
    expect(result.rawComments[0]).toMatchObject({
      originalResNum: 1,
      name: 'Alice',
      userId: 'user1',
      text: 'body<br>\n>>2',
    });
  });
});
