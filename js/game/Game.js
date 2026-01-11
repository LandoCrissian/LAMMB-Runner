// ========================================
// LAMMB: Trenches Runner - Main Game Controller
// ========================================

import * as THREE from 'three';
import { CONFIG, isMobile, getDefaultQuality } from '../config.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CollectibleManager } from './CollectibleManager.js';
import { InputManager } from './InputManager.js';
import { CollisionManager } from './CollisionManager.js';
import { ScoreManager } from './ScoreManager.js';
import { AudioManager } from './AudioManager.js';

export class Game {
    constructor(canvas, uiManager) {
        this.canvas = canvas;
        this.uiManager = uiManager;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.currentSpeed = CONFIG.GAME.WORLD.INITIAL_SPEED;
        this.distance = 0;
        this.runStartTime = 0;
        
        // Settings
        this.settings = this.loadSettings();
        this.quality = this.settings.graphics || getDefaultQuality();
        
        // Initialize systems
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initLighting();
        this.initManagers();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.onResize = this.onResize.bind(this);
        
        // Event listeners
        window.addEventListener('resize', this.onResize);
        
        // Clock for delta time
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        // FPS tracking
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFPS = 60;
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE.SETTINGS);
            return saved ? JSON.parse(saved) : {
                sound: true,
                music: true,
                haptics: true,
                graphics: getDefaultQuality(),
            };
        } catch {
            return {
                sound: true,
                music: true,
                haptics: true,
                graphics: getDefaultQuality(),
            };
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem(CONFIG.STORAGE.SETTINGS, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    initRenderer() {
        const qualityConfig = CONFIG.GRAPHICS[this.quality];
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.quality === 'HIGH',
            powerPreference: 'high-performance',
            alpha: false,
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(qualityConfig.PIXEL_RATIO);
        this.renderer.setClearColor(0x0a0a0f);
        
        if (qualityConfig.SHADOWS) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Performance optimizations
        this.renderer.sortObjects = false;
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a0f, 30, CONFIG.GRAPHICS[this.quality].DRAW_DISTANCE);
    }
    
    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, CONFIG.GRAPHICS[this.quality].DRAW_DISTANCE);
        
        // Camera position behind and above player
        this.cameraOffset = new THREE.Vector3(0, 4, 8);
        this.cameraLookOffset = new THREE.Vector3(0, 1, -10);
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(0, 1, -10);
        
        // Smooth camera follow
        this.cameraTarget = new THREE.Vector3();
        this.cameraLookTarget = new THREE.Vector3();
    }
    
    initLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);
        
        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        
        if (CONFIG.GRAPHICS[this.quality].SHADOWS) {
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            dirLight.shadow.camera.near = 1;
            dirLight.shadow.camera.far = 50;
            dirLight.shadow.camera.left = -15;
            dirLight.shadow.camera.right = 15;
            dirLight.shadow.camera.top = 15;
            dirLight.shadow.camera.bottom = -15;
        }
        this.scene.add(dirLight);
        this.dirLight = dirLight;
        
        // Neon accent lights
        const cyanLight = new THREE.PointLight(0x00f5ff, 1, 30);
        cyanLight.position.set(-5, 3, -10);
        this.scene.add(cyanLight);
        
        const purpleLight = new THREE.PointLight(0xbf00ff, 1, 30);
        purpleLight.position.set(5, 3, -10);
        this.scene.add(purpleLight);
        
        this.accentLights = [cyanLight, purpleLight];
    }
    
    initManagers() {
        // Core game managers
        this.player = new Player(this.scene, this);
        this.world = new World(this.scene, this);
        this.obstacleManager = new ObstacleManager(this.scene, this);
        this.collectibleManager = new CollectibleManager(this.scene, this);
        this.collisionManager = new CollisionManager(this);
        this.scoreManager = new ScoreManager(this);
        this.audioManager = new AudioManager(this);
        this.inputManager = new InputManager(this);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.reset();
        this.isRunning = true;
        this.isGameOver = false;
        this.isPaused = false;
        this.runStartTime = Date.now();
        
        this.clock.start();
        this.update();
        
        this.uiManager.showScreen('hud');
        this.audioManager.playMusic();
    }
    
    reset() {
        this.currentSpeed = CONFIG.GAME.WORLD.INITIAL_SPEED;
        this.distance = 0;
        
        this.player.reset();
        this.world.reset();
        this.obstacleManager.reset();
        this.collectibleManager.reset();
        this.scoreManager.reset();
        
        // Reset camera
        this.camera.position.copy(this.cameraOffset);
    }
    
    pause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = true;
        this.clock.stop();
        this.uiManager.showScreen('pause');
        this.audioManager.pauseMusic();
    }
    
    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.clock.start();
        this.uiManager.showScreen('hud');
        this.audioManager.resumeMusic();
        requestAnimationFrame(this.update);
    }
    
    gameOver(reason = 'collision') {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.isRunning = false;
        this.clock.stop();
        
        // Calculate final stats
        const finalScore = this.scoreManager.getScore();
        const distance = Math.floor(this.distance);
        const shardsCollected = this.scoreManager.getShardsCollected();
        const runDuration = (Date.now() - this.runStartTime) / 1000;
        
        // Check for new best
        const bestScore = this.scoreManager.getBestScore();
        const isNewBest = finalScore > bestScore;
        
        if (isNewBest) {
            this.scoreManager.saveBestScore(finalScore);
            this.uiManager.showQuip('NEW_BEST');
        } else {
            this.uiManager.showQuip('HIT');
        }
        
        // Save shards
        this.scoreManager.saveTotalShards();
        
        // Haptic feedback
        if (this.settings.haptics) {
            this.triggerHaptic('heavy');
        }
        
        // Audio
        this.audioManager.playSound('gameOver');
        this.audioManager.stopMusic();
        
        // Show game over screen after brief delay
        setTimeout(() => {
            this.uiManager.showGameOver({
                score: finalScore,
                bestScore: Math.max(finalScore, bestScore),
                isNewBest,
                distance,
                shardsCollected,
                runDuration,
            });
        }, 500);
    }
    
    update() {
        if (!this.isRunning || this.isPaused) return;
        
        requestAnimationFrame(this.update);
        
        const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent huge jumps
        
        // FPS tracking
        this.frameCount++;
        this.fpsTime += delta;
        if (this.fpsTime >= 1) {
            this.currentFPS = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;
        }
        
        if (this.isGameOver) return;
        
        // Update speed (gradual increase)
        this.currentSpeed = Math.min(
            this.currentSpeed + CONFIG.GAME.WORLD.SPEED_INCREMENT * delta,
            CONFIG.GAME.WORLD.MAX_SPEED
        );
        
        // Update distance
        this.distance += this.currentSpeed * delta;
        
        // Update all game systems
        this.player.update(delta);
        this.world.update(delta);
        this.obstacleManager.update(delta);
        this.collectibleManager.update(delta);
        this.collisionManager.update();
        this.scoreManager.update(delta);
        
        // Update camera
        this.updateCamera(delta);
        
        // Update lighting positions relative to player
        this.updateLighting();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    updateCamera(delta) {
        // Smooth camera follow
        const playerPos = this.player.getPosition();
        
        this.cameraTarget.set(
            playerPos.x * 0.3, // Slight horizontal follow
            this.cameraOffset.y,
            playerPos.z + this.cameraOffset.z
        );
        
        this.cameraLookTarget.set(
            playerPos.x * 0.5,
            this.cameraLookOffset.y,
            playerPos.z + this.cameraLookOffset.z
        );
        
        // Smooth interpolation
        this.camera.position.lerp(this.cameraTarget, 5 * delta);
        
        // Look at point in front of player
        const lookAt = new THREE.Vector3();
        lookAt.lerpVectors(
            new THREE.Vector3(
                this.camera.position.x,
                this.cameraLookOffset.y,
                this.camera.position.z - 20
            ),
            this.cameraLookTarget,
            5 * delta
        );
        this.camera.lookAt(this.cameraLookTarget);
    }
    
    updateLighting() {
        const playerZ = this.player.getPosition().z;
        
        // Move accent lights with player
        this.accentLights[0].position.z = playerZ - 10;
        this.accentLights[1].position.z = playerZ - 10;
        
        // Move directional light
        this.dirLight.position.z = playerZ;
        this.dirLight.target.position.z = playerZ - 10;
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    setQuality(quality) {
        this.quality = quality;
        this.settings.graphics = quality;
        this.saveSettings();
        
        const qualityConfig = CONFIG.GRAPHICS[quality];
        
        // Update renderer
        this.renderer.setPixelRatio(qualityConfig.PIXEL_RATIO);
        
        // Update shadows
        this.renderer.shadowMap.enabled = qualityConfig.SHADOWS;
        if (this.dirLight) {
            this.dirLight.castShadow = qualityConfig.SHADOWS;
        }
        
        // Update fog
        if (this.scene.fog) {
            this.scene.fog.far = qualityConfig.DRAW_DISTANCE;
        }
        
        // Update camera
        this.camera.far = qualityConfig.DRAW_DISTANCE;
        this.camera.updateProjectionMatrix();
    }
    
    triggerHaptic(style = 'light') {
        if (!this.settings.haptics) return;
        
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [50],
                double: [20, 50, 20],
            };
            navigator.vibrate(patterns[style] || patterns.light);
        }
    }
    
    getSpeed() {
        return this.currentSpeed;
    }
    
    getDistance() {
        return this.distance;
    }
    
    getRunDuration() {
        return (Date.now() - this.runStartTime) / 1000;
    }
    
    dispose() {
        window.removeEventListener('resize', this.onResize);
        this.inputManager.dispose();
        this.audioManager.dispose();
        this.renderer.dispose();
    }
}
