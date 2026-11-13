// Modo Treinador, vida entre os jogos (Silvio, 2026-11-12: "pro jogo não ser morto e parado, entrevistas que impactem
// na moral do elenco ... e mais eventos aleatórios"; desenho em /mnt/project-files/climbix/vestiario/).
// Coletiva: depois de jogo grande (clássico, goleada, 3 seguidas, emprego em risco, copa decidida) e, fora isso, uma de
// vez em quando. Uma pergunta, 3 respostas, cada uma com preço em elenco, torcida (humor do estádio), diretoria
// (confiança escondida) ou caixa. Prometer vitória é a arriscada: vale no jogo seguinte.
// Acontecimentos da semana: um pacote de 12 situações com escolha (balada, briga no treino, amistoso pago...), cada uma
// no máximo uma vez por temporada. Regra: no máximo UMA janelinha por semana (coletiva, conversa ou acontecimento),
// e só quando nenhuma outra (proposta recebida, obra pronta...) abriu (a tela decide isso).
// Nada aqui usa o sorteio da carreira: tudo sai de um hash preso à carreira, à temporada e à rodada (save no meio
// termina igual). Estado: co.pv = { s, r (última coletiva), e (último acontecimento), w (última janelinha), d (ids da
// temporada) }, co.pressB = aposta da coletiva { s, n (número de jogos da temporada quando apostou), win, lose }.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const env = (k, d) => { const v = typeof process !== 'undefined' && process.env && process.env[k]; return v !== undefined && v !== '' && v !== false ? +v : d; };
  const P = S.CO_PV = {
    on: env('CO_PV', 1),       // 0 desliga coletiva e acontecimentos (mede o jogo de antes)
    pressGap: 3,               // coletiva comum: no mínimo 3 rodadas depois da última
    pressP: 0.45,              // ... e então em 45% das semanas
    bigGap: 2,                 // coletiva de jogo grande: 2 rodadas depois da última
    evGap: 2,                  // acontecimento: 2 rodadas depois do último
    evP: 0.42,                 // ... e então em 42% das semanas sem outra janelinha
    from: 2,                   // nada antes da 2ª rodada (a 1ª carreira ainda está no tutorial)
    cxK: 1,                    // dinheiro dos acontecimentos em semanas da folha normal (`S.coFinBase`)
  };
  const hsh = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
  const keyOf = co => String(co.name || '') + '|' + co.club + '|' + co.season + '|' + (co.ss ? co.ss.i : 0);
  const roll = (co, tag) => hsh(keyOf(co) + '|' + tag);
  const moOf = p => (p.mo === undefined ? 60 : p.mo);
  const pv = co => { if (!co.pv || co.pv.s !== co.season) co.pv = { s: co.season, r: -9, e: -9, w: -9, d: [] }; return co.pv; };
  const rd = co => (co.ss ? co.ss.i : 0);              // rodadas jogadas na liga
  const nGames = co => (co.ss ? co.ss.log.length : 0) + (co.ss && co.ss.cup ? (co.ss.cup.log || []).length : 0);
  const okP = p => p && !p.out && !p.sus;
  const byId = (co, id) => co.squad.find(p => p.id === id);
  const xi = co => (co.xi || []).map(id => byId(co, id)).filter(Boolean);
  const avgOvr = co => { const a = co.squad.map(p => p.ovr).sort((x, y) => y - x).slice(0, 11); return a.reduce((s, v) => s + v, 0) / Math.max(1, a.length); };
  const week = co => Math.max(1, Math.round((S.coFinBase ? S.coFinBase(co) : 100000) * P.cxK));

  // ---------- efeitos ----------
  // fx: { mo (todo o elenco), xi (só os titulares), p / p2 (o jogador do caso), en / xiEn / bnEn (energia), hum (torcida),
  //       conf (diretoria), cx (caixa em semanas da folha), sus (fora do próximo jogo), out (rodadas fora), prom (promessa) }
  function apply(co, fx, t) {
    if (!fx) return;
    const mo = (p, d) => { if (p) p.mo = clamp(moOf(p) + d, 0, 100); };
    if (fx.mo) co.squad.forEach(p => mo(p, fx.mo));
    if (fx.xi) xi(co).forEach(p => mo(p, fx.xi));
    if (fx.p && t) mo(t.p, fx.p);
    if (fx.p2 && t) mo(t.p2, fx.p2);
    if (fx.en && t && t.p) t.p.en = clamp(t.p.en + fx.en, 0, 100);
    if (fx.xiEn) xi(co).forEach(p => { p.en = clamp(p.en + fx.xiEn, 0, 100); });
    if (fx.bnEn) co.squad.filter(p => !(co.xi || []).includes(p.id)).forEach(p => { p.en = clamp(p.en + fx.bnEn, 0, 100); });
    if (fx.hum && S.coEst) { const e = S.coEst(co); if (e) e.hum = clamp(e.hum + fx.hum, 0, 100); }
    if (fx.conf && co.board) co.board.conf = clamp(co.board.conf + fx.conf, 0, 100);
    if (fx.cx && co.fin) { const v = Math.round(week(co) * fx.cx), f = co.fin; f.caixa += v; f.ss = f.ss || {};
      if (v > 0) f.ss.pat = (f.ss.pat || 0) + v; else f.ss.comp = (f.ss.comp || 0) - v; }
    if (fx.sus && t && t.p) t.p.sus = Math.max(t.p.sus || 0, 1);
    if (fx.out && t && t.p) t.p.out = Math.max(t.p.out || 0, fx.out);
    if (fx.prom && t && t.p) { const nx = S.coNext(co); t.p.prom = (nx ? nx.round : 0) + 2; }
  }
  // Etiquetas para a tela ([tom, seta, texto]), na ordem em que aparecem
  const NAMES = { mo: 'elenco', xi: 'titulares', hum: 'torcida', conf: 'diretoria', cx: 'caixa', xiEn: 'energia dos titulares', bnEn: 'energia dos reservas', en: 'energia dele' };
  S.coPvTags = function (co, fx, t) {
    const out = [];
    const ar = (k, v) => { const big = Math.abs(v) >= (k === 'cx' ? 0.5 : k === 'xiEn' || k === 'bnEn' || k === 'en' ? 15 : 8); return (v > 0 ? '▲' : '▼').repeat(big ? 2 : 1); };
    ['p', 'p2'].forEach(k => { if (fx[k] && t && t[k]) out.push([fx[k] > 0 ? 'up' : 'dn', ar('p', fx[k]), t[k].n.split(' ').slice(-1)[0]]); });
    ['mo', 'xi', 'hum', 'conf', 'cx', 'en', 'xiEn', 'bnEn'].forEach(k => { if (!fx[k]) return;
      out.push([fx[k] > 0 ? 'up' : 'dn', ar(k, fx[k]), NAMES[k] + (k === 'cx' ? ' R$ ' + S.coPvMi(week(co) * Math.abs(fx[k])) : '')]); });
    if (fx.sus) out.push(['dn', '', 'fora do próximo jogo']);
    if (fx.out) out.push(['dn', '', 'fora ' + fx.out + (fx.out > 1 ? ' jogos' : ' jogo')]);
    if (fx.prom) out.push(['dn', '', 'entra em até 3 jogos']);
    return out;
  };
  S.coPvMi = v => { v = Math.round(v); return v >= 1e6 ? (Math.round(v / 1e5) / 10).toString().replace('.', ',') + ' mi' : v >= 1e3 ? Math.round(v / 1e3) + ' mil' : String(v); };

  // ---------- coletiva ----------
  // Respostas por situação. `bet` = a promessa (vale no próximo jogo); `risk` = sorteio na hora (p = chance de dar certo)
  const BET = { k: 'promete', name: 'Prometer vitória', fx: { hum: 4 }, bet: { win: { conf: 4, mo: 3, hum: 3 }, lose: { hum: -8, conf: -4 } },
    re: 'Promessa anotada. A torcida vai cobrar no próximo jogo.', tags: [['ar', '?', 'vale no próximo jogo']] };
  const OPS = {
    v: [
      { k: 'chao', name: 'Pés no chão', fx: { mo: 2 }, re: 'Discurso de quem já viu de tudo. O grupo gostou.' },
      { k: 'craque', name: 'Elogiar o destaque', who: 'best', fx: { p: 12, mo: -2 }, re: 'Ele vai dormir feliz. Alguns no vestiário, nem tanto.' },
      BET,
    ],
    e: [
      { k: 'grupo', name: 'Grupo fechado', fx: { mo: 3 }, re: 'Recado dado: aqui ninguém solta a mão de ninguém.' },
      { k: 'reforco', name: 'Pedir reforços', fx: { hum: 5, conf: -4, mo: -2 }, re: 'A torcida aplaudiu. O presidente não atendeu o telefone.' },
      BET,
    ],
    d: [
      { k: 'assumo', name: 'Eu assumo', fx: { mo: 5, conf: -3 }, re: 'O elenco viu o técnico na frente. A diretoria anotou.' },
      { k: 'cobrar', name: 'Cobrar o time', fx: { conf: 4, mo: -5 }, re: 'Manchete garantida: "técnico cobra o elenco".' },
      { k: 'juiz', name: 'Culpar a arbitragem', fx: { hum: 5, mo: 2 }, risk: { p: 0.6, lose: { cx: -0.3, conf: -3 } },
        re: 'A torcida comprou a briga.', reLose: 'A liga não gostou: multa e puxão de orelha da diretoria.', tags: [['ar', '?', 'pode dar multa']] },
    ],
    ult: [
      { k: 'confio', name: 'Confio no grupo', fx: { mo: 6, conf: -2 }, re: 'O vestiário fechou com você. A diretoria quer ver em campo.' },
      { k: 'trabalho', name: 'Só o trabalho responde', fx: { conf: 3 }, re: 'Resposta curta, sem polêmica. O presidente gostou.' },
      BET,
    ],
  };
  const Q = {
    ult: ['EMPREGO EM RISCO', 'A diretoria está perdendo a paciência. Você ainda tem o grupo na mão?'],
    copaV: ['COPA', 'Campeão da copa! O que essa taça muda para o resto do ano?'],
    copaD: ['COPA', 'Fora da copa. Quem paga essa conta?'],
    classV: ['CLÁSSICO', 'Vitória no clássico! A cidade é de vocês. E agora?'],
    classE: ['CLÁSSICO', 'Empate no clássico. Bom ou ruim?'],
    classD: ['CLÁSSICO', 'Derrota no clássico. A torcida está na bronca. Explica?'],
    golV: ['GOLEADA', 'Que goleada! Esse é o time de verdade?'],
    golD: ['GOLEADA', 'Goleada sofrida. De quem é a culpa?'],
    seqV: ['3 VITÓRIAS SEGUIDAS', 'Três vitórias seguidas. Dá para sonhar alto?'],
    seqD: ['3 DERROTAS SEGUIDAS', 'Três derrotas seguidas. O que está acontecendo?'],
    v: ['DEPOIS DO JOGO', 'Vitória importante. O time está pronto?'],
    e: ['DEPOIS DO JOGO', 'Mais um empate. Falta o quê para vencer?'],
    d: ['DEPOIS DO JOGO', 'Derrota. O que deu errado hoje?'],
  };
  // Por que esta coletiva: o jogo grande vale mais que a de rotina
  function pressWhy(co, log) {
    if (!log || !co.ss) return null;
    const r = log.res, R = r === 'v' ? 'V' : r === 'd' ? 'D' : 'E', B = co.board || {};
    if (B.ult && !log.cup) return { q: 'ult', big: 1 };
    // Copa: decide pelo próprio jogo (log), não pela copa nacional: um jogo da continental não olha ss.cup (13/11: o
    // repórter dizia "fora da copa" no meio dos grupos da Sul-Americana, porque a copa nacional já tinha acabado).
    // Fora só quando ESTE jogo eliminou: perdeu o mata-mata (jogo único ou volta) ou fechou o grupo (jogo 6) sem passar.
    if (log.cup) {
      if (log.champ) return { q: 'copaV', big: 1, r: 'v' };
      const grp = log.cont && log.k < 6, out = grp ? log.k === 5 && log.pass === false : log.leg !== 1 && log.win === false;
      return out ? { q: 'copaD', big: 1, r: 'd' } : null;
    }
    if ((D.RIVALS[co.club] || []).includes(log.vs)) return { q: 'class' + R, big: 1 };
    if (Math.abs(log.gf - log.ga) >= 4) return { q: 'gol' + (r === 'v' ? 'V' : 'D'), big: 1 };
    const l4 = co.ss.log.slice(-4).map(x => x.res), l3 = l4.slice(-3); // exatamente 3 seguidas (a 4ª, a 5ª... não repetem)
    if (l3.length === 3 && l3.every(x => x === r) && r !== 'e' && (l4.length < 4 || l4[0] !== r)) return { q: 'seq' + R, big: 1 };
    return { q: r, big: 0 };
  }
  S.coPress = function (co, log) {
    const w = pressWhy(co, log); if (!w) return null;
    const res = w.r || log.res, ops = OPS[w.q === 'ult' ? 'ult' : res];
    const best = (log.rt || []).slice().sort((a, b) => b.r - a.r)[0], bp = best && byId(co, best.id);
    const t = { p: bp || xi(co).sort((a, b) => b.ovr - a.ovr)[0] };
    const q = Q[w.q], o = ops.map(x => Object.assign({}, x, { tags: (x.tags || []).concat(S.coPvTags(co, x.fx, x.who ? t : null)), who: x.who ? t.p && t.p.n : null }));
    // Elogiar o destaque: o nome dele no botão
    o.forEach(x => { if (x.k === 'craque' && t.p) x.name = 'Elogiar ' + t.p.n.split(' ').slice(-1)[0]; });
    return { kind: 'press', big: w.big, q: w.q, tag: q[0], say: q[1], ops: o, t: t.p ? t.p.id : null };
  };
  // Respondeu: aplica o preço e devolve a fala da jornalista (e se a arriscada deu errado)
  S.coPressAnswer = function (co, d, k) {
    const o = d.ops.find(x => x.k === k); if (!o) return null;
    const t = { p: d.t && byId(co, d.t) };
    apply(co, o.fx, o.who ? t : null);
    let ok = true;
    if (o.risk) { ok = roll(co, 'risk:' + k) < o.risk.p; if (!ok) apply(co, o.risk.lose); }
    if (o.bet) co.pressB = { s: co.season, n: nGames(co), win: o.bet.win, lose: o.bet.lose };
    const v = pv(co); v.r = rd(co); v.w = rd(co);
    return { re: ok ? o.re : o.reLose, ok };
  };
  // A promessa da coletiva vale no jogo seguinte (liga ou copa): ganhou, o prêmio; não ganhou, a cobrança
  S.coPressBet = function (co, log) {
    const b = co.pressB; if (!b || !log) return null;
    if (b.s !== co.season) { delete co.pressB; return null; }
    if (nGames(co) <= b.n) return null;
    delete co.pressB;
    const win = log.cup && log.leg !== 1 && !log.grp ? !!log.win : log.res === 'v';
    apply(co, win ? b.win : b.lose);
    return { win };
  };

  // ---------- acontecimentos da semana ----------
  // Cada um: when(co) devolve o caso ({ p, p2 }) ou nada; ops com fx (e risk { p, win, lose }). `say` recebe o caso.
  const last = n => n.split(' ').slice(-1)[0];
  const pickBy = (co, list, tag) => list.length ? list[Math.floor(roll(co, tag) * list.length) % list.length] : null;
  const EV = S.CO_EVT = [
    { id: 'balada', tag: 'FORA DE CAMPO', ttl: 'Visto na balada',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.age <= 30 && x.pos !== 'GOL'), 'balada'); return p && { p }; },
      say: t => t.p.n + ' foi visto numa balada de madrugada, dois dias antes do jogo. A foto já rodou.',
      ops: [
        { k: 'afastar', name: 'Multar e afastar', fx: { sus: 1, p: -8, conf: 3 }, re: 'Recado dado para o grupo inteiro.' },
        { k: 'conversa', name: 'Conversa reservada', fx: { p: 3 }, risk: { p: 0.65, lose: { mo: -3, conf: -3 } }, re: 'Ele pediu desculpas e treinou dobrado.', reLose: 'Ele saiu de novo. Agora o vestiário inteiro sabe.', tags: [['ar', '?', 'pode se repetir']] },
        { k: 'deixar', name: 'Deixar passar', fx: { p: 4, mo: -4, conf: -2 }, re: 'Ele agradeceu. Os outros notaram.' },
      ] },
    { id: 'briga', tag: 'TREINO', ttl: 'Briga no treino',
      when: co => { const l = xi(co).filter(x => x.pos !== 'GOL'); if (l.length < 2) return null; const p = pickBy(co, l, 'briga1'), p2 = pickBy(co, l.filter(x => x !== p), 'briga2'); return { p, p2 }; },
      say: t => t.p.n + ' e ' + t.p2.n + ' trocaram empurrões no treino. Teve gente separando.',
      ops: [
        { k: 'punir', name: 'Punir os dois', fx: { p: -6, p2: -6, mo: 3, conf: 2 }, re: 'Regra é regra. O grupo entendeu.' },
        { k: 'pazes', name: 'Fazer as pazes', fx: {}, risk: { p: 0.6, win: { p: 5, p2: 5, mo: 2 }, lose: { p: -6, p2: -6, mo: -3 } }, re: 'Abraço na frente de todo mundo. Virou piada interna.', reLose: 'Não deu liga. O clima piorou.', tags: [['up', '▲', 'os dois'], ['ar', '?', 'pode piorar']] },
        { k: 'ignorar', name: 'Ignorar', fx: { mo: -4 }, re: 'O assunto ficou no ar a semana inteira.' },
      ] },
    { id: 'amistoso', tag: 'PROPOSTA', ttl: 'Amistoso pago',
      when: co => (co.fin ? {} : null),
      say: () => 'Um clube do exterior quer um amistoso no meio da semana. Paga bem, mas cansa.',
      ops: [
        { k: 'titulares', name: 'Ir com os titulares', fx: { cx: 0.6, xiEn: -16 }, re: 'Cachê no bolso. O time volta pesado.' },
        { k: 'reservas', name: 'Ir com os reservas', fx: { cx: 0.25, bnEn: -10, mo: 1 }, re: 'Os reservas ganharam ritmo. Cachê menor.' },
        { k: 'recusar', name: 'Recusar', fx: { conf: -2 }, re: 'O presidente queria esse dinheiro.' },
      ] },
    { id: 'base', tag: 'BASE', ttl: 'Garoto pede chance',
      when: co => { const p = co.squad.filter(x => x.age <= 21 && !(co.xi || []).includes(x.id) && okP(x) && !x.prom).sort((a, b) => b.ovr - a.ovr)[0]; return p && { p }; },
      say: t => t.p.n + ', ' + t.p.age + ' anos, bateu na sua porta: quer uma chance no time de cima.',
      ops: [
        { k: 'prometer', name: 'Prometer chance', fx: { p: 12, prom: 1 }, re: 'Ele saiu da sala sorrindo. Agora tem de cumprir.' },
        { k: 'treinar', name: 'Treinar com os titulares', fx: { p: 5, xiEn: -4 }, re: 'Ele vai treinar com os grandes. Treino mais puxado.' },
        { k: 'paciencia', name: 'Pedir paciência', fx: { p: -5 }, re: 'Ele entendeu. Mas não gostou.' },
      ] },
    { id: 'patro', tag: 'PATROCINADOR', ttl: 'Ação do patrocinador',
      when: co => (co.fin ? {} : null),
      say: () => 'O patrocinador quer o elenco num evento com fotos e autógrafos na véspera do jogo.',
      ops: [
        { k: 'todos', name: 'Levar o elenco', fx: { cx: 0.35, xiEn: -8, mo: -2 }, re: 'O patrocinador adorou. O elenco, nem tanto.' },
        { k: 'capitao', name: 'Mandar o capitão', fx: { cx: 0.12 }, re: 'Meio-termo. Cachê pequeno.' },
        { k: 'recusar', name: 'Recusar', fx: { conf: -3, mo: 2 }, re: 'O elenco descansou. A diretoria anotou.' },
      ] },
    { id: 'filho', tag: 'VESTIÁRIO', ttl: 'Nasceu o filho',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.age >= 23), 'filho'); return p && { p }; },
      say: t => 'Nasceu o filho de ' + t.p.n + '. Ele pede para ficar com a família no fim de semana do jogo.',
      ops: [
        { k: 'liberar', name: 'Liberar do jogo', fx: { sus: 1, p: 12, mo: 3 }, re: 'Ele vai lembrar disso para sempre. O grupo também.' },
        { k: 'dia', name: 'Só um dia de folga', fx: { p: 5 }, re: 'Volta para o jogo. Agradeceu o dia.' },
        { k: 'nao', name: 'Não liberar', fx: { p: -10, mo: -2 }, re: 'Ele vai jogar. Calado.' },
      ] },
    { id: 'protesto', tag: 'TORCIDA', ttl: 'Protesto no CT',
      when: co => { const e = S.coEst && S.coEst(co); return e && e.hum < 45 ? {} : null; },
      say: () => 'Um grupo da torcida está no portão do CT com faixas cobrando o time.',
      ops: [
        { k: 'conversar', name: 'Conversar com eles', fx: {}, risk: { p: 0.55, win: { hum: 9 }, lose: { hum: -6, mo: -2 } }, re: 'Você ouviu, explicou e foi aplaudido na saída.', reLose: 'A conversa esquentou. Virou manchete.', tags: [['up', '▲▲', 'torcida'], ['ar', '?', 'pode esquentar']] },
        { k: 'fechado', name: 'Treino fechado', fx: { mo: 3, hum: -3 }, re: 'O grupo treinou em paz. A torcida ficou do lado de fora.' },
        { k: 'ignorar', name: 'Ignorar', fx: { hum: -5 }, re: 'As faixas ficaram lá a semana inteira.' },
      ] },
    { id: 'veterano', tag: 'VESTIÁRIO', ttl: 'Veterano pensa em parar',
      when: co => { const p = co.squad.filter(x => x.age >= 32).sort((a, b) => b.age - a.age)[0]; return p && { p }; },
      say: t => t.p.n + ', ' + t.p.age + ' anos, disse na entrevista que pensa em pendurar as chuteiras no fim do ano.',
      ops: [
        { k: 'lider', name: 'Fazer dele o líder', fx: { p: 6, mo: 3 }, re: 'Ele vai falar antes dos jogos. O grupo gostou.' },
        { k: 'apoiar', name: 'Apoiar o que ele quiser', fx: { p: 8 }, re: 'Ele se sentiu respeitado.' },
        { k: 'cobrar', name: 'Cobrar foco', fx: { p: -6, conf: 2 }, re: '"Enquanto estiver aqui, é 100%." Ele não gostou do tom.' },
      ] },
    { id: 'boato', tag: 'IMPRENSA', ttl: 'Boato de saída',
      when: co => { const p = xi(co).sort((a, b) => b.ovr - a.ovr)[0]; return p && p.ovr >= avgOvr(co) + 2 ? { p } : null; },
      say: t => 'Um jornal diz que ' + t.p.n + ' quer jogar num clube maior. Ele não desmentiu.',
      ops: [
        { k: 'nosso', name: '"Ele é nosso"', fx: { p: 7, conf: -2 }, re: 'Ele curtiu a defesa. A diretoria queria a venda como opção.' },
        { k: 'brincar', name: 'Brincar na resposta', fx: { hum: 4 }, re: 'A coletiva riu. O assunto morreu.' },
        { k: 'mercado', name: '"O mercado decide"', fx: { p: -6, conf: 3 }, re: 'A diretoria gostou. Ele, não.' },
      ] },
    { id: 'beneficente', tag: 'CIDADE', ttl: 'Jogo beneficente',
      when: co => (co.fin ? {} : null),
      say: () => 'Uma instituição da cidade pede um jogo beneficente com o elenco nesta semana.',
      ops: [
        { k: 'jogar', name: 'Jogar com o elenco', fx: { hum: 6, xiEn: -10, mo: 2 }, re: 'Estádio cheio e criança feliz. As pernas pesam.' },
        { k: 'doar', name: 'Doar e mandar a base', fx: { hum: 3, cx: -0.15 }, re: 'Bonito gesto. Saiu do caixa.' },
        { k: 'recusar', name: 'Recusar', fx: { hum: -4 }, re: 'A cidade não gostou da resposta.' },
      ] },
    { id: 'lesao', tag: 'DEPARTAMENTO MÉDICO', ttl: 'Sentiu a coxa',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.pos !== 'GOL'), 'lesao'); return p && { p }; },
      say: t => t.p.n + ' sentiu a coxa no treino. Os médicos acham que dá para jogar, mas não garantem.',
      ops: [
        { k: 'poupar', name: 'Poupar um jogo', fx: { sus: 1, p: 2 }, re: 'Uma semana de gelo e ele volta inteiro.' },
        { k: 'leve', name: 'Treino leve', fx: { en: -20 }, re: 'Joga, mas sem toda a energia.' },
        { k: 'arriscar', name: 'Arriscar', fx: {}, risk: { p: 0.65, lose: { out: 3, p: -4 } }, re: 'Passou no teste. Joga normal.', reLose: 'A coxa não aguentou: três jogos fora.', tags: [['up', '', 'joga inteiro'], ['ar', '?', 'pode ficar 3 fora']] },
      ] },
    { id: 'idolo', tag: 'CT', ttl: 'Visita de um ídolo',
      when: () => ({}),
      say: () => 'Um ídolo da história do clube apareceu no CT e quer falar com o elenco.',
      ops: [
        { k: 'palestra', name: 'Palestra para o grupo', fx: { mo: 4 }, re: 'Silêncio total na sala. Arrepiou.' },
        { k: 'treino', name: 'Treinar com eles', fx: { mo: 2, hum: 4, xiEn: -5 }, re: 'Vídeo do treino viralizou. A torcida amou.' },
        { k: 'foto', name: 'Só uma foto', fx: { mo: 1 }, re: 'Foto bonita para as redes. Só isso.' },
      ] },
  ];
  S.coEvent = function (co) {
    const v = pv(co), list = EV.filter(e => !v.d.includes(e.id));
    const n = list.length; if (!n) return null;
    const i0 = Math.floor(roll(co, 'ev') * n);
    for (let j = 0; j < n; j++) {
      const e = list[(i0 + j) % n], t = e.when(co); if (!t) continue;
      const tt = { p: t.p || null, p2: t.p2 || null };
      const ops = e.ops.map(o => Object.assign({}, o, { tags: (o.risk && o.risk.win && !Object.keys(o.fx).length ? [] : S.coPvTags(co, o.fx, tt)).concat(o.tags || []) }));
      return { kind: 'evt', id: e.id, tag: e.tag, ttl: e.ttl, say: e.say(tt, co), ops, t: tt.p ? tt.p.id : null, t2: tt.p2 ? tt.p2.id : null };
    }
    return null;
  };
  S.coEventAnswer = function (co, d, k) {
    const e = EV.find(x => x.id === d.id), o = e && e.ops.find(x => x.k === k); if (!o) return null;
    const t = { p: d.t && byId(co, d.t), p2: d.t2 && byId(co, d.t2) };
    apply(co, o.fx, t);
    let ok = true;
    if (o.risk) { ok = roll(co, 'evr:' + d.id + k) < o.risk.p; apply(co, ok ? o.risk.win : o.risk.lose, t); }
    const v = pv(co); v.e = rd(co); v.w = rd(co); v.d.push(d.id);
    return { re: ok ? o.re : o.reLose, ok };
  };

  // ---------- a janelinha da semana ----------
  // Uma por semana, nesta ordem: coletiva de jogo grande, conversa com quem está chateado, acontecimento, coletiva comum.
  // A tela só chama quando nenhuma outra janelinha abriu e fora do tutorial. Devolve { kind: 'press'|'evt'|'talk', ... }.
  S.coWeekPop = function (co, log) {
    if (!co.ss || co.sacked) return null;
    const talk = S.coTalkWho(co);
    if (!P.on) return talk ? { kind: 'talk', p: talk } : null;
    const v = pv(co), r = rd(co);
    if (v.w === r) return null;                 // já teve janelinha nesta semana (tela reaberta)
    if (r < P.from) return talk ? { kind: 'talk', p: talk } : null;
    const pr = log ? S.coPress(co, log) : null;
    if (pr && pr.big && r - v.r >= P.bigGap) return pr;
    if (talk) return { kind: 'talk', p: talk };
    if (r - v.w >= 2 && r - v.e >= P.evGap && roll(co, 'evp') < P.evP) { const e = S.coEvent(co); if (e) return e; }
    if (pr && r - v.r >= P.pressGap && r - v.w >= 2 && roll(co, 'prp') < P.pressP) return pr;
    return null;
  };
  // Marca a semana como já tendo janelinha (conversa e o X da coletiva/acontecimento também contam)
  S.coWeekSeen = co => { const v = pv(co); v.w = rd(co); };
})(typeof window !== 'undefined' ? window : globalThis);
