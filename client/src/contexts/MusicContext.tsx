import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';

// Import music tracks
import cityNightPath from '@assets/StockTune-City Sounds At Night_1750361466_1752018353180.mp3';
import tokyoVibesPath from '@assets/StockTune-Night Vibes In Tokyo_1750723121_1752018353181.mp3';
import raindropsPath from '@assets/StockTune-Raindrops On Windowpanes_1750258152_1752018353180.mp3';
import sunlitFieldsPath from '@assets/StockTune-Sunlit Fields Bliss_1750622133_1752018353180.mp3';
import urbanJazzPath from '@assets/StockTune-Urban Jazz Interludes_1750525489_1752018353180.mp3';
import whispersPath from '@assets/StockTune-Whispers Of The Past_1750960897_1752018353181.mp3';

// Import sound effects
import buttonClickSoundPath from '@assets/11L-Pressing_or_activati-1749676429587_1752020601114.mp3';

export interface MusicTrack {
  id: string;
  name: string;
  path: string;
}

export interface MusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrack: MusicTrack | null;
  currentTrackIndex: number;
  tracks: MusicTrack[];
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  pauseForVideo: () => void;
  resumeAfterVideo: () => void;
  // Sound effects
  soundEffectsEnabled: boolean;
  toggleSoundEffects: () => void;
  playButtonClickSound: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

const musicTracks: MusicTrack[] = [
  { id: 'raindrops', name: 'Raindrops On Windowpanes', path: raindropsPath },
  { id: 'city-night', name: 'City Sounds At Night', path: cityNightPath },
  { id: 'urban-jazz', name: 'Urban Jazz Interludes', path: urbanJazzPath },
  { id: 'sunlit-fields', name: 'Sunlit Fields Bliss', path: sunlitFieldsPath },
  { id: 'tokyo-vibes', name: 'Night Vibes In Tokyo', path: tokyoVibesPath },
  { id: 'whispers', name: 'Whispers Of The Past', path: whispersPath }
];

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Load muted state from localStorage
    const savedMuted = localStorage.getItem('jemzy_music_muted');
    return savedMuted ? JSON.parse(savedMuted) : false;
  });
  const [volume, setVolumeState] = useState(() => {
    // Load volume from localStorage
    const savedVolume = localStorage.getItem('jemzy_music_volume');
    return savedVolume ? JSON.parse(savedVolume) : 0.3;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    // Start with a random track to avoid repetitive experience
    return Math.floor(Math.random() * musicTracks.length);
  });
  const [wasPlayingBeforeVideo, setWasPlayingBeforeVideo] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false); // Track auto-advancement vs manual pause
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    // Load sound effects preference from localStorage
    const savedSoundEffects = localStorage.getItem('jemzy_sound_effects_enabled');
    return savedSoundEffects ? JSON.parse(savedSoundEffects) : true;
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonClickAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = musicTracks[currentTrackIndex];

  // Track control functions
  const nextTrack = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % musicTracks.length;
    setCurrentTrackIndex(nextIndex);
  }, [currentTrackIndex]);

  const previousTrack = useCallback(() => {
    const prevIndex = currentTrackIndex === 0 ? musicTracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
  }, [currentTrackIndex]);

  // Initialize audio elements only once
  useEffect(() => {
    // Initialize music audio
    audioRef.current = new Audio();
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.loop = false; // We'll handle track progression manually
    
    // Initialize button click sound effect
    buttonClickAudioRef.current = new Audio(buttonClickSoundPath);
    buttonClickAudioRef.current.volume = 0.4; // Lower volume for sound effects
    
    // Handle play/pause state changes
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      // Only set playing to false if it's not an auto-advance
      if (!isAutoAdvancing) {
        setIsPlaying(false);
      }
    };
    
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    
    // Load first track and start playing automatically
    if (currentTrack) {
      audioRef.current.src = currentTrack.path;
      audioRef.current.load();
      setIsInitialized(true);
      
      // Auto-start music after a short delay
      setTimeout(() => {
        audioRef.current?.play().catch(console.error);
      }, 1000);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (buttonClickAudioRef.current) {
        buttonClickAudioRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle track ending to advance to next track
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleEnded = () => {
      console.log('Track ended, advancing to next track. Current index:', currentTrackIndex);
      const nextIndex = (currentTrackIndex + 1) % musicTracks.length;
      console.log('Moving to track index:', nextIndex, 'Track:', musicTracks[nextIndex]?.name);
      // Mark as auto-advancing to distinguish from manual pause
      setIsAutoAdvancing(true);
      setCurrentTrackIndex(nextIndex);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [currentTrackIndex, isAutoAdvancing]); // Re-attach event listener when track index or auto-advance state changes

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const wasPlaying = isPlaying;
      const autoAdvancing = isAutoAdvancing;
      console.log('Loading new track:', currentTrack.name, 'Was playing:', wasPlaying, 'Auto-advancing:', autoAdvancing);
      audioRef.current.src = currentTrack.path;
      audioRef.current.load();
      
      // Auto-play next track if music was playing OR if auto-advancing from track end
      if (wasPlaying || autoAdvancing) {
        // Small delay to ensure audio is loaded
        setTimeout(() => {
          audioRef.current?.play().then(() => {
            console.log('Auto-playing next track:', currentTrack.name);
            setIsAutoAdvancing(false); // Reset auto-advance flag
          }).catch(console.error);
        }, 100);
      } else {
        // Reset auto-advance flag even if not playing
        setIsAutoAdvancing(false);
      }
    }
  }, [currentTrackIndex]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggle = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    localStorage.setItem('jemzy_music_volume', JSON.stringify(newVolume));
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('jemzy_music_muted', JSON.stringify(newMutedState));
  };

  const toggleSoundEffects = () => {
    const newSoundEffectsState = !soundEffectsEnabled;
    setSoundEffectsEnabled(newSoundEffectsState);
    localStorage.setItem('jemzy_sound_effects_enabled', JSON.stringify(newSoundEffectsState));
  };

  const playButtonClickSound = () => {
    if (soundEffectsEnabled && buttonClickAudioRef.current) {
      buttonClickAudioRef.current.currentTime = 0; // Reset to start
      buttonClickAudioRef.current.play().catch(console.error);
    }
  };

  const pauseForVideo = () => {
    if (isPlaying) {
      setWasPlayingBeforeVideo(true);
      pause();
    }
  };

  const resumeAfterVideo = () => {
    if (wasPlayingBeforeVideo) {
      setWasPlayingBeforeVideo(false);
      play();
    }
  };

  const contextValue: MusicContextType = {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    currentTrackIndex,
    tracks: musicTracks,
    play,
    pause,
    toggle,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    pauseForVideo,
    resumeAfterVideo,
    soundEffectsEnabled,
    toggleSoundEffects,
    playButtonClickSound
  };

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};