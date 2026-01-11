// ========================================
// LAMMB: Trenches Runner - Get Leaderboard Function
// ========================================

// Get current ISO week ID
function getWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
    
    try {
        const params = event.queryStringParameters || {};
        const weekId = params.weekId || getWeekId();
        const wallet = params.wallet;
        
        // Check for Supabase config
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        // If Supabase is not configured, return mock data for demo
        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    weekId,
                    leaderboard: [
                        { wallet: 'Demo1111111111111111111111111111111111111111', score: 15000 },
                        { wallet: 'Demo2222222222222222222222222222222222222222', score: 12500 },
                        { wallet: 'Demo3333333333333333333333333333333333333333', score: 10000 },
                        { wallet: 'Demo4444444444444444444444444444444444444444', score: 8500 },
                        { wallet: 'Demo5555555555555555555555555555555555555555', score: 7000 },
                    ],
                    userRank: wallet ? { rank: 99, score: 1000 } : null,
                    demo: true,
                }),
            };
        }
        
        // Use fetch to call Supabase REST API directly (no SDK needed)
        const leaderboardResponse = await fetch(
            `${supabaseUrl}/rest/v1/scores?week_id=eq.${weekId}&order=score.desc&limit=25`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
            }
        );
        
        if (!leaderboardResponse.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        
        const leaderboard = await leaderboardResponse.json();
        
        let userRank = null;
        
        if (wallet) {
            // Get user's score
            const userResponse = await fetch(
                `${supabaseUrl}/rest/v1/scores?week_id=eq.${weekId}&wallet=eq.${wallet}&limit=1`,
                {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                    },
                }
            );
            
            const userData = await userResponse.json();
            
            if (userData && userData.length > 0) {
                const userScore = userData[0].score;
                
                // Count scores higher than user's
                const countResponse = await fetch(
                    `${supabaseUrl}/rest/v1/scores?week_id=eq.${weekId}&score=gt.${userScore}&select=id`,
                    {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'count=exact',
                        },
                    }
                );
                
                const countHeader = countResponse.headers.get('content-range');
                const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
                
                userRank = {
                    rank: count + 1,
                    score: userScore,
                };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                weekId,
                leaderboard: leaderboard.map(entry => ({
                    wallet: entry.wallet,
                    score: entry.score,
                })),
                userRank,
            }),
        };
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard' }),
        };
    }
};
