// ========================================
// LAMMB: Trenches Runner - Score Manager
// ========================================

import { CONFIG } from '../config.js';

export class ScoreManager {
    constructor(game) {
        this.game = game;
        
        const scoringConfig = CONFIG.GAME.SCORING;
        this.distanceMultiplier = scoringConfig.DISTANCE_MULTIPLIER;
        this.baseMultiplier = scoringConfig.BASE_MULTIPLIER;
        this.maxMultiplier = scoringConfig.MAX_MULTIPLIER;
        this.multiplierDecay = scoringConfig.MULTIPLIER_DECAY;
        
        // Score state
        this.score = 0;
        this.currentMultiplier = this.baseMultiplier;
        this.multiplierBoostTime = 0;
        this.shardsCollected = 0;
        this.totalShards = this.loadTotalShards();
        
        // Milestones
        this.milestones = [1000, 5000, 10000, 25000, 50000];
        this.reachedMilestones = new Set();
    }
    
    update(delta) {
        // Add distance-based score
        const distanceScore = this.game.getSpeed() * delta * this.distanceMultiplier;
        this.score += distanceScore * this.currentMultiplier;
        
        // Decay multiplier if boosted
        if (this.multiplierBoostTime > 0) {
            this.multiplierBoostTime -= delta * 1000;
            
            if (this.multiplierBoostTime <= 0) {
                this.currentMultiplier = Math.max(
                    this.baseMultiplier,
                    this.currentMultiplier - 1
                );
            }
        }
        
        // Check milestones
        this.checkMilestones();
        
        // Update UI
        this.updateUI();
    }
    
    boostMultiplier() {
        const coffeeConfig = CONFIG.GAME.COLLECTIBLES.COFFEE;
        
        this.currentMultiplier = Math.min(
            this.currentMultiplier + coffeeConfig.MULTIPLIER_BOOST,
            this.maxMultiplier
        );
        this.multiplierBoostTime = coffeeConfig.DURATION;
        
        // Update UI with active state
        this.updateMultiplierUI(true);
    }
    
    addShard() {
        this.shardsCollected++;
        this.totalShards++;
        
        // Update UI
        const hudShards = document.getElementById('hud-shards');
        if (hudShards) {
            hudShards.textContent = this.shardsCollected;
        }
    }
    
    checkMilestones() {
        const roundedScore = Math.floor(this.score);
        
        for (const milestone of this.milestones) {
            if (roundedScore >= milestone && !this.reachedMilestones.has(milestone)) {
                this.reachedMilestones.add(milestone);
                this.game.uiManager.showQuip('MILESTONE', milestone);
                this.game.triggerHaptic('double');
            }
        }
    }
    
    updateUI() {
        const hudScore = document.getElementById('hud-score');
        if (hudScore) {
            hudScore.textContent = Math.floor(this.score).toLocaleString();
        }
        
        this.updateMultiplierUI(this.multiplierBoostTime > 0);
    }
    
    updateMultiplierUI(isActive) {
        const hudMultiplier = document.getElementById('hud-multiplier');
        const container = document.getElementById('hud-multiplier-container');
        
        if (hudMultiplier) {
            hudMultiplier.textContent = `x${this.currentMultiplier.toFixed(1)}`;
            
            if (isActive) {
                hudMultiplier.classList.add('active');
            } else {
                hudMultiplier.classList.remove('active');
            }
        }
    }
    
    getScore() {
        return Math.floor(this.score);
    }
    
    getMultiplier() {
        return this.currentMultiplier;
    }
    
    getShardsCollected() {
        return this.shardsCollected;
    }
    
    getTotalShards() {
        return this.totalShards;
    }
    
    // Local storage methods
    getBestScore() {
        try {
            return parseInt(localStorage.getItem(CONFIG.STORAGE.BEST_SCORE)) || 0;
        } catch {
            return 0;
        }
    }
    
    saveBestScore(score) {
        try {
            localStorage.setItem(CONFIG.STORAGE.BEST_SCORE, score.toString());
        } catch (e) {
            console.warn('Failed to save best score:', e);
        }
    }
    
    loadTotalShards() {
        try {
            return parseInt(localStorage.getItem(CONFIG.STORAGE.TOTAL_SHARDS)) || 0;
        } catch {
            return 0;
        }
    }
    
    saveTotalShards() {
        try {
            localStorage.setItem(CONFIG.STORAGE.TOTAL_SHARDS, this.totalShards.toString());
        } catch (e) {
            console.warn('Failed to save total shards:', e);
        }
    }
    
    reset() {
        this.score = 0;
        this.currentMultiplier = this.baseMultiplier;
        this.multiplierBoostTime = 0;
        this.shardsCollected = 0;
        this.reachedMilestones.clear();
        
        this.updateUI();
    }
}
