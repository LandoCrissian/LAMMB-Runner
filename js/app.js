// ========================================
// LAMMB: Trenches Runner - Main Application
// ========================================

import { CONFIG, getWeekId } from './config.js';
import { Game } from './game/Game.js';
import { UIManager } from './ui/UIManager.js';
import { WalletManager } from './wallet/WalletManager.js';
import { APIClient } from './api/APIClient.js';

class App {
    constructor() {
        this.game = null;
        this.uiManager = null;
        this.walletManager = null;
        this.apiClient = null;
        this.initialized = false;
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('LAMMB: Trenches Runner - Initializing...');
        
        // Initialize managers
        this.uiManager = new UIManager();
        this.apiClient = new APIClient();
        this.walletManager = new WalletManager(this.uiManager);
        
        // Get canvas
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Game canvas not found!');
            return;
        }
        
        // Initialize game
        this.game = new Game(canvas, this.uiManager);
        
        // Bind UI events
        this.bindUIEvents();
        
        // Initialize wallet (auto-reconnect if previously connected)
        await this.walletManager.init();
        
        // Load transparency data
        this.loadTransparencyData();
        
        // Hide loading, show landing
        this.uiManager.showScreen('landing');
        
        this.initialized = true;
        console.log('LAMMB: Trenches Runner - Ready!');
    }
    
    bindUIEvents() {
        // Play button
        this.bindClick('btn-play', () => this.startGame());
        this.bindClick('btn-play-again', () => this.startGame());
        
        // Pause/Resume
        this.bindClick('btn-pause', () => this.game.pause());
        this.bindClick('btn-resume', () => this.game.resume());
        this.bindClick('btn-quit', () => this.quitToMenu());
        
        // Menu button
        this.bindClick('btn-menu', () => this.quitToMenu());
        
        // Wallet
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-connect-wallet' || e.target.closest('#btn-connect-wallet')) {
                this.connectWallet();
            }
        });
        this.bindClick('btn-connect-to-compete', () => this.connectWallet());
        
        // Leaderboard
        this.bindClick('btn-compete', () => this.showLeaderboard());
        this.bindClick('btn-close-leaderboard', () => this.uiManager.showScreen('landing'));
        
        // Submit score
        this.bindClick('btn-submit-score', () => this.submitScore());
        
        // Cosmetics
        this.bindClick('btn-cosmetics', () => this.showCosmetics());
        this.bindClick('btn-close-cosmetics', () => this.uiManager.showScreen('landing'));
        
        // Modals
        this.bindClick('btn-how-it-works', () => this.uiManager.showModal('howItWorks'));
        this.bindClick('btn-close-how', () => this.uiManager.hideModal('howItWorks'));
        
        this.bindClick('btn-transparency', () => this.uiManager.showModal('transparency'));
        this.bindClick('btn-close-transparency', () => this.uiManager.hideModal('transparency'));
        
        this.bindClick('btn-settings', () => this.uiManager.showModal('settings'));
        this.bindClick('btn-close-settings', () => this.uiManager.hideModal('settings'));
        
        // Settings toggles
        this.bindToggle('setting-sound', (active) => {
            this.game.settings.sound = active;
            this.game.audioManager.setSFXEnabled(active);
            this.game.saveSettings();
        });
        
        this.bindToggle('setting-music', (active) => {
            this.game.settings.music = active;
            this.game.audioManager.setMusicEnabled(active);
            this.game.saveSettings();
        });
        
        this.bindToggle('setting-haptics', (active) => {
            this.game.settings.haptics = active;
            this.game.saveSettings();
        });
        
        // Graphics quality
        document.querySelectorAll('.graphics-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const quality = btn.dataset.quality.toUpperCase();
                document.querySelectorAll('.graphics-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.setQuality(quality);
            });
        });
        
        // Copy address
        this.bindClick('btn-copy-address', () => {
            const address = CONFIG.SOLANA.REWARDS_WALLET;
            navigator.clipboard.writeText(address).then(() => {
                this.uiManager.showToast('Address copied!', 'success');
            });
        });
        
        // Cosmetics tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadCosmeticsTab(btn.dataset.tab);
            });
        });
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.uiManager.hideAllModals();
                }
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.game && this.game.isPaused) {
                    this.game.resume();
                } else {
                    this.uiManager.hideAllModals();
                }
            }
        });
        
        // Initialize audio on first interaction
        document.addEventListener('click', () => {
            if (this.game && this.game.audioManager) {
                this.game.audioManager.init();
            }
        }, { once: true });
        
        document.addEventListener('touchstart', () => {
            if (this.game && this.game.audioManager) {
                this.game.audioManager.init();
            }
        }, { once: true });
    }
    
    bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', handler);
        }
    }
    
    bindToggle(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                el.classList.toggle('active');
                const active = el.classList.contains('active');
                el.setAttribute('aria-pressed', active);
                handler(active);
            });
        }
    }
    
    startGame() {
        if (!this.game) return;
        
        this.uiManager.hideAllModals();
        this.game.start();
    }
    
    quitToMenu() {
        if (this.game) {
            this.game.isRunning = false;
            this.game.isPaused = false;
            this.game.isGameOver = true;
            this.game.reset();
            
            // Restart attract mode
            this.game.attractModeActive = true;
            this.game.animateAttractMode();
        }
        this.uiManager.showScreen('landing');
    }
    
    async connectWallet() {
        const success = await this.walletManager.connect();
        if (success) {
            // Refresh leaderboard if open
            if (this.uiManager.currentScreen === 'leaderboard') {
                this.loadLeaderboard();
            }
        }
    }
    
    async showLeaderboard() {
        this.uiManager.showScreen('leaderboard');
        await this.loadLeaderboard();
    }
    
    async loadLeaderboard() {
        const listEl = document.getElementById('leaderboard-list');
        const yourRankEl = document.getElementById('your-rank');
        
        if (listEl) {
            listEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
        }
        
        try {
            const data = await this.apiClient.getLeaderboard();
            
            if (!data.leaderboard || data.leaderboard.length === 0) {
                listEl.innerHTML = '<div class="leaderboard-loading">No scores yet this week. Be the first!</div>';
                return;
            }
            
            // Render leaderboard
            const userWallet = this.walletManager.getPublicKey();
            
            listEl.innerHTML = data.leaderboard.slice(0, 10).map((entry, index) => {
                const rank = index + 1;
                const isYou = userWallet && entry.wallet === userWallet;
                const shortWallet = `${entry.wallet.slice(0, 4)}...${entry.wallet.slice(-4)}`;
                
                let rankClass = '';
                if (rank === 1) rankClass = 'top-1';
                else if (rank === 2) rankClass = 'top-2';
                else if (rank === 3) rankClass = 'top-3';
                if (isYou) rankClass += ' you';
                
                return `
                    <div class="leaderboard-entry ${rankClass}">
                        <span class="entry-rank">#${rank}</span>
                        <span class="entry-wallet">${shortWallet}</span>
                        <span class="entry-score">${entry.score.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
            
            // Show user rank if connected
            if (userWallet && data.userRank) {
                if (yourRankEl) {
                    yourRankEl.style.display = 'flex';
                    document.getElementById('your-rank-value').textContent = `#${data.userRank.rank}`;
                    document.getElementById('your-rank-score').textContent = data.userRank.score.toLocaleString();
                }
            } else if (yourRankEl) {
                yourRankEl.style.display = 'none';
            }
            
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
            listEl.innerHTML = '<div class="leaderboard-loading">Failed to load leaderboard. Try again later.</div>';
        }
    }
    
    async submitScore() {
        if (!this.walletManager.isConnected()) {
            await this.connectWallet();
            if (!this.walletManager.isConnected()) return;
        }
        
        const score = this.game.scoreManager.getScore();
        const weekId = getWeekId();
        
        try {
            this.uiManager.showToast('Signing score...', 'info');
            
            const signedData = await this.walletManager.signScoreSubmission(score, weekId);
            
            this.uiManager.showToast('Submitting score...', 'info');
            
            const result = await this.apiClient.submitScore(signedData);
            
            if (result.success) {
                this.uiManager.showToast('Score submitted! 🎉', 'success');
                
                // Hide submit button
                const submitBtn = document.getElementById('btn-submit-score');
                if (submitBtn) submitBtn.style.display = 'none';
            } else {
                throw new Error(result.error || 'Submission failed');
            }
            
        } catch (err) {
            console.error('Score submission error:', err);
            this.uiManager.showToast(err.message || 'Failed to submit score', 'error');
        }
    }
    
    showCosmetics() {
        this.uiManager.showScreen('cosmetics');
        this.loadCosmeticsTab('skins');
        
        // Update shards display
        const shardsEl = document.getElementById('cosmetics-shards');
        if (shardsEl && this.game) {
            shardsEl.textContent = this.game.scoreManager.getTotalShards();
        }
    }
    
    loadCosmeticsTab(tab) {
        const gridEl = document.getElementById('cosmetics-grid');
        if (!gridEl) return;
        
        const items = tab === 'skins' ? this.getSkinItems() : this.getTrailItems();
        
        gridEl.innerHTML = items.map(item => {
            let priceHTML = '';
            if (item.price === 0) {
                priceHTML = `<span class="cosmetic-price free">FREE</span>`;
            } else if (item.currency === 'shards') {
                priceHTML = `<span class="cosmetic-price shards">💎 ${item.price}</span>`;
            } else {
                priceHTML = `<span class="cosmetic-price sol">◎ ${item.price}</span>`;
            }
            
            return `
                <div class="cosmetic-item ${item.owned ? 'owned' : ''} ${item.equipped ? 'equipped' : ''} ${!item.owned && item.price > 0 ? 'locked' : ''}" 
                     data-id="${item.id}" data-tab="${tab}">
                    <span class="cosmetic-icon">${item.icon}</span>
                    <span class="cosmetic-name">${item.name}</span>
                    ${!item.owned ? priceHTML : ''}
                </div>
            `;
        }).join('');
        
        // Bind cosmetic clicks
        gridEl.querySelectorAll('.cosmetic-item').forEach(el => {
            el.addEventListener('click', () => this.handleCosmeticClick(el));
        });
    }
    
    getSkinItems() {
        const owned = JSON.parse(localStorage.getItem(CONFIG.STORAGE.COSMETICS) || '{}');
        const equipped = JSON.parse(localStorage.getItem(CONFIG.STORAGE.EQUIPPED) || '{}');
        
        return [
            { id: 'default', name: 'Default', icon: '🐑', price: 0, owned: true, equipped: equipped.skin === 'default' || !equipped.skin },
            { id: 'golden', name: 'Golden', icon: '🌟', price: 100, currency: 'shards', owned: owned.golden, equipped: equipped.skin === 'golden' },
            { id: 'cyber', name: 'Cyber', icon: '🤖', price: 200, currency: 'shards', owned: owned.cyber, equipped: equipped.skin === 'cyber' },
            { id: 'diamond', name: 'Diamond', icon: '💎', price: 0.1, currency: 'sol', owned: owned.diamond, equipped: equipped.skin === 'diamond' },
            { id: 'neon', name: 'Neon', icon: '✨', price: 0.15, currency: 'sol', owned: owned.neon, equipped: equipped.skin === 'neon' },
            { id: 'legendary', name: 'Legendary', icon: '👑', price: 0.25, currency: 'sol', owned: owned.legendary, equipped: equipped.skin === 'legendary' },
        ];
    }
    
    getTrailItems() {
        const owned = JSON.parse(localStorage.getItem(CONFIG.STORAGE.COSMETICS) || '{}');
        const equipped = JSON.parse(localStorage.getItem(CONFIG.STORAGE.EQUIPPED) || '{}');
        
        return [
            { id: 'none', name: 'None', icon: '❌', price: 0, owned: true, equipped: !equipped.trail || equipped.trail === 'none' },
            { id: 'sparkle', name: 'Sparkle', icon: '✨', price: 50, currency: 'shards', owned: owned.sparkle, equipped: equipped.trail === 'sparkle' },
            { id: 'fire', name: 'Fire', icon: '🔥', price: 150, currency: 'shards', owned: owned.fire, equipped: equipped.trail === 'fire' },
            { id: 'rainbow', name: 'Rainbow', icon: '🌈', price: 0.1, currency: 'sol', owned: owned.rainbow, equipped: equipped.trail === 'rainbow' },
            { id: 'lightning', name: 'Lightning', icon: '⚡', price: 0.15, currency: 'sol', owned: owned.lightning, equipped: equipped.trail === 'lightning' },
            { id: 'cosmic', name: 'Cosmic', icon: '🌌', price: 0.2, currency: 'sol', owned: owned.cosmic, equipped: equipped.trail === 'cosmic' },
        ];
    }
    
    handleCosmeticClick(el) {
        const id = el.dataset.id;
        const tab = el.dataset.tab;
        const items = tab === 'skins' ? this.getSkinItems() : this.getTrailItems();
        const item = items.find(i => i.id === id);
        
        if (!item) return;
        
        if (item.owned) {
            // Equip item
            const equipped = JSON.parse(localStorage.getItem(CONFIG.STORAGE.EQUIPPED) || '{}');
            if (tab === 'skins') {
                equipped.skin = id;
            } else {
                equipped.trail = id;
            }
            localStorage.setItem(CONFIG.STORAGE.EQUIPPED, JSON.stringify(equipped));
            
            // Update displays
            this.loadCosmeticsTab(tab);
            this.updateEquippedDisplay();
            this.uiManager.showToast(`${item.name} equipped!`, 'success');
            
        } else if (item.currency === 'shards') {
            // Purchase with shards
            const totalShards = this.game.scoreManager.getTotalShards();
            if (totalShards >= item.price) {
                // Deduct shards
                const newTotal = totalShards - item.price;
                localStorage.setItem(CONFIG.STORAGE.TOTAL_SHARDS, newTotal.toString());
                
                // Mark as owned
                const owned = JSON.parse(localStorage.getItem(CONFIG.STORAGE.COSMETICS) || '{}');
                owned[id] = true;
                localStorage.setItem(CONFIG.STORAGE.COSMETICS, JSON.stringify(owned));
                
                // Update UI
                this.loadCosmeticsTab(tab);
                document.getElementById('cosmetics-shards').textContent = newTotal;
                this.uiManager.showToast(`${item.name} unlocked!`, 'success');
            } else {
                this.uiManager.showToast('Not enough Glow Shards!', 'warning');
            }
            
        } else {
            // SOL purchase - coming soon
            this.uiManager.showToast('SOL purchases coming soon!', 'info');
        }
    }
    
    updateEquippedDisplay() {
        const equipped = JSON.parse(localStorage.getItem(CONFIG.STORAGE.EQUIPPED) || '{}');
        const skinEl = document.getElementById('equipped-skin');
        const trailEl = document.getElementById('equipped-trail');
        
        if (skinEl) {
            const skins = this.getSkinItems();
            const equippedSkin = skins.find(s => s.id === equipped.skin) || skins[0];
            skinEl.textContent = equippedSkin.name;
        }
        
        if (trailEl) {
            const trails = this.getTrailItems();
            const equippedTrail = trails.find(t => t.id === equipped.trail) || trails[0];
            trailEl.textContent = equippedTrail.name;
        }
    }
    
    async loadTransparencyData() {
        // Set wallet address
        const addressEl = document.getElementById('rewards-wallet-address');
        const solscanLink = document.getElementById('solscan-link');
        const rewardsWallet = CONFIG.SOLANA.REWARDS_WALLET;
        
        if (addressEl) {
            const shortAddress = `${rewardsWallet.slice(0, 8)}...${rewardsWallet.slice(-8)}`;
            addressEl.textContent = shortAddress;
        }
        
        if (solscanLink) {
            solscanLink.href = `https://solscan.io/account/${rewardsWallet}`;
        }
        
        // Fetch balance
        try {
            const data = await this.apiClient.getWalletBalance();
            
            const balanceEl = document.getElementById('rewards-balance');
            const updatedEl = document.getElementById('balance-updated');
            
            if (balanceEl && data.balance !== undefined) {
                balanceEl.textContent = data.balance.toFixed(4);
            }
            
            if (updatedEl) {
                updatedEl.textContent = new Date().toLocaleTimeString();
            }
        } catch (err) {
            console.warn('Failed to fetch rewards wallet balance:', err);
        }
    }
}

// Initialize app
const app = new App();

// Export for debugging
window.LAMMBApp = app;
