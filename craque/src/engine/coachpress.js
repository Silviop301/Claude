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
  // Texto com variações (2026-11-16, Silvio: "mais variação"): lista = sorteia uma, fixa pela semana (save no meio dá igual)
  const vr = (x, u) => (Array.isArray(x) ? x[Math.floor(u * x.length) % x.length] : x);
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
    re: ['Promessa anotada. A torcida vai cobrar no próximo jogo.', 'Manchete pronta: "técnico garante vitória". Agora é cumprir.', 'Gravado e publicado. Se não ganhar, vai ouvir.'], tags: [['ar', '?', 'vale no próximo jogo']] };
  const OPS = {
    v: [
      { k: 'chao', name: 'Pés no chão', fx: { mo: 2 }, re: ['Discurso de quem já viu de tudo. O grupo gostou.', '"Não ganhamos nada ainda." O vestiário aprovou.', 'Humildade de sobra. Ninguém vai deitar na vitória.'] },
      { k: 'craque', name: 'Elogiar o destaque', who: 'best', fx: { p: 12, mo: -2 }, re: ['Ele vai dormir feliz. Alguns no vestiário, nem tanto.', 'Elogio rasgado. Alguém resmungou "e eu?".', 'Ele postou o vídeo da coletiva. Os outros, não.'] },
      BET,
    ],
    e: [
      { k: 'grupo', name: 'Grupo fechado', fx: { mo: 3 }, re: ['Recado dado: aqui ninguém solta a mão de ninguém.', '"É todo mundo junto." O vestiário bateu palma.', 'Discurso de união. O grupo saiu da sala mais leve.'] },
      { k: 'reforco', name: 'Pedir reforços', fx: { hum: 5, conf: -4, mo: -2 }, re: ['A torcida aplaudiu. O presidente não atendeu o telefone.', 'Recado público para a diretoria. O elenco entendeu como crítica.', 'A torcida quer nomes. O presidente quer você calado.'] },
      BET,
    ],
    d: [
      { k: 'assumo', name: 'Eu assumo', fx: { mo: 5, conf: -3 }, re: ['O elenco viu o técnico na frente. A diretoria anotou.', '"A culpa é minha." O grupo agradeceu em silêncio.', 'Você segurou a bronca sozinho. O presidente franziu a testa.'] },
      { k: 'cobrar', name: 'Cobrar o time', fx: { conf: 4, mo: -5 }, re: ['Manchete garantida: "técnico cobra o elenco".', 'Tom duro. O presidente gostou; o vestiário, não.', 'Alguns jogadores leram a entrevista no ônibus. Clima pesado.'] },
      { k: 'juiz', name: 'Culpar a arbitragem', fx: { hum: 5, mo: 2 }, risk: { p: 0.6, lose: { cx: -0.3, conf: -3 } },
        re: ['A torcida comprou a briga.', 'O lance polêmico rodou o dia inteiro. A torcida está com você.'], reLose: ['A liga não gostou: multa e puxão de orelha da diretoria.', 'Multa da liga. O presidente pagou e mandou um recado.'], tags: [['ar', '?', 'pode dar multa']] },
    ],
    ult: [
      { k: 'confio', name: 'Confio no grupo', fx: { mo: 6, conf: -2 }, re: ['O vestiário fechou com você. A diretoria quer ver em campo.', 'Os jogadores repostaram a sua fala. A diretoria só observa.'] },
      { k: 'trabalho', name: 'Só o trabalho responde', fx: { conf: 3 }, re: ['Resposta curta, sem polêmica. O presidente gostou.', 'Frase feita, zero manchete. Era o que a diretoria queria.'] },
      BET,
    ],
  };
  const Q = {
    ult: ['EMPREGO EM RISCO', ['A diretoria está perdendo a paciência. Você ainda tem o grupo na mão?', 'O presidente não garante seu cargo. Você se sente balançando?', 'Já tem nome de técnico circulando por aí. Como você recebe isso?']],
    copaV: ['COPA', ['Campeão da copa! O que essa taça muda para o resto do ano?', 'Taça na mão! Onde vai ficar a medalha?', 'Título! Dá para ganhar mais alguma coisa este ano?']],
    copaD: ['COPA', ['Fora da copa. Quem paga essa conta?', 'Eliminados. Foi falta de pernas ou de vontade?', 'Adeus à copa. Agora é só o campeonato?']],
    classV: ['CLÁSSICO', ['Vitória no clássico! A cidade é de vocês. E agora?', 'Clássico é nosso! Vai ter zoeira na segunda-feira?', 'Ganhou o clássico. Qual é o recado para o rival?']],
    classE: ['CLÁSSICO', ['Empate no clássico. Bom ou ruim?', 'Ninguém ganhou o clássico. Gosto de quê?', 'Clássico sem vencedor. Faltou coragem?']],
    classD: ['CLÁSSICO', ['Derrota no clássico. A torcida está na bronca. Explica?', 'Perdeu o clássico. Como encarar a torcida amanhã?', 'O rival vai zoar a semana toda. O que deu errado?']],
    golV: ['GOLEADA', ['Que goleada! Esse é o time de verdade?', 'Chuva de gols! Podia ter sido mais?', 'Atropelo! O que você falou no intervalo?']],
    golD: ['GOLEADA', ['Goleada sofrida. De quem é a culpa?', 'Placar de tênis. Tem explicação?', 'Foi um vexame. O que você diz para a torcida?']],
    seqV: ['3 VITÓRIAS SEGUIDAS', ['Três vitórias seguidas. Dá para sonhar alto?', 'Três seguidas! A torcida já fala em título. Calma?', 'Embalou! Qual é o segredo da sequência?']],
    seqD: ['3 DERROTAS SEGUIDAS', ['Três derrotas seguidas. O que está acontecendo?', 'Três seguidas sem ganhar nada. O time desandou?', 'A sequência ruim assusta. Tem saída?']],
    v: ['DEPOIS DO JOGO', ['Vitória importante. O time está pronto?', 'Mais três pontos. O que mais gostou hoje?', 'Vitória sofrida ou tranquila?', 'Ganhou. Dá para melhorar ainda?']],
    e: ['DEPOIS DO JOGO', ['Mais um empate. Falta o quê para vencer?', 'Um ponto. Ganhou um ou perdeu dois?', 'Empate. Saiu satisfeito?', 'Faltou o último passe hoje?']],
    d: ['DEPOIS DO JOGO', ['Derrota. O que deu errado hoje?', 'Perdeu. O time sentiu o jogo?', 'Noite ruim. O que muda para o próximo?', 'Derrota. Foi erro de escalação?']],
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
    return { kind: 'press', big: w.big, q: w.q, tag: q[0], say: vr(q[1], roll(co, 'q:' + w.q)), ops: o, t: t.p ? t.p.id : null };
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
    return { re: vr(ok ? o.re : o.reLose, roll(co, 'pre:' + k)), ok };
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
      say: [t => t.p.n + ' foi visto numa balada de madrugada, dois dias antes do jogo. A foto já rodou.',
        t => 'Vídeo de ' + t.p.n + ' cantando pagode às 4 da manhã. Faltam dois dias para o jogo.',
        t => t.p.n + ' chegou ao treino de óculos escuros e cheiro de festa. Os colegas perceberam.',
        t => 'Um torcedor postou selfie com ' + t.p.n + ' numa boate ontem à noite. Já tem 200 mil visualizações.'],
      ops: [
        { k: 'afastar', name: 'Multar e afastar', fx: { sus: 1, p: -8, conf: 3 }, re: ['Recado dado para o grupo inteiro.', 'Multa no contracheque e uma semana de reflexão.', 'O presidente aprovou. Ele vai ver o jogo da arquibancada.'] },
        { k: 'conversa', name: 'Conversa reservada', fx: { p: 3 }, risk: { p: 0.65, lose: { mo: -3, conf: -3 } }, re: ['Ele pediu desculpas e treinou dobrado.', 'Olho no olho. Ele prometeu que não se repete.'], reLose: ['Ele saiu de novo. Agora o vestiário inteiro sabe.', 'Na sexta, outra foto. A conversa não colou.'], tags: [['ar', '?', 'pode se repetir']] },
        { k: 'deixar', name: 'Deixar passar', fx: { p: 4, mo: -4, conf: -2 }, re: ['Ele agradeceu. Os outros notaram.', '"Então pode?", perguntou alguém no vestiário.'] },
      ] },
    { id: 'briga', tag: 'TREINO', ttl: 'Briga no treino',
      when: co => { const l = xi(co).filter(x => x.pos !== 'GOL'); if (l.length < 2) return null; const p = pickBy(co, l, 'briga1'), p2 = pickBy(co, l.filter(x => x !== p), 'briga2'); return { p, p2 }; },
      say: [t => t.p.n + ' e ' + t.p2.n + ' trocaram empurrões no treino. Teve gente separando.',
        t => 'Carrinho de ' + t.p.n + ' em ' + t.p2.n + ' no rachão. Os dois saíram no peito.',
        t => t.p.n + ' reclamou que ' + t.p2.n + ' não passa a bola. Discussão feia no vestiário.',
        t => 'O coletivo parou: ' + t.p.n + ' e ' + t.p2.n + ' tiveram de ser separados pelo preparador físico.'],
      ops: [
        { k: 'punir', name: 'Punir os dois', fx: { p: -6, p2: -6, mo: 3, conf: 2 }, re: ['Regra é regra. O grupo entendeu.', 'Multa para os dois e treino separado. Acabou o assunto.'] },
        { k: 'pazes', name: 'Fazer as pazes', fx: {}, risk: { p: 0.6, win: { p: 5, p2: 5, mo: 2 }, lose: { p: -6, p2: -6, mo: -3 } }, re: ['Abraço na frente de todo mundo. Virou piada interna.', 'Apertaram as mãos e foram juntos para o cafezinho.'], reLose: ['Não deu liga. O clima piorou.', 'O aperto de mão durou um segundo. Nem se olharam.'], tags: [['up', '▲', 'os dois'], ['ar', '?', 'pode piorar']] },
        { k: 'ignorar', name: 'Ignorar', fx: { mo: -4 }, re: ['O assunto ficou no ar a semana inteira.', 'No vestiário, cada um escolheu um lado.'] },
      ] },
    { id: 'amistoso', tag: 'PROPOSTA', ttl: 'Amistoso pago',
      when: co => (co.fin ? {} : null),
      say: [() => 'Um clube do exterior quer um amistoso no meio da semana. Paga bem, mas cansa.',
        () => 'Convite para um torneio de verão no exterior, com cachê gordo. Viagem longa no meio da semana.',
        () => 'Um empresário quer levar o time para um amistoso em outra cidade. Paga à vista.'],
      ops: [
        { k: 'titulares', name: 'Ir com os titulares', fx: { cx: 0.6, xiEn: -16 }, re: ['Cachê no bolso. O time volta pesado.', 'O dinheiro caiu. As pernas, também.'] },
        { k: 'reservas', name: 'Ir com os reservas', fx: { cx: 0.25, bnEn: -10, mo: 1 }, re: ['Os reservas ganharam ritmo. Cachê menor.', 'Os reservas adoraram a vitrine. O cachê veio pela metade.'] },
        { k: 'recusar', name: 'Recusar', fx: { conf: -2 }, re: ['O presidente queria esse dinheiro.', 'O time descansou. O financeiro suspirou.'] },
      ] },
    { id: 'base', tag: 'BASE', ttl: 'Garoto pede chance',
      when: co => { const p = co.squad.filter(x => x.age <= 21 && !(co.xi || []).includes(x.id) && okP(x) && !x.prom).sort((a, b) => b.ovr - a.ovr)[0]; return p && { p }; },
      say: [t => t.p.n + ', ' + t.p.age + ' anos, bateu na sua porta: quer uma chance no time de cima.',
        t => 'O pai de ' + t.p.n + ' (' + t.p.age + ' anos) ligou: diz que o filho está pronto e quer jogar.',
        t => t.p.n + ', ' + t.p.age + ' anos, arrebentou no treino de ontem. Os colegas pedem ele no time.'],
      ops: [
        { k: 'prometer', name: 'Prometer chance', fx: { p: 12, prom: 1 }, re: ['Ele saiu da sala sorrindo. Agora tem de cumprir.', 'Promessa feita. A torcida já pede ele no Twitter.'] },
        { k: 'treinar', name: 'Treinar com os titulares', fx: { p: 5, xiEn: -4 }, re: ['Ele vai treinar com os grandes. Treino mais puxado.', 'Primeiro dia com os titulares: deu caneta no capitão.'] },
        { k: 'paciencia', name: 'Pedir paciência', fx: { p: -5 }, re: ['Ele entendeu. Mas não gostou.', '"Tua hora vai chegar." Ele ouviu de cabeça baixa.'] },
      ] },
    { id: 'patro', tag: 'PATROCINADOR', ttl: 'Ação do patrocinador',
      when: co => (co.fin ? {} : null),
      say: [() => 'O patrocinador quer o elenco num evento com fotos e autógrafos na véspera do jogo.',
        () => 'O patrocinador quer gravar um comercial com o elenco. Seis horas de estúdio, dois dias antes do jogo.',
        () => 'O patrocinador marcou uma live com os jogadores na concentração. Paga um extra.'],
      ops: [
        { k: 'todos', name: 'Levar o elenco', fx: { cx: 0.35, xiEn: -8, mo: -2 }, re: ['O patrocinador adorou. O elenco, nem tanto.', 'Ficou ótimo no vídeo. Ninguém aguentava mais sorrir.'] },
        { k: 'capitao', name: 'Mandar o capitão', fx: { cx: 0.12 }, re: ['Meio-termo. Cachê pequeno.', 'O capitão fez bonito sozinho. Cachê de um só.'] },
        { k: 'recusar', name: 'Recusar', fx: { conf: -3, mo: 2 }, re: ['O elenco descansou. A diretoria anotou.', 'O patrocinador mandou um e-mail seco para o presidente.'] },
      ] },
    { id: 'filho', tag: 'VESTIÁRIO', ttl: 'Nasceu o filho',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.age >= 23), 'filho'); return p && { p }; },
      say: [t => 'Nasceu o filho de ' + t.p.n + '. Ele pede para ficar com a família no fim de semana do jogo.',
        t => 'A esposa de ' + t.p.n + ' entrou em trabalho de parto. O bebê deve chegar no dia do jogo.',
        t => t.p.n + ' vai ser pai a qualquer momento e pergunta se pode ficar perto da maternidade.'],
      ops: [
        { k: 'liberar', name: 'Liberar do jogo', fx: { sus: 1, p: 12, mo: 3 }, re: ['Ele vai lembrar disso para sempre. O grupo também.', 'Ele mandou a foto do bebê de uniforme do clube.'] },
        { k: 'dia', name: 'Só um dia de folga', fx: { p: 5 }, re: ['Volta para o jogo. Agradeceu o dia.', 'Um dia com a família e de volta. Gol e já sabe a comemoração.'] },
        { k: 'nao', name: 'Não liberar', fx: { p: -10, mo: -2 }, re: ['Ele vai jogar. Calado.', 'Ele treinou olhando o celular a cada cinco minutos.'] },
      ] },
    { id: 'protesto', tag: 'TORCIDA', ttl: 'Protesto no CT',
      when: co => { const e = S.coEst && S.coEst(co); return e && e.hum < 45 ? {} : null; },
      say: [() => 'Um grupo da torcida está no portão do CT com faixas cobrando o time.',
        () => 'Rojões de madrugada na frente do hotel da concentração. A torcida quer resposta.',
        () => 'Faixa no muro do CT: "Time sem vergonha". Tem gente esperando na saída do treino.'],
      ops: [
        { k: 'conversar', name: 'Conversar com eles', fx: {}, risk: { p: 0.55, win: { hum: 9 }, lose: { hum: -6, mo: -2 } }, re: ['Você ouviu, explicou e foi aplaudido na saída.', 'Papo reto no portão. Saíram cantando o hino.'], reLose: ['A conversa esquentou. Virou manchete.', 'Alguém gravou o bate-boca. Está em todo lugar.'], tags: [['up', '▲▲', 'torcida'], ['ar', '?', 'pode esquentar']] },
        { k: 'fechado', name: 'Treino fechado', fx: { mo: 3, hum: -3 }, re: ['O grupo treinou em paz. A torcida ficou do lado de fora.', 'Portão trancado. Do lado de fora, só vaia.'] },
        { k: 'ignorar', name: 'Ignorar', fx: { hum: -5 }, re: ['As faixas ficaram lá a semana inteira.', 'Silêncio do clube. A torcida entendeu como desprezo.'] },
      ] },
    { id: 'veterano', tag: 'VESTIÁRIO', ttl: 'Veterano pensa em parar',
      when: co => { const p = co.squad.filter(x => x.age >= 32).sort((a, b) => b.age - a.age)[0]; return p && { p }; },
      say: [t => t.p.n + ', ' + t.p.age + ' anos, disse na entrevista que pensa em pendurar as chuteiras no fim do ano.',
        t => t.p.n + ', ' + t.p.age + ' anos, confessou que o joelho já reclama. Fala em parar no fim da temporada.',
        t => 'Aos ' + t.p.age + ' anos, ' + t.p.n + ' quer saber se ainda faz parte dos planos ou se é hora de parar.'],
      ops: [
        { k: 'lider', name: 'Fazer dele o líder', fx: { p: 6, mo: 3 }, re: ['Ele vai falar antes dos jogos. O grupo gostou.', 'Primeira preleção dele: tinha marmanjo chorando.'] },
        { k: 'apoiar', name: 'Apoiar o que ele quiser', fx: { p: 8 }, re: ['Ele se sentiu respeitado.', 'Ele agradeceu e disse que vai pensar com calma.'] },
        { k: 'cobrar', name: 'Cobrar foco', fx: { p: -6, conf: 2 }, re: ['"Enquanto estiver aqui, é 100%." Ele não gostou do tom.', 'Ele ouviu, balançou a cabeça e saiu sem dizer nada.'] },
      ] },
    { id: 'boato', tag: 'IMPRENSA', ttl: 'Boato de saída',
      when: co => { const p = xi(co).sort((a, b) => b.ovr - a.ovr)[0]; return p && p.ovr >= avgOvr(co) + 2 ? { p } : null; },
      say: [t => 'Um jornal diz que ' + t.p.n + ' quer jogar num clube maior. Ele não desmentiu.',
        t => 'A esposa de ' + t.p.n + ' curtiu uma foto de outro clube. A internet já fechou a transferência.',
        t => 'Um site estrangeiro garante: ' + t.p.n + ' já fez exames num clube rival. O telefone não para.'],
      ops: [
        { k: 'nosso', name: '"Ele é nosso"', fx: { p: 7, conf: -2 }, re: ['Ele curtiu a defesa. A diretoria queria a venda como opção.', 'Ele postou "fico" com três corações. O presidente coçou a cabeça.'] },
        { k: 'brincar', name: 'Brincar na resposta', fx: { hum: 4 }, re: ['A coletiva riu. O assunto morreu.', '"Se ele for, eu vou junto." Virou meme no bom sentido.'] },
        { k: 'mercado', name: '"O mercado decide"', fx: { p: -6, conf: 3 }, re: ['A diretoria gostou. Ele, não.', 'O empresário dele ligou no mesmo minuto.'] },
      ] },
    { id: 'beneficente', tag: 'CIDADE', ttl: 'Jogo beneficente',
      when: co => (co.fin ? {} : null),
      say: [() => 'Uma instituição da cidade pede um jogo beneficente com o elenco nesta semana.',
        () => 'Um hospital infantil da cidade quer o elenco num jogo festivo para arrecadar fundos.',
        () => 'A prefeitura organizou um jogo de solidariedade e quer o elenco em campo no meio da semana.'],
      ops: [
        { k: 'jogar', name: 'Jogar com o elenco', fx: { hum: 6, xiEn: -10, mo: 2 }, re: ['Estádio cheio e criança feliz. As pernas pesam.', 'O goleiro bateu pênalti e errou. Ninguém ligou.'] },
        { k: 'doar', name: 'Doar e mandar a base', fx: { hum: 3, cx: -0.15 }, re: ['Bonito gesto. Saiu do caixa.', 'Os garotos da base deram show. O cheque ajudou.'] },
        { k: 'recusar', name: 'Recusar', fx: { hum: -4 }, re: ['A cidade não gostou da resposta.', 'O jornal local deu manchete: "clube vira as costas".'] },
      ] },
    { id: 'lesao', tag: 'DEPARTAMENTO MÉDICO', ttl: 'Sentiu a coxa',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.pos !== 'GOL'), 'lesao'); return p && { p }; },
      say: [t => t.p.n + ' sentiu a coxa no treino. Os médicos acham que dá para jogar, mas não garantem.',
        t => t.p.n + ' torceu o tornozelo no rachão. Inchou um pouco. O médico diz que é com você.',
        t => t.p.n + ' saiu do treino mancando, com a mão na posterior. Ele jura que está bem.'],
      ops: [
        { k: 'poupar', name: 'Poupar um jogo', fx: { sus: 1, p: 2 }, re: ['Uma semana de gelo e ele volta inteiro.', 'Fisioterapia e paciência. Volta zerado.'] },
        { k: 'leve', name: 'Treino leve', fx: { en: -20 }, re: ['Joga, mas sem toda a energia.', 'Vai para o jogo, mas não espere 90 minutos.'] },
        { k: 'arriscar', name: 'Arriscar', fx: {}, risk: { p: 0.65, lose: { out: 3, p: -4 } }, re: ['Passou no teste. Joga normal.', 'Fez o teste de arrancada e nem fez careta.'], reLose: ['A coxa não aguentou: três jogos fora.', 'No primeiro pique, a mão foi na perna. Três jogos fora.'], tags: [['up', '', 'joga inteiro'], ['ar', '?', 'pode ficar 3 fora']] },
      ] },
    { id: 'idolo', tag: 'CT', ttl: 'Visita de um ídolo',
      when: () => ({}),
      say: [() => 'Um ídolo da história do clube apareceu no CT e quer falar com o elenco.',
        () => 'O maior artilheiro da história do clube está de passagem pela cidade e quer visitar o CT.',
        () => 'O capitão do último título apareceu de surpresa no CT, com a medalha no peito.'],
      ops: [
        { k: 'palestra', name: 'Palestra para o grupo', fx: { mo: 4 }, re: ['Silêncio total na sala. Arrepiou.', 'Ele mostrou a cicatriz da final. Ninguém piscou.'] },
        { k: 'treino', name: 'Treinar com eles', fx: { mo: 2, hum: 4, xiEn: -5 }, re: ['Vídeo do treino viralizou. A torcida amou.', 'Aos 50 anos, ainda deu um chapéu no zagueiro.'] },
        { k: 'foto', name: 'Só uma foto', fx: { mo: 1 }, re: ['Foto bonita para as redes. Só isso.', 'Foto, abraço e tchau. Semana normal.'] },
      ] },
    // 2026-11-16 (Silvio: "mais variação nos eventos"): mais 12, cada um com preço dos dois lados
    { id: 'redes', tag: 'REDES SOCIAIS', ttl: 'Indireta nas redes',
      when: co => { const p = pickBy(co, xi(co), 'redes'); return p && { p }; },
      say: [t => t.p.n + ' postou "tem gente que não enxerga o óbvio" depois do último jogo. A imprensa já fala em crise.',
        t => t.p.n + ' apagou a foto com a camisa do clube do perfil. Ninguém sabe o motivo.',
        t => t.p.n + ' curtiu um comentário criticando a sua escalação. O print está em todo lugar.'],
      ops: [
        { k: 'multar', name: 'Multar', fx: { p: -7, conf: 3, mo: 1 }, re: ['Multa paga e post apagado. Recado entendido.', 'O financeiro adorou o dinheiro extra. Ele, não.'] },
        { k: 'conversar', name: 'Chamar para conversar', fx: { p: 2 }, risk: { p: 0.65, lose: { hum: -4, mo: -2 } }, re: ['Era desabafo. Ele pediu desculpas no vestiário.', 'Mal-entendido resolvido com um café.'], reLose: ['Ele postou outra. Agora a torcida entrou na briga.', 'A conversa vazou para um podcast. Pior ainda.'], tags: [['ar', '?', 'pode vazar']] },
        { k: 'rir', name: 'Levar na brincadeira', fx: { hum: 3, p: 3, conf: -3 }, re: ['Você respondeu com um emoji de óculos. A internet amou.', 'Virou meme leve. A diretoria achou pouco sério.'] },
      ] },
    { id: 'tv', tag: 'PROPOSTA', ttl: 'TV muda o horário',
      when: co => (co.fin ? {} : null),
      say: [() => 'A TV quer passar o próximo jogo para domingo às 11h. Paga um bônus, mas o time joga no sol.',
        () => 'A emissora quer o jogo na segunda à noite, em horário nobre. Paga extra, e a torcida reclama do horário.',
        () => 'A TV oferece um bônus para jogar às 11h. Com esse calor, os preparadores torcem o nariz.'],
      ops: [
        { k: 'aceitar', name: 'Aceitar', fx: { cx: 0.4, xiEn: -6, hum: -3 }, re: ['Bônus no caixa. O time vai sentir o sol.', 'A TV agradeceu. A torcida vai chegar de ressaca.'] },
        { k: 'negociar', name: 'Pedir mais', fx: {}, risk: { p: 0.5, win: { cx: 0.55, xiEn: -6 }, lose: { conf: -3 } }, re: ['A TV topou pagar mais. Negociador nato.', 'Pediu mais e levou. O presidente quer você nas reuniões.'], reLose: ['A TV desistiu. O presidente ficou sem o bônus.', 'Esticou a corda e ela arrebentou. Jogo no horário normal, sem bônus.'], tags: [['up', '▲▲', 'caixa'], ['ar', '?', 'pode perder o bônus']] },
        { k: 'recusar', name: 'Recusar', fx: { conf: -3, hum: 2 }, re: ['Horário mantido. A torcida agradeceu.', 'O time agradeceu. O financeiro, não.'] },
      ] },
    { id: 'churrasco', tag: 'VESTIÁRIO', ttl: 'Churrasco do grupo',
      when: co => (xi(co).length ? {} : null),
      say: [() => 'O capitão quer fazer um churrasco com o elenco na folga. Uns querem ir, outros preferem descansar.',
        () => 'Os jogadores pedem um churrasco de confraternização no sábado. O preparador físico está de cara feia.',
        () => 'O elenco quer comemorar o aniversário do roupeiro com um churrasco. Ele merece, mas o jogo está perto.'],
      ops: [
        { k: 'liberar', name: 'Liberar a festa', fx: { mo: 4, xiEn: -6 }, re: ['Picanha, pagode e muita risada. Segunda-feira foi pesada.', 'O grupo voltou unido. E com sono.'] },
        { k: 'ct', name: 'No CT, sem exagero', fx: { mo: 2, cx: -0.08 }, re: ['Churrasco no CT, refrigerante e cama cedo.', 'O clube pagou a carne. Todo mundo dormiu às 22h.'] },
        { k: 'proibir', name: 'Proibir', fx: { conf: 2, mo: -3 }, re: ['Foco total. O grupo achou exagero.', 'A diretoria gostou. O vestiário, nem um pouco.'] },
      ] },
    { id: 'empresario', tag: 'MERCADO', ttl: 'Empresário no CT',
      when: co => { const p = pickBy(co, xi(co).filter(x => x.age >= 22), 'empres'); return p && { p }; },
      say: [t => 'O empresário de ' + t.p.n + ' apareceu no CT pedindo aumento. Disse que tem proposta de fora.',
        t => 'O empresário de ' + t.p.n + ' deu entrevista dizendo que ele "merece mais". Quer reunião ainda hoje.',
        t => 'O pai e empresário de ' + t.p.n + ' quer conversar sobre o futuro do filho. Já chegou ao CT.'],
      ops: [
        { k: 'receber', name: 'Receber o empresário', fx: { p: 6, conf: -3 }, re: ['Café, promessa de conversa e ele saiu feliz.', 'Você ouviu tudo. A diretoria não gostou de ser pulada.'] },
        { k: 'diretoria', name: 'Mandar à diretoria', fx: { conf: 2, p: -3 }, re: ['"Não é comigo." O presidente gostou da hierarquia.', 'O empresário saiu bufando. Problema da diretoria agora.'] },
        { k: 'barrar', name: 'Barrar na portaria', fx: { p: -8, mo: 2 }, re: ['Pulso firme. O grupo gostou; ele, nada.', 'O segurança barrou. O empresário ligou para todo jornalista que conhece.'] },
      ] },
    { id: 'gramado', tag: 'CT', ttl: 'Gramado ruim no CT',
      when: co => (co.fin ? {} : null),
      say: [() => 'Choveu a semana inteira e o gramado do CT virou lamaçal. Os jogadores escorregam em tudo.',
        () => 'Uma praga atacou a grama do CT. Tem buraco no campo principal e os médicos estão preocupados.',
        () => 'O gramado do CT está um terror. O roupeiro diz que está mais para pasto que para campo.'],
      ops: [
        { k: 'reformar', name: 'Reformar já', fx: { cx: -0.3, mo: 2 }, re: ['Grama nova em três dias. O elenco aprovou.', 'Ficou um tapete. O financeiro chorou.'] },
        { k: 'alugar', name: 'Treinar em outro campo', fx: { cx: -0.1, xiEn: -6 }, re: ['Uma hora de ônibus para treinar. Cansa.', 'Campo emprestado de uma faculdade. Funciona, mas longe.'] },
        { k: 'aguentar', name: 'Aguentar assim', fx: { mo: -3 }, risk: { p: 0.75, lose: { mo: -2, conf: -2 } }, re: ['Treinaram com cuidado e ninguém se machucou.', 'Treino na lama: virou banho de lama, ninguém se feriu.'], reLose: ['Dois tombos feios. Ninguém se machucou, mas todo mundo reclamou.', 'O capitão foi à diretoria reclamar do gramado.'], tags: [['ar', '?', 'pode piorar']] },
      ] },
    { id: 'sorte', tag: 'VESTIÁRIO', ttl: 'Chuteira da sorte',
      when: co => { const p = pickBy(co, xi(co), 'sorte'); return p && { p }; },
      say: [t => t.p.n + ' jura que a sorte está na chuteira velha, rasgada. O fornecedor de material reclamou.',
        t => t.p.n + ' quer usar a mesma meia furada de quando marcou gol. O patrocinador viu na TV.',
        t => t.p.n + ' só entra em campo com a caneleira do tempo da base. A marca do fornecedor não aparece.'],
      ops: [
        { k: 'deixar', name: 'Deixar usar', fx: { p: 5, conf: -2 }, re: ['Ele beijou a chuteira. O fornecedor mandou uma notificação.', 'Superstição respeitada. O fornecedor, nem tanto.'] },
        { k: 'nova', name: 'Usar a nova', fx: { p: -5, cx: 0.1 }, re: ['Chuteira nova, cara emburrada. O fornecedor pagou bônus.', 'Ele trocou, mas jura que se perder a culpa é sua.'] },
        { k: 'pintar', name: 'Pintar a velha com a marca', fx: {}, risk: { p: 0.6, win: { p: 3, conf: 1 }, lose: { p: -3, conf: -2 } }, re: ['Gambiarra aprovada pelos dois lados.', 'Ficou feia, mas todo mundo ficou feliz.'], reLose: ['A tinta saiu no primeiro treino. Ninguém ficou feliz.', 'Ele diz que a tinta tirou a sorte. O fornecedor, que não engana ninguém.'], tags: [['up', '▲', 'os dois lados'], ['ar', '?', 'pode desagradar os dois']] },
      ] },
    { id: 'festa', tag: 'TORCIDA', ttl: 'Torcida em festa',
      when: co => { const e = S.coEst && S.coEst(co); return e && e.hum >= 65 ? {} : null; },
      say: [() => 'A torcida está empolgada e pede um treino aberto antes do jogo. Querem ver o time de perto.',
        () => 'A organizada quer fazer uma festa na chegada do ônibus, com sinalizador e bateria.',
        () => 'O clima é de festa na cidade. Os torcedores pedem que o elenco apareça para autógrafos.'],
      ops: [
        { k: 'aberto', name: 'Treino aberto', fx: { hum: 6, xiEn: -6 }, re: ['Arquibancada cheia num treino de quarta. Arrepiou.', 'Os torcedores cantaram o treino inteiro. O time cansou de sorrir.'] },
        { k: 'video', name: 'Vídeo de agradecimento', fx: { hum: 2 }, re: ['Vídeo simpático do elenco. Curtiram e só.', 'Um vídeo bonito e o foco segue.'] },
        { k: 'foco', name: 'Manter o foco', fx: { hum: -3, mo: 2 }, re: ['O grupo agradeceu a calma. Parte da torcida, não.', 'Treino fechado. "Festa, só depois do jogo."'] },
      ] },
    { id: 'virose', tag: 'DEPARTAMENTO MÉDICO', ttl: 'Virose no elenco',
      when: co => (xi(co).length >= 5 ? {} : null),
      say: [() => 'Uma virose está rodando o vestiário. Três jogadores já faltaram ao treino de hoje.',
        () => 'Meio elenco com dor de garganta depois da viagem. O médico quer agir antes que espalhe.',
        () => 'Algo no almoço da concentração não caiu bem. Fila no banheiro e treino pela metade.'],
      ops: [
        { k: 'folga', name: 'Dois dias de folga', fx: { xiEn: 5, conf: -3, hum: -2 }, re: ['Todo mundo em casa, de repouso. Voltaram melhores.', 'Repouso total. A diretoria achou folga demais.'] },
        { k: 'isolar', name: 'Isolar os doentes', fx: { xiEn: -5, cx: -0.08 }, re: ['Quarto separado e soro. Ninguém mais pegou.', 'Os doentes ficaram no hotel. Os outros treinaram mais.'] },
        { k: 'normal', name: 'Treino normal', fx: {}, risk: { p: 0.55, lose: { xiEn: -14, mo: -2 } }, re: ['Alarme falso. Ninguém mais pegou.', 'Treinaram normal e a virose passou sozinha.'], reLose: ['Espalhou. Meio time vai a campo sem perna.', 'No dia seguinte, oito com febre. Pior escolha da semana.'], tags: [['ar', '?', 'pode espalhar']] },
      ] },
    { id: 'provoca', tag: 'IMPRENSA', ttl: 'Provocação do rival',
      when: co => (S.coNext && S.coNext(co) && !S.coNext(co).bye ? {} : null),
      say: [() => 'O técnico do próximo rival disse que o seu time "é fácil de ler". Os repórteres querem a sua resposta.',
        () => 'Um jogador do próximo adversário postou que vai "fazer três" em vocês. Já tem print no vestiário.',
        () => 'O presidente do próximo rival chamou o seu time de "freguês" na rádio. A cidade está em polvorosa.'],
      ops: [
        { k: 'responder', name: 'Responder à altura', fx: { hum: 5, mo: 2 }, risk: { p: 0.6, lose: { conf: -3, hum: -3 } }, re: ['Resposta afiada e elegante. A torcida vibrou.', '"Lê o placar no domingo." Virou camiseta.'], reLose: ['Passou do ponto. A liga abriu processo e a diretoria não gostou.', 'A frase pegou mal. Virou meme contra você.'], tags: [['ar', '?', 'pode pegar mal']] },
        { k: 'campo', name: '"Respondo em campo"', fx: { mo: 2 }, re: ['Clássico do técnico. O grupo comprou.', 'Sem polêmica. O recado ficou para o vestiário.'] },
        { k: 'elogiar', name: 'Elogiar o rival', fx: { conf: 2, hum: -3 }, re: ['Educado demais para a torcida.', 'A diretoria aprovou a classe. A arquibancada queria sangue.'] },
      ] },
    { id: 'capitao', tag: 'VESTIÁRIO', ttl: 'Quem usa a faixa?',
      when: co => { const l = xi(co), p = l.slice().sort((a, b) => b.age - a.age)[0], p2 = l.filter(x => x !== p).sort((a, b) => b.ovr - a.ovr)[0]; return p && p2 && p.age >= 27 ? { p, p2 } : null; },
      say: [t => t.p.n + ', o mais velho, e ' + t.p2.n + ', o melhor do time, querem a faixa de capitão. O grupo está dividido.',
        t => 'O vestiário não chega a um acordo: metade quer ' + t.p.n + ' de capitão, metade quer ' + t.p2.n + '.',
        t => t.p2.n + ' disse na TV que se sente pronto para ser capitão. ' + t.p.n + ', o capitão atual, não gostou.'],
      ops: [
        { k: 'velho', name: 'Faixa ao mais velho', fx: { p: 6, p2: -6 }, re: ['Experiência na frente. O craque fechou a cara.', 'Hierarquia mantida. Um ficou feliz, outro, nem tanto.'] },
        { k: 'craque', name: 'Faixa ao melhor', fx: { p2: 6, p: -6 }, re: ['O craque assume. O veterano engoliu seco.', 'Nova liderança. O veterano disse que vai apoiar. Será?'] },
        { k: 'rodizio', name: 'Rodízio da faixa', fx: { mo: 1, p: -2, p2: -2 }, re: ['Cada jogo um capitão. Ninguém ficou feliz de verdade.', 'Solução de meio-termo. Todo mundo meio contente.'] },
      ] },
    { id: 'premio', tag: 'CIDADE', ttl: 'Prêmio de destaque',
      when: co => { const p = xi(co).sort((a, b) => b.ovr - a.ovr)[0]; return p && { p }; },
      say: [t => t.p.n + ' foi eleito o melhor do mês. A festa de entrega é na véspera do jogo, em outra cidade.',
        t => t.p.n + ' ganhou um prêmio da imprensa e foi convidado para a cerimônia. Viagem de um dia inteiro.',
        t => 'A federação quer ' + t.p.n + ' no evento de premiação do mês. Coincide com o último treino antes do jogo.'],
      ops: [
        { k: 'ir', name: 'Liberar para a festa', fx: { p: 6, en: -12 }, re: ['Ele subiu no palco e citou o grupo. Voltou cansado.', 'Discurso bonito, voo de madrugada.'] },
        { k: 'video', name: 'Mandar um vídeo', fx: { p: 2 }, re: ['Agradecimento em vídeo. Meio sem graça, mas cumpriu.', 'O vídeo foi exibido no telão. Ele treinou normal.'] },
        { k: 'grupo', name: 'Dividir com o grupo', fx: { mo: 3, p: -3 }, re: ['"O prêmio é de todos." O vestiário adorou. Ele, menos.', 'Foto do troféu com o elenco inteiro. Ele queria a dele.'] },
      ] },
    { id: 'voo', tag: 'VIAGEM', ttl: 'Voo cancelado',
      when: co => { const l = co.ss && co.ss.log && co.ss.log[co.ss.log.length - 1]; return l && !l.home && co.fin ? {} : null; },
      say: [() => 'O voo da volta foi cancelado. Ou espera até amanhã no aeroporto, ou encara 9 horas de ônibus.',
        () => 'Tempestade fechou o aeroporto depois do jogo fora. A delegação está presa no saguão.',
        () => 'A companhia aérea cancelou o voo da delegação. Próximo assento disponível só depois de amanhã.'],
      ops: [
        { k: 'esperar', name: 'Esperar o voo', fx: { xiEn: -6, mo: -2 }, re: ['Noite no aeroporto, cochilo na cadeira de plástico.', 'Doze horas de saguão. O grupo virou especialista em pão de queijo.'] },
        { k: 'onibus', name: 'Voltar de ônibus', fx: { xiEn: -10, mo: 1 }, re: ['Nove horas de estrada e pagode no fundão.', 'Chegaram moídos, mas cantando.'] },
        { k: 'fretar', name: 'Fretar um avião', fx: { cx: -0.3, conf: -2 }, re: ['Em casa no mesmo dia. O financeiro desmaiou.', 'Voo fretado, todo mundo dormiu em casa. Conta salgada.'] },
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
      return { kind: 'evt', id: e.id, tag: e.tag, ttl: e.ttl, say: vr(e.say, roll(co, 'say:' + e.id))(tt, co), ops, t: tt.p ? tt.p.id : null, t2: tt.p2 ? tt.p2.id : null };
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
    return { re: vr(ok ? o.re : o.reLose, roll(co, 're:' + d.id + k)), ok };
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
