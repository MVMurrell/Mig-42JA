/**
 * Audio Service for Music and Sound Effects
 * Handles background music, sound effects, and audio preferences
 */

export type SoundEffect = 
  | 'button_click' 
  | 'coin_earned' 
  | 'achievement' 
  | 'notification' 
  | 'video_upload' 
  | 'like' 
  | 'message_sent'
  | 'activity_start'
  | 'activity_stop'
  | 'milestone_reached';

export type BackgroundMusic = 
  | 'ambient' 
  | 'upbeat' 
  | 'nature' 
  | 'electronic';

class AudioService {
  private soundEffects: Map<SoundEffect, HTMLAudioElement> = new Map();
  private backgroundMusic: Map<BackgroundMusic, HTMLAudioElement> = new Map();
  private currentBackgroundMusic: HTMLAudioElement | null = null;
  private masterVolume: number = 0.7;
  private soundEffectVolume: number = 0.8;
  private musicVolume: number = 0.4;
  private isMuted: boolean = false;

  constructor() {
    this.loadAudioPreferences();
    this.initializeSoundEffects();
    this.initializeBackgroundMusic();
  }

  private loadAudioPreferences() {
    const savedPrefs = localStorage.getItem('jemzy_audio_preferences');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      this.masterVolume = prefs.masterVolume ?? 0.7;
      this.soundEffectVolume = prefs.soundEffectVolume ?? 0.8;
      this.musicVolume = prefs.musicVolume ?? 0.4;
      this.isMuted = prefs.isMuted ?? false;
    }
  }

  private saveAudioPreferences() {
    const prefs = {
      masterVolume: this.masterVolume,
      soundEffectVolume: this.soundEffectVolume,
      musicVolume: this.musicVolume,
      isMuted: this.isMuted
    };
    localStorage.setItem('jemzy_audio_preferences', JSON.stringify(prefs));
  }

  private initializeSoundEffects() {
    // Create Web Audio API sound effects using oscillators for now
    // In production, you would load actual audio files
    const soundEffectConfigs: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType }> = {
      button_click: { frequency: 800, duration: 100, type: 'square' },
      coin_earned: { frequency: 660, duration: 300, type: 'sine' },
      achievement: { frequency: 880, duration: 500, type: 'triangle' },
      notification: { frequency: 550, duration: 200, type: 'sine' },
      video_upload: { frequency: 440, duration: 400, type: 'sawtooth' },
      like: { frequency: 750, duration: 150, type: 'sine' },
      message_sent: { frequency: 600, duration: 120, type: 'triangle' },
      activity_start: { frequency: 523, duration: 250, type: 'sine' },
      activity_stop: { frequency: 392, duration: 250, type: 'sine' },
      milestone_reached: { frequency: 1000, duration: 600, type: 'triangle' }
    };

    Object.entries(soundEffectConfigs).forEach(([effect, config]) => {
      this.soundEffects.set(effect as SoundEffect, this.createToneAudio(config));
    });
  }

  private initializeBackgroundMusic() {
    // For now, create ambient tones. In production, load actual music files
    const musicConfigs: Record<BackgroundMusic, { baseFreq: number; harmonics: number[] }> = {
      ambient: { baseFreq: 220, harmonics: [1, 1.5, 2, 2.5] },
      upbeat: { baseFreq: 440, harmonics: [1, 1.25, 1.5, 2] },
      nature: { baseFreq: 174, harmonics: [1, 1.618, 2.618] },
      electronic: { baseFreq: 330, harmonics: [1, 1.33, 1.66, 2] }
    };

    Object.entries(musicConfigs).forEach(([music, config]) => {
      this.backgroundMusic.set(music as BackgroundMusic, this.createAmbienceAudio(config));
    });
  }

  private createToneAudio(config: { frequency: number; duration: number; type: OscillatorType }): HTMLAudioElement {
    // Create a simple tone using Web Audio API and convert to audio element
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
    oscillator.type = config.type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration / 1000);
    
    // For simplicity, return a dummy audio element
    // In production, you'd generate the audio buffer and create a proper audio element
    const audio = new Audio();
    audio.volume = 0.5;
    return audio;
  }

  private createAmbienceAudio(config: { baseFreq: number; harmonics: number[] }): HTMLAudioElement {
    // Create ambient background music
    const audio = new Audio();
    audio.volume = 0.3;
    audio.loop = true;
    return audio;
  }

  // Sound Effects
  public playSoundEffect(effect: SoundEffect) {
    if (this.isMuted) return;
    
    const audio = this.soundEffects.get(effect);
    if (audio) {
      audio.volume = this.masterVolume * this.soundEffectVolume;
      audio.currentTime = 0;
      
      // For Web Audio API generated sounds, we'll use a simple fallback
      this.playWebAudioTone(effect);
    }
  }

  private playWebAudioTone(effect: SoundEffect) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const configs = {
        button_click: { freq: 800, duration: 100, type: 'square' as OscillatorType },
        coin_earned: { freq: 660, duration: 300, type: 'sine' as OscillatorType },
        achievement: { freq: 880, duration: 500, type: 'triangle' as OscillatorType },
        notification: { freq: 550, duration: 200, type: 'sine' as OscillatorType },
        video_upload: { freq: 440, duration: 400, type: 'sawtooth' as OscillatorType },
        like: { freq: 750, duration: 150, type: 'sine' as OscillatorType },
        message_sent: { freq: 600, duration: 120, type: 'triangle' as OscillatorType },
        activity_start: { freq: 523, duration: 250, type: 'sine' as OscillatorType },
        activity_stop: { freq: 392, duration: 250, type: 'sine' as OscillatorType },
        milestone_reached: { freq: 1000, duration: 600, type: 'triangle' as OscillatorType }
      };
      
      const config = configs[effect];
      if (!config) return;
      
      oscillator.frequency.setValueAtTime(config.freq, audioContext.currentTime);
      oscillator.type = config.type;
      
      const volume = this.masterVolume * this.soundEffectVolume * 0.3;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration / 1000);
    } catch (error) {
      console.log('Audio context not available:', error);
    }
  }

  // Background Music
  public playBackgroundMusic(musicType: BackgroundMusic) {
    if (this.isMuted) return;
    
    this.stopBackgroundMusic();
    
    const music = this.backgroundMusic.get(musicType);
    if (music) {
      music.volume = this.masterVolume * this.musicVolume;
      music.play().catch(error => {
        console.log('Background music autoplay prevented:', error);
      });
      this.currentBackgroundMusic = music;
    }
  }

  public stopBackgroundMusic() {
    if (this.currentBackgroundMusic) {
      this.currentBackgroundMusic.pause();
      this.currentBackgroundMusic.currentTime = 0;
      this.currentBackgroundMusic = null;
    }
  }

  // Volume Controls
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveAudioPreferences();
  }

  public setSoundEffectVolume(volume: number) {
    this.soundEffectVolume = Math.max(0, Math.min(1, volume));
    this.saveAudioPreferences();
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveAudioPreferences();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    }
    this.saveAudioPreferences();
  }

  private updateAllVolumes() {
    if (this.currentBackgroundMusic) {
      this.currentBackgroundMusic.volume = this.masterVolume * this.musicVolume;
    }
  }

  // Getters
  public getMasterVolume(): number { return this.masterVolume; }
  public getSoundEffectVolume(): number { return this.soundEffectVolume; }
  public getMusicVolume(): number { return this.musicVolume; }
  public getIsMuted(): boolean { return this.isMuted; }
  public isPlayingMusic(): boolean { return this.currentBackgroundMusic !== null; }
}

// Singleton instance
export const audioService = new AudioService();