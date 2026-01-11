// ========================================
// LAMMB: Trenches Runner - Collision Manager
// ========================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CollisionManager {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        const player = this.game.player;
        const playerBounds = player.getBounds();
        
        // Check obstacle collisions
        this.checkObstacleCollisions(playerBounds);
        
        // Check collectible collisions
        this.checkCollectibleCollisions(playerBounds);
    }
    
    checkObstacleCollisions(playerBounds) {
        const obstacles = this.game.obstacleManager.getActiveObstacles();
        
        for (const obstacle of obstacles) {
            if (!obstacle.userData.active) continue;
            
            const obstacleBounds = this.getObstacleBounds(obstacle);
            
            // Check AABB intersection
            if (this.intersectsAABB(playerBounds, obstacleBounds)) {
                // Handle different obstacle types
                if (obstacle.userData.slowZone) {
                    // FUD Cloud - slow the player
                    this.game.player.setSlow(
                        obstacle.userData.slowFactor,
                        1000
                    );
                    // Mark as already triggered to avoid repeated slowing
                    if (!obstacle.userData.triggered) {
                        obstacle.userData.triggered = true;
                        this.game.uiManager.showQuip('COFFEE'); // Reusing quips
                    }
                } else if (obstacle.userData.requiresJump) {
                    // Rug Pull - check if player is jumping over
                    if (this.game.player.isGrounded) {
                        this.handleCollision();
                        return;
                    }
                } else if (obstacle.userData.requiresSlide) {
                    // Paper Hands Wall - check if player is sliding
                    const slideHeight = CONFIG.GAME.PLAYER.SLIDE_HEIGHT;
                    if (!this.game.player.isSliding || playerBounds.max.y > obstacle.userData.minHeight) {
                        this.handleCollision();
                        return;
                    }
                } else {
                    // Normal obstacle - game over
                    this.handleCollision();
                    return;
                }
            }
        }
    }
    
    checkCollectibleCollisions(playerBounds) {
        const collectibles = this.game.collectibleManager.getActiveCollectibles();
        
        for (const item of collectibles) {
            if (!item.userData.active) continue;
            
            const itemBounds = this.getCollectibleBounds(item);
            
            if (this.intersectsAABB(playerBounds, itemBounds)) {
                this.handleCollect(item);
            }
        }
    }
    
    getObstacleBounds(obstacle) {
        const bounds = obstacle.userData.bounds;
        const pos = obstacle.position;
        
        // Special handling for different obstacle types
        let minY = 0;
        let maxY = bounds.height;
        
        if (obstacle.userData.requiresSlide) {
            // Paper Hands Wall is elevated
            minY = obstacle.userData.minHeight;
            maxY = minY + bounds.height;
        }
        
        return {
            min: new THREE.Vector3(
                pos.x - bounds.width / 2,
                minY,
                pos.z - bounds.depth / 2
            ),
            max: new THREE.Vector3(
                pos.x + bounds.width / 2,
                maxY,
                pos.z + bounds.depth / 2
            ),
        };
    }
    
    getCollectibleBounds(item) {
        const bounds = item.userData.bounds;
        const pos = item.position;
        
        return {
            min: new THREE.Vector3(
                pos.x - bounds.width / 2,
                pos.y - bounds.height / 2,
                pos.z - bounds.depth / 2
            ),
            max: new THREE.Vector3(
                pos.x + bounds.width / 2,
                pos.y + bounds.height / 2,
                pos.z + bounds.depth / 2
            ),
        };
    }
    
    intersectsAABB(a, b) {
        return (
            a.min.x <= b.max.x &&
            a.max.x >= b.min.x &&
            a.min.y <= b.max.y &&
            a.max.y >= b.min.y &&
            a.min.z <= b.max.z &&
            a.max.z >= b.min.z
        );
    }
    
    handleCollision() {
        const hit = this.game.player.hit();
        
        if (hit) {
            this.game.audioManager.playSound('hit');
            this.game.gameOver('collision');
        }
    }
    
    handleCollect(item) {
        const type = this.game.collectibleManager.collect(item);
        
        if (type === 'coffee') {
            // Boost multiplier
            this.game.scoreManager.boostMultiplier();
            this.game.audioManager.playSound('collectCoffee');
            this.game.uiManager.showQuip('COFFEE');
            this.game.triggerHaptic('medium');
        } else if (type === 'shard') {
            // Add shard
            this.game.scoreManager.addShard();
            this.game.audioManager.playSound('collectShard');
            this.game.triggerHaptic('light');
        }
    }
}
