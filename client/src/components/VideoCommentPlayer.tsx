import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useVideoPlayback } from '@/hooks/useVideoPlayback.ts';

interface VideoCommentPlayerProps {
  videoUrl: string;
  duration?: number;
  thumbnailUrl?: string | null;
  commentData?: any;
  onFullscreen?: () => void;
  onDelete?: (commentId: number) => void;
  isFullscreen?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number, isPlaying: boolean) => void;
  showCustomControls?: boolean; // When true, hide VideoCommentPlayer's own controls
}

export function VideoCommentPlayer({
  videoUrl,
  duration = 0,
  thumbnailUrl,
  commentData,
  onFullscreen,
  onDelete,
  isFullscreen = false,
  onTimeUpdate,
  showCustomControls = false
}: VideoCommentPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setVideoPlaying } = useVideoPlayback();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (onFullscreen && !isFullscreen) {
      onFullscreen();
      return;
    }
    
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration, !videoRef.current.paused);
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setVideoPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setVideoPlaying(false);
    };
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className={`relative bg-gray-200 overflow-hidden flex items-center justify-center ${
        isFullscreen ? 'w-full h-full' : 'w-48 h-32 rounded-lg'
      }`}>
        <div className="text-center text-gray-500 text-sm">
          <p>Video unavailable</p>
        </div>
      </div>
    );
  }

  // Removed excessive debug logging to prevent console spam

  return (
    <div 
      className={`relative group overflow-hidden bg-black ${
        isFullscreen ? 'w-full h-full' : 'w-48 h-32 rounded-lg'
      }`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`w-full h-full object-contain bg-black ${isFullscreen ? 'fullscreen-video' : ''}`}
        playsInline
        preload="metadata"
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlay}
            className="bg-black/70 hover:bg-black/90 text-white rounded-full p-3"
            size="sm"
          >
            <Play className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Controls Overlay */}
      {(showControls || isFullscreen) && !isLoading && !showCustomControls && (
        <div className="absolute inset-0 bg-black/30 flex flex-col justify-between p-2">
          {/* Top Controls */}
          <div className="flex justify-between items-start">
            {/* Delete Button (only for non-fullscreen and if onDelete provided) */}
            {!isFullscreen && onDelete && commentData?.id && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(commentData.id);
                }}
                className="bg-red-500/80 hover:bg-red-600 text-white p-1"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            {/* Fullscreen Button */}
            {!isFullscreen && onFullscreen && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onFullscreen();
                }}
                className="bg-black/60 hover:bg-black/80 text-white p-1"
                size="sm"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="space-y-2">
            {/* Progress Bar */}
            {videoRef.current?.duration && (
              <div 
                className="w-full h-1 bg-white/30 rounded cursor-pointer"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-white rounded"
                  style={{ 
                    width: `${(currentTime / videoRef.current.duration) * 100}%` 
                  }}
                />
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={togglePlay}
                  className="bg-black/60 hover:bg-black/80 text-white p-1"
                  size="sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <Button
                  onClick={toggleMute}
                  className="bg-black/60 hover:bg-black/80 text-white p-1"
                  size="sm"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Time Display */}
              <div className="text-white text-xs bg-black/60 px-2 py-1 rounded">
                {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || duration)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duration Badge (only when not in fullscreen and not showing controls) */}
      {!isFullscreen && !showControls && !isLoading && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatTime(duration)}
        </div>
      )}
    </div>
  );
}