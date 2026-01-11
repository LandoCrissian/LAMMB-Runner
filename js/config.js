// ========================================
// LAMMB: Trenches Runner - Configuration
// ========================================

export const CONFIG = {
    // Game Version
    VERSION: '1.0.0-mvp',
    
    // API Endpoints (Netlify Functions)
    API: {
        SUBMIT_SCORE: '/.netlify/functions/submit-score',
        GET_LEADERBOARD: '/.netlify/functions/get-leaderboard',
        GET_WALLET_BALANCE: '/.netlify/functions/get-wallet-balance',
    },
    
    // Solana Configuration
    SOLANA: {
        // Default to mainnet, can be overridden
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        // Community Rewards Wallet (placeholder - set via env)
        REWARDS_WALLET: 'LAMMBWxKsMVc3K1JLptqyBGYTEPqGjVvLHn6zVSBGdL', // Example placeholder
        // LAMMB Token Mint (for future use)
        LAMMB_MINT: '8bqLYi7wF179V8bGXEMyV4GfD2dFfoWLqafS8iZwpump',
    },
    
    // Community Links
    COMMUNITY: {
        TWITTER: 'https://x.com/i/communities/2009302380622565434',
    },
    
    // Game Settings
    GAME: {
        // Player
        PLAYER: {
            LANE_WIDTH: 2.5,
            LANE_COUNT: 3,
            LANE_CHANGE_SPEED: 12,
            JUMP_FORCE: 12,
            GRAVITY: 35,
            SLIDE_DURATION: 600, // ms
            NORMAL_HEIGHT: 1.5,
            SLIDE_HEIGHT: 0.5,
        },
        
        // World
        WORLD: {
            INITIAL_SPEED: 15,
            MAX_SPEED: 40,
            SPEED_INCREMENT: 0.15, // per second
            CHUNK_LENGTH: 50,
            VISIBLE_CHUNKS: 3,
            FLOOR_WIDTH: 10,
        },
        
        // Obstacles
        OBSTACLES: {
            MIN_SPACING: 8,
            MAX_SPACING: 20,
            POOL_SIZE: 30,
            TYPES: {
                BOT: { width: 1, height: 1.5, depth: 1, color: 0xff4444 },
                RUG_PULL: { width: 2, height: 0.5, depth: 2, color: 0x8b0000 },
                FUD_CLOUD: { width: 2.5, height: 3, depth: 2, color: 0x444488, slowFactor: 0.5 },
                PAPER_HANDS: { width: 3, height: 2.5, depth: 0.5, color: 0xcccccc },
            },
        },
        
        // Collectibles
        COLLECTIBLES: {
            COFFEE: {
                SPAWN_CHANCE: 0.3,
                MULTIPLIER_BOOST: 1,
                DURATION: 5000, // ms
            },
            GLOW_SHARD: {
                SPAWN_CHANCE: 0.15,
                VALUE: 1,
            },
            POOL_SIZE: 50,
        },
        
        // Scoring
        SCORING: {
            DISTANCE_MULTIPLIER: 10,
            BASE_MULTIPLIER: 1,
            MAX_MULTIPLIER: 5,
            MULTIPLIER_DECAY: 0.5, // per second when not boosted
        },
        
        // Difficulty
        DIFFICULTY: {
            OBSTACLE_FREQUENCY_BASE: 1.5, // seconds
            OBSTACLE_FREQUENCY_MIN: 0.8,
            FREQUENCY_DECREASE_RATE: 0.01, // per second
        },
    },
    
    // Graphics Settings
    GRAPHICS: {
        LOW: {
            PIXEL_RATIO: 1,
            SHADOWS: false,
            POST_PROCESSING: false,
            PARTICLE_COUNT: 20,
            DRAW_DISTANCE: 100,
        },
        HIGH: {
            PIXEL_RATIO: Math.min(window.devicePixelRatio, 2),
            SHADOWS: true,
            POST_PROCESSING: true,
            PARTICLE_COUNT: 100,
            DRAW_DISTANCE: 200,
        },
    },
    
    // Audio (placeholder paths)
    AUDIO: {
        ENABLED: true,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.6,
        SOUNDS: {
            JUMP: '/assets/audio/jump.mp3',
            SLIDE: '/assets/audio/slide.mp3',
            COLLECT_SHARD: '/assets/audio/shard.mp3',
            COLLECT_COFFEE: '/assets/audio/coffee.mp3',
            HIT: '/assets/audio/hit.mp3',
            GAME_OVER: '/assets/audio/gameover.mp3',
        },
    },
    
    // Quips (funny on-screen messages)
    QUIPS: {
        COFFEE: [
            'GM energy +10',
            'Caffeinated!',
            'LFG juice!',
            'Maximum cope acquired',
            'Bullish beans!',
        ],
        HIT: [
            'Rugged by gravity',
            'Paper handed that landing',
            'Wen recovery?',
            'Down bad rn',
            'NGMI moment',
        ],
        NEW_BEST: [
            'Goated.',
            'WAGMI energy',
            'Built different',
            'Trenches certified',
            'Diamond hooves!',
        ],
        MILESTONE: [
            '1000! Still going!',
            '5000! Absolute unit!',
            '10000! Legendary run!',
        ],
    },
    
    // Leaderboard
    LEADERBOARD: {
        MAX_SUBMISSIONS_PER_HOUR: 5,
        TOP_DISPLAY_COUNT: 10,
        // Max reasonable score per minute (anti-cheat threshold)
        MAX_SCORE_PER_MINUTE: 2000,
    },
    
    // Local Storage Keys
    STORAGE: {
        BEST_SCORE: 'lammb_best_score',
        TOTAL_SHARDS: 'lammb_total_shards',
        SETTINGS: 'lammb_settings',
        COSMETICS: 'lammb_cosmetics',
        EQUIPPED: 'lammb_equipped',
    },
};

// Utility to get week ID (ISO week number + year)
export function getWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Utility to check if device is mobile
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
}

// Utility to get default graphics quality
export function getDefaultQuality() {
    return isMobile() ? 'LOW' : 'HIGH';
}
