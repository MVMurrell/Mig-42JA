import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Slider } from '@/components/ui/slider.tsx';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, VolumeOff } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext.tsx';
import { useButtonSound } from '@/hooks/useButtonSound.ts';

interface MusicControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicControlModal: React.FC<MusicControlModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    toggle,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    play,
    soundEffectsEnabled,
    toggleSoundEffects
  } = useMusic();

  // Create sound-enabled handlers
  const handleToggle = useButtonSound(toggle);
  const handlePreviousTrack = useButtonSound(previousTrack);
  const handleNextTrack = useButtonSound(nextTrack);
  const handleToggleMute = useButtonSound(toggleMute);
  // Don't play sound when toggling sound effects to avoid restart
  const handleToggleSoundEffects = toggleSoundEffects;
  const handleClose = useButtonSound(onClose);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Background Music
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Track Display */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Now Playing</div>
              <div className="font-semibold text-blue-800 dark:text-blue-200">
                {currentTrack?.name || 'No track selected'}
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousTrack}
              className="w-10 h-10 p-0"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleToggle}
              className="w-12 h-12 p-0 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextTrack}
              className="w-10 h-10 p-0"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Volume
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleMute}
                className="w-8 h-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-gray-400" />
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.1}
                className="flex-1"
                disabled={isMuted}
              />
              <Volume2 className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </div>
          </div>

          {/* Sound Effects Control */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Button Sound Effects
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSoundEffects}
                className={`w-8 h-8 p-0 ${soundEffectsEnabled ? 'text-blue-500' : 'text-gray-400'}`}
              >
                {soundEffectsEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeOff className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {soundEffectsEnabled ? 'Click sounds enabled' : 'Click sounds disabled'}
            </div>
          </div>

          {/* Music Info */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
            Background music automatically pauses when videos play
          </div>

          {/* Close Button */}
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};