// Coletiva e acontecimentos do Treinador (`engine/coachpress.js`): quando aparece, o preço de cada resposta, a promessa
// que vale no jogo seguinte, uma janelinha por semana, nada de NaN nem faixa estourada, e o save no meio que termina igual.
// Uso: node tools/craque_coletiva.js [carreiras=30] [temporadas=2]   (esperado: 0 falhas)
const S = require('../craque/src/sim.js');
const N = +(process.argv[2] || 30), T = +(process.argv[3] || 2);
let bad = 0; const ok = (c, t) => { if (!c) { bad++; if (bad < 30) console.log('FALHA', t); } };
const mk = (i, start) => { const co = S.coNew({ name: 'T' + i, country: 'Brasil', start: start || 'livre' }); S.coSign(co, S.coOffers(co)[0]); co.autoXI = true; S.coStart(co); if (S.coFinAuto) S.coFinAuto(co); return co; };
const play = co => { const m = S.coMatchStart(co); S.coMatchRest(co, m); return S.coMatchEnd(co, m); };
const sane = (co, t) => {
  co.squad.forEach(p => { ok(Number.isFinite(p.mo) && p.mo >= 0 && p.mo <= 100, t + ' moral ' + p.mo); ok(Number.isFinite(p.en) && p.en >= 0 && p.en <= 100, t + ' energia ' + p.en); });
  ok(Number.isFinite(co.fin.caixa), t + ' caixa'); ok(co.board.conf >= 0 && co.board.conf <= 100, t + ' confiança');
  const e = S.coEst(co); ok(e.hum >= 0 && e.hum <= 100, t + ' humor');
};

// 1. Cada resposta faz o que a etiqueta diz
{
  const co = mk(900);
  for (let i = 0; i < 3; i++) play(co);
  const log = { r: 3, vs: co.ss.ids.find(id => id !== co.club), home: true, gf: 0, ga: 1, res: 'd', rt: [] };
  const d = S.coPress(co, log); ok(d && d.kind === 'press' && d.ops.length === 3, 'coletiva da derrota');
  const mo0 = co.squad.map(p => p.mo), c0 = co.board.conf;
  S.coPressAnswer(co, d, 'assumo');
  ok(co.squad.every((p, i) => p.mo >= mo0[i] - 0.001), 'eu assumo: elenco sobe'); ok(co.board.conf < c0, 'eu assumo: diretoria desce');
  ok(d.ops.every(o => o.tags.length), 'toda resposta mostra o preço');
  // promessa: vale no jogo seguinte
  const dv = S.coPress(co, Object.assign({}, log, { res: 'v', gf: 1, ga: 0 })); S.coPressAnswer(co, dv, 'promete');
  ok(co.pressB, 'promessa guardada'); ok(S.coPressBet(co, log) === null, 'promessa não vale no mesmo jogo');
  const l2 = play(co), b = S.coPressBet(co, l2); ok(b && b.win === (l2.res === 'v') && !co.pressB, 'promessa resolvida no jogo seguinte');
}
// 2. Acontecimentos: os 12 aparecem com o caso certo e cada resposta aplica
{
  const co = mk(901, 'baixo'); for (let i = 0; i < 2; i++) play(co);
  co.squad[0].age = 34; co.squad.filter(p => !co.xi.includes(p.id))[0].age = 19; S.coEst(co).hum = 30;
  const seen = new Set();
  for (let k = 0; k < 40 && seen.size < S.CO_EVT.length; k++) {
    co.pv = co.pv || { s: co.season, r: -9, e: -9, w: -9, d: [] }; co.pv.d = S.CO_EVT.filter(e => seen.has(e.id)).map(e => e.id);
    const d = S.coEvent(co); if (!d) break; seen.add(d.id);
    ok(d.say && !/undefined|NaN/.test(d.say), 'texto ' + d.id + ': ' + d.say);
    d.ops.forEach(o => ok(o.tags.length && o.tags.every(t => !/undefined|NaN/.test(t.join(' '))), 'etiquetas ' + d.id + '/' + o.k));
    const o = d.ops[k % 3], r = S.coEventAnswer(co, d, o.k); ok(r && r.re, 'resposta ' + d.id + '/' + o.k);
    sane(co, d.id);
    co.squad.forEach(p => { p.sus = 0; p.out = 0; });
  }
  ok(seen.size === S.CO_EVT.length, 'todos os acontecimentos aparecem (' + seen.size + ' de ' + S.CO_EVT.length + ')');
}
// 3. Carreiras inteiras com o robô respondendo: frequência, uma por semana, faixas, save no meio
const cnt = { press: 0, big: 0, evt: 0, talk: 0, none: 0 }, ev = {};
let weeks = 0;
for (let i = 0; i < N; i++) {
  const co = mk(i, i % 2 ? 'baixo' : 'livre');
  for (let s = 0; s < T; s++) {
    let last = null;
    while (!co.ss.done && !co.sacked) {
      if (last) S.coPressBet(co, last);
      const w = S.coWeekPop(co, last); weeks++;
      if (!w) cnt.none++; else if (w.kind === 'talk') { cnt.talk++; S.coTalk1(co, w.p.id, ['prometer', 'paciencia', 'duro'][i % 3]); S.coWeekSeen(co); }
      else {
        if (w.kind === 'press') { cnt.press++; if (w.big) cnt.big++; S.coPressAnswer(co, w, w.ops[(i + co.ss.i) % 3].k); }
        else { cnt.evt++; ev[w.id] = (ev[w.id] || 0) + 1; S.coEventAnswer(co, w, w.ops[(i + co.ss.i) % 3].k); }
        ok(S.coWeekPop(co, last) === null, 'duas janelinhas na mesma semana');
      }
      sane(co, 'carreira ' + i);
      last = play(co);
    }
    if (co.sacked) break;
    S.coSeasonEnd(co); if (co.sacked) break;
    const of = S.coOffers(co); if (!of.length) break; S.coSign(co, of.find(o => o.club === co.club) || of[0]); S.coStart(co); if (S.coFinAuto) S.coFinAuto(co);
  }
}
// save no meio: mesma semana, mesma janelinha
{
  const co = mk(77); let last = null; for (let i = 0; i < 8; i++) last = play(co);
  const a = JSON.stringify(S.coWeekPop(JSON.parse(JSON.stringify(co)), last)), b = JSON.stringify(S.coWeekPop(JSON.parse(JSON.stringify(co)), last));
  ok(a === b, 'save no meio: mesma janelinha');
}
const pct = k => Math.round(100 * cnt[k] / Math.max(1, weeks)) + '%';
console.log('semanas ' + weeks + ' · coletiva ' + pct('press') + ' (jogo grande ' + pct('big') + ') · acontecimento ' + pct('evt') + ' · conversa ' + pct('talk') + ' · nada ' + pct('none'));
console.log('acontecimentos: ' + Object.keys(ev).map(k => k + ' ' + ev[k]).join(', '));
console.log(bad ? bad + ' falhas' : 'coletiva e acontecimentos: 0 falhas'); process.exit(bad ? 1 : 0);
