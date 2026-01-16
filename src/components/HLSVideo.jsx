import Hls from 'hls.js';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * 拡張機能経由でHLSリクエストをフェッチするヘルパー
 * @param {string} url - フェッチするURL
 * @param {string} referer - Refererヘッダー（オプション）
 * @returns {Promise<ArrayBuffer>}
 */
const extensionFetch = (url, referer) => {
  return new Promise((resolve, reject) => {
    const requestId = `hls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // console.log('[ExtensionFetch] Requesting:', url.substring(0, 80) + '...');

    const handleResponse = (event) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'DANMAKU_HLS_RESPONSE') return;
      if (event.data?.requestId !== requestId) return;

      window.removeEventListener('message', handleResponse);
      // console.log('[ExtensionFetch] Response received for:', requestId, 'error:', event.data.error);

      if (event.data.error) {
        reject(new Error(event.data.error));
      } else if (event.data.data) {
        // Base64をArrayBufferに変換
        const binaryString = atob(event.data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // console.log('[ExtensionFetch] Data size:', bytes.length, 'bytes');
        resolve(bytes.buffer);
      } else {
        reject(new Error('No data received'));
      }
    };

    window.addEventListener('message', handleResponse);

    // 拡張機能にリクエスト送信
    window.postMessage(
      {
        type: 'DANMAKU_HLS_FETCH',
        requestId,
        url,
        referer,
      },
      '*'
    );

    // タイムアウト（30秒）
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(new Error('Extension fetch timeout'));
    }, 30000);
  });
};

/**
 * hls.js用カスタムローダークラスを生成
 * @param {string} referer - Refererヘッダー
 * @returns {Class} カスタムローダークラス
 */
const createExtensionLoader = (referer) => {
  return class ExtensionLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
      super(config);
    }

    load(context, config, callbacks) {
      const { url, responseType } = context;
      const startTime = performance.now();

      // 拡張機能経由でフェッチ
      extensionFetch(url, referer)
        .then((arrayBuffer) => {
          const endTime = performance.now();

          // responseType に応じてデータ形式を変換（Desktop版と同じロジック）
          let data;
          if (responseType === 'arraybuffer') {
            // セグメントファイル (.ts) またはキーファイル
            data = arrayBuffer;

            // キーファイルの場合は中身をデバッグ出力（無効化）
            // if (url.includes('key')) {
            //   const view = new Uint8Array(data);
            //   const hex = Array.from(view)
            //     .map((b) => b.toString(16).padStart(2, '0'))
            //     .join(' ');
            //   console.log('[HLS] Key data dump:', hex);
            // }
          } else {
            // マニフェスト (.m3u8) はテキスト
            const decoder = new TextDecoder('utf-8');
            data = decoder.decode(new Uint8Array(arrayBuffer));
          }

          const response = {
            url,
            data,
          };
          // hls.js LoaderStats インターフェースに準拠
          const stats = {
            aborted: false,
            loaded: arrayBuffer.byteLength,
            total: arrayBuffer.byteLength,
            retry: 0,
            chunkCount: 1,
            bwEstimate: 0,
            loading: { start: startTime, first: endTime, end: endTime },
            parsing: { start: endTime, end: endTime },
            buffering: { start: endTime, first: endTime, end: endTime },
          };
          callbacks.onSuccess(response, stats, context, null);
        })
        .catch((error) => {
          console.error('ExtensionLoader error:', error);
          const errorStats = {
            aborted: false,
            loaded: 0,
            total: 0,
            retry: 0,
            chunkCount: 0,
            bwEstimate: 0,
            loading: { start: startTime, first: 0, end: 0 },
            parsing: { start: 0, end: 0 },
            buffering: { start: 0, first: 0, end: 0 },
          };
          callbacks.onError({ code: 0, text: error.message }, context, null, errorStats);
        });
    }

    abort() {
      // 中断処理（必要に応じて実装）
    }

    destroy() {
      // クリーンアップ
    }
  };
};

/**
 * HLSVideo - HLS.jsを使用してm3u8ストリームを再生するコンポーネント
 * @param {boolean} useExtensionProxy - Chrome拡張機能経由でフェッチするかどうか
 */
const HLSVideo = forwardRef(
  (
    {
      src,
      onLoadedMetadata,
      onCanPlay,
      onEnded,
      onPause,
      onPlay,
      onError,
      onDuration,
      onReady,
      volume = 1,
      muted = false,
      className = '',
      onClick,
      useExtensionProxy = false, // 拡張機能プロキシを使用するか
      referer = '', // Refererヘッダー（プロキシ使用時）
      onLevelsLoaded, // 画質レベル読み込み完了時
      onLevelChange, // 画質変更時
    },
    ref
  ) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Expose video element methods via ref
    useImperativeHandle(ref, () => ({
      // Get current time
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      // Seek to time
      seekTo: (time) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      // Get duration
      getDuration: () => videoRef.current?.duration || 0,
      // Native element (for compatibility)
      get currentTime() {
        return videoRef.current?.currentTime || 0;
      },
      set currentTime(time) {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      get tagName() {
        return 'VIDEO';
      },
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      get volume() {
        return videoRef.current?.volume || 1;
      },
      set volume(v) {
        if (videoRef.current) videoRef.current.volume = v;
      },
      get muted() {
        return videoRef.current?.muted || false;
      },
      set muted(m) {
        if (videoRef.current) videoRef.current.muted = m;
      },
      // HLS Level Control
      setLevel: (level) => {
        if (hlsRef.current) {
          hlsRef.current.currentLevel = level;
        }
      },
      getLevel: () => {
        return hlsRef.current ? hlsRef.current.currentLevel : -1;
      },
      getLevels: () => {
        return hlsRef.current ? hlsRef.current.levels : [];
      },
      // Playback Rate Control
      get playbackRate() {
        return videoRef.current?.playbackRate || 1;
      },
      set playbackRate(rate) {
        if (videoRef.current) videoRef.current.playbackRate = rate;
      },
    }));

    const onReadyRef = useRef(onReady);
    const onErrorRef = useRef(onError);
    const onLevelsLoadedRef = useRef(onLevelsLoaded);
    const onLevelChangeRef = useRef(onLevelChange);

    useEffect(() => {
      onReadyRef.current = onReady;
      onErrorRef.current = onError;
      onLevelsLoadedRef.current = onLevelsLoaded;
      onLevelChangeRef.current = onLevelChange;
    }, [onReady, onError, onLevelsLoaded, onLevelChange]);

    // Initialize HLS
    useEffect(() => {
      console.log('[HLSVideo] Component Mounted or src changed:', src);

      const video = videoRef.current;
      if (!video || !src) return;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hlsConfig = {
          enableWorker: true,
          lowLatencyMode: false,
        };

        // 拡張機能プロキシを使用する場合（Browser版）
        if (useExtensionProxy) {
          console.log('[HLSVideo] Using extension proxy loader');
          const ExtensionLoader = createExtensionLoader(referer);
          hlsConfig.loader = ExtensionLoader;
          // プロキシ経由では帯域幅測定が機能しないため、最高画質で固定
          // (ユーザーは手動で画質を変更可能)
          hlsConfig.abrEwmaDefaultEstimate = 100000000; // 100 Mbps (非常に高く設定)
          hlsConfig.startLevel = -1; // 自動選択（最高画質を試行）
          hlsConfig.autoStartLoad = true;
          hlsConfig.testBandwidth = false; // 帯域幅テストを無効化
        }

        const hls = new Hls(hlsConfig);
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('[HLS] Manifest parsed', data.levels);

          // プロキシ使用時は最高画質に固定
          if (useExtensionProxy && data.levels.length > 0) {
            const highestLevel = data.levels.length - 1;
            hls.currentLevel = highestLevel;
            console.log(
              `[HLS] Proxy mode: Forcing level ${highestLevel} (${data.levels[highestLevel]?.height}p)`
            );
          }

          if (onReadyRef.current) onReadyRef.current();
          if (onLevelsLoadedRef.current) {
            onLevelsLoadedRef.current(data.levels);
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const level = hls.levels[data.level];
          const bwEstimate = hls.bandwidthEstimate;
          console.log(
            `[HLS ABR] Level switched to ${data.level} (${level?.height}p), ` +
              `Bandwidth estimate: ${(bwEstimate / 1000000).toFixed(2)} Mbps`
          );
          if (onLevelChangeRef.current) {
            onLevelChangeRef.current(data.level);
          }
        });

        // ABR デバッグ: フラグメント読み込み時の帯域幅推定値（冗長なため無効化）
        hls.on(Hls.Events.FRAG_LOADED, () => {
          // const bwEstimate = hls.bandwidthEstimate;
          // const currentLevel = hls.currentLevel;
          // const autoLevel = hls.autoLevelEnabled;
          // console.log(
          //   `[HLS ABR] Frag ${data.frag.sn} loaded, ` +
          //     `Level: ${currentLevel}, Auto: ${autoLevel}, ` +
          //     `BW: ${(bwEstimate / 1000000).toFixed(2)} Mbps`
          // );
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          // バッファ追加イベント - 特に処理なし (ログは冗長なため無効化)
        });

        hls.on(Hls.Events.BUFFER_EOS, () => {
          console.log('[HLS] Buffer EOS (end of stream)');
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLS] Error:', data);

          // プロキシフォールバックを発動する条件:
          // 1. CORS エラー (code: 0)
          // 2. 403 Forbidden エラー (セグメント取得時など)
          const responseCode = data.response?.code;
          const shouldTriggerProxyFallback =
            data.type === Hls.ErrorTypes.NETWORK_ERROR &&
            (responseCode === 0 || responseCode === 403);

          if (shouldTriggerProxyFallback) {
            console.log(
              `[HLS] Network error (code: ${responseCode}), notifying parent to consider proxy.`
            );
            if (onErrorRef.current) onErrorRef.current(data);
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[HLS] Fatal network error, attempting to recover...');
                // 親コンポーネントに通知（プロキシへのフォールバック等のため）
                if (onErrorRef.current) onErrorRef.current(data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[HLS] Fatal media error, attempting to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('[HLS] Fatal error, cannot recover');
                hls.destroy();
                if (onErrorRef.current) onErrorRef.current(data);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = src;
      } else {
        console.error('HLS is not supported in this browser');
        if (onErrorRef.current) onErrorRef.current({ message: 'HLS not supported' });
      }

      return () => {
        console.log('[HLSVideo] Component Unmounting or src changing');
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src, useExtensionProxy, referer]);

    // Sync volume and muted
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = muted;
      }
    }, [volume, muted]);

    return (
      <video
        ref={videoRef}
        className={className}
        onClick={onClick}
        playsInline={true}
        onLoadedMetadata={(e) => {
          console.log('HLSVideo: onLoadedMetadata');
          if (onLoadedMetadata) onLoadedMetadata(e);
          if (onDuration && e.target.duration) {
            onDuration(e.target.duration);
          }
        }}
        onCanPlay={(e) => {
          console.log('HLSVideo: onCanPlay');
          if (onCanPlay) onCanPlay(e);
        }}
        onEnded={onEnded}
        onPause={onPause}
        onPlay={onPlay}
        onError={(e) => {
          console.error('HLSVideo: onError', e.nativeEvent);
          if (onError) onError(e);
        }}
      />
    );
  }
);

HLSVideo.displayName = 'HLSVideo';

export default HLSVideo;
