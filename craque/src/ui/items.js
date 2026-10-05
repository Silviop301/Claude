// Interface — itens para liberar (pacotinhos): catálogo, inventário no aparelho, sorteio do pacote e fichas.
// Só visual: nenhum item muda nota, sorte ou carreira. Nada se compra com dinheiro.
// Raridades conversam com as cartas: comum = bronze, raro = prata, épico = ouro, lendário = ícone.
(function () {
  const U = window.CRAQUE_UI;
  const { load, store } = U;
  const KEY = 'climbix-itens-v1';

  const RAR = ['comum', 'raro', 'epico', 'lendario'];
  const RAR_NAME = { livre: 'Livre', comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };
  const CHANCE = { comum: 62, raro: 26, epico: 9, lendario: 3 }; // por item
  const PITY = 10; // lendário garantido em até 10 pacotes
  // Economia (tools/craque_itens_sim.js simula quantas carreiras levam para liberar tudo; window.CLIMBIX_ITEMS_ECON troca valores no teste)
  const E = Object.assign({
    dup: { comum: 1, raro: 2, epico: 5, lendario: 12 }, // repetido vira fichas
    cost: { comum: 10, raro: 30, epico: 80, lendario: 200 }, // trocar fichas por um item
    fresh: 0, // chance extra de o item do pacote vir entre os que a pessoa ainda não tem (0 = sorteio puro)
    base: 1, gradeA: 0, gradeS: 1, bigMax: 1, achMax: 1, daily: 1, // pacotes no fim da carreira
  }, window.CLIMBIX_ITEMS_ECON || {});
  const DUP = E.dup, COST = E.cost;

  // Catálogo do visual. look: o que o item muda no boneco (prévia e "vestir")
  // cat: numeros (estilo do número) | assinatura | acabamento — o visual do jogador (cabelo, barba, chuteira) é todo livre
  const CAT = [
    ['num-ouro', 'Número dourado', 'lendario', 'numeros', { numFx: 'ouro' }, 'Vale para qualquer número.'],
    ['num-holo', 'Número holográfico', 'lendario', 'numeros', { numFx: 'holo' }, 'Vale para qualquer número.'],
    ['num-neon', 'Número neon', 'epico', 'numeros', { numFx: 'neon' }, 'Vale para qualquer número.'],
    ['num-contorno', 'Número vazado', 'epico', 'numeros', { numFx: 'contorno' }, 'Só o contorno, na cor do uniforme.'],
    ['num-fogo', 'Número em chamas', 'lendario', 'numeros', { numFx: 'fogo' }, 'Vale para qualquer número.'],
    // Assinatura da carta, escolhida no fim da carreira (Clássica, Caneta e Marcador são livres)
    ['ass-yellowtail', 'Assinatura Esportiva', 'raro', 'assinatura', { sign: 'yellowtail' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-zeyada', 'Assinatura Rápida', 'raro', 'assinatura', { sign: 'zeyada' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-doulaise', 'Assinatura Floreada', 'epico', 'assinatura', { sign: 'doulaise' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-kaushan', 'Assinatura Pincel', 'raro', 'assinatura', { sign: 'kaushan' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-caveat', 'Assinatura Pincel leve', 'raro', 'assinatura', { sign: 'caveat' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-vibes', 'Assinatura Caligrafia', 'raro', 'assinatura', { sign: 'vibes' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-grafite', 'Assinatura Grafite', 'epico', 'assinatura', { sign: 'grafite' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-tinteiro', 'Assinatura Tinteiro', 'epico', 'assinatura', { sign: 'tinteiro' }, 'Autógrafo na carta do fim da carreira.'],
    ['ass-dourada', 'Assinatura em tinta dourada', 'lendario', 'assinatura', { sign: 'dourada' }, 'O autógrafo da carta em ouro.'],
    // Acabamentos da carta final (textura no lugar do metal; escolhe-se no fim da carreira)
    ['ac-carbono', 'Acabamento Carbono', 'raro', 'acabamento', { finish: 'carbono' }, 'Fibra de carbono trançada na carta final.'],
    ['ac-marmore', 'Acabamento Mármore', 'raro', 'acabamento', { finish: 'marmore' }, 'Mármore branco com veios dourados.'],
    ['ac-madeira', 'Acabamento Madeira', 'raro', 'acabamento', { finish: 'madeira' }, 'Madeira nobre envernizada.'],
    ['ac-neon', 'Acabamento Neon', 'epico', 'acabamento', { finish: 'neon' }, 'Linhas de luz ciano e rosa no escuro.'],
    ['ac-aurora', 'Acabamento Aurora', 'epico', 'acabamento', { finish: 'aurora' }, 'Céu noturno com aurora verde e roxa.'],
    ['ac-camuflado', 'Acabamento Camuflado', 'epico', 'acabamento', { finish: 'camuflado' }, 'Camuflagem em tons de grafite.'],
    ['ac-vitral', 'Acabamento Vitral', 'epico', 'acabamento', { finish: 'vitral' }, 'Vidro colorido com chumbo escuro.'],
    ['ac-holografico', 'Acabamento Holográfico', 'lendario', 'acabamento', { finish: 'holografico' }, 'Brilho arco-íris de figurinha rara.'],
    ['ac-ourorose', 'Acabamento Ouro rosé', 'lendario', 'acabamento', { finish: 'ourorose' }, 'Ouro rosé escovado.'],
    ['ac-diamante', 'Acabamento Diamante', 'lendario', 'acabamento', { finish: 'diamante' }, 'Facetas de diamante, branco e azul-gelo.'],
  ].map(([id, name, rk, cat, look, desc, gk]) => ({ id, name, rk, cat, look, desc, gk: !!gk }));
  const BY_ID = {};
  CAT.forEach(it => { BY_ID[it.id] = it; });
  // Números da camisa: todos livres (não são mais itens)
  const itemOf = id => BY_ID[id];

  // Que item cada valor do visual pede (null = livre)
  const FREE_COLORS = ['preto'];
  const colorItem = v => (FREE_COLORS.includes(v) || v === 'lima' ? null : BY_ID['cor-' + v] ? 'cor-' + v : null);
  const PATTERN = { camuflada: 'camuflada', raio: 'raio', chamas: 'chamas', tigre: 'tigre',
    bicolor: 'bicolor', listrada: 'listrada', pontilhada: 'pontilhada', galaxia: 'galaxia', camoneon: 'camoneon', onca: 'onca', brasil: 'brasil', cristal: 'cristal',
    velcro: 'velcro', dedos: 'dedos', luvafogo: 'luvafogo', luvaouro: 'luvaouro' };
  // Só pede item o que ainda existe no catálogo (o visual do jogador é todo livre)
  function need(key, v) { const id = needId(key, v); return id && BY_ID[id] ? id : null; }
  function needId(key, v) {
    if (v === undefined || v === null) return null;
    if (key === 'boot' || key === 'sole' || key === 'wristC' || key === 'bandC' || key === 'glove') return PATTERN[v] || colorItem(v);
    if (key === 'hair') return v === 'curto' || v === 'black' ? null : BY_ID[v] ? v : null; // livres: curto e black
    if (key === 'hc') return v === 3 ? 'ruivo' : v === 4 ? 'grisalho' : v === 5 ? 'platinado' : v >= 6 ? 'pintado' : null; // livres: preto, castanho e loiro
    if (key === 'band') return v === 'faixa' ? 'faixa' : v === 'tiara' ? 'tiara' : null;
    if (key === 'sock') return v === 'arriado' ? 'arriado' : null;
    if (key === 'sleeve') return v === 'comprida' ? 'manga' : null;
    if (key === 'wrist') return v === 'nenhuma' ? null : 'munhequeira';
    if (/^tat(BD|BE|PD|PE)$/.test(key)) return v === 'pequena' ? 'tat-p-' + key.slice(3) : v === 'fechado' ? 'tat-f-' + key.slice(3) : null;
    if (key === 'beard') return v === 'nenhuma' ? null : BY_ID['barba-' + v] ? 'barba-' + v : null;
    if (key === 'numFx') return v ? 'num-' + v : null;
    if (key === 'extra') return BY_ID[v] ? v : null;
    if (key === 'cel') return BY_ID['cel-' + v] ? 'cel-' + v : null;
    return null;
  }

  // ---------- inventário ----------
  // { own: {id: 1}, fichas, packs: [{ why: [...] }], pity, news: {id: 1}, pen: 'AAAA-MM-DD', at }
  let inv = null;
  const rnd = () => Math.random();
  const VER = 3;
  function get() {
    if (inv) return inv;
    inv = load(KEY);
    if (!inv || !inv.own) inv = seed();
    if ((inv.v || 1) < VER || inv.own['tat-pequena'] || inv.own['tat-fechada']) migrate(inv); // (o outro aparelho pode trazer itens antigos)
    // Chuteira de ouro e holográfica continuam saindo também por conquista (como antes dos pacotinhos)
    const col = load('climbix-colecao-v1') || [], ach = load('craque-ach-v1') || {};
    const sp = new Set(col.flatMap(e => (e.specials || []).map(d => d && d.special)));
    if (sp.has('chuteira')) inv.own['cor-ouro'] = 1;
    if (ach.ouro || sp.has('bola')) inv.own['cor-holo'] = 1;
    return inv;
  }
  function put() { inv.at = Date.now(); store(KEY, inv); }
  // Tudo o que já foi usado nas carreiras salvas (em andamento e na coleção) fica liberado: ninguém perde nada
  function grantUsed(o) {
    const used = [];
    const sv = load(U.SAVE);
    if (sv && sv.c) used.push({ look: sv.c.look, number: sv.c.number });
    (load('climbix-colecao-v1') || []).forEach(e => e && e.card && used.push({ look: e.card.look, number: e.card.number }));
    used.forEach(u => {
      Object.entries(u.look || {}).forEach(([k, v]) => [].concat(v).forEach(x => { const id = need(k, x); if (id) o.own[id] = 1; }));
    });
  }
  // Primeira vez: o que já foi usado nas carreiras salvas
  function seed() {
    const o = { v: VER, own: {}, fichas: 0, packs: [], pity: 0, news: {}, at: Date.now() };
    grantUsed(o);
    inv = o; store(KEY, o);
    return o;
  }
  // v2: tatuagem por membro (quem tinha a tatuagem de antes fica com ela nos 4 membros); barbas e vermelho travados
  // v3: cortes (menos curto e black), ruivo, grisalho e branco travados. O que já foi usado continua liberado.
  function migrate(o) {
    [['tat-pequena', 'p'], ['tat-fechada', 'f']].forEach(([old, k]) => {
      if (!o.own[old]) return;
      delete o.own[old]; delete o.news[old];
      ['BD', 'BE', 'PD', 'PE'].forEach(m => { o.own['tat-' + k + '-' + m] = 1; });
    });
    grantUsed(o);
    o.v = VER;
    inv = o; store(KEY, o);
  }
  const has = id => !id || !!get().own[id];
  // Visual inicial só com o que é livre para todos
  const FREE = { hair: 'curto', hc: 0, beard: 'nenhuma', band: 'nenhuma', bandC: 'preto', boot: 'preto', sole: 'preto', sock: 'alto', sleeve: 'curta',
    wrist: 'nenhuma', wristC: 'preto', glove: 'lima', tatBD: 'nenhuma', tatBE: 'nenhuma', tatPD: 'nenhuma', tatPE: 'nenhuma', extra: [], cel: 'padrao' };
  // Tira do visual o que não está liberado (a prévia nunca entra na carreira)
  function clean(look) {
    const out = Object.assign({}, look);
    Object.keys(out).forEach(k => {
      if (k === 'extra') out.extra = (out.extra || []).filter(x => has(need('extra', x)));
      else if (!has(need(k, out[k]))) out[k] = k in FREE ? FREE[k] : k === 'tattoo' ? 'nenhuma' : undefined;
    });
    return out;
  }
  const counts = () => {
    const all = Object.keys(BY_ID), got = all.filter(id => get().own[id]);
    return { got: got.length, all: all.length };
  };

  // ---------- pacotes ganhos ----------
  // why: [{ t: 'Fim de carreira', n: 1 }, ...]
  function earn(why) {
    const n = why.reduce((s, w) => s + w.n, 0);
    if (!n) return 0;
    const o = get();
    for (let i = 0; i < n; i++) o.packs.push({ why: why.map(w => w.t) });
    put();
    return n;
  }
  // Motivos do fim de carreira: base, nota, títulos grandes (até 2), conquistas novas (até 2) e carreira do dia
  function careerWhy(c, f, achRes) {
    if (c.packsGiven) return [];
    c.packsGiven = true;
    const big = Object.values(c.trophies || {}).reduce((s, t) => s + (['ucl', 'lib', 'wc', 'ballon'].includes(t.type) ? t.n : 0), 0);
    const why = [{ t: 'Fim de carreira', n: E.base }];
    if (f.grade === 'S' && E.gradeS) why.push({ t: 'Nota S', n: E.gradeS }); else if (f.grade === 'A' && E.gradeA) why.push({ t: 'Nota A', n: E.gradeA });
    if (big && E.bigMax) why.push({ t: big > 1 && E.bigMax > 1 ? 'Títulos grandes' : 'Título grande', n: Math.min(E.bigMax, big) });
    const fresh = achRes && achRes.fresh ? achRes.fresh.length : 0;
    if (fresh && E.achMax) why.push({ t: fresh > 1 && E.achMax > 1 ? 'Conquistas novas' : 'Conquista nova', n: Math.min(E.achMax, fresh) });
    if (c.daily && E.daily) why.push({ t: 'Carreira do dia', n: E.daily });
    return why;
  }

  // ---------- sorteio ----------
  function rollRar() {
    let r = rnd() * 100;
    for (const k of RAR) { if (r < CHANCE[k]) return k; r -= CHANCE[k]; }
    return 'comum';
  }
  const pickOf = a => a[Math.floor(rnd() * a.length)];
  // Escolhe um item da raridade: 60% das vezes entre os que a pessoa ainda não tem
  function pickItem(pool) {
    const fresh = pool.filter(it => !get().own[it.id]);
    return fresh.length && rnd() < E.fresh ? pickOf(fresh) : pickOf(pool);
  }
  // Peças do pacote: assinatura, acabamento e estilo de número. Raridade sem peça (comum) sobe para a próxima que tenha
  function pool(rk) {
    for (let i = RAR.indexOf(rk); i < RAR.length; i++) { const l = CAT.filter(it => it.rk === RAR[i]); if (l.length) return l; }
    return CAT;
  }
  // Pacote: 1 peça (garantia: o 10º pacote seguido sem lendário vem com um lendário)
  function roll() {
    const o = get();
    const rk = o.pity >= PITY - 1 ? 'lendario' : rollRar();
    return [pickItem(pool(rk))];
  }
  // Abre o próximo pacote: aplica tudo no inventário e devolve o que saiu
  function open() {
    const o = get();
    if (!o.packs.length) return null;
    o.packs.shift();
    const items = roll();
    const got = items.map(it => {
      const dup = !!o.own[it.id];
      if (dup) o.fichas += DUP[it.rk];
      else { o.own[it.id] = 1; o.news[it.id] = 1; }
      return { it, dup, fichas: dup ? DUP[it.rk] : 0 };
    });
    o.pity = items.some(it => it.rk === 'lendario') ? 0 : o.pity + 1;
    put();
    return { got, pity: o.pity, top: items[items.length - 1].rk };
  }
  function trade(id) {
    const o = get(), it = BY_ID[id];
    if (!it || o.own[id] || o.fichas < COST[it.rk]) return false;
    o.fichas -= COST[it.rk]; o.own[id] = 1; o.news[id] = 1; put();
    return true;
  }
  const seen = id => { const o = get(); if (o.news[id]) { delete o.news[id]; put(); } };

  // ---------- sequência de dias ----------
  // Um dia conta quando você termina uma carreira (qualquer uma). A primeira carreira terminada no dia paga o
  // prêmio daquele dia da sequência; o ciclo tem 7 dias e recomeça. Pulou um dia: volta para o dia 1.
  // inv.days = { 'AAAA-MM-DD': carreiras terminadas no dia }
  const STREAK = [{ f: 5 }, { f: 10 }, { p: 1 }, { f: 15 }, { p: 1 }, { f: 25 }, { p: 2 }];
  const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const shift = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  // Estado da sequência hoje: n dias seguidos (até hoje, ou até ontem se hoje ainda não jogou), se hoje já conta,
  // e o ciclo de 7 dias em que você está (datas e prêmios)
  function streak(now) {
    const days = get().days || {}, today = now || new Date(), played = !!days[dayKey(today)];
    let d = played ? today : shift(today, -1), n = 0;
    while (days[dayKey(d)]) { n++; d = shift(d, -1); }
    // Posição no ciclo: com hoje jogado, hoje é o dia ((n-1)%7)+1; sem hoje, hoje seria o dia (n%7)+1
    const pos = played ? (n - 1) % 7 : n % 7, start = shift(today, -pos);
    const cells = STREAK.map((r, i) => { const dt = shift(start, i); return { i, date: dt, key: dayKey(dt), r, done: i < pos || (i === pos && played), today: i === pos }; });
    return { n, played, pos, cells, next: STREAK[played ? (pos + 1) % 7 : pos] };
  }
  // Fim de carreira: marca o dia; na primeira carreira do dia, paga o prêmio (fichas na hora, pacotinho na fila)
  function streakRecord() {
    const o = get(), k = dayKey(new Date());
    o.days = o.days || {};
    const first = !o.days[k];
    o.days[k] = (o.days[k] || 0) + 1;
    // Guarda só os últimos 60 dias
    Object.keys(o.days).sort().slice(0, -60).forEach(x => delete o.days[x]);
    put();
    if (!first) return null;
    const st = streak(), r = STREAK[st.pos];
    if (r.f) { o.fichas += r.f; put(); }
    return { day: st.pos + 1, n: st.n, r };
  }
  const streakTxt = r => (r.f ? r.f + ' fichas' : r.p + (r.p > 1 ? ' pacotinhos' : ' pacotinho'));

  // Nuvem: itens de todos os aparelhos; contadores (fichas, pacotes, garantia) do salvo mais recente;
  // dias da sequência de todos os aparelhos
  function merge(a, b) {
    if (!a || !b) return a || b || null;
    const newer = (b.at || 0) > (a.at || 0) ? b : a;
    const days = Object.assign({}, a.days, b.days);
    Object.keys(days).forEach(k => { days[k] = Math.max((a.days || {})[k] || 0, (b.days || {})[k] || 0); });
    return Object.assign({}, newer, { own: Object.assign({}, a.own, b.own), news: Object.assign({}, a.news, b.news), days });
  }

  U.ITEMS = { FREE, KEY, CAT, BY_ID, RAR, RAR_NAME, CHANCE, PITY, DUP, COST, itemOf, need, has, get, put, clean, counts,
    earn, careerWhy, open, trade, seen, merge, STREAK, streak, streakRecord, streakTxt, reset: () => { inv = null; } };
})();
