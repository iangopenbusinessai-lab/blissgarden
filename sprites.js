// =====================================================================
// Bliss Garden crop sprite generator
// 64×64 native pixel art, exported at 128×128 (2x nearest-neighbor)
// 13 crops × 3 stages (seed · sprout · grown)
// =====================================================================

// ---------- Soft-pastel palette ----------
const PAL = {
  // soils & seeds
  soil:        '#8b6a4a',
  soilDk:      '#5e4632',
  seedTan:     '#c9a26b',
  seedTanDk:   '#8a6a3f',
  seedBrown:   '#7a5a3a',
  seedBrownDk: '#4a3520',
  seedPale:    '#e8d8a8',
  seedPaleDk:  '#9a8758',
  // greens (sprouts + leaves)
  leaf:        '#7fb35a',
  leafDk:      '#4a7032',
  leafLt:      '#a8d27a',
  sage:        '#9bc28a',
  sageDk:      '#5e8348',
  // crop hues
  potatoGold:  '#c9a06a', potatoGoldDk:'#7d5a36',
  carrotO:     '#e89858', carrotODk:   '#a45a26',
  wheatY:      '#dec077', wheatYDk:    '#8e6a2a',
  sunYellow:   '#f1cf52', sunYellowDk: '#a17320',
  sunCenter:   '#7a4a26',
  pumpkinO:    '#e07a3a', pumpkinODk:  '#9a3e15',
  chardR:      '#d96a6a', chardG:'#8acd6a', chardP:'#b07ad0', chardY:'#e8c764',
  chardStem:   '#f0e4c0', chardStemDk:'#a8966a',
  moonWhite:   '#f0eada', moonGray:    '#bdbcae', moonShadow:'#7d7c70',
  starY:       '#f5d24a', starYDk:     '#a17a18', starShine:'#fff4b8',
  thornDk:     '#3e6238', thornLt:     '#7aa86a', thornPurp:'#6a3a6a',
  glowCap:     '#e87a8a', glowCapDk:   '#9a3e4e', glowDot:'#fbe8e0',
  glowStem:    '#f0e4d4', glowStemDk:  '#a89a82',
  voidPurp:    '#5a3a78', voidPurpDk:  '#2a1840', voidGlow:'#a878d6',
  aetherC:     '#7ad6c6', aetherCDk:   '#2e7a6a', aetherAccent:'#bfffe8',
  solarO:      '#f5a23a', solarODk:    '#a25218', solarYellow:'#ffe068',
  // utility
  shadow:      'rgba(0,0,0,0.18)',
  highlight:   'rgba(255,255,255,0.32)',
};

// ---------- Pixel helpers ----------
function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x|0, y|0, 1, 1);
}
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x|0, y|0, w|0, h|0);
}
function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x*x + y*y <= r*r + r*0.4) ctx.fillRect((cx + x)|0, (cy + y)|0, 1, 1);
    }
  }
}
function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const d = (x*x)/(rx*rx) + (y*y)/(ry*ry);
      if (d <= 1) ctx.fillRect((cx + x)|0, (cy + y)|0, 1, 1);
    }
  }
}
function ring(ctx, cx, cy, r, color, thickness=1) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x*x + y*y;
      if (d2 <= r*r + r*0.4 && d2 >= (r-thickness)*(r-thickness)) {
        ctx.fillRect((cx + x)|0, (cy + y)|0, 1, 1);
      }
    }
  }
}
function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color;
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  while (true) {
    ctx.fillRect(x|0, y|0, 1, 1);
    if (x === x1 && y === y1) break;
    const e2 = 2*err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 <  dx) { err += dx; y += sy; }
  }
}
function thickLine(ctx, x0, y0, x1, y1, color, thickness=2) {
  ctx.fillStyle = color;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const x = x0 + dx*t, y = y0 + dy*t;
    for (let oy = 0; oy < thickness; oy++)
      for (let ox = 0; ox < thickness; ox++)
        ctx.fillRect((x + ox - (thickness>>1))|0, (y + oy - (thickness>>1))|0, 1, 1);
  }
}

// Auto-outline: for every visible pixel, look at 4 neighbors;
// any neighbor that is empty (alpha==0) gets darkened by `outlineColor`.
function autoOutline(ctx, w, h, outlineColor) {
  if (outlineColor === 'none') return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const orig = new Uint8ClampedArray(d);
  const oc = parseColor(outlineColor);
  function alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return orig[(y*w + x)*4 + 3];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) === 0) {
        if (alphaAt(x-1,y) > 0 || alphaAt(x+1,y) > 0 || alphaAt(x,y-1) > 0 || alphaAt(x,y+1) > 0) {
          const i = (y*w + x)*4;
          d[i]   = oc[0];
          d[i+1] = oc[1];
          d[i+2] = oc[2];
          d[i+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Tone-aware outline: each opaque pixel's outline picks a darkened version of that pixel's own color.
function autoOutlineTonal(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const orig = new Uint8ClampedArray(d);
  function alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return orig[(y*w + x)*4 + 3];
  }
  function colorAt(x, y) {
    const i = (y*w + x)*4;
    return [orig[i], orig[i+1], orig[i+2]];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) === 0) {
        // pick the first opaque neighbor's color, darken it
        let nc = null;
        if (alphaAt(x-1,y) > 0)      nc = colorAt(x-1,y);
        else if (alphaAt(x+1,y) > 0) nc = colorAt(x+1,y);
        else if (alphaAt(x,y-1) > 0) nc = colorAt(x,y-1);
        else if (alphaAt(x,y+1) > 0) nc = colorAt(x,y+1);
        if (nc) {
          const i = (y*w + x)*4;
          d[i]   = (nc[0] * 0.35) | 0;
          d[i+1] = (nc[1] * 0.35) | 0;
          d[i+2] = (nc[2] * 0.35) | 0;
          d[i+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function parseColor(c) {
  if (c[0] === '#') {
    const h = c.slice(1);
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  return [0,0,0];
}

// ---------- Common stage drawings ----------

// Generic seed: oval with two-tone shading. Variants tweak palette + shape.
function drawSeedOval(ctx, opts) {
  const cx = 32, cy = 38;
  const { rx=10, ry=14, body=PAL.seedTan, dark=PAL.seedTanDk, pale=null, mark=null } = opts;
  // shadow on soil
  ellipse(ctx, cx, cy + 10, 13, 3, PAL.shadow);
  // base
  ellipse(ctx, cx, cy, rx, ry, dark);
  ellipse(ctx, cx - 1, cy - 1, rx - 1, ry - 1, body);
  // highlight
  ellipse(ctx, cx - rx*0.4, cy - ry*0.5, Math.max(2, rx*0.35)|0, Math.max(2, ry*0.3)|0, pale || PAL.highlight);
  // crack/seam
  if (mark === 'split') {
    line(ctx, cx, cy - ry + 2, cx, cy + ry - 2, dark);
  } else if (mark === 'spot') {
    px(ctx, cx + 2, cy + 1, dark);
    px(ctx, cx - 3, cy - 2, dark);
  }
}

// Generic sprout: two cotyledon leaves on a small stem rising from soil.
function drawSprout(ctx, opts={}) {
  const { stem=PAL.leafDk, leaf=PAL.leaf, leafLt=PAL.leafLt, height=18, leafSize=6, mound=true } = opts;
  // soil mound
  if (mound) {
    ellipse(ctx, 32, 50, 14, 4, PAL.soilDk);
    ellipse(ctx, 32, 49, 13, 3, PAL.soil);
  }
  // stem
  rect(ctx, 31, 50 - height, 2, height, stem);
  // leaves (left + right)
  const ly = 50 - height + 1;
  ellipse(ctx, 32 - leafSize, ly, leafSize, Math.max(3, leafSize - 2), leaf);
  ellipse(ctx, 32 + leafSize, ly, leafSize, Math.max(3, leafSize - 2), leaf);
  // light highlights
  ellipse(ctx, 32 - leafSize - 1, ly - 1, Math.max(2, (leafSize-2)|0), 2, leafLt);
  ellipse(ctx, 32 + leafSize - 1, ly - 1, Math.max(2, (leafSize-2)|0), 2, leafLt);
  // tiny center bud
  px(ctx, 32, ly - 1, leafLt);
}

// =====================================================================
// CROPS — each is { seed, sprout, grown }
// All draw at 64x64.
// =====================================================================

const CROPS = {

  // -------------------- POTATO --------------------
  potato: {
    name: 'Potato', id: 'potato',
    seed: (ctx) => drawSeedOval(ctx, { rx: 11, ry: 14, body: PAL.seedTan, dark: PAL.seedTanDk, mark: 'spot' }),
    sprout: (ctx) => drawSprout(ctx, { height: 16, leafSize: 6 }),
    grown: (ctx) => {
      // bushy plant on top, potato peeking from soil
      ellipse(ctx, 32, 52, 18, 4, PAL.soilDk);
      ellipse(ctx, 32, 51, 17, 3, PAL.soil);
      // potato (lumpy oval)
      ellipse(ctx, 26, 52, 8, 5, PAL.potatoGoldDk);
      ellipse(ctx, 26, 51, 7, 4, PAL.potatoGold);
      px(ctx, 24, 50, PAL.potatoGoldDk);
      px(ctx, 28, 52, PAL.potatoGoldDk);
      // foliage (clump of leaves)
      ellipse(ctx, 32, 30, 14, 12, PAL.leafDk);
      ellipse(ctx, 28, 28, 7, 6, PAL.leaf);
      ellipse(ctx, 38, 30, 7, 6, PAL.leaf);
      ellipse(ctx, 32, 22, 6, 5, PAL.leaf);
      // highlights
      ellipse(ctx, 28, 26, 3, 2, PAL.leafLt);
      ellipse(ctx, 38, 28, 3, 2, PAL.leafLt);
      // tiny white blossoms
      px(ctx, 26, 22, '#f5e8d8'); px(ctx, 27, 22, '#f5e8d8');
      px(ctx, 38, 24, '#f5e8d8'); px(ctx, 39, 24, '#f5e8d8');
    },
  },

  // -------------------- CARROT --------------------
  carrot: {
    name: 'Carrot', id: 'carrot',
    seed: (ctx) => drawSeedOval(ctx, { rx: 7, ry: 11, body: PAL.seedPale, dark: PAL.seedPaleDk, mark: 'split' }),
    sprout: (ctx) => drawSprout(ctx, { height: 20, leafSize: 5, leaf: PAL.leaf, leafLt: PAL.leafLt }),
    grown: (ctx) => {
      // feathery carrot tops
      ellipse(ctx, 32, 22, 12, 10, PAL.leafDk);
      // wispy fronds
      for (let i = -10; i <= 10; i += 3) {
        thickLine(ctx, 32, 28, 32 + i, 14 + Math.abs(i)*0.3, PAL.leaf, 1);
      }
      ellipse(ctx, 28, 20, 4, 4, PAL.leaf);
      ellipse(ctx, 36, 22, 4, 3, PAL.leaf);
      ellipse(ctx, 32, 16, 4, 3, PAL.leafLt);
      // carrot body (pointing down, peeking from soil)
      ellipse(ctx, 32, 50, 16, 4, PAL.soilDk);
      ellipse(ctx, 32, 49, 15, 3, PAL.soil);
      // body
      ctx.fillStyle = PAL.carrotODk;
      // triangle-ish
      for (let y = 32; y < 56; y++) {
        const w = Math.max(1, ((56 - y) * 0.6) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      ctx.fillStyle = PAL.carrotO;
      for (let y = 33; y < 54; y++) {
        const w = Math.max(0, ((54 - y) * 0.55) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      // ridges
      for (let y = 36; y < 52; y += 3) {
        rect(ctx, 32 - 3, y, 6, 1, PAL.carrotODk);
      }
    },
  },

  // -------------------- WHEAT --------------------
  wheat: {
    name: 'Wheat', id: 'wheat',
    seed: (ctx) => {
      // a single wheat grain — elongated tan kernel
      ellipse(ctx, 32, 38, 4, 9, PAL.seedTanDk);
      ellipse(ctx, 32, 38, 3, 8, PAL.seedTan);
      ellipse(ctx, 31, 35, 1, 3, PAL.seedPale);
      // little bristle
      line(ctx, 32, 28, 32, 24, PAL.seedTanDk);
      ellipse(ctx, 32, 48, 7, 2, PAL.shadow);
    },
    sprout: (ctx) => {
      // grass-like blades
      ellipse(ctx, 32, 50, 14, 4, PAL.soilDk);
      ellipse(ctx, 32, 49, 13, 3, PAL.soil);
      thickLine(ctx, 32, 48, 30, 30, PAL.leaf, 1);
      thickLine(ctx, 32, 48, 34, 28, PAL.leaf, 1);
      thickLine(ctx, 32, 48, 32, 26, PAL.leafLt, 1);
      thickLine(ctx, 32, 48, 28, 34, PAL.leafLt, 1);
      thickLine(ctx, 32, 48, 36, 32, PAL.leafLt, 1);
    },
    grown: (ctx) => {
      // 3 wheat stalks bundled, golden heads
      ellipse(ctx, 32, 54, 14, 3, PAL.soilDk);
      // stalks
      thickLine(ctx, 28, 54, 26, 22, PAL.wheatYDk, 1);
      thickLine(ctx, 32, 54, 32, 16, PAL.wheatYDk, 1);
      thickLine(ctx, 36, 54, 38, 22, PAL.wheatYDk, 1);
      // heads — clusters of grains
      function head(cx, cy) {
        ellipse(ctx, cx, cy, 3, 7, PAL.wheatYDk);
        ellipse(ctx, cx, cy, 2, 6, PAL.wheatY);
        // grain divisions
        for (let y = -5; y <= 5; y += 2) {
          px(ctx, cx - 1, cy + y, PAL.wheatYDk);
          px(ctx, cx + 1, cy + y, PAL.wheatYDk);
        }
        // top awn
        line(ctx, cx, cy - 8, cx, cy - 11, PAL.wheatYDk);
        line(ctx, cx - 1, cy - 7, cx - 3, cy - 10, PAL.wheatYDk);
        line(ctx, cx + 1, cy - 7, cx + 3, cy - 10, PAL.wheatYDk);
      }
      head(26, 26);
      head(32, 22);
      head(38, 26);
      // highlight
      px(ctx, 32, 20, '#fff1c8');
      px(ctx, 27, 24, '#fff1c8');
      px(ctx, 38, 24, '#fff1c8');
    },
  },

  // -------------------- SUNFLOWER --------------------
  sunflower: {
    name: 'Sunflower', id: 'sunflower',
    seed: (ctx) => {
      // striped sunflower seed (teardrop)
      ellipse(ctx, 32, 38, 7, 11, '#3a2c1c');
      ellipse(ctx, 32, 38, 6, 10, '#5e4630');
      // stripes
      for (let y = 30; y <= 46; y += 2) px(ctx, 32, y, '#1f1408');
      for (let y = 31; y <= 45; y += 2) px(ctx, 30, y, '#1f1408');
      for (let y = 31; y <= 45; y += 2) px(ctx, 34, y, '#1f1408');
      px(ctx, 30, 32, '#a89274');
      ellipse(ctx, 32, 50, 9, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 22, leafSize: 7, leaf: PAL.leaf, leafLt: PAL.leafLt }),
    grown: (ctx) => {
      // tall stem + big sunflower head
      ellipse(ctx, 32, 56, 14, 3, PAL.soilDk);
      thickLine(ctx, 32, 56, 32, 30, PAL.leafDk, 2);
      // leaves on stem
      ellipse(ctx, 26, 42, 5, 3, PAL.leaf);
      ellipse(ctx, 38, 38, 5, 3, PAL.leaf);
      px(ctx, 24, 41, PAL.leafLt);
      px(ctx, 40, 37, PAL.leafLt);
      // flower head
      const cx = 32, cy = 22;
      // petals (around center)
      const petals = 12;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const px1 = cx + Math.cos(a) * 11;
        const py1 = cy + Math.sin(a) * 11;
        ellipse(ctx, px1, py1, 4, 3, PAL.sunYellowDk);
      }
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const px1 = cx + Math.cos(a) * 10;
        const py1 = cy + Math.sin(a) * 10;
        ellipse(ctx, px1, py1, 3, 2, PAL.sunYellow);
      }
      // disc
      circle(ctx, cx, cy, 6, PAL.sunCenter);
      circle(ctx, cx, cy, 5, '#5a3818');
      // seed pattern
      for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) {
        if (xx*xx + yy*yy <= 16 && (xx + yy) % 2 === 0) px(ctx, cx + xx, cy + yy, '#7a4a26');
      }
    },
  },

  // -------------------- PUMPKIN --------------------
  pumpkin: {
    name: 'Pumpkin', id: 'pumpkin',
    seed: (ctx) => {
      // flat teardrop pumpkin seed
      ellipse(ctx, 32, 38, 8, 11, '#c8b078');
      ellipse(ctx, 32, 39, 7, 10, '#e8d8a8');
      ellipse(ctx, 32, 36, 4, 5, '#fff4d8');
      // tip
      px(ctx, 32, 28, '#a8956a'); px(ctx, 32, 27, '#a8956a');
      ellipse(ctx, 32, 50, 9, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 18, leafSize: 8, leaf: PAL.leaf, leafLt: PAL.leafLt }),
    grown: (ctx) => {
      // big round pumpkin with ribs
      ellipse(ctx, 32, 56, 18, 3, PAL.soilDk);
      // body
      ellipse(ctx, 32, 40, 18, 14, PAL.pumpkinODk);
      ellipse(ctx, 32, 40, 17, 13, PAL.pumpkinO);
      // ribs (vertical lighter/darker bands)
      for (let dx = -12; dx <= 12; dx += 6) {
        ellipse(ctx, 32 + dx, 40, 2, 12, PAL.pumpkinODk);
      }
      // highlight
      ellipse(ctx, 26, 36, 3, 4, '#f5b878');
      // stem
      rect(ctx, 31, 24, 3, 5, PAL.leafDk);
      rect(ctx, 30, 26, 5, 2, PAL.leafDk);
      // curl
      px(ctx, 36, 24, PAL.leaf); px(ctx, 37, 23, PAL.leaf); px(ctx, 38, 24, PAL.leaf);
      // leaf
      ellipse(ctx, 24, 26, 4, 3, PAL.leaf);
      px(ctx, 22, 25, PAL.leafLt);
    },
  },

  // -------------------- RAINBOW CHARD --------------------
  chard: {
    name: 'Rainbow Chard', id: 'chard',
    seed: (ctx) => {
      // small bumpy clustered seed
      ellipse(ctx, 32, 38, 8, 8, PAL.seedBrownDk);
      ellipse(ctx, 32, 38, 7, 7, PAL.seedBrown);
      // bumps
      circle(ctx, 29, 36, 2, PAL.seedTan);
      circle(ctx, 35, 37, 2, PAL.seedTan);
      circle(ctx, 32, 41, 2, PAL.seedTan);
      px(ctx, 29, 35, PAL.seedPale);
      ellipse(ctx, 32, 48, 8, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 18, leafSize: 6, stem: PAL.chardR, leaf: PAL.leaf, leafLt: PAL.leafLt }),
    grown: (ctx) => {
      // a tuft of chard with multicolored stems
      ellipse(ctx, 32, 56, 14, 3, PAL.soilDk);
      // stems
      const stems = [
        { x: 28, color: PAL.chardR },
        { x: 32, color: PAL.chardY },
        { x: 36, color: PAL.chardP },
        { x: 30, color: PAL.chardG },
        { x: 34, color: PAL.chardR },
      ];
      stems.forEach(s => thickLine(ctx, s.x, 54, s.x, 30, s.color, 1));
      // big crinkled leaves on top
      ellipse(ctx, 26, 28, 7, 6, PAL.leafDk);
      ellipse(ctx, 26, 27, 6, 5, PAL.leaf);
      ellipse(ctx, 38, 26, 7, 6, PAL.leafDk);
      ellipse(ctx, 38, 25, 6, 5, PAL.leaf);
      ellipse(ctx, 32, 22, 7, 5, PAL.leafDk);
      ellipse(ctx, 32, 21, 6, 4, PAL.leaf);
      // veins (matching stem colors)
      thickLine(ctx, 26, 28, 26, 30, PAL.chardR, 1);
      thickLine(ctx, 38, 26, 38, 30, PAL.chardP, 1);
      thickLine(ctx, 32, 22, 32, 30, PAL.chardY, 1);
      // hi-lights
      px(ctx, 24, 26, PAL.leafLt);
      px(ctx, 36, 24, PAL.leafLt);
      px(ctx, 30, 20, PAL.leafLt);
    },
  },

  // -------------------- MOONBLOOM --------------------
  moonbloom: {
    name: 'Moonbloom', id: 'moonbloom',
    seed: (ctx) => {
      // dark crescent seed
      ellipse(ctx, 32, 38, 10, 10, '#2a2438');
      ellipse(ctx, 33, 37, 9, 9, '#3a3450');
      // crescent cut
      ellipse(ctx, 36, 36, 6, 6, '#0e0a18');
      // tiny stars
      px(ctx, 28, 32, PAL.moonWhite);
      px(ctx, 26, 40, PAL.moonWhite);
      px(ctx, 34, 44, PAL.moonGray);
      ellipse(ctx, 32, 50, 10, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 20, leafSize: 6, stem: '#5a4a78', leaf: '#9a86c8', leafLt: '#cdb4ff' }),
    grown: (ctx) => {
      // night-blooming flower — pale moon-disc bloom
      ellipse(ctx, 32, 56, 12, 3, PAL.soilDk);
      thickLine(ctx, 32, 56, 32, 32, '#5a4a78', 1);
      // dark leaves
      ellipse(ctx, 26, 44, 4, 3, '#3e3458');
      ellipse(ctx, 38, 40, 4, 3, '#3e3458');
      px(ctx, 24, 43, '#5a4a78');
      px(ctx, 40, 39, '#5a4a78');
      // moon-petal flower
      const cx = 32, cy = 24;
      // back petals (5)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI/2;
        const px1 = cx + Math.cos(a) * 8;
        const py1 = cy + Math.sin(a) * 8;
        ellipse(ctx, px1, py1, 4, 4, PAL.moonShadow);
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI/2;
        const px1 = cx + Math.cos(a) * 7;
        const py1 = cy + Math.sin(a) * 7;
        ellipse(ctx, px1, py1, 3, 3, PAL.moonGray);
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI/2;
        const px1 = cx + Math.cos(a) * 6;
        const py1 = cy + Math.sin(a) * 6;
        ellipse(ctx, px1, py1, 2, 2, PAL.moonWhite);
      }
      // disc
      circle(ctx, cx, cy, 4, PAL.moonWhite);
      circle(ctx, cx, cy, 3, '#fff8e8');
      // sparkle
      px(ctx, cx - 1, cy - 1, '#ffffff');
      px(ctx, cx + 5, cy - 5, '#ffffff');
      px(ctx, cx - 6, cy + 4, PAL.moonWhite);
    },
  },

  // -------------------- STARFRUIT --------------------
  starfruit: {
    name: 'Starfruit', id: 'starfruit',
    seed: (ctx) => {
      // glittering seed — small star inside a shell
      ellipse(ctx, 32, 38, 9, 11, '#3e2a5a');
      ellipse(ctx, 32, 38, 8, 10, '#5e4a8a');
      // little star
      const cx = 32, cy = 38;
      const pts = 5;
      ctx.fillStyle = PAL.starY;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2 - Math.PI/2;
        const x = cx + Math.cos(a) * 4;
        const y = cy + Math.sin(a) * 4;
        ctx.fillRect(x|0, y|0, 1, 1);
        const a2 = a + Math.PI/pts;
        const x2 = cx + Math.cos(a2) * 2;
        const y2 = cy + Math.sin(a2) * 2;
        ctx.fillRect(x2|0, y2|0, 1, 1);
      }
      px(ctx, cx, cy, PAL.starShine);
      px(ctx, cx-1, cy, PAL.starY); px(ctx, cx+1, cy, PAL.starY);
      px(ctx, cx, cy-1, PAL.starY); px(ctx, cx, cy+1, PAL.starY);
      ellipse(ctx, 32, 50, 9, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 18, leafSize: 6, stem: PAL.leafDk, leaf: PAL.leaf, leafLt: '#dff0a8' }),
    grown: (ctx) => {
      // a plant with a big star bloom
      ellipse(ctx, 32, 56, 12, 3, PAL.soilDk);
      thickLine(ctx, 32, 56, 32, 30, PAL.leafDk, 1);
      ellipse(ctx, 26, 44, 4, 3, PAL.leaf);
      ellipse(ctx, 38, 40, 4, 3, PAL.leaf);
      // star
      const cx = 32, cy = 22;
      function star5(r1, r2, color) {
        ctx.fillStyle = color;
        const pts = 10;
        for (let yy = -r1-1; yy <= r1+1; yy++) {
          for (let xx = -r1-1; xx <= r1+1; xx++) {
            // build a star by union of two triangles approximated by 5 segments
          }
        }
        // simple raster: draw rays
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI/2;
          for (let t = 0; t <= r1; t++) {
            const x = cx + Math.cos(a) * t;
            const y = cy + Math.sin(a) * t;
            ctx.fillRect(x|0, y|0, 2, 2);
          }
          // inner
          const a2 = a + Math.PI/5;
          for (let t = 0; t <= r2; t++) {
            const x = cx + Math.cos(a2) * t;
            const y = cy + Math.sin(a2) * t;
            ctx.fillRect(x|0, y|0, 2, 2);
          }
        }
      }
      star5(10, 5, PAL.starYDk);
      star5(9, 4, PAL.starY);
      // center highlight
      circle(ctx, cx, cy, 3, PAL.starShine);
      // sparkles
      px(ctx, cx + 12, cy - 6, PAL.starShine);
      px(ctx, cx - 14, cy + 4, PAL.starShine);
      px(ctx, cx + 8, cy + 12, PAL.starShine);
    },
  },

  // -------------------- THORNVINE --------------------
  thornvine: {
    name: 'Thornvine', id: 'thornvine',
    seed: (ctx) => {
      // spiky pod seed
      ellipse(ctx, 32, 38, 8, 11, PAL.thornDk);
      ellipse(ctx, 32, 38, 7, 10, '#5a8050');
      // spikes
      const spikes = [[32,26],[26,32],[38,32],[26,44],[38,44],[32,50]];
      spikes.forEach(([x,y])=>{
        const dx = (x-32)/Math.hypot(x-32,y-38)*4;
        const dy = (y-38)/Math.hypot(x-32,y-38)*4;
        line(ctx, x, y, (x+dx)|0, (y+dy)|0, PAL.thornDk);
        px(ctx, (x+dx)|0, (y+dy)|0, '#1f3018');
      });
      px(ctx, 30, 36, '#a8d088');
      ellipse(ctx, 32, 52, 9, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 18, leafSize: 6, stem: PAL.thornDk, leaf: '#5a8050', leafLt: '#88b076' }),
    grown: (ctx) => {
      // twisted vine with thorns and a small purple bloom
      ellipse(ctx, 32, 56, 13, 3, PAL.soilDk);
      // wavy stem
      const stemPath = [];
      for (let y = 56; y >= 16; y -= 2) {
        const x = 32 + Math.sin((56 - y) / 5) * 5;
        stemPath.push([x|0, y]);
      }
      stemPath.forEach(([x,y]) => rect(ctx, x-1, y, 2, 2, PAL.thornDk));
      stemPath.forEach(([x,y]) => px(ctx, x, y, PAL.thornLt));
      // thorns
      stemPath.forEach(([x,y], i) => {
        if (i % 3 === 0) {
          const dir = i % 6 === 0 ? -1 : 1;
          line(ctx, x, y, x + 3*dir, y - 2, PAL.thornDk);
        }
      });
      // leaves
      ellipse(ctx, 24, 38, 4, 2, PAL.thornDk);
      ellipse(ctx, 40, 30, 4, 2, PAL.thornDk);
      ellipse(ctx, 24, 38, 3, 1, PAL.thornLt);
      ellipse(ctx, 40, 30, 3, 1, PAL.thornLt);
      // top bloom
      const cx = stemPath[stemPath.length-1][0], cy = stemPath[stemPath.length-1][1] - 2;
      circle(ctx, cx, cy, 4, PAL.thornPurp);
      circle(ctx, cx, cy, 3, '#9a5aaa');
      px(ctx, cx, cy, '#fbe0ff');
      // sharp bracts
      px(ctx, cx-4, cy-2, PAL.thornDk);
      px(ctx, cx+4, cy-2, PAL.thornDk);
      px(ctx, cx-3, cy+3, PAL.thornDk);
      px(ctx, cx+3, cy+3, PAL.thornDk);
    },
  },

  // -------------------- GLOWSHROOM --------------------
  glowshroom: {
    name: 'Glowshroom', id: 'glowshroom',
    seed: (ctx) => {
      // spore pod — round with glowing dots
      ellipse(ctx, 32, 38, 10, 10, '#6a4a5a');
      ellipse(ctx, 32, 37, 9, 9, '#9a5e6e');
      // glowing spore dots
      px(ctx, 28, 34, PAL.glowDot); px(ctx, 29, 34, PAL.glowDot);
      px(ctx, 35, 36, PAL.glowDot); px(ctx, 35, 37, PAL.glowDot);
      px(ctx, 30, 41, PAL.glowDot); px(ctx, 31, 41, PAL.glowDot);
      px(ctx, 36, 42, PAL.glowDot);
      // soft halo
      ellipse(ctx, 32, 38, 12, 12, 'rgba(255,200,210,0.12)');
      ellipse(ctx, 32, 50, 10, 2, PAL.shadow);
    },
    sprout: (ctx) => {
      // tiny mushroom poking up
      ellipse(ctx, 32, 50, 14, 4, PAL.soilDk);
      ellipse(ctx, 32, 49, 13, 3, PAL.soil);
      rect(ctx, 31, 38, 2, 12, PAL.glowStemDk);
      rect(ctx, 30, 39, 1, 10, PAL.glowStem);
      ellipse(ctx, 32, 36, 6, 4, PAL.glowCapDk);
      ellipse(ctx, 32, 35, 5, 3, PAL.glowCap);
      px(ctx, 30, 34, PAL.glowDot);
      px(ctx, 33, 36, PAL.glowDot);
    },
    grown: (ctx) => {
      // cluster of glowshrooms
      ellipse(ctx, 32, 56, 16, 3, PAL.soilDk);
      ellipse(ctx, 32, 55, 15, 2, PAL.soil);
      // back small mushroom
      rect(ctx, 22, 38, 2, 12, PAL.glowStemDk);
      ellipse(ctx, 23, 36, 6, 4, PAL.glowCapDk);
      ellipse(ctx, 23, 35, 5, 3, PAL.glowCap);
      px(ctx, 22, 34, PAL.glowDot); px(ctx, 25, 36, PAL.glowDot);
      // big front mushroom
      rect(ctx, 31, 30, 4, 24, PAL.glowStemDk);
      rect(ctx, 32, 31, 2, 22, PAL.glowStem);
      ellipse(ctx, 33, 26, 12, 8, PAL.glowCapDk);
      ellipse(ctx, 33, 25, 11, 7, PAL.glowCap);
      // glowing dots on cap
      px(ctx, 28, 24, PAL.glowDot); px(ctx, 29, 24, PAL.glowDot);
      px(ctx, 36, 23, PAL.glowDot); px(ctx, 37, 23, PAL.glowDot);
      px(ctx, 33, 27, PAL.glowDot);
      px(ctx, 30, 29, PAL.glowDot); px(ctx, 38, 28, PAL.glowDot);
      // side small mushroom
      rect(ctx, 41, 42, 2, 10, PAL.glowStemDk);
      ellipse(ctx, 42, 40, 5, 3, PAL.glowCapDk);
      ellipse(ctx, 42, 39, 4, 2, PAL.glowCap);
      px(ctx, 41, 39, PAL.glowDot);
      // halo
      ellipse(ctx, 33, 26, 14, 10, 'rgba(255,200,210,0.10)');
    },
  },

  // -------------------- VOIDBLOOM --------------------
  voidbloom: {
    name: 'Voidbloom', id: 'voidbloom',
    seed: (ctx) => {
      // dark gem-like seed
      ellipse(ctx, 32, 38, 9, 11, PAL.voidPurpDk);
      ellipse(ctx, 32, 38, 8, 10, PAL.voidPurp);
      // facets
      line(ctx, 32, 28, 26, 38, '#7a4ca8');
      line(ctx, 32, 28, 38, 38, '#7a4ca8');
      line(ctx, 26, 38, 32, 48, '#3a1f60');
      line(ctx, 38, 38, 32, 48, '#3a1f60');
      // glow
      px(ctx, 30, 34, PAL.voidGlow);
      px(ctx, 32, 32, PAL.voidGlow);
      ellipse(ctx, 32, 50, 10, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 20, leafSize: 6, stem: PAL.voidPurpDk, leaf: PAL.voidPurp, leafLt: PAL.voidGlow }),
    grown: (ctx) => {
      // dark flower with cosmic core
      ellipse(ctx, 32, 56, 12, 3, PAL.soilDk);
      thickLine(ctx, 32, 56, 32, 32, PAL.voidPurpDk, 1);
      ellipse(ctx, 26, 44, 4, 3, PAL.voidPurpDk);
      ellipse(ctx, 38, 40, 4, 3, PAL.voidPurpDk);
      px(ctx, 24, 43, PAL.voidPurp); px(ctx, 40, 39, PAL.voidPurp);
      // 6 deep-purple petals
      const cx = 32, cy = 22;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI/2;
        const px1 = cx + Math.cos(a) * 9;
        const py1 = cy + Math.sin(a) * 9;
        ellipse(ctx, px1, py1, 4, 5, PAL.voidPurpDk);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI/2;
        const px1 = cx + Math.cos(a) * 8;
        const py1 = cy + Math.sin(a) * 8;
        ellipse(ctx, px1, py1, 3, 4, PAL.voidPurp);
      }
      // glow center (black hole)
      circle(ctx, cx, cy, 5, '#0a0418');
      ring(ctx, cx, cy, 6, PAL.voidGlow, 1);
      ring(ctx, cx, cy, 8, 'rgba(168,120,214,0.4)', 1);
      // stars
      px(ctx, cx - 2, cy - 1, PAL.voidGlow);
      px(ctx, cx + 1, cy + 2, PAL.moonWhite);
      px(ctx, cx + 12, cy - 8, PAL.moonWhite);
      px(ctx, cx - 12, cy + 6, PAL.voidGlow);
    },
  },

  // -------------------- AETHERFERN --------------------
  aetherfern: {
    name: 'Aetherfern', id: 'aetherfern',
    seed: (ctx) => {
      // swirly cyan seed
      ellipse(ctx, 32, 38, 10, 11, PAL.aetherCDk);
      ellipse(ctx, 32, 38, 9, 10, PAL.aetherC);
      // spiral
      const cx = 32, cy = 38;
      const sp = [
        [cx, cy], [cx-1, cy], [cx-1, cy-1], [cx, cy-1],
        [cx+1, cy-1], [cx+2, cy], [cx+2, cy+1], [cx+1, cy+2],
        [cx-1, cy+2], [cx-3, cy+1], [cx-4, cy-1], [cx-3, cy-3],
      ];
      sp.forEach(([x,y]) => px(ctx, x, y, PAL.aetherAccent));
      // halo
      ellipse(ctx, 32, 38, 12, 12, 'rgba(122,214,198,0.18)');
      ellipse(ctx, 32, 50, 10, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 16, leafSize: 5, stem: PAL.aetherCDk, leaf: PAL.aetherC, leafLt: PAL.aetherAccent }),
    grown: (ctx) => {
      // a coiled fern frond, ethereal cyan
      ellipse(ctx, 32, 56, 12, 3, PAL.soilDk);
      // central frond stem
      thickLine(ctx, 32, 56, 32, 28, PAL.aetherCDk, 1);
      // pinnae (left/right small leaflets)
      for (let y = 50; y >= 28; y -= 4) {
        const len = 7 - (50 - y) * 0.18;
        thickLine(ctx, 32, y, 32 - len, y - 2, PAL.aetherCDk, 1);
        thickLine(ctx, 32, y, 32 + len, y - 2, PAL.aetherCDk, 1);
        thickLine(ctx, 32, y, 32 - len + 1, y - 2, PAL.aetherC, 1);
        thickLine(ctx, 32, y, 32 + len - 1, y - 2, PAL.aetherC, 1);
      }
      // top spiral (fiddlehead)
      const cx = 32, cy = 24;
      const spiral = [
        [cx,cy],[cx-1,cy],[cx-2,cy],[cx-2,cy+1],[cx-2,cy+2],[cx-1,cy+3],
        [cx,cy+3],[cx+1,cy+3],[cx+2,cy+2],[cx+3,cy+1],[cx+3,cy],[cx+3,cy-1],
        [cx+2,cy-2],[cx+1,cy-3],[cx,cy-3],[cx-1,cy-3],[cx-2,cy-3],[cx-3,cy-2],
        [cx-4,cy-1],[cx-4,cy],[cx-4,cy+1],[cx-4,cy+2],[cx-3,cy+3],
      ];
      spiral.forEach(([x,y])=>px(ctx,x,y,PAL.aetherCDk));
      // inner accent
      const inner = [[cx,cy-1],[cx+1,cy-1],[cx+1,cy],[cx,cy+1],[cx-1,cy+1],[cx-1,cy]];
      inner.forEach(([x,y])=>px(ctx,x,y,PAL.aetherC));
      px(ctx, cx, cy, PAL.aetherAccent);
      // sparkles
      px(ctx, 22, 36, PAL.aetherAccent);
      px(ctx, 42, 32, PAL.aetherAccent);
      px(ctx, 38, 48, PAL.aetherAccent);
    },
  },

  // -------------------- SOLARSPIKE --------------------
  solarspike: {
    name: 'Solarspike', id: 'solarspike',
    seed: (ctx) => {
      // burning seed — orange with yellow core
      ellipse(ctx, 32, 38, 9, 11, PAL.solarODk);
      ellipse(ctx, 32, 38, 8, 10, PAL.solarO);
      ellipse(ctx, 32, 38, 5, 7, PAL.solarYellow);
      ellipse(ctx, 32, 36, 2, 3, '#fff4d8');
      // flame tip
      px(ctx, 32, 27, PAL.solarYellow);
      px(ctx, 32, 26, '#fff4d8');
      px(ctx, 31, 28, PAL.solarO);
      px(ctx, 33, 28, PAL.solarO);
      // ember sparks
      px(ctx, 26, 30, PAL.solarYellow);
      px(ctx, 38, 32, PAL.solarYellow);
      ellipse(ctx, 32, 50, 10, 2, PAL.shadow);
    },
    sprout: (ctx) => drawSprout(ctx, { height: 18, leafSize: 5, stem: PAL.solarODk, leaf: PAL.solarO, leafLt: PAL.solarYellow }),
    grown: (ctx) => {
      // spike of fire — sharp upward flame plant
      ellipse(ctx, 32, 56, 12, 3, PAL.soilDk);
      thickLine(ctx, 32, 56, 32, 36, PAL.solarODk, 2);
      // base leaves
      ellipse(ctx, 26, 46, 5, 3, PAL.solarODk);
      ellipse(ctx, 38, 42, 5, 3, PAL.solarODk);
      ellipse(ctx, 26, 46, 4, 2, PAL.solarO);
      ellipse(ctx, 38, 42, 4, 2, PAL.solarO);
      // big flame spike (triangle layered)
      ctx.fillStyle = PAL.solarODk;
      for (let y = 36; y >= 14; y--) {
        const w = Math.max(1, ((y - 14) * 0.5) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      ctx.fillStyle = PAL.solarO;
      for (let y = 36; y >= 16; y--) {
        const w = Math.max(0, ((y - 16) * 0.45) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      ctx.fillStyle = PAL.solarYellow;
      for (let y = 32; y >= 18; y--) {
        const w = Math.max(0, ((y - 18) * 0.32) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      ctx.fillStyle = '#fff4d8';
      for (let y = 26; y >= 20; y--) {
        const w = Math.max(0, ((y - 20) * 0.2) | 0);
        ctx.fillRect(32 - w, y, w*2, 1);
      }
      // top pixel
      px(ctx, 32, 14, '#ffffff');
      // ember sparks around
      px(ctx, 22, 30, PAL.solarYellow);
      px(ctx, 42, 26, PAL.solarYellow);
      px(ctx, 38, 34, '#fff4d8');
    },
  },
};

// -------------------- ORDER & RENDERING --------------------
const CROP_ORDER = [
  'potato','carrot','wheat','sunflower',
  'pumpkin','chard','moonbloom',
  'starfruit','thornvine','glowshroom',
  'voidbloom','aetherfern','solarspike'
];

const STAGES = ['seed','sprout','grown'];
const STAGE_LABELS = { seed:'Seed', sprout:'Sprout', grown:'Grown' };

let outlineMode = 'tone';
let nativeSize = 64;

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  c.className = 'sprite';
  c.style.width = '128px';
  c.style.height = '128px';
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function drawCropStage(ctx, crop, stage, size) {
  // Scale all our 64-grid drawing functions if size is different
  ctx.save();
  if (size !== 64) {
    ctx.scale(size / 64, size / 64);
    ctx.imageSmoothingEnabled = false;
  }
  CROPS[crop][stage](ctx);
  ctx.restore();
  // Outline pass over the whole canvas
  if (outlineMode === 'black') autoOutline(ctx, size, size, '#1a1212');
  else if (outlineMode === 'tone') autoOutlineTonal(ctx, size, size);
}

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  // header row
  const h0 = document.createElement('div'); h0.className = 'hdr'; h0.textContent = 'Crop'; grid.appendChild(h0);
  STAGES.forEach(s => {
    const h = document.createElement('div'); h.className = 'hdr'; h.textContent = STAGE_LABELS[s]; grid.appendChild(h);
  });
  // crop rows
  CROP_ORDER.forEach(id => {
    const crop = CROPS[id];
    const nm = document.createElement('div'); nm.className = 'row-name';
    nm.innerHTML = `<div class="nm">${crop.name}</div><div class="id">${crop.id}</div>`;
    grid.appendChild(nm);
    STAGES.forEach(stage => {
      const cell = document.createElement('div'); cell.className = 'cell';
      const { c, ctx } = makeCanvas(nativeSize);
      drawCropStage(ctx, id, stage, nativeSize);
      cell.appendChild(c);
      grid.appendChild(cell);
    });
  });
}

function buildSheet() {
  const cells = nativeSize; // each sprite is `nativeSize`px
  const cols = STAGES.length;          // 3
  const rows = CROP_ORDER.length;      // 13
  const w = cols * cells;
  const h = rows * cells;
  const sheet = document.getElementById('sheet');
  sheet.width = w;
  sheet.height = h;
  sheet.style.width = (w * 2) + 'px';
  sheet.style.height = (h * 2) + 'px';
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  CROP_ORDER.forEach((id, ri) => {
    STAGES.forEach((stage, ci) => {
      // draw onto an offscreen of native size, then place
      const off = document.createElement('canvas');
      off.width = cells; off.height = cells;
      const octx = off.getContext('2d');
      octx.imageSmoothingEnabled = false;
      drawCropStage(octx, id, stage, cells);
      ctx.drawImage(off, ci * cells, ri * cells);
    });
  });

  document.getElementById('sheet-info').innerHTML =
    `<strong>${w} × ${h} px</strong> · ${cols} columns (${STAGES.map(s=>STAGE_LABELS[s]).join(' · ')}) × ${rows} rows<br>
     Cell size: <strong>${cells} × ${cells} px</strong><br>
     Row order: ${CROP_ORDER.join(' → ')}`;
}

function downloadSheet() {
  const sheet = document.getElementById('sheet');
  sheet.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bliss-garden-crops-${nativeSize}px.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function rebuild() {
  buildGrid();
  buildSheet();
}

// init
document.getElementById('btn-sheet').addEventListener('click', downloadSheet);
document.getElementById('btn-redraw').addEventListener('click', rebuild);
document.getElementById('opt-outline').addEventListener('change', (e) => {
  outlineMode = e.target.value;
  rebuild();
});
document.getElementById('opt-cellsize').addEventListener('change', (e) => {
  nativeSize = parseInt(e.target.value, 10);
  rebuild();
});
rebuild();
