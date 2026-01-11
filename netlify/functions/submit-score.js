// ========================================
// LAMMB: Trenches Runner - Submit Score Function
// ========================================

const { createClient } = require('@supabase/supabase-js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Get current ISO week ID
function getWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Verify Solana signature
function verifySignature(message, signature, publicKey) {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const publicKeyBytes = bs58.decode(publicKey);
        
        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// Rate limiting store (in-memory for simplicity - use Redis in production)
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

// Score sanity check
function isScoreReasonable(score, timestamp) {
    const now = Date.now();
    const runDuration = (now - timestamp) / 1000; // seconds
    
    // Max ~2000 points per minute seems reasonable
    const maxScorePerMinute = 2000;
    const maxPossibleScore = (runDuration / 60) * maxScorePerMinute;
    
    // Allow some buffer
    return score <= maxPossibleScore * 1.5 + 1000;
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
        if (!wallet || !score || !weekId || !timestamp || !signature || !message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
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
        if (!isScoreReasonable(score, timestamp - 300000)) { // Assume 5 min max run
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Score validation failed' }),
            };
        }
        
        // Verify signature
        const isValid = verifySignature(message, signature, wallet);
        if (!isValid) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid signature' }),
            };
        }
        
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
                    message: 'Score accepted (dev mode)',
                    score,
                }),
            };
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check if user already has a score this week
        const { data: existingScore } = await supabase
            .from('scores')
            .select('score')
            .eq('wallet', wallet)
            .eq('week_id', weekId)
            .single();
        
        if (existingScore) {
            // Only update if new score is higher
            if (score > existingScore.score) {
                const { error } = await supabase
                    .from('scores')
                    .update({ 
                        score, 
                        updated_at: new Date().toISOString(),
                    })
                    .eq('wallet', wallet)
                    .eq('week_id', weekId);
                
                if (error) throw error;
                
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
            const { error } = await supabase
                .from('scores')
                .insert({
                    wallet,
                    score,
                    week_id: weekId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            
            if (error) throw error;
            
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
