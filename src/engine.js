// ===== よいまつり横丁 第2章 月見座：ルール =====
// 盤の釘の位置に「役物」を置いて育てる。玉が当たるたびに文・倍率がたまり、
// 入賞口に入ったところで 点 ＝ 文 × 倍率 × 入賞口の倍率。

const W = 360, H = 580;
const BALL_R = 7, NAIL_R = 4, ITEM_R = 9;   // 役物は釘より少し大きいだけ（大きすぎると玉がハマって稼ぎすぎる）
const MIN_IMPACT = 40, SHOT_TIMEOUT = 10;   // 当たりは、玉がちゃんとぶつかったとき（速さ40以上）だけ数える。回数の制限はなし
const POCKET_Y = 516;
const NAIL_MON = 30;   // ただの釘に当たったときの文
const GRAVITY = 760, MAX_V = 720;

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
// fx(c, i, o, direct) … c はその一発の状態（mon, mul, …）、i は置き場所、o は置いた役物
// 返すのは、盤に浮かべる文字
const YAKUMONO = {
  chochin:  { r: 0, n: '赤ちょうちん', s: 'lantern', p: 3, d: '文＋150',
    fx: c => { c.mon += 150; return '+150文'; } },
  suzu:     { r: 0, n: '招きの鈴', s: 'i_bell', p: 3, d: '倍率＋0.5',
    fx: c => { c.mul += .5; return '倍率+0.5'; } },
  maneki:   { r: 1, n: '招き猫', s: 'cat', p: 6, d: '倍率＋1',
    fx: c => { c.mul += 1; return '倍率+1'; } },
  dango:    { r: 0, n: 'だんご', s: 'dango', p: 4, d: '文＋80。となりのだんご1つにつき さらに＋80',
    fx: (c, i, o, b) => { const v = 80 * (1 + SLOTS[i].nb.filter(j => b[j] && b[j].k === 'dango').length); c.mon += v; return `+${v}文`; } },
  sakura:   { r: 0, n: '桜', s: 'sakura', p: 4, d: '文＋40。盤にある桜1本につき さらに＋40',
    fx: (c, i, o, b) => { const v = 40 * b.filter(x => x && x.k === 'sakura').length; c.mon += v; return `+${v}文`; } },
  taiko:    { r: 1, n: '太鼓', s: 'taiko', p: 5, d: '文＋（この一発で当たった役物の数×40）',
    fx: c => { const v = c.hits * 40; c.mon += v; return `+${v}文`; } },
  kingyo:   { r: 1, n: '金魚', s: 'goldfish', p: 5, d: '文＋（育ち）。当たるたびに育ちが10ふえる（ずっと）。はじめは80',
    fx: (c, i, o) => { o.g = (o.g || 80); const v = o.g; c.mon += v; o.g += 10; return `+${v}文`; } },
  koban:    { r: 0, n: '小判', s: 'coin', p: 4, d: '当たると縁銭＋1（一発に2回まで）',
    fx: c => { if (c.coins >= 2) return null; c.coins++; return '縁銭+1'; } },
  fox:      { r: 1, n: 'おコンの算盤', s: 'fox', p: 6, d: 'この一発で当たった役物の種類1つにつき 倍率＋0.5（一発に1回）', once: true,
    fx: c => { const v = c.kinds.size * .5; c.mul += v; return `倍率+${v}`; } },
  oni:      { r: 2, n: 'ゴンゾウの金棒', s: 'oni', p: 7, d: '倍率×1.5（一発に1回だけ。2本目からは倍率＋0.5）', once: true,
    fx: c => {
      if (c.oniUsed) { c.mul += .5; return '倍率+0.5'; }
      c.oniUsed = true; c.mul = Math.round(c.mul * 1.5 * 100) / 100; return '倍率×1.5';
    } },
  koi:      { r: 1, n: '鯉の滝のぼり', s: 'koi', p: 6, d: '文＋80。玉を上へはね上げる（玉1つに1回まで）', bounce: true,
    fx: c => { c.mon += 80; return '+80文'; } },
  happa:    { r: 2, n: 'ポン太の葉っぱ', s: 'tanuki', p: 8, d: '玉が2つに分かれる（一発で玉は3つまで）', split: true,
    fx: () => '分身！' },
  hanabi:   { r: 1, n: '花火', s: 'firework', p: 6, d: 'となりの役物を ぜんぶ発動する（一発に1回）', once: true,
    chain: 'nb', fx: () => 'ドン！' },
  kaminari: { r: 2, n: '雷', s: 'kaminari', p: 7, d: '同じ段の役物を ぜんぶ発動する（一発に1回）', once: true,
    chain: 'row', fx: () => 'ゴロゴロ！' },
};
const YAKUMONO_KEYS = Object.keys(YAKUMONO);
const RARITY_NAME = ['ふつう', 'めずらしい', 'とくべつ'];

// 1手番ごとに出る3つの候補（夜が進むほど、めずらしい役物が出やすい）
function draft(r, night, n = 3) {
  const w = [70, 26 + night * 2, 4 + night * 2];
  const picks = [];
  for (let t = 0; picks.length < n && t < 50; t++) {
    let x = r() * (w[0] + w[1] + w[2]), rr = 0;
    while (x > w[rr]) { x -= w[rr]; rr++; }
    const pool = YAKUMONO_KEYS.filter(k => YAKUMONO[k].r === rr && !picks.includes(k));
    if (pool.length) picks.push(pool[Math.floor(r() * pool.length)]);
  }
  return picks;
}
function matchPockets(pockets, boss) {
  if (boss && boss.fx === 'pocket1') return pockets.map(m => Math.max(1, m - 1));
  if (boss && boss.fx === 'shime') return pockets.map((m, i) => i === 0 || i === 6 ? 0 : m);
  return pockets.slice();
}

// ===== 相手 =====
const BOSSES = [
  { who: 'ponta', n: 'ポン太', rule: '化かし', rd: 'ポン太の葉っぱで、盤の役物が2つ ただの釘に化けてしまう', fx: 'bake' },
  { who: 'ohana', n: 'おハナ', rule: '花冷え', rd: '夜が冷えて、入賞口の倍率がぜんぶ1つ下がる（×1はそのまま）', fx: 'pocket1' },
  { who: 'uzuki', n: 'ウヅキ', rule: '餅つき', rd: 'ぺったんぺったん盤がゆれて、玉が打った位置から大きくずれる', fx: 'shake' },
  { who: 'ao',    n: 'アオ', rule: 'ネオン', rd: 'ネオンに光を吸われて、役物で入る文が半分になる', fx: 'neon' },
  { who: 'tetsu', n: 'テツ', rule: '締め釘', rd: 'テツが釘を締め直す。いちばん左と右の入賞口に入っても0点', fx: 'shime' },
];
const MINIONS = [
  [{ n: 'かえるの番頭', s: 'frog' }, { n: 'うさぎの飴屋', s: 'rabbit' }],
  [{ n: 'すずめのお宿', s: 'sparrow' }, { n: 'ふくろう先生', s: 'fukurou' }],
  [{ n: 'たこの八っつぁん', s: 'octopus' }, { n: '天狗の旦那', s: 'tengu' }],
  [{ n: 'くじらの親方', s: 'whale' }, { n: '鷹の目の辰', s: 'eagle' }],
];
const NIGHT_BASE = [1800, 7000, 26000, 85000, 270000];   // 点の桁を大きく（文を10倍にしたのに合わせて10倍）
const STORY_NIGHTS = 5;
const MATCH_MULT = [1, 1.5, 2];
const MATCH_NAME = ['宵', '夜ふけ', '真夜中'];
const REWARD = [3, 4, 5];
const BASE_BALLS = 5;
const START_BOARD = { 16: 'chochin', 22: 'suzu', 23: 'dango', 29: 'chochin', 36: 'dango' };

function nightBase(n) {
  if (n <= NIGHT_BASE.length) return NIGHT_BASE[n - 1];
  return Math.round(NIGHT_BASE[NIGHT_BASE.length - 1] * Math.pow(3, n - NIGHT_BASE.length) / 1000) * 1000;
}
function target(n, k) { return Math.round(nightBase(n) * MATCH_MULT[k] / 100) * 100; }
// 宵・夜ふけは月見座でふつうに打つ。真夜中は、その夜の「できごと」がある
function opponent(n, k) { return k === 2 ? BOSSES[(n - 1) % BOSSES.length] : { n: '月見座', who: 'ginko', plain: true }; }
function newBoard() { const b = SLOTS.map(() => null); for (const [i, k] of Object.entries(START_BOARD)) b[i] = { k }; return b; }

// ===== 一発（玉を打ってから、ぜんぶ入賞するまで） =====
// opt: { board, pockets, disabled:Set, block:bool, r:乱数 }
function newShot(x, opt) {
  const r = opt.r;
  return {
    opt, r, t: 0, done: false,
    balls: [{ x: Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, x + (r() - .5) * (opt.shake ? 130 : 3))), y: 34, vx: (r() - .5) * 20, vy: 40, alive: true, hit: {}, slow: 0, bounces: 0 }],
    mon: 0, mul: 1, hits: 0, kinds: new Set(), coins: 0, onceUsed: new Set(),
    landed: [], events: [],
  };
}
function trigger(s, i, direct, ball) {
  const b = s.opt.board, o = b[i];
  const ev = { type: 'hit', i, x: SLOTS[i].x, y: SLOTS[i].y };
  if (!o || s.opt.disabled.has(i)) {
    if (!direct) return;
    s.mon += NAIL_MON; ev.nail = true; ev.text = '+' + NAIL_MON; s.events.push(ev); return;
  }
  const Y = YAKUMONO[o.k];
  if (Y.once) { if (s.onceUsed.has(i)) return; s.onceUsed.add(i); }
  s.hits++; s.kinds.add(o.k);
  const before = s.mon;
  ev.text = Y.fx(s, i, o, b);
  if (ev.text == null) return;
  if (s.opt.neon && s.mon > before) { const half = Math.round((s.mon - before) / 2); s.mon = before + half; ev.text = `+${half}文`; }
  ev.k = o.k; s.events.push(ev);
  if (direct && ball) {
    if (Y.bounce && ball.bounces < 1) { ball.bounces++; ball.vy = -520 - s.r() * 80; ball.vx = (s.r() - .5) * 260; }
    if (Y.split && s.balls.length < 3) {
      const nb = { x: ball.x, y: ball.y, vx: -ball.vx - 60 * Math.sign(ball.vx || 1), vy: ball.vy, alive: true, hit: { ...ball.hit }, slow: 0, bounces: ball.bounces };
      s.balls.push(nb); s.events.push({ type: 'split', x: ball.x, y: ball.y });
    }
    if (Y.chain) {
      const targets = Y.chain === 'nb' ? SLOTS[i].nb : SLOTS.map((t, j) => j).filter(j => j !== i && SLOTS[j].row === SLOTS[i].row);
      targets.forEach(j => { if (b[j] && !s.opt.disabled.has(j) && !YAKUMONO[b[j].k].chain) trigger(s, j, false); });
    }
  }
}
function collide(ball, cx, cy, R, e, s) {
  const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
  if (d >= R || d === 0) return false;
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
  for (const ball of s.balls) {
    if (!ball.alive) continue;
    ball.vy += GRAVITY * dt;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > MAX_V) { ball.vx *= MAX_V / sp; ball.vy *= MAX_V / sp; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * .6; }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * .6; }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * .5; }
    if (s.opt.block) collide(ball, W / 2, 300, 30 + BALL_R, .5, s);
    for (let i = 0; i < SLOTS.length; i++) {
      const sl = SLOTS[i];
      if (Math.abs(sl.y - ball.y) > 24 || Math.abs(sl.x - ball.x) > 24) continue;
      const item = b[i] && !s.opt.disabled.has(i);
      if (collide(ball, sl.x, sl.y, (item ? ITEM_R : NAIL_R) + BALL_R, .55, s) === 2) trigger(s, i, true, ball);
    }
    // 止まったら、そっと押す
    if (Math.hypot(ball.vx, ball.vy) < 25) { ball.slow += dt; if (ball.slow > .35) { ball.vx = (s.r() - .5) * 160; ball.vy = -60; ball.slow = 0; } } else ball.slow = 0;
    if (ball.y >= POCKET_Y || s.t > SHOT_TIMEOUT) {
      ball.alive = false;
      const p = pocketOf(ball.x);
      s.landed.push(p);
      s.events.push({ type: 'pocket', p, x: ball.x });
    }
  }
  if (s.balls.every(x => !x.alive)) s.done = true;
}
function pocketMult(s) { return s.landed.reduce((a, p) => a + s.opt.pockets[p], 0); }
function shotTotal(s) { return Math.floor(s.mon * s.mul * pocketMult(s)); }
// 最後まで一気に（シミュレーター用）
function runShot(x, opt) { const s = newShot(x, opt); while (!s.done) stepShot(s, 1 / 120); return s; }

// ===== 乱数 =====
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

if (typeof module !== 'undefined') module.exports = {
  W, H, BALL_R, NAIL_R, ITEM_R, POCKET_Y, SLOTS, POCKETS_START, pocketOf, YAKUMONO, YAKUMONO_KEYS, BOSSES, MINIONS,
  target, opponent, nightBase, newBoard, draft, matchPockets, RARITY_NAME, NAIL_MON, newShot, stepShot, runShot, shotTotal, pocketMult, rng, shuffle,
  STORY_NIGHTS, MATCH_NAME, REWARD, BASE_BALLS,
};
