// ========================================
// LAMMB: Trenches Runner - Input Manager
// ========================================

import { isMobile } from '../config.js';

export class InputManager {
    constructor(game) {
        this.game = game;
        
        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isTouching = false;
        
        // Swipe thresholds
        this.swipeThreshold = 30; // Minimum distance for swipe
        this.swipeTimeThreshold = 300; // Maximum time for swipe (ms)
        this.tapThreshold = 10; // Max movement for tap
        
        // Keyboard state
        this.keys = {};
        
        // Bind methods
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        
        // Add listeners
        this.addListeners();
    }
    
    addListeners() {
        // Keyboard
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        
        // Touch
        const canvas = this.game.canvas;
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
        
        // Mouse (for desktop testing)
        if (!isMobile()) {
            canvas.addEventListener('mousedown', this.onMouseDown);
            canvas.addEventListener('mousemove', this.onMouseMove);
            canvas.addEventListener('mouseup', this.onMouseUp);
        }
        
        // Prevent context menu on long press
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    removeListeners() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        const canvas = this.game.canvas;
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
        canvas.removeEventListener('touchcancel', this.onTouchEnd);
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
    }
    
    // Keyboard handlers
    onKeyDown(e) {
        if (this.keys[e.code]) return; // Prevent repeat
        this.keys[e.code] = true;
        
        if (!this.game.isRunning || this.game.isPaused) return;
        
        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.game.player.moveLeft();
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.game.player.moveRight();
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                e.preventDefault();
                this.game.player.jump();
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.game.player.slide();
                break;
            case 'Escape':
                if (this.game.isRunning && !this.game.isGameOver) {
                    this.game.pause();
                }
                break;
        }
    }
    
    onKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    // Touch handlers
    onTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 0) return;
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = performance.now();
        this.isTouching = true;
        this.touchMoved = false;
    }
    
    onTouchMove(e) {
        e.preventDefault();
        
        if (!this.isTouching || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Check if moved beyond tap threshold
        if (Math.abs(deltaX) > this.tapThreshold || Math.abs(deltaY) > this.tapThreshold) {
            this.touchMoved = true;
        }
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        
        if (!this.isTouching) return;
        this.isTouching = false;
        
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        
        // Get final position from changedTouches
        const touch = e.changedTouches[0];
        if (!touch) return;
        
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Check if within swipe time threshold
        if (touchDuration > this.swipeTimeThreshold) return;
        
        if (!this.game.isRunning || this.game.isPaused || this.game.isGameOver) return;
        
        // Determine swipe direction
        if (absDeltaX > this.swipeThreshold || absDeltaY > this.swipeThreshold) {
            if (absDeltaX > absDeltaY) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.game.player.moveRight();
                } else {
                    this.game.player.moveLeft();
                }
            } else {
                // Vertical swipe
                if (deltaY < 0) {
                    this.game.player.jump();
                } else {
                    this.game.player.slide();
                }
            }
        } else if (!this.touchMoved) {
            // Tap - default to jump
            this.game.player.jump();
        }
    }
    
    // Mouse handlers (for desktop testing with mouse swipes)
    onMouseDown(e) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        this.touchStartTime = performance.now();
        this.isTouching = true;
        this.touchMoved = false;
    }
    
    onMouseMove(e) {
        if (!this.isTouching) return;
        
        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;
        
        if (Math.abs(deltaX) > this.tapThreshold || Math.abs(deltaY) > this.tapThreshold) {
            this.touchMoved = true;
        }
    }
    
    onMouseUp(e) {
        if (!this.isTouching) return;
        this.isTouching = false;
        
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        
        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (touchDuration > this.swipeTimeThreshold) return;
        
        if (!this.game.isRunning || this.game.isPaused || this.game.isGameOver) return;
        
        if (absDeltaX > this.swipeThreshold || absDeltaY > this.swipeThreshold) {
            if (absDeltaX > absDeltaY) {
                if (deltaX > 0) {
                    this.game.player.moveRight();
                } else {
                    this.game.player.moveLeft();
                }
            } else {
                if (deltaY < 0) {
                    this.game.player.jump();
                } else {
                    this.game.player.slide();
                }
            }
        }
    }
    
    isKeyPressed(code) {
        return !!this.keys[code];
    }
    
    dispose() {
        this.removeListeners();
    }
}
