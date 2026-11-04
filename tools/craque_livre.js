// Lances livres do Jogo a Jogo (craque/src/livre.js): um robô joga cada cena em três níveis com cartas de atributo
// 55, 70 e 85 e compara com a chance "pela carta" (S.kickSetup, a do "deixar o jogo decidir").
// Esperado: a média do bom e do médio perto da carta (±8 pontos) e o bom não abaixo do médio. O desleixado do goleiro fica
// parado na linha (de propósito: mostra quanto rende não sair do gol).
// Uso: node tools/craque_livre.js [lances por célula] [cenas separadas por vírgula]   (WHY=1 mostra como terminou)
const S = require('../craque/src/sim.js');
const fake = () => { const o = { style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, setPointerCapture() {}, isConnected: true,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100 }), querySelector: () => fake() };
  o.getContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }); return o; };
global.window = global; global.CRAQUE_SIM = S; global.document = { addEventListener() {}, removeEventListener() {}, documentElement: { classList: { contains: () => false } } };
global.requestAnimationFrame = () => {}; global.setTimeout = f => { f(); return 0; }; global.clearTimeout = () => {};
require('../craque/src/livre.js');
const GX = 180, H0 = 460, d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const segD = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l)); return Math.hypot(a.x + dx * k - q.x, a.y + dy * k - q.y); };
// lvl: 0 bom, 0,5 médio, 1 desleixado (ruído no analógico e decisões piores)
const go = (S, t, lvl) => { const dx = t.x - S.me.x + (Math.random() - 0.5) * 60 * lvl, dy = t.y - S.me.y + (Math.random() - 0.5) * 60 * lvl, l = Math.hypot(dx, dy); S.stick = l < 4 ? { x: 0, y: 0 } : { x: dx / l * Math.min(1, l / 20), y: dy / l * Math.min(1, l / 20) }; };
const BOT = {
  // Pressão: fica entre ele e a saída (embaixo) e dá o bote perto
  pressao: (S, L, lvl) => { const a = S.atk, gd = Math.hypot(GX - a.x, H0 - a.y); go(S, { x: a.x + (GX - a.x) / gd * 30, y: a.y + (H0 - a.y) / gd * 30 }, lvl); if (d(S.me, a) < 40 + lvl * 14 && Math.random() < 0.1) { const vx = a.x - S.me.x, vy = a.y - S.me.y, l = Math.hypot(vx, vy); S.stick = { x: vx / l, y: vy / l }; L.act(); } },
  // Cara a cara: vai ao gol pelo meio e chuta quando o goleiro chega perto (o desleixado chuta tarde)
  cara: (S, L, lvl) => { const me = S.me; if (!S.own) return; go(S, { x: GX + (me.x - GX) * 0.5, y: 60 }, lvl); if (d(me, S.kp) < 70 - lvl * 30 + Math.random() * 10) { S.stick = { x: 0, y: 0 }; L.act(); } },
  // 2 contra 1: conduz; com o zagueiro perto, toca se ele veio em você, senão chuta
  dois: (S, L, lvl) => { const me = S.me, df = S.foes[0], m = S.mates[0]; if (!S.own) return; go(S, { x: me.x + 10, y: me.y - 60 }, lvl);
    if (d(df, me) < 75 - lvl * 25 || me.y < 170) { const toMe = d(df, me) < d(df, m) || Math.random() < lvl * 0.4; if (toMe) { const vx = m.x - S.ball.x, vy = m.y - S.ball.y, l = Math.hypot(vx, vy); S.stick = { x: vx / l, y: vy / l }; } else S.stick = { x: 0, y: 0 }; L.act(); } },
  // Cabeçada: corre para o ponto assim que a bola sai (o desleixado sai tarde) e pula perto
  cabeca: (S, L, lvl) => { const cr = S.cross; if (S.headed) return; if (S.t > cr.t0 + 0.1 + lvl * 0.5) go(S, { x: cr.x1, y: cr.y1 }, lvl * 0.5); else S.stick = { x: 0, y: 0 };
    const k = (S.t - cr.t0) / cr.dur; if (k > 0.85 && d(S.me, { x: cr.x1, y: cr.y1 }) < 45) L.act(); },
  // Atacante: diagonal para longe do zagueiro; passou dele, volta para o meio e chuta (o desleixado chuta de longe e mais aberto)
  mano: (S, L, lvl) => { const me = S.me, df = S.foes[0]; if (!S.own) return; const side = df.x > me.x ? -1 : 1; if (me.y < df.y - 12) S.past = 1;
    go(S, S.past ? { x: GX + (me.x - GX) * (0.4 + lvl * 0.5), y: 130 } : { x: me.x + side * 70, y: me.y - 60 }, lvl);
    if (S.past && me.y < 170 + lvl * 60 + Math.random() * 20) { S.stick = { x: 0, y: 0 }; L.act(); } },
  passe3: (S, L, lvl) => { if (!S.own) return; go(S, { x: S.me.x, y: S.me.y }, lvl); const open = S.mates.filter(m => !S.foes.some(o => segD(o, S.ball, m) < 18 + lvl * 10)); if (open.length && S.t > 0.5 + Math.random() * lvl) { const m = open[0], vx = m.x - S.ball.x, vy = m.y - S.ball.y, l = Math.hypot(vx, vy); S.stick = { x: vx / l, y: vy / l }; L.act(); } },
  bote: (S, L, lvl) => { const a = S.atk, gd = Math.hypot(GX - a.x, 20 - a.y); go(S, { x: a.x + (GX - a.x) / gd * 30, y: a.y + (20 - a.y) / gd * 30 }, lvl); if (d(S.me, a) < 40 + lvl * 14 && Math.random() < 0.1) { const vx = a.x - S.me.x, vy = a.y - S.me.y, l = Math.hypot(vx, vy); S.stick = { x: vx / l, y: vy / l }; L.act(); } },
  saida: (S, L, lvl) => { const a = S.atk;
    // Viu a linha do chute: pula para onde ela cruza a sua altura (o bom reage em ~0,22 s, o médio em ~0,32 s; o desleixado não pula)
    if (S.aim && !S.dived && lvl < 1 && S.t - S.aim.t > 0.22 + lvl * 0.2) { const k = (a.y - S.me.y) / Math.max(1, a.y - 20), x = a.x + (S.aim.x - a.x) * k, dx = x - S.me.x; S.stick = { x: Math.sign(dx) * Math.min(1, Math.abs(dx) / 20), y: 0 }; if (Math.abs(dx) > 8) L.act(); return; }
    if (lvl === 1) { S.stick = { x: 0, y: 0 }; return; } const k = (70 - 20) / Math.max(1, a.y - 20); go(S, { x: GX + (a.x - GX) * k, y: 70 }, lvl); },
};
const POS = { pressao: 'ATA', cara: 'ATA', dois: 'ATA', cabeca: 'ATA', mano: 'ATA', passe3: 'MEI', bote: 'ZAG', saida: 'GOL' };
const N = +process.argv[2] || 300;
let alerts = 0;
console.log('cena     atrib  K     carta   bom  médio  desleixado');
for (const kind of (process.argv[3] || S.LIVRE.join(',')).split(',')) for (const at of [55, 70, 85]) {
  const c = S.newCareer({ name: 'Robô', pos: POS[kind], foot: 'D', country: 'Brasil' }, 7); for (const k in c.attrs) c.attrs[k] = at;
  const k = S.kickSetup(c, kind), pct = [];
  for (const lvl of [0, 0.5, 1]) {
    let ok = 0; const why = {};
    for (let n = 0; n < N; n++) { let res = null; const L = global.CRAQUE_LIVRE(fake(), { c, kind, onResult: (o, w) => { res = { o }; why[(o ? '+' : '-') + w] = (why[(o ? '+' : '-') + w] || 0) + 1; }, onDone() {} }), St = L.S;
      for (let i = 0; i < 60 * 14 && !res; i++) { if (i % 6 === 0) BOT[kind](St, L, lvl); L.step(1 / 60); }
      if (res && res.o) ok++; }
    pct.push(Math.round(ok / N * 100));
    if (process.env.WHY) console.log('   ', ['bom', 'médio', 'desleixado'][lvl * 2], JSON.stringify(why));
  }
  const ref = kind === 'saida' ? pct[1] : (pct[0] + pct[1]) / 2, // goleiro: o robô bom lê a linha do chute na hora (humano não); a régua é o médio
    bad = Math.abs(ref - k.chance * 100) > 8 || pct[0] < pct[1] - 5; // quem joga razoável: entre o bom e o médio
  if (bad) alerts++;
  console.log(kind.padEnd(8), String(at).padEnd(6), String(k.K).padEnd(5), String(Math.round(k.chance * 100)).padStart(4) + '%', pct.map(p => String(p).padStart(5) + '%').join(' '), bad ? ' ⚠' : '');
}
console.log('\nAlertas: ' + alerts);
