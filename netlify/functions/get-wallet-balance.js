// ========================================
// LAMMB: Trenches Runner - Get Wallet Balance Function
// No external dependencies - uses native fetch
// ========================================

exports.handler = async (event, context) => {
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
        const rewardsWallet = process.env.REWARDS_WALLET_ADDRESS || 'LAMMBWxKsMVc3K1JLptqyBGYTEPqGjVvLHn6zVSBGdL';
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        
        // Fetch balance from Solana RPC using JSON-RPC
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [rewardsWallet],
            }),
        });
        
        if (!response.ok) {
            throw new Error(`RPC request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'RPC error');
        }
        
        // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
        const balanceLamports = data.result?.value || 0;
        const balanceSOL = balanceLamports / 1_000_000_000;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                wallet: rewardsWallet,
                balance: balanceSOL,
                lamports: balanceLamports,
                timestamp: new Date().toISOString(),
            }),
        };
        
    } catch (error) {
        console.error('Balance fetch error:', error);
        
        // Return a fallback response so the UI doesn't break
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                wallet: process.env.REWARDS_WALLET_ADDRESS || 'LAMMBWxKsMVc3K1JLptqyBGYTEPqGjVvLHn6zVSBGdL',
                balance: 0,
                lamports: 0,
                timestamp: new Date().toISOString(),
                error: 'Unable to fetch balance',
            }),
        };
    }
};
