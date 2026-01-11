// ========================================
// LAMMB: Trenches Runner - Get Leaderboard Function
// ========================================

const { createClient } = require('@supabase/supabase-js');

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
        
        if (!supabaseUrl || !supabaseKey) {
            // Return mock data for development
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
                }),
            };
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch top 25 scores for the week
        const { data: leaderboard, error: leaderboardError } = await supabase
            .from('scores')
            .select('wallet, score')
            .eq('week_id', weekId)
            .order('score', { ascending: false })
            .limit(25);
        
        if (leaderboardError) {
            throw leaderboardError;
        }
        
        let userRank = null;
        
        if (wallet) {
            // Get user's rank
            const { data: userScore, error: userError } = await supabase
                .from('scores')
                .select('score')
                .eq('week_id', weekId)
                .eq('wallet', wallet)
                .single();
            
            if (userScore && !userError) {
                // Count how many scores are higher
                const { count } = await supabase
                    .from('scores')
                    .select('*', { count: 'exact', head: true })
                    .eq('week_id', weekId)
                    .gt('score', userScore.score);
                
                userRank = {
                    rank: (count || 0) + 1,
                    score: userScore.score,
                };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                weekId,
                leaderboard: leaderboard || [],
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
