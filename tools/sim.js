// ボットで、夜ごとの勝ち抜き率を調べる（1勝負に役物を PICKS 回置いて、手玉を全部いっぺんに落とす）
// 使い方: node tools/sim.js [回数] [smart]
//   smart：よく通る場所に置き、だんごはだんごの横へ、役物の多い列をねらう。玉袋も買う
const E = require('../src/engine.js');
const N = +process.argv[2] || 300;
const SMART = process.argv.includes('smart');
// calib：負けなしで全部打ち、勝負ごとの合計の分布を出す（目標を決めるため）
const CALIB = process.argv.includes('calib'), CAL = {};

// 何もない盤で、どの釘に玉がよく当たるか
const TRAFFIC = E.SLOTS.map(() => 0);
{ const r = E.rng(99), b = E.SLOTS.map(() => null);
  E.SLOTS.forEach((s, i) => { b[i] = { k: 'suzu', c: E.ANY }; });   // 全部に置いて当たりを数える（ふえた玉は数えない）
  for (let t = 0; t < 300; t++) { const s = E.newShot(60 + r() * 240, { board: b.map(o => ({ ...o })), pockets: E.POCKETS_START, disabled: new Set(), r }, 0);
    while (!s.done) E.stepShot(s, 1 / 120); s.events.forEach(e => { if (e.type === 'hit' && !e.chain) TRAFFIC[e.i]++; }); } }

function score(o) { return [1, 2.2, 4][E.YAKUMONO[o.k].r]; }
function placeSmart(st, o) {
  let best = -1, bs = -1e9;
  E.SLOTS.forEach((sl, i) => {
    const cur = st.board[i]; if (cur && score(cur) >= score(o)) return;
    let sc = TRAFFIC[i] - (cur ? 30 : 0);
    if (o.k === 'dango') sc += 40 * sl.nb.filter(j => st.board[j] && st.board[j].k === 'dango').length;
    if (sc > bs) { bs = sc; best = i; }
  });
  if (best >= 0) st.board[best] = { ...o };
}
function placeRandom(st, o, r) {
  const center = E.SLOTS.map((s, i) => i).filter(i => E.SLOTS[i].x > 70 && E.SLOTS[i].x < 290 && E.SLOTS[i].row >= 1);
  const empty = center.filter(i => !st.board[i]);
  const i = empty.length ? empty[Math.floor(r() * empty.length)] : center[Math.floor(r() * center.length)];
  st.board[i] = { ...o };
}
function aim(st, color, r) {
  if (!SMART) { const xs = st.board.map((o, i) => o ? E.SLOTS[i].x : null).filter(x => x != null); return xs[Math.floor(r() * xs.length)] + (r() - .5) * 30; }
  // その色に反応する役物が多い列をねらう
  const col = {};
  st.board.forEach((o, i) => { if (o && E.colorMatch(color, o.c)) { const x = Math.round(E.SLOTS[i].x / 25); col[x] = (col[x] || 0) + 1 + (E.SLOTS[i].row < 3 ? 1 : 0); } });
  const k = Object.keys(col).sort((a, b) => col[b] - col[a])[0];
  return (k ? k * 25 : 180) + (r() - .5) * 20;
}
function playMatch(st, n, k, r) {
  const boss = k === 2 ? E.opponent(n, k) : null, tgt = E.target(n, k);
  const hand = E.makeHand(r, st.extraBalls, boss);
  const disabled = new Set();
  if (boss && boss.fx === 'bake') E.shuffle(st.board.map((o, i) => o ? i : -1).filter(i => i >= 0), r).slice(0, 2).forEach(i => disabled.add(i));
  const pockets = E.matchPockets(st.pockets, boss);
  for (let t = 0; t < E.PICKS; t++) {
    const d = E.draft(r, n); d.sort((a, b) => E.YAKUMONO[b.k].r - E.YAKUMONO[a.k].r);
    SMART ? placeSmart(st, d[0]) : placeRandom(st, d[0], r);
  }
  // 手玉の色でいちばん多い色にねらいを合わせて、全部いっぺんに落とす
  const cnt = [0, 0, 0]; hand.forEach(c => { if (c < E.NC) cnt[c]++; });
  const main = cnt.indexOf(Math.max(...cnt));
  const s = E.runShot(aim(st, main, r), { board: st.board, pockets, disabled, block: boss && boss.fx === 'block', shake: boss && boss.fx === 'shake', r }, hand);
  const total = E.shotTotal(s); st.shots.push(total); E.afterShot(s); st.money += s.coins || 0;
  if (total >= tgt && !CALIB) return { win: true, balls: 0 };
  if (CALIB) { (CAL[n * 3 + k] = CAL[n * 3 + k] || []).push(total); return { win: true, balls: 0 }; }
  return { win: false };
}
function run(seed) {
  const r = E.rng(seed);
  const st = { board: E.newBoard(), pockets: E.POCKETS_START.slice(), money: 4, extraBalls: 0, shots: [] };
  for (let n = 1; n <= 7; n++) for (let k = 0; k < 3; k++) {
    const res = playMatch(st, n, k, r);
    if (!res.win) return { at: n * 3 + k, shots: st.shots };
    st.money += E.REWARD[k] + res.balls + Math.min(5, Math.floor(st.money / 5));
    // 屋台：玉袋 → 入賞口みがき（かしこいボットだけ）
    if (SMART) {
      const bag = 6 + st.extraBalls * 3;
      if (st.money >= bag) { st.money -= bag; st.extraBalls++; }
      while (st.money >= 4 + st.pockets[3]) { st.money -= 4 + st.pockets[3]; st.pockets[2 + Math.floor(r() * 3)]++; }
    } else while (st.money >= 5) { st.money -= 5; st.pockets[1 + Math.floor(r() * 5)]++; }
  }
  return { at: 99, shots: st.shots };
}
const died = {}; let shots = [];
for (let i = 0; i < N; i++) { const x = run(i + 1); died[x.at] = (died[x.at] || 0) + 1; shots = shots.concat(x.shots); }
let alive = N;
console.log(SMART ? '【かしこいボット】' : '【でたらめボット】');
for (let n = 1; n <= 6; n++) for (let k = 0; k < 3; k++) {
  const d = died[n * 3 + k] || 0;
  console.log(`夜${n} ${E.MATCH_NAME[k]} 目標${E.target(n, k)}  挑戦${alive} 負け${d}  勝率${alive ? Math.round((alive - d) / alive * 100) : 0}%`);
  alive -= d;
}
if (CALIB) for (let n = 1; n <= 7; n++) for (let k = 0; k < 3; k++) {
  const a = (CAL[n * 3 + k] || []).sort((x, y) => x - y), q = f => a[Math.floor(a.length * f)];
  console.log(`夜${n} ${E.MATCH_NAME[k]} 合計：10% ${q(.1)}  20% ${q(.2)}  中央 ${q(.5)}  90% ${q(.9)}`);
}
shots.sort((a, b) => a - b);
console.log('1発の玉：中央値', shots[shots.length >> 1], ' 上位10%', shots[Math.floor(shots.length * .9)], ' 最大', shots[shots.length - 1]);
