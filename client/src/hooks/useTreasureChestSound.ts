import { useCallback } from 'react';
import treasureChestOpeningSound from '@assets/11L-The_opening_of_a_tre-1749675908805_1752023891726.mp3';

export function useTreasureChestSound() {
  const playTreasureChestOpeningSound = useCallback(() => {
    try {
      const audio = new Audio(treasureChestOpeningSound);
      
      // Set volume to match other sound effects
      audio.volume = 0.4;
      
      // Play the sound
      audio.play().catch(error => {
        console.log('Treasure chest opening sound could not be played:', error);
      });
    } catch (error) {
      console.log('Error creating treasure chest opening sound:', error);
    }
  }, []);

  return playTreasureChestOpeningSound;
}