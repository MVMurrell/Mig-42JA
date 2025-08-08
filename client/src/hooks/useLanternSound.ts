import { useCallback } from 'react';
import lanternSoundFile from '@assets/11L-The_sound_of_a_woosh-1752273206973_1752273249266.mp3';

export const useLanternSound = () => {
  const playLanternSound = useCallback(() => {
    try {
      const audio = new Audio(lanternSoundFile);
      audio.volume = 0.6; // Set reasonable volume
      audio.play().catch(error => {
        console.log('Lantern sound play failed:', error);
        // Fail silently - audio permissions may not be granted
      });
    } catch (error) {
      console.log('Lantern sound creation failed:', error);
      // Fail silently - audio file may not be available
    }
  }, []);

  return playLanternSound;
};