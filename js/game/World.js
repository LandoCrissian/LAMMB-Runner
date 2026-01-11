// ========================================
// LAMMB: Trenches Runner - World/Environment
// ========================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class World {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        
        const worldConfig = CONFIG.GAME.WORLD;
        this.chunkLength = worldConfig.CHUNK_LENGTH;
        this.visibleChunks = worldConfig.VISIBLE_CHUNKS;
        this.floorWidth = worldConfig.FLOOR_WIDTH;
        
        // Object pools
        this.chunks = [];
        this.decorations = [];
        
        // Track position
        this.lastChunkZ = 0;
        
        // Create initial world
        this.createSkybox();
        this.createInitialChunks();
    }
    
    createSkybox() {
        // Simple gradient skybox using a large sphere
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a1a) },
                bottomColor: { value: new THREE.Color(0x1a0a2e) },
                offset: { value: 50 },
                exponent: { value: 0.6 },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide,
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        this.sky = sky;
    }
    
    createInitialChunks() {
        for (let i = 0; i < this.visibleChunks + 1; i++) {
            this.createChunk(-i * this.chunkLength);
        }
        this.lastChunkZ = -this.visibleChunks * this.chunkLength;
    }
    
    createChunk(zPosition) {
        const chunk = new THREE.Group();
        chunk.position.z = zPosition;
        
        // Floor
        const floor = this.createFloor();
        chunk.add(floor);
        
        // Lane dividers
        const dividers = this.createLaneDividers();
        dividers.forEach(d => chunk.add(d));
        
        // Side walls (cyber/noir buildings)
        const leftWall = this.createSideWall(-this.floorWidth / 2 - 2);
        const rightWall = this.createSideWall(this.floorWidth / 2 + 2);
        chunk.add(leftWall);
        chunk.add(rightWall);
        
        // Neon decorations
        this.addNeonDecorations(chunk);
        
        // Random props
        if (Math.random() > 0.5) {
            this.addRandomProps(chunk);
        }
        
        this.scene.add(chunk);
        this.chunks.push(chunk);
        
        return chunk;
    }
    
    createFloor() {
        const geometry = new THREE.PlaneGeometry(this.floorWidth, this.chunkLength, 10, 10);
        
        // Create grid pattern material
        const material = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2,
        });
        
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.position.z = -this.chunkLength / 2;
        floor.receiveShadow = true;
        
        // Add grid lines
        const gridHelper = new THREE.GridHelper(
            this.chunkLength,
            20,
            0x00f5ff,
            0x1a1a3e
        );
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = -this.chunkLength / 2;
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        
        const group = new THREE.Group();
        group.add(floor);
        group.add(gridHelper);
        
        return group;
    }
    
    createLaneDividers() {
        const dividers = [];
        const laneWidth = CONFIG.GAME.PLAYER.LANE_WIDTH;
        
        // Create glowing lane divider lines
        const lineGeometry = new THREE.PlaneGeometry(0.1, this.chunkLength);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: 0.5,
        });
        
        for (let i = 0; i < 2; i++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.x = (i - 0.5) * laneWidth;
            line.position.y = 0.02;
            line.position.z = -this.chunkLength / 2;
            dividers.push(line);
        }
        
        return dividers;
    }
    
    createSideWall(xPosition) {
        const wall = new THREE.Group();
        
        // Create building-like structures
        const buildingCount = 5;
        const segmentLength = this.chunkLength / buildingCount;
        
        for (let i = 0; i < buildingCount; i++) {
            const height = 5 + Math.random() * 10;
            const depth = 2 + Math.random() * 3;
            
            const geometry = new THREE.BoxGeometry(3, height, depth);
            const material = new THREE.MeshStandardMaterial({
                color: 0x0a0a15,
                roughness: 0.9,
                metalness: 0.1,
            });
            
            const building = new THREE.Mesh(geometry, material);
            building.position.set(
                xPosition,
                height / 2,
                -i * segmentLength - segmentLength / 2
            );
            building.castShadow = true;
            building.receiveShadow = true;
            wall.add(building);
            
            // Add neon window accents
            this.addBuildingWindows(building, height);
        }
        
        return wall;
    }
    
    addBuildingWindows(building, height) {
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0x00f5ff : 0xbf00ff,
            transparent: true,
            opacity: 0.8,
        });
        
        const windowCount = Math.floor(height / 2);
        
        for (let i = 0; i < windowCount; i++) {
            if (Math.random() > 0.3) continue; // Random window placement
            
            const windowGeom = new THREE.PlaneGeometry(0.5, 0.3);
            const window = new THREE.Mesh(windowGeom, windowMaterial);
            
            // Position on front face
            window.position.set(
                0,
                -height / 2 + i * 2 + 1,
                building.geometry.parameters.depth / 2 + 0.01
            );
            
            building.add(window);
        }
    }
    
    addNeonDecorations(chunk) {
        // Overhead neon tubes
        const tubePositions = [
            { x: -3, y: 6, z: -this.chunkLength * 0.25 },
            { x: 3, y: 5.5, z: -this.chunkLength * 0.5 },
            { x: -2, y: 7, z: -this.chunkLength * 0.75 },
        ];
        
        tubePositions.forEach(pos => {
            if (Math.random() > 0.6) {
                const tube = this.createNeonTube();
                tube.position.set(pos.x, pos.y, pos.z);
                chunk.add(tube);
            }
        });
    }
    
    createNeonTube() {
        const colors = [0x00f5ff, 0xbf00ff, 0xff00aa];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const geometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
        const material = new THREE.MeshBasicMaterial({ color });
        
        const tube = new THREE.Mesh(geometry, material);
        tube.rotation.z = Math.PI / 2;
        
        // Add point light
        const light = new THREE.PointLight(color, 0.5, 10);
        tube.add(light);
        
        return tube;
    }
    
    addRandomProps(chunk) {
        // Funny props for the "trenches" theme
        const props = [
            { type: 'diamond', chance: 0.1 }, // Floating diamond shape
            { type: 'rocket', chance: 0.05 }, // Small rocket
            { type: 'screen', chance: 0.15 }, // Holographic screen
        ];
        
        props.forEach(prop => {
            if (Math.random() < prop.chance) {
                const mesh = this.createProp(prop.type);
                if (mesh) {
                    mesh.position.set(
                        (Math.random() - 0.5) * 6,
                        3 + Math.random() * 3,
                        -Math.random() * this.chunkLength
                    );
                    chunk.add(mesh);
                }
            }
        });
    }
    
    createProp(type) {
        switch (type) {
            case 'diamond': {
                const geometry = new THREE.OctahedronGeometry(0.5);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.7,
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData.animate = (time) => {
                    mesh.rotation.y = time * 0.001;
                    mesh.position.y += Math.sin(time * 0.002) * 0.001;
                };
                return mesh;
            }
            case 'rocket': {
                const group = new THREE.Group();
                const bodyGeom = new THREE.ConeGeometry(0.2, 0.8, 8);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
                const body = new THREE.Mesh(bodyGeom, bodyMat);
                group.add(body);
                return group;
            }
            case 'screen': {
                const geometry = new THREE.PlaneGeometry(1.5, 1);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00f5ff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide,
                });
                return new THREE.Mesh(geometry, material);
            }
            default:
                return null;
        }
    }
    
    update(delta) {
        const playerZ = this.game.player.getPosition().z;
        
        // Check if we need new chunks
        while (playerZ - this.lastChunkZ < this.chunkLength * 2) {
            this.lastChunkZ -= this.chunkLength;
            this.createChunk(this.lastChunkZ);
        }
        
        // Remove old chunks (behind player)
        this.chunks = this.chunks.filter(chunk => {
            if (chunk.position.z > playerZ + this.chunkLength) {
                this.scene.remove(chunk);
                this.disposeChunk(chunk);
                return false;
            }
            return true;
        });
        
        // Update skybox position
        this.sky.position.z = playerZ;
    }
    
    disposeChunk(chunk) {
        chunk.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    reset() {
        // Remove all chunks
        this.chunks.forEach(chunk => {
            this.scene.remove(chunk);
            this.disposeChunk(chunk);
        });
        this.chunks = [];
        
        // Recreate initial chunks
        this.lastChunkZ = 0;
        this.createInitialChunks();
    }
}
