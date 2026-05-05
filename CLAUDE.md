# Bliss Farm — Project Context

## What this is
A browser-based incremental farming game. Single HTML file (`index.html`) with all CSS and JS inline. Hosted on GitHub Pages.

## Stack
- Plain HTML/CSS/JS — no frameworks, no build tools
- `sprites.js` + `sprites.png` — crop sprite sheet (13 crops × 3 stages: seed, sprout, grown)
- `localStorage` for all save data

## File structure
```
index.html       ← entire game (HTML + CSS + JS)
sprites.js       ← sprite drawing logic (reference only)
sprites.png      ← sprite sheet used in-game
CLAUDE.md        ← this file
```

## Core systems
- **Farm grid**: starts 3×3, expandable via upgrades. Brown tiles with thin green outline.
- **Seeds**: bought from shop → go to inventory → dragged onto tile to plant
- **Seed bags**: purchasable bags that randomly give 3 seeds with weighted odds
- **Crops**: grow over time on tiles (sprout sprite while growing, grown sprite when ready)
- **Harvesting**: click ready tile → crop attaches to mouse → drag to sell box or inventory
- **Sell box**: wooden crate, bottom-center. Queues crops, auto-sells 1 per interval (FIFO). Upgradeable to iron/steel/titanium/diamond (sells multiple at once).
- **Crank**: optional mechanical crank next to sell box. Each click multiplies sell speed by a factor. Decays over time.
- **Inventory**: right panel. Shows seeds (draggable to tiles) and harvested crops (draggable to sell box). Items also stored here.
- **Right panel**: resizable, collapsible. Sections: Seeds → Seed Bags → Items → Upgrades → Inventory
- **Upgrades**: chained (next hidden until previous bought). Chains: speed, value, sell speed, crank, plot expansion, sell box tier.
- **Items**: Watering Can (well in corner, waters one tile), Cage (crow protection), Common Fertilizer (permanent plot buff +25% speed), Uncommon Fertilizer (permanent +35% speed, unlocks after common placed)
- **Status log**: bottom-left, logs game events
- **Stage display**: top-center. Stage 0: Birth → Stage 1: Real World (1000 all-time coins)
- **Mature state**: unlocks at 1000 all-time coins. Enables crow attacks and weed spawning.
- **Crows**: 5% chance every 10s to steal a crop. Prioritize ground crops (highest value first).
- **Weeds**: 12% chance every 8s to spawn on empty tile. Click 20 times to clear.

## Palette
- Sky blue background: `#87CEEB`
- Brown tiles / panels: `#8B6343` range
- Green grass/outlines: `#5A8A3C`
- White text on dark panels

## Sprites
- Sheet: `sprites.png`, 384×832px, 128×128 per cell
- 13 rows (crops), 3 cols (seed=0, sprout=1, grown=2)
- Row order: potato, carrot, wheat, sunflower, pumpkin, chard, moonbloom, starfruit, thornvine, glowshroom, voidbloom, aetherfern, solarspike
- Helper: `getSpriteStyle(cropId, stage)` returns CSS for background-image sprite cutout

## Conventions
- Never break existing save/load logic
- All timers update every 50ms (1/20th second)
- Growth speed upgrades apply proportionally to in-progress crops
- All speed/value upgrades are multiplicative and stack
- No hard minimum on grow time or sell interval (allow sub-second decimals)
- Log important events to status panel
- Show banner announcements for major world state changes
