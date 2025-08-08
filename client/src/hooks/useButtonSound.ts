import { useMusic } from '@/contexts/MusicContext.tsx';

/**
 * Hook to easily add sound effects to any button
 * Usage: const handleButtonClick = useButtonSound(originalHandler);
 */
export const useButtonSound = (originalHandler?: () => void) => {
  const { playButtonClickSound } = useMusic();

  return () => {
    playButtonClickSound();
    if (originalHandler) {
      originalHandler();
    }
  };
};

/**
 * Hook to wrap async handlers with sound effects
 * Usage: const handleAsyncClick = useAsyncButtonSound(asyncHandler);
 */
export const useAsyncButtonSound = (originalHandler?: () => Promise<void>) => {
  const { playButtonClickSound } = useMusic();

  return async () => {
    playButtonClickSound();
    if (originalHandler) {
      await originalHandler();
    }
  };
};