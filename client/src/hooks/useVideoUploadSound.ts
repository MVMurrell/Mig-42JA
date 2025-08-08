import { useRef, useCallback } from 'react';
import bellSoundFile from '@assets/11L-That_bell_or_ring_so-1750261996446_1752025004721.mp3';

export function useVideoUploadSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playBellSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(bellSoundFile);
        audioRef.current.volume = 0.7;
      }
      
      // Reset audio to beginning and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn('Video upload bell sound playback failed:', error);
      });
    } catch (error) {
      console.warn('Error playing video upload bell sound:', error);
    }
  }, []);

  return playBellSound;
}