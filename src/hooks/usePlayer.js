import { useState, useRef, useCallback } from 'react';

export const usePlayer = () => {
    const playerRef = useRef(null);
    const [videoSrc, setVideoSrc] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [videoFileName, setVideoFileName] = useState("");
    const [videoFilePath, setVideoFilePath] = useState(""); // Full absolute path (for compatibility with Desktop version)
    const [isReady, setIsReady] = useState(false); // New: Track player readiness

    const setPlayingState = useCallback((playing) => {
        setIsPlaying(playing);
    }, []);

    const setPlayerInstance = useCallback((instance) => {
        playerRef.current = instance;
    }, []);

    const safePlay = useCallback(async () => {
        // Just set state, ReactPlayer handles the rest
        setIsPlaying(true);
    }, []);

    const handleDuration = useCallback((d) => {
        setDuration(d);
    }, []);

    // Seek needs to be imperative on the ref
    const seekTo = useCallback((time) => {
        if (playerRef.current) {
            if (typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(time, 'seconds');
            } else if (playerRef.current.currentTime !== undefined) {
                playerRef.current.currentTime = time;
            } else {
                console.warn("playerRef.current.seekTo is not a function", playerRef.current);
            }
        }
    }, []);

    const getCurrentTime = useCallback(() => {
        if (playerRef.current) {
            if (typeof playerRef.current.getCurrentTime === 'function') {
                return playerRef.current.getCurrentTime();
            }
            // Silent fallback for native video
            if (playerRef.current.currentTime !== undefined) {
                return playerRef.current.currentTime;
            }
            console.warn("playerRef.current.getCurrentTime is not a function", playerRef.current);
        }
        return 0;
    }, []);

    const handleVolumeChange = useCallback((e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume); // 0 to 1
        if (newVolume > 0) {
            setIsMuted(false);
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoFileName(file.name);
            setIsReady(false); // Reset ready on file change
            setIsPlaying(false); // Reset playing state
            if (playerRef.current) {
                // Native video resets
            }
        }
    }, []);

    // Load video from File object directly (for compatibility with Desktop version)
    // path is optional - if provided, stores the absolute file path for project saving
    const loadVideoFromFile = useCallback((file, path = null) => {
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoFileName(file.name);
            setVideoFilePath(path || "");
            setIsReady(false);
            setIsPlaying(false);
        }
    }, []);

    const setVideoSrcWrapper = useCallback((src) => {
        setVideoSrc(src);
        setIsReady(false); // Reset ready on URL change
        setIsPlaying(false); // Reset playing state
    }, []);

    return {
        videoRef: playerRef, // Rename ref internally but keep exposing as videoRef for compatibility
        playerRef,
        videoSrc,
        setVideoSrc: setVideoSrcWrapper, // Use wrapper
        videoFileName,
        setVideoFileName,
        videoFilePath,
        setVideoFilePath,
        isPlaying,
        setIsPlaying,
        setPlayingState,
        duration,
        handleDuration, // ReactPlayer onDuration
        volume,
        isMuted,
        handleVolumeChange,
        toggleMute,
        safePlay,
        handleFileChange,
        loadVideoFromFile,
        seekTo,
        getCurrentTime,
        isReady,
        setIsReady,
        setPlayerInstance,
    };
};
