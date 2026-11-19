// ボットで、夜ごとの勝ち抜き率を調べる（1勝負に役物を PICKS 回置いて、手玉を全部いっぺんに落とす）
// 使い方: node tools/sim.js [回数] [smart] [calib]
//   smart：よく通る場所に、めずらしい役物から置く。いちばん役物が多い列をねらう。玉袋・入賞口みがきを買う
//   calib：負けなしで全部打ち、勝負ごとの合計の分布を出す（目標を決めるため）
const E = require('../src/engine.js');
const N = +process.argv[2] || 300;
const SMART = process.argv.includes('smart');
const CALIB = process.argv.includes('calib'), CAL = {}, CALB = {};

// 何もない盤で、どの釘に玉がよく当たるか（置き場所えらびに使う）
const TRAFFIC = E.SLOTS.map(() => 0);
{ const r = E.rng(99), b = E.SLOTS.map(() => ({ k: 'koban' }));
  for (let t = 0; t < 200; t++) { const s = E.runShot(120 + r() * 120, { board: b, pockets: E.POCKETS_START, disabled: new Set(), r }, 1); s.events.forEach(e => { if (e.type === 'hit') TRAFFIC[e.i]++; }); } }

const VAL = { chochin: 2, dango: 2, jishaku: 1.5, koban: 1, maneki: 4, koi: 3.5, taiko: 4.5, kingyo: 4, fox: 3.5, kaminari: 7, oni: 7, happa: 7, hanabi: 7 };
function placeSmart(st, o) {
  let best = -1, bs = -1e9;
  E.SLOTS.forEach((sl, i) => {
    const cur = st.board[i]; if (cur && VAL[cur.k] >= VAL[o.k]) return;
    let sc = TRAFFIC[i] - (cur ? 30 : 0);
    if (o.k === 'dango') sc += 40 * sl.nb.filter(j => st.board[j] && st.board[j].k === 'dango').length;
    if (o.k === 'taiko' || o.k === 'kingyo') sc += 10 * Math.abs(5 - E.pocketOf(sl.x)) * -1;
    if (sc > bs) { bs = sc; best = i; }
  });
  if (best >= 0) st.board[best] = { ...o };
}
function placeRandom(st, o, r) { st.board[Math.floor(r() * E.SLOTS.length)] = { ...o }; }
// いちばん役物が多い列をねらう
function aim(st, r) {
  const col = {};
  st.board.forEach((o, i) => { if (o) { const x = Math.round(E.SLOTS[i].x / 25); col[x] = (col[x] || 0) + VAL[o.k] * (E.SLOTS[i].row < 3 ? 2 : 1); } });
  const k = Object.keys(col).sort((a, b) => col[b] - col[a])[0];
  return (k ? k * 25 : 180) + (r() - .5) * 20;
}
function playMatch(st, n, k, r) {
  const boss = k === 2 ? E.opponent(n, k) : null, tgt = E.target(n, k);
  const disabled = new Set();
  if (boss && boss.fx === 'bake') E.shuffle(st.board.map((o, i) => o ? i : -1).filter(i => i >= 0), r).slice(0, 2).forEach(i => disabled.add(i));
  for (let t = 0; t < E.PICKS; t++) {
    const d = E.draft(r, n); d.sort((a, b) => VAL[b.k] - VAL[a.k]);
    SMART ? placeSmart(st, d[0]) : placeRandom(st, d[0], r);
  }
  const s = E.runShot(SMART ? aim(st, r) : 60 + r() * 240, { board: st.board, pockets: E.matchPockets(st.pockets, boss), disabled, shake: boss && boss.fx === 'shake', r }, E.handSize(st.extraBalls));
  const total = E.shotTotal(s); st.shots.push(total); st.balls.push(s.born);
  E.afterShot(s, st.pockets); st.money += s.coins;
  if (CALIB) { (CAL[n * 3 + k] = CAL[n * 3 + k] || []).push(total); (CALB[n * 3 + k] = CALB[n * 3 + k] || []).push(s.born); return true; }
  return total >= tgt;
}
function run(seed) {
  const r = E.rng(seed);
  const st = { board: E.newBoard(), pockets: E.POCKETS_START.slice(), money: 4, extraBalls: 0, shots: [], balls: [] };
  for (let n = 1; n <= 7; n++) for (let k = 0; k < 3; k++) {
    if (!playMatch(st, n, k, r)) return { at: n * 3 + k, st };
    st.money += E.REWARD[k] + Math.min(5, Math.floor(st.money / 5));
    if (SMART) {   // 屋台：玉袋 → 入賞口みがき（まんなか寄り）
      const bag = 6 + st.extraBalls * 3;
      if (st.money >= bag) { st.money -= bag; st.extraBalls++; }
      for (let g = 0; g < 2; g++) { const p = 3 + Math.floor(r() * 5); if (st.money >= 4 + st.pockets[p]) { st.money -= 4 + st.pockets[p]; st.pockets[p]++; } }
    }
  }
  return { at: 99, st };
}
const died = {}; let shots = [], balls = [];
for (let i = 0; i < N; i++) { const x = run(i + 1); died[x.at] = (died[x.at] || 0) + 1; shots = shots.concat(x.st.shots); balls = balls.concat(x.st.balls); }
let alive = N;
console.log(SMART ? '【かしこいボット】' : '【でたらめボット】');
if (!CALIB) for (let n = 1; n <= 6; n++) for (let k = 0; k < 3; k++) {
  const d = died[n * 3 + k] || 0;
  console.log(`夜${n} ${E.MATCH_NAME[k]} 目標${E.target(n, k)}  挑戦${alive} 負け${d}  勝率${alive ? Math.round((alive - d) / alive * 100) : 0}%`);
  alive -= d;
}
if (CALIB) for (let n = 1; n <= 7; n++) for (let k = 0; k < 3; k++) {
  const a = (CAL[n * 3 + k] || []).sort((x, y) => x - y), q = f => a[Math.floor(a.length * f)];
  const bb = (CALB[n * 3 + k] || []).sort((x, y) => x - y), qb = f => bb[Math.floor(bb.length * f)];
  console.log(`夜${n} ${E.MATCH_NAME[k]} 縁：10% ${q(.1)}  20% ${q(.2)}  中央 ${q(.5)}  90% ${q(.9)}　｜玉：中央 ${qb(.5)}  90% ${qb(.9)}`);
}
shots.sort((a, b) => a - b); balls.sort((a, b) => a - b);
const Q = (a, f) => a[Math.floor(a.length * f)];
console.log('1回の落としの縁：中央', Q(shots, .5), ' 上位10%', Q(shots, .9), ' 最大', shots[shots.length - 1]);
console.log('1回の落としで出た玉：中央', Q(balls, .5), ' 上位10%', Q(balls, .9), ' 最大', balls[balls.length - 1]);
