import { useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext.tsx';

// Global video state management
let isAnyVideoPlaying = false;
const videoStateListeners: Set<(isPlaying: boolean) => void> = new Set();

export const setGlobalVideoPlaying = (isPlaying: boolean) => {
  if (isAnyVideoPlaying !== isPlaying) {
    isAnyVideoPlaying = isPlaying;
    videoStateListeners.forEach(listener => listener(isPlaying));
  }
};

export const useVideoPlayback = () => {
  const { pauseForVideo, resumeAfterVideo } = useMusic();

  useEffect(() => {
    const handleVideoStateChange = (isPlaying: boolean) => {
      if (isPlaying) {
        pauseForVideo();
      } else {
        resumeAfterVideo();
      }
    };

    videoStateListeners.add(handleVideoStateChange);

    return () => {
      videoStateListeners.delete(handleVideoStateChange);
    };
  }, [pauseForVideo, resumeAfterVideo]);

  return {
    setVideoPlaying: setGlobalVideoPlaying
  };
};