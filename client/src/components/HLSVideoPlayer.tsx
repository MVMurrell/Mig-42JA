import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';
import { useVideoPlayback } from '@/hooks/useVideoPlayback.ts';

interface HLSVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onLoadedMetadata?: () => void;
  onTimeUpdate?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
  onPause?: () => void;
}

export interface HLSVideoPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  setCurrentTime: (time: number) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

const HLSVideoPlayer = forwardRef<HLSVideoPlayerRef, HLSVideoPlayerProps>(({
  src,
  poster,
  autoPlay = false,
  muted = false,
  controls = false,
  className = '',
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onError,
  onCanPlay,
  onPlaying,
  onPause
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isHLS, setIsHLS] = useState(false);
  const { setVideoPlaying } = useVideoPlayback();

  useImperativeHandle(ref, () => ({
    play: async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error('Play failed:', error);
          throw error;
        }
      }
    },
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    get currentTime() {
      return videoRef.current?.currentTime || 0;
    },
    get duration() {
      return videoRef.current?.duration || 0;
    },
    get paused() {
      return videoRef.current?.paused || true;
    },
    get muted() {
      return videoRef.current?.muted || false;
    },
    get volume() {
      return videoRef.current?.volume || 1;
    },
    setCurrentTime: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    setMuted: (muted: boolean) => {
      if (videoRef.current) {
        videoRef.current.muted = muted;
      }
    },
    setVolume: (volume: number) => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
      }
    },
    getVideoElement: () => {
      return videoRef.current;
    }
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if it's an HLS stream
    const isHLSStream = src.includes('.m3u8') || src.includes('bunny-proxy');
    setIsHLS(isHLSStream);

    if (isHLSStream && Hls.isSupported()) {
      // HLS.js initialization
      
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        debug: false,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        startLevel: -1, // Auto quality selection
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 3
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded successfully');
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('HLS: Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('HLS: Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('HLS: Fatal error, cannot recover');
              hls.destroy();
              if (onError) {
                onError({
                  code: 4,
                  message: `HLS_ERROR: ${data.details}`,
                  type: data.type,
                  details: data.details
                });
              }
              break;
          }
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);

    } else if (isHLSStream && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      console.log('Using native HLS support for:', src);
      video.src = src;
    } else if (!isHLSStream) {
      // Regular video file
      console.log('Using native video player for:', src);
      video.src = src;
    } else {
      console.error('HLS not supported and no native support available');
      if (onError) {
        onError({
          code: 4,
          message: 'HLS_NOT_SUPPORTED',
          type: 'UNSUPPORTED_FORMAT'
        });
      }
    }

    // Set initial properties
    video.muted = muted;
    if (autoPlay) {
      video.autoplay = true;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => onLoadedMetadata?.();
    const handleTimeUpdate = () => onTimeUpdate?.();
    const handleEnded = () => {
      setVideoPlaying(false);
      onEnded?.();
    };
    const handleCanPlay = () => onCanPlay?.();
    const handlePlaying = () => {
      setVideoPlaying(true);
      onPlaying?.();
    };
    const handlePause = () => {
      setVideoPlaying(false);
      onPause?.();
    };
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const error = target.error;
      console.error('Video error:', error);
      onError?.(error);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [onLoadedMetadata, onTimeUpdate, onEnded, onCanPlay, onPlaying, onPause, onError]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      className={className}
      playsInline
      webkit-playsinline="true"
      preload="metadata"
    />
  );
});

HLSVideoPlayer.displayName = 'HLSVideoPlayer';

export default HLSVideoPlayer;