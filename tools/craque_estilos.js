// Estilos dos lances decisivos: nenhum pode ser o clique óbvio.
// Mede, para cada minigame, (1) a chance "pela carta" de cada estilo (a que o robô e o botão "deixar o jogo decidir" usam)
// e (2) um modelo de jogador humano com três níveis de precisão no toque, para ver se um estilo ganha sempre
// e se jogar e "deixar o jogo decidir" ficam na mesma régua (médio ≈ carta; bom acima, ruim abaixo).
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
    // Lê a seta se reagir antes do chute (tellMs + 170 ms de folga). Reação de escolha (ver a seta, decidir o lado e tocar):
    // quem joga bem reage mais rápido. Média 190 ms + 1,1·erro (bom ~245 ms, médio ~320 ms, ruim ~430 ms), variando 0,4·erro
    const rs = R(), side = rs < 0.42 ? -1 : rs < 0.84 ? 1 : 0, miss = R() < (k.miss || 0.07);
    const ax = side === 0 ? R() * 0.2 : 0.35 + R() * 0.62;
    const read = 190 + sd * 1100 + gauss() * sd * 400 < k.tellMs + 170;
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
  // Chute: mira x corre a 5/period por segundo, y a 2,9/period; tremedeira entra como erro a mais.
  // O humano mira no ponto que mais dá certo para a precisão dele (aprendeu jogando; aimOf)
  const rise = k.rise || 0, aim = aimOf(type, k.style, sd);
  return kick(k, aim[0] * (k.fk ? 1 : (R() < 0.5 ? -1 : 1)), aim[1] - rise, sd);
}
function kick(k, tx, ty, sd) {
  const R = Math.random;
  const wob = () => (R() - 0.5) * 2 * k.wobble;
  const x = tx + gauss() * sd * 5 / k.period + wob(), y = Math.max(0, ty + gauss() * sd * 2.9 / k.period + wob());
  const kr = R(), bs = Math.sign(x) || 1, keeper = k.fk ? 0 : kr < 0.38 ? bs : kr < 0.8 ? -bs : 0;
  return S.kickResult(k, x, y, keeper).ok;
}
// Melhor ponto de mira (x, y) para um nível de precisão, testado numa carta mediana (atributos 72)
const AIM = {};
function aimOf(type, style, sd) {
  const key = type + style + sd;
  if (AIM[key]) return AIM[key];
  const c = S.newCareer({ name: 'T', pos: 'ATA', foot: 'D', country: 'Brasil' }, 1);
  for (const a in c.attrs) c.attrs[a] = 72;
  const k = S.kickSetup(c, type, style);
  let best = [-1];
  for (let tx = k.fk ? -0.95 : 0.4; tx <= 0.951; tx += 0.05) for (let ty = 0.2; ty <= 0.91; ty += 0.1) {
    let ok = 0;
    for (let i = 0; i < 600; i++) if (kick(k, tx * (k.fk ? 1 : (Math.random() < 0.5 ? -1 : 1)), ty - (k.rise || 0), sd)) ok++;
    if (ok > best[0]) best = [ok, tx, ty];
  }
  return (AIM[key] = best.slice(1));
}

const out = {};
for (const type of TYPES) {
  const ids = S.styleIds(type), acc = {};
  for (const id of ids) acc[id] = { chance: 0, best: 0, bom: 0, medio: 0, ruim: 0, band: [0, 1, 2].map(() => ({ n: 0, chance: 0, medio: 0 })) };
  for (let i = 0; i < N; i++) {
    const c = S.newCareer({ name: 'T', pos: POS[type], foot: 'D', country: 'Brasil' }, 1000 + i);
    // Carta em vários pontos da carreira: atributos entre 55 e 88
    const lvl = 55 + Math.floor(Math.random() * 34);
    for (const a in c.attrs) c.attrs[a] = Math.max(40, Math.min(95, lvl + Math.round(gauss() * 8)));
    const ks = ids.map(id => S.kickSetup(c, type, id));
    const top = Math.max(...ks.map(k => k.chance));
    const bd = lvl < 67 ? 0 : lvl < 78 ? 1 : 2; // carta fraca, média, forte
    ks.forEach((k, j) => {
      const a = acc[ids[j]], b = a.band[bd];
      a.chance += k.chance; if (k.chance === top) a.best++;
      for (const sk in SKILL) { let ok = 0; for (let t = 0; t < 60; t++) if (play(k, type, SKILL[sk])) ok++; a[sk] += ok / 60; if (sk === 'medio') b.medio += ok / 60; }
      b.n++; b.chance += k.chance;
    });
  }
  out[type] = acc;
  console.log('\n' + type.toUpperCase() + ' (' + POS[type] + ')');
  console.log('  estilo      carta  melhor   jogado: bom  médio  ruim    médio−carta (carta fraca/média/forte)');
  for (const id of ids) {
    const a = acc[id];
    console.log('  ' + id.padEnd(10) + (a.chance / N * 100).toFixed(0).padStart(5) + '%' + (a.best / N * 100).toFixed(0).padStart(7) + '%' + '         ' + ['bom', 'medio', 'ruim'].map(s => (a[s] / N * 100).toFixed(0).padStart(3) + '%').join('   ') +
      '    ' + a.band.map(b => b.n ? ((b.medio - b.chance) / b.n * 100).toFixed(0).padStart(4) : '   -').join(' '));
  }
}
// Alerta: estilo que ganha em todos os níveis por mais de 6 pontos
let alerts = 0;
for (const type of TYPES) {
  const [a, b] = S.styleIds(type).map(id => out[type][id]);
  const d = ['bom', 'medio', 'ruim'].map(s => (b[s] - a[s]) / N * 100);
  if (d.every(x => x > 6) || d.every(x => x < -6)) { alerts++; console.log('\nALERTA ' + type + ': um estilo domina em todos os níveis (' + d.map(x => x.toFixed(0)).join('/') + ')'); }
  if (Math.abs(b.chance - a.chance) / N > 0.04) { alerts++; console.log('\nALERTA ' + type + ': chance pela carta difere mais de 4 pontos'); }
  // Jogar e deixar o jogo decidir na mesma régua: o jogador médio fica a até 10 pontos da carta; o bom joga melhor que a carta e o ruim pior
  for (const id of S.styleIds(type)) {
    const x = out[type][id], gap = (x.medio - x.chance) / N * 100;
    if (Math.abs(gap) > 10) { alerts++; console.log('\nALERTA ' + type + '/' + id + ': médio a mais de 10 pontos da carta (' + (gap > 0 ? '+' : '') + gap.toFixed(0) + ')'); }
    if (x.bom <= x.chance || x.ruim >= x.chance) { alerts++; console.log('\nALERTA ' + type + '/' + id + ': o bom precisa jogar melhor que a carta e o ruim pior'); }
  }
}
console.log('\nAlertas: ' + alerts);
