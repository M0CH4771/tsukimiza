// ボットで、夜ごとの勝ち抜き率を調べる（1玉ごとに役物を1つ置く）
// 使い方: node tools/sim.js [回数]
const E = require('../src/engine.js');
const N = +process.argv[2] || 300;
const SMART = process.argv.includes('smart');   // smart：よく通る場所に置き、だんごはだんごの横へ、役物の多い列をねらう
// 何もない盤で、どの釘に玉がよく当たるか
const TRAFFIC = E.SLOTS.map(() => 0);
{ const r = E.rng(99), b = E.SLOTS.map(() => null);
  for (let t = 0; t < 400; t++) { const s = E.newShot(60 + r() * 240, { board: b, pockets: E.POCKETS_START, disabled: new Set(), r });
    while (!s.done) E.stepShot(s, 1 / 120); s.events.forEach(e => { if (e.type === 'hit') TRAFFIC[e.i]++; }); } }
function placeSmart(st, key, r) {
  let best = -1, bs = -1e9;
  E.SLOTS.forEach((sl, i) => {
    const o = st.board[i]; if (o && E.YAKUMONO[o.k].r >= E.YAKUMONO[key].r) return;
    let sc = TRAFFIC[i] + (o ? -50 : 0);
    if (key === 'dango' || key === 'hanabi') sc += 60 * sl.nb.filter(j => st.board[j] && (key === 'hanabi' || st.board[j].k === 'dango')).length;
    if (sc > bs) { bs = sc; best = i; }
  });
  if (best >= 0) st.board[best] = { k: key };
}
function aimSmart(st) {
  const col = {}; st.board.forEach((o, i) => { if (o) { const x = Math.round(E.SLOTS[i].x / 25); col[x] = (col[x] || 0) + 1; } });
  const k = Object.keys(col).sort((a, b) => col[b] - col[a])[0];
  return k ? k * 25 : 180;
}
function place(st, key, r) {
  if (SMART) return placeSmart(st, key, r);
  const center = E.SLOTS.map((s, i) => i).filter(i => E.SLOTS[i].x > 70 && E.SLOTS[i].x < 290 && E.SLOTS[i].row >= 1);
  const empty = center.filter(i => !st.board[i]);
  const i = empty.length ? empty[Math.floor(r() * empty.length)] : center[Math.floor(r() * center.length)];
  st.board[i] = { k: key };
}
function playMatch(st, n, k, r) {
  const boss = k === 2 ? E.opponent(n, k) : null, tgt = E.target(n, k);
  let balls = E.BASE_BALLS + st.extraBalls;
  const disabled = new Set();
  if (boss && boss.fx === 'bake') E.shuffle(st.board.map((o, i) => o ? i : -1).filter(i => i >= 0), r).slice(0, 2).forEach(i => disabled.add(i));
  const pockets = E.matchPockets(st.pockets, boss);
  let total = 0;
  while (balls-- > 0) {
    const d = E.draft(r, n); d.sort((a, b) => E.YAKUMONO[b].r - E.YAKUMONO[a].r);
    place(st, d[0], r);
    const xs = st.board.map((o, i) => o ? E.SLOTS[i].x : null).filter(x => x != null);
    const x = SMART ? aimSmart(st) + (r() - .5) * 20 : xs[Math.floor(r() * xs.length)] + (r() - .5) * 30;
    const s = E.runShot(x, { board: st.board, pockets, disabled, block: boss && boss.fx === 'block', shake: boss && boss.fx === 'shake', neon: boss && boss.fx === 'neon', r });
    total += E.shotTotal(s); st.money += s.coins;
    if (total >= tgt) return { win: true, balls: balls + 1 };
  }
  return { win: false };
}
function run(seed) {
  const r = E.rng(seed);
  const st = { board: E.newBoard(), pockets: E.POCKETS_START.slice(), money: 4, extraBalls: 0 };
  for (let n = 1; n <= 7; n++) for (let k = 0; k < 3; k++) {
    const res = playMatch(st, n, k, r);
    if (!res.win) return n * 3 + k;
    st.money += E.REWARD[k] + res.balls + Math.min(5, Math.floor(st.money / 5));
    while (st.money >= 5) { st.money -= 5; st.pockets[1 + Math.floor(r() * 5)]++; }
  }
  return 99;
}
const died = {};
for (let i = 0; i < N; i++) { const x = run(i + 1); died[x] = (died[x] || 0) + 1; }
let alive = N;
console.log(SMART ? '【かしこいボット】' : '【でたらめボット】');
for (let n = 1; n <= 6; n++) for (let k = 0; k < 3; k++) {
  const d = died[n * 3 + k] || 0;
  console.log(`夜${n} ${E.MATCH_NAME[k]} 目標${E.target(n, k)}  挑戦${alive} 負け${d}  勝率${alive ? Math.round((alive - d) / alive * 100) : 0}%`);
  alive -= d;
}
