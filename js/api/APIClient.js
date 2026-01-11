// ========================================
// LAMMB: Trenches Runner - API Client
// ========================================

import { CONFIG, getWeekId } from '../config.js';

export class APIClient {
    constructor() {
        this.baseUrl = '';
    }
    
    async submitScore(signedData) {
        try {
            const response = await fetch(CONFIG.API.SUBMIT_SCORE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signedData),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit score');
            }
            
            return data;
        } catch (err) {
            console.error('Submit score error:', err);
            throw err;
        }
    }
    
    async getLeaderboard(weekId = null) {
        try {
            const currentWeekId = weekId || getWeekId();
            const response = await fetch(`${CONFIG.API.GET_LEADERBOARD}?weekId=${currentWeekId}`);
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch leaderboard');
            }
            
            return data;
        } catch (err) {
            console.error('Get leaderboard error:', err);
            throw err;
        }
    }
    
    async getWalletBalance() {
        try {
            const response = await fetch(CONFIG.API.GET_WALLET_BALANCE);
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch balance');
            }
            
            return data;
        } catch (err) {
            console.error('Get wallet balance error:', err);
            throw err;
        }
    }
    
    async getUserRank(wallet, weekId = null) {
        try {
            const currentWeekId = weekId || getWeekId();
            const response = await fetch(`${CONFIG.API.GET_LEADERBOARD}?weekId=${currentWeekId}&wallet=${wallet}`);
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch rank');
            }
            
            return data.userRank || null;
        } catch (err) {
            console.error('Get user rank error:', err);
            return null;
        }
    }
}
