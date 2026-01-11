// ========================================
// LAMMB: Trenches Runner - Player Controller
// ========================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Player {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        
        const playerConfig = CONFIG.GAME.PLAYER;
        
        // Lane system
        this.laneWidth = playerConfig.LANE_WIDTH;
        this.laneCount = playerConfig.LANE_COUNT;
        this.currentLane = 1; // Middle lane (0, 1, 2)
        this.targetX = 0;
        this.laneChangeSpeed = playerConfig.LANE_CHANGE_SPEED;
        
        // Physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.jumpForce = playerConfig.JUMP_FORCE;
        this.gravity = playerConfig.GRAVITY;
        this.isGrounded = true;
        this.isJumping = false;
        
        // Sliding
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideDuration = playerConfig.SLIDE_DURATION;
        this.normalHeight = playerConfig.NORMAL_HEIGHT;
        this.slideHeight = playerConfig.SLIDE_HEIGHT;
        
        // State
        this.isInvulnerable = false;
        this.isSlowed = false;
        this.slowFactor = 1;
        
        // Create player mesh
        this.createMesh();
        
        // Collision bounds
        this.updateCollisionBounds();
    }
    
    createMesh() {
        // Create LAMMB character (stylized sheep placeholder)
        // Using a capsule-like shape that can be replaced with actual model later
        
        const group = new THREE.Group();
        
        // Body (main capsule)
        const bodyGeometry = new THREE.CapsuleGeometry(0.5, 0.8, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.8,
            metalness: 0.1,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        this.bodyMesh = body;
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.6,
            metalness: 0.2,
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.5, -0.2);
        head.castShadow = true;
        group.add(head);
        
        // Eyes (neon cyan glow)
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 1.55, -0.45);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 1.55, -0.45);
        group.add(rightEye);
        
        // Ears (stylized)
        const earGeometry = new THREE.ConeGeometry(0.12, 0.3, 8);
        const earMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.8,
        });
        
        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.25, 1.8, 0);
        leftEar.rotation.z = 0.3;
        group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.25, 1.8, 0);
        rightEar.rotation.z = -0.3;
        group.add(rightEar);
        
        // Legs (simple cylinders)
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
        });
        
        const legPositions = [
            [-0.25, 0.2, -0.15],
            [0.25, 0.2, -0.15],
            [-0.25, 0.2, 0.15],
            [0.25, 0.2, 0.15],
        ];
        
        this.legs = [];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            leg.castShadow = true;
            group.add(leg);
            this.legs.push(leg);
        });
        
        // Neon collar/accent
        const collarGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
        const collarMaterial = new THREE.MeshBasicMaterial({
            color: 0xbf00ff,
        });
        const collar = new THREE.Mesh(collarGeometry, collarMaterial);
        collar.position.set(0, 1.2, 0);
        collar.rotation.x = Math.PI / 2;
        group.add(collar);
        
        this.mesh = group;
        this.mesh.position.set(0, 0, 0);
        this.scene.add(this.mesh);
        
        // Trail effect (will be populated based on equipped cosmetic)
        this.trail = null;
    }
    
    update(delta) {
        // Horizontal movement (lane change)
        this.updateLanePosition(delta);
        
        // Vertical movement (jump/gravity)
        this.updateVerticalMovement(delta);
        
        // Slide timer
        if (this.isSliding) {
            this.slideTimer -= delta * 1000;
            if (this.slideTimer <= 0) {
                this.endSlide();
            }
        }
        
        // Animation
        this.updateAnimation(delta);
        
        // Update collision bounds
        this.updateCollisionBounds();
        
        // Move forward with world
        this.mesh.position.z -= this.game.getSpeed() * delta * this.slowFactor;
    }
    
    updateLanePosition(delta) {
        const targetX = (this.currentLane - 1) * this.laneWidth;
        const diff = targetX - this.mesh.position.x;
        
        if (Math.abs(diff) > 0.01) {
            const move = Math.sign(diff) * Math.min(
                Math.abs(diff),
                this.laneChangeSpeed * delta
            );
            this.mesh.position.x += move;
            
            // Slight tilt when changing lanes
            this.mesh.rotation.z = -diff * 0.1;
        } else {
            this.mesh.position.x = targetX;
            this.mesh.rotation.z *= 0.9; // Smooth return to upright
        }
    }
    
    updateVerticalMovement(delta) {
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * delta;
            this.mesh.position.y += this.velocity.y * delta;
            
            // Ground check
            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isJumping = false;
                
                // Landing haptic
                this.game.triggerHaptic('light');
            }
        }
    }
    
    updateAnimation(delta) {
        // Running animation (leg movement)
        if (this.isGrounded && !this.isSliding) {
            const time = performance.now() * 0.01;
            const speed = this.game.getSpeed();
            const legSwing = Math.sin(time * speed * 0.5) * 0.3;
            
            this.legs[0].rotation.x = legSwing;
            this.legs[1].rotation.x = -legSwing;
            this.legs[2].rotation.x = -legSwing;
            this.legs[3].rotation.x = legSwing;
            
            // Slight body bob
            this.bodyMesh.position.y = 0.9 + Math.abs(Math.sin(time * speed * 0.5)) * 0.05;
        }
        
        // Jump animation
        if (this.isJumping) {
            // Tuck legs
            this.legs.forEach(leg => {
                leg.rotation.x = 0.8;
            });
        }
        
        // Slide animation
        if (this.isSliding) {
            // Flatten body
            this.mesh.scale.y = this.slideHeight / this.normalHeight;
        } else {
            this.mesh.scale.y = 1;
        }
    }
    
    updateCollisionBounds() {
        const height = this.isSliding ? this.slideHeight : this.normalHeight;
        const width = 0.8;
        const depth = 0.8;
        
        this.bounds = {
            min: new THREE.Vector3(
                this.mesh.position.x - width / 2,
                this.mesh.position.y,
                this.mesh.position.z - depth / 2
            ),
            max: new THREE.Vector3(
                this.mesh.position.x + width / 2,
                this.mesh.position.y + height,
                this.mesh.position.z + depth / 2
            ),
        };
    }
    
    moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.game.triggerHaptic('light');
            this.game.audioManager.playSound('whoosh');
        }
    }
    
    moveRight() {
        if (this.currentLane < this.laneCount - 1) {
            this.currentLane++;
            this.game.triggerHaptic('light');
            this.game.audioManager.playSound('whoosh');
        }
    }
    
    jump() {
        if (this.isGrounded && !this.isSliding) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.game.triggerHaptic('medium');
            this.game.audioManager.playSound('jump');
        }
    }
    
    slide() {
        if (this.isGrounded && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.slideDuration;
            this.game.triggerHaptic('medium');
            this.game.audioManager.playSound('slide');
        }
    }
    
    endSlide() {
        this.isSliding = false;
        this.slideTimer = 0;
    }
    
    setSlow(factor, duration) {
        this.isSlowed = true;
        this.slowFactor = factor;
        
        // Visual effect
        this.bodyMesh.material.color.setHex(0x8888ff);
        
        setTimeout(() => {
            this.isSlowed = false;
            this.slowFactor = 1;
            this.bodyMesh.material.color.setHex(0xf0f0f0);
        }, duration);
    }
    
    hit() {
        if (this.isInvulnerable) return false;
        
        // Flash effect
        this.flash();
        
        return true;
    }
    
    flash() {
        const originalColor = this.bodyMesh.material.color.getHex();
        this.bodyMesh.material.color.setHex(0xff0000);
        
        setTimeout(() => {
            this.bodyMesh.material.color.setHex(originalColor);
        }, 100);
    }
    
    getPosition() {
        return this.mesh.position.clone();
    }
    
    getBounds() {
        return this.bounds;
    }
    
    reset() {
        this.currentLane = 1;
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;
        this.isInvulnerable = false;
        this.isSlowed = false;
        this.slowFactor = 1;
        
        this.bodyMesh.material.color.setHex(0xf0f0f0);
    }
    
    // Cosmetics
    setSkin(skinId) {
        // Placeholder for skin system
        // Will update mesh materials/model based on skinId
        console.log('Equipping skin:', skinId);
    }
    
    setTrail(trailId) {
        // Placeholder for trail system
        // Will add particle trail behind player
        console.log('Equipping trail:', trailId);
    }
}
