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
const COOLDOWN = .3;    // 生まれた玉が、生まれた役物にすぐ当たらないための間
const AGAIN_GAP = .5;   // 葉っぱ：同じ玉が続けて分身するまでの間
const DROP_GAP = .18;   // 手玉を全部落とすときの、1つずつの間

// 玉の色。5 は虹（どの色にもなる）
const COLORS = [
  { k: 'aka', n: '赤', c: '#e8453c' },
  { k: 'ao', n: '青', c: '#3a8ee8' },
  { k: 'ki', n: '黄', c: '#f2c94e' },
];
const NC = COLORS.length;
const NIJI = 3, ANY = -1, NIJI_RATE = .01;   // 3 は虹（どの色にもなる）
const colorName = c => c === NIJI ? '虹' : c === ANY ? 'どの色でも' : COLORS[c].n;
const nextColor = c => c === NIJI ? NIJI : (c + 1) % NC;
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
  // ── ふつう：玉をふやす・色をあやつる・縁銭 ──
  chochin:  { r: 0, n: '赤ちょうちん', s: 'lantern', p: 3, d: 'その色の玉が当たると、2つに分かれる',
    add: () => 1 },
  dango:    { r: 0, n: 'だんご', s: 'dango', p: 3, d: 'その色の玉が当たると、まわりのだんご1つにつき1つふえる（ひとつだけだと ふえない）',
    add: (o, i, b) => SLOTS[i].nb.filter(j => b[j] && b[j].k === 'dango').length },
  sakura:   { r: 0, n: '桜', s: 'sakura', p: 3, d: 'その色の玉が当たると2つに分かれ、ふえた玉は「次の色」になる（赤→青→黄→赤）', to: 'next',
    add: () => 1 },
  suzu:     { r: 0, n: '染めの鈴', s: 'i_bell', p: 3, anyHit: true, d: 'どの色の玉が当たっても、その玉を鈴の色に染める（玉はふえない）', dye: true,
    add: () => 0 },
  koban:    { r: 0, n: '小判', s: 'coin', p: 3, d: 'その色の玉が当たると縁銭＋1（1回の勝負で、盤ぜんぶの小判で3枚まで）。玉はふえない', coin: true,
    add: () => 0 },
  // ── めずらしい：盤の作り方しだいで化ける ──
  maneki:   { r: 1, n: '招き猫', s: 'cat', p: 6, d: 'その色の玉が当たると、3つに分かれる',
    add: () => 2 },
  koi:      { r: 1, n: '鯉の滝のぼり', s: 'koi', p: 6, d: 'その色の玉が当たると2つに分かれ、ふえた玉は盤のいちばん上まで飛ぶ（玉1つにつき、同じ鯉で1回）', rocket: true,
    add: () => 1 },
  hanabi:   { r: 1, n: '花火', s: 'firework', p: 6, d: 'その色の玉が当たると、赤・青・黄の玉が1つずつ飛び出す', to: 'all',
    add: () => 3 },
  kingyo:   { r: 1, n: '金魚', s: 'goldfish', p: 5, d: 'その色の玉が当たると1つふえる。当たった勝負ごとに育って、ふえる数が1つ増える（ずっと）', grow: true,
    add: o => 1 + (o.g || 0) },
  fox:      { r: 1, n: 'おコンの算盤', s: 'soroban', p: 6, d: 'その色の玉が当たると、盤にある同じ色の役物 2つにつき1つふえる',
    add: (o, i, b) => Math.floor(b.filter(x => x && x.c === o.c).length / 2) },
  // ── とくべつ ──
  kaminari: { r: 2, n: '雷', s: 'kaminari', p: 8, any: true, d: 'どの色の玉が当たっても2つに分かれ、当たった玉は まわりの役物にも いっぺんに当たったことになる', chain: 'row',
    add: () => 1 },
  oni:      { r: 2, n: 'ゴンゾウの金棒', s: 'oni', p: 8, d: 'その色の玉が当たると、5つに分かれる',
    add: () => 4 },
  happa:    { r: 2, n: 'ポン太の葉っぱ', s: 'tanuki', p: 8, any: true, d: 'どの色の玉でも、当たるたびに分身する（同じ玉でも0.5秒おきに何回でも。葉っぱから出た玉は、その葉っぱでは分身しない）', again: true,
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
    if (pool.length) { const k = pool[Math.floor(r() * pool.length)]; picks.push({ k, c: YAKUMONO[k].any ? ANY : Math.floor(r() * NC) }); }
  }
  return picks;
}
function matchPockets(pockets, boss) {
  if (boss && boss.fx === 'pocket1') return pockets.map(m => Math.max(1, m - 1));
  if (boss && boss.fx === 'shime') return pockets.map((m, i) => i === 0 || i === 6 ? 0 : m);
  return pockets.slice();
}
// その勝負で打つ玉：5色を1つずつ（順番はばらばら）＋玉袋の分はランダムな色。どれも1%で虹
// 手玉：1つずつランダムな色（1%で虹）。アオのネオンの晩は、虹以外ぜんぶ同じ色に染まる
function makeHand(r, extra, boss) {
  const neon = Math.floor(r() * NC);
  const h = [];
  for (let i = 0; i < BASE_BALLS + extra; i++) h.push(r() < NIJI_RATE ? NIJI : boss && boss.fx === 'neon' ? neon : Math.floor(r() * NC));
  return h;
}

// ===== 真夜中のできごと =====
const BOSSES = [
  { who: 'ponta', n: 'ポン太', rule: '化かし', rd: 'ポン太の葉っぱで、盤の役物が2つ ただの釘に化けてしまう', fx: 'bake' },
  { who: 'ohana', n: 'おハナ', rule: '花冷え', rd: '夜が冷えて、入賞口の倍率がぜんぶ1つ下がる（×1はそのまま）', fx: 'pocket1' },
  { who: 'uzuki', n: 'ウヅキ', rule: '餅つき', rd: 'ぺったんぺったん盤がゆれて、玉が打った位置から大きくずれる', fx: 'shake' },
  { who: 'ao',    n: 'アオ', rule: 'ネオン', rd: 'ネオンの光で、手玉がぜんぶ同じ色に染まる（虹の玉はそのまま）', fx: 'neon' },
  { who: 'tetsu', n: 'テツ', rule: '締め釘', rd: 'テツが釘を締め直す。いちばん左と右の入賞口に入った玉は数えない', fx: 'shime' },
];
const MINIONS = [];
const NIGHT_BASE = [12, 80, 500, 3000, 20000];   // ためる縁（玉の数）
const STORY_NIGHTS = 5;
const MATCH_MULT = [1, 1.5, 2];
const PICKS = 3;   // 1回の勝負で、役物をえらんで置ける回数（そのあと手玉を全部落とす）
const MATCH_NAME = ['宵', '夜ふけ', '真夜中'];
const REWARD = [3, 4, 5];
const BASE_BALLS = 10;
const START_BOARD = { 16: { k: 'chochin', c: 0 }, 22: { k: 'chochin', c: 2 }, 30: { k: 'chochin', c: 1 } };

function nightBase(n) {
  if (n <= NIGHT_BASE.length) return NIGHT_BASE[n - 1];
  return Math.round(NIGHT_BASE[NIGHT_BASE.length - 1] * Math.pow(2.5, n - NIGHT_BASE.length) / 100) * 100;
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
// colors：手玉の色の並び。同じ位置から、DROP_GAP 秒おきに1つずつ落ちる（1つの数字なら1玉だけ）
function newShot(x, opt, colors) {
  const r = opt.r;
  const q = Array.isArray(colors) ? colors.slice() : [colors];
  const s = { opt, r, x, t: 0, done: false, id: Math.floor(r() * 1e9), queue: q, nextDrop: 0,
    balls: [], born: 0, overflow: 0, count: 0, landed: [], landedN: 0, events: [] };
  dropNext(s);
  return s;
}
function dropNext(s) {
  const r = s.r, c = s.queue.shift();
  const x0 = Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, s.x + (r() - .5) * (s.opt.shake ? 130 : 6)));
  s.balls.push(newBall(x0, 34, (r() - .5) * 20, 40, c)); s.born++;
  s.events.push({ type: 'drop', c, x: x0 });
  s.nextDrop = s.t + DROP_GAP;
}
// 役物 i から、玉を n こ出す
function spawn(s, i, n, parent, Y, color) {
  const sl = SLOTS[i];
  // 虹の玉から分かれた玉は、その役物の色になる（どの色でもの役物なら、ばらばらの色）。虹は子に移らない
  if (color === NIJI) { const pc = s.opt.board[i] ? s.opt.board[i].c : ANY; color = pc >= 0 ? pc : -2; }
  const w0 = parent ? parent.w : 1;   // 分かれた玉は、元の玉と同じ重さ（×何こ分）
  let alive = s.balls.filter(b => b.alive).length;
  for (let j = 0; j < n; j++) {
    const base = color === -2 ? Math.floor(s.r() * NC) : color;
    const c = Y.to === 'all' ? j % NC : Y.to === 'niji' ? NIJI : Y.to === 'next' ? nextColor(base) : base;
    if (alive >= MAX_ALIVE) {   // 盤がいっぱい：新しい玉は出さず、当たった玉が重くなる
      if (parent && parent.alive) parent.w += w0; else s.overflow += w0;
      continue;
    }
    alive++;
    const ang = Math.PI * (.15 + .7 * (n === 1 ? .5 : j / (n - 1))) + Math.PI;   // 上むきの扇形に飛び出す
    const sp = 160 + s.r() * 80;
    const nb = newBall(sl.x, sl.y - ITEM_R - BALL_R, Math.cos(ang) * sp, Math.sin(ang) * sp * .6, c, w0);
    nb.used.add(i); nb.cd[i] = s.t + COOLDOWN;   // 生まれた役物では、もうふえない
    if (Y.rocket) { nb.rocket = true; nb.vy = -Math.sqrt(2 * GRAVITY * Math.max(0, sl.y - 40)); nb.vx = (s.r() - .5) * 90; }
    s.balls.push(nb); s.born++;
  }
}
// 役物 i が玉 ball（色 color）で発動する
function trigger(s, i, ball, color, viaChain, chainFrom) {
  const b = s.opt.board, o = b[i];
  if (!o || s.opt.disabled.has(i)) return;
  const Y = YAKUMONO[o.k];
  if (!Y.anyHit && !colorMatch(color, o.c)) return;
  if (ball) {
    if (Y.again) { if (ball.used.has(i) || (ball.cd[i] && s.t < ball.cd[i])) return; ball.cd[i] = s.t + AGAIN_GAP; }   // 葉っぱから生まれた玉は、その葉っぱでは分身しない
    else { if (ball.used.has(i)) return; ball.used.add(i); }
  }
  if (Y.grow && o.gs !== s.id) { o.gs = s.id; s.grown = (s.grown || []).concat(i); }   // 金魚：この勝負で当たった（育つのは勝負のあと）
  let n = Y.add(o, i, b, s);
  if (Y.dye && ball && o.c >= 0) ball.color = o.c;                           // 染めの鈴
  if (Y.coin) { if ((s.coins || 0) < 3) { s.coins = (s.coins || 0) + 1; s.events.push({ type: 'coin', x: SLOTS[i].x, y: SLOTS[i].y }); } }
  if (n > 0) spawn(s, i, n, ball || chainFrom, Y, color);
  s.events.push({ type: 'hit', i, k: o.k, x: SLOTS[i].x, y: SLOTS[i].y, n, c: o.c, chain: !!viaChain });
  if (Y.chain === 'row' && !viaChain) {
    // 当たった玉が、まわりの役物にも当たったことにする（1つの玉は同じ役物で1回、の決まりはそのまま）
    if (ball) SLOTS[i].nb.forEach(j => { if (b[j] && !YAKUMONO[b[j].k].chain) trigger(s, j, ball, ball.color, true); });
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
  if (s.queue.length && s.t >= s.nextDrop) dropNext(s);
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
  if (!s.queue.length && s.balls.every(x => !x.alive)) { s.done = true; s.count += s.overflow; }
}
// 打ち終わったあと：この勝負で当たった金魚が1つ育つ
function afterShot(s) { (s.grown || []).forEach(i => { const o = s.opt.board[i]; if (o && o.k === 'kingyo') o.g = (o.g || 0) + 1; }); s.grown = []; }
function shotTotal(s) { return s.count + (s.done ? 0 : s.overflow); }
// 最後まで一気に（シミュレーター用）
function runShot(x, opt, colors) { const s = newShot(x, opt, colors); while (!s.done) stepShot(s, 1 / 120); return s; }

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
  COLORS, NC, NIJI, ANY, colorName, colorMatch, nextColor, pieceName, makeHand,
  target, opponent, nightBase, newBoard, draft, matchPockets, RARITY_NAME, newShot, stepShot, runShot, shotTotal, afterShot, rng, shuffle,
  STORY_NIGHTS, MATCH_NAME, REWARD, BASE_BALLS, MAX_ALIVE, PICKS,
};
