import { useCallback } from 'react';
import coinCollectionSound from '@assets/11L-You_just_collected_a-1749675668235_1752022361268.mp3';

export function useCoinCollectionSound() {
  const playCoinCollectionSound = useCallback(() => {
    try {
      const audio = new Audio(coinCollectionSound);
      
      // Set volume to match other sound effects
      audio.volume = 0.3;
      
      // Play the sound
      audio.play().catch(error => {
        console.log('Coin collection sound could not be played:', error);
      });
    } catch (error) {
      console.log('Error creating coin collection sound:', error);
    }
  }, []);

  return playCoinCollectionSound;
}