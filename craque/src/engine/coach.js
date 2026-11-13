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
  // kT (peso da tática no confronto) 0,3 → 0,45 em 2026-11-11: seguir o plano do auxiliar contra time parecido leva a
  // vitória de ~37% a ~48% (antes ~44%); craque_taticas.js segue com 0 alertas
  const CO = S.CO = {
    squad: { GOL: 3, ZAG: 5, LAT: 4, MEI: 8, ATA: 5 },
    lamH: 1.32, lamA: 1.06, ch: 3.2, spMiss: { pen: 0.012, falta: 0.17, esc: 0.15 }, ck: 4, k: env('CO_K', 36), home: 2, kT: env('CO_KT', 0.45), kD: env('CO_KD', 40),
    // Energia (Silvio 2026-11-11: "sinto falta da energia descer durante o jogo" e "a recuperação depende do treino físico"):
    // enGame = quanto um titular gasta em 90 min no Equilibrado (o estilo, a preleção, o grito, a função e o Físico mudam;
    // goleiro enGK do resto); entre um jogo e outro quem jogou recupera enRec do que falta para 100, quem não jogou volta
    // inteiro; o treino da semana tira ou devolve por cima disso. Lesão: cansado abaixo de enInj machuca mais
    daySd: 0.1, prep: 0.04, enGame: 34, enGK: 0.35, enRec: 0.75, enOpp: 90, enInj: 65, inj: 0.011, subs: 5, win: 3,
    // Acréscimos: a1 1 a 3 no 1º tempo, a2 3 a 7 no 2º; mins = minutos jogados num jogo médio (90 + acréscimos): as taxas
    // por minuto dividem por ele, para os acréscimos não aumentarem gols, faltas e cansaço
    mins: 96,
    // Faltas e cartões por time e por jogo: foul faltas (o estilo muda), yel amarelos por falta, redD vermelho direto por falta,
    // ycMax amarelos que suspendem; off impedimentos; foulShow das faltas sem cartão que o campinho apita (as perigosas)
    foul: 12, yel: 0.08, redD: 0.002, kCl: 1.8, ycMax: 3, off: 2.2, foulShow: 0.14,
    // moK: peso da moral no rendimento (moral 100 = +5%; era 1200 = +3% até 2026-11-12, "senão ninguém sente")
    moK: env('CO_MOK', 750),
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
  const FORM_FX = S.CO_FORM_FX = { '4-4-2': [1, 0.95], '4-3-3': [1.04, 1.03], '4-2-3-1': [1.01, 0.99], '4-5-1': [0.90, 0.95], '3-5-2': [1.03, 1], '3-4-3': [1.07, 1.07], '5-3-2': [0.94, 0.9] };
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
    pressao: { name: 'Pressão alta', ctrl: 1.05, press: 1.1, line: 0.95, counter: 0.2, wide: 0.5, build: 0.9, patience: 0.2, att: 1.03, def: 1.06, en: 1.3,
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
    final: { tab: 'Ataque', name: 'Finalização', sub: 'chutar mais certo', fx: { mul: { att: 1.04 } }, en: 4, who: ['ATA', 'MEI'], dv: 0 },
    lados: { tab: 'Ataque', name: 'Jogadas pelos lados', sub: 'cruzamento e ultrapassagem', fx: { add: { wide: 0.12 }, mul: { att: 1.015 } }, en: 4, who: ['LAT', 'MEI'], dv: 2 },
    contra: { tab: 'Ataque', name: 'Contra-ataque', sub: 'sair rápido depois de roubar', fx: { add: { counter: 0.15 } }, en: 5, who: ['ATA', 'MEI'], dv: 4 },
    toque: { tab: 'Ataque', name: 'Troca de passes', sub: 'ficar com a bola', fx: { add: { ctrl: 0.08 } }, en: 3, who: ['MEI'], dv: 1 },
    pressao: { tab: 'Defesa', name: 'Marcação alta', sub: 'roubar lá na frente', fx: { add: { press: 0.15 } }, en: 6, who: ['ATA', 'MEI'], dv: 5 },
    linha: { tab: 'Defesa', name: 'Linha de zaga', sub: 'subir junto, pegar impedimento', fx: { mul: { def: 0.965 } }, en: 3, who: ['ZAG', 'LAT'], dv: 3 },
    bloco: { tab: 'Defesa', name: 'Bloco baixo', sub: 'fechar os espaços atrás', fx: { mul: { def: 0.95, att: 0.98 } }, en: 3, who: ['ZAG', 'MEI'], dv: 3 },
    duelos: { tab: 'Defesa', name: 'Duelos', sub: 'ganhar a dividida', fx: { mul: { def: 0.975, att: 1.01 } }, en: 5, who: ['ZAG', 'MEI'], dv: 5 },
    esc: { tab: 'Bola parada', name: 'Escanteio a favor', sub: 'mais perigo no 1º e 2º pau', fx: { mul: { att: 1.025 } }, sp: 'esc', en: 5, who: ['ZAG', 'ATA'], dv: 5 },
    falta: { tab: 'Bola parada', name: 'Falta a favor', sub: 'batedor e barreira', fx: { mul: { att: 1.02 } }, sp: 'falta', en: 3, who: ['MEI', 'ATA'], dv: 1 },
    defesc: { tab: 'Bola parada', name: 'Defender escanteio', sub: 'zona ou homem a homem', fx: { mul: { def: 0.97 } }, en: 4, who: ['ZAG', 'GOL'], dv: 3, dvG: 2 },
    pen: { tab: 'Bola parada', name: 'Pênaltis', sub: 'batedores e goleiro', fx: { mul: { att: 1.01, def: 0.99 } }, sp: 'pen', en: 2, who: ['ATA', 'GOL'], dv: 0, dvG: 5 },
    recup: { tab: 'Físico', name: 'Recuperação', sub: 'quem jogou descansa', fx: {}, en: -8, who: [] },
    resist: { tab: 'Físico', name: 'Resistência', sub: 'cansar menos no jogo', fx: { mul: { en: 0.85 } }, en: 5, who: ['MEI', 'LAT'], dv: 5 },
    veloc: { tab: 'Físico', name: 'Velocidade', sub: 'arrancada e recomposição', fx: { add: { counter: 0.06, press: 0.06 } }, en: 5, who: ['ATA', 'LAT'], dv: 4 },
    folga: { tab: 'Físico', name: 'Folga', sub: 'dia livre: moral e energia', fx: {}, en: -12, mo: 3, who: [] },
  };
  S.coTrain = function (co, k) {
    const t = TRAIN[k]; if (!t || !co.ss || (co.train && co.train.i === co.ss.i)) return false;
    co.train = { k, i: co.ss.i };
    trainGrow(co, t);
    const dk = t.en > 0 && S.coDmK ? S.coDmK(co, 'tr') : 1;
    co.squad.forEach(p => { p.en = Math.max(0, Math.min(100, p.en - t.en * dk * (t.en > 0 && !t.who.includes(p.pos) ? 0.5 : 1))); if (t.mo) p.mo = Math.min(100, (p.mo === undefined ? 60 : p.mo) + t.mo); });
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
    return l.length ? m[l[0]] : on.map(id => m[id]).filter(p => p && p.pos !== 'GOL').sort((a, b) => takeVal(b, k) - takeVal(a, k))[0]; };
  S.coTaker = takerOf;
  // Quanto o jogador vale em cada cobrança: pênalti e falta de longe pela finalização, falta para cruzar e escanteio
  // pelo passe; capitão segue pelo geral
  const takeVal = S.coTakeVal = (p, k) => { if (!AT.kS || k === 'cap' || p.pos === 'GOL') return p.ovr; const a = S.coAttrs(p); return k === 'pen' || k === 'fl' ? a[0] : a[1]; };
  const sty = k => STY[k] || STY.equilibrado;
  // Grito do técnico (partida ao vivo, um por vez, vale alguns minutos): mexe no estilo de agora por um tempo.
  // Nada é de graça: pressionar cansa e abre as costas, segurar e recuar tiram o ataque. O robô não grita (equilíbrio igual)
  const SHOUT = S.CO_SHOUT = {
    pressionar: { name: 'Pressionar', sub: 'cansa mais', dur: 10, add: { press: 0.4, line: 0.2, build: 0.05 }, mul: { en: 1.5, att: 1.08, def: 1.06 }, tip: 'o time rouba lá na frente e cansa mais rápido' },
    segurar: { name: 'Segurar', sub: 'gastar tempo', dur: 10, add: { ctrl: 0.2, press: -0.15, wide: -0.1 }, mul: { att: 0.84, def: 0.88, en: 0.85 }, tip: 'toca de lado, chega menos e sofre menos' },
    lados: { name: 'Pelos lados', sub: 'abrir o jogo', dur: 10, add: { wide: 0.35, patience: 0.15 }, mul: { att: 1.03, def: 1.05 }, tip: 'a bola vai para as pontas, sobra espaço no meio para eles' },
    recuar: { name: 'Recuar', sub: 'fechar a área', dur: 10, add: { line: -0.35, press: -0.25, counter: 0.2 }, sim: { line: -0.35, counter: 0.2 }, mul: { att: 0.8, def: 0.8, en: 0.9 }, tip: 'todo mundo atrás da linha da bola, só sai no contra-ataque' },
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
  // O estilo que o campinho ao vivo joga: o do time mais o que o grito soma enquanto vale (a linha sobe, o time abre, recua...)
  // (`sim` no grito = o que vale no campinho quando é diferente da conta: recuar sem baixar a pressão, senão levava mais gol)
  S.coSimSty = side => { const b = sty(side.style), sh = side.shout && SHOUT[side.shout.k]; if (!sh) return b;
    const o = Object.assign({}, b), ad = sh.sim || sh.add; Object.keys(ad).forEach(k => { o[k] = Math.max(0, (o[k] || 0) + ad[k]); }); return o; };
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
  // por semana. Abaixo de mil o salário vai de 100 em 100 (mínimo R$ 100): o arredondamento para mil dava "R$ 0" a garoto de geral baixo
  // (ficha do mercado, 2026-11-11); quem ganhava mil com geral 39 a 43 passa a ganhar de 500 a 900, e a folha fica quase igual
  const wageOf = ovr => { const w = Math.exp((ovr - 50) / 8.5) * 2; return w < 0.95 ? Math.max(100, Math.round(w * 10) * 100) : Math.round(w) * 1000; };
  function mkPlayer(r, club, pos, ovr, age, id, cty, real) {
    const pot = Math.min(95, Math.round(ovr + Math.max(0, 25 - age) * r.range(0.6, 1.7)));
    const p = { id, n: D.randomName(cty, r), pos, age, ovr: clamp(Math.round(ovr), 30, 95), pot: Math.max(Math.round(ovr), pot), wage: wageOf(ovr), ct: r.int(1, 4), mo: 60, en: 100, out: 0, sus: 0 };
    p.at = mkAttrs(p, id, real);
    return p;
  }
  // ---------- atributos por jogador (2026-11-10; mapa e plano: https://claude.ai/artifact/F3ZUSQycAH595tWxzjQSVm) ----------
  // Cada jogador tem 6 atributos de 20 a 99 em `p.at` (na ordem de AT.keys: linha L, goleiro G). O geral (`p.ovr`) segue
  // mandando: os atributos são o geral aberto pelo perfil da posição (`prof`), pelo jeito do jogador (um sorteio preso ao
  // id de origem, que não gasta o sorteio do elenco) e, no jogador real, pelos números da ESPN; no fim a média com o peso
  // da posição (`w`) dá o geral. `S.coAttrs(p)` devolve os 6: cria para quem não tem (save antigo) e reacerta quando o
  // geral mudou (evolução de fim de temporada, sem clube do mercado). Fase 1: nada do jogo lê os atributos ainda.
  const AT = S.CO_AT = {
    keys: { L: ['fin', 'pas', 'dri', 'def', 'vel', 'fis'], G: ['ref', 'col', 'sai', 'mao', 'pes', 'pen'] },
    names: { fin: 'Finalização', pas: 'Passe', dri: 'Drible', def: 'Defesa', vel: 'Velocidade', fis: 'Físico', ref: 'Reflexo', col: 'Colocação', sai: 'Saída do gol', mao: 'Mãos', pes: 'Pés', pen: 'Pênalti' },
    short: { fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', vel: 'VEL', fis: 'FIS', ref: 'REF', col: 'COL', sai: 'SAI', mao: 'MÃO', pes: 'PÉS', pen: 'PEN' },
    // Quanto cada atributo fica acima ou abaixo do geral, pela posição
    prof: { ZAG: [-24, -6, -12, 6, -3, 5], LAT: [-16, -1, -3, 1, 6, 1], MEI: [-6, 6, 3, -8, -1, -3], ATA: [6, -6, 3, -30, 4, 0], GOL: [2, 1, -2, 0, -8, -3] },
    // Peso de cada atributo no geral (soma 100)
    w: { ZAG: [0, 15, 0, 45, 15, 25], LAT: [5, 20, 10, 25, 25, 15], MEI: [10, 35, 20, 15, 10, 10], ATA: [35, 15, 20, 0, 20, 10], GOL: [30, 25, 15, 15, 10, 5] },
    dev: 3.2, jeito: 5, min: 20, max: 99,
    gol: [0.5, 0.3, 0.2],   // goleiro no campinho: peso de reflexo, colocação e mãos na defesa do chute (S.coAtSim)
    // Fase 3 (conta resumida, escalação do auxiliar, batedores): o que pesa em cada parte do jogo (fin pas dri def vel fis)
    sec: { fin: [0.55, 0.05, 0.2, 0, 0.1, 0.1], cri: [0.05, 0.6, 0.25, 0, 0.05, 0.05], ala: [0.1, 0.25, 0.3, 0, 0.35, 0], mar: [0, 0.05, 0, 0.6, 0.15, 0.2] },
    // kS: quanto do desvio do setor vira ponto de geral ali (0 desliga a fase 3); kG: o goleiro vale em dobro (ele é um só
    // e entra pela metade na defesa da área); kV: velocidade no contra-ataque (dos seus
    // atacantes contra a zaga deles); kF: físico na pressão; penK/penOff: pênalti, finalização do batedor contra o pênalti do goleiro
    kS: env('CO_ATK', 1), kG: 2, kV: env('CO_ATV', 4), kF: env('CO_ATF', 4), penK: 40, penOff: 4, penMax: 0.2,
    // Jogador real (ESPN): o esperado por jogo na posição (g gols, a assistências, fs faltas sofridas: a mediana real de quem
    // tem 8+ jogos, medida em 2026-11-10 nos 40 clubes) e quantos pontos vale cada
    // unidade por jogo acima disso (kG, kA, kF); conv gols por chute (kC pontos); altura em polegadas (kH por polegada); goleiro: sv
    // defesas por chute no gol (kS pontos)
    real: { minJ: 8, g: { ATA: 0.17, MEI: 0.05, LAT: 0.03, ZAG: 0.03 }, a: { ATA: 0.08, MEI: 0.04, LAT: 0.04, ZAG: 0.01 }, kG: 40, kA: 55, conv: 0.11, kC: 2, fs: { ATA: 1.3, MEI: 1, LAT: 0.7, ZAG: 0.55 }, kF: 3, h: 71, kH: 0.8, hG: 75, sv: 0.7, kS: 5 },
  };
  const atMean = (pos, v) => { const w = AT.w[pos] || AT.w.MEI; let t = 0; for (let i = 0; i < 6; i++) t += v[i] * w[i]; return t / 100; };
  // Leva a média com peso até o geral (todos sobem ou descem juntos) e arredonda; o acerto fino vai no atributo de maior peso
  function atFit(pos, v, ovr) {
    const w = AT.w[pos] || AT.w.MEI;
    for (let k = 0; k < 4; k++) { const d = ovr - atMean(pos, v); if (Math.abs(d) < 0.05) break; v = v.map(x => clamp(x + d, AT.min, AT.max)); }
    v = v.map(x => clamp(Math.round(x), AT.min, AT.max));
    const ord = w.map((x, i) => i).sort((a, b) => w[b] - w[a]);
    for (let k = 0; k < 40 && Math.round(atMean(pos, v)) !== ovr; k++) {
      const up = atMean(pos, v) < ovr, i = ord.find(j => w[j] > 0 && (up ? v[j] < AT.max : v[j] > AT.min));
      if (i === undefined) break; v[i] += up ? 1 : -1;
    }
    return v;
  }
  // real = { x: linha do elenco real (… jogos de titular, entradas, gols, assistências, chutes, faltas sofridas, altura em
  // polegadas, peso, defesas, gols sofridos), k: peso de 0 a 1 (some com as temporadas do jogo) }
  function mkAttrs(p, seed, real) {
    const pos = AT.prof[p.pos] ? p.pos : 'MEI', r = S.rng(hash(seed + '|at')), pr = AT.prof[pos];
    const v = pr.map(d => p.ovr + d + r.gauss() * AT.dev);
    // O jeito do jogador: um atributo puxado para cima e outro para baixo
    const up = r.int(0, 5), dn = (up + r.int(1, 5)) % 6; v[up] += AT.jeito; v[dn] -= AT.jeito;
    if (pos === 'GOL') { if (p.age >= 34) v[2] -= (p.age - 33) * 1.5; if (p.age <= 22) v[1] -= 2; }
    else { if (p.age >= 31) v[4] -= (p.age - 30) * 2; if (p.age >= 33) v[5] -= (p.age - 32); if (p.age <= 20) { v[5] -= 3; v[4] += 2; } }
    const x = real && real.x, R = AT.real, k = (real && real.k) || 0;
    if (x && x.length > 7 && k > 0) {
      const j = x[5] + 0.5 * x[6], pull = (val, exp, per, lo, hi) => clamp((val - exp) * per, lo, hi) * k; // pontos por gol (ou passe) a mais por jogo que o esperado na posição
      if (pos === 'GOL') {
        if (x[13] + x[14] >= 20) v[0] += clamp((x[13] / (x[13] + x[14]) - R.sv) * 40, -1, 1) * R.kS * k;
        if (x[11] > 0) v[2] += clamp((x[11] - R.hG) * R.kH, -3, 3) * k;
      } else {
        if (j >= R.minJ) {
          // Finalização e Passe de quem tem jogos de verdade saem do número real, não do sorteio
          v[0] = p.ovr + pr[0] + (v[0] - p.ovr - pr[0]) * (1 - k);
          v[1] = p.ovr + pr[1] + (v[1] - p.ovr - pr[1]) * (1 - k);
          v[0] += pull(x[7] / j, R.g[pos], R.kG, -6, 13);
          v[1] += pull(x[8] / j, R.a[pos], R.kA, -5, 11);
          v[2] += pull(x[10] / j, R.fs[pos], R.kF, -3, 4);
          if (x[9] >= 15) v[0] += clamp((x[7] / x[9] - R.conv) / R.conv, -1, 1) * R.kC * k;
        }
        if (x[11] > 0) v[5] += clamp((x[11] - R.h) * R.kH, -4, 5) * k;
      }
    }
    return atFit(pos, v, p.ovr);
  }
  // Atributos do jogador para o campinho ao vivo (ui/livesim.js lê por qa(p, k), 0 a 99; chave que faltar cai no geral).
  // `d` = o desconto do cansaço que o geral também leva na escalação. Goleiro: `gol` (defender o chute) junta reflexo,
  // colocação e mãos; `pas` são os pés. Linha: as 6 chaves de S.CO_AT.keys.L.
  S.coAtSim = function (p, d) {
    const a = S.coAttrs(p), f = v => Math.max(0, Math.min(99, Math.round((v + (d || 0)) * 10) / 10));
    if (p.pos === 'GOL') return { gol: f(a[0] * AT.gol[0] + a[1] * AT.gol[1] + a[3] * AT.gol[2]), pas: f(a[4]) };
    const o = {}; AT.keys.L.forEach((k, i) => { o[k] = f(a[i]); }); return o;
  };
  S.coAtKeys = p => AT.keys[p.pos === 'GOL' ? 'G' : 'L'];
  S.coAtMean = p => atMean(AT.w[p.pos] ? p.pos : 'MEI', S.coAttrs(p));
  S.coAttrs = function (p) {
    const pos = AT.w[p.pos] ? p.pos : 'MEI';
    if (!Array.isArray(p.at) || p.at.length !== 6 || p.at.some(v => typeof v !== 'number' || v !== v)) p.at = mkAttrs(p, p.id + '|' + p.n + '|' + p.pos, null);
    else if (Math.round(atMean(pos, p.at)) !== p.ovr) { const d = p.ovr - atMean(pos, p.at); p.at = atFit(pos, p.at.map(v => v + d), p.ovr); }
    return p.at;
  };
  // Fase 4: o treino da semana desenvolve um atributo (`dv` do treino; goleiro `dvG`) de quem é da posição do treino
  // (`who`). Cada jogador guarda um progresso escondido `p.tp`: o treino soma `rate` × idade × espaço até o potencial, e
  // quando passa de 1 o atributo treinado ganha 1 ponto. O geral segue sendo a média pelo peso da posição: quando ela
  // arredonda para cima o geral sobe 1 (nunca passa do potencial) e o jogador entra em `co.train.up` (o aviso da Semana).
  // `co.train.dv` = [id, atributo] de todo ponto ganho no treino da semana (some no fim do jogo, com o `co.train`).
  // Sem sorteio: não gasta a semente da carreira. Machucado não treina. `CO_TRK=0` desliga.
  const GROW = S.CO_GROW = { rate: env('CO_TRK', 0.4), ages: [[21, 1], [24, 0.75], [27, 0.5], [30, 0.25]], room: 5,
    up: 3, dnL: [0.6, 0.4, 0.8, 0.8, 2, 1.4], dnG: [1.6, 0.5, 1.6, 0.8, 0.6, 0.9] };
  const growK = S.coGrowK = p => { const a = GROW.ages.find(x => p.age <= x[0]); return a ? a[1] * clamp((p.pot - p.ovr) / GROW.room, 0, 1) : 0; };
  S.coTrainAt = (k, pos) => { const t = TRAIN[k]; if (!t || t.dv === undefined || !t.who.includes(pos)) return -1; const i = pos === 'GOL' ? t.dvG : t.dv; return i === undefined ? -1 : i; };
  // Quanto o geral mudou desde o fim da temporada passada: a virada (`p.sd`) mais o que o treino somou neste ano (`p.ug` = [temporada, pontos]).
  S.coOvrDelta = (co, p) => (p.sd || 0) + (p.ug && co && p.ug[0] === co.season ? p.ug[1] : 0);
  function trainGrow(co, t) {
    if (!GROW.rate || t.dv === undefined) return;
    const dv = [], up = [];
    co.squad.forEach(p => {
      if (!t.who.includes(p.pos) || p.out > 0) return;
      const i = p.pos === 'GOL' ? t.dvG : t.dv; if (i === undefined) return;
      const g = growK(p) * GROW.rate; if (!(g > 0)) return;
      p.tp = Math.round(((p.tp || 0) + g) * 1000) / 1000; if (p.tp < 1) return;
      p.tp = Math.round((p.tp - 1) * 1000) / 1000;
      const a = S.coAttrs(p); if (a[i] >= AT.max) return;
      a[i] += 1; dv.push([p.id, i]);
      const o = Math.round(atMean(AT.w[p.pos] ? p.pos : 'MEI', a));
      if (o > p.ovr) { const o0 = p.ovr; p.ovr = Math.min(o, 95); up.push(p.id); if (p.ovr > o0) p.ug = [co.season, (p.ug && p.ug[0] === co.season ? p.ug[1] : 0) + p.ovr - o0]; }
    });
    if (dv.length) co.train.dv = dv; if (up.length) co.train.up = up;
  }
  // Virada de temporada: o geral muda `d` pontos e os atributos não andam todos juntos. Quem cresce sobe mais nos
  // atributos de mais peso da posição; quem cai perde velocidade e físico antes (goleiro: reflexo e saída do gol).
  function seasonAttrs(p, d) {
    if (!d) return; const pos = AT.w[p.pos] ? p.pos : 'MEI', w = AT.w[pos], a = S.coAttrs(p);
    const f = d > 0 ? w.map(x => 0.5 + GROW.up * x / 100) : (p.pos === 'GOL' ? GROW.dnG : GROW.dnL);
    p.ovr += d; p.at = atFit(pos, a.map((v, i) => v + d * f[i]), p.ovr);
  }
  // Fase 3: o atributo por setor. `atDev` = quanto o jogador está acima ou abaixo do normal da posição dele em cada
  // atributo (o normal é o perfil da posição com a média pelo peso zerada, então um jogador sem jeito nenhum dá zero em
  // tudo). `secDev(p, setor)` soma isso pelos pesos do setor (AT.sec; 'gol' = goleiro) e devolve em pontos de geral: o
  // finalizador vale mais na área, o passador na posse, o veloz pelos lados, quem marca bem na defesa. Na média dos
  // jogadores dá zero: o geral segue mandando e os atributos só separam jogadores e times de mesmo geral.
  const profN = {}; Object.keys(AT.prof).forEach(pos => { const m = atMean(pos, AT.prof[pos]); profN[pos] = AT.prof[pos].map(v => v - m); });
  const atDev = p => { const a = S.coAttrs(p), n = profN[AT.w[p.pos] ? p.pos : 'MEI'], o = p.ovr; return [a[0] - o - n[0], a[1] - o - n[1], a[2] - o - n[2], a[3] - o - n[3], a[4] - o - n[4], a[5] - o - n[5]]; };
  const secDev = (p, k) => {
    if (!AT.kS || !p) return 0;
    const g = p.pos === 'GOL'; if (g !== (k === 'gol')) return 0;
    const d = atDev(p); if (g) return AT.kS * AT.kG * (d[0] * AT.gol[0] + d[1] * AT.gol[1] + d[3] * AT.gol[2]);
    const w = AT.sec[k]; return AT.kS * (d[0] * w[0] + d[1] * w[1] + d[2] * w[2] + d[3] * w[3] + d[4] * w[4] + d[5] * w[5]);
  };
  // O setor principal de uma vaga (para escalar e trocar): zaga e lateral marcam, meia pelo meio cria, quem joga aberto
  // do meio para a frente vai pelo lado, atacante pelo meio finaliza
  const slotSec = sl => (sl.pos === 'GOL' ? 'gol' : sl.ln === 'd' ? 'mar' : sl.w ? 'ala' : sl.ln === 'a' ? 'fin' : 'cri');
  const secK = (p, k) => 1 + secDev(p, k) / Math.max(30, p.ovr);
  // Atributos de um jogador "sem jeito" (o normal da posição): para as contas de tática pura (caderno, craque_taticas.js)
  S.coAtNeutral = (pos, ovr) => profN[AT.w[pos] ? pos : 'MEI'].map(v => ovr + v);
  S.coAtDev = atDev; S.coSecDev = secDev; S.coSlotSec = (form, i) => slotSec(FORMS[form].slots[i]);
  // Quanto o jogador rende numa vaga da formação (geral, encaixe na posição e o atributo do setor): a conta do auxiliar
  S.coSlotVal = (p, form, i) => { const sl = FORMS[form].slots[i]; return p.ovr * fit(p.pos, sl.pos) * secK(p, slotSec(sl)); };
  // Elenco de um clube na temporada: os mais fortes perto da força do clube, o banco abaixo, os garotos mais abaixo
  // Elencos reais (tools/craque_api_elencos.py gera src/real-squads.js): nome, idade, posição e número de verdade;
  // a força segue a conta do sorteado (força do clube, ordem na posição, idade). Quem passa de 37 anos ou falta numa
  // posição vira garoto sorteado (e quem já está no seu elenco, co, sai do clube de origem). id 'r:' + id da fonte: o mesmo jogador tem o mesmo id em todo save e temporada.
  const REAL = () => root.CRAQUE_REAL || (typeof require !== 'undefined' ? (() => { try { return require('../real-squads.js'); } catch (e) { return null; } })() : null);
  // Os clubes de fora do Brasil ganharam elenco real em 2026-11-11 (antes só Série A e B). Numa carreira que já existia,
  // o clube de fora troca o elenco sorteado pelo real só na temporada seguinte (co.rf, posto ao abrir o save em
  // ui/coach.js): no meio da temporada sumiria quem você observa ou negocia. Carreira nova: co.rf = 0, real desde o começo
  S.coRealOf = (clubId, co, season) => {
    const R = REAL(), x = (R && R.clubs && R.clubs[clubId]) || null;
    if (x && co && co.rf !== undefined && (season === undefined ? co.season : season) < co.rf && !/^bra-/.test(clubId)) return null;
    return x;
  };
  function realSquad(club, season, rows, co) {
    const mine = new Set(((co && co.squad) || []).map(p => p.api).filter(Boolean));
    const r = S.rng(hash(club.id + '|' + season + '|real')), cty = D.countryOf(club), s = club.strength, out = [];
    const lv = co && co.lv !== undefined ? co.lv : 0;
    Object.keys(CO.squad).forEach(pos => {
      const n = CO.squad[pos];
      // Quem joga: quem mais começou jogando na temporada real (ESPN; o peso some em 4 temporadas do jogo), número de
      // titular (1 a 23), idade boa (23 a 31); garotos de número alto por último
      const L = rows.filter(x => x[3] === pos).map(x => ({ x, age: x[2] + season }))
        .filter(o => o.age <= 37 && !mine.has(o.x[0]))
        .map(o => ({ ...o, sc: (o.x.length > 5 ? Math.min(40, o.x[5] + 0.4 * o.x[6]) * Math.max(0, 1 - season * 0.25) : 0) + (o.x[4] >= 1 && o.x[4] <= 11 ? 12 : o.x[4] >= 1 && o.x[4] <= 23 ? 8 : o.x[4] >= 1 && o.x[4] <= 40 ? 4 : 0) + (o.age >= 23 && o.age <= 31 ? 4 : o.age >= 20 && o.age <= 33 ? 2 : 0) + (hash(o.x[0] + '|' + season) % 100) / 100 }))
        .sort((a, b) => b.sc - a.sc).slice(0, n);
      for (let k = 0; k < n; k++) {
        // Nível firme (2026-11-11): o sorteio do jogador real é sempre o mesmo (o da temporada 0), então o geral não pula
        // de um ano para o outro; só muda pela ordem no elenco, pela idade e pela força do clube. Save antigo: vale a
        // partir de co.lv (posto ao abrir o save, como o co.rf), para o rival não mudar no meio da temporada
        const o = L[k], j = S.rng(hash((o ? o.x[0] + '|' + (season >= lv ? 0 : season) : club.id + pos + k + '|' + season) + '|f'));
        const age = o ? o.age : r.int(17, 20), young = !o || age <= 20;
        const ovr = s + 2.5 - 8 * (k / Math.max(1, n - 1)) + j.gauss() * 2.5 - (young ? 6 : 0) - (age >= 33 ? 2 : 0);
        const p = mkPlayer(j, club, pos, ovr, age, o ? 'r:' + o.x[0] : club.id + ':' + season + ':' + out.length, cty, o ? { x: o.x, k: Math.max(0, 1 - season * 0.25) } : null);
        if (o) { p.n = o.x[1]; p.api = o.x[0]; if (o.x[4] >= 1 && o.x[4] <= 99) p.num = o.x[4]; }
        out.push(p);
      }
    });
    return out;
  }
  // Mercado vivo (2026-11-10, engine/coachworld.js): por cima do elenco sorteado entram os negócios guardados no save
  // (co.wm): quem saiu do clube some dele, quem chegou entra, e o clube segue com 25
  function genSquad(clubId, season, co) {
    const sq = genBase(clubId, season, co);
    return co && co.wm && S.coWorldSquad ? S.coWorldSquad(co, clubId, season, sq) : sq;
  }
  function genBase(clubId, season, co) {
    const club = D.CLUB_BY_ID[clubId], real = S.coRealOf(clubId, co, season);
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
  S._coMkPlayer = mkPlayer;

  // ---------- escalação ----------
  const ok = p => p && !p.out && !p.sus;
  // O auxiliar monta o time: para cada vaga, o melhor que sobra pela força na vaga (energia conta)
  // `pure`: da posição primeiro, depois o geral na vaga (botão "Melhores" da escalação), sem energia nem atributo por setor
  function autoXI(squad, form, pure) {
    const used = new Set(), slots = slotsOf(form), SL = FORMS[form].slots, xi = [];
    // pure = 'rest' (Silvio 2026-11-11: "seria bom ter os mais descansados, pra poupar em jogo menor eu tenho que tirar um a um"):
    // cada vaga pega primeiro quem é da posição e, entre eles, o de mais energia (de 5 em 5 pontos); no empate, o maior geral
    const val = pure === 'rest' ? (p, sl) => (p.pos === sl ? 1000 : 0) + Math.round((p.en === undefined ? 100 : p.en) / 5) * 5 + p.ovr * fit(p.pos, sl) / 100 :
      pure ? (p, sl) => (p.pos === sl ? 100 : 0) + p.ovr * fit(p.pos, sl) : (p, sl, i) => p.ovr * fit(p.pos, sl) * secK(p, slotSec(SL[i])) * (0.75 + 0.25 * (p.en === undefined ? 100 : p.en) / 100);
    // Primeiro as vagas da própria posição (mais escassas antes: goleiro, laterais, zagueiros)
    const order = slots.map((sl, i) => i).sort((a, b) => ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[a]) - ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[b]));
    order.forEach(i => {
      const best = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => val(b, slots[i], i) - val(a, slots[i], i))[0];
      if (best) { used.add(best.id); xi[i] = best.id; }
    });
    const bench = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id);
    return { xi, bench };
  }
  S.coAutoXI = autoXI;
  // ---------- força do time e confronto ----------
  const byId = squad => { const m = {}; squad.forEach(p => { m[p.id] = p; }); return m; };
  const last = n => String(n || "").split(" ").filter(Boolean).pop() || "";
  const eff = (p, sl) => p.ovr * fit(p.pos, sl) * (0.8 + 0.2 * (p.en === undefined ? 100 : p.en) / 100) * (p.out ? 0.5 : 1) * (1 + ((p.mo === undefined ? 60 : p.mo) - 60) / CO.moK);
  // Forma de um lado em campo: quanto tem em cada parte (cada jogador vale ~1 = 70 de força na vaga)
  // `noAt`: sem o atributo por setor (só o geral). O ao vivo da simulação livre pede assim: lá o campinho já lê os
  // atributos em cada lance (fase 2), e contar de novo na força do ataque seria contar duas vezes
  function shape(s, noAt) {
    const m = byId(s.squad), F = FORMS[s.form], o = { q: 0, n: 0, ncb: 0, ncf: 0, wb: 0, cb: 0, fb: 0, cm: 0, wm: 0, cf: 0, wf: 0, en: 0, at: 0, nat: 0, df: 0, ndf: 0,
      cmd: 0, wmd: 0, wbd: 0, vel: 0, nvel: 0, dvel: 0, ndvel: 0, fis: 0, nfis: 0 };
    s.xi.forEach((id, i) => {
      const p = id && m[id], sl = F.slots[i]; if (!p || !sl) return;
      const e0 = eff(p, sl.pos) / 70, tl = s.roles ? (s.roles[i] || 0) : 0;
      // A função da vaga puxa o jogador para o ataque (ea) ou para a defesa (ed)
      const e = e0, ea = e0 * (1 + 0.08 * tl), ed = e0 * (1 - 0.08 * tl);
      // Fase 3: em cada parte do jogo o jogador vale o geral mais o atributo daquele setor (finalizar, criar, ir pelo
      // lado, marcar; o goleiro pela defesa do chute). `o.q` (a força geral) segue só pelo geral
      const d = AT.kS && !noAt ? atDev(p) : null, gk = p.pos === 'GOL', ov = Math.max(30, p.ovr), SC = AT.sec;
      const sk = w => (d && !gk ? 1 + AT.kS * (d[0] * w[0] + d[1] * w[1] + d[2] * w[2] + d[3] * w[3] + d[4] * w[4] + d[5] * w[5]) / ov : 1);
      const kf = sk(SC.fin), kc = sk(SC.cri), ka = sk(SC.ala), km = sl.ln === 'g' ? (d && gk ? 1 + AT.kS * AT.kG * (d[0] * AT.gol[0] + d[1] * AT.gol[1] + d[3] * AT.gol[2]) / ov : 1) : sk(SC.mar);
      o.q += e; o.n++; o.en += (p.en === undefined ? 100 : p.en);
      // Quem finaliza (ataque e meia de ligação) e quem defende a área (zaga, laterais pela metade e goleiro)
      if (sl.ln === 'a' || sl.ln === 'am') { const k = sl.ln === 'a' ? 1 : 0.5; o.at += ea * kf * k; o.nat += k; }
      if (sl.ln === 'd' || sl.ln === 'g') { const k = sl.ln === 'g' ? 0.5 : sl.w ? 0.5 : 1; o.df += ed * km * k; o.ndf += k; }
      if (sl.ln === 'd') { if (sl.w) { o.fb += ed * km; o.push = (o.push || 0) + 0.25 * tl * e0 * ka; } else { o.cb += ed * km; o.ncb++; } }
      else if (sl.ln === 'm') { if (sl.w && sl.pos === 'LAT') { o.wb += ea * ka; o.wbd += ea * km; } else if (sl.w) { o.wm += ea * ka; o.wmd += ea * km; } else { o.cm += e * kc; o.cmd += e * km; } }
      else if (sl.ln === 'am') { if (sl.w) { o.wm += ea * ka; o.wmd += ea * km; } else { o.cm += 0.5 * e * kc; o.cmd += 0.5 * e * km; o.cf += 0.5 * ea * kf; o.ncf += 0.5; } }
      else if (sl.ln === 'a') { if (sl.w) o.wf += ea * ka; else { o.cf += ea * kf; o.ncf++; } }
      // Para os estilos: velocidade de quem ataca e de quem defende (contra-ataque) e físico do time (pressão), em pontos
      // acima ou abaixo do normal
      if (d && !gk) {
        o.fis += d[5]; o.nfis++;
        if (sl.ln === 'a' || sl.ln === 'am' || (sl.ln === 'm' && sl.w)) { o.vel += d[4]; o.nvel++; }
        if (sl.ln === 'd') { o.dvel += d[4]; o.ndvel++; }
      }
    });
    o.at = o.nat ? o.at / o.nat * 70 : o.q / 11 * 70; o.df = o.ndf ? o.df / o.ndf * 70 : o.q / 11 * 70;
    o.q = o.q / 11 * 70; o.en = o.n ? o.en / o.n / 100 : 1; o.bonus = s.bonus || 0;
    o.vel = o.nvel ? o.vel / o.nvel : 0; o.dvel = o.ndvel ? o.dvel / o.ndvel : 0; o.fis = o.nfis ? o.fis / o.nfis : 0;
    return o;
  }
  // O que X cria contra Y (sem contar a força geral): posse, lados, área, pressão e contra-ataque
  function edge(X, Y, sx, sy, pX) {
    // Lados: quem ataca aberto (o lateral só sobe se não tiver ponta do outro lado prendendo) contra quem marca o lado
    const push = X.fb * sx.wide * 0.6 * (1 - 0.7 * Math.min(1, Y.wf / 2));
    const fa = X.wm + X.wf + 0.6 * X.wb + push + (X.push || 0), fd = Y.fb + 0.9 * Y.wbd + 0.5 * Y.wmd + 0.25 * Y.wf + 0.35 * Math.max(0, Y.ncb - 2), fdl = fd * (0.75 + 0.25 * sy.line);
    // Área: atacantes do meio contra zagueiros; zagueiro a mais que os atacantes + 1 não marca ninguém (sobra)
    const cbUse = Y.ncb ? Y.cb * Math.min(1, (X.ncf + 1) / Y.ncb) : 0;
    const ca = X.cf + 0.35 * X.cm, cd = 0.85 * (cbUse + 0.35 * Y.cmd);
    const flank = Math.log((fa + 0.4) / (fdl + 0.4)), central = Math.log((ca + 0.4) / (cd + 0.4));
    // O time ataca por onde tem gente (e o estilo puxa): a fraqueza do outro lado só conta se você ataca por ali
    const wsh = clamp(fa / (fa + ca || 1) + (sx.wide - 0.5) * 0.5, 0.1, 0.9);
    // Os estilos pedem atributos (fase 3): a pressão rende mais com um time físico; o contra-ataque, com atacantes mais
    // velozes que a zaga deles
    const press = sx.press * (1 - pX) * X.en * sy.build * clamp(1 + AT.kF * X.fis / 70, 0.7, 1.3);
    const counter = sx.counter * sy.line * (1 - pX) * (X.wf + X.cf) / 2 * clamp(1 + AT.kV * (X.vel - Y.dvel) / 70, 0.6, 1.4);
    return { flank, central, wsh, press, counter, poss: pX, T: 1.3 * (wsh * flank * (1 + (sx.wide - 0.5) * 0.8) + (1 - wsh) * central) + 1.0 * press + 1.6 * counter + 2 * (pX - 0.5) };
  }
  // Gols esperados de cada lado no jogo inteiro (H em casa). Volta também o porquê, para a tela do confronto
  function matchup(H, A, neutral, noAt) {
    const h = shape(H, noAt), a = shape(A, noAt), sh = styOf(H), sa = styOf(A);
    const ch = Math.pow((h.cm + 0.3 * h.wm) * sh.ctrl, 1.6), ca = Math.pow((a.cm + 0.3 * a.wm) * sa.ctrl, 1.6);
    const pH = clamp(ch / (ch + ca || 1), 0.28, 0.72);
    const eh = edge(h, a, sh, sa, pH), ea = edge(a, h, sa, sh, 1 - pH);
    // Duelo: o seu ataque contra a defesa deles, além da diferença geral dos times (atacante 70 contra zaga 50 sobra)
    const duel = (X, Y) => clamp((X.at - Y.df) - (X.q - Y.q), -25, 25) / CO.kD;
    eh.duel = duel(h, a); ea.duel = duel(a, h);
    const lh = (neutral ? (CO.lamH + CO.lamA) / 2 : CO.lamH) * Math.exp((h.q - a.q + h.bonus + (neutral ? 0 : CO.home)) / CO.k + CO.kT * eh.T + eh.duel) * sh.att * Math.pow(sa.def, 1 - sh.patience) * FORMS[H.form].att * FORMS[A.form].def;
    const la = (neutral ? (CO.lamH + CO.lamA) / 2 : CO.lamA) * Math.exp((a.q - h.q + a.bonus) / CO.k + CO.kT * ea.T + ea.duel) * sa.att * Math.pow(sh.def, 1 - sa.patience) * FORMS[A.form].att * FORMS[H.form].def;
    // Dia bom ou ruim (2026-11-13): cada time sorteia no começo do jogo um fator em volta de 1 (S.coMatchStart); a prévia não sabe
    return { lh: lh * (H.day || 1) * (1 + (H.prep || 0)) * (1 - (A.prep || 0)), la: la * (A.day || 1) * (1 + (A.prep || 0)) * (1 - (H.prep || 0)), h: eh, a: ea, sh: h, sa: a };
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
      seed: (o.seed || (Math.random() * 4294967295)) >>> 0, rf: 0, lv: 0, leagueOf: {}, clubBoost: {}, hist: [], titles: [], pid: 0, form: '4-4-2', style: 'equilibrado' };
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
    co.squad = genSquad(clubId, co.season, { wm: co.wm, season: co.season, rf: co.rf, lv: co.lv, squad: [] }).map(p => Object.assign(p, { id: 'p' + (co.pid++) }));
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
    if (S.coWorldSync) S.coWorldSync(co);
    return ss;
  };
  const order = tab => tab.map((t, i) => i).sort((a, b) => tab[b].p - tab[a].p || (tab[b].gp - tab[b].gc) - (tab[a].gp - tab[a].gc) || tab[b].gp - tab[a].gp);
  S.coTable = co => order(co.ss.tab).map(i => Object.assign({ id: co.ss.ids[i], me: co.ss.ids[i] === co.club }, co.ss.tab[i]));
  S.coPos = co => order(co.ss.tab).findIndex(i => co.ss.ids[i] === co.club) + 1;
  // Taça (Silvio 2026-11-10): o título já é seu? (ninguém alcança mais; ou a liga acabou com você em 1º)
  S.coTitleWon = co => {
    const ss = co.ss; if (!ss || co.sacked) return false;
    const t = S.coTable(co), me = t.find(x => x.me), left = 3 * (ss.rounds.length - ss.i);
    if (ss.done) return t[0].me;
    return t.every(x => x.me || me.p > x.p + left);
  };
  // O título pode sair NESTA rodada? (antes do jogo) Devolve null ou { need: 'vença' | 'vença e torça', rivals }
  S.coTitleChance = co => {
    const ss = co.ss; if (!ss || ss.done || co.sacked || S.coTitleWon(co)) return null;
    const last = ss.i === ss.rounds.length - 1, after = 3 * (ss.rounds.length - ss.i - 1);
    const t = S.coTable(co), me = t.find(x => x.me), mx = me.p + 3;
    // quem ainda alcança se você vencer: precisa tropeçar (no fim, empate em pontos ainda pode ser seu no saldo)
    const alive = t.filter(x => !x.me && !(last ? mx >= x.p + 3 : mx > x.p + 3 + after));
    if (alive.some(x => last ? mx < x.p : mx <= x.p + after)) return null;
    return { need: alive.length ? 'vença e torça' : 'vença', rivals: alive.map(x => x.id), last };
  };
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
  // Repertório (2026-11-13, "é uma tática só"): além da formação e dos dois estilos de sempre, cada escola tem uma
  // formação reserva e um terceiro estilo, que o técnico usa quando estuda você ou quando precisa mudar no jogo
  function school(clubId) {
    const h = hash('escola|' + clubId), h2 = hash('escola2|' + clubId), form = SCHOOL_F[h % SCHOOL_F.length], styles = SCHOOL_S[(h >>> 8) % SCHOOL_S.length];
    const fo = Object.keys(FSPEC).filter(f => f !== form), so = Object.keys(STY).filter(x => !styles.includes(x));
    return { form, styles, alt: fo[h2 % fo.length], extra: so[(h2 >>> 8) % so.length] };
  }
  S.coSchool = school;
  // O técnico rival estuda você: se você repetiu a formação ou o estilo em 3 dos últimos 4 jogos, ele prepara a resposta
  // (dentro do repertório dele). Clube maior estuda mais. O olheiro mostra o plano, então dá para se adaptar
  const TH_N = 4, TH_REP = 3;
  const strOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].strength : 60);
  function repOf(co) {
    const H = (co && co.tHist || []).slice(-TH_N); if (H.length < TH_REP) return null;
    const top = k => { const c = {}; H.forEach(x => { c[x[k]] = (c[x[k]] || 0) + 1; }); const b = Object.keys(c).sort((a, b2) => c[b2] - c[a])[0]; return c[b] >= TH_REP ? b : null; };
    const f = top('f'), st = top('s'); if (!f && !st) return null;
    const L = H[H.length - 1]; return { f: f || L.f, s: st || L.s, both: !!(f && st) };
  }
  S.coRepOf = repOf;
  const repSets = (sc, d) => {
    const fs = [sc.form, sc.alt], ss = sc.styles.concat(sc.extra);
    if (d < -6) { fs.push('4-5-1', '5-3-2'); ss.push('retranca', 'contra'); }
    return { fs: fs.filter((f, i) => FORMS[f] && fs.indexOf(f) === i), ss: ss.filter((x, i) => STY[x] && ss.indexOf(x) === i) };
  };
  // A melhor resposta do rival (dentro do repertório) contra um plano seu
  function counterPlan(sc, d, sq, them, usSide, rivHome, neutral, allF) {
    const R = repSets(sc, d); let best = null;
    if (allF) R.fs = Object.keys(FORMS); // estudando a semana inteira, o técnico pode montar qualquer formação
    R.fs.forEach(f => { const xi = them && them.form === f ? them.xi : autoXI(sq, f).xi; R.ss.forEach(st => {
      const T = { squad: sq, form: f, style: st, xi, bonus: 0, red: them ? them.red : 0 }, mu = rivHome ? matchup(T, usSide, neutral) : matchup(usSide, T, neutral);
      const v = rivHome ? mu.lh / mu.la : mu.la / mu.lh; if (!best || v > best.v) best = { f, s: st, v }; }); });
    return best;
  }
  const planMemo = {};
  function plan(clubId, d, home, co, sq) {
    const sc = school(clubId);
    let style = d > 3 || (home && d > -2) ? sc.styles[0] : sc.styles[1];
    let form = sc.form;
    if (d < -6) { style = (hash('f|' + clubId) & 1) ? 'retranca' : 'contra'; if (form === '3-4-3' || form === '4-3-3') form = '4-5-1'; }
    // Na 1ª temporada da primeira carreira (co.first, tutorial) ninguém estuda você ainda
    const rp = co && sq && !(co.first && co.season === 0) ? repOf(co) : null;
    if (rp) {
      const k = [clubId, co.season, co.ss ? co.ss.i : 0, home ? 1 : 0, rp.f, rp.s, co.club].join('|');
      if (planMemo[k]) return Object.assign({}, planMemo[k]);
      const p = clamp(0.3 + 0.035 * (strOf(clubId) - 55) + (rp.both ? 0.1 : 0), 0.3, 0.9), roll = hash('estudo|' + k + '|' + co.name) / 4294967296;
      let out = { form, style };
      if (roll < p) {
        const us = { squad: co.squad, form: rp.f, style: rp.s, xi: autoXI(co.squad, rp.f).xi, bonus: co.xp ? co.xp.leitura * 0.2 : 0 };
        const b = counterPlan(sc, d, sq, null, us, home, false, true);
        if (b) out = { form: b.f, style: b.s, study: { f: rp.f, s: rp.s } };
      }
      const ks = Object.keys(planMemo); if (ks.length > 200) ks.slice(0, 100).forEach(x => delete planMemo[x]);
      planMemo[k] = out; return Object.assign({}, out);
    }
    return { form, style };
  }
  function oppSide(co, vs, home) {
    const sq = genSquad(vs, co.season, co); sq.forEach(p => { p.en = CO.enOpp; });
    const d = D.CLUB_BY_ID[vs].strength - D.CLUB_BY_ID[co.club].strength;
    const pl = plan(vs, d, home, co, sq), a = autoXI(sq, pl.form);
    // Estudou você: além da resposta tática, o time vem preparado para o seu jogo (CO.prep a mais para ele, a menos para você)
    return { club: vs, squad: sq, form: pl.form, style: pl.style, plan: pl, xi: a.xi, bench: a.bench, subs: CO.subs, win: CO.win, red: 0, prep: pl.study ? CO.prep : 0 };
  }
  // Prévia do próximo jogo: o rival como deve vir e o confronto contra o seu time de agora
  S.coPreview = function (co, form, style) {
    const nx = S.coNext(co); if (!nx || nx.bye) return null;
    const them = oppSide(co, nx.vs, !nx.home), xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))).length === 11 ? co.xi : autoXI(co.squad, form || co.form).xi;
    const us = { squad: co.squad, form: form || co.form, style: style || co.style, xi, bonus: co.xp.leitura * 0.2 };
    const r = nx.home ? matchup(us, them, !!nx.neutral) : matchup(them, us, !!nx.neutral);
    return { them, nx, xg: nx.home ? [r.lh, r.la] : [r.la, r.lh], us: nx.home ? r.h : r.a, op: nx.home ? r.a : r.h, ush: nx.home ? r.sh : r.sa, osh: nx.home ? r.sa : r.sh, poss: nx.home ? r.h.poss : r.a.poss };
  };
  S.coOpp = (co, vs) => oppSide(co, vs);

  // ---------- partida minuto a minuto ----------
  // m = { min, gh, ga, home, us: lado, them: lado, ev: [lances], stop, done, half }
  S.coMatchStart = function (co) {
    const nx = S.coNext(co);
    if (!nx || nx.bye) return null;
    co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))).length === 11 ? co.xi : autoXI(co.squad, co.form).xi;
    const us = { club: co.club, squad: co.squad, form: co.form, style: co.style, bonus: co.xp.leitura * 0.2, xi: co.xi.slice(), bench: (co.bench || []).filter(id => co.squad.some(p => p.id === id && ok(p))), subs: CO.subs, win: CO.win, red: 0, mine: true, injK: S.coDmK ? S.coDmK(co, 'inj') : 1, outCut: S.coDmK ? S.coDmK(co, 'cut') : 0,
      roles: co.roles && co.roles[co.form] ? co.roles[co.form].slice() : null, takers: co.takers || null, train: co.train && co.ss && co.train.i === co.ss.i ? co.train.k : null };
    const them = oppSide(co, nx.vs, !nx.home);
    // Dia de cada time: média 1, desvio ~DAY_SD (o mesmo jogo recomeçado sorteia igual)
    { const rd = S.rng(hash(String(co.name) + '|' + co.club + '|' + co.season + '|' + nx.round + '|' + nx.vs + '|' + (nx.cup ? 'c' : 'l') + '|dia')), z = () => Math.sqrt(-2 * Math.log(1 - rd())) * Math.cos(2 * Math.PI * rd());
      us.day = Math.exp(CO.daySd * z() - CO.daySd * CO.daySd / 2); them.day = Math.exp(CO.daySd * z() - CO.daySd * CO.daySd / 2); }
    // O que você jogou (o rival dos próximos jogos estuda: S.coRepOf). Uma linha por jogo, as últimas 6
    { const hk = co.season + '|' + nx.round + '|' + (nx.cup ? 'c' : 'l'); co.tHist = (co.tHist || []).filter(x => x.k !== hk); co.tHist.push({ k: hk, f: us.form, s: us.style }); if (co.tHist.length > 6) co.tHist = co.tHist.slice(-6); }
    if (!us.bench.length) us.bench = autoXI(co.squad, co.form).bench;
    // O plano do auxiliar (S.coTip com o olheiro lido): se o time entra nele, o ao vivo e o resultado contam se funcionou
    const tp = co.tip && co.tip.kind === 'plan' && co.tip.k === co.season + '|' + nx.round + '|p' ? co.tip : null;
    const plan = tp ? { f: tp.f, s: tp.s, good: tp.good, why: tp.why, used: S.coTipUsed(co, tp) ? 1 : 0 } : null;
    // O olheiro (2026-11-13): só com o relatório deste jogo lido (co.scout.k; save antigo pela rodada)
    const rd = co.scout && (co.scout.k ? co.scout.k === S.coScoutKey(co, nx) : co.scout.i === co.ss.i && !nx.cup), so = rd ? S.coScout(co, them, nx) : null;
    const scout = so && so.list.length ? { list: so.list, miss: so.miss, mn: {}, w: {}, said: {} } : null;
    return { min: 0, gh: 0, ga: 0, home: nx.home, us, them, ev: [], scout, stop: null, done: false, half: false, classic: (D.RIVALS[co.club] || []).includes(nx.vs), vs: nx.vs, round: nx.round, played: {}, startXI: us.xi.slice(), plan, cup: nx.cup || null, neutral: !!nx.neutral };
  };
  // Como está o plano agora: 'ok' (seguiu e encaixa), 'no' (seguiu e não encaixa), 'off' (não seguiu ou mudou), null (sem plano)
  S.coPlanNow = m => { const p = m && m.plan; if (!p) return null; if (!p.used || m.us.form !== p.f || m.us.style !== p.s) return 'off'; return p.good ? 'ok' : 'no'; };
  S.CO_PLAN_WHY = { meio: 'Eles não acham espaço no meio', lados: 'Estamos sobrando pelos lados', area: 'Nossos atacantes ganham na área', pressao: 'A pressão está roubando bolas lá na frente', contra: 'O contra-ataque está encaixando' };
  const sideName = (m, s) => (s === m.us ? 'us' : 'them');
  // Avança até a próxima parada (gol, vermelho, lesão, intervalo) ou o fim; com `until`, para também naquele minuto
  // (a tela ao vivo anda minuto a minuto, para a pessoa poder parar quando quiser). Volta a parada
  // Simulação livre (teste, opt.free: só a tela ao vivo com o campinho liga): o motor não sorteia gol nem chance neste
  // minuto, só diz a força do ataque de cada lado (`m.lam`, gols esperados em 90 min pelo confronto, energia, gritos e
  // expulsões); o campinho joga, sorteia cada chute na hora e conta de volta em `S.coMatchShot`. O pênalti continua
  // saindo daqui (o campinho não marca falta sozinho), na mesma proporção de antes. Sem opt, tudo como sempre
  S.coMatchStep = function (co, m, until, opt) {
    if (m.done) return null;
    const free = !!(opt && opt.free), brain = free && !!opt.brain; // brain: o cérebro 11x11 tem juiz próprio (S.coMatchRef); aqui não sai falta, cartão, impedimento nem pênalti
    if (m.refStop) { const st0 = m.refStop; delete m.refStop; m.stop = st0; return st0; } // o seu expulso no campo: para como o vermelho do motor
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
      const mu = matchup(H, A, !!m.neutral, free), scF = scoutMin(m), lh = mu.lh * (m.home ? scF.us : scF.them), la = mu.la * (m.home ? scF.them : scF.us); // livre: sem o atributo por setor (o campinho já lê os atributos)
      m.poss = (m.poss || 0) + (m.home ? mu.h.poss : 1 - mu.h.poss);
      // Quem manda no jogo, minuto a minuto (0 a 100, do seu lado): a faixa da tela e do resultado
      (m.mom = m.mom || []).push(Math.round(100 * (m.home ? lh : la) / (lh + la || 1)));
      // Para o caderno: quanto tempo cada confronto de estilo e de formação ficou em campo, e como o rival jogou
      const pm = m.pm = m.pm || {}, tm = m.tm = m.tm || {}, ks = 'sty:' + m.us.style + '|' + m.them.style, kf = 'frm:' + m.us.form + '|' + m.them.form, kt = m.them.form + '|' + m.them.style;
      pm[ks] = (pm[ks] || 0) + 1; pm[kf] = (pm[kf] || 0) + 1; tm[kt] = (tm[kt] || 0) + 1;
      if (m.plan && S.coPlanNow(m) !== 'off') m.plan.min = (m.plan.min || 0) + 1; // minutos no plano do auxiliar
      // Cansaço: quem está em campo perde energia aos poucos (o estilo de ataque cansa mais; Físico alto cansa menos)
      [m.us, m.them].forEach(s => { const sen = styOf(s).en; s.xi.forEach((id, i) => { const p = id && s.squad.find(x => x.id === id); if (p) { p.en = Math.max(0, p.en - CO.enGame / CO.mins * sen * (s.enK || 1) * (1 + 0.12 * Math.max(0, s.roles ? s.roles[i] || 0 : 0)) * enFis(p)); if (s.mine) m.played[id] = (m.played[id] || 0) + 1; } }); });
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
            if (sp === 'esc' || sp === 'fc') { by2 = tk ? tk.n : ''; const mm = byId(S0.squad), hd = S0.xi.map(id => mm[id]).filter(p => p && (p.pos === 'ZAG' || p.pos === 'ATA') && (!tk || p.id !== tk.id)); if (hd.length) who = headPick(r(), hd).n; }
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
            else { k = u < 0.4 ? 'defesa' : u < 0.8 ? 'fora' : 'bloqueio'; by2 = tk ? tk.n : ''; const mm = byId(S0.squad), hd = S0.xi.map(id => mm[id]).filter(p => p && (p.pos === 'ZAG' || p.pos === 'ATA') && (!tk || p.id !== tk.id)); if (hd.length) who = headPick(r(), hd).n; }
          }
          if (k === 'defesa') m.ot[sd]++;
          // Escanteio: o da jogada e parte das defesas e dos chutes travados
          if (sp === 'esc' || (!sp && (k === 'defesa' || k === 'bloqueio') && r() < 0.5)) { m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; }
          m.ev.push({ m: m.min, t: 'chance', s: sd, p: who, k, l, sp, by: by2 });
        }
        return true;
      };
      if (free) {
        m.lam = { us: m.home ? lh : la, them: m.home ? la : lh };
        const PF = 0.08 + (CO.ch - 1) * CO.spMiss.pen; // pênaltis por gol esperado: os que entram (8% dos gols) e os perdidos
        if (!brain) [[H, lh], [A, la]].forEach(([S0, lam]) => {
          if (stop || r() >= lam / CO.mins * PF) return;
          const sd = sideName(m, S0), tk = takerOf(S0, 'pen'), who = tk ? tk.n : scorer(r, S0), u = r();
          m.sh = m.sh || { us: 0, them: 0 }; m.sh[sd]++; m.ot = m.ot || { us: 0, them: 0 };
          if (r() < 0.08 / PF * penK(tk, S0 === H ? A : H)) { if (S0 === H) m.gh++; else m.ga++; m.ot[sd]++; m.ev.push({ m: m.min, t: 'gol', s: sd, p: who, l: 'c', sp: 'pen', by: null }); stop = { t: 'gol', s: sd, p: who, l: 'c', sp: 'pen', by: null }; }
          else { const k = u < 0.55 ? 'defesa' : u < 0.85 ? 'fora' : 'trave'; if (k === 'defesa') m.ot[sd]++; m.ev.push({ m: m.min, t: 'chance', s: sd, p: who, k, l: 'c', sp: 'pen', by: null }); }
        });
      } else if (!chance(H, lh)) chance(A, la);
      // Escanteios que não viram chance (cruzamento afastado, cobrança curta): no ritmo de quem manda
      [[H, lh], [A, la]].forEach(([S0, lam]) => { if (r() < CO.ck / CO.mins * 2 * lam / (lh + la || 1)) { const sd = sideName(m, S0); m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; } });
      // Faltas, cartões, impedimento e lesão (o seu vermelho e a sua lesão param o jogo; os do rival entram no relato)
      // Pênalti neste minuto (Silvio 2026-11-11: "tomei amarelo e o pênalti foi a favor do meu time?"): a falta e o cartão
      // eram sorteados à parte e podiam cair em quem ganhou o pênalti. Agora quem ganhou não faz falta nem leva cartão
      // neste minuto, e a falta do pênalti é de um defensor de quem levou (`pk`), contada antes da cobrança
      const penEv = m.ev.slice(ev0).find(e => e.sp === 'pen');
      [m.us, m.them].forEach(s => {
        if (stop && stop.t !== 'gol') return;
        const sd = sideName(m, s), o = s === m.us ? m.them : m.us, st = styOf(s), cnt = k => { m[k] = m[k] || { us: 0, them: 0 }; m[k][sd]++; };
        const pk = penEv ? (penEv.s === sd ? -1 : 1) : 0; if (pk < 0) return;
        if (brain) { if (r() < CO.inj / CO.mins * injW(s).t * (s.injK || 1)) { const k = injW(s).pick(r()), id = s.xi[k], p = s.squad.find(x => x.id === id); if (!p) return; p.out = Math.max(1, r.int(1, 6) + 1 - (s.outCut || 0)); m.ev.push({ m: m.min, t: 'lesao', s: sd, p: p.n }); if (s.mine) stop = { t: 'lesao', p: p.n, id, k }; else autoSub(s, k, true); } return; }
        if (pk || r() < CO.foul / CO.mins * (0.8 + 0.45 * st.press + 0.2 * (1 - st.ctrl))) {
          cnt('fo');
          const k = pk ? penFoulPick(r, s) : foulPick(r, s), id = s.xi[k], p = id && s.squad.find(x => x.id === id); if (!p) return;
          s.bk = s.bk || {};
          const kc = m.classic ? CO.kCl : 1, bk = !!s.bk[id], card = r() < CO.redD * kc ? 'direto' : r() < CO.yel * kc * (bk ? 0.7 : 1) ? (bk ? '2am' : 'am') : '';
          const put = e => { if (pk) { e.pk = 1; m.ev.splice(m.ev.indexOf(penEv), 0, e); } else m.ev.push(e); };
          if (card === 'am') {
            s.bk[id] = 1; cnt('yc');
            if (s.mine) (m.ycAdd = m.ycAdd || []).push(id);
            put({ m: m.min, t: 'amarelo', s: sd, p: p.n, pos: slotsOf(s.form)[k] });
          } else if (card) {
            if (bk) { cnt('yc'); if (m.ycAdd) m.ycAdd = m.ycAdd.filter(x => x !== id); } // os amarelos do vermelho não acumulam
            cnt('rc'); s.xi[k] = null; s.red++; if (s.mine) p.sus = 2;
            put({ m: m.min, t: 'vermelho', s: sd, p: p.n, how: card, pos: slotsOf(s.form)[k] });
            if (s.mine) stop = { t: 'vermelho', p: p.n, how: card, id };
          } else if (pk || r() < CO.foulShow) put({ m: m.min, t: 'falta', s: sd, p: p.n, pos: slotsOf(s.form)[k] });
        } else if (r() < CO.off / CO.mins * (0.55 + 0.9 * styOf(o).line) * (0.8 + 0.4 * st.counter)) {
          const at = s.xi.map((id, k) => [id, k]).filter(([id, k]) => id && /ATA|MEI/.test(slotsOf(s.form)[k])), q = at.length ? r.pick(at) : null;
          if (!q) return;
          cnt('of'); const p = s.squad.find(x => x.id === q[0]);
          m.ev.push({ m: m.min, t: 'impedimento', s: sd, p: p ? p.n : '', pos: slotsOf(s.form)[q[1]] });
        } else if (r() < CO.inj / CO.mins * injW(s).t * (s.injK || 1)) { const k = injW(s).pick(r()), id = s.xi[k], p = s.squad.find(x => x.id === id); if (!p) return; p.out = Math.max(1, r.int(1, 6) + 1 - (s.outCut || 0)); m.ev.push({ m: m.min, t: 'lesao', s: sd, p: p.n }); if (s.mine) stop = { t: 'lesao', p: p.n, id, k }; else autoSub(s, k, true); }
      });
      { const g = m.ev.slice(ev0).find(e => e.t === 'gol' && e.s === 'us'); if (g) scoutGoal(m, g); }
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
      if (m.min >= 55 && m.min % 5 === 0) tiredSubs(m.them, 'm' + m.min);
      // O técnico rival reage (2026-11-13): no começo do 2º tempo e aos 62', perdendo ou empatando dominado, troca formação
      // e estilo para anular o seu jogo de agora (dentro do repertório dele; com expulsão, só o estilo)
      if ((m.min === 46 || m.min === 62) && !m.st && !(m.reac && m.reac[m.min])) {
        const T = m.them, diff = (T === H ? m.gh - m.ga : m.ga - m.gh), mm = (m.mom || []).slice(-15), dom = mm.length ? mm.reduce((a, b) => a + b, 0) / mm.length : 50;
        (m.reac = m.reac || {})[m.min] = 1;
        const vsd = strOf(m.vs) - strOf(co.club);
        if ((diff < 0 || (diff === 0 && dom > 57)) && r() < clamp(0.45 + 0.03 * (strOf(m.vs) - 55), 0.35, 0.9)) {
          const b = counterPlan(school(m.vs), vsd, T.squad.filter(p => T.xi.includes(p.id)), T, m.us, T === H, !!m.neutral);
          if (b && (b.f !== T.form || b.s !== T.style)) {
            const f = T.red ? T.form : b.f; T.style = b.s;
            if (f !== T.form) { const on = T.squad.filter(p => T.xi.includes(p.id)), a = autoXI(on, f); T.form = f; T.xi = Array.from({ length: 11 }, (_, i) => a.xi[i] || null); }
            m.ev.push({ m: m.min, t: 'tatica', s: 'them', p: T.form + ', ' + STY[T.style].name.toLowerCase() }); m.reacOk = 1;
          }
        }
      }
      // O técnico rival muda o plano: perdendo no fim, se joga; ganhando, fecha
      if (m.min === 65 || m.min === 78) { const T = m.them, diff = (T === H ? m.gh - m.ga : m.ga - m.gh);
        const want = diff < 0 ? (m.min === 78 ? 'pressao' : m.reacOk ? null : 'lados') : diff > 0 && m.min === 78 ? 'retranca' : null;
        if (want && T.style !== want) { T.style = want; m.ev.push({ m: m.min, t: 'tatica', s: 'them', p: STY[want].name }); } }
    }
    if (m.min >= 90 && m.st >= (m.a2 || 0) && !stop) { m.done = true; stop = { t: 'fim' }; }
    m.stop = stop;
    save();
    return stop;
  };
  // Cérebro 11x11: o juiz do campo apitou. sd = quem fez ('us' | 'them'); t: falta, amarelo, vermelho, impedimento;
  // info: { num, how ('direto' | '2am'), pen }. Conta como os do motor (faltas, cartões, suspensão, impedimentos) e o seu
  // vermelho para o jogo no próximo minuto (m.refStop). Volta o lance da súmula
  S.coMatchRef = function (co, m, sd, t, info) {
    if (!m || m.done || !m.min) return null;
    info = info || {};
    const s = sd === 'us' ? m.us : m.them, cnt = k => { m[k] = m[k] || { us: 0, them: 0 }; m[k][sd]++; };
    const k = s.xi.findIndex(id => { const p = id && s.squad.find(x => x.id === id); return p && p.num === info.num; });
    const id = k >= 0 ? s.xi[k] : null, p = id && s.squad.find(x => x.id === id), pos = k >= 0 ? slotsOf(s.form)[k] : '';
    const e = { m: m.min, t, s: sd, p: p ? p.n : '', pos, b11: 1 }; if (m.st) e.st = m.st; if (info.pen) e.pen = 1;
    if (t === 'impedimento') cnt('of');
    else {
      cnt('fo'); s.bk = s.bk || {};
      if (t === 'amarelo') { if (id) s.bk[id] = 1; cnt('yc'); if (s.mine && id) (m.ycAdd = m.ycAdd || []).push(id); }
      else if (t === 'vermelho') {
        const bk = id && s.bk[id]; e.how = info.how === '2am' || bk ? '2am' : 'direto';
        if (e.how === '2am') { cnt('yc'); if (m.ycAdd) m.ycAdd = m.ycAdd.filter(x => x !== id); }
        cnt('rc'); if (k >= 0) s.xi[k] = null; s.red++; if (s.mine && p) p.sus = 2;
        if (s.mine && p) m.refStop = { t: 'vermelho', p: p.n, how: e.how, id };
      }
    }
    m.ev.push(e);
    return e;
  };
  // Simulação livre: um chute que o campinho acabou de jogar entra na súmula (placar, chutes, no gol, escanteio, lance
  // com o nome de quem bateu). sd: 'us' | 'them'; out: gol, def, fora, trave, bloq; info: { id, num, sv, lane }
  S.coMatchShot = function (co, m, sd, out, info) {
    if (!m || (m.done && !(info && info.late)) || !m.min) return null; // late: o lance que o juiz esperou acabar depois do tempo (ui/coach.js)
    info = info || {};
    const S0 = sd === 'us' ? m.us : m.them, H = m.home ? m.us : m.them, mm = byId(S0.squad), on = S0.xi.map(id => mm[id]).filter(Boolean);
    const p = on.find(q => info.id != null && q.id === info.id) || on.find(q => info.num != null && q.num === info.num) || on.find(q => q.pos === 'ATA') || on[on.length - 1];
    if (!p) return null;
    m.sh = m.sh || { us: 0, them: 0 }; m.ot = m.ot || { us: 0, them: 0 }; m.sh[sd]++;
    const l = info.lane < 0 ? 'e' : info.lane > 0 ? 'd' : 'c', k = out === 'def' ? 'defesa' : out === 'trave' ? 'trave' : out === 'bloq' ? 'bloqueio' : 'fora';
    let e;
    if (out === 'gol') { if (S0 === H) m.gh++; else m.ga++; m.ot[sd]++; e = { m: m.min, t: 'gol', s: sd, p: p.n, l, sp: null, by: null }; }
    else { if (k === 'defesa') m.ot[sd]++; if (info.sv === 'escanteio') { m.ck = m.ck || { us: 0, them: 0 }; m.ck[sd]++; } e = { m: m.min, t: 'chance', s: sd, p: p.n, k, l, sp: null, by: null }; }
    if (m.st) e.st = m.st;
    // como foi o chute no campinho, para o texto do lance bater com o que se viu: de cabeça ou de fora da área
    if (info.kind === 'pen') { e.sp = 'pen'; e.l = 'c'; } else if (info.kind === 'cabeca') e.hd = 1; else if (info.kind === 'falta') { e.fk = 1; if (out === 'gol') e.sp = 'falta'; } else if (info.box === false) e.far = 1;
    e.livre = 1; m.ev.push(e); scoutGoal(m, e);
    return e;
  };
  // ---------- Olheiro (2026-11-13, Silvio: "mostra 3 fraquezas padrões e não se reflete em campo") ----------
  // Descobertas tiradas do rival de verdade (atributos, formação, estilo, idade). Cada uma é CHANCE (fraqueza deles, ty 'c') ou
  // CUIDADO (força deles, ty 'w'), tem uma resposta (formação, estilo, grito, treino, escalação) e vale em campo quando você
  // responde: CHANCE soma nos seus gols esperados, CUIDADO tira dos deles (fx, teto `cap` por lado). Quanto o olheiro vê vem da
  // Leitura de jogo (0 a 10), não linear e com sorte por jogo; uma pode ser falsa (não paga nada). Só vale com o relatório lido.
  const SC = S.CO_SCOUT = {
    on: env('CO_SCOUT', 1), cap: 0.12, fxK: env('CO_SCOUT_FX', 1), // fxK 0: as descobertas aparecem e contam, mas não valem nada (régua)
    lv: [{ to: 1, n: [0.3, 0.5, 0.2], fake: 0.4, no: ['cansa2', 'goleiro', 'meio', 'fim'] },
      { to: 4, n: [0.05, 0.6, 0.35], fake: 0.3, no: ['fim', 'goleiro'] },
      { to: 7, n: [0, 0.12, 0.88], fake: 0.2, no: [] },
      { to: 9, n: [0, 0.02, 0.98], fake: 0.12, no: [] },
      { to: 10, n: [0, 0, 1], fake: 0.08, no: [], best: 1 }],
  };
  const scLast = p => String(p.n || '').split(' ').pop();
  const scWideSide = f => { const sl = FORMS[f].slots, n = { d: 0, m: 0 }; ['d', 'm'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln || (ln === 'm' && sl[i].ln === 'am')); n[ln] = ix.filter((i, k) => k < ix.length / 2 && sl[i].w).length; }); return n.d >= 1 && n.m >= 1; };
  const scShout = (s, k) => !!(s.shout && s.shout.k === k);
  const scPl = (X, pos) => X.on.filter(o => o.sl.pos === pos);
  const scMin = (arr, f) => arr.reduce((b, o) => (!b || f(o) < f(b) ? o : b), null);
  const scMax = (arr, f) => arr.reduce((b, o) => (!b || f(o) > f(b) ? o : b), null);
  const SCD = S.CO_SCOUT_K = {
    perigo: { ty: 'w', fx: 0.06, ans: 'Dois do mesmo lado (4-4-2, 4-2-3-1, 4-5-1) ou grito Recuar',
      gen(X, f) { const w = X.on.filter(o => o.sl.w && o.sl.ln !== 'd'), b = scMax(w, o => o.p.ovr); if (!b) return null;
        const pw = b.p.ovr - X.avg - 3; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, t: scLast(b.p) + ' é o perigo deles', d: 'O melhor deles joga aberto e decide.' }; },
      ok: s => scWideSide(s.form) || scShout(s, 'recuar') },
    zagLento: { ty: 'c', fx: 0.06, ans: 'Contra-ataque, treino de Velocidade ou um atacante rápido',
      gen(X, f) { const b = scMin(scPl(X, 'ZAG'), o => o.dv[4]); if (!b) return null; const pw = -b.dv[4] - 4; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, v: b.a[4], t: 'Zagueiro ' + scLast(b.p) + ' é lento', d: 'Bola nas costas dele vira chance.' }; },
      ok: (s, m, e) => s.style === 'contra' || s.train === 'veloc' || s.xi.some((id, i) => { const p = id && s.by[id]; return p && FORMS[s.form].slots[i].pos === 'ATA' && S.coAttrs(p)[4] >= (e.v || 60) + 12; }) },
    zagAlto: { ty: 'c', fx: 0.06, ans: 'Jogo pelos lados ou treino de Escanteio a favor',
      gen(X, f) { const b = scMin(scPl(X, 'ZAG'), o => o.dv[5]); if (!b) return null; const pw = -b.dv[5] - 4; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, t: 'Zagueiro ' + scLast(b.p) + ' perde no alto', d: 'Cruzamento em cima dele vira chance.' }; },
      ok: s => s.style === 'lados' || s.train === 'esc' },
    latLento: { ty: 'c', fx: 0.06, ans: 'Jogo pelos lados (estilo ou grito) com ponta ou meia aberto',
      gen(X, f) { const b = scMin(scPl(X, 'LAT'), o => o.dv[4]); if (!b) return null; const pw = -b.dv[4] - 4; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, t: 'Lateral ' + scLast(b.p) + ' é lento', d: 'Ponta rápido em cima dele ganha a corrida.' }; },
      ok: s => (s.style === 'lados' || scShout(s, 'lados')) && FORMS[s.form].slots.some(x => x.w && x.ln !== 'd') },
    goleiro: { ty: 'c', fx: 0.05, ans: 'Jogo pelos lados ou treino de Escanteio a favor',
      gen(X, f) { const g = X.on.find(o => o.sl.pos === 'GOL'); if (!g) return null; const v = Math.min(g.dv[1], g.dv[2]), pw = -v - 4; if (pw <= 0 && !f) return null;
        return { i: g.i, pw, t: 'O goleiro ' + scLast(g.p) + ' sai mal', d: 'Bola alta na área dele vira confusão.' }; },
      ok: s => s.style === 'lados' || s.train === 'esc' },
    cansa2: { ty: 'c', fx: 0.06, from: 60, ans: 'Posse de bola ou grito Pressionar depois dos 60\'',
      gen(X, f) { if (X.them.style !== 'pressao' && !f) return null; return { pw: 2 + X.r() * 2, t: 'Pressionam e cansam', d: 'Depois dos 60\' sobra espaço.' }; },
      ok: s => s.style === 'posse' || scShout(s, 'pressionar') },
    linha: { ty: 'c', fx: 0.06, ans: 'Contra-ataque ou treino de Contra-ataque',
      gen(X, f) { const st = X.them.style; if (st !== 'pressao' && st !== 'posse' && !f) return null; return { pw: 2 + X.r() * 3, t: 'Linha alta, espaço nas costas', d: 'A zaga joga lá no meio do campo.' }; },
      ok: s => s.style === 'contra' || s.train === 'contra' },
    fechados: { ty: 'c', fx: 0.06, ans: 'Posse de bola, jogo pelos lados ou treino de Troca de passes',
      gen(X, f) { const st = X.them.style; if (st !== 'retranca' && st !== 'contra' && !f) return null; return { pw: 2 + X.r() * 3, t: 'Vêm fechados', d: 'Todo mundo atrás da bola.' }; },
      ok: s => s.style === 'posse' || s.style === 'lados' || s.train === 'toque' },
    craque: { ty: 'w', fx: 0.06, ans: 'Dois volantes (4-2-3-1, 4-5-1, 4-3-3) ou treino de Duelos',
      gen(X, f) { const l = X.on.filter(o => o.sl.pos !== 'GOL').sort((a, b) => b.p.ovr - a.p.ovr), b = l[0]; if (!b || b.sl.w) return null;
        const pw = b.p.ovr - (l[1] ? l[1].p.ovr : b.p.ovr) - 4; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, t: 'Tudo passa pelo ' + scLast(b.p), d: 'O craque deles joga pelo meio.' }; },
      ok: s => ['4-2-3-1', '4-5-1', '4-3-3'].includes(s.form) || s.train === 'duelos' },
    tresZag: { ty: 'c', fx: 0.06, ans: 'Jogo pelos lados (estilo ou grito) ou pontas (4-3-3, 3-4-3)',
      gen(X, f) { if (!/^3|^5/.test(X.them.form) && !f) return null; return { pw: 2 + X.r() * 2, t: 'Três zagueiros: sobra lado', d: 'Os alas sobem e a ponta fica vazia.' }; },
      ok: s => s.style === 'lados' || scShout(s, 'lados') || s.form === '4-3-3' || s.form === '3-4-3' },
    meio: { ty: 'c', fx: 0.06, ans: 'Três ou mais no meio e Posse de bola',
      gen(X, f) { const a = X.on.filter(o => o.sl.pos === 'MEI' && !o.sl.w), mv = a.length ? a.reduce((t, o) => t + o.p.ovr, 0) / a.length : 0, pw = X.usMid - mv - 3;
        if (!a.length || (pw <= 0 && !f)) return null; return { pw, t: 'Meio fraco', d: 'O seu meio é melhor que o deles.' }; },
      ok: s => FORMS[s.form].slots.filter(x => x.pos === 'MEI' && !x.w && x.ln !== 'a').length >= 3 && s.style === 'posse' },
    faltosos: { ty: 'c', fx: 0.05, ans: 'Treino de Falta a favor',
      gen(X, f) { const st = X.them.style; if (st !== 'pressao' && st !== 'retranca' && !f) return null; return { pw: 1 + X.r() * 2, t: 'Fazem falta perto da área', d: 'Chegam atrasados na dividida.' }; },
      ok: s => s.train === 'falta' },
    fim: { ty: 'c', fx: 0.06, from: 70, live: 1, ans: 'Trocas depois dos 70\' ou grito Pressionar no fim',
      gen(X, f) { const l = X.on.filter(o => o.sl.pos !== 'GOL'), age = l.reduce((t, o) => t + o.p.age, 0) / (l.length || 1), fis = l.reduce((t, o) => t + o.dv[5], 0) / (l.length || 1);
        const pw = Math.max(age - 28.5, -fis - 2) * 1.5; if (pw <= 0 && !f) return null; return { pw, t: 'Cansam no fim', d: 'Do 70\' em diante eles caem.' }; },
      ok: (s, m) => !!m && m.min > 70 && (scShout(s, 'pressionar') || m.ev.some(e => e.t === 'troca' && e.s === 'us' && e.m >= 70)) },
    escanteio: { ty: 'w', fx: 0.05, ans: 'Treino de Defender escanteio',
      gen(X, f) { const z = scPl(X, 'ZAG'); if (!z.length) return null; const b = scMax(z, o => o.dv[5]), pw = b.dv[5] - 4; if (pw <= 0 && !f) return null;
        return { i: b.i, pw, t: 'Perigo no escanteio', d: scLast(b.p) + ' ganha tudo pelo alto na área.' }; },
      ok: s => s.train === 'defesc' },
  };
  // Os que podem ser a falsa: os que a tela não desmente (formação e estilo deles já estão no topo)
  const SC_FAKE = ['perigo', 'zagLento', 'zagAlto', 'latLento', 'goleiro', 'craque', 'meio', 'fim', 'escanteio'];
  S.coScoutLv = co => { const l = co && co.xp ? co.xp.leitura || 0 : 0; return SC.lv.find(x => l <= x.to) || SC.lv[SC.lv.length - 1]; };
  S.coScoutKey = (co, nx) => co.season + '|' + nx.round + '|' + (nx.cup ? 'c' + (nx.cup.leg || '') : 'l') + '|' + nx.vs;
  const scMemo = {};
  S.coScout = function (co, them, nx) {
    nx = nx || S.coNext(co); if (!SC.on || !nx || nx.bye) return null;
    them = them || oppSide(co, nx.vs, !nx.home);
    const key = S.coScoutKey(co, nx), lv = S.coScoutLv(co), mk = co.name + '|' + co.club + '|' + key + '|' + (co.xp ? co.xp.leitura : 0);
    if (scMemo[mk]) return JSON.parse(scMemo[mk]);
    const r = S.rng(hash(String(co.name) + '|' + co.club + '|' + key + '|olheiro')), tby = byId(them.squad), sl = FORMS[them.form].slots;
    const on = them.xi.map((id, i) => { const p = id && tby[id]; return p ? { p, i, sl: sl[i], a: S.coAttrs(p), dv: atDev(p) } : null; }).filter(Boolean);
    const fl = on.filter(o => o.sl.pos !== 'GOL'), uby = byId(co.squad);
    const um = co.xi.map((id, i) => [uby[id], FORMS[co.form].slots[i]]).filter(([p, x]) => p && x && x.pos === 'MEI' && !x.w);
    const X = { co, them, on, r, avg: fl.reduce((t, o) => t + o.p.ovr, 0) / (fl.length || 1), usMid: um.length ? um.reduce((t, [p]) => t + p.ovr, 0) / um.length : 0 };
    const all = Object.keys(SCD).map(k => { const g = SCD[k].gen(X, false); return g ? Object.assign({ k }, g) : null; }).filter(Boolean);
    const vis = all.filter(e => !lv.no.includes(e.k));
    // Quantas vê neste jogo (sorte do dia) e quais: no 10 as mais fortes; abaixo, sorteio puxado pela força
    const u = r(); let n = u < lv.n[0] ? 1 : u < lv.n[0] + lv.n[1] ? 2 : 3;
    const pick = [], pool = vis.slice();
    while (pick.length < n && pool.length) {
      let j = 0;
      if (lv.best) pool.forEach((e, q) => { if (e.pw > pool[j].pw) j = q; });
      else { const w = pool.map(e => 1 + Math.max(0, e.pw)), t = w.reduce((a, b) => a + b, 0); let x = r() * t; j = w.findIndex(v => (x -= v) <= 0); if (j < 0) j = 0; }
      pick.push(pool.splice(j, 1)[0]);
    }
    // Uma pode ser falsa: troca uma das vistas por algo que ele achou ter visto
    if (pick.length && r() < lv.fake) {
      const fk = SC_FAKE.filter(k => !all.some(e => e.k === k) && !lv.no.includes(k)).map(k => { const g = SCD[k].gen(X, true); return g ? Object.assign({ k, fake: 1 }, g) : null; }).filter(Boolean);
      if (fk.length) pick[Math.floor(r() * pick.length)] = fk[Math.floor(r() * fk.length)];
    }
    const out = { key, lv: co.xp ? co.xp.leitura || 0 : 0, miss: 3 - pick.length,
      list: pick.map(e => { const d = SCD[e.k]; return { k: e.k, ty: d.ty, fx: d.fx, from: d.from || 0, live: d.live || 0, t: e.t, d: e.d, ans: d.ans, i: e.i, v: e.v, fake: e.fake ? 1 : 0 }; }) };
    const ks = Object.keys(scMemo); if (ks.length > 60) ks.slice(0, 30).forEach(x => delete scMemo[x]);
    scMemo[mk] = JSON.stringify(out); return out;
  };
  // Você já responde a essa descoberta? (s = lado do jogo ou o seu time de agora; m = o jogo, para o que só se faz em campo)
  S.coScoutAns = function (e, s, m) { const d = SCD[e.k]; if (!d) return false; return !!d.ok(Object.assign({}, s, { by: byId(s.squad) }), m, e); };
  S.coScoutSide = co => ({ squad: co.squad, form: co.form, style: co.style, xi: co.xi, train: co.train && co.ss && co.train.i === co.ss.i ? co.train.k : null });
  // No jogo: quanto as descobertas respondidas valem neste minuto (verdadeiras pagam; falsas só contam como respondidas)
  function scoutMin(m) {
    const sc = m.scout; if (!sc) return { us: 1, them: 1 };
    let a = 0, b = 0; sc.on = [];
    sc.list.forEach((e, j) => { if (m.min < e.from) return; sc.w[j] = (sc.w[j] || 0) + 1; if (!S.coScoutAns(e, m.us, m)) return; sc.mn[j] = (sc.mn[j] || 0) + 1;
      if (e.fake) return; if (e.ty === 'c') { a += e.fx * SC.fxK; sc.on.push(j); } else b += e.fx * SC.fxK; });
    return { us: 1 + Math.min(SC.cap, a), them: 1 - Math.min(SC.cap, b) };
  }
  // Gol seu com uma CHANCE do olheiro respondida: a lista de lances conta (uma vez por descoberta)
  function scoutGoal(m, e) {
    const sc = m.scout; if (!sc || !e || e.t !== 'gol' || e.s !== 'us' || !sc.on || !sc.on.length) return;
    const j = sc.on.find(q => !sc.said[q]); if (j === undefined) return; sc.said[j] = 1;
    m.ev.push({ m: e.m, st: e.st, t: 'olheiro', s: 'us', p: sc.list[j].t });
  }
  // No fim: das que você respondeu (metade do tempo que valiam), quantas eram verdadeiras
  function scoutLog(m) {
    const sc = m.scout; if (!sc) return null;
    const it = sc.list.map((e, j) => ({ t: e.t, ty: e.ty, a: (sc.mn[j] || 0) >= 0.5 * Math.max(1, sc.w[j] || 0) && (sc.w[j] || 0) > 0 ? 1 : 0, f: e.fake }));
    return { it, n: it.filter(x => x.a).length, hit: it.filter(x => x.a && !x.f).length, miss: sc.miss };
  }
  // Quem faz a falta: zagueiro, volante e lateral mais; goleiro quase nunca; quem já tem amarelo se cuida
  const FOUL_W = { GOL: 0.08, ZAG: 1.4, LAT: 1.15, MEI: 1.2, ATA: 0.65 };
  // Quem faz o pênalti: zagueiro ou lateral (o goleiro de vez em quando); sem nenhum em campo, qualquer um
  function penFoulPick(r, s) {
    const slots = slotsOf(s.form), w = s.xi.map((id, i) => (id ? ({ GOL: 0.5, ZAG: 3, LAT: 1.5 })[slots[i]] || 0 : 0)), t = w.reduce((a, b) => a + b, 0);
    if (!t) return foulPick(r, s);
    let x = r() * t; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0 && w[i]) return i; }
    return w.findIndex(v => v > 0);
  }
  function foulPick(r, s) {
    const slots = slotsOf(s.form), w = s.xi.map((id, i) => (id ? FOUL_W[slots[i]] * (s.bk && s.bk[id] ? 0.6 : 1) : 0));
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0 && w[i]) return i; }
    return w.findIndex(v => v > 0);
  }
  // Quem sobe no escanteio e na falta cruzada: o físico (cabeceio) puxa a escolha (um sorteio só, como antes)
  function headPick(u, hd) {
    const w = hd.map(p => (AT.kS && p.pos !== 'GOL' ? Math.max(0.3, 1 + atDev(p)[5] / 15) : 1)); let x = u * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < hd.length; i++) { x -= w[i]; if (x <= 0) return hd[i]; }
    return hd[hd.length - 1];
  }
  // Pênalti: a finalização do batedor contra o atributo Pênalti do goleiro mexe na chance de entrar (até AT.penMax para cada lado)
  function penK(tk, S1) {
    if (!AT.kS || !tk || tk.pos === 'GOL') return 1;
    const gk = S1 && S1.xi[0] && S1.squad.find(p => p.id === S1.xi[0]), dg = gk && gk.pos === 'GOL' ? atDev(gk)[5] : 0;
    return 1 + clamp((atDev(tk)[0] - AT.penOff - dg) / AT.penK, -AT.penMax, AT.penMax);
  }
  function scorer(r, s) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    const w = s.xi.map((id, i) => { const p = m[id]; if (!p) return 0; const sl = slots[i]; return (sl === 'ATA' ? 5 : sl === 'MEI' ? 2 : sl === 'GOL' ? 0 : 0.6) * Math.max(0.3, (p.ovr + 2 * secDev(p, 'fin')) / 70); });
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return m[s.xi[i]] ? m[s.xi[i]].n : ''; }
    return '';
  }
  // Quanto cada um cansa pelo Físico (Físico 60 = normal; 84 cansa 20% menos, 36 cansa 20% mais); goleiro quase não cansa
  function enFis(p) { if (p.pos === 'GOL') return CO.enGK; const f = Array.isArray(p.at) ? p.at[5] : 60; return clamp(1 + (60 - f) / 120, 0.8, 1.2); }
  // Lesão: o peso de cada um em campo (1 descansado, até 2 com 35% de energia); t = soma (11 descansados = o número de antes)
  function injW(s) {
    const w = s.xi.map(id => { const p = id && s.squad.find(x => x.id === id); return p ? 1 + Math.max(0, CO.enInj - p.en) / 30 : 0; }), t = w.reduce((a, b) => a + b, 0) * 11 / Math.max(1, s.xi.length);
    return { t, pick: u => { let x = u * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0 && w[i]) return i; } return w.length - 1; } };
  }
  // O auxiliar no treino: com o time cansado (os 11 de agora com média abaixo de 80% ou três abaixo de 70%) ele pede Recuperação.
  // Devolve null ou { n: quantos abaixo de 70, who: os nomes, avg }
  S.coTrainTip = function (co) {
    const by = byId(co.squad), xi = (co.xi || []).filter(id => by[id] && ok(by[id])).length === 11 ? co.xi : autoXI(co.squad, co.form).xi;
    const ps = xi.map(id => by[id]).filter(p => p && p.pos !== 'GOL'); if (!ps.length) return null;
    const avg = ps.reduce((a, p) => a + p.en, 0) / ps.length, low = ps.filter(p => p.en < 70).sort((a, b) => a.en - b.en);
    return avg < 80 || low.length >= 3 ? { n: low.length, who: low.slice(0, 2).map(p => last(p.n)).join(', ') + (low.length > 2 ? '…' : ''), avg } : null;
  };
  // Paradas para troca (regra do futebol; Silvio 2026-11-11): até 5 trocas em até 3 paradas (`CO.win`); o intervalo não gasta
  // parada e várias trocas na mesma parada (`key`) gastam uma só; troca por lesão não gasta troca nem parada.
  // `s.win` ausente = jogo de save antigo, sem limite de paradas
  function winOk(s, key) { return s.win == null || key === 'ht' || s.wk === key || s.win > 0; }
  function winUse(s, key) { if (s.win != null && key !== 'ht' && s.wk !== key) { s.win--; s.wk = key; } }
  // Trocas pagas que dá para fazer agora nesta parada (0 sem troca ou sem parada)
  S.coSubLeft = (m, key, s) => { s = s || m.us; return s.subs > 0 && winOk(s, key || 'm' + m.min) ? s.subs : 0; };
  // free: troca por lesão, que não gasta uma das 5 nem uma parada (Silvio 2026-11-11)
  function autoSub(s, k, free, key) {
    if ((!free && (s.subs <= 0 || !winOk(s, key))) || !s.bench.length) { s.xi[k] = null; return; }
    const m = byId(s.squad);
    const inn = s.bench.slice().sort((a, b) => S.coSlotVal(m[b], s.form, k) - S.coSlotVal(m[a], s.form, k))[0];
    s.bench = s.bench.filter(x => x !== inn); s.xi[k] = inn; if (!free) { s.subs--; winUse(s, key); }
  }
  // Troca o cansado só se quem está no banco rende mais naquela vaga agora
  function tiredSubs(s, key) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    s.xi.forEach((id, k) => {
      const p = m[id]; if (!p || k === 0 || s.subs <= 0 || !winOk(s, key) || !s.bench.length) return;
      const sk = slotSec(FORMS[s.form].slots[k]), ef = q => eff(q, slots[k]) * secK(q, sk);
      const best = Math.max.apply(null, s.bench.map(b => ef(m[b])));
      if (best > ef(p) * 1.01) autoSub(s, k, false, key);
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
  // Conversa com quem está chateado (segunda-feira): prometer chance, pedir paciência ou ser duro. Cada resposta tem
  // um preço de verdade (2026-11-10; antes "Ser duro" era sempre pior que "Pedir paciência"): a promessa sobe mais a
  // moral e cobra (entrar em até 3 jogos ou cai 15), a paciência acalma e ele volta a pedir em 4 rodadas se seguir
  // chateado, e o duro derruba um pouco mas ele não pede mais na temporada (`p.mute`). `fx` = o que a tela mostra em
  // etiquetas ([tom, seta, texto]); `re` = o que o jogador responde
  S.CO_TALK1 = {
    prometer: { name: 'Prometer chance', mo: 14, fx: [['up', '▲▲', 'moral'], ['dn', '', 'entra em até 3 jogos']], re: 'Valeu, professor. Não vou decepcionar.' },
    paciencia: { name: 'Pedir paciência', mo: 5, fx: [['up', '▲', 'moral'], ['', '', 'ele volta a pedir']], re: 'Tá certo, professor. Vou esperar a minha vez.' },
    duro: { name: 'Ser duro', mo: -4, fx: [['dn', '▼', 'moral'], ['', '', 'não pede mais']], re: 'Entendi, professor.' },
  };
  S.CO_TALK1_GAP = 4; // rodadas sem pedir de novo depois de uma conversa
  const moOf = p => (p.mo === undefined ? 60 : p.mo);
  // Quem pede a conversa nesta semana: o mais chateado (moral abaixo de 42) que não conversou há pouco nem ouviu o "duro"
  S.coTalkWho = function (co) {
    if (!co.ss) return null;
    return co.squad.filter(p => moOf(p) < 42 && p.mute !== co.season && !(p.talked !== undefined && p.talkS === co.season && co.ss.i - p.talked < S.CO_TALK1_GAP)).sort((a, b) => moOf(a) - moOf(b))[0] || null;
  };
  // Por que ele está chateado, para a fala e a etiqueta da tela: promessa quebrada, venda recusada, banco ou a fase
  S.coTalkWhy = function (co, p) {
    if (p.broke) return { k: 'promessa', tag: 'promessa não cumprida', say: 'Professor, o senhor prometeu e eu não entrei.' };
    if (p.deny) return { k: 'sair', tag: 'queria sair', say: 'Professor, eu queria ter ido. Fiquei chateado.' };
    if (p.bn >= 2) return { k: 'banco', tag: p.bn + ' jogos no banco', say: 'Professor, estou treinando bem e não entro. O que eu preciso fazer?' };
    return { k: 'fase', tag: '', say: 'Professor, não estou feliz aqui. Queria entender o meu papel.' };
  };
  // Moral em 5 tracinhos e uma palavra (as mesmas faixas da ficha do Elenco)
  S.coMoTxt = p => { const mo = moOf(p); return { n: Math.max(1, Math.min(5, Math.ceil(mo / 20))), t: mo >= 70 ? 'alta' : mo >= 45 ? 'boa' : 'baixa', low: mo < 45 }; };
  // Moral em 5 níveis para a seta da tela (estilo PES): 60 (o normal, para onde a moral volta) é a seta reta
  S.CO_MO_LV = { 5: 'ótima', 4: 'boa', 3: 'normal', 2: 'baixa', 1: 'péssima' };
  S.coMoLv = p => { const mo = moOf(p); return mo >= 78 ? 5 : mo >= 66 ? 4 : mo >= 50 ? 3 : mo >= 36 ? 2 : 1; };
  S.coTalk1 = function (co, id, k) {
    const p = co.squad.find(x => x.id === id), t = S.CO_TALK1[k]; if (!p || !t) return false;
    p.mo = clamp(moOf(p) + t.mo, 0, 100); p.talked = co.ss ? co.ss.i : 0; p.talkS = co.season;
    delete p.broke; delete p.deny;
    if (k === 'prometer') { const nx = S.coNext(co); p.prom = (nx ? nx.round : 0) + 2; }
    if (k === 'duro') p.mute = co.season;
    return true;
  };
  // Troca (na parada): sai um titular, entra um do banco na mesma vaga. Até 5 por jogo em até 3 paradas (`key` = a parada;
  // 'ht' = intervalo, que não conta); quem sai não volta (sai do banco também, fica em s.gone); tirar quem se machucou
  // neste jogo não gasta troca nem parada (Silvio 2026-11-11)
  S.coSubFree = (m, id) => { const p = m.us.squad.find(x => x.id === id); return !!(p && p.out > 0); };
  S.coSub = function (co, m, outId, inId, key) {
    const s = m.us, k = s.xi.indexOf(outId), free = S.coSubFree(m, outId); key = key || 'm' + m.min;
    if ((!free && (s.subs <= 0 || !winOk(s, key))) || k < 0 || !s.bench.includes(inId)) return false;
    s.xi[k] = inId; s.bench = s.bench.filter(x => x !== inId); if (!free) { s.subs--; winUse(s, key); }
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
    const H = m.home ? m.us : m.them, A = m.home ? m.them : m.us, mu = matchup(H, A, !!m.neutral), u = m.home ? mu.h : mu.a, o = m.home ? mu.a : mu.h;
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
    const sq = []; Object.keys(CO.squad).forEach(pos => { for (let k = 0; k < CO.squad[pos]; k++) sq.push({ id: pos + k, n: '', pos, ovr: 70, en: 100, mo: 60, at: S.coAtNeutral(pos, 70) }); });
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
  // acerta o melhor 4 em cada 5 vezes e no resto chuta outro; nos 3 primeiros jogos da carreira acerta sempre
  // (Silvio 2026-11-09: quem está começando não pode ser enganado)
  S.CO_AUX_ACC = 0.8; S.CO_AUX_SURE = 3;
  const auxAcc = (co, nx) => (co.season === 0 && nx.round <= S.CO_AUX_SURE ? 1 : S.coAuxAcc ? S.coAuxAcc(co) : S.CO_AUX_ACC); // acerto pela licença (coachfin.js)
  S.coHint = function (co) {
    const nx = S.coNext(co); if (!nx || nx.bye) return null;
    const key = co.season + '|' + nx.round, cad = cadOf(co);
    if (cad.hint && cad.hint.k === key) return cad.hint;
    const them = oppSide(co, nx.vs, !nx.home), T = cadTruth(), r = S.rng(hash(String(co.name) + '|' + co.club + '|' + key + '|aux'));
    const rank = S.CO_STYLES.slice().sort((a, b) => T.sty[b + '|' + them.style].x - T.sty[a + '|' + them.style].x);
    const style = r() < auxAcc(co, nx) ? rank[0] : r.pick(rank.slice(1));
    return (cad.hint = { k: key, vs: nx.vs, them: them.style, style });
  };
  S.CO_AUX_VS = { equilibrado: 'um time equilibrado', posse: 'um time que gosta da bola', pressao: 'pressão alta', contra: 'time de contra-ataque', retranca: 'retranca', lados: 'time que joga pelos lados' };
  S.CO_AUX_DO = { equilibrado: 'eu iria no equilibrado', posse: 'eu ficaria com a bola', pressao: 'eu apertaria a saída deles', contra: 'eu esperaria e sairia no contra-ataque', retranca: 'eu fecharia a casinha', lados: 'eu abriria o jogo pelos lados' };
  S.coHintTxt = h => 'Contra ' + S.CO_AUX_VS[h.them] + ', ' + S.CO_AUX_DO[h.style] + ', professor.';
  // Dica do auxiliar por jogo (Silvio 2026-11-09): uma por rodada, de estilo (o palpite acima) ou de formação (a que mais
  // rende com o seu elenco contra o plano do rival; quando erra, é uma das três seguintes). Fica em co.tip até a rodada
  // virar: { k, kind: 'sty' | 'frm', v: o que ele usaria, them: o que o rival traz }. Está usada quando co.style/co.form === v
  // frm (Silvio 2026-11-10: a sugestão de formação sai depois do relatório do olheiro): a dica é sempre de formação
  // Plano do auxiliar (Silvio 2026-11-11: "to seguindo e não vendo impacto nenhum"): com o relatório do olheiro a dica é o
  // plano inteiro, formação + estilo, o par que mais rende com o seu elenco contra o plano do rival (quando erra, é um dos
  // 5 seguintes). `best` = acertou; `why` = a parte do jogo em que o plano mais ganha (o aviso do ao vivo e o resultado)
  const secOf = (u, o) => ({ meio: u.poss - 0.5, lados: u.flank * u.wsh - o.flank * o.wsh, area: u.central * (1 - u.wsh) - o.central * (1 - o.wsh), pressao: u.press - o.press, contra: 1.6 * (u.counter - o.counter) });
  S.coPlanRank = function (co, nx, them) {
    const sq = co.squad.filter(ok), F = Object.keys(FORMS), L = [];
    F.forEach(f => { const xi = autoXI(sq, f).xi; S.CO_STYLES.forEach(st => { const us = { squad: co.squad, form: f, style: st, xi, bonus: 0 }, m = nx.home ? matchup(us, them) : matchup(them, us);
      L.push({ f, s: st, x: nx.home ? m.lh / m.la : m.la / m.lh, sec: nx.home ? secOf(m.h, m.a) : secOf(m.a, m.h) }); }); });
    return L.sort((a, b) => b.x - a.x);
  };
  S.coTip = function (co, frm) {
    const nx = S.coNext(co); if (!nx || nx.bye) return null;
    const key = co.season + '|' + nx.round + (frm ? '|p' : '');
    if (co.tip && co.tip.k === key) return co.tip;
    const h = S.coHint(co), them = oppSide(co, nx.vs, !nx.home), r = S.rng(hash(String(co.name) + '|' + co.club + '|' + key + '|dica'));
    if (frm) {
      const rank = S.coPlanRank(co, nx, them), best = r() < auxAcc(co, nx), P = best ? rank[0] : r.pick(rank.slice(1, 6));
      const why = Object.keys(P.sec).sort((a, b) => P.sec[b] - P.sec[a])[0];
      // good: o plano rende mais que a metade das combinações (o que o aviso do ao vivo e o resultado contam)
      return (co.tip = { k: key, kind: 'plan', f: P.f, s: P.s, v: P.f, them: them.form, ts: them.style, best: best ? 1 : 0, good: P.x > rank[rank.length >> 1].x ? 1 : 0, why, st: them.plan && them.plan.study ? them.plan.study.f + ' · ' + STY[them.plan.study.s].name : '' });
    }
    const sq = co.squad.filter(ok), sc = {}, F = Object.keys(FORMS);
    F.forEach(f => { const us = { squad: co.squad, form: f, style: co.style, xi: autoXI(sq, f).xi, bonus: 0 }, m = nx.home ? matchup(us, them) : matchup(them, us); sc[f] = nx.home ? m.lh / m.la : m.la / m.lh; });
    const rank = F.slice().sort((a, b) => sc[b] - sc[a]);
    const form = r() < auxAcc(co, nx) ? rank[0] : r.pick(rank.slice(1, 4));
    let kind = r() < 0.5 ? 'sty' : 'frm';
    if (kind === 'sty' && h.style === co.style && form !== co.form) kind = 'frm';
    else if (kind === 'frm' && form === co.form && h.style !== co.style) kind = 'sty';
    return (co.tip = { k: key, kind, v: kind === 'sty' ? h.style : form, them: kind === 'sty' ? them.style : them.form });
  };
  S.CO_AUX_SEE = { equilibrado: 'Eles não se expõem.', posse: 'Eles gostam de ficar com a bola.', pressao: 'Eles apertam a saída de bola.', contra: 'Eles esperam para sair no contra-ataque.', retranca: 'Eles vêm fechados lá atrás.', lados: 'Eles jogam pelos lados.' };
  S.CO_AUX_GO = { equilibrado: 'Vá no equilibrado', posse: 'Fique com a bola', pressao: 'Aperte a saída deles', contra: 'Saia no contra-ataque', retranca: 'Feche a casinha', lados: 'Abra pelos lados' };
  S.CO_AUX_ME = { equilibrado: 'Eu iria no equilibrado', posse: 'Eu ficaria com a bola', pressao: 'Eu apertaria a saída deles', contra: 'Eu esperaria e sairia no contra-ataque', retranca: 'Eu fecharia a casinha', lados: 'Eu abriria o jogo pelos lados' };
  S.coTipUsed = (co, t) => !!t && (t.kind === 'plan' ? co.form === t.f && co.style === t.s : (t.kind === 'sty' ? co.style : co.form) === t.v);
  S.coTipName = t => (t.kind === 'plan' ? t.f + ' · ' + S.CO_STY[t.s].name : t.kind === 'sty' ? S.CO_STY[t.v].name : t.v);
  S.coTipLbl = t => (t.kind === 'plan' ? S.coTipName(t) : t.kind === 'sty' ? S.CO_AUX_GO[t.v] : 'Vá de ' + t.v);
  S.coTipTxt = t => (t.kind === 'plan' ? (t.st ? 'Eles estudaram o nosso ' + t.st + ' dos últimos jogos. ' : '') + 'Eles vêm no ' + t.them + '. ' + S.CO_AUX_SEE[t.ts] + ' Vá de ' + t.f + (t.s === 'equilibrado' ? ', no equilibrado' : ' e ' + S.CO_AUX_GO[t.s].replace(/^./, c => c.toLowerCase())) + ', professor.' : t.kind === 'sty' ? S.CO_AUX_SEE[t.them] + ' ' + S.CO_AUX_ME[t.v] + ', professor.' : 'Eles vêm no ' + t.them + '. Eu responderia com o ' + t.v + ', professor.');
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
    if (st && st.t === 'lesao') { const k = s.xi.indexOf(st.id); if (k >= 0) autoSub(s, k, true); }
    if (m.min >= 60) tiredSubs(s, st && st.t === 'intervalo' ? 'ht' : 'm' + m.min);
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
    const ycOut = afterGame(co, m, res);
    const log = { r: m.round, vs: m.vs, home: m.home, gf, ga, res, ycOut, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
    // Plano do auxiliar no resultado: ficou nele em boa parte do jogo (2/3 dos minutos)?
    if (m.plan) log.plan = m.plan.used && (m.plan.min || 0) >= 0.66 * Math.max(1, m.tk || m.min) ? (m.plan.good ? 'ok' : 'no') : 'off';
    { const sl = scoutLog(m); if (sl) log.scout = sl; }
    if (co.train && co.train.i <= ss.i) { log.train = co.train.k; delete co.train; }
    rateAfter(co, m, log, gf, ga);
    log.cad = cadNote(co, m, log);
    ss.log.push(log);
    board(co, log);
    ss.i++;
    xiAfter(co);
    if (ss.i >= ss.rounds.length) ss.done = true;
    if (S.coWorldSync) S.coWorldSync(co);
    return log;
  };
  // Depois de qualquer jogo seu (liga ou copa): cansaço e moral, lesão e suspensão andam, amarelos acumulados
  function afterGame(co, m, res) {
    // Elenco: quem jogou cansa, quem não jogou descansa; moral pelo resultado e por jogar ou não
    const motiv = co.xp.motiv * 0.06;
    co.squad.forEach(p => {
      const pl = m.played[p.id] || 0;
      p.en = pl ? Math.min(100, p.en + (100 - p.en) * CO.enRec) : 100;
      // Moral volta aos poucos para 60; vitória sobe, derrota desce (a motivação do técnico segura a queda)
      p.mo += (60 - p.mo) * 0.12;
      // Jogos seguidos sem entrar (bn) e a promessa de chance feita na conversa (some: moral cai se não cumprir)
      p.bn = pl ? 0 : (p.bn || 0) + 1;
      if (p.prom) { if (pl) delete p.prom; else if (m.round >= p.prom) { if (p.out || p.sus) p.prom = m.round + 1; else { p.mo = clamp(p.mo - 15, 0, 100); delete p.prom; p.broke = 1; } } } // machucado ou suspenso não quebra a promessa: ela espera
      if (pl) p.mo = clamp(p.mo + (res === 'v' ? 5 : res === 'd' ? -5 * (1 - motiv) : 0.5), 0, 100);
      else if (p.ovr >= teamAvg(co) - 2) p.mo = clamp(p.mo - 2 * (1 - motiv), 0, 100);
    });
    // Lesão e vermelho já contam o jogo de hoje (out = n + 1, sus = 2): desconta 1 de todos
    co.squad.forEach(p => { if (p.out) p.out--; if (p.sus) p.sus--; if (!p.sus) p.ycSus = 0; });
    // Amarelos acumulados: no CO.ycMax, um jogo de suspensão e a conta zera (quem foi expulso já cumpre pelo vermelho)
    const ycOut = [];
    (m.ycAdd || []).forEach(id => { const p = co.squad.find(x => x.id === id); if (!p) return; p.yc = (p.yc || 0) + 1; if (p.yc >= CO.ycMax) { p.yc = 0; if (!p.sus) { p.sus = 1; p.ycSus = 1; ycOut.push(p.n); } } });
    return ycOut;
  }
  function rateAfter(co, m, log, gf, ga) {
    log.rt = rateMatch(co, m, gf, ga);
    log.rt.forEach(x => { const p = co.squad.find(q => q.id === x.id); if (!p) return; p.notes = (p.notes || []).concat([x.r]).slice(-5);
      if (x.r >= 7.5) p.mo = clamp(p.mo + 2, 0, 100); else if (x.r < 5.5) p.mo = clamp(p.mo - 2, 0, 100); });
  }
  function xiAfter(co) {
    if (!co.sacked) { co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))); if (co.xi.length < 11 || co.autoXI) { const a = autoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; } else co.bench = co.squad.filter(p => ok(p) && !co.xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id); }
  }
  // Para a copa (coachcup.js): o mesmo depois do jogo, sem tabela nem rodada
  S._coAfter = { afterGame, rateAfter, xiAfter };
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
      // Goleiro: não levar gol só vale inteiro com trabalho (3 chutes no gol deles); sem chute no gol, nada por isso
      const gkW = p.pos === 'GOL' ? Math.min(1, (ot.them || 0) / 3) : 1;
      r += k * ((gf > ga ? 0.35 : gf < ga ? -0.35 : 0) - def * ga * 0.32 + (ga === 0 ? def * 0.6 * gkW : 0) + (p.pos === 'GOL' ? Math.min(1.2, saves * 0.22) : 0));
      r += g.length * 1.1 + on * 0.25 + sh * 0.08 - (yc ? 0.3 : 0) - (rc ? 1.6 : 0) - fo * 0.1;
      r = clamp(Math.round(r * 10) / 10, 3, 10);
      const sub = !start.includes(id);
      const w = g.length ? (g.length > 1 ? g.length + ' gols' : 'gol') + (sub ? ' vindo do banco' : '') :
        rc ? 'expulso' : p.pos === 'GOL' ? (ga === 0 ? (saves ? 'não levou gol, ' + saves + (saves > 1 ? ' defesas' : ' defesa') : 'não foi exigido') : saves ? saves + (saves > 1 ? ' defesas' : ' defesa') + ', ' + ga + (ga > 1 ? ' gols sofridos' : ' gol sofrido') : ga + (ga > 1 ? ' gols sofridos' : ' gol sofrido')) :
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
  // Jogos entre dois clubes do computador (Silvio, 2026-11-12: "Vasco, Bahia e Inter no topo é estranho" no começo, mas "não
  // existe time hegemônico" depois). `LAM_T`: quanto a diferença de força pesa no placar desses jogos (menor = menos zebra;
  // o Jogo a Jogo segue com 130). `S.coClubDrift`: fase do clube que anda a cada temporada (zero na 1ª temporada da
  // carreira, passo de até `DRIFT` pontos por ano, no máximo `DRIFT_MAX`), presa à semente da carreira: sem save.
  const _env = (typeof process !== 'undefined' && process.env) || {};
  const LAM_T = +(_env.CO_LAM || 70), DRIFT = +(_env.CO_DRIFT === undefined ? 1.5 : _env.CO_DRIFT), DRIFT_MAX = 6;
  const driftMemo = {};
  S.coClubDrift = function (co, id) {
    const s0 = 0, n = co.season | 0; if (!(n > 0) || !DRIFT) return 0;
    const key = co.seed + ':' + id + ':' + n; if (driftMemo[key] !== undefined) return driftMemo[key];
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    let v = 0; for (let k = 1; k <= n; k++) { const q = S.rng(((co.seed | 0) ^ (h * 2654435761) ^ ((s0 + k) * 40503)) >>> 0); v = clamp(v * 0.8 + (q() * 2 - 1) * DRIFT, -DRIFT_MAX, DRIFT_MAX); }
    return (driftMemo[key] = Math.round(v * 10) / 10);
  };
  function roundRest(co, skip) {
    const ss = co.ss, { r, save } = rngCo(co), str = id => D.CLUB_BY_ID[id].strength + S.coClubDrift(co, id);
    ss.rounds[ss.i].forEach(([h, a]) => {
      if (skip.includes(h) && skip.includes(a)) return;
      if (skip.includes(h) || skip.includes(a)) return;
      const g = L().simple(r, h, a, str(ss.ids[h]), str(ss.ids[a]), LAM_T);
      addTab(ss.tab, h, a, g.gh, g.ga, resOf(ss));
    });
    save();
  }
  // Artilharia do campeonato (Silvio 2026-11-10: "quero ver a artilharia do campeonato e o escudo do time do jogador").
  // Os outros jogos só têm placar: cada gol ganha um autor sorteado do elenco do clube (sorteio preso à temporada, à
  // rodada, ao jogo e ao gol, então a lista é sempre a mesma e não vai para o save), com peso pela posição, pela
  // finalização e por quem é titular. Os seus gols são os de verdade (ss.log). Devolve [{ n, pos, club, g, me }].
  const SC_W = { ATA: 6, MEI: 2.4, LAT: 0.7, ZAG: 0.6, GOL: 0 };
  S.coLeagueScorers = function (co) {
    const ss = co.ss; if (!ss || !ss.ids) return [];
    const g = {}, add = (key, n, pos, club, me) => { (g[key] = g[key] || { n, pos, club, g: 0, me }).g++; };
    const mine = co.club, sq = {}, pool = id => sq[id] || (sq[id] = (() => {
      const all = genSquad(id, co.season, co).filter(p => p.pos !== 'GOL'), rk = {};
      return all.map(p => { const k = rk[p.pos] = (rk[p.pos] || 0) + 1, fin = p.at && p.at[0] ? p.at[0] : p.ovr;
        return { p, w: SC_W[p.pos] * Math.pow(Math.max(5, fin - 35), 1.6) * (k <= (p.pos === 'MEI' ? 3 : 2) ? 1 : 0.18) }; }); })());
    (ss.res || []).forEach((rd, ri) => (rd || []).forEach(([h, a, gh, ga], gi) => [[h, gh], [a, ga]].forEach(([ix, n], side) => {
      const id = ss.ids[ix]; if (id === mine || !n) return;
      const P = pool(id), tot = P.reduce((t, x) => t + x.w, 0); if (!tot) return;
      const r = S.rng(hash('art|' + co.season + '|' + ri + '|' + gi + '|' + side));
      for (let k = 0; k < n; k++) { let v = r() * tot, x = P[0]; for (const q of P) { v -= q.w; if (v <= 0) { x = q; break; } } add(x.p.id, x.p.n, x.p.pos, id, false); }
    })));
    (ss.log || []).forEach(l => (l.ev || []).forEach(nm => { const p = co.squad.find(q => q.n === nm); add('me|' + nm, nm, p ? p.pos : '', mine, true); }));
    return Object.keys(g).map(k => g[k]).sort((a, b) => b.g - a.g || (b.me ? 1 : 0) - (a.me ? 1 : 0) || (a.n < b.n ? -1 : 1));
  };
  // Rodada sem você (folga ou depois da demissão)
  S.coSkipRound = function (co) { const ss = co.ss; roundRest(co, []); ss.i++; if (ss.i >= ss.rounds.length) ss.done = true; if (S.coWorldSync) S.coWorldSync(co); };

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
      // Demitido assim que o ultimato fica impossível (2026-11-11, Silvio: "perdi as duas primeiras e nem deveria ter jogado
      // a última, ganhei e fui demitido"): com 2 de 3 para vencer, a 2ª derrota já encerra; nunca há demissão logo depois de vitória
      else if (B.ult.n >= CO.ultN || B.ult.got + (CO.ultN - B.ult.n) < CO.ultNeed) { co.sacked = true; B.sk = { need: B.ult.need, of: B.ult.of }; B.ult = null; }
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
    // Subiu: a liga em que o clube joga no ano que vem (a festa do acesso mostra)
    if (up && co.leagueOf && co.leagueOf[co.club]) out.upTo = (D.LEAGUE_BY_ID[co.leagueOf[co.club]] || {}).name || '';
    // Elenco: idade, evolução, aposentadoria, contratos, base
    const { r, save } = rngCo(co);
    if (!co.sacked) {
      co.squad.forEach(p => {
        p.age++;
        const g = p.age <= 21 ? r.int(1, 4) : p.age <= 26 ? r.int(0, 2) : p.age <= 30 ? r.int(-1, 1) : p.age <= 33 ? r.int(-3, 0) : r.int(-5, -1);
        const o1 = clamp(p.ovr + (g > 0 ? Math.min(g, Math.max(0, p.pot - p.ovr)) : g), 30, 95);
        if (o1 !== p.ovr) { p.sd = o1 - p.ovr; seasonAttrs(p, p.sd); } else delete p.sd;
        p.ct--; p.mo = 60; p.en = 100; delete p.prom; delete p.broke; delete p.deny; // ano novo: a conversa da semana começa do zero
      });
      // Contrato acabou = sai do clube, titular ou não (Silvio 2026-11-09: antes o titular renovava sozinho por 2 anos).
      // Quem quer ficar com o jogador renova durante a temporada (S.coMktRenew, botão Renovar do Elenco).
      // A lista sai do mais forte ao mais fraco e marca quem era titular (`tit`), para a tela mostrar primeiro quem faz falta.
      const core = new Set(co.xi && co.xi.length ? co.xi : autoXI(co.squad, co.form).xi);
      const gone = co.squad.filter(p => p.age >= 37 || (p.age >= 34 && r() < 0.35) || p.ct <= 0);
      out.left = gone.slice().sort((a, b) => b.ovr - a.ovr).map(p => { const x = { n: p.n, ovr: p.ovr, why: p.ct <= 0 && p.age < 34 ? 'fim de contrato' : 'aposentou' }; if (core.has(p.id)) x.tit = 1; return x; });
      co.squad = co.squad.filter(p => !gone.includes(p));
      if (S.coWorldLeft) S.coWorldLeft(co, gone);
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
  // Preço contínuo (Silvio 2026-11-09 estranhou a escada: Palmeiras 180 e Flamengo 350): 30 até força 60 e +22 por
  // ponto de força acima disso, de 10 em 10 (Santos 250, Palmeiras 320, Flamengo 380, Real Madrid 510, City 620)
  S.CO_CLUB_PRICE = { base: 30, at: 60, per: 22, min: 20 };
  S.coClubPrice = id => { const P = S.CO_CLUB_PRICE, st = D.CLUB_BY_ID[id].strength;
    return st <= P.at ? Math.max(P.min, Math.round((P.base - (P.at - st)) / 10) * 10) : Math.round((P.base + (st - P.at) * P.per) / 10) * 10; };
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
