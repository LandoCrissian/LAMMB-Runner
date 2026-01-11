// ========================================
// LAMMB: Trenches Runner - Wallet Manager
// ========================================

import { CONFIG } from '../config.js';

export class WalletManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.wallet = null;
        this.publicKey = null;
        this.connected = false;
    }
    
    async init() {
        // Check for Phantom or Solflare
        this.checkForWallets();
        
        // Auto-reconnect if previously connected
        if (window.localStorage.getItem('walletConnected') === 'true') {
            await this.connect();
        }
    }
    
    checkForWallets() {
        this.hasPhantom = window.solana && window.solana.isPhantom;
        this.hasSolflare = window.solflare && window.solflare.isSolflare;
        return this.hasPhantom || this.hasSolflare;
    }
    
    getProvider() {
        if (this.hasPhantom) return window.solana;
        if (this.hasSolflare) return window.solflare;
        return null;
    }
    
    async connect() {
        const provider = this.getProvider();
        
        if (!provider) {
            this.uiManager.showToast('Please install Phantom or Solflare wallet', 'warning');
            window.open('https://phantom.app/', '_blank');
            return false;
        }
        
        try {
            const response = await provider.connect();
            this.publicKey = response.publicKey.toString();
            this.wallet = provider;
            this.connected = true;
            
            window.localStorage.setItem('walletConnected', 'true');
            
            this.uiManager.updateWalletStatus(true, this.publicKey);
            this.uiManager.showToast('Wallet connected!', 'success');
            
            // Listen for disconnect
            provider.on('disconnect', () => this.handleDisconnect());
            
            return true;
        } catch (err) {
            console.error('Wallet connection error:', err);
            this.uiManager.showToast('Failed to connect wallet', 'error');
            return false;
        }
    }
    
    async disconnect() {
        const provider = this.getProvider();
        
        if (provider) {
            try {
                await provider.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        
        this.handleDisconnect();
    }
    
    handleDisconnect() {
        this.wallet = null;
        this.publicKey = null;
        this.connected = false;
        
        window.localStorage.removeItem('walletConnected');
        this.uiManager.updateWalletStatus(false);
    }
    
    async signMessage(message) {
        if (!this.connected || !this.wallet) {
            throw new Error('Wallet not connected');
        }
        
        try {
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await this.wallet.signMessage(encodedMessage, 'utf8');
            
            // Convert to base64
            const signature = btoa(String.fromCharCode(...signedMessage.signature));
            
            return signature;
        } catch (err) {
            console.error('Signing error:', err);
            throw new Error('Failed to sign message');
        }
    }
    
    getPublicKey() {
        return this.publicKey;
    }
    
    isConnected() {
        return this.connected;
    }
    
    async signScoreSubmission(score, weekId) {
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15);
        
        const message = JSON.stringify({
            action: 'submit_score',
            wallet: this.publicKey,
            score: score,
            weekId: weekId,
            timestamp: timestamp,
            nonce: nonce,
        });
        
        const signature = await this.signMessage(message);
        
        return {
            wallet: this.publicKey,
            score: score,
            weekId: weekId,
            timestamp: timestamp,
            nonce: nonce,
            signature: signature,
            message: message,
        };
    }
}
