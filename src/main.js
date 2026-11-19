const SHEET_B64 = '/*__SHEET__*/';
const SHEET_IDX = /*__SHEETIDX__*/;
const BUSTS = /*__BUSTS__*/;
document.documentElement.style.setProperty('--sheet', `url(data:image/png;base64,${SHEET_B64})`);
const SHEET = new Image(); SHEET.src = 'data:image/png;base64,' + SHEET_B64;

// 対局まわりの台詞（物語は story.js）
const T = {
  bossHi: {
    ponta: ['s', 'オイラの番だ！ 台に葉っぱ？ 知らないなあ。へへ。'],
    ohana: ['s', '今夜は花冷え。入賞口も、ひんやりしてるよ。'],
    gonzo: ['n', '金棒を、どけてみろ。'],
    uzuki: ['s', '真夜中は餅つきです。ぺったんぺったん、ゆれますよー。'],
    ao: ['x', '光ってあげる。役物なんか、かすむくらいにね。'],
    tetsu: ['n', '……おれの釘を、越えてみろ。'],
  },
  bossLose: {
    ponta: ['s', 'へへーん！ 葉っぱ一枚で百倍だ！'],
    ohana: ['x', 'ふふ、今夜は桜が味方してくれたみたい。'],
    gonzo: ['n', '……だんご百本だ。'],
    uzuki: ['x', 'ご、ごめんなさい、ゆらしすぎました……。'],
    ao: ['s', 'ほらね。だれも月なんか見ないの。'],
    tetsu: ['x', '……まだだ。'],
  },
  // 宵・夜ふけに、ギンコが言うこと
  tips: ['今夜もじゃらじゃら打とう！', '役物は、自分と同じ色の玉が当たったときだけふえるよ。手玉に多い色の役物を育てよう！', '玉はぜんぶ同じところから落ちるよ。役物が縦にならんだ列をねらうと強い！', 'だんごは、だんごのとなり！ ひとつだけだと ふえないよ。', '金魚は当たった勝負ごとに育つの。早めに置くのがおすすめ！', '染めの鈴で玉の色をそろえると、同じ色の役物が続けて反応するよ。', '桜は、ふえた玉の色を変えるよ。赤の桜の下に青の役物を置くと、つながる！', '小判に当たると縁銭がもらえるよ。玉袋を買うのに使おう。', 'おコンの算盤は、盤に同じ色の役物が多いほど強くなるよ。'],
  shop: ['まいど。月見座の前に、屋台を出させてもらいました。', '今夜もよい品がそろっております。', 'お代は縁銭で。安くはありませんよ。'],
  bought: ['お目が高い。', 'まいど。よい場所に置いてやってください。', 'それは、よく当たりますよ。'],
};

// ===== 部品 =====
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function spr(k, size) {
  const i = SHEET_IDX[k]; if (i == null) return '';
  const x = (i % 16) / 15 * 100, y = Math.floor(i / 16) / 10 * 100;
  return `<i class="spr" style="background-position:${x}% ${y}%;${size ? `width:${size};height:${size}` : ''}"></i>`;
}
// 新キャラの仮の顔（あとで描いた絵に差しかえる）
const TEMP_FACES = {};
function tempFace(who, f) {
  const key = who + f; if (TEMP_FACES[key]) return TEMP_FACES[key];
  const c = document.createElement('canvas'); c.width = c.height = 176; const g = c.getContext('2d');
  g.fillStyle = { ginko: '#2a2440', tetsu: '#1f2a24', uzuki: '#3a2440', ao: '#0c1a2e' }[who]; g.fillRect(0, 0, 176, 176);
  if (who === 'uzuki') {
    g.fillStyle = '#fbf6f0';
    g.beginPath(); g.ellipse(60, 40, 13, 38, -.15, 0, Math.PI * 2); g.ellipse(116, 40, 13, 38, .15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffc6d6'; g.beginPath(); g.ellipse(60, 42, 6, 26, -.15, 0, Math.PI * 2); g.ellipse(116, 42, 6, 26, .15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbf6f0'; g.beginPath(); g.arc(88, 104, 58, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff9ccf88'; g.beginPath(); g.arc(54, 116, 9, 0, Math.PI * 2); g.arc(122, 116, 9, 0, Math.PI * 2); g.fill();
  } else if (who === 'ao') {
    g.shadowColor = '#5ad7ff'; g.shadowBlur = 16; g.strokeStyle = '#5ad7ff'; g.lineWidth = 5;
    g.beginPath(); g.arc(88, 96, 56, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ff5ad1'; g.beginPath(); g.moveTo(40, 52); g.lineTo(66, 30); g.lineTo(88, 48); g.lineTo(110, 30); g.lineTo(136, 52); g.stroke();
    g.shadowBlur = 0;
  } else if (who === 'ginko') {
    const rg = g.createRadialGradient(70, 66, 8, 88, 92, 70); rg.addColorStop(0, '#ffffff'); rg.addColorStop(.45, '#cfd6e2'); rg.addColorStop(1, '#6e7690');
    g.fillStyle = rg; g.beginPath(); g.arc(88, 92, 66, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff9ccf88'; g.beginPath(); g.arc(52, 108, 10, 0, Math.PI * 2); g.arc(124, 108, 10, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = '#5f9f6e'; g.beginPath(); g.arc(88, 100, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8f0e0'; g.beginPath(); g.ellipse(88, 46, 34, 12, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f3f3f3'; g.lineWidth = 4; g.beginPath(); g.moveTo(62, 140); g.lineTo(70, 156); g.moveTo(88, 142); g.lineTo(88, 160); g.moveTo(114, 140); g.lineTo(106, 156); g.stroke();
  }
  g.fillStyle = who === 'ao' ? '#5ad7ff' : '#1d1424'; g.strokeStyle = g.fillStyle; g.lineWidth = 4;
  if (f === 's') { g.beginPath(); g.arc(66, 92, 8, Math.PI, 0); g.arc(110, 92, 8, Math.PI, 0); g.stroke(); }
  else if (f === 'x' && who === 'ginko') { g.beginPath(); g.arc(66, 90, 7, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(102, 90); g.lineTo(118, 90); g.stroke(); }
  else if (f === 'x') { g.fillRect(58, 88, 16, 4); g.fillRect(102, 88, 16, 4); }
  else { g.beginPath(); g.arc(66, 90, f === 'o' ? 9 : 7, 0, Math.PI * 2); g.arc(110, 90, f === 'o' ? 9 : 7, 0, Math.PI * 2); g.fill(); }
  g.beginPath();
  if (f === 'o') { g.arc(88, 120, 8, 0, Math.PI * 2); g.stroke(); }
  else if (f === 's') { g.arc(88, 112, 14, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
  else { g.moveTo(78, 120); g.lineTo(98, 120); g.stroke(); }
  g.fillStyle = '#ffffff55'; g.font = '14px DotGothic16, monospace'; g.textAlign = 'right'; g.fillText('仮の絵', 170, 170);
  return (TEMP_FACES[key] = c.toDataURL());
}
// 新キャラの顔は art/face/ の絵（読めないときは仮の絵）
function face(who, f) {
  if (CHARS[who] && CHARS[who].art) return `art/face/${who}_${f || 'n'}.jpg`;
  return BUSTS[`${who}_${f || 'n'}`] || BUSTS[`${who}_n`];
}
function nm(t) { return String(t).replace(/\{name\}/g, S && S.name ? S.name : playerName()); }
function show(id) {
  if (id !== 's-play') { const d = document.getElementById('draftPanel'); if (d) d.remove(); }   // 役物えらびの窓は、対局の画面でだけ出す
  ['s-title', 's-vs', 's-play', 's-res', 's-shop', 's-over'].forEach(s => $(s).classList.toggle('hidden', s !== id)); window.scrollTo(0, 0);
}
function sheet(html) {
  const el = document.createElement('div'); el.className = 'sheet';
  el.innerHTML = `<div class="in px">${html}<button class="btn wide" data-close style="margin-top:12px">とじる</button></div>`;
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
  $('layer').appendChild(el); return el;
}
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function playerName() { return store('pachinko-name') || 'ツグミ'; }

// ===== 会話 =====
// lines: [{bg}, {title}, {who, f, t, anon}] または [who, f, t]
function talk(lines) {
  lines = lines.map(l => Array.isArray(l) ? { who: l[0], f: l[1], t: l[2] } : l);
  return new Promise(done => {
    let i = 0, bg = '', cg = '';
    const el = document.createElement('div'); el.className = 'talk';
    const finish = () => { el.remove(); done(); };
    const draw = () => {
      // 背景と章題は読みとばして、次のせりふまで進める
      let title = '', fx = '';
      while (i < lines.length && !lines[i].who) {
        if (lines[i].bg != null) { bg = lines[i].bg; cg = ''; }
        if (lines[i].cg) { cg = lines[i].cg; seeCg(cg); }
        if (lines[i].title) title = lines[i].title;
        if (lines[i].fx) fx = lines[i].fx;
        i++;
      }
      if (i >= lines.length) { finish(); return; }
      const L = lines[i], ch = CHARS[L.who] || { n: '' };
      const src = BGS[bg];
      const bgHTML = cg ? `<div class="bgimg cg" style="background-image:url(cg/${cg}.jpg)"></div>`
        : `<div class="bgimg" style="${src ? `background-image:url(${src})` : ''}"></div>${fx === 'moon' ? '<div class="moonfx"></div>' : ''}`;
      const nameTxt = L.anon ? '？？？' : nm(ch.n);
      const body = L.who === 'narr'
        ? `<div class="msg px narr">${esc(nm(L.t))}<span class="tap">▼ タップ</span></div>`
        : `<img class="face" src="${face(L.who, L.f)}" alt="" onerror="this.onerror=null;this.src=tempFace('${L.who}','${L.f || 'n'}')"><div class="msg px"><div class="nm" style="color:${ch.c}">${esc(nameTxt)}</div>${esc(nm(L.t))}<span class="tap">▼ タップ</span></div>`;
      el.innerHTML = `${bgHTML}<button class="skip" data-skip>スキップ ▶▶</button>${title ? `<div class="ttl">${esc(title)}</div>` : ''}<div class="box">${body}</div>`;
    };
    el.addEventListener('click', e => {
      if (e.target.closest('[data-skip]')) { finish(); return; }
      i++; draw();
    });
    $('layer').appendChild(el); draw();
  });
}
// 見た挿絵をおぼえておく（タイトルの「挿絵」で見返せる）
function seeCg(k) { const s = store('pachinko-cg') || {}; if (!s[k]) { s[k] = 1; store('pachinko-cg', s); } }
function gallery() {
  const seen = store('pachinko-cg') || {};
  const el = sheet(`<h3>挿絵</h3><div class="gal">${Object.entries(CGS).map(([k, c]) => seen[k]
    ? `<button class="gi" data-cg="${k}"><img src="cg/${k}.jpg" alt="" loading="lazy"><span>${c.ch}<br>${c.t}</span></button>`
    : `<div class="gi lock"><span>${c.ch}<br>？？？</span></div>`).join('')}</div>`);
  el.querySelectorAll('[data-cg]').forEach(b => b.onclick = () => {
    const v = document.createElement('div'); v.className = 'cgview';
    v.innerHTML = `<img src="cg/${b.dataset.cg}.jpg" alt="">`;
    v.onclick = () => v.remove(); $('layer').appendChild(v);
  });
}
async function scene(key) { const sc = SCENES[key]; if (!sc) return; await talk(sc); const seen = store('pachinko-seen-scenes') || {}; seen[key] = 1; store('pachinko-seen-scenes', seen); }

// 色の見た目
const NIJI_GRAD = 'linear-gradient(90deg,#e8453c,#f2c94e,#4cbf5a,#3a8ee8,#a35ad8)';
function colorCss(c) { return c === NIJI || c === ANY ? NIJI_GRAD : COLORS[c].c; }
function colorChip(c) { return `<span class="cchip" style="background:${colorCss(c)}"></span>${colorName(c)}`; }
function pieceIcon(o, size) { return `<span class="picon" style="--pc:${colorCss(o.c)}">${spr(YAKUMONO[o.k].s, size)}</span>`; }
// o は {k, c}（色つき）か、役物の名前だけ
function itemRow(o, extra = '') {
  if (typeof o === 'string') o = { k: o, c: YAKUMONO[o].any ? ANY : null };
  const Y = YAKUMONO[o.k];
  const title = o.c == null ? Y.n : pieceName(o);
  const col = o.c == null ? '<span class="cchip" style="background:' + NIJI_GRAD + '"></span>色は置くときに決まる' : colorChip(o.c);
  return `<div class="item px"><div class="ic">${o.c == null ? spr(Y.s, '40px') : pieceIcon(o, '40px')}</div><div class="tx"><b>${title}</b><span style="color:${['#cfc6e2', '#7fb6ef', '#f2c14e'][Y.r]}">［${RARITY_NAME[Y.r]}］</span>${col}<br>${Y.d}${extra}</div></div>`;
}
function listSheet(onlyBoard) {
  const keys = onlyBoard ? S.board.filter(Boolean).filter((o, i, a) => a.findIndex(x => x.k === o.k && x.c === o.c) === i) : YAKUMONO_KEYS;
  sheet(`<h3>${onlyBoard ? '盤にある役物' : '役物の一覧'}</h3>${keys.map(k => itemRow(k)).join('')}
    <p style="color:var(--mute);font-size:12px;line-height:1.6;margin:8px 0 0">縁 ＝ 入賞口に入った玉の数（×3の入賞口なら3つ分）。<br>役物は、自分と同じ色の玉が当たるとふえる（「どの色でも」の役物もある）。虹の玉は、どの色の役物にも反応する。虹の玉から分かれた玉は、その役物の色になる。<br>1つの玉は同じ役物で1回だけ。分かれた玉は新しい玉なので、下の役物でまたふえる。</p>`);
}
function moonSVG(p) {
  // p: 0〜1（光っている割合）。右から満ちていく
  const r = 12, k = 1 - 2 * p;   // 明暗の境目の楕円
  const rx = Math.abs(k) * r;
  const sweep = k > 0 ? 0 : 1;
  return `<svg viewBox="-13 -13 26 26"><circle r="12" fill="#2a2440" stroke="#41345e"/><path d="M0,-12 A12,12 0 0,1 0,12 A${rx},12 0 0,${sweep} 0,-12" fill="#ffe9a8"/></svg>`;
}

// ===== 盤を描く =====
const DPR = Math.min(2, window.devicePixelRatio || 1);
function setupCanvas(cv) { cv.width = W * DPR; cv.height = H * DPR; const c = cv.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.imageSmoothingEnabled = false; return c; }
function drawSprite(c, k, x, y, size) {
  const i = SHEET_IDX[k]; if (i == null || !SHEET.complete) return;
  c.drawImage(SHEET, (i % 16) * 32, Math.floor(i / 16) * 32, 32, 32, x - size / 2, y - size / 2, size, size);
}
function ringStyle(c, col, x, y) {
  if (col !== ANY && col !== NIJI) return COLORS[col].c;
  const g = c.createConicGradient ? c.createConicGradient(0, x, y) : null;
  if (!g) return '#ffffff';
  ['#e8453c', '#f2c94e', '#4cbf5a', '#3a8ee8', '#a35ad8', '#e8453c'].forEach((h, i) => g.addColorStop(i / 5, h));
  return g;
}
function ballStyle(c, b) {
  if (b.color === NIJI) return ringStyle(c, NIJI, b.x, b.y);
  const rg = c.createRadialGradient(b.x - 2, b.y - 3, 1, b.x, b.y, BALL_R);
  rg.addColorStop(0, '#ffffff'); rg.addColorStop(.35, COLORS[b.color].c); rg.addColorStop(1, '#1d1424');
  return rg;
}
function drawBoard(c, o) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a1c3a'); g.addColorStop(1, '#1d1028');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#ffffff10'; c.lineWidth = 1;
  for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = '#ffffff0c'; c.fillRect(0, 0, W, 64);
  if (o.block) {
    c.fillStyle = '#5a1a14'; c.beginPath(); c.arc(W / 2, 300, 30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ff6b6b'; c.lineWidth = 3; c.stroke();
    drawSprite(c, 'oni', W / 2, 300, 44);
  }
  SLOTS.forEach((s, i) => {
    const it = o.board[i], dis = o.disabled && o.disabled.has(i);
    const fl = o.flash && o.flash[i] != null ? Math.max(0, 1 - (o.t - o.flash[i]) / .35) : 0;
    if (it && !dis) {
      c.fillStyle = fl ? `rgba(255,226,168,${.35 + fl * .5})` : '#00000055';
      c.beginPath(); c.arc(s.x, s.y, ITEM_R + 3 + fl * 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = ringStyle(c, it.c, s.x, s.y); c.lineWidth = YAKUMONO[it.k].r === 2 ? 4 : 3;
      c.beginPath(); c.arc(s.x, s.y, ITEM_R + 3, 0, Math.PI * 2); c.stroke();
      drawSprite(c, YAKUMONO[it.k].s, s.x, s.y, 21 + fl * 6);
      if (it.k === 'kingyo') { c.fillStyle = '#ffe2a8'; c.font = '10px DotGothic16, monospace'; c.textAlign = 'center'; c.fillText('+' + YAKUMONO.kingyo.add(it), s.x + 10, s.y + 16); }
    } else if (it && dis) {
      c.fillStyle = '#2f6b2a'; c.beginPath(); c.arc(s.x, s.y, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9fe08a'; c.font = '12px DotGothic16, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('葉', s.x, s.y + 1); c.textBaseline = 'alphabetic';
    } else {
      c.fillStyle = fl ? '#fff' : '#cfc8dc'; c.beginPath(); c.arc(s.x, s.y, NAIL_R, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff99'; c.beginPath(); c.arc(s.x - 1.2, s.y - 1.2, 1.3, 0, Math.PI * 2); c.fill();
    }
    if (o.sel) {
      c.strokeStyle = it ? '#ff8a7a99' : '#f2c14eaa'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
      c.beginPath(); c.arc(s.x, s.y, ITEM_R + (it ? 6 : 2), 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    }
  });
  if (o.ghost != null) { const s = SLOTS[o.ghost]; c.globalAlpha = .7; drawSprite(c, YAKUMONO[o.ghostK.k].s, s.x, s.y, 24); c.globalAlpha = 1; }
  const pw = W / 7;
  for (let p = 0; p < 7; p++) {
    const x = p * pw, m = o.pockets[p];
    const fl = o.pflash && o.pflash[p] != null ? Math.max(0, 1 - (o.t - o.pflash[p]) / .6) : 0;
    c.fillStyle = fl ? `rgba(242,193,78,${.4 + fl * .5})` : (m === 0 ? '#111' : m >= 3 ? '#6e2620' : m >= 2 ? '#4a2a5a' : '#2a1d3a');
    c.fillRect(x + 2, POCKET_Y, pw - 4, H - POCKET_Y - 4);
    c.fillStyle = '#0b0812'; c.fillRect(x - 2, POCKET_Y - 8, 4, H - POCKET_Y + 8);
    c.fillStyle = m === 0 ? '#ff6b6b' : m >= 3 ? '#ffe2a8' : '#f3e9d2'; c.font = `${m >= 3 ? 20 : 17}px DotGothic16, monospace`; c.textAlign = 'center';
    c.fillText(m === 0 ? '締' : '×' + m, x + pw / 2, POCKET_Y + 38);
  }
  if (o.aim != null) {
    c.strokeStyle = '#ffe2a8aa'; c.setLineDash([4, 5]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(o.aim, 34); c.lineTo(o.aim, 100); c.stroke(); c.setLineDash([]);
    c.fillStyle = ballStyle(c, { x: o.aim, y: 34, color: o.next == null ? 0 : o.next }); c.beginPath(); c.arc(o.aim, 34, BALL_R, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe2a8'; c.beginPath(); c.moveTo(o.aim - 7, 14); c.lineTo(o.aim + 7, 14); c.lineTo(o.aim, 22); c.fill();
  }
  (o.balls || []).forEach(b => {
    if (!b.alive) return;
    c.fillStyle = ballStyle(c, b); c.beginPath(); c.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); c.fill();
    if (b.w > 1) {   // 盤がいっぱいのときに乗った分（×何こ分）
      c.font = '9px DotGothic16, monospace'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#0b0812';
      c.strokeText('×' + b.w, b.x, b.y - BALL_R - 2); c.fillStyle = '#fff3c4'; c.fillText('×' + b.w, b.x, b.y - BALL_R - 2);
    }
  });
  (o.floats || []).forEach(f => {
    const a = Math.max(0, 1 - (o.t - f.t) / .9); if (!a) return;
    c.globalAlpha = a; c.font = `${f.big ? 16 : 12}px DotGothic16, monospace`; c.textAlign = 'center';
    c.fillStyle = '#000'; c.fillText(f.text, f.x + 1, f.y - (1 - a) * 22 - 15);
    c.fillStyle = f.color; c.fillText(f.text, f.x, f.y - (1 - a) * 22 - 16);
    c.globalAlpha = 1;
  });
}
function slotAt(cvEl, e, maxD = 26) {
  const r = cvEl.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  let best = -1, bd = maxD;
  SLOTS.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = i; } });
  return best;
}

// ===== 状態 =====
let S = null;
function newRun(story) {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  S = { seed, r: rng(seed), n: 1, k: 0, money: 4, board: newBoard(), pockets: POCKETS_START.slice(), tray: [], extraBalls: 0, best: 0, story, endless: !story, speed: S ? S.speed : 1, name: playerName() };
  clearSave();
}

// ===== セーブ（続きから遊ぶ） =====
// 区切りごとに、そこから再開できるだけの情報をブラウザに保存する
//   vs：相手の紹介の画面／play：手番のはじめ（役物えらび）／shop：藁人の屋台
const SAVE_KEY = 'tsukimiza-save';
function snap(where) {
  if (!S) return;
  store(SAVE_KEY, {
    v: 3, where, at: Date.now(),
    n: S.n, k: S.k, money: S.money, board: S.board, pockets: S.pockets, tray: S.tray, extraBalls: S.extraBalls,
    best: S.best, story: S.story, endless: S.endless, seed: S.seed, rs: S.r.get(), speed: S.speed,
    shop: where === 'shop' ? S.shop : null, rerollCost: S.rerollCost,
    play: where === 'play' ? { score: S.score, hand: S.hand, tgt: S.tgt, disabled: [...S.disabled], draft: S.draft, picks: S.picks } : null,
  });
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function savedRun() { const d = store(SAVE_KEY); return d && d.v === 3 ? d : null; }   // 「全部いっぺんに落とす」ルールより前のセーブは使わない
function resume() {
  const d = savedRun(); if (!d) return;
  S = { seed: d.seed, r: rng(d.seed), n: d.n, k: d.k, money: d.money, board: d.board, pockets: d.pockets, tray: d.tray || [], extraBalls: d.extraBalls,
    best: d.best || 0, story: d.story, endless: d.endless, speed: d.speed || 1, name: playerName(), rerollCost: d.rerollCost || 2 };
  S.r.set(d.rs);
  $('speedLbl').textContent = S.speed === 1 ? 'ふつう' : 'はやい';
  if (d.where === 'shop' && d.shop) { S.shop = d.shop; enterShop(); return; }
  if (d.where === 'play' && d.play) { matchScreen(d.play); S.picks = d.play.picks || PICKS; S.phase = 'draft'; S.draft = d.play.draft; setHint(''); paint(); openDraft(); return; }
  showVs(true);
}
function curOpp() { return opponent(S.n, S.k); }
function curBoss() { return S.k === 2 ? curOpp() : null; }
function oppFace(o, big) { return o.who ? `<img src="${face(o.who, 'n')}" alt="">` : spr(o.s, big ? '110px' : '38px'); }

async function showVs(skipScenes) {
  const ns = !skipScenes && S.story && S.n <= STORY_NIGHTS ? NIGHT_SCENES[S.n - 1] : null;
  if (ns && S.k === 0) await scene(ns.intro);
  if (ns && S.k === 2) await scene(ns.mid);
  const o = curOpp(), boss = curBoss();
  const left = STORY_NIGHTS - S.n;
  $('vsNight').textContent = S.endless ? `エンドレス　夜${S.n}・${MATCH_NAME[S.k]}` : `夜${S.n}・${MATCH_NAME[S.k]}　${left > 0 ? `十五夜まで あと${left}晩` : '今夜が十五夜'}`;
  const mo = MOONS[Math.min(S.n - 1, MOONS.length - 1)];
  $('vsMoon').innerHTML = S.endless ? `${moonSVG(1)}<span>横丁の月：満月</span>` : `${moonSVG(mo.p)}<span>横丁の月：${mo.n}</span>`;
  $('vsFace').innerHTML = oppFace(o, true);
  $('vsName').textContent = boss ? `真夜中のできごと：${o.n}` : `${MATCH_NAME[S.k]}の打ち場`;
  $('vsRule').innerHTML = boss ? `<div class="rule">${boss.rule}：${boss.rd}</div>` : '';
  $('vsLine').textContent = boss ? `「${nm(T.bossHi[boss.who][1])}」` : `ギンコ「${T.tips[Math.floor(S.r() * T.tips.length)]}」`;
  $('vsTgt').textContent = target(S.n, S.k).toLocaleString();
  show('s-vs');
  snap('vs');
}

// ===== 対局 =====
// 1手番：役物を3つから1つえらぶ → 盤の釘に置く → 玉を打つ
const cv = $('cv'), ctx = setupCanvas(cv);
let V = null;
function startMatch() {
  const boss = curBoss();
  const dis = [];
  if (boss && boss.fx === 'bake') shuffle(S.board.map((o, i) => o ? i : -1).filter(i => i >= 0), S.r).slice(0, 2).forEach(i => dis.push(i));
  matchScreen({ score: 0, hand: makeHand(S.r, S.extraBalls, boss), tgt: target(S.n, S.k), disabled: dis });
  S.picks = PICKS;
  nextTurn();
}
// 対局の画面を用意する（はじめから・続きからの両方で使う）
function matchScreen(m) {
  const boss = curBoss();
  S.tgt = m.tgt; S.score = m.score; S.hand = m.hand.slice(); S.balls = S.hand.length;
  S.disabled = new Set(m.disabled);
  S.pk = matchPockets(S.pockets, boss);
  V = { aim: null, floats: [], flash: {}, pflash: {}, t: 0, balls: [], ghost: null };
  const o = curOpp();
  $('pFace').innerHTML = oppFace(o); $('pName').textContent = boss ? o.n : '月見座';
  $('pNight').textContent = `夜${S.n}・${MATCH_NAME[S.k]}`; $('pTgt').textContent = S.tgt.toLocaleString();
  $('pRule').classList.toggle('hidden', !boss); if (boss) $('pRule').textContent = `${boss.rule}：${boss.rd}`;
  setCalc(0, 0, 0);
  show('s-play'); hud();
}
function hud() {
  $('pScore').textContent = S.score.toLocaleString();
  $('pBar').style.width = Math.min(100, S.score / S.tgt * 100) + '%';
  $('pBalls').innerHTML = S.hand.length ? S.hand.map(c => `<i class="hb" style="background:${colorCss(c)}"></i>`).join('') : '0';
  $('pMoney').textContent = S.money;
}
// 下の数字：盤の上の玉／入った玉の数／縁（入賞口の倍率をかけた数）
function setCalc(alive, landed, tot) { $('cMon').textContent = alive.toLocaleString(); $('cMul').textContent = landed.toLocaleString(); $('cTot').textContent = tot.toLocaleString(); }
function paint() {
  drawBoard(ctx, { board: S.board, pockets: S.pk, disabled: S.disabled, block: curBoss() && curBoss().fx === 'block', balls: V.balls, floats: V.floats, aim: V.aim, next: S.hand && S.hand[0], flash: V.flash, pflash: V.pflash, t: V.t, sel: S.phase === 'place', ghost: V.ghost, ghostK: S.pending });
}
function setHint(t) { $('hint').innerHTML = t; $('hint').classList.toggle('hidden', !t); }
function nextTurn() {
  S.phase = 'draft'; S.pending = null; V.ghost = null;
  S.draft = draft(S.r, S.n);
  setHint(''); $('placeBar').classList.add('hidden');
  snap('play');
  paint(); openDraft();
}
function openDraft() {
  closeDraft();
  const el = document.createElement('div'); el.className = 'draft'; el.id = 'draftPanel';
  const cnt = COLORS.map((c, i) => S.hand.filter(x => x === i).length), nj = S.hand.filter(x => x === NIJI).length;
  const handTxt = COLORS.map((c, i) => cnt[i] ? `${colorChip(i)}${cnt[i]}` : '').join(' ') + (nj ? ` ${colorChip(NIJI)}${nj}` : '');
  el.innerHTML = `<div class="in px"><h4>役物をえらんで置く（あと${S.picks}回）<br><small>手玉 ${handTxt}</small></h4><div class="opts">${S.draft.map((o, i) => {
    const Y = YAKUMONO[o.k];
    return `<button class="opt r${Y.r}" data-i="${i}">${pieceIcon(o, '40px')}<span class="rr">${RARITY_NAME[Y.r]}</span><span class="on">${pieceName(o)}</span><span class="oc">${colorChip(o.c)}</span><span class="od">${Y.d}</span></button>`;
  }).join('')}</div><div class="row2" style="grid-template-columns:1fr 1fr;margin-top:8px"><button class="btn" data-see>盤を見る</button><button class="btn" data-skip>置かない（縁銭＋1）</button></div></div>`;
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => choose(S.draft[+b.dataset.i]));
  el.querySelector('[data-skip]').onclick = () => { S.money++; hud(); closeDraft(); afterPick(); };
  el.querySelector('[data-see]').onclick = () => { closeDraft(); setHint('盤を見たら、下の「えらぶ」で戻る'); $('placeBar').classList.remove('hidden'); $('bRepick').textContent = 'えらぶ'; };
  document.body.appendChild(el);
}
function closeDraft() { const d = $('draftPanel'); if (d) d.remove(); }
function choose(o) {
  closeDraft();
  S.phase = 'place'; S.pending = o;
  setHint(`${pieceName(o)}を置く釘をタップ<br><small>役物の上に置くと、置きかえ</small>`);
  $('placeBar').classList.remove('hidden'); $('bRepick').textContent = 'えらびなおす';
  paint();
}
function place(i) {
  const old = S.board[i];
  S.board[i] = { k: S.pending.k, c: S.pending.c };
  S.disabled.delete(i);
  V.flash[i] = V.t;
  V.floats.push({ x: SLOTS[i].x, y: SLOTS[i].y, text: old ? '置きかえ' : '置いた！', t: V.t, color: '#ffe2a8', big: true });
  S.pending = null; $('placeBar').classList.add('hidden');
  afterPick();
  // 浮かぶ文字を少しだけ動かす
  (async () => { const end = V.t + .9; while (V.t < end && S.phase === 'aim') { V.t += 1 / 30; paint(); await sleep(16); } })();
}
// 1つ置いたら、まだ置けるなら次の3つ、置ききったら ねらう
function afterPick() {
  S.picks--;
  if (S.picks > 0) { S.phase = 'between'; paint(); setTimeout(nextTurn, 450); return; }
  toAim();
}
function toAim() {
  S.phase = 'aim'; V.ghost = null;
  setHint(`盤をさわって、落とす位置を決める<br>指をはなすと 手玉${S.hand.length}こが全部 そこから落ちる`);
  paint();
}
$('bRepick').onclick = () => { if (S.phase !== 'place' && S.phase !== 'draft') return; S.phase = 'draft'; S.pending = null; V.ghost = null; setHint(''); $('placeBar').classList.add('hidden'); paint(); openDraft(); };
function toX(e) { const r = cv.getBoundingClientRect(); return Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, (e.clientX - r.left) / r.width * W)); }
cv.addEventListener('pointerdown', e => {
  if (!S || !V) return;
  if (S.phase === 'aim' && S.hand.length > 0) { cv.setPointerCapture(e.pointerId); V.aim = toX(e); paint(); }
  if (S.phase === 'place') { const i = slotAt(cv, e); V.ghost = i >= 0 ? i : null; paint(); }
});
cv.addEventListener('pointermove', e => {
  if (!S || !V) return;
  if (S.phase === 'aim' && V.aim != null) { V.aim = toX(e); paint(); }
  if (S.phase === 'place' && e.buttons) { const i = slotAt(cv, e); V.ghost = i >= 0 ? i : null; paint(); }
});
cv.addEventListener('pointerup', e => {
  if (!S || !V) return;
  if (S.phase === 'aim' && V.aim != null) { const x = V.aim; V.aim = null; shoot(x); return; }
  if (S.phase === 'place') { const i = slotAt(cv, e); V.ghost = null; if (i >= 0) place(i); else paint(); }
});
cv.addEventListener('pointercancel', () => { if (V) { V.aim = null; V.ghost = null; paint(); } });

async function shoot(x) {
  S.phase = 'shooting';
  const colors = S.hand.slice(); S.hand = []; S.balls = 0; hud(); setHint('');
  const boss = curBoss();
  const s = newShot(x, { board: S.board, pockets: S.pk, disabled: S.disabled, block: boss && boss.fx === 'block', shake: boss && boss.fx === 'shake', r: S.r }, colors);
  if (boss && boss.fx === 'shake') { const bw = $('cv').parentElement; bw.style.animation = 'none'; void bw.offsetWidth; bw.style.animation = 'shake .25s 3'; }
  V.balls = s.balls; V.floats = V.floats.filter(f => V.t - f.t < 1);
  let seen = 0, last = performance.now(), acc = 0;
  setCalc(1, 0, 0);
  await new Promise(done => {
    const frame = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      acc += dt * S.speed;
      while (acc >= 1 / 120 && !s.done) { stepShot(s, 1 / 120); acc -= 1 / 120; V.t += 1 / 120; }
      for (; seen < s.events.length; seen++) {
        const ev = s.events[seen];
        if (ev.type === 'drop') {
          if (ev.c === NIJI) V.floats.push({ x: ev.x, y: 60, text: '虹の玉！', t: V.t, color: '#fff3c4', big: true });
        } else if (ev.type === 'coin') {
          S.money++; hud(); V.floats.push({ x: ev.x, y: ev.y - 14, text: '縁銭+1', t: V.t, color: '#f2c14e', big: true });
        } else if (ev.type === 'hit') {
          V.flash[ev.i] = V.t;
          const Y = YAKUMONO[ev.k];
          if (!ev.n && !Y.chain) continue;
          const text = Y.chain ? 'ゴロゴロ！' : `+${ev.n}`;
          if (!V.floats.some(f => f.x === ev.x && f.y === ev.y && V.t - f.t < .3)) V.floats.push({ x: ev.x, y: ev.y, text, t: V.t, color: ev.c === ANY ? '#ffe2a8' : COLORS[ev.c].c, big: ev.n >= 4 || !!Y.chain });
        } else if (ev.type === 'pocket') {
          V.pflash[ev.p] = V.t;
          if (ev.m !== 1) V.floats.push({ x: (ev.p + .5) * W / 7, y: POCKET_Y, text: ev.m ? '×' + ev.m : '締め！', t: V.t, color: ev.m ? '#ffe2a8' : '#ff6b6b', big: ev.m >= 3 });
        } else if (ev.type === 'rocket') {
          V.floats.push({ x: ev.x, y: ev.y, text: '滝のぼり！', t: V.t, color: '#7fd6ff', big: true });
        }
      }
      setCalc(s.balls.reduce((a, b) => a + (b.alive ? b.w : 0), 0), s.landedN + s.overflow, shotTotal(s));
      if (V.floats.length > 120) V.floats = V.floats.slice(-120);
      paint();
      if (s.done) done(); else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const tot = shotTotal(s);
  afterShot(s);   // 当たった金魚が育つ
  $('cTot').classList.remove('pop'); void $('cTot').offsetWidth; $('cTot').classList.add('pop');
  const big = tot >= S.tgt * 3;   // 目標の3倍をこえたら大当たり
  if (big) await jackpot(tot);
  await sleep(450);
  const from = S.score; S.score += tot; S.best = Math.max(S.best, tot);
  const n = big ? 40 : 18;
  for (let i = 1; i <= n; i++) { const v = Math.round(from + (S.score - from) * i / n); $('pScore').textContent = v.toLocaleString(); $('pBar').style.width = Math.min(100, v / S.tgt * 100) + '%'; await sleep(big ? 30 : 24); }
  hud();
  const end = V.t + .8; while (V.t < end) { V.t += 1 / 30; paint(); await sleep(16); }
  V.balls = []; paint();
  if (S.score >= S.tgt) return win();
  return lose();
}

async function jackpot(tot) {
  const bw = $('cv').parentElement;
  const el = document.createElement('div'); el.className = 'jackpot';
  el.innerHTML = `<div class="in"><b>大当たり！</b><span>${tot.toLocaleString()} 玉</span></div>`;
  bw.appendChild(el);
  bw.style.animation = 'none'; void bw.offsetWidth; bw.style.animation = 'shake .2s 4';
  try { navigator.vibrate && navigator.vibrate([40, 40, 80]); } catch (e) {}
  await sleep(1300); el.remove();
}
// ===== 勝ち負け =====
async function win() {
  S.phase = 'done'; setHint('');
  const boss = curBoss();
  const ns = S.story && S.n <= STORY_NIGHTS ? NIGHT_SCENES[S.n - 1] : null;
  if (boss && ns) await scene(ns.end);
  else if (boss) await talk([[boss.who, 'x', '……やるな。']]);
  const rows = [[`${MATCH_NAME[S.k]}の縁がたまったお礼`, REWARD[S.k]]];
  const intr = Math.min(5, Math.floor(S.money / 5)); if (intr) rows.push(['利子（縁銭5枚ごとに1）', intr]);
  S.money += rows.reduce((a, r) => a + r[1], 0);
  $('payList').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>+${r[1]}</b></div>`).join('') + `<div class="sum"><span>縁銭</span><b>${S.money}</b></div>`;
  saveBest();
  if (S.k === 2 && S.n === STORY_NIGHTS && S.story && !S.endless) {
    await scene('epilogue');
    store('pachinko-cleared', true);
    S.endless = true;
  }
  S.rerollCost = 2; rollShop(); snap('shop');   // ここでやめても、屋台から続けられる
  show('s-res');
}
async function lose() {
  S.phase = 'done'; setHint('');
  const boss = curBoss();
  if (boss) await talk([[boss.who, ...T.bossLose[boss.who]]]);
  if (S.story && S.n <= STORY_NIGHTS) await talk(SCENES.lose[S.n - 1]);
  clearSave();
  saveBest();
  const where = `${S.endless ? 'エンドレス ' : ''}夜${S.n}・${MATCH_NAME[S.k]}`;
  $('overRec').innerHTML = `縁が足りなかったのは<br><b>${where}</b><br>いちばん大きな一発：<b>${S.best.toLocaleString()}</b> 玉`;
  const txt = `よいまつり横丁 第2章「月見座」で ${where} まで縁を集めた！\n最大の一発 ${S.best.toLocaleString()}玉\n#よいまつり横丁 #月見座`;
  $('xPost').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(txt);
  show('s-over');
}
function saveBest() {
  const b = store('pachinko-best') || { p: 0, hand: 0 }; const p = S.n * 3 + S.k;
  if (p > b.p) { b.p = p; b.n = S.n; b.k = S.k; }
  b.hand = Math.max(b.hand || 0, S.best); store('pachinko-best', b);
}

// ===== 屋台（勝負のあいだ） =====
const cvS = $('cvShop'), ctxS = setupCanvas(cvS);
function openShop() { enterShop(); }
function enterShop() {
  S.traySel = null;
  if (!S.shop) { S.rerollCost = 2; rollShop(); }
  $('shopFace').src = face('gyosho', 's');
  $('shopSay').textContent = T.shop[Math.floor(S.r() * T.shop.length)];
  show('s-shop'); renderShop();
}
function rollShop() {
  const items = [];
  const rare = shuffle(YAKUMONO_KEYS.filter(k => YAKUMONO[k].r >= 1), S.r)[0];
  items.push({ kind: 'yaku', k: rare, c: YAKUMONO[rare].any ? ANY : Math.floor(S.r() * NC), p: YAKUMONO[rare].p + 2 });
  const ps = shuffle([0, 1, 2, 3, 4, 5, 6], S.r).slice(0, 2);
  ps.forEach(pos => items.push({ kind: 'pocket', pos, p: 4 + S.pockets[pos] }));   // pos＝どの入賞口か、p＝値段
  items.push({ kind: 'ball', p: 6 + S.extraBalls * 3 });   // 玉袋はいつでも買える（買うたびに少し高くなる）
  S.shop = items;
}
const POS = ['いちばん左', '左から2番目', '左から3番目', 'まんなか', '右から3番目', '右から2番目', 'いちばん右'];
function renderShop() {
  snap('shop');
  $('shopMoney').textContent = S.money;
  $('shopItems').innerHTML = S.shop.map((it, i) => {
    let ic, title, d;
    if (it.kind === 'yaku') { const Y = YAKUMONO[it.k]; ic = pieceIcon(it, '40px'); title = `役物：${pieceName(it)}`; d = `［${RARITY_NAME[Y.r]}］${colorChip(it.c)}<br>${Y.d}`; }
    else if (it.kind === 'pocket') { ic = `<span style="font-size:18px;color:#ffe2a8">×${S.pockets[it.pos] + 1}</span>`; title = '入賞口みがき'; d = `${POS[it.pos]}の入賞口 ×${S.pockets[it.pos]}→×${S.pockets[it.pos] + 1}`; }
    else { ic = spr('purse', '40px'); title = '玉袋'; d = `手玉が1つふえる（ずっと。ふえた玉の色はランダム）<br>いまの手玉：${BASE_BALLS + S.extraBalls}こ`; }
    const can = !it.sold && S.money >= it.p;
    return `<div class="item px ${it.sold ? 'sold' : ''}"><div class="ic">${ic}</div><div class="tx"><b>${title}</b>${d}</div><button class="btn gold" data-buy="${i}" ${can ? '' : 'disabled'}>${it.sold ? '売りきれ' : `縁銭${it.p}`}</button></div>`;
  }).join('');
  $('shopItems').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(+b.dataset.buy));
  $('bReroll').innerHTML = `入れかえ<small>縁銭${S.rerollCost}</small>`;
  $('bReroll').disabled = S.money < S.rerollCost;
  $('tray').innerHTML = S.tray.length ? S.tray.map((o, i) => `<button class="ti ${S.traySel === i ? 'sel' : ''}" data-t="${i}">${pieceIcon(o, '36px')}</button>`).join('') : '<span class="none">手持ちの役物はありません</span>';
  $('tray').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const i = +b.dataset.t; S.traySel = S.traySel === i ? null : i; renderShop(); });
  drawBoard(ctxS, { board: S.board, pockets: S.pockets, sel: S.traySel != null, t: 0 });
}
function buy(i) {
  const it = S.shop[i]; if (it.sold || S.money < it.p) return;
  S.money -= it.p; it.sold = true;
  if (it.kind === 'yaku') { S.tray.push({ k: it.k, c: it.c }); S.traySel = S.tray.length - 1; }
  else if (it.kind === 'pocket') S.pockets[it.pos]++;
  else { S.extraBalls++; S.shop.push({ kind: 'ball', p: 6 + S.extraBalls * 3 }); }   // もう1つ買える
  $('shopSay').textContent = it.kind === 'yaku' ? '盤の釘をタップすると、そこに置けますよ。' : T.bought[Math.floor(S.r() * T.bought.length)];
  renderShop();
  if (it.kind === 'yaku') $('tray').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
cvS.addEventListener('click', e => {
  const best = slotAt(cvS, e); if (best < 0) return;
  if (S.traySel != null) {
    const it = S.tray.splice(S.traySel, 1)[0];
    if (S.board[best]) S.tray.push(S.board[best]);
    S.board[best] = it; S.traySel = null;
    $('shopSay').textContent = T.bought[Math.floor(S.r() * T.bought.length)];
    renderShop(); return;
  }
  const o = S.board[best]; if (!o) return;
  const Y = YAKUMONO[o.k], sell = Math.max(1, Math.floor(Y.p / 2));
  const el = sheet(`${itemRow(o, o.k === 'kingyo' ? `<br>いま：当たると${YAKUMONO.kingyo.add(o)}つふえる（これまで${o.g || 0}発で当たった）` : '')}
    <div class="row2" style="grid-template-columns:1fr 1fr"><button class="btn" data-off>はずす</button><button class="btn gold" data-sell>売る（縁銭＋${sell}）</button></div>`);
  el.querySelector('[data-off]').onclick = () => { S.tray.push(o); S.board[best] = null; el.remove(); renderShop(); };
  el.querySelector('[data-sell]').onclick = () => { S.board[best] = null; S.money += sell; el.remove(); renderShop(); };
});
function nextMatch() {
  if (S.tray.length && !S._warned) { S._warned = true; $('shopSay').textContent = `手持ちの役物が${S.tray.length}つ、まだ盤に置かれていませんよ。このまま行くなら、もう一度「次へ」を。`; return; }
  S._warned = false; S.shop = null;
  S.k++; if (S.k > 2) { S.k = 0; S.n++; } showVs();
}

// ===== タイトル =====
function title() {
  $('titleItems').innerHTML = ['lantern', 'cat', 'koi', 'firework'].map(k => spr(k, '48px')).join('');
  const b = store('pachinko-best');
  $('bestRec').textContent = b && b.p ? `最高記録：夜${b.n}・${MATCH_NAME[b.k]}　最大の一発 ${(b.hand || 0).toLocaleString()}玉` : '';
  // エンドレスは最終話をクリアすると遊べる（それまではカギつきで見せておく）
  const cleared = !!store('pachinko-cleared');
  $('bEndless').disabled = !cleared;
  $('bEndless').innerHTML = cleared ? 'エンドレス<small>十五夜のその先へ。どこまで縁を集められるか</small>' : 'エンドレス<small>🔒 最終話をクリアすると遊べる</small>';
  $('bGallery').classList.toggle('hidden', !Object.keys(store('pachinko-cg') || {}).length);
  const sv = savedRun();
  $('bContinue').classList.toggle('hidden', !sv);
  if (sv) $('bContinue').innerHTML = `つづきから<small>${sv.endless ? 'エンドレス ' : ''}夜${sv.n}・${MATCH_NAME[sv.k]}${sv.where === 'shop' ? '（屋台）' : ''}</small>`;
  $('bStart').textContent = sv ? 'ストーリーを はじめから' : store('pachinko-seen-scenes') ? 'ストーリーを はじめから' : 'はじめる';
  $('bStart').classList.toggle('red', !sv);
  show('s-title');
}
function askName() {
  return new Promise(done => {
    const el = document.createElement('div'); el.className = 'sheet';
    el.innerHTML = `<div class="in px nameform"><h3>あなたの名前</h3><div style="font-size:13px;color:var(--mute)">物語の中で呼ばれる名前です（あとで変えられます）</div>
      <input id="nameIn" maxlength="8" value="${esc(playerName())}"><button class="btn red wide" id="nameOk">これでいく</button></div>`;
    $('layer').appendChild(el);
    el.querySelector('#nameOk').onclick = () => { const v = el.querySelector('#nameIn').value.trim() || 'ツグミ'; store('pachinko-name', v); el.remove(); done(v); };
  });
}
const HOW = `<h3>あそびかた</h3><div style="font-size:14px;line-height:1.8">
・玉は3色（<span style="color:#e8453c">赤</span>・<span style="color:#3a8ee8">青</span>・<span style="color:#f2c94e">黄</span>）。手玉は${BASE_BALLS}こで、色は1つずつランダム。ごくまれに<b>虹の玉</b>が出て、どの色にもなる<br>
・1回の勝負で、3つの役物から1つえらんで<b style="color:var(--gold)">盤の好きな釘の場所に置く</b>のを${PICKS}回（役物の上に置くと置きかえ）。役物にも色がある<br>
・置きおわったら、盤をさわって落とす位置を決める。指をはなすと、<b>手玉が全部そこから つぎつぎに落ちる</b><br>
・役物は、<b>同じ色の玉</b>が当たると玉をふやす。1つの玉は同じ役物では1回だけ（鯉に飛ばしてもらうのも1回）。分かれた玉は新しい玉なので、下の役物でまたふえる。<b>上限なし。盤を作りこむほど、どこまでもふえる</b><br>
・入賞口に入った玉が<b style="color:var(--gold)">縁</b>になる。×3の入賞口に入った玉は3つ分。盤の上に見える玉は${MAX_ALIVE}こまでで、それをこえた分は玉の上に「×何こ分」とまとめて表示する（数はそのまま）<br>
・落とした縁が<b style="color:var(--gold)">目標の縁</b>をこえれば勝ち。ひと晩は 宵 → 夜ふけ → 真夜中。真夜中には、横丁のだれかが「できごと」を起こす<br>
・盤は勝負をまたいで育っていく。勝負のあいだは藁人の屋台で、めずらしい役物・入賞口みがき・玉袋（手玉＋1）が縁銭で買える<br>
・十五夜（5晩め）の真夜中まで縁をためきるとクリア。そのあとはエンドレス</div>`;

$('bList').onclick = () => listSheet(true);
$('bListT').onclick = () => listSheet(false);
$('bHow').onclick = () => sheet(HOW);
$('bSpeed').onclick = () => { S.speed = S.speed === 1 ? 2 : 1; $('speedLbl').textContent = S.speed === 1 ? 'ふつう' : 'はやい'; };
$('bContinue').onclick = resume;
$('bStart').onclick = async () => {
  if (savedRun() && !(await confirmSheet('いまの続きは消えます。はじめから遊びますか？'))) return;
  if (!store('pachinko-name')) await askName();
  newRun(true);
  await scene('prologue');
  showVs();
};
$('bEndless').onclick = async () => {
  if (savedRun() && !(await confirmSheet('いまの続きは消えます。エンドレスをはじめますか？'))) return;
  newRun(false); showVs();
};
// はい／いいえを聞く（ブラウザの確認ダイアログは使えないので、自前で）
function confirmSheet(msg) {
  return new Promise(done => {
    const el = document.createElement('div'); el.className = 'sheet';
    el.innerHTML = `<div class="in px"><h3>${esc(msg)}</h3><div class="row2" style="grid-template-columns:1fr 1fr"><button class="btn" data-n>やめる</button><button class="btn red" data-y>はい</button></div></div>`;
    el.querySelector('[data-y]').onclick = () => { el.remove(); done(true); };
    el.querySelector('[data-n]').onclick = () => { el.remove(); done(false); };
    $('layer').appendChild(el);
  });
}
$('bFight').onclick = startMatch;
$('bToShop').onclick = openShop;
$('bReroll').onclick = () => { if (S.money < S.rerollCost) return; S.money -= S.rerollCost; S.rerollCost++; rollShop(); renderShop(); };
$('bNext').onclick = nextMatch;
$('bRetry').onclick = () => { newRun(S.story); showVs(); };
$('bName').onclick = () => askName();
$('bGallery').onclick = gallery;
$('bTitle').onclick = title;
SHEET.onload = () => { if (S && V && !$('s-play').classList.contains('hidden')) paint(); };
title();
