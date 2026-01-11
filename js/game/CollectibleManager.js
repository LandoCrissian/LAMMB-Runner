// ========================================
// LAMMB: Trenches Runner - Collectible Manager
// ========================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CollectibleManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        
        const collectibleConfig = CONFIG.GAME.COLLECTIBLES;
        this.poolSize = collectibleConfig.POOL_SIZE;
        this.coffeeConfig = collectibleConfig.COFFEE;
        this.shardConfig = collectibleConfig.GLOW_SHARD;
        
        // Object pools
        this.coffePool = [];
        this.shardPool = [];
        this.activeCollectibles = [];
        
        // Spawn tracking
        this.lastSpawnZ = 0;
        this.spawnInterval = 5; // Base distance between spawn chances
        
        // Initialize pools
        this.initPools();
    }
    
    initPools() {
        // Create coffee pool
        for (let i = 0; i < this.poolSize / 2; i++) {
            const coffee = this.createCoffee();
            coffee.visible = false;
            coffee.userData.active = false;
            this.scene.add(coffee);
            this.coffePool.push(coffee);
        }
        
        // Create shard pool
        for (let i = 0; i < this.poolSize / 2; i++) {
            const shard = this.createShard();
            shard.visible = false;
            shard.userData.active = false;
            this.scene.add(shard);
            this.shardPool.push(shard);
        }
    }
    
    createCoffee() {
        const group = new THREE.Group();
        group.userData.type = 'coffee';
        
        // Coffee cup body
        const cupGeom = new THREE.CylinderGeometry(0.25, 0.2, 0.5, 16);
        const cupMat = new THREE.MeshStandardMaterial({
            color: 0xffa500,
            roughness: 0.3,
            metalness: 0.5,
            emissive: 0xffa500,
            emissiveIntensity: 0.3,
        });
        const cup = new THREE.Mesh(cupGeom, cupMat);
        cup.position.y = 0.25;
        group.add(cup);
        
        // Steam (simple particles)
        const steamGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const steamMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        
        for (let i = 0; i < 3; i++) {
            const steam = new THREE.Mesh(steamGeom, steamMat.clone());
            steam.position.set(
                (Math.random() - 0.5) * 0.2,
                0.5 + i * 0.15,
                0
            );
            steam.scale.setScalar(0.5 + Math.random() * 0.5);
            steam.userData.offset = Math.random() * Math.PI * 2;
            group.add(steam);
        }
        
        // Glow effect
        const glowGeom = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 0.2,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.y = 0.3;
        group.add(glow);
        
        // Animation
        group.userData.animate = (time) => {
            group.rotation.y = time * 0.002;
            group.position.y = 1 + Math.sin(time * 0.003) * 0.2;
            
            // Animate steam
            group.children.forEach((child, i) => {
                if (child.userData.offset !== undefined) {
                    child.position.y = 0.5 + (i - 1) * 0.15 + Math.sin(time * 0.005 + child.userData.offset) * 0.1;
                    child.material.opacity = 0.3 + Math.sin(time * 0.003 + child.userData.offset) * 0.2;
                }
            });
        };
        
        // Collision bounds
        group.userData.bounds = { width: 0.5, height: 0.8, depth: 0.5 };
        
        return group;
    }
    
    createShard() {
        const group = new THREE.Group();
        group.userData.type = 'shard';
        
        // Diamond/crystal shape
        const shardGeom = new THREE.OctahedronGeometry(0.3, 0);
        const shardMat = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x00f5ff,
            emissiveIntensity: 0.5,
        });
        const shard = new THREE.Mesh(shardGeom, shardMat);
        shard.position.y = 0;
        group.add(shard);
        
        // Inner glow
        const innerGeom = new THREE.OctahedronGeometry(0.2, 0);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        const inner = new THREE.Mesh(innerGeom, innerMat);
        group.add(inner);
        
        // Outer glow
        const glowGeom = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: 0.15,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        group.add(glow);
        
        // Animation
        group.userData.animate = (time) => {
            group.rotation.y = time * 0.003;
            group.rotation.x = Math.sin(time * 0.002) * 0.2;
            group.position.y = 1 + Math.sin(time * 0.004) * 0.15;
            
            // Pulse glow
            glow.scale.setScalar(1 + Math.sin(time * 0.005) * 0.1);
        };
        
        // Collision bounds
        group.userData.bounds = { width: 0.6, height: 0.6, depth: 0.6 };
        
        return group;
    }
    
    getFromPool(type) {
        const pool = type === 'coffee' ? this.coffePool : this.shardPool;
        
        for (const item of pool) {
            if (!item.userData.active) {
                item.userData.active = true;
                item.visible = true;
                return item;
            }
        }
        
        // Pool exhausted, create new one
        const newItem = type === 'coffee' ? this.createCoffee() : this.createShard();
        newItem.userData.active = true;
        this.scene.add(newItem);
        pool.push(newItem);
        return newItem;
    }
    
    returnToPool(item) {
        item.userData.active = false;
        item.visible = false;
    }
    
    update(delta) {
        const playerZ = this.game.player.getPosition().z;
        const time = performance.now();
        
        // Spawn new collectibles
        const spawnZ = playerZ - 40;
        
        while (this.lastSpawnZ > spawnZ) {
            this.trySpawnCollectibles(this.lastSpawnZ);
            this.lastSpawnZ -= this.spawnInterval;
        }
        
        // Update active collectibles
        this.activeCollectibles = this.activeCollectibles.filter(item => {
            // Animate
            if (item.userData.animate) {
                item.userData.animate(time);
            }
            
            // Remove if behind player
            if (item.position.z > playerZ + 10) {
                this.returnToPool(item);
                return false;
            }
            
            return true;
        });
    }
    
    trySpawnCollectibles(zPosition) {
        const laneWidth = CONFIG.GAME.PLAYER.LANE_WIDTH;
        
        // Try to spawn coffee
        if (Math.random() < this.coffeeConfig.SPAWN_CHANCE) {
            const coffee = this.getFromPool('coffee');
            const lane = Math.floor(Math.random() * 3);
            coffee.position.set((lane - 1) * laneWidth, 1, zPosition);
            this.activeCollectibles.push(coffee);
        }
        
        // Try to spawn shards (can spawn multiple in a row)
        if (Math.random() < this.shardConfig.SPAWN_CHANCE) {
            const shardCount = 1 + Math.floor(Math.random() * 3); // 1-3 shards
            const lane = Math.floor(Math.random() * 3);
            
            for (let i = 0; i < shardCount; i++) {
                const shard = this.getFromPool('shard');
                shard.position.set(
                    (lane - 1) * laneWidth,
                    1,
                    zPosition - i * 2
                );
                this.activeCollectibles.push(shard);
            }
        }
    }
    
    collect(item) {
        const type = item.userData.type;
        
        // Visual effect - scale up and fade
        this.playCollectEffect(item);
        
        // Return to pool
        this.returnToPool(item);
        
        // Remove from active list
        const index = this.activeCollectibles.indexOf(item);
        if (index > -1) {
            this.activeCollectibles.splice(index, 1);
        }
        
        return type;
    }
    
    playCollectEffect(item) {
        // Create temporary effect mesh at item position
        const effectGeom = new THREE.SphereGeometry(0.5, 16, 16);
        const effectMat = new THREE.MeshBasicMaterial({
            color: item.userData.type === 'coffee' ? 0xffa500 : 0x00f5ff,
            transparent: true,
            opacity: 0.8,
        });
        const effect = new THREE.Mesh(effectGeom, effectMat);
        effect.position.copy(item.position);
        this.scene.add(effect);
        
        // Animate and remove
        const startTime = performance.now();
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / 300; // 300ms animation
            
            if (progress >= 1) {
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
                return;
            }
            
            effect.scale.setScalar(1 + progress * 2);
            effect.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    getActiveCollectibles() {
        return this.activeCollectibles;
    }
    
    reset() {
        // Return all active collectibles to pool
        this.activeCollectibles.forEach(item => {
            this.returnToPool(item);
        });
        this.activeCollectibles = [];
        
        // Reset spawn tracking
        this.lastSpawnZ = 0;
    }
}
