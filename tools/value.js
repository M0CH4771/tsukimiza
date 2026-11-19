// 役物ごとの強さをくらべる：ふつうの盤に、その役物を足したら1発の玉がどれだけふえるか
// 使い方: node tools/value.js [1種類あたりの発数]   （COPIES=1 で1つだけ足す。色は3色に1つずつ回す）
const E = require('../src/engine.js');
const N = +process.argv[2] || 400, COPIES = +process.env.COPIES || 3;
const TRAFFIC = E.SLOTS.map(() => 0);
{ const r = E.rng(99), b = E.SLOTS.map(() => ({ k: 'suzu', c: E.ANY }));
  for (let t = 0; t < 300; t++) { const s = E.runShot(60 + r() * 240, { board: b, pockets: E.POCKETS_START, disabled: new Set(), r }, 0); s.events.forEach(e => { if (e.type === 'hit') TRAFFIC[e.i]++; }); } }
const order = E.SLOTS.map((s, i) => i).sort((a, b) => TRAFFIC[b] - TRAFFIC[a]);
function baseBoard() {   // 中盤くらい：5色のちょうちんと鈴とだんご
  const b = E.SLOTS.map(() => null);
  [['chochin', 0], ['suzu', -1], ['chochin', 1], ['dango', 2], ['chochin', 2], ['suzu', -1], ['chochin', 0], ['dango', 0]].forEach(([k, c], j) => b[order[j * 2]] = { k, c });
  return b;
}
function avg(board) {
  const r = E.rng(7); let t = 0, mx = 0;
  for (let i = 0; i < N; i++) { const s = E.runShot(150 + r() * 60, { board: board.map(o => o && { ...o }), pockets: E.POCKETS_START, disabled: new Set(), r }, i % E.NC); const v = E.shotTotal(s); t += v; mx = Math.max(mx, v); }
  return { avg: t / N, max: mx };
}
const base = avg(baseBoard());
console.log('ふつうの盤だけ：1発の平均', base.avg.toFixed(1));
const rows = [];
for (const k of E.YAKUMONO_KEYS) {
  const b = baseBoard(); let added = 0;
  for (const i of order) { if (added >= COPIES) break; if (!b[i]) { b[i] = { k, c: E.YAKUMONO[k].any ? E.ANY : added % E.NC }; added++; } }
  const v = avg(b);
  rows.push([k, E.YAKUMONO[k].r, v.avg.toFixed(1), Math.round(v.avg / base.avg * 100) + '%', v.max]);
}
rows.sort((a, b) => a[1] - b[1] || b[2] - a[2]);
console.log(`役物 / レア度 / ${COPIES}つ足した平均 / ふつうの盤との比 / 最大`);
rows.forEach(r => console.log(r.join('\t')));
