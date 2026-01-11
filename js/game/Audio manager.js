// ========================================
// LAMMB: Trenches Runner - Audio Manager
// ========================================

import { CONFIG } from '../config.js';

export class AudioManager {
    constructor(game) {
        this.game = game;
        this.sounds = {};
        this.music = null;
        this.musicPlaying = false;
        
        // Audio context (created on first user interaction)
        this.audioContext = null;
        this.initialized = false;
        
        // Volume settings
        this.sfxVolume = CONFIG.AUDIO.SFX_VOLUME;
        this.musicVolume = CONFIG.AUDIO.MUSIC_VOLUME;
        this.sfxEnabled = true;
        this.musicEnabled = true;
    }
    
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            
            // Create simple oscillator-based sounds for MVP
            // (Real audio files would be loaded here in production)
            this.createSynthSounds();
        } catch (e) {
            console.warn('Audio not supported:', e);
        }
    }
    
    createSynthSounds() {
        // Placeholder synth sounds - replace with real audio files later
        this.synthSounds = {
            jump: { freq: 400, duration: 0.1, type: 'sine' },
            slide: { freq: 200, duration: 0.15, type: 'sawtooth' },
            collectShard: { freq: 800, duration: 0.1, type: 'sine' },
            collectCoffee: { freq: 600, duration: 0.2, type: 'triangle' },
            hit: { freq: 150, duration: 0.3, type: 'square' },
            gameOver: { freq: 100, duration: 0.5, type: 'sawtooth' },
            whoosh: { freq: 300, duration: 0.08, type: 'sine' },
        };
    }
    
    playSound(name) {
        if (!this.sfxEnabled || !this.initialized || !this.audioContext) return;
        
        const soundDef = this.synthSounds[name];
        if (!soundDef) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = soundDef.type;
            oscillator.frequency.setValueAtTime(soundDef.freq, this.audioContext.currentTime);
            
            // Quick fade out
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + soundDef.duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + soundDef.duration);
        } catch (e) {
            // Ignore audio errors
        }
    }
    
    playMusic() {
        if (!this.musicEnabled || this.musicPlaying) return;
        this.musicPlaying = true;
        // Music would be loaded and played here in production
    }
    
    pauseMusic() {
        this.musicPlaying = false;
    }
    
    resumeMusic() {
        if (this.musicEnabled) {
            this.musicPlaying = true;
        }
    }
    
    stopMusic() {
        this.musicPlaying = false;
    }
    
    setSFXEnabled(enabled) {
        this.sfxEnabled = enabled;
    }
    
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (!enabled) {
            this.stopMusic();
        }
    }
    
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
