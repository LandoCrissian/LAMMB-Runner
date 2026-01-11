// ========================================
// LAMMB: Trenches Runner - Submit Score Function
// No external dependencies - uses native crypto + fetch
// ========================================

// Get current ISO week ID
function getWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Base58 alphabet for Solana addresses
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Decode base58 string to bytes
function base58Decode(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const index = BASE58_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid base58 character');
        }
        
        let carry = index;
        for (let j = 0; j < bytes.length; j++) {
            carry += bytes[j] * 58;
            bytes[j] = carry & 0xff;
            carry >>= 8;
        }
        
        while (carry > 0) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    
    // Handle leading zeros
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
}

// Simple rate limiting using in-memory store (resets on cold start)
const rateLimitStore = new Map();

function checkRateLimit(wallet) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const submissions = rateLimitStore.get(wallet) || [];
    const recentSubmissions = submissions.filter(t => t > hourAgo);
    
    if (recentSubmissions.length >= 5) {
        return false;
    }
    
    recentSubmissions.push(now);
    rateLimitStore.set(wallet, recentSubmissions);
    return true;
}

// Score sanity check - prevent obviously impossible scores
function isScoreReasonable(score, timestamp) {
    const now = Date.now();
    const maxRunDuration = 30 * 60 * 1000; // Max 30 minute run
    
    // If timestamp is too old, reject
    if (now - timestamp > maxRunDuration) {
        return false;
    }
    
    // Max ~2000 points per minute is reasonable
    const runDurationMinutes = Math.max(1, (now - timestamp) / 60000);
    const maxScorePerMinute = 2500;
    const maxPossibleScore = runDurationMinutes * maxScorePerMinute + 1000;
    
    return score >= 0 && score <= maxPossibleScore;
}

// Validate Solana wallet address format
function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;
    
    // Check if all characters are valid base58
    for (const char of address) {
        if (!BASE58_ALPHABET.includes(char)) return false;
    }
    
    return true;
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
    
    try {
        const body = JSON.parse(event.body);
        const { wallet, score, weekId, timestamp, nonce, signature, message } = body;
        
        // Validate required fields
        if (!wallet || score === undefined || !weekId || !timestamp || !signature || !message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }
        
        // Validate wallet address format
        if (!isValidSolanaAddress(wallet)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid wallet address' }),
            };
        }
        
        // Check week ID matches current week
        const currentWeekId = getWeekId();
        if (weekId !== currentWeekId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid week ID' }),
            };
        }
        
        // Check timestamp is recent (within last 10 minutes)
        const now = Date.now();
        if (Math.abs(now - timestamp) > 10 * 60 * 1000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Submission expired' }),
            };
        }
        
        // Rate limit check
        if (!checkRateLimit(wallet)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Rate limit exceeded. Max 5 submissions per hour.' }),
            };
        }
        
        // Score sanity check
        if (!isScoreReasonable(score, timestamp - 300000)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Score validation failed' }),
            };
        }
        
        // Verify the message content matches the claimed data
        try {
            const parsedMessage = JSON.parse(message);
            if (parsedMessage.wallet !== wallet ||
                parsedMessage.score !== score ||
                parsedMessage.weekId !== weekId ||
                parsedMessage.timestamp !== timestamp) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Message content mismatch' }),
                };
            }
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid message format' }),
            };
        }
        
        // Note: Full Ed25519 signature verification requires external library
        // For MVP, we verify message structure and rely on rate limiting
        // In production, add proper signature verification
        
        // Check for Supabase config
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            // Dev mode - just accept
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Score accepted (demo mode)',
                    score,
                    demo: true,
                }),
            };
        }
        
        // Check if user already has a score this week
        const existingResponse = await fetch(
            `${supabaseUrl}/rest/v1/scores?wallet=eq.${wallet}&week_id=eq.${weekId}&limit=1`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
            }
        );
        
        const existingData = await existingResponse.json();
        
        if (existingData && existingData.length > 0) {
            const existingScore = existingData[0];
            
            // Only update if new score is higher
            if (score > existingScore.score) {
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/scores?wallet=eq.${wallet}&week_id=eq.${weekId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal',
                        },
                        body: JSON.stringify({
                            score,
                            updated_at: new Date().toISOString(),
                        }),
                    }
                );
                
                if (!updateResponse.ok) {
                    throw new Error('Failed to update score');
                }
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        message: 'New best score!',
                        score,
                        previousBest: existingScore.score,
                    }),
                };
            } else {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        message: 'Score submitted (not a new best)',
                        score,
                        currentBest: existingScore.score,
                    }),
                };
            }
        } else {
            // Insert new score
            const insertResponse = await fetch(
                `${supabaseUrl}/rest/v1/scores`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                        wallet,
                        score,
                        week_id: weekId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }),
                }
            );
            
            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error('Insert error:', errorText);
                throw new Error('Failed to insert score');
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Score submitted!',
                    score,
                }),
            };
        }
        
    } catch (error) {
        console.error('Submit score error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to submit score' }),
        };
    }
};
