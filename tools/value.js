// 役物ごとの強さをくらべる：ふつうの盤に、その役物を3つ足したら1発の点がどれだけ上がるか
// 使い方: node tools/value.js [1種類あたりの発数]
const E = require('../src/engine.js');
const N = +process.argv[2] || 600;
const TRAFFIC = E.SLOTS.map(() => 0);
{ const r = E.rng(99), b = E.SLOTS.map(() => null);
  for (let t = 0; t < 400; t++) { const s = E.runShot(60 + r() * 240, { board: b, pockets: E.POCKETS_START, disabled: new Set(), r }); s.events.forEach(e => { if (e.type === 'hit') TRAFFIC[e.i]++; }); } }
const order = E.SLOTS.map((s, i) => i).sort((a, b) => TRAFFIC[b] - TRAFFIC[a]);
// ふつうの盤：よく通る場所のうち、ちょうちん4・鈴3・だんご2（中盤くらい）
function baseBoard() {
  const b = E.SLOTS.map(() => null);
  ['chochin', 'suzu', 'chochin', 'dango', 'suzu', 'chochin', 'dango', 'suzu', 'chochin'].forEach((k, j) => b[order[j * 2]] = { k });
  return b;
}
function avg(board, seed) {
  const r = E.rng(seed); let t = 0, mx = 0;
  for (let i = 0; i < N; i++) { const s = E.runShot(150 + r() * 60, { board: board.map(o => o && { ...o }), pockets: E.POCKETS_START, disabled: new Set(), r }); const v = E.shotTotal(s); t += v; mx = Math.max(mx, v); }
  return { avg: t / N, max: mx };
}
const base = avg(baseBoard(), 7);
console.log('ふつうの盤だけ：平均', Math.round(base.avg));
const rows = [];
for (const k of E.YAKUMONO_KEYS) {
  const b = baseBoard();
  let added = 0;
  for (const i of order) { if (added >= (+process.env.COPIES || 3)) break; if (!b[i]) { b[i] = { k }; added++; } }
  const v = avg(b, 7);
  rows.push([k, E.YAKUMONO[k].r, Math.round(v.avg), Math.round(v.avg / base.avg * 100) + '%', Math.round(v.max)]);
}
rows.sort((a, b) => a[1] - b[1] || b[2] - a[2]);
console.log('役物 / レア度 / 3つ足した平均 / ふつうの盤との比 / 最大');
rows.forEach(r => console.log(r.join('\t')));
