// ========================================
// LAMMB: Trenches Runner - UI Manager
// ========================================

import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.currentScreen = 'landing';
        this.screens = {
            landing: document.getElementById('landing-screen'),
            hud: document.getElementById('hud'),
            pause: document.getElementById('pause-screen'),
            gameover: document.getElementById('gameover-screen'),
            leaderboard: document.getElementById('leaderboard-screen'),
            cosmetics: document.getElementById('cosmetics-screen'),
            loading: document.getElementById('loading-screen'),
        };
        
        this.modals = {
            howItWorks: document.getElementById('how-it-works-modal'),
            transparency: document.getElementById('transparency-modal'),
            settings: document.getElementById('settings-modal'),
        };
        
        this.toastContainer = document.getElementById('toast-container');
        this.quipContainer = document.getElementById('quip-container');
    }
    
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        
        // Show requested screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }
    
    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('active');
        }
    }
    
    hideModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('active');
        }
    }
    
    hideAllModals() {
        Object.values(this.modals).forEach(modal => {
            if (modal) modal.classList.remove('active');
        });
    }
    
    showGameOver(data) {
        const { score, bestScore, isNewBest, distance, shardsCollected } = data;
        
        // Update game over screen elements
        const finalScoreEl = document.getElementById('final-score');
        const bestScoreEl = document.getElementById('best-score');
        const newBestBadge = document.getElementById('new-best-badge');
        const statDistance = document.getElementById('stat-distance');
        const statShards = document.getElementById('stat-shards');
        
        if (finalScoreEl) finalScoreEl.textContent = score.toLocaleString();
        if (bestScoreEl) bestScoreEl.textContent = bestScore.toLocaleString();
        if (statDistance) statDistance.textContent = `${distance}m`;
        if (statShards) statShards.textContent = `+${shardsCollected}`;
        
        if (newBestBadge) {
            if (isNewBest) {
                newBestBadge.classList.add('show');
            } else {
                newBestBadge.classList.remove('show');
            }
        }
        
        // Show random game over quip
        const quips = CONFIG.QUIPS.HIT;
        const quip = quips[Math.floor(Math.random() * quips.length)];
        const quipEl = document.getElementById('gameover-quip');
        if (quipEl) quipEl.textContent = quip;
        
        this.showScreen('gameover');
    }
    
    showQuip(category, value = null) {
        let quips = CONFIG.QUIPS[category];
        if (!quips || quips.length === 0) return;
        
        let quip;
        if (category === 'MILESTONE' && value) {
            quip = quips.find(q => q.includes(value.toString())) || quips[0];
        } else {
            quip = quips[Math.floor(Math.random() * quips.length)];
        }
        
        if (!this.quipContainer) return;
        
        // Create quip element
        const quipEl = document.createElement('div');
        quipEl.className = 'quip';
        quipEl.textContent = quip;
        
        // Clear existing and add new
        this.quipContainer.innerHTML = '';
        this.quipContainer.appendChild(quipEl);
        
        // Remove after animation
        setTimeout(() => {
            quipEl.remove();
        }, 1500);
    }
    
    showToast(message, type = 'info') {
        if (!this.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    updateHUD(score, multiplier, shards) {
        const scoreEl = document.getElementById('hud-score');
        const multiplierEl = document.getElementById('hud-multiplier');
        const shardsEl = document.getElementById('hud-shards');
        
        if (scoreEl) scoreEl.textContent = Math.floor(score).toLocaleString();
        if (multiplierEl) multiplierEl.textContent = `x${multiplier.toFixed(1)}`;
        if (shardsEl) shardsEl.textContent = shards;
    }
    
    setLoadingProgress(percent) {
        const progressEl = document.getElementById('loading-progress');
        if (progressEl) {
            progressEl.textContent = `${Math.floor(percent)}%`;
        }
    }
    
    updateWalletStatus(connected, address = null) {
        const walletStatus = document.getElementById('wallet-status');
        const connectBtn = document.getElementById('btn-connect-wallet');
        const submitBtn = document.getElementById('btn-submit-score');
        const connectToCompete = document.getElementById('btn-connect-to-compete');
        
        if (connected && address) {
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <div class="wallet-connected">
                        <span class="wallet-icon">◎</span>
                        <span class="wallet-address">${shortAddress}</span>
                    </div>
                `;
            }
            if (submitBtn) submitBtn.style.display = 'block';
            if (connectToCompete) connectToCompete.style.display = 'none';
        } else {
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <button id="btn-connect-wallet" class="btn btn-wallet">
                        <span class="wallet-icon">◎</span>
                        Connect Wallet
                    </button>
                `;
            }
            if (submitBtn) submitBtn.style.display = 'none';
            if (connectToCompete) connectToCompete.style.display = 'block';
        }
    }
}
