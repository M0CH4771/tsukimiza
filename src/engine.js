// ===== よいまつり横丁 第2章 月見座：ルール =====
// 点は「玉の数」。入賞口に入った玉を数える（×3の入賞口に入った玉は3つ分）。
// 玉は5色（赤・青・緑・黄・紫）。ときどき（1%）虹の玉が出て、どの色としてもあつかう。
// 役物は盤の釘の位置に置く。役物にはそれぞれ色があり、その色の玉が当たると玉がふえる。
// 1つの玉は、同じ役物では1回だけふえる（鯉に飛ばしてもらうのも、玉1つにつき鯉1匹1回）。
// 玉に親子の区別はない。分かれた玉は新しい玉で、下の役物でまたふえる（盤が育つほど、どこまでもふえる）。
// 葉っぱだけは、同じ玉でも当たるたびに分身する（0.3秒おき）。

const W = 360, H = 580;
const BALL_R = 7, NAIL_R = 4, ITEM_R = 9;
const MIN_IMPACT = 40, SHOT_TIMEOUT = 12;   // 当たりは、玉がちゃんとぶつかったとき（速さ40以上）だけ
const POCKET_Y = 516;
const GRAVITY = 760, MAX_V = 720;
const MAX_ALIVE = 60;   // 盤の上に見える玉の数の上限。こえた分は、当たった玉に「＋1こ分」ずつ乗る（数は1つも捨てない）
const COOLDOWN = .3;    // 同じ玉が同じ役物で、続けてふえるまでの間

// 玉の色。5 は虹（どの色にもなる）
const COLORS = [
  { k: 'aka', n: '赤', c: '#e8453c' },
  { k: 'ao', n: '青', c: '#3a8ee8' },
  { k: 'midori', n: '緑', c: '#4cbf5a' },
  { k: 'ki', n: '黄', c: '#f2c94e' },
  { k: 'murasaki', n: '紫', c: '#a35ad8' },
];
const NIJI = 5, ANY = -1, NIJI_RATE = .01;
const colorName = c => c === NIJI ? '虹' : c === ANY ? 'どの色でも' : COLORS[c].n;
const nextColor = c => c === NIJI ? NIJI : (c + 1) % 5;
const colorMatch = (ball, piece) => piece === ANY || ball === NIJI || ball === piece;

// 釘の位置：8段、偶数段は7本、奇数段は6本（ずらして並べる）
const SLOTS = [];
for (let row = 0; row < 8; row++) {
  const n = row % 2 ? 6 : 7;
  for (let col = 0; col < n; col++) {
    SLOTS.push({ row, col, x: (row % 2 ? 55 : 30) + col * 50, y: 112 + row * 50 });
  }
}
// となり（上下左右ななめ）
SLOTS.forEach((s, i) => {
  s.nb = [];
  SLOTS.forEach((t, j) => { if (i !== j && Math.hypot(s.x - t.x, s.y - t.y) < 72) s.nb.push(j); });
});

const POCKETS_START = [1, 2, 1, 3, 1, 2, 1];
const pocketOf = x => Math.max(0, Math.min(6, Math.floor(x / (W / 7))));

// ===== 役物 =====
// any: true なら色を持たない（どの色の玉にも反応する）
// add(o, i, board, s)：ふえる玉の数。to：ふえた玉の色（'same' 同じ色／'next' 次の色／'five' 5色ぜんぶ）
const YAKUMONO = {
  chochin:  { r: 0, n: '赤ちょうちん', s: 'lantern', p: 3, d: 'その色の玉が当たると、3つに分かれる',
    add: () => 2 },
  dango:    { r: 0, n: 'だんご', s: 'dango', p: 3, d: 'その色の玉が当たると1つふえる。となりのだんご1つにつき、さらに1つ',
    add: (o, i, b) => 1 + SLOTS[i].nb.filter(j => b[j] && b[j].k === 'dango').length },
  sakura:   { r: 0, n: '桜', s: 'sakura', p: 3, d: 'その色の玉が当たると3つに分かれ、どれも「次の色」に変わる（赤→青→緑→黄→紫→赤）', to: 'next', recolor: true,
    add: () => 2 },
  suzu:     { r: 0, n: '招きの鈴', s: 'i_bell', p: 4, any: true, d: 'どの色の玉が当たっても、1つふえる',
    add: () => 1 },
  maneki:   { r: 1, n: '招き猫', s: 'cat', p: 6, d: 'その色の玉が当たると、5つに分かれる',
    add: () => 4 },
  koi:      { r: 1, n: '鯉の滝のぼり', s: 'koi', p: 6, d: 'その色の玉が当たると3つに分かれ、ふえた2つは盤のいちばん上まで飛ぶ（玉1つにつき、同じ鯉で飛ぶのは1回）', rocket: true,
    add: () => 2 },
  hanabi:   { r: 1, n: '花火', s: 'firework', p: 6, d: 'その色の玉が当たると2つに分かれ、ふえた玉は虹の玉になる（虹の玉は、どの色の役物でもふえる）', to: 'niji',
    add: () => 1 },
  kingyo:   { r: 1, n: '金魚', s: 'goldfish', p: 5, d: 'その色の玉が当たると1つふえる。当たるたびに育って、3回ごとにふえる数が1つ増える（ずっと）', grow: true,
    add: o => 1 + Math.floor((o.g || 0) / 3) },
  fox:      { r: 1, n: 'おコンの算盤', s: 'fox', p: 6, d: 'その色の玉が当たると、盤にある同じ色の役物の数だけふえる',
    add: (o, i, b) => b.filter(x => x && x.c === o.c).length },
  kaminari: { r: 2, n: '雷', s: 'kaminari', p: 8, any: true, d: 'どの色の玉が当たっても、まわりの役物をぜんぶ発動する（それぞれの役物から玉が出る）', chain: 'row',
    add: () => 0 },
  oni:      { r: 2, n: 'ゴンゾウの金棒', s: 'oni', p: 8, d: 'その色の玉が当たると、10こに分かれる',
    add: () => 9 },
  happa:    { r: 2, n: 'ポン太の葉っぱ', s: 'tanuki', p: 8, any: true, d: 'どの色の玉でも、当たるたびに分身する（同じ玉でも何回でも）', again: true,
    add: () => 1 },
};
const YAKUMONO_KEYS = Object.keys(YAKUMONO);
const RARITY_NAME = ['ふつう', 'めずらしい', 'とくべつ'];
const pieceName = o => YAKUMONO[o.k].any ? YAKUMONO[o.k].n : `${COLORS[o.c].n}の${YAKUMONO[o.k].n.replace(/^赤/, '')}`;

// 1手番ごとに出る3つの候補（夜が進むほど、めずらしい役物が出やすい）。色はここで決まる
function draft(r, night, n = 3) {
  const w = [70, 26 + night * 2, 4 + night * 2];
  const picks = [];
  for (let t = 0; picks.length < n && t < 50; t++) {
    let x = r() * (w[0] + w[1] + w[2]), rr = 0;
    while (x > w[rr]) { x -= w[rr]; rr++; }
    const pool = YAKUMONO_KEYS.filter(k => YAKUMONO[k].r === rr && !picks.some(p => p.k === k));
    if (pool.length) { const k = pool[Math.floor(r() * pool.length)]; picks.push({ k, c: YAKUMONO[k].any ? ANY : Math.floor(r() * 5) }); }
  }
  return picks;
}
function matchPockets(pockets, boss) {
  if (boss && boss.fx === 'pocket1') return pockets.map(m => Math.max(1, m - 1));
  if (boss && boss.fx === 'shime') return pockets.map((m, i) => i === 0 || i === 6 ? 0 : m);
  return pockets.slice();
}
// その勝負で打つ玉：5色を1つずつ（順番はばらばら）＋玉袋の分はランダムな色。どれも1%で虹
function makeHand(r, extra, boss) {
  const h = shuffle([0, 1, 2, 3, 4], r);
  for (let i = 0; i < extra; i++) h.push(Math.floor(r() * 5));
  return h.map(c => {
    if (r() < NIJI_RATE) return NIJI;
    if (boss && boss.fx === 'neon') return r() < .5 ? 1 : 4;   // アオのネオン：青か紫に染まる
    return c;
  });
}

// ===== 真夜中のできごと =====
const BOSSES = [
  { who: 'ponta', n: 'ポン太', rule: '化かし', rd: 'ポン太の葉っぱで、盤の役物が2つ ただの釘に化けてしまう', fx: 'bake' },
  { who: 'ohana', n: 'おハナ', rule: '花冷え', rd: '夜が冷えて、入賞口の倍率がぜんぶ1つ下がる（×1はそのまま）', fx: 'pocket1' },
  { who: 'uzuki', n: 'ウヅキ', rule: '餅つき', rd: 'ぺったんぺったん盤がゆれて、玉が打った位置から大きくずれる', fx: 'shake' },
  { who: 'ao',    n: 'アオ', rule: 'ネオン', rd: 'ネオンの光で、打つ玉がぜんぶ 青か紫 に染まる（虹の玉はそのまま）', fx: 'neon' },
  { who: 'tetsu', n: 'テツ', rule: '締め釘', rd: 'テツが釘を締め直す。いちばん左と右の入賞口に入った玉は数えない', fx: 'shime' },
];
const MINIONS = [];
const NIGHT_BASE = [6, 200, 7000, 22000, 50000];   // ためる縁（玉の数）
const STORY_NIGHTS = 5;
const MATCH_MULT = [1, 1.5, 2];
const MATCH_NAME = ['宵', '夜ふけ', '真夜中'];
const REWARD = [3, 4, 5];
const BASE_BALLS = 5;
const START_BOARD = { 16: { k: 'chochin', c: 0 }, 22: { k: 'suzu', c: ANY }, 30: { k: 'chochin', c: 1 } };

function nightBase(n) {
  if (n <= NIGHT_BASE.length) return NIGHT_BASE[n - 1];
  return Math.round(NIGHT_BASE[NIGHT_BASE.length - 1] * Math.pow(1.6, n - NIGHT_BASE.length) / 100) * 100;
}
function target(n, k) { const v = nightBase(n) * MATCH_MULT[k]; return v < 100 ? Math.round(v) : v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100; }
// 宵・夜ふけは月見座でふつうに打つ。真夜中は、その夜の「できごと」がある
function opponent(n, k) { return k === 2 ? BOSSES[(n - 1) % BOSSES.length] : { n: '月見座', who: 'ginko', plain: true }; }
function newBoard() { const b = SLOTS.map(() => null); for (const [i, o] of Object.entries(START_BOARD)) b[i] = { ...o }; return b; }

// ===== 一発（玉を打ってから、ぜんぶ入賞するまで） =====
// opt: { board, pockets, disabled:Set, block:bool, shake:bool, r:乱数 }
// used：この玉がもうふえた役物。cd：葉っぱで次に分身できる時刻
// w：この玉が何こ分か（ふつうは1。盤がいっぱいのときに重くなる）
function newBall(x, y, vx, vy, color, w) { return { x, y, vx, vy, color, w: w || 1, used: new Set(), cd: {}, alive: true, slow: 0, rocket: false }; }
function newShot(x, opt, color) {
  const r = opt.r;
  const x0 = Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, x + (r() - .5) * (opt.shake ? 130 : 3)));
  return {
    opt, r, t: 0, done: false, color,
    balls: [newBall(x0, 34, (r() - .5) * 20, 40, color)],
    born: 1, overflow: 0, count: 0, landed: [], landedN: 0, events: [],
  };
}
// 役物 i から、玉を n こ出す
function spawn(s, i, n, parent, Y, color) {
  const sl = SLOTS[i];
  const cols = Y.to === 'five' ? [0, 1, 2, 3, 4] : null;
  let alive = s.balls.filter(b => b.alive).length;
  for (let j = 0; j < n; j++) {
    const c = cols ? cols[j % 5] : Y.to === 'niji' ? NIJI : Y.to === 'next' || Y.recolor ? nextColor(color) : color;
    if (alive >= MAX_ALIVE) {   // 盤がいっぱい：新しい玉は出さず、当たった玉が重くなる
      if (parent && parent.alive) parent.w++; else s.overflow++;
      continue;
    }
    alive++;
    const ang = Math.PI * (.15 + .7 * (n === 1 ? .5 : j / (n - 1))) + Math.PI;   // 上むきの扇形に飛び出す
    const sp = 160 + s.r() * 80;
    const nb = newBall(sl.x, sl.y - ITEM_R - BALL_R, Math.cos(ang) * sp, Math.sin(ang) * sp * .6, c);
    nb.used.add(i); nb.cd[i] = s.t + COOLDOWN;   // 生まれた役物では、もうふえない
    if (s.chainSrc != null) nb.used.add(s.chainSrc);   // 雷で出た玉は、その雷ではもう発動しない
    if (Y.rocket) { nb.rocket = true; nb.vy = -Math.sqrt(2 * GRAVITY * Math.max(0, sl.y - 40)); nb.vx = (s.r() - .5) * 90; }
    s.balls.push(nb); s.born++;
  }
}
// 役物 i が玉 ball（色 color）で発動する
function trigger(s, i, ball, color, viaChain, chainFrom) {
  const b = s.opt.board, o = b[i];
  if (!o || s.opt.disabled.has(i)) return;
  const Y = YAKUMONO[o.k];
  if (!colorMatch(color, o.c)) return;
  if (ball) {
    if (Y.again) { if (ball.cd[i] && s.t < ball.cd[i]) return; ball.cd[i] = s.t + COOLDOWN; }
    else { if (ball.used.has(i)) return; ball.used.add(i); }
  }
  if (Y.grow) o.g = (o.g || 0) + 1;
  let n = Y.add(o, i, b, s);
  if (Y.recolor && ball) ball.color = nextColor(ball.color);   // 桜：当たった玉も次の色に
  if (n > 0) spawn(s, i, n, ball || chainFrom, Y, color);
  s.events.push({ type: 'hit', i, k: o.k, x: SLOTS[i].x, y: SLOTS[i].y, n, c: o.c, chain: !!viaChain });
  if (Y.chain === 'row' && !viaChain) {
    s.chainSrc = i;
    SLOTS[i].nb.forEach(j => { if (b[j] && !YAKUMONO[b[j].k].chain) trigger(s, j, null, NIJI, true, ball); });
    s.chainSrc = null;
  }
  if (Y.rocket && n > 0) s.events.push({ type: 'rocket', x: SLOTS[i].x, y: SLOTS[i].y });
}
function collide(ball, cx, cy, R, e, s) {
  const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
  if (d >= R || d === 0) return 0;
  const nx = dx / d, ny = dy / d;
  ball.x = cx + nx * R; ball.y = cy + ny * R;
  const vn = ball.vx * nx + ball.vy * ny;
  const impact = vn < -MIN_IMPACT;
  if (vn < 0) {
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    const j = (s.r() - .5) * 40; ball.vx += -ny * j; ball.vy += nx * j;
  }
  return impact ? 2 : 1;
}
function stepShot(s, dt) {
  s.t += dt;
  const b = s.opt.board;
  for (let bi = 0; bi < s.balls.length; bi++) {
    const ball = s.balls[bi];
    if (!ball.alive) continue;
    ball.vy += GRAVITY * dt;
    if (ball.rocket && ball.vy >= 0) ball.rocket = false;   // いちばん上に着いたら、ふつうに落ちる
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > MAX_V && !ball.rocket) { ball.vx *= MAX_V / sp; ball.vy *= MAX_V / sp; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * .6; }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * .6; }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * .5; }
    if (s.opt.block) collide(ball, W / 2, 300, 30 + BALL_R, .5, s);
    for (let i = 0; !ball.rocket && i < SLOTS.length; i++) {
      const sl = SLOTS[i];
      if (Math.abs(sl.y - ball.y) > 24 || Math.abs(sl.x - ball.x) > 24) continue;
      const item = b[i] && !s.opt.disabled.has(i);
      if (collide(ball, sl.x, sl.y, (item ? ITEM_R : NAIL_R) + BALL_R, .55, s) === 2 && item) trigger(s, i, ball, ball.color);
    }
    // 止まったら、そっと押す
    if (Math.hypot(ball.vx, ball.vy) < 25) { ball.slow += dt; if (ball.slow > .35) { ball.vx = (s.r() - .5) * 160; ball.vy = -60; ball.slow = 0; } } else ball.slow = 0;
    if (ball.y >= POCKET_Y || s.t > SHOT_TIMEOUT) {
      ball.alive = false;
      const p = pocketOf(ball.x), m = s.opt.pockets[p];
      s.landed.push(p); s.landedN += ball.w; s.count += m * ball.w;
      s.events.push({ type: 'pocket', p, m, w: ball.w, x: ball.x, c: ball.color });
    }
  }
  if (s.balls.every(x => !x.alive)) { s.done = true; s.count += s.overflow; }
}
function shotTotal(s) { return s.count + (s.done ? 0 : s.overflow); }
// 最後まで一気に（シミュレーター用）
function runShot(x, opt, color) { const s = newShot(x, opt, color); while (!s.done) stepShot(s, 1 / 120); return s; }

// ===== 乱数 =====
function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.get = () => a; f.set = v => { a = v >>> 0; };   // 続きから遊ぶときに、乱数の続きも戻す
  return f;
}
function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

if (typeof module !== 'undefined') module.exports = {
  W, H, BALL_R, NAIL_R, ITEM_R, POCKET_Y, SLOTS, POCKETS_START, pocketOf, YAKUMONO, YAKUMONO_KEYS, BOSSES, MINIONS,
  COLORS, NIJI, ANY, colorName, colorMatch, nextColor, pieceName, makeHand,
  target, opponent, nightBase, newBoard, draft, matchPockets, RARITY_NAME, newShot, stepShot, runShot, shotTotal, rng, shuffle,
  STORY_NIGHTS, MATCH_NAME, REWARD, BASE_BALLS, MAX_ALIVE,
};
