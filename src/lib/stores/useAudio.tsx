import { create } from "zustand";
import { backgroundMusic } from "../backgroundMusic";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  explosionSound: HTMLAudioElement | null;
  coinSound: HTMLAudioElement | null;
  isMuted: boolean;
  isBackgroundMusicPlaying: boolean;
  
  // Volume levels (0-1)
  backgroundMusicVolume: number;
  coinSoundVolume: number;
  explosionSoundVolume: number;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setExplosionSound: (sound: HTMLAudioElement) => void;
  setCoinSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playExplosion: () => void;
  playCoin: () => void;
  startBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
  
  // Volume control functions
  setBackgroundMusicVolume: (volume: number) => void;
  setCoinSoundVolume: (volume: number) => void;
  setExplosionSoundVolume: (volume: number) => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  explosionSound: null,
  coinSound: null,
  isMuted: false, // Start unmuted by default
  isBackgroundMusicPlaying: false,
  
  // Default volume levels
  backgroundMusicVolume: 0.3,
  coinSoundVolume: 0.8,
  explosionSoundVolume: 0.6,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setExplosionSound: (sound) => set({ explosionSound: sound }),
  setCoinSound: (sound) => set({ coinSound: sound }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    // Update background music mute state
    backgroundMusic.setMuted(newMutedState);
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }
      
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Success sound skipped (muted)");
        return;
      }
      
      successSound.currentTime = 0;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },
  
  playExplosion: () => {
    const { explosionSound, isMuted, explosionSoundVolume } = get();
    if (explosionSound) {
      if (isMuted) {
        console.log("Explosion sound skipped (muted)");
        return;
      }
      
      try {
        explosionSound.currentTime = 0;
        explosionSound.volume = explosionSoundVolume;
        explosionSound.playbackRate = 1.0;
        
        const playPromise = explosionSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Explosion sound play prevented:", error);
            // Try to play without cloning as fallback
            setTimeout(() => {
              explosionSound.play().catch(() => {
                console.log("Explosion sound fallback failed");
              });
            }, 100);
          });
        }
      } catch (error) {
        console.log("Explosion sound error:", error);
      }
    }
  },
  
  playCoin: () => {
    const { coinSound, isMuted, coinSoundVolume } = get();
    if (coinSound) {
      if (isMuted) {
        console.log("Coin sound skipped (muted)");
        return;
      }
      
      const soundClone = coinSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = coinSoundVolume;
      soundClone.playbackRate = 1.0; // Normal speed since it's already shortened
      soundClone.currentTime = 0; // Start from beginning
      soundClone.play().catch(error => {
        console.log("Coin sound play prevented:", error);
      });
    }
  },
  
  startBackgroundMusic: () => {
    const { isBackgroundMusicPlaying, backgroundMusicVolume } = get();
    if (!isBackgroundMusicPlaying) {
      backgroundMusic.start();
      backgroundMusic.setVolume(backgroundMusicVolume);
      set({ isBackgroundMusicPlaying: true });
      console.log("Background music started");
    }
  },
  
  stopBackgroundMusic: () => {
    const { isBackgroundMusicPlaying } = get();
    if (isBackgroundMusicPlaying) {
      backgroundMusic.stop();
      set({ isBackgroundMusicPlaying: false });
      console.log("Background music stopped");
    }
  },
  
  // Volume control functions
  setBackgroundMusicVolume: (volume: number) => {
    set({ backgroundMusicVolume: volume });
    backgroundMusic.setVolume(volume);
  },
  
  setCoinSoundVolume: (volume: number) => {
    set({ coinSoundVolume: volume });
  },
  
  setExplosionSoundVolume: (volume: number) => {
    set({ explosionSoundVolume: volume });
  },
}));
