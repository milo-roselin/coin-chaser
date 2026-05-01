// Background music generator using Web Audio API
export class BackgroundMusicGenerator {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;
  
  constructor() {
    this.initializeAudio();
  }
  
  private initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.15; // Low volume for background music
      
      console.log('Background music system initialized');
    } catch (error) {
      console.log('Web Audio API not supported:', error);
    }
  }
  
  public async start() {
    if (!this.audioContext || this.isPlaying) return;
    
    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isPlaying = true;
      this.playAmbientMusic();
      console.log('Background music started');
    } catch (error) {
      console.log('Failed to start background music:', error);
    }
  }
  
  public stop() {
    if (!this.audioContext || !this.isPlaying) return;
    
    this.isPlaying = false;
    console.log('Background music stopped');
  }
  
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.15;
    }
  }
  
  public setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : volume;
    }
  }
  
  private playAmbientMusic() {
    if (!this.audioContext || !this.isPlaying || !this.masterGain) return;
    
    // Classic Pac-Man theme melody (simplified version)
    const pacmanMelody = [
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 523.25, duration: 0.2 }, // C5
      { freq: 587.33, duration: 0.2 }, // D5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 523.25, duration: 0.2 }, // C5
      { freq: 493.88, duration: 0.2 }, // B4
      { freq: 523.25, duration: 0.4 }, // C5
      { freq: 440.00, duration: 0.4 }, // A4
      
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 523.25, duration: 0.2 }, // C5
      { freq: 587.33, duration: 0.2 }, // D5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 523.25, duration: 0.2 }, // C5
      { freq: 493.88, duration: 0.2 }, // B4
      { freq: 523.25, duration: 0.8 }, // C5 (longer)
      
      { freq: 587.33, duration: 0.4 }, // D5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 698.46, duration: 0.4 }, // F5
      { freq: 783.99, duration: 0.4 }, // G5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 523.25, duration: 0.4 }, // C5
      { freq: 587.33, duration: 0.4 }, // D5
      { freq: 523.25, duration: 0.8 }, // C5 (longer)
    ];
    
    let melodyIndex = 0;
    
    const playPacmanNote = () => {
      if (!this.isPlaying || !this.audioContext || !this.masterGain) return;
      
      const note = pacmanMelody[melodyIndex];
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Use square wave for classic arcade sound
      oscillator.type = 'square';
      oscillator.frequency.value = note.freq;
      
      gainNode.gain.value = 0;
      gainNode.gain.setTargetAtTime(0.3, this.audioContext.currentTime, 0.01);
      gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime + note.duration - 0.05, 0.05);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + note.duration);
      
      melodyIndex = (melodyIndex + 1) % pacmanMelody.length;
      
      // Schedule next note
      if (this.isPlaying) {
        setTimeout(() => playPacmanNote(), note.duration * 1000);
      }
    };
    
    // Start the classic Pac-Man melody
    playPacmanNote();
    
    // Add occasional power pellet sound effects
    this.addPowerPelletEffects();
  }
  
  // Add Pac-Man style power pellet effects
  private addPowerPelletEffects() {
    if (!this.audioContext || !this.masterGain) return;
    
    const playPowerPellet = () => {
      if (!this.isPlaying || !this.audioContext || !this.masterGain) return;
      
      // Create the classic Pac-Man power pellet sound
      const frequencies = [220, 330, 440, 550]; // Ascending notes
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          oscillator.type = 'square';
          oscillator.frequency.value = freq;
          
          gainNode.gain.value = 0.15;
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.15);
          
          oscillator.connect(gainNode);
          gainNode.connect(this.masterGain);
          
          oscillator.start();
          oscillator.stop(this.audioContext!.currentTime + 0.15);
        }, index * 40); // Quick ascending pattern
      });
      
      // Random power pellet effects every 15-20 seconds
      if (this.isPlaying) {
        const nextEffect = 15000 + Math.random() * 5000;
        setTimeout(() => playPowerPellet(), nextEffect);
      }
    };
    
    // Start power pellet effects after initial delay
    setTimeout(() => playPowerPellet(), 8000);
  }
}

// Create a singleton instance
export const backgroundMusic = new BackgroundMusicGenerator();