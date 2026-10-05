// Estilos dos lances decisivos: nenhum pode ser o clique óbvio.
// Mede, para cada minigame, (1) a chance "pela carta" de cada estilo (a que o robô e o botão "deixar o jogo decidir" usam)
// e (2) um modelo de jogador humano com três níveis de precisão no toque, para ver se um estilo ganha sempre.
// Uso: node tools/craque_estilos.js [carreiras]
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 400;
const SKILL = { bom: 0.05, medio: 0.12, ruim: 0.22 }; // erro do toque, em segundos (desvio padrão)
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const TYPES = ['cup', 'classico', 'save', 'tackle', 'pass'];
const POS = { cup: 'ATA', classico: 'ATA', save: 'GOL', tackle: 'ZAG', pass: 'MEI' };

// Um lance jogado por um humano com erro sd (s). Devolve true se deu certo.
function play(k, type, sd) {
  const R = Math.random;
  if (type === 'save') {
    // Lê a seta se reagir antes do chute (tellMs + 170 ms de folga); reação média 230 ms, mais o erro do toque
    const rs = R(), side = rs < 0.42 ? -1 : rs < 0.84 ? 1 : 0, miss = R() < (k.miss || 0.07);
    const ax = side === 0 ? R() * 0.2 : 0.35 + R() * 0.62;
    const read = 230 + gauss() * sd * 1000 < k.tellMs + 170;
    const d = read ? side : (R() < 0.5 ? -1 : 1); // sem ler, chuta um lado
    return miss || (d === side && (side === 0 || ax <= k.diveReach));
  }
  if (type === 'tackle') {
    const ok = Math.abs(gauss() * sd) < k.win * k.period / 2; // janela em segundos: win·period
    return ok && !(k.dribble && R() < k.dribble);
  }
  if (type === 'pass') {
    const ok = Math.abs(gauss() * sd) < 0.75 * Math.min(0.3 / 0.94, k.win) * k.period;
    return ok && !(k.keeperOut && R() < k.keeperOut);
  }
  // Chute: mira x corre a 5/period por segundo, y a 2,9/period; tremedeira entra como erro a mais
  const rise = k.rise || 0;
  const tx = k.fk ? -0.62 : 0.86 * (R() < 0.5 ? -1 : 1), ty = (k.fk ? 0.8 : 0.84) - rise;
  const wob = () => (R() - 0.5) * 2 * k.wobble;
  const x = tx + gauss() * sd * 5 / k.period + wob(), y = Math.max(0, ty + gauss() * sd * 2.9 / k.period + wob());
  const kr = R(), bs = Math.sign(x) || 1, keeper = k.fk ? 0 : kr < 0.38 ? bs : kr < 0.8 ? -bs : 0;
  return S.kickResult(k, x, y, keeper).ok;
}

const out = {};
for (const type of TYPES) {
  const ids = S.styleIds(type), acc = {};
  for (const id of ids) acc[id] = { chance: 0, best: 0, bom: 0, medio: 0, ruim: 0 };
  for (let i = 0; i < N; i++) {
    const c = S.newCareer({ name: 'T', pos: POS[type], foot: 'D', country: 'Brasil' }, 1000 + i);
    // Carta em vários pontos da carreira: atributos entre 55 e 88
    const lvl = 55 + Math.floor(Math.random() * 34);
    for (const a in c.attrs) c.attrs[a] = Math.max(40, Math.min(95, lvl + Math.round(gauss() * 8)));
    const ks = ids.map(id => S.kickSetup(c, type, id));
    const top = Math.max(...ks.map(k => k.chance));
    ks.forEach((k, j) => {
      acc[ids[j]].chance += k.chance; if (k.chance === top) acc[ids[j]].best++;
      for (const sk in SKILL) { let ok = 0; for (let t = 0; t < 60; t++) if (play(k, type, SKILL[sk])) ok++; acc[ids[j]][sk] += ok / 60; }
    });
  }
  out[type] = acc;
  console.log('\n' + type.toUpperCase() + ' (' + POS[type] + ')');
  console.log('  estilo      carta  melhor   jogado: bom  médio  ruim');
  for (const id of ids) {
    const a = acc[id];
    console.log('  ' + id.padEnd(10) + (a.chance / N * 100).toFixed(0).padStart(5) + '%' + (a.best / N * 100).toFixed(0).padStart(7) + '%' + '         ' + ['bom', 'medio', 'ruim'].map(s => (a[s] / N * 100).toFixed(0).padStart(3) + '%').join('   '));
  }
}
// Alerta: estilo que ganha em todos os níveis por mais de 6 pontos
let alerts = 0;
for (const type of TYPES) {
  const [a, b] = S.styleIds(type).map(id => out[type][id]);
  const d = ['bom', 'medio', 'ruim'].map(s => (b[s] - a[s]) / N * 100);
  if (d.every(x => x > 6) || d.every(x => x < -6)) { alerts++; console.log('\nALERTA ' + type + ': um estilo domina em todos os níveis (' + d.map(x => x.toFixed(0)).join('/') + ')'); }
  if (Math.abs(b.chance - a.chance) / N > 0.04) { alerts++; console.log('\nALERTA ' + type + ': chance pela carta difere mais de 4 pontos'); }
}
console.log('\nAlertas: ' + alerts);
