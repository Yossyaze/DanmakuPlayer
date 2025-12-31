import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Hls from "hls.js";

/**
 * HLSVideo - HLS.jsを使用してm3u8ストリームを再生するコンポーネント
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
      className = "",
      onClick,
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
        return "VIDEO";
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
    }));

    // Initialize HLS
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS: Manifest parsed");
          if (onReady) onReady();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error(
                  "HLS: Fatal network error, attempting to recover..."
                );
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error(
                  "HLS: Fatal media error, attempting to recover..."
                );
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS: Fatal error, cannot recover");
                hls.destroy();
                if (onError) onError(data);
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS support
        video.src = src;
      } else {
        console.error("HLS is not supported in this browser");
        if (onError) onError({ message: "HLS not supported" });
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src, onError, onReady]);

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
        onLoadedMetadata={(e) => {
          console.log("HLSVideo: onLoadedMetadata");
          if (onLoadedMetadata) onLoadedMetadata(e);
          if (onDuration && e.target.duration) {
            onDuration(e.target.duration);
          }
        }}
        onCanPlay={(e) => {
          console.log("HLSVideo: onCanPlay");
          if (onCanPlay) onCanPlay(e);
        }}
        onEnded={onEnded}
        onPause={onPause}
        onPlay={onPlay}
        onError={(e) => {
          console.error("HLSVideo: onError", e.nativeEvent);
          if (onError) onError(e);
        }}
      />
    );
  }
);

HLSVideo.displayName = "HLSVideo";

export default HLSVideo;
