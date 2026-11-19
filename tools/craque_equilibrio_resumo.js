// Semáforo da checagem de equilíbrio: lê os logs que tools/craque_equilibrio.sh grava e compara com os alvos.
// Uso: node tools/craque_equilibrio_resumo.js <pasta>
// Alvos (mude aqui quando o Silvio aprovar um alvo novo):
const ALVO = {
  gols: [2.5, 2.9, 2.3, 3.1],        // gols por jogo: verde entre os 2 primeiros, amarelo entre os 2 últimos
  golsMotor: [0.08, 0.15],           // ao vivo contra o que o motor espera (verde até 8%, amarelo até 15%)
  vit: [33, 45, 28, 50],             // vitória do seu time no ao vivo (%)
  emp: [22, 32, 18, 36],             // empate (%)
  meta: [45, 65, 38, 72],            // robô que nunca muda a tática: meta cumprida (%)
  dem: [10, 25, 6, 32],              // demitido (%)
  verm: [10, 25],                    // temporadas que FECHAM no vermelho, por tamanho de clube (%; o robô não compra)
  tatica: [5, 2],                    // esperto tem de bater a tática fixa por 5+ pontos de meta (amarelo 2+)
  fora: [0.5, 2],                    // atacante no gol: perde 0,5+ ponto por jogo e 2x mais que no meio
};
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '/tmp/equilibrio';
const rd = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch (e) { return ''; } };
const num = (txt, re) => { const m = txt.match(re); return m ? +m[1] : NaN; };
const out = [], cor = { v: '🟢', a: '🟡', r: '🔴', x: '⚪' };
const faixa = (x, a) => !Number.isFinite(x) ? 'x' : (x >= a[0] && x <= a[1]) ? 'v' : (x >= a[2] && x <= a[3]) ? 'a' : 'r';
const pior = (...ks) => ks.includes('x') ? 'x' : ks.includes('r') ? 'r' : ks.includes('a') ? 'a' : 'v';
const linha = (k, nome, txt) => out.push(`${cor[k]} ${nome}: ${txt}`);

// 1 e 2: ao vivo (várias sementes)
const av = fs.readdirSync(dir).filter(f => /^aovivo.*\.log$/.test(f)).map(rd);
if (av.length) {
  const m = k => av.map(t => num(t, k)).filter(Number.isFinite), med = a => a.reduce((x, y) => x + y, 0) / a.length;
  const g = med(m(/gols por jogo ([\d.]+)/)), e = med(m(/o motor espera ([\d.]+)/));
  const v = med(m(/V\/E\/D: (\d+)%/)), d = med(m(/V\/E\/D: \d+% \/ (\d+)%/)), l = med(m(/V\/E\/D: \d+% \/ \d+% \/ (\d+)%/));
  const fr = med(m(/fraco [\d.]+ → ([\d.]+)/)), fe = med(m(/fraco ([\d.]+) →/)), fo = med(m(/forte [\d.]+ → ([\d.]+)/)), foe = med(m(/forte ([\d.]+) →/));
  const al = av.reduce((a, t) => a + (t.match(/^ALERTAS \((\d+)\)/m) ? +RegExp.$1 : 0), 0);
  const dif = Math.abs(g / e - 1), kd = dif <= ALVO.golsMotor[0] ? 'v' : dif <= ALVO.golsMotor[1] ? 'a' : 'r';
  linha(pior(faixa(g, ALVO.gols), kd), 'Gols por jogo no ao vivo', `${g.toFixed(2)} (o motor queria ${e.toFixed(2)}, ${g >= e ? '+' : '−'}${(dif * 100).toFixed(0)}%; time fraco ${fr.toFixed(2)} de ${fe.toFixed(2)}, forte ${fo.toFixed(2)} de ${foe.toFixed(2)}; ${av.length} sementes, ${al} alertas)`);
  linha(pior(faixa(v, ALVO.vit), faixa(d, ALVO.emp)), 'Seu time no ao vivo', `vitória ${v.toFixed(0)}% · empate ${d.toFixed(0)}% · derrota ${l.toFixed(0)}%`);
}
// 3: motor resumido, metas, finanças
const tr = rd('treinador.log');
if (tr) {
  const g = num(tr, /Jogo: ([\d.]+) gols/), me = num(tr, /meta cumprida (\d+)%/), de = num(tr, /demitido (\d+)%/);
  linha(faixa(g, ALVO.gols), 'Gols por jogo no jogo rápido (Só resultado)', g.toFixed(2));
  linha(pior(faixa(me, ALVO.meta), faixa(de, ALVO.dem)), 'Carreira (robô que nunca muda a tática)', `meta cumprida ${me}% · demitido ${de}% · ${/termina igual/.test(tr) ? 'save no meio ok' : 'SAVE NO MEIO MUDA'}`);
  const fb = tr.match(/^Finanças por tamanho.*$/m);
  if (fb) {
    const ks = [...fb[0].matchAll(/(grande|médio|pequeno) (\d+) temporadas, passou pelo vermelho (\d+)%, fechou no vermelho (\d+)%, caixa no fim (-?\d+) semanas/g)];
    const k = pior(...ks.map(x => +x[4] <= ALVO.verm[0] ? 'v' : +x[4] <= ALVO.verm[1] ? 'a' : 'r'));
    linha(k, 'Finanças (robô não compra)', ks.map(x => `${x[1]}: fechou no vermelho ${x[4]}%, caixa ${x[5]} sem. de folha`).join(' · '));
  }
}
// 4: tática
const ta = rd('taticas.log'), fx = rd('fixa.log'), es = rd('esperto.log');
if (ta || fx) {
  const al = num(ta, /^(\d+) alertas/m), mf = num(fx, /meta cumprida (\d+)%/), mesp = num(es, /meta cumprida (\d+)%/), d = mesp - mf;
  const k = pior(al === 0 ? 'v' : Number.isFinite(al) ? 'r' : 'x', !Number.isFinite(d) ? 'x' : d >= ALVO.tatica[0] ? 'v' : d >= ALVO.tatica[1] ? 'a' : 'r');
  linha(k, 'Nenhuma tática domina', `tabela tática ${Number.isFinite(al) ? al + ' alertas' : 'sem resultado'} · sempre 4-5-1 lados ${mf}% de meta contra ${mesp}% de quem escolhe jogo a jogo`);
}
// 5: fora de posição
const du = rd('duelo.log'), dg = rd('duelo-gol.log'), dm = rd('duelo-mei.log');
if (du && dg && dm) {
  const pts = t => { const w = num(t, /venceu (\d+)%/), e = num(t, /empate (\d+)%/); return (3 * w + e) / 100; };
  const b = pts(du), g = b - pts(dg), m = b - pts(dm);
  const k = !Number.isFinite(g) ? 'x' : (g >= ALVO.fora[0] && g >= ALVO.fora[1] * Math.max(0.05, m)) ? 'v' : g > m ? 'a' : 'r';
  linha(k, 'Fora de posição (Flamengo x Palmeiras)', `normal ${b.toFixed(2)} pts/jogo · atacante no gol −${g.toFixed(2)} · atacante no meio −${m.toFixed(2)}`);
}
// 6: regras
const te = rd('temporadas.log');
if (te) {
  const a = num(te, /^(\d+) alertas/m);
  linha(a === 0 ? 'v' : Number.isFinite(a) ? 'r' : 'x', 'Temporadas inteiras', `${Number.isFinite(a) ? a : '?'} alertas`);
}
console.log(out.join('\n'));
const n = k => out.filter(l => l.startsWith(cor[k])).length;
console.log(`Resultado: ${n('v')} verdes, ${n('a')} amarelos, ${n('r')} vermelhos${n('x') ? ', ' + n('x') + ' sem dado (ver o .log)' : ''}`);
