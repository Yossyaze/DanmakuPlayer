import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCMSystem } from './useCMSystem';

describe('useCMSystem', () => {
  it('CM範囲を動画時間とログ時間の相互変換に反映する', () => {
    const { result } = renderHook(() => useCMSystem(100));

    expect(result.current.getTotalDuration).toBe(100);
    expect(result.current.logTimeToVideoTime(20)).toMatchObject({
      videoTime: 20,
      inCmRange: false,
    });

    act(() => {
      result.current.addCmRange({
        videoStart: 10,
        logEnd: 15,
        labelStart: '0:10',
        labelEnd: '0:15',
      });
    });

    expect(result.current.getTotalDuration).toBe(105);
    expect(result.current.logTimeToVideoTime(12)).toMatchObject({
      videoTime: 10,
      inCmRange: true,
    });
    expect(result.current.logTimeToVideoTime(20)).toMatchObject({
      videoTime: 15,
      inCmRange: false,
    });
    expect(result.current.videoTimeToLogTime(20)).toBe(25);
  });
});
