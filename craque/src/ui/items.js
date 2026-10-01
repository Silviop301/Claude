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
  // cat: cabelo | equip | tatuagem | cores
  const CAT = [
    ['cor-azul', 'Cor azul', 'comum', 'cores', { boot: 'azul' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['cor-amarelo', 'Cor amarela', 'comum', 'cores', { boot: 'amarelo' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['cor-laranja', 'Cor laranja', 'comum', 'cores', { boot: 'laranja' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['arriado', 'Meião arriado', 'comum', 'equip', { sock: 'arriado' }, 'Meião abaixado até a canela.'],
    ['munhequeira', 'Munhequeira', 'comum', 'equip', { wrist: 'duas' }, 'Uma ou duas, na cor que quiser.'],
    ['faixa', 'Faixa na cabeça', 'comum', 'equip', { band: 'faixa' }, 'Na cor que quiser.'],
    ['bonfim', 'Fita do Bonfim', 'comum', 'equip', { extra: ['bonfim'] }, 'Pulso direito. Combina com a munhequeira.'],
    ['listrado', 'Meião listrado', 'comum', 'equip', { extra: ['listrado'] }, 'Três listras na segunda cor do uniforme.'],
    ['caneleira', 'Caneleira à mostra', 'comum', 'equip', { extra: ['caneleira'] }, 'Vem com o meião arriado.'],
    ['moicano', 'Moicano', 'raro', 'cabelo', { hair: 'moicano' }, 'Corte com crista no meio.'],
    ['topete', 'Topete', 'raro', 'cabelo', { hair: 'topete' }, 'Corte com volume na frente.'],
    ['coque', 'Coque', 'raro', 'cabelo', { extra: ['coque'] }, 'Combina com curto e longo.'],
    ['risco', 'Risquinho no cabelo', 'raro', 'cabelo', { extra: ['risco'] }, 'Duas linhas raspadas na lateral.'],
    ['tiara', 'Tiara', 'raro', 'equip', { band: 'tiara' }, 'Na cor que quiser.'],
    ['manga', 'Manga comprida', 'raro', 'equip', { sleeve: 'comprida' }, 'Camisa de manga longa.'],
    ['cordao', 'Cordão', 'raro', 'equip', { extra: ['cordao'] }, 'Corrente dourada com medalha.'],
    ['brinco', 'Brinco', 'raro', 'equip', { extra: ['brinco'] }, 'Ponto dourado nas duas orelhas.'],
    ['raspado', 'Cabelo raspado', 'comum', 'cabelo', { hair: 'raspado' }, 'Máquina baixinha.'],
    ['careca', 'Careca', 'comum', 'cabelo', { hair: 'careca' }, 'Sem cabelo nenhum.'],
    ['longo', 'Cabelo longo', 'comum', 'cabelo', { hair: 'longo' }, 'Até os ombros.'],
    ['ruivo', 'Cabelo ruivo', 'comum', 'cabelo', { hc: 3 }, 'Cor do cabelo e da barba.'],
    ['grisalho', 'Cabelo grisalho', 'comum', 'cabelo', { hc: 4 }, 'Cor do cabelo e da barba.'],
    ['cor-branco', 'Cor branca', 'comum', 'cores', { boot: 'branco' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['trancas', 'Tranças', 'raro', 'cabelo', { hair: 'trancas' }, 'Tranças rentes à cabeça.'],
    ['dreads', 'Dreads', 'raro', 'cabelo', { hair: 'dreads' }, 'Dreads soltos.'],
    ['barba-rala', 'Barba rala', 'comum', 'cabelo', { beard: 'rala' }, 'Barba curtinha, só a sombra.'],
    ['barba-bigode', 'Bigode', 'comum', 'cabelo', { beard: 'bigode' }, 'Na cor do cabelo.'],
    ['cor-vermelho', 'Cor vermelha', 'comum', 'cores', { boot: 'vermelho' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['barba-cavanhaque', 'Cavanhaque', 'raro', 'cabelo', { beard: 'cavanhaque' }, 'Bigode e queixo.'],
    ['barba-cheia', 'Barba cheia', 'raro', 'cabelo', { beard: 'cheia' }, 'O rosto todo.'],
    ['cor-neon', 'Cor verde neon', 'epico', 'cores', { boot: 'neon' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['cor-rosa', 'Cor rosa', 'epico', 'cores', { boot: 'rosa' }, 'Vale para chuteira, sola, munhequeira e faixa.'],
    ['platinado', 'Platinado', 'epico', 'cabelo', { hc: 5 }, 'Cor nova de cabelo. A sobrancelha continua escura.'],
    ['pintado', 'Cabelo pintado', 'epico', 'cabelo', { hc: 7 }, 'Rosa, azul ou verde.'],
    ['camuflada', 'Chuteira camuflada', 'epico', 'equip', { boot: 'camuflada' }, 'Estampa em três tons.'],
    ['raio', 'Chuteira de raio', 'epico', 'equip', { boot: 'raio', sole: 'amarelo' }, 'Raios amarelos sobre preto.'],
    ['tigre', 'Luva tigrada', 'epico', 'equip', { glove: 'tigre' }, 'Só para goleiro.', true],
    ['capitao', 'Faixa de capitão', 'epico', 'equip', { extra: ['capitao'] }, 'Braço esquerdo, por cima da manga.'],
    ['cor-ouro', 'Ouro', 'lendario', 'cores', { boot: 'ouro', sole: 'ouro' }, 'Chuteira e sola de ouro.'],
    ['cor-holo', 'Holográfica', 'lendario', 'cores', { boot: 'holo', sole: 'holo' }, 'Chuteira e sola que mudam de cor.'],
    ['chamas', 'Chuteira em chamas', 'lendario', 'equip', { boot: 'chamas', sole: 'preto' }, 'Chamas laranja sobre preto.'],
    ['num-ouro', 'Número dourado', 'lendario', 'numeros', { numFx: 'ouro' }, 'Vale para qualquer número.'],
    ['num-holo', 'Número holográfico', 'lendario', 'numeros', { numFx: 'holo' }, 'Vale para qualquer número.'],
  ].map(([id, name, rk, cat, look, desc, gk]) => ({ id, name, rk, cat, look, desc, gk: !!gk }));
  // Tatuagens: cada membro e cada tamanho é um item (pequena = raro, fechada = épico)
  const LIMBS = [['BD', 'braço direito'], ['BE', 'braço esquerdo'], ['PD', 'perna direita'], ['PE', 'perna esquerda']];
  [['p', 'pequena', 'Tatuagem pequena', 'raro'], ['f', 'fechado', 'Tatuagem fechada', 'epico']].forEach(([k, v, name, rk]) => LIMBS.forEach(([m, l]) =>
    CAT.push({ id: 'tat-' + k + '-' + m, name: name + ' · ' + l, rk, cat: 'tatuagem', look: { ['tat' + m]: v }, desc: v === 'pequena' ? 'Estrela e detalhes, ' + l + '.' : 'Espinhos e rosas, ' + l + ' inteiro.', limb: m })));
  const BY_ID = {};
  CAT.forEach(it => { BY_ID[it.id] = it; });
  // Números da camisa: 1 a 11, 77 e 99 são épicos; as dezenas redondas (20 a 90) raras; o resto comum
  const EPIC_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 77, 99];
  const numRar = n => (EPIC_NUMS.includes(n) ? 'epico' : n % 10 === 0 ? 'raro' : 'comum');
  for (let n = 1; n <= 99; n++) BY_ID['n' + n] = { id: 'n' + n, name: 'Número ' + n, rk: numRar(n), cat: 'num', n, desc: 'Número da camisa.' };
  const itemOf = id => BY_ID[id];

  // Que item cada valor do visual pede (null = livre)
  const FREE_COLORS = ['preto'];
  const colorItem = v => (FREE_COLORS.includes(v) || v === 'lima' ? null : BY_ID['cor-' + v] ? 'cor-' + v : null);
  const PATTERN = { camuflada: 'camuflada', raio: 'raio', chamas: 'chamas', tigre: 'tigre' };
  function need(key, v) {
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
    if (key === 'num') return 'n' + v;
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
      if (u.number) o.own['n' + u.number] = 1;
      Object.entries(u.look || {}).forEach(([k, v]) => [].concat(v).forEach(x => { const id = need(k, x); if (id) o.own[id] = 1; }));
    });
  }
  // Primeira vez: 10 números comuns sorteados + o que já foi usado
  function seed() {
    const o = { v: VER, own: {}, fichas: 0, packs: [], pity: 0, news: {}, at: Date.now() };
    grantUsed(o);
    const pool = [];
    for (let n = 1; n <= 99; n++) if (numRar(n) === 'comum' && !o.own['n' + n]) pool.push(n); // 10 números comuns
    for (let i = 0; i < 10 && pool.length; i++) o.own['n' + pool.splice(Math.floor(rnd() * pool.length), 1)[0]] = 1;
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
  const ownedNums = () => { const out = []; for (let n = 1; n <= 99; n++) if (has('n' + n)) out.push(n); return out; };
  // Número liberado mais perto do pedido (o padrão da posição, se a pessoa não tiver)
  function nearestNum(want) {
    const own = ownedNums();
    if (!own.length) return want;
    return own.reduce((b, n) => (Math.abs(n - want) < Math.abs(b - want) ? n : b), own[0]);
  }
  // Visual inicial só com o que é livre para todos
  const FREE = { hair: 'curto', hc: 0, beard: 'nenhuma', band: 'nenhuma', bandC: 'preto', boot: 'preto', sole: 'preto', sock: 'alto', sleeve: 'curta',
    wrist: 'nenhuma', wristC: 'preto', glove: 'lima', tatBD: 'nenhuma', tatBE: 'nenhuma', tatPD: 'nenhuma', tatPE: 'nenhuma', extra: [] };
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
  const visualPool = rk => CAT.filter(it => it.rk === rk && it.cat !== 'numeros');
  function numberPool(rk) {
    if (rk === 'lendario') return CAT.filter(it => it.cat === 'numeros');
    const out = [];
    for (let n = 1; n <= 99; n++) if (numRar(n) === rk) out.push(BY_ID['n' + n]);
    return out;
  }
  // Pacote: 2 peças de visual + 1 número, do mais comum para o mais raro (o melhor fica por último)
  function roll() {
    const o = get();
    const rks = [rollRar(), rollRar(), rollRar()];
    // Garantia: o 10º pacote sem lendário vira lendário numa das peças de visual
    if (!rks.includes('lendario') && o.pity >= PITY - 1) rks[0] = 'lendario';
    const items = [pickItem(visualPool(rks[0])), pickItem(visualPool(rks[1])), pickItem(numberPool(rks[2]))];
    // Num pacote, o mesmo item não sai duas vezes
    if (items[1].id === items[0].id) items[1] = pickItem(visualPool(rks[1]).filter(it => it.id !== items[0].id)) || items[1];
    const ord = RAR.indexOf.bind(RAR);
    items.sort((a, b) => ord(a.rk) - ord(b.rk));
    return items;
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
  // Prêmio direto (pênalti da sorte): um item de uma raridade, fichas ou um pacote
  function grant(kind, rk, n) {
    const o = get();
    if (kind === 'fichas') { o.fichas += n; put(); return { fichas: n }; }
    if (kind === 'pacote') { o.packs.push({ why: ['Pênalti da sorte'] }); put(); return { pacote: 1 }; }
    const it = pickItem(visualPool(rk)), dup = !!o.own[it.id];
    if (dup) o.fichas += DUP[rk]; else { o.own[it.id] = 1; o.news[it.id] = 1; }
    put();
    return { it, dup, fichas: dup ? DUP[rk] : 0 };
  }
  function trade(id) {
    const o = get(), it = BY_ID[id];
    if (!it || o.own[id] || o.fichas < COST[it.rk]) return false;
    o.fichas -= COST[it.rk]; o.own[id] = 1; o.news[id] = 1; put();
    return true;
  }
  const seen = id => { const o = get(); if (o.news[id]) { delete o.news[id]; put(); } };

  // Nuvem: itens de todos os aparelhos; contadores (fichas, pacotes, garantia) do salvo mais recente
  function merge(a, b) {
    if (!a || !b) return a || b || null;
    const newer = (b.at || 0) > (a.at || 0) ? b : a;
    return Object.assign({}, newer, { own: Object.assign({}, a.own, b.own), news: Object.assign({}, a.news, b.news) });
  }

  U.ITEMS = { FREE, KEY, CAT, BY_ID, RAR, RAR_NAME, CHANCE, PITY, DUP, COST, itemOf, need, has, get, put, ownedNums, nearestNum, numRar, clean, counts,
    earn, careerWhy, open, grant, trade, seen, merge, reset: () => { inv = null; } };
})();
