// Modo Treinador (plano, fase 7): o motor. Sem tela; roda no navegador e no Node, como o resto.
// Estado próprio da carreira de técnico (co), separado do jogador (c):
//   co = { mode: 'treinador', name, country, start, season, club, fame, xp: {pts, leitura, motiv, negoc}, seed,
//          squad: [jogadores do seu clube], form, style, xi: [11 ids na ordem das vagas], bench: [ids], cap, pk,
//          leagueOf, clubBoost (as divisões da carreira, como no jogador), board: {goal, conf, ult}, ss: a temporada, hist }
// Jogador: { id, n, pos (GOL/ZAG/LAT/MEI/ATA), age, ovr, pot, wage, ct (anos de contrato), mo (moral 0-100), en (energia), out (jogos fora), sus }
// Os outros clubes têm elenco sorteado pelo id do clube e pela temporada (não ocupa o save).
// Partida: força dos titulares por setor (defesa, meio, ataque), mudada por formação, estilo, cansaço e moral; o jogo anda
// minuto a minuto e para em gol, vermelho, lesão e no intervalo, onde se troca (5 trocas) e muda formação ou estilo.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const L = () => S._.fcLib;
  const env = (k, d) => +((typeof process !== 'undefined' && process.env && process.env[k]) || d);

  // ---------- números do modo (calibrados com tools/craque_treinador.js) ----------
  const CO = S.CO = {
    squad: { GOL: 3, ZAG: 5, LAT: 4, MEI: 8, ATA: 5 },
    lamH: 1.32, lamA: 1.06, ch: 3.2, spMiss: { pen: 0.012, falta: 0.17, esc: 0.15 }, ck: 4, k: env('CO_K', 36), home: 2, kT: env('CO_KT', 0.3), kD: env('CO_KD', 40),
    enGame: 12, enRest: 8, enOff: 20, enOpp: 80, inj: 0.011, subs: 5,
    // Acréscimos: a1 1 a 3 no 1º tempo, a2 3 a 7 no 2º; mins = minutos jogados num jogo médio (90 + acréscimos): as taxas
    // por minuto dividem por ele, para os acréscimos não aumentarem gols, faltas e cansaço
    mins: 96,
    // Faltas e cartões por time e por jogo: foul faltas (o estilo muda), yel amarelos por falta, redD vermelho direto por falta,
    // ycMax amarelos que suspendem; off impedimentos; foulShow das faltas sem cartão que o campinho apita (as perigosas)
    foul: 12, yel: 0.08, redD: 0.002, kCl: 1.8, ycMax: 3, off: 2.2, foulShow: 0.14,
    conf0: 60, confK: env('CO_CK', 3), ppg: 1.34, ultAt: env('CO_ULT', 25), ultN: 3, ultNeed: 2, ultMin: 6,
    fame0: { baixo: 5, livre: 25 }, skillMax: 10,
  };
  // ---------- tática ----------
  // Formações: cada vaga tem posição, lado (W = aberta pelo lado; sem W = pelo meio) e linha (d defesa, m meio, am meia
  // de ligação, a ataque). O confronto conta gente: meio contra meio (posse), lados contra quem marca o lado, atacantes
  // do meio contra zagueiros (2 atacantes contra 3 zagueiros não respiram; 1 contra 2 fica isolado).
  const FSPEC = {
    '4-4-2': 'LAT.W ZAG ZAG LAT.W|MEI.W MEI MEI MEI.W|ATA ATA',
    '4-3-3': 'LAT.W ZAG ZAG LAT.W|MEI MEI MEI|ATA.W ATA ATA.W',
    '4-2-3-1': 'LAT.W ZAG ZAG LAT.W|MEI MEI|MEI.W MEI MEI.W|ATA',
    '4-5-1': 'LAT.W ZAG ZAG LAT.W|MEI.W MEI MEI MEI MEI.W|ATA',
    '3-5-2': 'ZAG ZAG ZAG|LAT.W MEI MEI MEI LAT.W|ATA ATA',
    '3-4-3': 'ZAG ZAG ZAG|LAT.W MEI MEI LAT.W|ATA.W ATA ATA.W',
    '5-3-2': 'LAT.W ZAG ZAG ZAG LAT.W|MEI MEI MEI|ATA ATA',
  };
  // Quanto a formação expõe ou protege (att: as chances que você cria; def: as que você deixa o outro criar)
  const FORM_FX = S.CO_FORM_FX = { '4-4-2': [1, 0.95], '4-3-3': [1.04, 1.03], '4-2-3-1': [1.01, 0.99], '4-5-1': [0.93, 0.94], '3-5-2': [1.03, 1], '3-4-3': [1.07, 1.07], '5-3-2': [0.94, 0.9] };
  const FORMS = S.CO_FORMS = {};
  Object.keys(FSPEC).forEach(f => {
    const g = FSPEC[f].split('|'), lines = g.map((x, i) => (i === 0 ? 'd' : i === g.length - 1 ? 'a' : i === 2 && g.length === 4 ? 'am' : 'm'));
    const slots = [{ pos: 'GOL', w: false, ln: 'g' }];
    g.forEach((grp, i) => grp.split(' ').forEach(t => { const [pos, w] = t.split('.'); slots.push({ pos, w: w === 'W', ln: lines[i] }); }));
    FORMS[f] = { att: FORM_FX[f][0], def: FORM_FX[f][1], slots, d: slots.filter(x => x.ln === 'd').map(x => x.pos), m: slots.filter(x => x.ln === 'm' || x.ln === 'am').map(x => x.pos), a: slots.filter(x => x.ln === 'a').map(x => x.pos) };
  });
  // Estilos: ctrl = quanto segura a bola; press = rouba no campo deles (cansa: en); line = altura da defesa (alta deixa
  // espaço nas costas); counter = mata no contra-ataque; wide = joga pelos lados; build = quanto sofre com a pressão
  // ao sair jogando; patience = fura retranca (ignora parte do def do outro); att e def multiplicam as chances
  const STY = S.CO_STY = {
    equilibrado: { name: 'Equilibrado', ctrl: 1, press: 0.35, line: 0.5, counter: 0.35, wide: 0.5, build: 1, patience: 0.15, att: 1, def: 1, en: 1,
      tip: 'Sem ponto fraco grande, sem vantagem grande' },
    posse: { name: 'Posse de bola', ctrl: 1.3, press: 0.25, line: 0.65, counter: 0.1, wide: 0.45, build: 1.45, patience: 0.6, att: 0.97, def: 0.94, en: 0.95,
      tip: 'Fica com a bola e fura retranca; sofre contra pressão alta' },
    pressao: { name: 'Pressão alta', ctrl: 1.05, press: 1.1, line: 0.95, counter: 0.2, wide: 0.5, build: 0.9, patience: 0.2, att: 1.03, def: 1.06, en: 1.4,
      tip: 'Rouba a bola lá na frente e cansa; deixa espaço nas costas' },
    contra: { name: 'Contra-ataque', ctrl: 0.78, press: 0.1, line: 0.2, counter: 1.25, wide: 0.4, build: 0.85, patience: 0, att: 0.9, def: 0.88, en: 1,
      tip: 'Dá a bola e mata na velocidade; trava contra retranca' },
    retranca: { name: 'Retranca', ctrl: 0.72, press: 0, line: 0, counter: 0.8, wide: 0.2, build: 0.55, patience: 0, att: 0.74, def: 0.66, en: 0.9,
      tip: 'Fecha a área; sofre com toque de bola e cruzamento' },
    lados: { name: 'Jogo pelos lados', ctrl: 0.95, press: 0.3, line: 0.6, counter: 0.25, wide: 0.95, build: 1, patience: 0.5, att: 1.02, def: 1.05, en: 1.1,
      tip: 'Cruza e abre a defesa; precisa de gente aberta e sofre nos lados' },
  };
  S.CO_STYLES = Object.keys(STY);
  // Nome da vaga com o lado (LE, VOL, PD...): o primeiro da linha é o lado esquerdo do time. Só a tela usa; o motor
  // conta as cinco posições (GOL, ZAG, LAT, MEI, ATA) e quem joga fora da dele rende menos (S.coFit)
  S.coSlotLbl = function (form, i) {
    const sl = FORMS[form].slots, x = sl[i]; if (!x) return '';
    const line = sl.map((y, j) => j).filter(j => sl[j].ln === x.ln), k = line.indexOf(i), left = k < line.length / 2;
    if (x.pos === 'GOL' || x.pos === 'ZAG') return x.pos;
    if (x.pos === 'LAT') return left ? 'LE' : 'LD';
    if (x.pos === 'ATA') return x.w ? (left ? 'PE' : 'PD') : 'ATA';
    if (x.w) return x.ln === 'am' ? (left ? 'PE' : 'PD') : (left ? 'ME' : 'MD');
    if (x.ln === 'am') return 'MEI';
    const cen = line.filter(j => !sl[j].w), ck = cen.indexOf(i), hasAm = sl.some(y => y.ln === 'am');
    if (cen.length === 1) return 'VOL';
    if (cen.length === 2) return hasAm ? 'VOL' : 'MC';
    return ck === Math.floor(cen.length / 2) ? 'VOL' : 'MC';
  };
  // Função de cada vaga (o jeito de jogar: -1 mais atrás, 0 normal, +1 mais à frente). Fica na vaga: quem entra joga igual.
  // Mais à frente ajuda o ataque e tira da defesa (e cansa mais); mais atrás, o contrário
  const ROLES = S.CO_ROLES = {
    GOL: [['Fica no gol', 'não sai da área'], ['Goleiro', 'sai quando precisa'], ['Sai jogando', 'joga com os pés, adianta a linha']],
    ZAG: [['Cobre', 'fica atrás da linha'], ['Zagueiro', 'marca e sai curto'], ['Sai jogando', 'conduz a bola até o meio']],
    LAT: [['Segura', 'não passa do meio'], ['Lateral', 'apoia quando dá'], ['Apoia', 'vive no ataque, deixa as costas']],
    VOL: [['Volante fixo', 'protege a zaga'], ['Volante', 'marca e distribui'], ['Chega', 'aparece na área']],
    MC: [['Marca', 'fecha o meio'], ['Meia', 'liga defesa e ataque'], ['Chega na área', 'entra para finalizar']],
    ME: [['Recua', 'ajuda o lateral'], ['Meia aberto', 'cruza da linha'], ['Ponta', 'joga lá na frente']],
    MEI: [['Armador', 'recua para buscar'], ['Meia', 'dá o passe final'], ['Segundo atacante', 'pisa na área']],
    PE: [['Que recua', 'ajuda o lateral'], ['Aberto', 'cruza da linha'], ['Invertido', 'corta para dentro e chuta']],
    ATA: [['Pivô', 'segura de costas, faz a parede'], ['Atacante', 'finaliza'], ['Na frente', 'vive na linha do impedimento']],
  };
  S.coRoleKey = (form, i) => { const l = S.coSlotLbl(form, i); return l === 'LD' ? 'LAT' : l === 'LE' ? 'LAT' : l === 'MD' ? 'ME' : l === 'PD' ? 'PE' : l; };
  S.coRoles = (co, form) => { co.roles = co.roles || {}; return co.roles[form] || (co.roles[form] = new Array(11).fill(0)); };
  // Treino da semana: um foco, vale para o próximo jogo; cansa quem treina (en tira energia de todo o elenco)
  const TRAIN = S.CO_TRAIN = {
    final: { tab: 'Ataque', name: 'Finalização', sub: 'chutar mais certo', fx: { mul: { att: 1.04 } }, en: 4, who: ['ATA', 'MEI'] },
    lados: { tab: 'Ataque', name: 'Jogadas pelos lados', sub: 'cruzamento e ultrapassagem', fx: { add: { wide: 0.12 }, mul: { att: 1.015 } }, en: 4, who: ['LAT', 'MEI'] },
    contra: { tab: 'Ataque', name: 'Contra-ataque', sub: 'sair rápido depois de roubar', fx: { add: { counter: 0.15 } }, en: 5, who: ['ATA', 'MEI'] },
    toque: { tab: 'Ataque', name: 'Troca de passes', sub: 'ficar com a bola', fx: { add: { ctrl: 0.08 } }, en: 3, who: ['MEI'] },
    pressao: { tab: 'Defesa', name: 'Marcação alta', sub: 'roubar lá na frente', fx: { add: { press: 0.15 } }, en: 6, who: ['ATA', 'MEI'] },
    linha: { tab: 'Defesa', name: 'Linha de zaga', sub: 'subir junto, pegar impedimento', fx: { mul: { def: 0.965 } }, en: 3, who: ['ZAG', 'LAT'] },
    bloco: { tab: 'Defesa', name: 'Bloco baixo', sub: 'fechar os espaços atrás', fx: { mul: { def: 0.95, att: 0.98 } }, en: 3, who: ['ZAG', 'MEI'] },
    duelos: { tab: 'Defesa', name: 'Duelos', sub: 'ganhar a dividida', fx: { mul: { def: 0.975, att: 1.01 } }, en: 5, who: ['ZAG', 'MEI'] },
    esc: { tab: 'Bola parada', name: 'Escanteio a favor', sub: 'mais perigo no 1º e 2º pau', fx: { mul: { att: 1.025 } }, sp: 'esc', en: 5, who: ['ZAG', 'ATA'] },
    falta: { tab: 'Bola parada', name: 'Falta a favor', sub: 'batedor e barreira', fx: { mul: { att: 1.02 } }, sp: 'falta', en: 3, who: ['MEI', 'ATA'] },
    defesc: { tab: 'Bola parada', name: 'Defender escanteio', sub: 'zona ou homem a homem', fx: { mul: { def: 0.97 } }, en: 4, who: ['ZAG', 'GOL'] },
    pen: { tab: 'Bola parada', name: 'Pênaltis', sub: 'batedores e goleiro', fx: { mul: { att: 1.01, def: 0.99 } }, sp: 'pen', en: 2, who: ['ATA', 'GOL'] },
    recup: { tab: 'Físico', name: 'Recuperação', sub: 'quem jogou descansa', fx: {}, en: -8, who: [] },
    resist: { tab: 'Físico', name: 'Resistência', sub: 'cansar menos no jogo', fx: { mul: { en: 0.85 } }, en: 5, who: ['MEI', 'LAT'] },
    veloc: { tab: 'Físico', name: 'Velocidade', sub: 'arrancada e recomposição', fx: { add: { counter: 0.06, press: 0.06 } }, en: 5, who: ['ATA', 'LAT'] },
    folga: { tab: 'Físico', name: 'Folga', sub: 'dia livre: moral e energia', fx: {}, en: -12, mo: 3, who: [] },
  };
  S.coTrain = function (co, k) {
    const t = TRAIN[k]; if (!t || !co.ss || (co.train && co.train.i === co.ss.i)) return false;
    co.train = { k, i: co.ss.i };
    co.squad.forEach(p => { p.en = Math.max(0, Math.min(100, p.en - t.en * (t.en > 0 && !t.who.includes(p.pos) ? 0.5 : 1))); if (t.mo) p.mo = Math.min(100, (p.mo === undefined ? 60 : p.mo) + t.mo); });
    return true;
  };
  // Preleção: a última conversa antes de entrar, vale os primeiros 15 minutos
  const PRE = S.CO_PRE = {
    cima: { name: 'Pra cima deles', q: '"Primeiro quarto de hora é nosso. Pressão desde o apito."', fx: { add: { press: 0.2 }, mul: { att: 1.06, def: 1.03, en: 1.3 } }, mo: 0, tip: 'Começa pressionando · cansa mais' },
    calma: { name: 'Paciência', q: '"Ninguém se afoba. A bola vai aparecer."', fx: { mul: { att: 0.95, def: 0.92 } }, mo: 1, tip: 'Menos erro · menos chance' },
    voces: { name: 'É por vocês', q: '"Semana inteira de treino. Mostra isso."', fx: { mul: { att: 1.02 } }, mo: 3, tip: 'Moral sobe, ajuda os nervosos · a tática fica igual' },
  };
  S.coPre = function (co, m, k) {
    if (!PRE[k] || m.min > 0 || m.us.pre) return false;
    m.us.pre = { k, until: 15 };
    m.us.xi.forEach(id => { const p = id && m.us.squad.find(x => x.id === id); if (p) p.mo = Math.max(0, Math.min(100, (p.mo === undefined ? 60 : p.mo) + PRE[k].mo)); });
    return true;
  };
  // Batedores (pênalti, falta, escanteio de cada lado, capitão): a lista do técnico; sem lista, o melhor em campo
  S.CO_TAKE = { pen: 'Pênalti', fl: 'Falta de longe', fc: 'Falta para cruzar', ckE: 'Escanteio esquerda', ckD: 'Escanteio direita', cap: 'Capitão' };
  const takerOf = (s, k) => { const m = byId(s.squad), on = s.xi.filter(Boolean), l = ((s.takers || {})[k] || []).filter(id => on.includes(id));
    return l.length ? m[l[0]] : on.map(id => m[id]).filter(p => p && p.pos !== 'GOL').sort((a, b) => b.ovr - a.ovr)[0]; };
  S.coTaker = takerOf;
  const sty = k => STY[k] || STY.equilibrado;
  // Grito do técnico (partida ao vivo, um por vez, vale alguns minutos): mexe no estilo de agora por um tempo.
  // Nada é de graça: pressionar cansa e abre as costas, segurar e recuar tiram o ataque. O robô não grita (equilíbrio igual)
  const SHOUT = S.CO_SHOUT = {
    pressionar: { name: 'Pressionar', sub: 'cansa mais', dur: 10, add: { press: 0.4, line: 0.2, build: 0.05 }, mul: { en: 1.5, att: 1.08, def: 1.06 }, tip: 'o time rouba lá na frente e cansa mais rápido' },
    segurar: { name: 'Segurar', sub: 'gastar tempo', dur: 10, add: { ctrl: 0.2, press: -0.15, wide: -0.1 }, mul: { att: 0.84, def: 0.88, en: 0.85 }, tip: 'toca de lado, chega menos e sofre menos' },
    lados: { name: 'Pelos lados', sub: 'abrir o jogo', dur: 10, add: { wide: 0.35, patience: 0.15 }, mul: { att: 1.03, def: 1.05 }, tip: 'a bola vai para as pontas, sobra espaço no meio para eles' },
    recuar: { name: 'Recuar', sub: 'fechar a área', dur: 10, add: { line: -0.35, press: -0.25, counter: 0.2 }, mul: { att: 0.8, def: 0.8, en: 0.9 }, tip: 'todo mundo atrás da linha da bola, só sai no contra-ataque' },
  };
  // Conversa do intervalo (vale do 46' ao 60'): o efeito depende do placar; a moral do elenco sente na hora
  const TALK = S.CO_TALK = {
    calma: { name: 'Calma', tip: { win: 'Segura a vantagem: menos erro, menos chegada lá na frente.', draw: 'O time volta tranquilo: erra menos atrás.', lose: 'Calma perdendo: o time erra menos, mas não acorda.' },
      fx: { win: { att: 0.97, def: 0.9 }, draw: { def: 0.95 }, lose: { def: 0.96, att: 0.98 } }, mo: { win: 2, draw: 1, lose: -1 } },
    cobrar: { name: 'Cobrar', tip: { win: 'Cobrar ganhando irrita quem está jogando bem.', draw: 'O time volta ligado: chega mais, deixa mais espaço.', lose: 'Bronca perdendo: o time volta mordido.' },
      fx: { win: { att: 1.02 }, draw: { att: 1.07, def: 1.03 }, lose: { att: 1.1, def: 1.04, press: 0.1 } }, mo: { win: -5, draw: -1, lose: 1 } },
    elogiar: { name: 'Elogiar', tip: { win: 'O time volta confiante e solto.', draw: 'Confiança em alta, mas ninguém acelera.', lose: 'Elogio perdendo soa estranho para o grupo.' },
      fx: { win: { att: 1.04, def: 0.98 }, draw: { att: 1.03 }, lose: { att: 1.01 } }, mo: { win: 4, draw: 3, lose: -2 } },
  };
  const talkState = (m, side) => { const d = (m.home === (side === m.us)) ? m.gh - m.ga : m.ga - m.gh; return d > 0 ? 'win' : d < 0 ? 'lose' : 'draw'; };
  S.coTalkState = m => talkState(m, m.us);
  const styOf = side => {
    const b = sty(side.style), sh = side.shout && SHOUT[side.shout.k], tk = side.talk; if (!sh && !tk && !side.train && !side.pre) return b;
    const o = Object.assign({}, b);
    if (sh) { Object.keys(sh.add).forEach(k => { o[k] = Math.max(0, o[k] + sh.add[k]); }); Object.keys(sh.mul).forEach(k => { o[k] *= sh.mul[k]; }); }
    if (tk) { const fx = TALK[tk.k].fx[tk.st]; Object.keys(fx).forEach(k => { if (k === 'press') o[k] += fx[k]; else o[k] *= fx[k]; }); }
    [side.train && TRAIN[side.train] && TRAIN[side.train].fx, side.pre && PRE[side.pre.k].fx].forEach(fx => { if (!fx) return;
      Object.keys(fx.add || {}).forEach(k => { o[k] = Math.max(0, o[k] + fx.add[k]); }); Object.keys(fx.mul || {}).forEach(k => { o[k] *= fx.mul[k]; }); });
    return o;
  };
  const slotsOf = form => FORMS[form].slots.map(x => x.pos);
  const sectorOf = (form, i) => { const l = FORMS[form].slots[i].ln; return l === 'am' ? 'm' : l; };
  S.coSlots = slotsOf;
  // Número de camisa fixo de cada jogador do elenco (p.num): quem não tem ganha o número clássico da posição que estiver livre
  // (os melhores primeiro), senão o menor livre. Fica no jogador, então não muda com trocas nem de jogo para jogo.
  const NUM_PREF = { GOL: [1, 12, 23], LAT: [2, 6, 13, 22], ZAG: [3, 4, 14, 15], MEI: [5, 8, 10, 7, 11, 16, 17, 18, 20], ATA: [9, 11, 7, 19, 21, 17] };
  S.coNums = squad => {
    if (!squad || !squad.length) return squad;
    const used = new Set(squad.filter(p => p.num).map(p => p.num));
    squad.filter(p => !p.num || (squad.find(q => q !== p && q.num === p.num && q.id < p.id) && (p.num = 0, true)))
      .sort((a, b) => b.ovr - a.ovr).forEach(p => {
        let n = (NUM_PREF[p.pos] || []).find(x => !used.has(x));
        for (let x = 2; !n; x++) if (!used.has(x) && x !== 12 && x !== 23) n = x;
        p.num = n; used.add(n);
      });
    return squad;
  };
  // Jogador fora da posição rende menos
  const FIT = { ZAG: { LAT: 0.92, MEI: 0.85 }, LAT: { ZAG: 0.9, MEI: 0.9, ATA: 0.8 }, MEI: { LAT: 0.88, ZAG: 0.82, ATA: 0.9 }, ATA: { MEI: 0.88, LAT: 0.78 } };
  const fit = (pos, slot) => (pos === slot ? 1 : pos === 'GOL' || slot === 'GOL' ? 0.4 : (FIT[pos] && FIT[pos][slot]) || 0.7);
  S.coFit = fit;

  // ---------- elencos ----------
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const wageOf = ovr => Math.round(Math.exp((ovr - 50) / 8.5) * 2) * 1000; // por semana
  function mkPlayer(r, club, pos, ovr, age, id, cty) {
    const pot = Math.min(95, Math.round(ovr + Math.max(0, 25 - age) * r.range(0.6, 1.7)));
    return { id, n: D.randomName(cty, r), pos, age, ovr: clamp(Math.round(ovr), 30, 95), pot: Math.max(Math.round(ovr), pot), wage: wageOf(ovr), ct: r.int(1, 4), mo: 60, en: 100, out: 0, sus: 0 };
  }
  // Elenco de um clube na temporada: os mais fortes perto da força do clube, o banco abaixo, os garotos mais abaixo
  // Elencos reais (tools/craque_api_elencos.py gera src/real-squads.js): nome, idade, posição e número de verdade;
  // a força segue a conta do sorteado (força do clube, ordem na posição, idade). Quem passa de 37 anos ou falta numa
  // posição vira garoto sorteado (e quem já está no seu elenco, co, sai do clube de origem). id 'r:' + id da fonte: o mesmo jogador tem o mesmo id em todo save e temporada.
  const REAL = () => root.CRAQUE_REAL || (typeof require !== 'undefined' ? (() => { try { return require('../real-squads.js'); } catch (e) { return null; } })() : null);
  S.coRealOf = clubId => { const R = REAL(); return (R && R.clubs && R.clubs[clubId]) || null; };
  function realSquad(club, season, rows, co) {
    const mine = new Set(((co && co.squad) || []).map(p => p.api).filter(Boolean));
    const r = S.rng(hash(club.id + '|' + season + '|real')), cty = D.countryOf(club), s = club.strength, out = [];
    Object.keys(CO.squad).forEach(pos => {
      const n = CO.squad[pos];
      // Quem joga: quem mais começou jogando na temporada real (ESPN; o peso some em 4 temporadas do jogo), número de
      // titular (1 a 23), idade boa (23 a 31); garotos de número alto por último
      const L = rows.filter(x => x[3] === pos).map(x => ({ x, age: x[2] + season }))
        .filter(o => o.age <= 37 && !mine.has(o.x[0]))
        .map(o => ({ ...o, sc: (o.x.length > 5 ? Math.min(40, o.x[5] + 0.4 * o.x[6]) * Math.max(0, 1 - season * 0.25) : 0) + (o.x[4] >= 1 && o.x[4] <= 11 ? 12 : o.x[4] >= 1 && o.x[4] <= 23 ? 8 : o.x[4] >= 1 && o.x[4] <= 40 ? 4 : 0) + (o.age >= 23 && o.age <= 31 ? 4 : o.age >= 20 && o.age <= 33 ? 2 : 0) + (hash(o.x[0] + '|' + season) % 100) / 100 }))
        .sort((a, b) => b.sc - a.sc).slice(0, n);
      for (let k = 0; k < n; k++) {
        const o = L[k], j = S.rng(hash((o ? o.x[0] : club.id + pos + k) + '|' + season + '|f'));
        const age = o ? o.age : r.int(17, 20), young = !o || age <= 20;
        const ovr = s + 2.5 - 8 * (k / Math.max(1, n - 1)) + j.gauss() * 2.5 - (young ? 6 : 0) - (age >= 33 ? 2 : 0);
        const p = mkPlayer(j, club, pos, ovr, age, o ? 'r:' + o.x[0] : club.id + ':' + season + ':' + out.length, cty);
        if (o) { p.n = o.x[1]; p.api = o.x[0]; if (o.x[4] >= 1 && o.x[4] <= 99) p.num = o.x[4]; }
        out.push(p);
      }
    });
    return out;
  }
  function genSquad(clubId, season, co) {
    const club = D.CLUB_BY_ID[clubId], real = S.coRealOf(clubId);
    if (real) return realSquad(club, season, real, co);
    const r = S.rng(hash(clubId + '|' + season)), cty = D.countryOf(club), s = club.strength;
    const out = [];
    Object.keys(CO.squad).forEach(pos => {
      const n = CO.squad[pos];
      for (let k = 0; k < n; k++) {
        const young = k === n - 1 && r() < 0.6, age = young ? r.int(17, 20) : r.int(20, 34);
        const ovr = s + 2.5 - 8 * (k / Math.max(1, n - 1)) + r.gauss() * 2.5 - (young ? 6 : 0) - (age >= 33 ? 2 : 0);
        out.push(mkPlayer(r, club, pos, ovr, age, clubId + ':' + season + ':' + out.length, cty));
      }
    });
    return out;
  }
  S.coGenSquad = genSquad;

  // ---------- escalação ----------
  const ok = p => p && !p.out && !p.sus;
  // O auxiliar monta o time: para cada vaga, o melhor que sobra pela força na vaga (energia conta)
  function autoXI(squad, form) {
    const used = new Set(), slots = slotsOf(form), xi = [];
    const val = (p, sl) => p.ovr * fit(p.pos, sl) * (0.75 + 0.25 * (p.en === undefined ? 100 : p.en) / 100);
    // Primeiro as vagas da própria posição (mais escassas antes: goleiro, laterais, zagueiros)
    const order = slots.map((sl, i) => i).sort((a, b) => ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[a]) - ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[b]));
    order.forEach(i => {
      const best = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => val(b, slots[i]) - val(a, slots[i]))[0];
      if (best) { used.add(best.id); xi[i] = best.id; }
    });
    const bench = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id);
    return { xi, bench };
  }
  S.coAutoXI = autoXI;
  // ---------- força do time e confronto ----------
  const byId = squad => { const m = {}; squad.forEach(p => { m[p.id] = p; }); return m; };
  const last = n => String(n || "").split(" ").filter(Boolean).pop() || "";
  const eff = (p, sl) => p.ovr * fit(p.pos, sl) * (0.8 + 0.2 * (p.en === undefined ? 100 : p.en) / 100) * (p.out ? 0.5 : 1) * (1 + ((p.mo === undefined ? 60 : p.mo) - 60) / 1200);
  // Forma de um lado em campo: quanto tem em cada parte (cada jogador vale ~1 = 70 de força na vaga)
  function shape(s) {
    const m = byId(s.squad), F = FORMS[s.form], o = { q: 0, n: 0, ncb: 0, ncf: 0, wb: 0, cb: 0, fb: 0, cm: 0, wm: 0, cf: 0, wf: 0, en: 0, at: 0, nat: 0, df: 0, ndf: 0 };
    s.xi.forEach((id, i) => {
      const p = id && m[id], sl = F.slots[i]; if (!p || !sl) return;
      const e0 = eff(p, sl.pos) / 70, tl = s.roles ? (s.roles[i] || 0) : 0;
      // A função da vaga puxa o jogador para o ataque (ea) ou para a defesa (ed)
      const e = e0, ea = e0 * (1 + 0.08 * tl), ed = e0 * (1 - 0.08 * tl);
      o.q += e; o.n++; o.en += (p.en === undefined ? 100 : p.en);
      // Quem finaliza (ataque e meia de ligação) e quem defende a área (zaga, laterais pela metade e goleiro)
      if (sl.ln === 'a' || sl.ln === 'am') { const k = sl.ln === 'a' ? 1 : 0.5; o.at += ea * k; o.nat += k; }
      if (sl.ln === 'd' || sl.ln === 'g') { const k = sl.ln === 'g' ? 0.5 : sl.w ? 0.5 : 1; o.df += ed * k; o.ndf += k; }
      if (sl.ln === 'd') { if (sl.w) { o.fb += ed; o.push = (o.push || 0) + 0.25 * tl * e0; } else { o.cb += ed; o.ncb++; } }
      else if (sl.ln === 'm') { if (sl.w && sl.pos === 'LAT') o.wb += ea; else if (sl.w) o.wm += ea; else o.cm += e; }
      else if (sl.ln === 'am') { if (sl.w) o.wm += ea; else { o.cm += 0.5 * e; o.cf += 0.5 * ea; o.ncf += 0.5; } }
      else if (sl.ln === 'a') { if (sl.w) o.wf += ea; else { o.cf += ea; o.ncf++; } }
    });
    o.at = o.nat ? o.at / o.nat * 70 : o.q / 11 * 70; o.df = o.ndf ? o.df / o.ndf * 70 : o.q / 11 * 70;
    o.q = o.q / 11 * 70; o.en = o.n ? o.en / o.n / 100 : 1; o.bonus = s.bonus || 0;
    return o;
  }
  // O que X cria contra Y (sem contar a força geral): posse, lados, área, pressão e contra-ataque
  function edge(X, Y, sx, sy, pX) {
    // Lados: quem ataca aberto (o lateral só sobe se não tiver ponta do outro lado prendendo) contra quem marca o lado
    const push = X.fb * sx.wide * 0.6 * (1 - 0.7 * Math.min(1, Y.wf / 2));
    const fa = X.wm + X.wf + 0.6 * X.wb + push + (X.push || 0), fd = Y.fb + 0.9 * Y.wb + 0.5 * Y.wm + 0.25 * Y.wf + 0.35 * Math.max(0, Y.ncb - 2), fdl = fd * (0.75 + 0.25 * sy.line);
    // Área: atacantes do meio contra zagueiros; zagueiro a mais que os atacantes + 1 não marca ninguém (sobra)
    const cbUse = Y.ncb ? Y.cb * Math.min(1, (X.ncf + 1) / Y.ncb) : 0;
    const ca = X.cf + 0.35 * X.cm, cd = 0.85 * (cbUse + 0.35 * Y.cm);
    const flank = Math.log((fa + 0.4) / (fdl + 0.4)), central = Math.log((ca + 0.4) / (cd + 0.4));
    // O time ataca por onde tem gente (e o estilo puxa): a fraqueza do outro lado só conta se você ataca por ali
    const wsh = clamp(fa / (fa + ca || 1) + (sx.wide - 0.5) * 0.5, 0.1, 0.9);
    const press = sx.press * (1 - pX) * X.en * sy.build;
    const counter = sx.counter * sy.line * (1 - pX) * (X.wf + X.cf) / 2;
    return { flank, central, wsh, press, counter, poss: pX, T: 1.3 * (wsh * flank * (1 + (sx.wide - 0.5) * 0.8) + (1 - wsh) * central) + 1.0 * press + 1.6 * counter + 2 * (pX - 0.5) };
  }
  // Gols esperados de cada lado no jogo inteiro (H em casa). Volta também o porquê, para a tela do confronto
  function matchup(H, A, neutral) {
    const h = shape(H), a = shape(A), sh = styOf(H), sa = styOf(A);
    const ch = Math.pow((h.cm + 0.3 * h.wm) * sh.ctrl, 1.6), ca = Math.pow((a.cm + 0.3 * a.wm) * sa.ctrl, 1.6);
    const pH = clamp(ch / (ch + ca || 1), 0.28, 0.72);
    const eh = edge(h, a, sh, sa, pH), ea = edge(a, h, sa, sh, 1 - pH);
    // Duelo: o seu ataque contra a defesa deles, além da diferença geral dos times (atacante 70 contra zaga 50 sobra)
    const duel = (X, Y) => clamp((X.at - Y.df) - (X.q - Y.q), -25, 25) / CO.kD;
    eh.duel = duel(h, a); ea.duel = duel(a, h);
    const lh = (neutral ? (CO.lamH + CO.lamA) / 2 : CO.lamH) * Math.exp((h.q - a.q + h.bonus + (neutral ? 0 : CO.home)) / CO.k + CO.kT * eh.T + eh.duel) * sh.att * Math.pow(sa.def, 1 - sh.patience) * FORMS[H.form].att * FORMS[A.form].def;
    const la = (neutral ? (CO.lamH + CO.lamA) / 2 : CO.lamA) * Math.exp((a.q - h.q + a.bonus) / CO.k + CO.kT * ea.T + ea.duel) * sa.att * Math.pow(sh.def, 1 - sa.patience) * FORMS[A.form].att * FORMS[H.form].def;
    return { lh, la, h: eh, a: ea, sh: h, sa: a };
  }
  S.coMatchup = matchup;
  S.coShape = shape;
  // Força para comparar formações do mesmo elenco (o auxiliar do rival escolhe por ela)
  function power(squad, form, xi) { const o = shape({ squad, form, xi }); return { A: o.q, D: o.q, M: o.q }; }
  S.coPower = power;
  const lams = (H, A) => { const r = matchup(H, A); return [r.lh, r.la]; };
  S.coLams = lams;

  // ---------- carreira ----------
  S.coNew = function (o) {
    const co = { mode: 'treinador', name: o.name || 'Técnico', country: o.country || 'Brasil', look: o.look || null, start: o.start === 'livre' ? 'livre' : 'baixo',
      season: 0, club: null, fame: CO.fame0[o.start === 'livre' ? 'livre' : 'baixo'], xp: { pts: 0, leitura: 0, motiv: 0, negoc: 0 },
      seed: (o.seed || (Math.random() * 4294967295)) >>> 0, leagueOf: {}, clubBoost: {}, hist: [], titles: [], pid: 0, form: '4-4-2', style: 'equilibrado' };
    return co;
  };
  const rngCo = co => { const r = S.rng(co.seed); return { r, save: () => { co.seed = r.state(); } }; };
  // Propostas de clube: no começo "de baixo", clubes pequenos das divisões de baixo; depois, pela fama (e o do coração no começo livre)
  S.coOffers = function (co, n) {
    S.applyLeagues(co);
    const { r, save } = rngCo(co);
    const cty = co.country, top = 50 + co.fame * 0.38, low = top - 10;
    let pool = D.CLUBS.filter(x => x.id !== co.club && x.strength <= top + 1 && x.strength >= low);
    if (co.start === 'baixo' && co.season === 0 && !co.club) pool = D.CLUBS.filter(x => !(D.LADDER[x.league] && D.LADDER[x.league].down) && x.strength <= 56);
    if (!pool.length) pool = D.CLUBS.slice().sort((a, b) => Math.abs(a.strength - top) - Math.abs(b.strength - top)).slice(0, 12);
    const home = pool.filter(x => D.countryOf(x) === cty), rest = pool.filter(x => D.countryOf(x) !== cty);
    const out = [];
    while (out.length < (n || 4) && (home.length || rest.length)) {
      const src = home.length && (r() < 0.7 || !rest.length) ? home : rest;
      out.push(src.splice(Math.floor(r() * src.length), 1)[0].id);
    }
    // Uma das propostas costuma ser de um clube que briga lá em cima na liga dele (de divisão menor, se preciso)
    if (out.length && !out.some(id => ['subir', 'titulo', 'g4'].includes(S.coGoalFor(co, id).k))) {
      const fav = home.concat(rest).filter(x => ['subir', 'titulo', 'g4'].includes(S.coGoalFor(co, x.id).k));
      if (fav.length && r() < 0.7) out[out.length - 1] = fav[Math.floor(r() * fav.length)].id;
    }
    save();
    return out;
  };
  // Assina com um clube: o elenco dele vira o seu (sorteado na temporada)
  S.coSign = function (co, clubId) {
    S.applyLeagues(co);
    co.club = clubId;
    co.squad = genSquad(clubId, co.season).map(p => Object.assign(p, { id: 'p' + (co.pid++) }));
    co.sacked = false;
    co.since = co.season;
    const a = autoXI(co.squad, co.form);
    co.xi = a.xi; co.bench = a.bench;
    return co;
  };

  // ---------- temporada ----------
  // Meta da diretoria pelo tamanho do clube na liga
  const GOAL_TXT = { titulo: 'Ganhar a liga', subir: 'Subir de divisão', g4: 'Ficar entre os quatro', meio: 'Terminar na metade de cima', naocair: 'Não cair', digna: 'Fugir das últimas posições' };
  S.CO_GOAL_TXT = GOAL_TXT;
  function boardGoal(club, ids, lg) {
    // Posição esperada: conta quem é mais forte (empate de força, ±1, conta meio)
    const st = club.strength, oth = ids.filter(id => id !== club.id).map(id => D.CLUB_BY_ID[id].strength), n = ids.length;
    const exp = Math.round(1 + oth.filter(x => x > st + 1).length + 0.5 * oth.filter(x => Math.abs(x - st) <= 1).length);
    // A diretoria pede um pouco menos que o esperado (folga de 2 posições), menos para o favorito ao título
    if (lg.promo && exp <= lg.promo) return { k: 'subir', pos: lg.promo, exp };
    if (exp === 1 && !lg.promo) return { k: 'titulo', pos: 1, exp };
    if (exp <= 3) return { k: 'g4', pos: 4, exp };
    if (exp + 2 <= Math.ceil(n / 2)) return { k: 'meio', pos: Math.ceil(n / 2), exp };
    if (!lg.releg) return { k: 'digna', pos: n - 3, exp };
    return { k: 'naocair', pos: n - lg.releg, exp };
  }
  // A meta que a diretoria daria a um clube (para mostrar na proposta)
  S.coGoalFor = function (co, clubId) {
    S.applyLeagues(co);
    const club = D.CLUB_BY_ID[clubId], LD = D.LADDER[club.league] || {};
    return boardGoal(club, L().leagueTeams(club), { promo: LD.up ? LD.promo : 0, releg: LD.down ? LD.releg : 0 });
  };
  S.coStart = function (co) {
    S.applyLeagues(co);
    const club = D.CLUB_BY_ID[co.club], lg = D.LEAGUE_BY_ID[club.league], LD = D.LADDER[club.league] || {};
    const { r, save } = rngCo(co);
    const ids = L().leagueTeams(club), perm = ids.map((_, i) => i).sort(() => r() - 0.5);
    const sch = S._schedule(ids.length);
    const ss = co.ss = { season: co.season, club: club.id, i: 0, name: lg.name, ids, rounds: sch.map(rd => rd.map(([a, b]) => [perm[a], perm[b]])),
      tab: ids.map(() => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 })), promo: LD.up ? LD.promo : 0, releg: LD.down ? LD.releg : 0, log: [], res: [], done: false };
    co.board = { goal: boardGoal(club, ids, ss), conf: CO.conf0, ult: null };
    co.squad.forEach(p => { p.en = 100; p.out = 0; p.sus = 0; p.yc = 0; p.ycSus = 0; });
    co.subsLeft = CO.subs;
    save();
    return ss;
  };
  const order = tab => tab.map((t, i) => i).sort((a, b) => tab[b].p - tab[a].p || (tab[b].gp - tab[b].gc) - (tab[a].gp - tab[a].gc) || tab[b].gp - tab[a].gp);
  S.coTable = co => order(co.ss.tab).map(i => Object.assign({ id: co.ss.ids[i], me: co.ss.ids[i] === co.club }, co.ss.tab[i]));
  S.coPos = co => order(co.ss.tab).findIndex(i => co.ss.ids[i] === co.club) + 1;
  // Próximo jogo: o adversário, o mando e a rodada
  S.coNext = function (co) {
    const ss = co.ss;
    if (!ss || ss.done || ss.i >= ss.rounds.length) return null;
    const me = ss.ids.indexOf(co.club), g = ss.rounds[ss.i].find(([h, a]) => h === me || a === me);
    if (!g) return { round: ss.i + 1, of: ss.rounds.length, bye: true };
    const home = g[0] === me, vs = ss.ids[home ? g[1] : g[0]];
    return { round: ss.i + 1, of: ss.rounds.length, vs, home, ult: co.board.ult };
  };
  // Plano do rival: cada clube tem a sua escola (formação e dois estilos sorteados pelo id); no jogo, o mais fraco fecha
  // e o mais forte propõe. É o que o olheiro mostra antes do jogo
  const SCHOOL_F = ['4-4-2', '4-3-3', '4-2-3-1', '4-4-2', '4-5-1', '3-5-2', '4-3-3', '5-3-2', '4-2-3-1', '3-4-3'];
  const SCHOOL_S = [['posse', 'equilibrado'], ['pressao', 'equilibrado'], ['equilibrado', 'contra'], ['lados', 'equilibrado'], ['posse', 'pressao'], ['equilibrado', 'retranca'], ['lados', 'contra']];
  function school(clubId) { const h = hash('escola|' + clubId); return { form: SCHOOL_F[h % SCHOOL_F.length], styles: SCHOOL_S[(h >>> 8) % SCHOOL_S.length] }; }
  S.coSchool = school;
  function plan(clubId, d, home) {
    const sc = school(clubId);
    let style = d > 3 || (home && d > -2) ? sc.styles[0] : sc.styles[1];
    let form = sc.form;
    if (d < -6) { style = (hash('f|' + clubId) & 1) ? 'retranca' : 'contra'; if (form === '3-4-3' || form === '4-3-3') form = '4-5-1'; }
    return { form, style };
  }
  function oppSide(co, vs, home) {
    const sq = genSquad(vs, co.season, co); sq.forEach(p => { p.en = CO.enOpp; });
    const d = D.CLUB_BY_ID[vs].strength - D.CLUB_BY_ID[co.club].strength;
    const pl = plan(vs, d, home), a = autoXI(sq, pl.form);
    return { club: vs, squad: sq, form: pl.form, style: pl.style, plan: pl, xi: a.xi, bench: a.bench, subs: CO.subs, red: 0 };
  }
  // Prévia do próximo jogo: o rival como deve vir e o confronto contra o seu time de agora
  S.coPreview = function (co, form, style) {
    const nx = S.coNext(co); if (!nx || nx.bye) return null;
    const them = oppSide(co, nx.vs, !nx.home), xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))).length === 11 ? co.xi : autoXI(co.squad, form || co.form).xi;
    const us = { squad: co.squad, form: form || co.form, style: style || co.style, xi, bonus: co.xp.leitura * 0.2 };
    const r = nx.home ? matchup(us, them) : matchup(them, us);
    return { them, nx, xg: nx.home ? [r.lh, r.la] : [r.la, r.lh], us: nx.home ? r.h : r.a, op: nx.home ? r.a : r.h, ush: nx.home ? r.sh : r.sa, osh: nx.home ? r.sa : r.sh, poss: nx.home ? r.h.poss : r.a.poss };
  };
  S.coOpp = (co, vs) => oppSide(co, vs);

  // ---------- partida minuto a minuto ----------
  // m = { min, gh, ga, home, us: lado, them: lado, ev: [lances], stop, done, half }
  S.coMatchStart = function (co) {
    const nx = S.coNext(co);
    if (!nx || nx.bye) return null;
    co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))).length === 11 ? co.xi : autoXI(co.squad, co.form).xi;
    const us = { club: co.club, squad: co.squad, form: co.form, style: co.style, bonus: co.xp.leitura * 0.2, xi: co.xi.slice(), bench: (co.bench || []).filter(id => co.squad.some(p => p.id === id && ok(p))), subs: CO.subs, red: 0, mine: true,
      roles: co.roles && co.roles[co.form] ? co.roles[co.form].slice() : null, takers: co.takers || null, train: co.train && co.ss && co.train.i === co.ss.i ? co.train.k : null };
    const them = oppSide(co, nx.vs, !nx.home);
    if (!us.bench.length) us.bench = autoXI(co.squad, co.form).bench;
    return { min: 0, gh: 0, ga: 0, home: nx.home, us, them, ev: [], stop: null, done: false, half: false, classic: (D.RIVALS[co.club] || []).includes(nx.vs), vs: nx.vs, round: nx.round, played: {}, startXI: us.xi.slice() };
  };
  const sideName = (m, s) => (s === m.us ? 'us' : 'them');
  // Avança até a próxima parada (gol, vermelho, lesão, intervalo) ou o fim; com `until`, para também naquele minuto
  // (a tela ao vivo anda minuto a minuto, para a pessoa poder parar quando quiser). Volta a parada
  S.coMatchStep = function (co, m, until) {
    if (m.done) return null;
    const { r, save } = rngCo(co);
    let stop = null;
    let n = 0;
    while (!stop && !(m.min >= 90 && m.st >= (m.a2 || 0)) && !(until && n > 0 && (m.min >= until || m.st > 0))) {
      // Acréscimos: no 45' (antes do intervalo) e no 90' o relógio fica parado e conta 45+1, 45+2...
      if ((m.min === 45 && !m.half) || m.min >= 90) m.st = (m.st || 0) + 1; else { m.st = 0; m.min++; }
      n++; m.tk = (m.tk == null ? m.min - (m.st ? 0 : 1) : m.tk) + 1; const ev0 = m.ev.length; // m.tk sem valor: jogo salvo antes dos acréscimos, conta o que já foi jogado
      if (m.us.talk && m.min > m.us.talk.until) delete m.us.talk;
      if (m.us.pre && m.min > m.us.pre.until) delete m.us.pre;
      if (m.us.shout && m.min > m.us.shout.until) { delete m.us.shout; m.ev.push({ m: m.min, t: 'grito-fim', s: 'us' }); }
      const H = m.home ? m.us : m.them, A = m.home ? m.them : m.us;
      const mu = matchup(H, A), lh = mu.lh, la = mu.la;
      m.poss = (m.poss || 0) + (m.home ? mu.h.poss : 1 - mu.h.poss);
      // Quem manda no jogo, minuto a minuto (0 a 100, do seu lado): a faixa da tela e do resultado
      (m.mom = m.mom || []).push(Math.round(100 * (m.home ? lh : la) / (lh + la || 1)));
      // Para o caderno: quanto tempo cada confronto de estilo e de formação ficou em campo, e como o rival jogou
      const pm = m.pm = m.pm || {}, tm = m.tm = m.tm || {}, ks = 'sty:' + m.us.style + '|' + m.them.style, kf = 'frm:' + m.us.form + '|' + m.them.form, kt = m.them.form + '|' + m.them.style;
      pm[ks] = (pm[ks] || 0) + 1; pm[kf] = (pm[kf] || 0) + 1; tm[kt] = (tm[kt] || 0) + 1;
      // Cansaço: quem está em campo perde energia aos poucos (o estilo de ataque cansa mais)
      [m.us, m.them].forEach(s => { const sen = styOf(s).en; s.xi.forEach((id, i) => { const p = id && s.squad.find(x => x.id === id); if (p) { p.en = Math.max(0, p.en - CO.enGame / CO.mins * sen * (1 + 0.12 * Math.max(0, s.roles ? s.roles[i] || 0 : 0))); if (s.mine) m.played[id] = (m.played[id] || 0) + 1; } }); });
      // Chances: cada gol esperado vira CO.ch chances; uma em CO.ch entra (as outras são defesa, para fora ou na trave)
      const chance = (S0, lam) => {
        if (r() >= lam * CO.ch / CO.mins) return false;
        const sc = scorer(r, S0), sd = sideName(m, S0); m.sh = m.sh || { us: 0, them: 0 }; m.sh[sd]++;
        // Por onde veio: pelos lados na proporção em que o time ataca por ali (e: esquerda, d: direita de quem ataca)
        const wsh = (S0 === H ? mu.h : mu.a).wsh, l = r() < wsh ? (r() < 0.5 ? 'e' : 'd') : 'c';
        m.ot = m.ot || { us: 0, them: 0 };
        if (r() < 1 / CO.ch) {
          if (S0 === H) m.gh++; else m.ga++; m.ot[sd]++;
          // Bola parada: parte dos gols sai de pênalti, falta ou escanteio, com o batedor da lista (o treino puxa a jogada dele)
          let who = sc, sp = null, by2 = null; const tr = S0.train && TRAIN[S0.train] && TRAIN[S0.train].sp, rr = r();
          if (rr < 0.24 + (tr ? 0.08 : 0)) {
            sp = tr && r() < 0.5 ? tr : rr < 0.08 ? 'pen' : rr < 0.15 ? 'falta' : 'esc';
            if (sp === 'esc' && l !== 'c' && r() < 0.3) sp = 'fc'; // falta cruzada da lateral da área (o batedor de cruzar e o cabeceio)
            const tk = takerOf(S0, sp === 'pen' ? 'pen' : sp === 'falta' ? 'fl' : sp === 'fc' ? 'fc' : (l === 'e' ? 'ckE' : 'ckD'));
            if (sp === 'esc' || sp === 'fc') { by2 = tk ? tk.n : ''; const mm = byId(S0.squad), hd = S0.xi.map(id => mm[id]).filter(p => p && (p.pos === 'ZAG' || p.pos === 'ATA') && (!tk || p.id !== tk.id)); if (hd.length) who = hd[Math.floor(r() * hd.length)].n; }
            else if (tk) who = tk.n;
          }
          if (sp === 'esc') { m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; }
          m.ev.push({ m: m.min, t: 'gol', s: sd, p: who, l, sp, by: by2 }); stop = { t: 'gol', s: sd, p: who, l, sp, by: by2 };
        }
        else {
          // Bola parada que não entra (pênalti defendido ou para fora, falta na barreira, cabeçada no escanteio): só muda o rótulo
          // da chance, o placar segue o mesmo. Uma em ~4 chances perdidas é de bola parada; o treino puxa a jogada dele
          let k = r.pick(['defesa', 'defesa', 'fora', 'fora', 'trave', 'bloqueio']), who = sc, sp = null, by2 = null;
          const tr = S0.train && TRAIN[S0.train] && TRAIN[S0.train].sp, SM = CO.spMiss, w = q => SM[q] * (tr === q ? 1.3 : 1), rr = r();
          sp = rr < w('pen') ? 'pen' : rr < w('pen') + w('falta') ? 'falta' : rr < w('pen') + w('falta') + w('esc') ? 'esc' : null;
          if (sp === 'esc' && l !== 'c' && r() < 0.3) sp = 'fc';
          if (sp) {
            const tk = takerOf(S0, sp === 'pen' ? 'pen' : sp === 'falta' ? 'fl' : sp === 'fc' ? 'fc' : (l === 'e' ? 'ckE' : 'ckD')), u = r();
            if (sp === 'pen') { k = u < 0.55 ? 'defesa' : u < 0.85 ? 'fora' : 'trave'; if (tk) who = tk.n; }
            else if (sp === 'falta') { k = u < 0.35 ? 'defesa' : u < 0.75 ? 'fora' : u < 0.95 ? 'bloqueio' : 'trave'; if (tk) who = tk.n; }
            else { k = u < 0.4 ? 'defesa' : u < 0.8 ? 'fora' : 'bloqueio'; by2 = tk ? tk.n : ''; const mm = byId(S0.squad), hd = S0.xi.map(id => mm[id]).filter(p => p && (p.pos === 'ZAG' || p.pos === 'ATA') && (!tk || p.id !== tk.id)); if (hd.length) who = hd[Math.floor(r() * hd.length)].n; }
          }
          if (k === 'defesa') m.ot[sd]++;
          // Escanteio: o da jogada e parte das defesas e dos chutes travados
          if (sp === 'esc' || (!sp && (k === 'defesa' || k === 'bloqueio') && r() < 0.5)) { m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; }
          m.ev.push({ m: m.min, t: 'chance', s: sd, p: who, k, l, sp, by: by2 });
        }
        return true;
      };
      if (!chance(H, lh)) chance(A, la);
      // Escanteios que não viram chance (cruzamento afastado, cobrança curta): no ritmo de quem manda
      [[H, lh], [A, la]].forEach(([S0, lam]) => { if (r() < CO.ck / CO.mins * 2 * lam / (lh + la || 1)) { const sd = sideName(m, S0); m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; } });
      // Faltas, cartões, impedimento e lesão (o seu vermelho e a sua lesão param o jogo; os do rival entram no relato)
      [m.us, m.them].forEach(s => {
        if (stop && stop.t !== 'gol') return;
        const sd = sideName(m, s), o = s === m.us ? m.them : m.us, st = styOf(s), cnt = k => { m[k] = m[k] || { us: 0, them: 0 }; m[k][sd]++; };
        if (r() < CO.foul / CO.mins * (0.8 + 0.45 * st.press + 0.2 * (1 - st.ctrl))) {
          cnt('fo');
          const k = foulPick(r, s), id = s.xi[k], p = id && s.squad.find(x => x.id === id); if (!p) return;
          s.bk = s.bk || {};
          const kc = m.classic ? CO.kCl : 1, bk = !!s.bk[id], card = r() < CO.redD * kc ? 'direto' : r() < CO.yel * kc * (bk ? 0.7 : 1) ? (bk ? '2am' : 'am') : '';
          if (card === 'am') {
            s.bk[id] = 1; cnt('yc');
            if (s.mine) (m.ycAdd = m.ycAdd || []).push(id);
            m.ev.push({ m: m.min, t: 'amarelo', s: sd, p: p.n, pos: slotsOf(s.form)[k] });
          } else if (card) {
            if (bk) { cnt('yc'); if (m.ycAdd) m.ycAdd = m.ycAdd.filter(x => x !== id); } // os amarelos do vermelho não acumulam
            cnt('rc'); s.xi[k] = null; s.red++; if (s.mine) p.sus = 2;
            m.ev.push({ m: m.min, t: 'vermelho', s: sd, p: p.n, how: card, pos: slotsOf(s.form)[k] });
            if (s.mine) stop = { t: 'vermelho', p: p.n, how: card, id };
          } else if (r() < CO.foulShow) m.ev.push({ m: m.min, t: 'falta', s: sd, p: p.n, pos: slotsOf(s.form)[k] });
        } else if (r() < CO.off / CO.mins * (0.55 + 0.9 * styOf(o).line) * (0.8 + 0.4 * st.counter)) {
          const at = s.xi.map((id, k) => [id, k]).filter(([id, k]) => id && /ATA|MEI/.test(slotsOf(s.form)[k])), q = at.length ? r.pick(at) : null;
          if (!q) return;
          cnt('of'); const p = s.squad.find(x => x.id === q[0]);
          m.ev.push({ m: m.min, t: 'impedimento', s: sd, p: p ? p.n : '', pos: slotsOf(s.form)[q[1]] });
        } else if (r() < CO.inj * 11 / CO.mins) { const k = r.int(0, s.xi.length - 1), id = s.xi[k], p = s.squad.find(x => x.id === id); if (!p) return; p.out = r.int(1, 6) + 1; m.ev.push({ m: m.min, t: 'lesao', s: sd, p: p.n }); if (s.mine) stop = { t: 'lesao', p: p.n, id, k }; else autoSub(s, k); }
      });
      // Os minutos jogados nos acréscimos ficam marcados nos lances (st: 45+st ou 90+st)
      if (m.st) for (let i = ev0; i < m.ev.length; i++) m.ev[i].st = m.st;
      // A placa do quarto árbitro: no 45' e no 90', pelo que parou o jogo (gols, trocas, cartões, lesões)
      if (!m.st && (m.min === 45 || m.min === 90)) {
        const h2 = m.min === 90, of = e => (h2 ? e.m > 45 : e.m <= 45), cnt = t => m.ev.filter(e => e.t === t && of(e)).length;
        const lost = 0.5 * cnt('gol') + 0.35 * cnt('troca') + 0.25 * (cnt('amarelo') + cnt('vermelho')) + 0.8 * cnt('lesao') + r() * 1.2;
        const a = h2 ? Math.max(3, Math.min(7, Math.round(2.6 + lost + (h2 ? 0.25 * ((m.us.subs < CO.subs ? CO.subs - m.us.subs : 0)) : 0)))) : Math.max(1, Math.min(3, Math.round(0.8 + lost)));
        m[h2 ? 'a2' : 'a1'] = a; m.ev.push({ m: m.min, t: 'acrescimo', s: '', p: a });
      }
      if (!stop && m.min === 45 && !m.half && m.st >= (m.a1 || 0)) { m.half = true; m.st = 0; stop = { t: 'intervalo' }; }
      // O auxiliar do rival troca os cansados no segundo tempo
      if (m.min === 60 || m.min === 70 || m.min === 80) tiredSubs(m.them);
      // O técnico rival muda o plano: perdendo no fim, se joga; ganhando, fecha
      if (m.min === 65 || m.min === 78) { const T = m.them, diff = (T === H ? m.gh - m.ga : m.ga - m.gh);
        const want = diff < 0 ? (m.min === 78 ? 'pressao' : 'lados') : diff > 0 && m.min === 78 ? 'retranca' : null;
        if (want && T.style !== want) { T.style = want; m.ev.push({ m: m.min, t: 'tatica', s: 'them', p: STY[want].name }); } }
    }
    if (m.min >= 90 && m.st >= (m.a2 || 0) && !stop) { m.done = true; stop = { t: 'fim' }; }
    m.stop = stop;
    save();
    return stop;
  };
  // Quem faz a falta: zagueiro, volante e lateral mais; goleiro quase nunca; quem já tem amarelo se cuida
  const FOUL_W = { GOL: 0.08, ZAG: 1.4, LAT: 1.15, MEI: 1.2, ATA: 0.65 };
  function foulPick(r, s) {
    const slots = slotsOf(s.form), w = s.xi.map((id, i) => (id ? FOUL_W[slots[i]] * (s.bk && s.bk[id] ? 0.6 : 1) : 0));
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0 && w[i]) return i; }
    return w.findIndex(v => v > 0);
  }
  function scorer(r, s) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    const w = s.xi.map((id, i) => { const p = m[id]; if (!p) return 0; const sl = slots[i]; return (sl === 'ATA' ? 5 : sl === 'MEI' ? 2 : sl === 'GOL' ? 0 : 0.6) * (p.ovr / 70); });
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return m[s.xi[i]] ? m[s.xi[i]].n : ''; }
    return '';
  }
  function autoSub(s, k) {
    if (s.subs <= 0 || !s.bench.length) { s.xi[k] = null; return; }
    const sl = slotsOf(s.form)[k], m = byId(s.squad);
    const inn = s.bench.slice().sort((a, b) => m[b].ovr * fit(m[b].pos, sl) - m[a].ovr * fit(m[a].pos, sl))[0];
    s.bench = s.bench.filter(x => x !== inn); s.xi[k] = inn; s.subs--;
  }
  // Troca o cansado só se quem está no banco rende mais naquela vaga agora
  function tiredSubs(s) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    s.xi.forEach((id, k) => {
      const p = m[id]; if (!p || k === 0 || s.subs <= 0 || !s.bench.length) return;
      const best = Math.max.apply(null, s.bench.map(b => eff(m[b], slots[k])));
      if (best > eff(p, slots[k]) * 1.01) autoSub(s, k);
    });
  }
  // Grito do técnico: um por vez, a partir do minuto de agora
  S.coShout = function (co, m, k) {
    if (m.done || m.us.shout || !SHOUT[k]) return false;
    m.us.shout = { k, from: m.min, until: m.min + SHOUT[k].dur };
    m.ev.push({ m: m.min, t: 'grito', s: 'us', p: SHOUT[k].name, k });
    return true;
  };
  // Conversa do intervalo: uma por jogo, só no intervalo
  S.coTalk = function (co, m, k) {
    if (!TALK[k] || m.talked || m.min < 45 || m.min > 46) return false;
    const st = talkState(m, m.us), d = TALK[k].mo[st];
    m.us.talk = { k, st, until: 60 }; m.talked = k;
    m.us.xi.forEach(id => { const p = id && m.us.squad.find(x => x.id === id); if (p) p.mo = Math.max(0, Math.min(100, (p.mo === undefined ? 60 : p.mo) + d)); });
    m.ev.push({ m: m.min, t: 'conversa', s: 'us', p: TALK[k].name });
    return true;
  };
  // Conversa com quem está chateado (segunda-feira): prometer chance, pedir paciência ou ser duro
  S.CO_TALK1 = {
    prometer: { name: 'Prometer chance', tip: 'Ele joga nos próximos 3 jogos ou fica pior do que antes', mo: 14 },
    paciencia: { name: 'Pedir paciência', tip: 'Acalma um pouco, sem promessa', mo: 5 },
    duro: { name: 'Ser duro', tip: '"Treine mais." Ele não gosta, mas para de pedir', mo: -4 },
  };
  S.coTalk1 = function (co, id, k) {
    const p = co.squad.find(x => x.id === id), t = S.CO_TALK1[k]; if (!p || !t) return false;
    p.mo = clamp((p.mo === undefined ? 60 : p.mo) + t.mo, 0, 100); p.talked = co.ss ? co.ss.i : 0;
    if (k === 'prometer') { const nx = S.coNext(co); p.prom = (nx ? nx.round : 0) + 2; }
    return true;
  };
  // Troca (na parada): sai um titular, entra um do banco na mesma vaga
  S.coSub = function (co, m, outId, inId) {
    const s = m.us, k = s.xi.indexOf(outId);
    if (s.subs <= 0 || k < 0 || !s.bench.includes(inId)) return false;
    s.xi[k] = inId; s.bench = s.bench.filter(x => x !== inId); s.subs--;
    s.gone = (s.gone || []).concat([outId]);
    return true;
  };
  // Muda formação ou estilo no meio do jogo: os mesmos jogadores redistribuídos pelo auxiliar nas vagas novas
  S.coMatchTactic = function (co, m, form, style) {
    const s = m.us;
    if (style && STY[style]) s.style = style;
    if (form && FORMS[form] && form !== s.form) {
      const on = s.squad.filter(p => s.xi.includes(p.id)), a = autoXI(on, form);
      s.form = form; s.xi = Array.from({ length: 11 }, (_, i) => a.xi[i] || null);
      s.roles = co.roles && co.roles[form] ? co.roles[form].slice() : null;
    }
    return true;
  };
  // A leitura do auxiliar no meio do jogo: o setor em que mais se sofre e o que está dando certo (em palavras, sem número)
  S.coRead = function (co, m) {
    const H = m.home ? m.us : m.them, A = m.home ? m.them : m.us, mu = matchup(H, A), u = m.home ? mu.h : mu.a, o = m.home ? mu.a : mu.h;
    const by = byId(m.us.squad), tired = m.us.xi.filter(id => by[id] && by[id].en < 55).map(id => by[id]).sort((a, b) => a.en - b.en);
    // De que lado eles chegam mais (a direita de quem ataca é a sua esquerda)
    const lanes = { e: 0, d: 0, c: 0 }; m.ev.filter(e => e.s === 'them' && e.l && e.m > m.min - 30).forEach(e => { lanes[e.l]++; });
    const side = lanes.e > lanes.d ? 'direita' : lanes.d > lanes.e ? 'esquerda' : (m.round % 2 ? 'direita' : 'esquerda');
    const bad = [
      [o.flank * o.wsh - 0.05, 'Eles estão passando fácil pela nossa ' + side + '. Mais gente aberta ou três zagueiros fecham isso.', 'Lado ' + (side === 'direita' ? 'direito' : 'esquerdo') + ' ↓'],
      [o.central * (1 - o.wsh) - 0.06, 'Os atacantes deles sobram na nossa área. Mais um zagueiro ajuda.', 'Área ↓'],
      [o.press - 0.25, 'A pressão deles está pegando a gente na saída de bola.', 'Saída ↓'],
      [o.counter * 1.6 - 0.25, 'Estamos deixando espaço nas costas para o contra-ataque deles.', 'Costas ↓'],
      [(0.5 - S.coPoss(m)) - 0.06, 'Eles mandam no meio, a bola não para com a gente.', 'Meio ↓'],
    ].sort((a, b) => b[0] - a[0]);
    const good = [
      [u.flank * u.wsh - 0.05, 'Nossos lados estão sobrando, professor.', 'Lados ↑'],
      [u.central * (1 - u.wsh) - 0.06, 'Nossos atacantes estão levando a melhor na área.', 'Área ↑'],
      [u.counter * 1.6 - 0.25, 'O contra-ataque está encaixando.', 'Contra-ataque ↑'],
      [(S.coPoss(m) - 0.5) - 0.06, 'A bola é nossa no meio.', 'Meio ↑'],
    ].sort((a, b) => b[0] - a[0]);
    const tags = [], said = [];
    if (bad[0][0] > 0) { said.push(bad[0][1]); tags.push(bad[0][2]); }
    if (good[0][0] > 0) { said.push(good[0][1]); tags.push(good[0][2]); }
    if (!said.length) said.push('Jogo parelho até aqui. Ninguém manda no meio, ninguém sobra nos lados.');
    if (tired.length) { tags.push(last(tired[0].n) + ' cansado'); if (said.length < 2) said.push(last(tired[0].n) + ' está no limite.'); }
    // Com amarelo e chegando forte: o auxiliar lembra (tirar o amarelado evita ficar com um a menos)
    const bk = m.us.bk ? m.us.xi.filter(id => id && m.us.bk[id] && by[id]).map(id => by[id]) : [];
    if (bk.length) { tags.push(last(bk[0].n) + ' amarelado'); if (said.length < 2) said.push(last(bk[0].n) + ' já tem amarelo e está chegando forte.'); }
    const oRed = (m.rc || {}).them || 0, uRed = (m.rc || {}).us || 0;
    if (oRed > uRed) { tags.unshift('Um a mais ↑'); said.unshift('Eles estão com um a menos. Hora de empurrar.'); said.length = Math.min(said.length, 2); }
    else if (uRed > oRed) { tags.unshift('Um a menos ↓'); }
    // Nos acréscimos do fim, o auxiliar lembra quanto falta
    if (m.min >= 90 && m.a2 && m.st < m.a2) { said.unshift('Mais ' + (m.a2 - (m.st || 0)) + (m.a2 - (m.st || 0) > 1 ? ' minutos' : ' minuto') + ', professor.'); said.length = Math.min(said.length, 2); }
    return { txt: said.join(' '), tags, side: bad[0][0] > 0 && bad[0][2].startsWith('Lado') ? side : null };
  };
  // Posse de bola sua até aqui (0 a 1)
  S.coPoss = m => (m.tk || m.min ? Math.max(0, Math.min(1, m.poss / (m.tk || m.min))) : 0.5);
  // Relógio com acréscimos: 45+2', 90+4' (no jogo e em cada lance)
  S.coClock = m => m.min + (m.st ? '+' + m.st : '') + '\'';
  S.coEvMin = e => e.m + (e.st ? '+' + e.st : '') + '\'';
  // ---------- caderno do técnico ----------
  // O que cada estilo e cada formação faz contra os outros não aparece no começo: o técnico anota depois dos jogos,
  // primeiro a lápis (pode estar errado; a Leitura de jogo acerta mais) e, vendo o mesmo confronto de novo, a caneta
  // (o valor certo). A verdade de cada casa é o confronto entre dois times iguais (estilos no 4-4-2, formações no
  // equilibrado): ↑ você leva vantagem, ↓ sofre, = parelho
  let CAD_T = null;
  const CAD_K = 0.04;
  function cadTruth() {
    if (CAD_T) return CAD_T;
    const sq = []; Object.keys(CO.squad).forEach(pos => { for (let k = 0; k < CO.squad[pos]; k++) sq.push({ id: pos + k, n: '', pos, ovr: 70, en: 100, mo: 60 }); });
    const side = (form, style) => ({ squad: sq, form, style, xi: autoXI(sq, form).xi, bonus: 0 });
    const cell = (H, A) => {
      const mu = matchup(H, A, true), x = mu.lh / mu.la, u = mu.h, o = mu.a;
      // O porquê, por setor: o que mais pesou a favor e contra
      const sec = { meio: u.poss - 0.5, lados: u.flank * u.wsh - o.flank * o.wsh, area: u.central * (1 - u.wsh) - o.central * (1 - o.wsh), pressao: u.press - o.press, contra: 1.6 * (u.counter - o.counter) };
      return { v: H.form === A.form && H.style === A.style ? 'eq' : x > 1 + CAD_K ? 'up' : x < 1 - CAD_K ? 'down' : 'eq', x, sec };
    };
    const T = { sty: {}, frm: {} };
    S.CO_STYLES.forEach(a => S.CO_STYLES.forEach(b => { T.sty[a + '|' + b] = cell(side('4-4-2', a), side('4-4-2', b)); }));
    const F = Object.keys(FORMS);
    F.forEach(a => F.forEach(b => { T.frm[a + '|' + b] = cell(side(a, 'equilibrado'), side(b, 'equilibrado')); }));
    return (CAD_T = T);
  }
  S.coCadTruth = cadTruth;
  // O espelho (o mesmo estilo ou a mesma formação dos dois lados) é sempre "=": nem o lápis erra ali. Saves de antes
  // desta regra podem ter uma seta a lápis no espelho: vira "=" ao abrir
  const cadMirror = ab => { const [a, b] = ab.split('|'); return a === b; };
  const cadOf = co => {
    if (!co.cad) co.cad = { sty: {}, frm: {}, riv: {}, aux: [] };
    else if (!co.cad.mir) { ['sty', 'frm'].forEach(k => Object.keys(co.cad[k]).forEach(ab => { if (cadMirror(ab)) { const c = co.cad[k][ab]; c.v = 'eq'; c.ok = true; c.fix = false; } })); }
    co.cad.mir = 1;
    return co.cad;
  };
  S.coCad = cadOf;
  S.CO_CAD_SEC = { meio: 'Meio de campo', lados: 'Lados', area: 'Área', pressao: 'Pressão', contra: 'Contra-ataque' };
  // Quantas casas anota por jogo e a chance de o lápis estar certo
  S.coCadPer = co => 1 + (co.xp.leitura >= 4 ? 1 : 0);
  S.coCadAcc = co => Math.min(0.95, 0.6 + 0.05 * co.xp.leitura);
  // A casa como o técnico vê: null (nunca viu) ou { v, pen, ok, from }
  S.coCadGet = (co, k, a, b) => (cadOf(co)[k][a + '|' + b] || null);
  // Palpite do auxiliar antes do jogo (um por rodada): o estilo que ele usaria contra o estilo esperado do rival;
  // acerta o melhor em uns 60%, no resto chuta outro
  S.CO_AUX_ACC = 0.6;
  S.coHint = function (co) {
    const nx = S.coNext(co); if (!nx || nx.bye) return null;
    const key = co.season + '|' + nx.round, cad = cadOf(co);
    if (cad.hint && cad.hint.k === key) return cad.hint;
    const them = oppSide(co, nx.vs, !nx.home), T = cadTruth(), r = S.rng(hash(String(co.name) + '|' + co.club + '|' + key + '|aux'));
    const rank = S.CO_STYLES.slice().sort((a, b) => T.sty[b + '|' + them.style].x - T.sty[a + '|' + them.style].x);
    const style = r() < S.CO_AUX_ACC ? rank[0] : r.pick(rank.slice(1));
    return (cad.hint = { k: key, vs: nx.vs, them: them.style, style });
  };
  S.CO_AUX_VS = { equilibrado: 'um time equilibrado', posse: 'um time que gosta da bola', pressao: 'pressão alta', contra: 'time de contra-ataque', retranca: 'retranca', lados: 'time que joga pelos lados' };
  S.CO_AUX_DO = { equilibrado: 'eu iria no equilibrado', posse: 'eu ficaria com a bola', pressao: 'eu apertaria a saída deles', contra: 'eu esperaria e sairia no contra-ataque', retranca: 'eu fecharia a casinha', lados: 'eu abriria o jogo pelos lados' };
  S.coHintTxt = h => 'Contra ' + S.CO_AUX_VS[h.them] + ', ' + S.CO_AUX_DO[h.style] + ', professor.';
  // Anota depois do jogo: os confrontos que ficaram em campo por mais tempo (estilo e formação separados)
  function cadNote(co, m, log) {
    const cad = cadOf(co), T = cadTruth(), { r, save } = rngCo(co), acc = S.coCadAcc(co), per = S.coCadPer(co);
    // Estilo e formação se alternam (começa pelo lado com menos anotações), cada um do que mais tempo ficou em campo
    const pm = m.pm || {}, by = k => Object.keys(pm).filter(x => x.startsWith(k + ':') && pm[x] >= 15).sort((a, b) => pm[b] - pm[a]);
    const ls = by('sty'), lf = by('frm'), first = Object.keys(cad.frm).length < Object.keys(cad.sty).length ? [lf, ls] : [ls, lf], cand = [];
    for (let i = 0; i < Math.max(ls.length, lf.length); i++) first.forEach(l => { if (l[i]) cand.push(l[i]); });
    const from = { s: co.season, r: m.round, vs: m.vs, gf: log.gf, ga: log.ga };
    const notes = [], seen = [];
    cand.forEach(key => {
      const [k, ab] = key.split(':'), c = cad[k][ab], t = T[k][ab];
      if (c && c.pen) { if (seen.length < 1) seen.push({ k, ab, v: c.v }); return; }
      if (notes.length >= per) return;
      if (!c) {
        const ok = cadMirror(ab) || r() < acc, v = ok ? t.v : r.pick(['up', 'down', 'eq'].filter(x => x !== t.v));
        cad[k][ab] = { v, pen: false, ok, from: [from] };
        notes.push({ k, ab, v, pen: false, prev: null });
      } else {
        const prev = c.v; c.v = t.v; c.pen = true; c.fix = prev !== t.v; c.from.push(from);
        notes.push({ k, ab, v: t.v, pen: true, prev });
      }
    });
    save();
    // O rival: como ele jogou (o que mais tempo ficou em campo)
    const rv = cad.riv[m.vs] || (cad.riv[m.vs] = { n: 0 });
    const tm = m.tm || {}, tk = Object.keys(tm).sort((a, b) => tm[b] - tm[a])[0], [tf, ts] = tk ? tk.split('|') : [m.them.form, m.them.style];
    rv.n++; rv.form = tf; rv.style = ts; rv.s = co.season; rv.r = m.round;
    // O palpite do auxiliar: só conta se você jogou daquele jeito a maior parte do jogo
    let hint = null;
    if (cad.hint && cad.hint.k === co.season + '|' + m.round) {
      const h = cad.hint, main = cand.find(x => x.startsWith('sty:'));
      if (main && main.slice(4) === h.style + '|' + h.them) { const ok = T.sty[h.style + '|' + h.them].v === 'up'; cad.aux.push(ok ? 1 : 0); if (cad.aux.length > 5) cad.aux.shift(); hint = { txt: h, st: ok ? 'ok' : 'bad' }; }
      else hint = { txt: h, st: 'nt' };
      delete cad.hint;
    }
    return { notes, seen, hint };
  }
  S.coCadSeen = co => { const c = cadOf(co), n = o => Object.keys(o).length; return { sty: n(c.sty), frm: n(c.frm), styPen: Object.keys(c.sty).filter(k => c.sty[k].pen).length, frmPen: Object.keys(c.frm).filter(k => c.frm[k].pen).length }; };
  // O auxiliar troca quem caiu (lesão) e os muito cansados: o que o robô e o "resumir" usam
  S.coAutoStop = function (co, m) {
    const s = m.us, st = m.stop;
    if (st && st.t === 'lesao') { const k = s.xi.indexOf(st.id); if (k >= 0) autoSub(s, k); }
    if (m.min >= 60) tiredSubs(s);
  };
  // Joga o resto do jogo sem parar (o auxiliar decide nas paradas)
  S.coMatchRest = function (co, m) { while (!m.done) { S.coMatchStep(co, m); S.coAutoStop(co, m); } return m; };
  // Fim do jogo: tabela, os outros jogos da rodada, energia, moral, lesões e suspensões, diretoria
  S.coMatchEnd = function (co, m) {
    const ss = co.ss, me = ss.ids.indexOf(co.club), vi = ss.ids.indexOf(m.vs);
    const [hi, ai] = m.home ? [me, vi] : [vi, me];
    addTab(ss.tab, hi, ai, m.gh, m.ga, resOf(ss));
    const gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh, res = gf > ga ? 'v' : gf < ga ? 'd' : 'e';
    roundRest(co, [me, vi]);
    // Elenco: quem jogou cansa, quem não jogou descansa; moral pelo resultado e por jogar ou não
    const motiv = co.xp.motiv * 0.06;
    co.squad.forEach(p => {
      const pl = m.played[p.id] || 0;
      p.en = Math.min(100, p.en + (pl ? CO.enRest : CO.enOff));
      // Moral volta aos poucos para 60; vitória sobe, derrota desce (a motivação do técnico segura a queda)
      p.mo += (60 - p.mo) * 0.12;
      // Jogos seguidos sem entrar (bn) e a promessa de chance feita na conversa (some: moral cai se não cumprir)
      p.bn = pl ? 0 : (p.bn || 0) + 1;
      if (p.prom) { if (pl) delete p.prom; else if (m.round >= p.prom) { p.mo = clamp(p.mo - 15, 0, 100); delete p.prom; p.broke = 1; } }
      if (pl) p.mo = clamp(p.mo + (res === 'v' ? 5 : res === 'd' ? -5 * (1 - motiv) : 0.5), 0, 100);
      else if (p.ovr >= teamAvg(co) - 2) p.mo = clamp(p.mo - 2 * (1 - motiv), 0, 100);
    });
    // Lesão e vermelho já contam o jogo de hoje (out = n + 1, sus = 2): desconta 1 de todos
    co.squad.forEach(p => { if (p.out) p.out--; if (p.sus) p.sus--; if (!p.sus) p.ycSus = 0; });
    // Amarelos acumulados: no CO.ycMax, um jogo de suspensão e a conta zera (quem foi expulso já cumpre pelo vermelho)
    const ycOut = [];
    (m.ycAdd || []).forEach(id => { const p = co.squad.find(x => x.id === id); if (!p) return; p.yc = (p.yc || 0) + 1; if (p.yc >= CO.ycMax) { p.yc = 0; if (!p.sus) { p.sus = 1; p.ycSus = 1; ycOut.push(p.n); } } });
    const log = { r: m.round, vs: m.vs, home: m.home, gf, ga, res, ycOut, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
    if (co.train && co.train.i <= ss.i) { log.train = co.train.k; delete co.train; }
    log.rt = rateMatch(co, m, gf, ga);
    log.rt.forEach(x => { const p = co.squad.find(q => q.id === x.id); if (!p) return; p.notes = (p.notes || []).concat([x.r]).slice(-5);
      if (x.r >= 7.5) p.mo = clamp(p.mo + 2, 0, 100); else if (x.r < 5.5) p.mo = clamp(p.mo - 2, 0, 100); });
    log.cad = cadNote(co, m, log);
    ss.log.push(log);
    board(co, log);
    ss.i++;
    if (!co.sacked) { co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))); if (co.xi.length < 11 || co.autoXI) { const a = autoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; } else co.bench = co.squad.filter(p => ok(p) && !co.xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id); }
    if (ss.i >= ss.rounds.length) ss.done = true;
    return log;
  };
  // Notas do jogo (3 a 10) para quem jogou 10 minutos ou mais, com o porquê em poucas palavras. Sem sorteio do jogo:
  // um hash do jogador e da rodada dá a variação (o save no meio termina igual)
  const hsh = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
  function rateMatch(co, m, gf, ga) {
    const by = byId(co.squad), avg = teamAvg(co), ot = m.ot || { us: 0, them: 0 }, saves = Math.max(0, (ot.them || 0) - ga), start = m.startXI || [];
    return Object.keys(m.played).map(id => {
      const p = by[id], min = m.played[id]; if (!p || min < 10) return null;
      const ev = m.ev.filter(e => e.s === 'us' && e.p === p.n);
      const g = ev.filter(e => e.t === 'gol'), sh = ev.filter(e => e.t === 'chance').length, on = ev.filter(e => e.t === 'chance' && (e.k === 'defesa' || e.k === 'trave')).length;
      const yc = ev.some(e => e.t === 'amarelo'), rc = ev.some(e => e.t === 'vermelho'), fo = ev.filter(e => e.t === 'falta').length;
      const def = { GOL: 1, ZAG: 0.8, LAT: 0.6, MEI: 0.3, ATA: 0.1 }[p.pos] || 0.3, k = Math.min(1, min / 70);
      let r = 6.2 + (p.ovr - avg) / 25 + (hsh(id + ':' + co.season + ':' + m.round) - 0.5) * 1.1;
      r += k * ((gf > ga ? 0.35 : gf < ga ? -0.35 : 0) - def * ga * 0.32 + (ga === 0 ? def * 0.6 : 0) + (p.pos === 'GOL' ? Math.min(1.2, saves * 0.22) : 0));
      r += g.length * 1.1 + on * 0.25 + sh * 0.08 - (yc ? 0.3 : 0) - (rc ? 1.6 : 0) - fo * 0.1;
      r = clamp(Math.round(r * 10) / 10, 3, 10);
      const sub = !start.includes(id);
      const w = g.length ? (g.length > 1 ? g.length + ' gols' : 'gol') + (sub ? ' saindo do banco, aos ' + S.coEvMin(g[0]) : '') :
        rc ? 'expulso' : p.pos === 'GOL' ? (ga === 0 ? 'não levou gol' + (saves ? ', ' + saves + (saves > 1 ? ' defesas' : ' defesa') : '') : saves ? saves + (saves > 1 ? ' defesas' : ' defesa') + ', ' + ga + (ga > 1 ? ' gols sofridos' : ' gol sofrido') : ga + (ga > 1 ? ' gols sofridos' : ' gol sofrido')) :
        def >= 0.6 && ga === 0 ? 'atrás sem levar gol' : on ? (sh > 1 ? sh + ' chutes, ' : '') + on + ' no gol' : sh ? sh + (sh > 1 ? ' chutes' : ' chute') + ' para fora' :
        yc ? 'amarelo' + (fo ? ' e ' + (fo + 1) + ' faltas' : '') : r < 5.6 ? (def >= 0.6 ? 'sofreu com o ataque deles' : 'sumiu do jogo') : r >= 7 ? (def >= 0.6 ? 'seguro atrás' : 'bom jogo') : sub ? 'entrou aos ' + (90 - min) + "'" : 'jogo discreto';
      return { id, r, w, sub, min };
    }).filter(Boolean).sort((a, b) => b.r - a.r);
  }
  S.coRateMatch = rateMatch;
  const teamAvg = co => { const s = co.squad.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11); return s.reduce((a, p) => a + p.ovr, 0) / Math.max(1, s.length); };
  S.coTeamAvg = teamAvg;
  // res: lista de placares da rodada (ss.res[i]) para a aba Rodadas; f: últimos 5 resultados de cada time
  function addTab(tab, h, a, gh, ga, res) {
    const H = tab[h], A = tab[a];
    H.j++; A.j++; H.gp += gh; H.gc += ga; A.gp += ga; A.gc += gh;
    if (gh > ga) { H.v++; H.p += 3; A.d++; } else if (gh < ga) { A.v++; A.p += 3; H.d++; } else { H.e++; A.e++; H.p++; A.p++; }
    const f5 = (t, x) => { t.f = ((t.f || '') + x).slice(-5); };
    f5(H, gh > ga ? 'v' : gh < ga ? 'd' : 'e'); f5(A, gh < ga ? 'v' : gh > ga ? 'd' : 'e');
    if (res) res.push([h, a, gh, ga]);
  }
  const resOf = ss => { ss.res = ss.res || []; return (ss.res[ss.i] = ss.res[ss.i] || []); };
  // Os outros jogos da rodada pela força dos clubes
  function roundRest(co, skip) {
    const ss = co.ss, { r, save } = rngCo(co), str = id => D.CLUB_BY_ID[id].strength;
    ss.rounds[ss.i].forEach(([h, a]) => {
      if (skip.includes(h) && skip.includes(a)) return;
      if (skip.includes(h) || skip.includes(a)) return;
      const g = L().simple(r, h, a, str(ss.ids[h]), str(ss.ids[a]));
      addTab(ss.tab, h, a, g.gh, g.ga, resOf(ss));
    });
    save();
  }
  // Rodada sem você (folga ou depois da demissão)
  S.coSkipRound = function (co) { const ss = co.ss; roundRest(co, []); ss.i++; if (ss.i >= ss.rounds.length) ss.done = true; };

  // ---------- diretoria ----------
  // Confiança escondida (aparece no tom do presidente): sobe e desce com o resultado contra o esperado e com a tabela
  function board(co, log) {
    const B = co.board, ss = co.ss, club = D.CLUB_BY_ID[co.club];
    // Pontos esperados no jogo: CO.ppg é o que o robô faz contra um igual; força do elenco contra a do rival e o mando mexem
    const opp = D.CLUB_BY_ID[log.vs].strength, d = teamAvg(co) - 1.5 - opp;
    const exp = clamp(CO.ppg + d / 14 + (log.home ? 0.25 : -0.25), 0.4, 2.5);
    const pts = log.res === 'v' ? 3 : log.res === 'e' ? 1 : 0;
    B.conf = clamp(B.conf + (pts - exp) * CO.confK, 0, 100);
    // Na metade final da liga, a posição pesa
    if (ss.i >= ss.rounds.length / 2) { const pos = S.coPos(co); B.conf = clamp(B.conf + (pos <= B.goal.pos ? 0.8 : -Math.min(2.5, (pos - B.goal.pos) * 0.4)), 0, 100); }
    void club;
    if (B.ult) {
      B.ult.n++; if (pts === 3) B.ult.got++;
      if (B.ult.got >= CO.ultNeed) { B.ult = null; B.conf = 45; B.passed = (B.passed || 0) + 1; }
      else if (B.ult.n >= CO.ultN) { co.sacked = true; B.ult = null; }
    } else if (B.conf < CO.ultAt && ss.i + 1 >= CO.ultMin && ss.rounds.length - ss.i > CO.ultN) {
      B.ult = { n: 0, got: 0, need: CO.ultNeed, of: CO.ultN };
    }
  }
  // Tom do presidente pela confiança (a confiança não aparece em número)
  S.coMood = co => { const c = co.board ? co.board.conf : 60; return c >= 70 ? 'feliz' : c >= 45 ? 'tranquilo' : c >= CO.ultAt ? 'preocupado' : 'no limite'; };

  // ---------- fim da temporada ----------
  // Divisões (sobe e cai na sua liga), fama, experiência, evolução do elenco, contratos, garotos da base
  S.coSeasonEnd = function (co) {
    const ss = co.ss;
    while (!ss.done) S.coSkipRound(co);
    const ord = order(ss.tab), pos = ord.findIndex(i => ss.ids[i] === co.club) + 1, n = ss.ids.length, B = co.board;
    const champ = ss.ids[ord[0]], won = champ === co.club && !co.sacked;
    const met = !co.sacked && pos <= B.goal.pos;
    const up = ss.promo && pos <= ss.promo, down = ss.releg && pos > n - ss.releg;
    // Fama: título, meta, campanha acima do esperado; cai com rebaixamento e demissão
    const f0 = co.fame;
    let df = (won ? 10 : 0) + (met ? 5 : -2) + clamp(B.goal.exp - pos, -4, 6) * 0.8 + (up ? 4 : 0) - (down && !co.sacked ? 8 : 0) - (co.sacked ? 10 : 0);
    df = Math.max(-15, df); // uma temporada ruim tira no máximo 15
    co.fame = clamp(Math.round(co.fame + df), 0, 100);
    // Experiência: um ponto por temporada, dois por título, um pela meta
    const gx = (co.sacked ? 0 : 1) + (won ? 2 : 0) + (met ? 1 : 0);
    co.xp.pts += gx;
    if (won) co.titles.push({ s: co.season, name: ss.name, club: co.club });
    const coins = coinsOf(co, { won, met, up: !!up, sacked: !!co.sacked });
    const out = { season: co.season, club: co.club, league: ss.name, pos, n, goal: B.goal, met, won, up: !!up, down: !!down, sacked: !!co.sacked, fame: [f0, co.fame], xp: gx, coins, log: ss.log.slice() };
    co.hist.push({ s: co.season, club: co.club, league: ss.name, pos, n, goal: B.goal.k, met, won, up: !!up, down: !!down, sacked: !!co.sacked });
    // Divisões da carreira: os de cima e de baixo trocam com a sua liga
    moveLeagues(co, ss, ord);
    // Elenco: idade, evolução, aposentadoria, contratos, base
    const { r, save } = rngCo(co);
    if (!co.sacked) {
      co.squad.forEach(p => {
        p.age++;
        const g = p.age <= 21 ? r.int(1, 4) : p.age <= 26 ? r.int(0, 2) : p.age <= 30 ? r.int(-1, 1) : p.age <= 33 ? r.int(-3, 0) : r.int(-5, -1);
        p.ovr = clamp(p.ovr + (g > 0 ? Math.min(g, Math.max(0, p.pot - p.ovr)) : g), 30, 95);
        p.ct--; p.mo = 60; p.en = 100;
      });
      out.left = co.squad.filter(p => p.age >= 37 || (p.age >= 34 && r() < 0.35) || p.ct <= 0).map(p => ({ n: p.n, why: p.ct <= 0 && p.age < 34 ? 'fim de contrato' : 'aposentou' }));
      // v1 (sem mercado ainda): quem é titular e acaba o contrato renova por 2 anos; os outros saem
      const core = new Set(autoXI(co.squad, co.form).xi);
      co.squad.forEach(p => { if (p.ct <= 0 && core.has(p.id) && p.age < 34) { p.ct = 2; p.wage = wageOf(p.ovr); } });
      out.left = out.left.filter(x => !co.squad.some(p => p.n === x.n && p.ct > 0 && p.age < 34));
      co.squad = co.squad.filter(p => p.ct > 0 && !(p.age >= 37) && !out.left.some(x => x.n === p.n));
      // Base: 1 ou 2 garotos; e reposição do clube para o elenco não ficar curto
      const club = D.CLUB_BY_ID[co.club], cty = D.countryOf(club);
      const kids = [];
      for (let k = 0; k < (r() < 0.5 ? 2 : 1); k++) { const pos = r.pick(['ZAG', 'LAT', 'MEI', 'MEI', 'ATA', 'ATA', 'GOL']); const p = mkPlayer(r, club, pos, club.strength - 12 + r.gauss() * 3, 17, 'p' + (co.pid++), cty); p.pot = Math.min(95, p.pot + r.int(0, 8)); co.squad.push(p); kids.push(p.n); }
      out.kids = kids;
      Object.keys(CO.squad).forEach(pos => {
        while (co.squad.filter(p => p.pos === pos).length < CO.squad[pos] - 1) co.squad.push(mkPlayer(r, club, pos, club.strength - 4 + r.gauss() * 3, r.int(21, 29), 'p' + (co.pid++), cty));
      });
    }
    save();
    co.season++;
    co.ss = null;
    S.applyLeagues(co);
    out.offers = co.sacked ? S.coOffers(co) : null;
    if (co.sacked) { co.club = null; co.squad = []; }
    co.last = out;
    return out;
  };
  // Moedas da conta pela temporada (2026-11-09): título pela divisão (elite 60, segunda 35, terceira para baixo 20),
  // acesso 15 e meta da diretoria 5; demitido não ganha nada. A tela soma na carteira (U.COINS) uma vez só.
  const CO_COINS = S.CO_COINS = { tit: [60, 35, 20], acesso: 15, meta: 5 };
  const lgDepth = lg => { let d = 0, x = lg; while (D.LADDER[x] && D.LADDER[x].up && d < 5) { x = D.LADDER[x].up; d++; } return d; };
  S.coLgDepth = lgDepth;
  function coinsOf(co, o) {
    if (o.sacked) return [];
    const lg = (co.leagueOf || {})[co.club] || D.CLUB_BY_ID[co.club].league, out = [];
    if (o.won) out.push({ k: 'tit', t: 'Título', n: CO_COINS.tit[Math.min(2, lgDepth(lg))] });
    if (o.up) out.push({ k: 'acesso', t: 'Acesso', n: CO_COINS.acesso });
    if (o.met) out.push({ k: 'meta', t: 'Meta cumprida', n: CO_COINS.meta });
    return out;
  }
  // Escolher clube com moedas (fase 2, quadro 41): preço pela força atual do clube; vale onde há propostas
  // (começo da carreira, fim de temporada, depois da demissão). A meta continua a do clube e a moeda não volta.
  S.CO_CLUB_PRICE = [[60, 30], [67, 80], [74, 180], [80, 350], [999, 600]];
  S.coClubPrice = id => { const st = D.CLUB_BY_ID[id].strength; return S.CO_CLUB_PRICE.find(([m]) => st <= m)[1]; };
  // Clubes de uma liga para a grade (do mais forte ao mais fraco), já com as divisões desta carreira
  S.coBuyList = (co, lg) => { S.applyLeagues(co); return D.CLUBS.filter(x => x.league === lg && x.id !== co.club).sort((a, b) => b.strength - a.strength).map(x => x.id); };
  // Marca a compra na carreira (o ranking poderá mostrar depois) e assina
  S.coBuyClub = function (co, id, paid) {
    co.bought = (co.bought || []).concat([{ s: co.season, club: id, n: paid }]);
    S.coSign(co, id);
  };
  // Experiência: um ponto numa habilidade (leitura de jogo, motivação, negociação), até 10 em cada
  S.CO_SKILLS = { leitura: 'Leitura de jogo', motiv: 'Motivação', negoc: 'Negociação' };
  S.coSkill = function (co, k) {
    if (!S.CO_SKILLS[k] || co.xp.pts <= 0 || co.xp[k] >= CO.skillMax) return false;
    co.xp.pts--; co.xp[k]++;
    return true;
  };
  function moveLeagues(co, ss, ord) {
    const club = D.CLUB_BY_ID[co.club], from = club.league, LD = D.LADDER[from] || {};
    co.leagueOf = co.leagueOf || {};
    const ids = ord.map(i => ss.ids[i]).filter(id => D.CLUB_BY_ID[id].league === from);
    const swap = (list, to, other) => {
      const pool = D.CLUBS.filter(x => x.league === to).sort((a, b) => (other === 'up' ? a.strength - b.strength : b.strength - a.strength));
      list.forEach((id, k) => { const p = pool[k]; if (!p) return; co.leagueOf[id] = to; co.leagueOf[p.id] = from; });
    };
    if (LD.up && ss.promo) swap(ids.slice(0, ss.promo), LD.up, 'up');
    if (LD.down && ss.releg) swap(ids.slice(-ss.releg), LD.down, 'down');
  }
  // Diz se a carreira já tem clube e temporada em andamento
  S.coState = co => (!co.club ? 'sem-clube' : !co.ss ? 'pre' : co.ss.done ? 'fim' : 'jogo');

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
