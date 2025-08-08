import { useCallback } from 'react';
import groupPlaySoundFile from '@assets/11L-a_magical_wand_sound-1750472455700_1752273616988.mp3';

export const useGroupPlaySound = () => {
  const playGroupPlaySound = useCallback(() => {
    try {
      const audio = new Audio(groupPlaySoundFile);
      audio.volume = 0.7; // Set reasonable volume
      audio.play().catch(error => {
        console.log('Group play sound failed:', error);
        // Fail silently - audio permissions may not be granted
      });
    } catch (error) {
      console.log('Group play sound creation failed:', error);
      // Fail silently - audio file may not be available
    }
  }, []);

  return playGroupPlaySound;
};