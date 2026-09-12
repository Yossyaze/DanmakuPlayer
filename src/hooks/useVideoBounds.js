import { useCallback, useEffect, useState } from 'react';

/**
 * 動画コンテナ内の実際の映像描画領域（上下左右の黒帯を除いた範囲）を計算・監視するカスタムフック
 * @param {React.RefObject} containerRef - 動画プレイヤー枠のDOM Ref
 * @param {React.RefObject} playerRef - ビデオ要素またはHLSVideoのRef
 * @param {string} videoSrc - 現在の動画ソース（動画切り替え時の再計算用）
 * @returns {{ top: number, height: number, left: number, width: number }}
 */
export const useVideoBounds = (containerRef, playerRef, videoSrc) => {
  const [bounds, setBounds] = useState({
    top: 0,
    height: 0,
    left: 0,
    width: 0,
  });

  const updateBounds = useCallback(() => {
    const container = containerRef?.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!containerWidth || !containerHeight) return;

    // ビデオ要素の取得（playerRef、HLSVideoのプロパティ、またはDOM探索）
    let videoEl = null;
    if (playerRef?.current) {
      if (playerRef.current.videoElement) {
        videoEl = playerRef.current.videoElement;
      } else if (playerRef.current instanceof HTMLVideoElement) {
        videoEl = playerRef.current;
      }
    }
    if (!videoEl && container) {
      videoEl = container.querySelector('video');
    }

    const videoWidth = videoEl?.videoWidth || playerRef?.current?.videoWidth || 0;
    const videoHeight = videoEl?.videoHeight || playerRef?.current?.videoHeight || 0;

    // 動画サイズが取得できていない場合はコンテナ全体を返す
    if (!videoWidth || !videoHeight) {
      setBounds((prev) => {
        if (
          prev.top === 0 &&
          Math.abs(prev.height - containerHeight) < 1 &&
          Math.abs(prev.width - containerWidth) < 1
        ) {
          return prev;
        }
        return {
          top: 0,
          height: containerHeight,
          left: 0,
          width: containerWidth,
        };
      });
      return;
    }

    const containerRatio = containerWidth / containerHeight;
    const videoRatio = videoWidth / videoHeight;

    let renderedHeight = containerHeight;
    let top = 0;
    let renderedWidth = containerWidth;
    let left = 0;

    if (containerRatio > videoRatio) {
      // コンテナの方が横長（左右に黒帯、上下はぴったり一致）
      renderedHeight = containerHeight;
      top = 0;
      renderedWidth = containerHeight * videoRatio;
      left = (containerWidth - renderedWidth) / 2;
    } else {
      // コンテナの方が縦長（上下に黒帯、左右はぴったり一致）
      renderedHeight = containerWidth / videoRatio;
      top = (containerHeight - renderedHeight) / 2;
      renderedWidth = containerWidth;
      left = 0;
    }

    setBounds((prev) => {
      // 変化が1ピクセル未満なら再レンダリングをスキップ
      if (
        Math.abs(prev.top - top) < 0.5 &&
        Math.abs(prev.height - renderedHeight) < 0.5 &&
        Math.abs(prev.left - left) < 0.5 &&
        Math.abs(prev.width - renderedWidth) < 0.5
      ) {
        return prev;
      }
      return { top, height: renderedHeight, left, width: renderedWidth };
    });
  }, [containerRef, playerRef]);

  // コンテナのリサイズ監視、ウィンドウのリサイズ監視、および動画要素のイベント監視
  useEffect(() => {
    // 初回フレームでの更新
    const rafId = requestAnimationFrame(() => {
      updateBounds();
    });

    const container = containerRef?.current;
    if (!container) return () => cancelAnimationFrame(rafId);

    // ResizeObserver でコンテナのリサイズを検知
    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });
    resizeObserver.observe(container);

    // ウィンドウのリサイズイベント
    window.addEventListener('resize', updateBounds);

    // video要素のイベントリスナー登録
    let currentVideoEl = null;
    const bindVideoEvents = () => {
      let videoEl = null;
      if (playerRef?.current) {
        if (playerRef.current.videoElement) {
          videoEl = playerRef.current.videoElement;
        } else if (playerRef.current instanceof HTMLVideoElement) {
          videoEl = playerRef.current;
        }
      }
      if (!videoEl && container) {
        videoEl = container.querySelector('video');
      }

      if (videoEl && videoEl !== currentVideoEl) {
        if (currentVideoEl) {
          currentVideoEl.removeEventListener('loadedmetadata', updateBounds);
          currentVideoEl.removeEventListener('resize', updateBounds);
          currentVideoEl.removeEventListener('loadeddata', updateBounds);
        }
        currentVideoEl = videoEl;
        currentVideoEl.addEventListener('loadedmetadata', updateBounds);
        currentVideoEl.addEventListener('resize', updateBounds);
        currentVideoEl.addEventListener('loadeddata', updateBounds);
        updateBounds();
      }
    };

    bindVideoEvents();

    // 動画要素が遅れてマウントされる可能性があるため、MutationObserverでDOM変更も検知
    const mutationObserver = new MutationObserver(() => {
      bindVideoEvents();
      updateBounds();
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateBounds);
      if (currentVideoEl) {
        currentVideoEl.removeEventListener('loadedmetadata', updateBounds);
        currentVideoEl.removeEventListener('resize', updateBounds);
        currentVideoEl.removeEventListener('loadeddata', updateBounds);
      }
    };
  }, [containerRef, playerRef, videoSrc, updateBounds]);

  return bounds;
};
