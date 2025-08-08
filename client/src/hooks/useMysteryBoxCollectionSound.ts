import { useRef } from 'react';
import mysteryBoxSound from '@assets/11L-the_joyful_sound_of_-1752329578588_1752342404591.mp3';

export const useMysteryBoxCollectionSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playMysteryBoxCollectionSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset to beginning
      } else {
        audioRef.current = new Audio(mysteryBoxSound);
        audioRef.current.volume = 0.6; // Moderate volume
      }
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Error playing mystery box collection sound:', error);
    }
  };

  return playMysteryBoxCollectionSound;
};