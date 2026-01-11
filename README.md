# LAMMB: Trenches Runner 🐑⚡

A skill-based 3D endless runner for the LAMMB community. No pay-to-win, just pure skill.

## 🎮 Play Now

Visit the deployed game at your Netlify URL.

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/lammb-trenches-runner.git
   cd lammb-trenches-runner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

4. **Run with Netlify Functions**
   ```bash
   npm run functions
   ```
   This starts the Netlify dev server with function support.

### Deploy to Netlify

1. **Push to GitHub**

2. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Select your repository
   - Build settings are auto-configured via `netlify.toml`

3. **Set Environment Variables**
   In Netlify Dashboard → Site Settings → Environment Variables:
   
   | Variable | Description |
   |----------|-------------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | Supabase anonymous key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (functions only) |
   | `REWARDS_WALLET_ADDRESS` | Community rewards wallet address |
   | `SOLANA_RPC_URL` | (Optional) Custom Solana RPC URL |

## 🗄️ Database Setup (Supabase)

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run this SQL to create the scores table:

```sql
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  score INTEGER NOT NULL,
  week_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet, week_id)
);

-- Index for leaderboard queries
CREATE INDEX idx_scores_week_score ON scores(week_id, score DESC);

-- Index for user lookups
CREATE INDEX idx_scores_wallet_week ON scores(wallet, week_id);

-- Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow public reads
CREATE POLICY "Public read access" ON scores
  FOR SELECT USING (true);

-- Allow inserts via service role only
CREATE POLICY "Service role insert" ON scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update" ON scores
  FOR UPDATE USING (true);
```

3. Copy your project URL and keys to Netlify environment variables.

## 🎯 Game Controls

### Mobile
- **Swipe Left/Right**: Change lanes
- **Swipe Up**: Jump
- **Swipe Down**: Slide

### Desktop
- **A/D or Arrow Keys**: Change lanes
- **W/Space/Up Arrow**: Jump
- **S/Down Arrow**: Slide
- **Escape**: Pause

## 🏗️ Project Structure

```
lammb-trenches-runner/
├── index.html              # Main HTML
├── css/styles.css          # All styles
├── js/
│   ├── app.js              # Main application
│   ├── config.js           # Configuration
│   ├── game/               # Game engine
│   │   ├── Game.js         # Main game controller
│   │   ├── Player.js       # Player character
│   │   ├── World.js        # Environment
│   │   ├── ObstacleManager.js
│   │   ├── CollectibleManager.js
│   │   ├── InputManager.js
│   │   ├── CollisionManager.js
│   │   ├── ScoreManager.js
│   │   └── AudioManager.js
│   ├── ui/
│   │   └── UIManager.js    # UI management
│   ├── wallet/
│   │   └── WalletManager.js # Solana wallet
│   └── api/
│       └── APIClient.js    # Backend API
├── netlify/
│   └── functions/          # Serverless functions
│       ├── submit-score.js
│       ├── get-leaderboard.js
│       └── get-wallet-balance.js
├── netlify.toml            # Netlify config
└── package.json
```

## 🔧 How to Extend

### Adding New Obstacles
1. Edit `js/game/ObstacleManager.js`
2. Add new type in `CONFIG.GAME.OBSTACLES.TYPES`
3. Create geometry in `createObstacle()` method
4. Adjust spawn weights in `getTypeWeights()`

### Adding New Cosmetics
1. Edit cosmetic definitions in `js/app.js` (`getSkinItems()`, `getTrailItems()`)
2. Implement visual changes in `js/game/Player.js`

### Adding New Game Modes
1. Create new game mode class extending `Game.js`
2. Add mode selection to landing screen
3. Adjust scoring/difficulty as needed

### Adding Real 3D Models
1. Place GLTF/GLB files in `/assets/models/`
2. Load using Three.js GLTFLoader
3. Replace placeholder geometry in `Player.js` and `ObstacleManager.js`

## 🛡️ Security Features

- **Wallet signature verification** for score submissions
- **Rate limiting** (5 submissions per wallet per hour)
- **Score sanity checks** (max points per minute)
- **Server-side validation** of all submissions
- **No transaction signing** for leaderboard (message signing only)

## 📊 Weekly Leaderboard

- Resets every Sunday at 00:00 UTC
- Top 10 players displayed
- Week ID format: `YYYY-WXX` (ISO week)
- Only best score per wallet per week stored

## 🎨 Theme Colors

- Cyan: `#00f5ff`
- Purple: `#bf00ff`  
- Pink: `#ff00aa`
- Green: `#00ff88`
- Yellow: `#ffee00`

## 📱 Performance Tips

- Use "Low" graphics mode on older devices
- Close other browser tabs for best performance
- Portrait orientation recommended on mobile

## 🔮 Future Roadmap

- [ ] Weekly reward distribution automation
- [ ] More cosmetics and SOL purchases
- [ ] Seasonal events and themes
- [ ] Replay/clip export
- [ ] Multiplayer races
- [ ] LAMMB token integration

## 🤝 Community

Join the LAMMB community: [X Community](https://x.com/i/communities/2009302380622565434)

## 📄 License

MIT License - Built for the LAMMB community.

---

**No pay-to-win. Skill > Money. WAGMI.** 🐑
