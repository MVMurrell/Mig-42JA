import { useCallback } from 'react';

export function useLanternCollectionSound() {
  const playLanternSound = useCallback(() => {
    try {
      // Use the same magical wand sound as coin collection for consistency
      const audio = new Audio('/attached_assets/11L-a_magical_wand_sound-1750472455700_1752273616988.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => {
        // Ignore audio play errors (user interaction required, etc.)
        console.log('Audio play failed:', e);
      });
    } catch (error) {
      // Ignore audio errors
      console.log('Audio creation failed:', error);
    }
  }, []);

  return playLanternSound;
}