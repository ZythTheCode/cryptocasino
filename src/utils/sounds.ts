
// Sound effects utility for casino games
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: { [key: string]: AudioBuffer } = {};

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  // Generate a simple tone
  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let value = 0;
      
      switch (type) {
        case 'sine':
          value = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          value = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          value = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
          break;
      }
      
      // Apply envelope (fade in/out)
      const envelope = Math.min(t * 10, (duration - t) * 10, 1);
      data[i] = value * envelope * 0.1; // Keep volume low
    }

    return buffer;
  }

  // Initialize sound effects
  init() {
    if (!this.audioContext) return;

    // Casino game sounds
    this.sounds.spin = this.createTone(220, 0.5, 'sine') as AudioBuffer;
    this.sounds.win = this.createTone(440, 0.8, 'sine') as AudioBuffer;
    this.sounds.lose = this.createTone(110, 0.6, 'sine') as AudioBuffer;
    this.sounds.bet = this.createTone(330, 0.3, 'triangle') as AudioBuffer;
    this.sounds.cardFlip = this.createTone(880, 0.2, 'square') as AudioBuffer;
    this.sounds.jackpot = this.createTone(660, 1.2, 'sine') as AudioBuffer;
    this.sounds.click = this.createTone(1000, 0.1, 'square') as AudioBuffer;
    this.sounds.explosion = this.createTone(80, 0.8, 'square') as AudioBuffer;
    this.sounds.collect = this.createTone(550, 0.4, 'triangle') as AudioBuffer;
  }

  // Play a sound
  playSound(soundName: string, volume: number = 0.5) {
    if (!this.audioContext || !this.sounds[soundName]) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.sounds[soundName];
      gainNode.gain.value = Math.min(volume, 1);
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  // Specific casino game sounds
  playSpinSound() { this.playSound('spin', 0.3); }
  playWinSound() { this.playSound('win', 0.5); }
  playLoseSound() { this.playSound('lose', 0.4); }
  playBetSound() { this.playSound('bet', 0.3); }
  playCardFlipSound() { this.playSound('cardFlip', 0.2); }
  playJackpotSound() { this.playSound('jackpot', 0.7); }
  playClickSound() { this.playSound('click', 0.2); }
  playExplosionSound() { this.playSound('explosion', 0.6); }
  playCollectSound() { this.playSound('collect', 0.4); }
}

// Create global sound manager instance
export const soundManager = new SoundManager();

// Initialize sounds when the page loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    soundManager.init();
  });
  
  // Initialize on first user interaction
  const initOnInteraction = () => {
    soundManager.init();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction);
  document.addEventListener('keydown', initOnInteraction);
}
