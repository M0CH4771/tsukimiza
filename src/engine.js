// ===== よいまつり横丁 第2章 月見座：ルール =====
// 玉はぜんぶ同じ白い玉。役物の効き方で ちがいを出す。
// 点（縁）＝ 入賞口に入った玉 × その入賞口の倍率。入賞口の倍率は、屋台・太鼓・花火・金魚で育つ。
// 1回の勝負：役物を PICKS 回置いて、1か所から手玉を全部いっぺんに落とす。
// どの玉も、1つの役物で1回だけ効果が出る。分かれた玉は新しい玉で、下の役物でまたふえる。
// ただし「1回の落としで1回だけ」の役物（once）もある（花火など、玉ごとに出ると強すぎるもの）。
// 盤に一度に出る玉は MAX_ALIVE こまで。それをこえた分は、生まれた役物の下から順番に こぼれ落ちる（1つも捨てない）。

const W = 360, H = 512;   // 釘は7段（スマホで盤と下の数字まで1画面に入るように）
const BALL_R = 6, NAIL_R = 4, ITEM_R = 9;
const MIN_IMPACT = 40;   // 当たりは、玉がちゃんとぶつかったとき（速さ40以上）だけ。時間切れはない（最後の1こが入るまで）
const ROWS_N = 7, ROW0 = 100, ROW_GAP = 50;   // 釘の段：7段、いちばん上の段の高さ、段の間
const POCKET_Y = 452;
const GRAVITY = 760, MAX_V = 720;
const MAX_ALIVE = 2500;  // 盤に一度に出る玉の数（スマホで動かせる目安）
const COOLDOWN = .3;     // 生まれた玉が、生まれた役物にすぐ当たらないための間
const DROP_GAP = .15;    // 手玉を全部落とすときの、1つずつの間
const WAIT_PER_STEP = 12;   // 順番待ちの玉を、1こまに何こまで出すか（1秒に1440こ）

// 釘の位置：7段、偶数段は7本、奇数段は6本（ずらして並べる）
const SLOTS = [];
for (let row = 0; row < ROWS_N; row++) {
  const n = row % 2 ? 6 : 7;
  for (let col = 0; col < n; col++) {
    SLOTS.push({ row, col, x: (row % 2 ? 55 : 30) + col * 50, y: ROW0 + row * ROW_GAP });
  }
}
// となり（上下左右ななめ）
SLOTS.forEach((s, i) => {
  s.nb = [];
  SLOTS.forEach((t, j) => { if (i !== j && Math.hypot(s.x - t.x, s.y - t.y) < 72) s.nb.push(j); });
});

// 入賞口：11こ。まんなかが×3
const NP = 11;
const POCKETS_START = [1, 1, 2, 1, 2, 3, 2, 1, 2, 1, 1];
const pocketOf = x => Math.max(0, Math.min(NP - 1, Math.floor(x / (W / NP))));

// ===== 役物 =====
// add(o, i, board, s)：ふえる玉の数
const YAKUMONO = {
  // ── ふつう ──
  chochin:  { r: 0, n: '赤ちょうちん', s: 'lantern', p: 3, d: '当たると、玉が2つに分かれる',
    add: () => 1 },
  dango:    { r: 0, n: 'だんご', s: 'dango', p: 3, d: '当たると、まわりのだんご1つにつき玉が1つふえる（ひとつだけだと ふえない）',
    add: (o, i, b) => SLOTS[i].nb.filter(j => b[j] && b[j].k === 'dango').length },
  jishaku:  { r: 0, n: '寄せ磁石', s: 'i_magnet', p: 3, d: '当たった玉を、まんなかの入賞口のほうへ はじく（玉はふえない）', pull: true,
    add: () => 0 },
  koban:    { r: 0, n: '小判', s: 'coin', p: 3, d: '玉が当たるたびに小銭がたまり、盤ぜんぶの小判で10こ当たるごとに縁銭＋1（玉はふえない）', coin: true,
    add: () => 0 },
  // ── めずらしい ──
  maneki:   { r: 1, n: '招き猫', s: 'cat', p: 6, d: '当たると、玉が3つに分かれる',
    add: () => 2 },
  koi:      { r: 2, n: '鯉の滝のぼり', s: 'koi', p: 8, d: '当たった玉を、盤のいちばん上まで飛ばす（玉はふえない）。飛んだ玉と、その玉から分かれた玉は、もう鯉では飛ばない', lift: true,
    add: () => 0 },
  taiko:    { r: 1, n: '太鼓', s: 'taiko', p: 6, d: '玉が当たるたびに、真下の入賞口の倍率が この勝負のあいだ＋1（玉はふえない）', drum: true,
    add: () => 0 },
  kingyo:   { r: 1, n: '金魚', s: 'goldfish', p: 6, d: '当たると玉が1つふえる。玉が当たった勝負のあと、真下の入賞口の倍率が＋1（ずっと）', grow: true,
    add: () => 1 },
  fox:      { r: 1, n: 'おコンの算盤', s: 'soroban', p: 6, d: '当たると、盤にある役物の種類 5つにつき玉が1つふえる',
    add: (o, i, b) => Math.floor(new Set(b.filter(Boolean).map(x => x.k)).size / 5) },
  // ── とくべつ ──
  kaminari: { r: 2, n: '雷', s: 'kaminari', p: 8, d: '当たった玉が、同じ段の となりの役物にも いっぺんに当たったことになる（雷そのものは玉をふやさない）', chain: true,
    add: () => 0 },
  oni:      { r: 2, n: 'ゴンゾウの金棒', s: 'oni', p: 8, d: '当たると、玉が4つに分かれる',
    add: () => 3 },
  happa:    { r: 2, n: 'ポン太の葉っぱ', s: 'tanuki', p: 8, d: '当たると玉が分身して、分身は盤の左右反対の場所に化けて出る（分身は、もとの玉がもう当たった役物では効果が出ない）', mirror: true,
    add: () => 1 },
  hanabi:   { r: 2, n: '花火', s: 'firework', p: 8, d: '玉が当たると、入賞口の倍率が ぜんぶ この勝負のあいだ＋2（1回の落としで1回だけ。玉はふえない）', fire: true, once: true,
    add: () => 0 },
};
const YAKUMONO_KEYS = Object.keys(YAKUMONO);
const RARITY_NAME = ['ふつう', 'めずらしい', 'とくべつ'];
const pieceName = o => YAKUMONO[o.k].n;

// 1回の役物えらびで出る3つの候補（夜が進むほど、めずらしい役物が出やすい）
function draft(r, night, n = 3) {
  const w = [64, 28 + night * 2, 8 + night * 2];
  const picks = [];
  for (let t = 0; picks.length < n && t < 50; t++) {
    let x = r() * (w[0] + w[1] + w[2]), rr = 0;
    while (x > w[rr]) { x -= w[rr]; rr++; }
    const pool = YAKUMONO_KEYS.filter(k => YAKUMONO[k].r === rr && !picks.some(p => p.k === k));
    if (pool.length) picks.push({ k: pool[Math.floor(r() * pool.length)] });
  }
  return picks;
}
function matchPockets(pockets, boss) {
  if (boss && boss.fx === 'pocket1') return pockets.map(m => Math.max(1, m - 1));
  if (boss && boss.fx === 'shime') return pockets.map((m, i) => i < 2 || i > NP - 3 ? 0 : m);
  if (boss && boss.fx === 'neon') return pockets.map((m, i) => i === (NP >> 1) ? 0 : m);
  return pockets.slice();
}
// その勝負で落とす玉の数
function handSize(extra) { return BASE_BALLS + extra; }

// ===== 真夜中のできごと =====
const BOSSES = [
  { who: 'ponta', n: 'ポン太', rule: '化かし', rd: 'ポン太の葉っぱで、盤の役物が2つ ただの釘に化けてしまう', fx: 'bake' },
  { who: 'ohana', n: 'おハナ', rule: '花冷え', rd: '夜が冷えて、入賞口の倍率がぜんぶ1つ下がる（×1はそのまま）', fx: 'pocket1' },
  { who: 'uzuki', n: 'ウヅキ', rule: '餅つき', rd: 'ぺったんぺったん盤がゆれて、玉が打った位置から大きくずれる', fx: 'shake' },
  { who: 'ao',    n: 'アオ', rule: 'ネオン', rd: 'ネオンの看板で まんなかの入賞口がふさがれる。入った玉は数えない', fx: 'neon' },
  { who: 'tetsu', n: 'テツ', rule: '締め釘', rd: 'テツが釘を締め直す。左はしと右はしの入賞口2つずつに入った玉は数えない', fx: 'shime' },
];
const MINIONS = [];
const NIGHT_BASE = [18, 100, 700, 5000, 40000];   // ためる縁
const STORY_NIGHTS = 5;
const MATCH_MULT = [1, 1.7, 2.5];
const PICKS = 2;   // 1回の勝負で、役物をえらんで置ける回数（そのあと手玉を全部落とす）
const MATCH_NAME = ['宵', '夜ふけ', '真夜中'];
const REWARD = [3, 4, 5];
const BASE_BALLS = 10;
const START_BOARD = { 16: { k: 'chochin' }, 22: { k: 'chochin' }, 30: { k: 'chochin' } };

function nightBase(n) {
  if (n <= NIGHT_BASE.length) return NIGHT_BASE[n - 1];
  return Math.round(NIGHT_BASE[NIGHT_BASE.length - 1] * Math.pow(3, n - NIGHT_BASE.length) / 100) * 100;
}
function target(n, k) { const v = nightBase(n) * MATCH_MULT[k]; return v < 100 ? Math.round(v) : v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100; }
// 宵・夜ふけは月見座でふつうに打つ。真夜中は、その夜の「できごと」がある
function opponent(n, k) { return k === 2 ? BOSSES[(n - 1) % BOSSES.length] : { n: '月見座', who: 'ginko', plain: true }; }
function newBoard() { const b = SLOTS.map(() => null); for (const [i, o] of Object.entries(START_BOARD)) b[i] = { ...o }; return b; }

// ===== 1回の落とし（手玉を全部落としてから、ぜんぶ入賞するまで） =====
// opt: { board, pockets(この勝負の入賞口。太鼓・花火で書きかわる), disabled:Set, shake:bool, r:乱数 }
// used：この玉がもう反応した役物。cd：葉っぱで次に分身できる時刻
function newBall(x, y, vx, vy) { return { x, y, vx, vy, used: new Set(), cd: {}, alive: true, slow: 0, rocket: false }; }
function newShot(x, opt, n) {
  const s = { opt, r: opt.r, x, t: 0, done: false, id: Math.floor(opt.r() * 1e9), queue: n, nextDrop: 0, wait: [],
    balls: [], alive: 0, born: 0, count: 0, landedN: 0, events: [], pk: opt.pockets.slice(), coins: 0, coinHits: 0, grown: [], onceUsed: {} };
  dropNext(s);
  return s;
}
function addBall(s, b) { s.balls.push(b); s.alive++; s.born++; }
function dropNext(s) {
  const r = s.r; s.queue--;
  const x0 = Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, s.x + (r() - .5) * (s.opt.shake ? 130 : 6)));
  addBall(s, newBall(x0, 34, (r() - .5) * 20, 40));
  s.nextDrop = s.t + DROP_GAP;
}
// 分かれた玉の出かた：もとの玉（はね返ったあと）の速さと向きを、扇のように少しずつずらす
function splitFrom(s, src, sl, n, j) {
  let vx, vy, x, y;
  if (src) { vx = src.vx; vy = src.vy; x = src.x; y = src.y; }
  else { vx = 0; vy = 60; x = sl.x; y = sl.y + ITEM_R + BALL_R; }   // 玉がない（順番待ち）ときは、役物の下から
  const sp = Math.max(90, Math.hypot(vx, vy)) * (.8 + s.r() * .25);
  const a = Math.atan2(vy, vx) + (n === 1 ? (s.r() < .5 ? -1 : 1) * .45 : (j / (n - 1) - .5) * 1.4) + (s.r() - .5) * .2;
  return newBall(x, y, Math.cos(a) * sp, Math.sin(a) * sp);
}
// 役物 i から、玉を n こ出す（盤がいっぱいなら、その役物の下で順番待ち）
function spawn(s, i, n, Y, src) {
  const sl = SLOTS[i];
  for (let j = 0; j < n; j++) {
    if (s.wait.length) { s.wait.push([i, !!(src && src.noKoi)]); continue; }   // 順番待ちがあるうちは、うしろに並ぶ
    if (s.alive >= MAX_ALIVE) { s.wait.push([i, !!(src && src.noKoi)]); continue; }   // 盤がいっぱい：この役物の下で順番待ち
    // ぶつかった玉の はね返りを、少しずつ向きをずらして分ける（物理のまま）
    const nb = splitFrom(s, src, sl, n, j);
    if (src && src.noKoi) nb.noKoi = true;   // 鯉で飛んだ玉から分かれた玉も、鯉では飛ばない
    nb.used.add(i); nb.cd[i] = s.t + COOLDOWN;   // 生まれた役物では、もう反応しない
    if (Y.mirror) { nb.x = W - sl.x; if (src) src.used.forEach(u => nb.used.add(u)); }   // 分身：左右反対の場所に化けて出る。もとの玉と同じ役物では もう効果が出ない
    if (Y.rocket) { nb.rocket = true; nb.vy = -Math.sqrt(2 * GRAVITY * Math.max(0, sl.y - 40)); nb.vx = (s.r() - .5) * 90; }
    addBall(s, nb);
  }
}
// 役物 i が玉 ball で発動する
function trigger(s, i, ball, viaChain) {
  const b = s.opt.board, o = b[i];
  if (!o || s.opt.disabled.has(i)) return;
  const Y = YAKUMONO[o.k];
  if (ball.used.has(i)) return;   // この玉は、この役物ではもう効果が出た
  if (Y.lift && ball.noKoi) return; // 鯉で飛んだ玉（と、そこから分かれた玉）は、もう飛ばない
  if (Y.once) { if (s.onceUsed[i]) return; s.onceUsed[i] = true; }   // 1回の落としで1回だけの役物
  ball.used.add(i);
  const sl = SLOTS[i], p = pocketOf(sl.x);
  const n = Y.add(o, i, b, s);
  if (n > 0) spawn(s, i, n, Y, ball);
  if (Y.lift) {   // 滝のぼり：当たった玉を上へ。この玉と、ここから分かれる玉は、もう鯉では飛ばない
    ball.noKoi = true; ball.rocket = true;
    ball.vy = -Math.sqrt(2 * GRAVITY * Math.max(0, ball.y - 40)); ball.vx = (s.r() - .5) * 90;
    s.events.push({ type: 'rocket', x: sl.x, y: sl.y });
  }
  if (Y.pull) { ball.vx = (W / 2 - ball.x) * 1.6; ball.vy = Math.min(ball.vy, -40); }
  if (Y.coin) { s.coinHits++; if (s.coinHits % 10 === 0) { s.coins++; s.events.push({ type: 'coin', x: sl.x, y: sl.y }); } }
  if (Y.drum && s.pk[p] > 0) { s.pk[p]++; s.events.push({ type: 'pk', p, m: s.pk[p], x: sl.x, y: sl.y }); }
  if (Y.fire) { for (let q = 0; q < s.pk.length; q++) if (s.pk[q] > 0) s.pk[q] += 2; s.events.push({ type: 'fire', x: sl.x, y: sl.y }); }
  if (Y.grow && !s.grown.includes(i)) s.grown.push(i);
  s.events.push({ type: 'hit', i, k: o.k, x: sl.x, y: sl.y, n, chain: !!viaChain });
  if (Y.chain && !viaChain) SLOTS[i].nb.forEach(j => { if (SLOTS[j].row === sl.row && b[j] && !YAKUMONO[b[j].k].chain) trigger(s, j, ball, true); });
  if (Y.rocket && n > 0) s.events.push({ type: 'rocket', x: sl.x, y: sl.y });
}
function collide(ball, cx, cy, R, e, s) {
  const dx = ball.x - cx, dy = ball.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= R * R || d2 === 0) return 0;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  ball.x = cx + nx * R; ball.y = cy + ny * R;
  const vn = ball.vx * nx + ball.vy * ny;
  const impact = vn < -MIN_IMPACT;
  if (vn < 0) {
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    const j = (s.r() - .5) * 40; ball.vx += -ny * j; ball.vy += nx * j;
  }
  return impact ? 2 : 1;
}
// 段ごとの釘（玉のy から近い段だけ調べる）
const ROWS = []; SLOTS.forEach((sl, i) => { (ROWS[sl.row] = ROWS[sl.row] || []).push(i); });
function stepShot(s, dt) {
  s.t += dt;
  if (s.queue > 0 && s.t >= s.nextDrop) dropNext(s);
  // 順番待ちの玉を、生まれた役物の下から こぼす
  for (let rel = 0; rel < WAIT_PER_STEP && s.wait.length && s.alive < MAX_ALIVE; rel++) {
    const [i, noKoi] = s.wait.shift(), sl = SLOTS[i];
    const nb = splitFrom(s, null, sl, 1, 0);
    if (noKoi) nb.noKoi = true;
    nb.used.add(i); addBall(s, nb);
  }
  const b = s.opt.board;
  for (let bi = 0; bi < s.balls.length; bi++) {
    const ball = s.balls[bi];
    if (!ball.alive) continue;
    ball.vy += GRAVITY * dt;
    if (ball.rocket && ball.vy >= 0) ball.rocket = false;   // いちばん上に着いたら、ふつうに落ちる
    const v2 = ball.vx * ball.vx + ball.vy * ball.vy;
    if (v2 > MAX_V * MAX_V && !ball.rocket) { const k = MAX_V / Math.sqrt(v2); ball.vx *= k; ball.vy *= k; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * .6; }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * .6; }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * .5; }
    if (!ball.rocket) {
      const row = Math.round((ball.y - ROW0) / ROW_GAP);
      if (row >= 0 && row < ROWS_N && Math.abs(ROW0 + row * ROW_GAP - ball.y) <= 24) {
        const ids = ROWS[row];
        for (let q = 0; q < ids.length; q++) {
          const i = ids[q], sl = SLOTS[i];
          if (Math.abs(sl.x - ball.x) > 24) continue;
          const item = b[i] && !s.opt.disabled.has(i);
          if (collide(ball, sl.x, sl.y, (item ? ITEM_R : NAIL_R) + BALL_R, .55, s) === 2 && item) trigger(s, i, ball, false);
        }
      }
    }
    // 止まったら、そっと押す
    if (Math.abs(ball.vx) + Math.abs(ball.vy) < 30) { ball.slow += dt; if (ball.slow > .35) { ball.vx = (s.r() - .5) * 160; ball.vy = -60; ball.slow = 0; } } else ball.slow = 0;
    if (ball.y >= POCKET_Y) {
      ball.alive = false; s.alive--;
      const p = pocketOf(ball.x), m = s.pk[p];
      s.landedN++; s.count += m;
      s.events.push({ type: 'pocket', p, m, x: ball.x });
    }
  }
  // 入った玉はときどき片づける（配列が長くなりすぎないように）
  if (s.balls.length > 4000 && s.alive < s.balls.length / 3) s.balls = s.balls.filter(x => x.alive);
  if (s.queue <= 0 && !s.wait.length && s.alive <= 0) s.done = true;
}
// 打ち終わったあと：玉が当たった金魚の真下の入賞口が、ずっと＋1。返り値：育った入賞口の番号
function afterShot(s, pockets) {
  const up = [];
  s.grown.forEach(i => { const p = pocketOf(SLOTS[i].x); pockets[p]++; up.push(p); });
  s.grown = [];
  return up;
}
function shotTotal(s) { return s.count; }
// 最後まで一気に（シミュレーター用）
function runShot(x, opt, n) { const s = newShot(x, opt, n); while (!s.done && s.t < 900) stepShot(s, 1 / 120); return s; }   // 900秒はボット用の安全弁

// ===== 乱数 =====
function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.get = () => a; f.set = v => { a = v >>> 0; };   // 続きから遊ぶときに、乱数の続きも戻す
  return f;
}
function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

if (typeof module !== 'undefined') module.exports = {
  W, H, BALL_R, NAIL_R, ITEM_R, POCKET_Y, SLOTS, NP, POCKETS_START, pocketOf, YAKUMONO, YAKUMONO_KEYS, BOSSES, MINIONS,
  pieceName, handSize, target, opponent, nightBase, newBoard, draft, matchPockets, RARITY_NAME,
  newShot, stepShot, runShot, shotTotal, afterShot, rng, shuffle,
  STORY_NIGHTS, MATCH_NAME, REWARD, BASE_BALLS, MAX_ALIVE, PICKS,
};
