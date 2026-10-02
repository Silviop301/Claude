// Motor do CRAQUE — núcleo: sorteio com semente, jogador, características, investimentos,
// papel no elenco, relação com clube e divisões. Sem DOM: roda no navegador e no Node.
// As outras partes (engine/*.js) acrescentam funções ao mesmo objeto S.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = {};

  // ---------- aleatoriedade com semente (permite "carreira do dia" no futuro) ----------
  S.rng = function (seed) {
    let a = seed >>> 0;
    const r = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    r.poisson = l => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= r(); } while (p > L); return k - 1; };
    r.state = () => a;
    return r;
  };

  // ---------- divisões: cada carreira guarda quem subiu e quem caiu (c.leagueOf) ----------
  D.CLUBS.forEach(cl => { if (!cl.league0) { cl.league0 = cl.league; cl.strength0 = cl.strength; } });
  S.applyLeagues = function (c) {
    const m = (c && c.leagueOf) || {}, f = (c && c.clubBoost) || {};
    const st = (c && c.starBoost) || {};
    D.CLUBS.forEach(cl => { cl.league = m[cl.id] || cl.league0; cl.strength = cl.strength0 + (f[cl.id] || 0) + (st[cl.id] || 0); });
  };
  // Efeito do craque no clube: com nota 10+ acima do elenco e a partir do 2º ano no clube, cada boa temporada
  // dá +1 de força (+2 se for brilhante), até +6 e sem passar de 3 abaixo da nota dele.
  // Quando ele sai, o clube perde 1 por temporada.
  S.STAR_MAX = 6; S.STAR_GAP = 10;
  S.starGrowth = function (c, club, o, games, rating, ok) {
    const sb = c.starBoost = c.starBoost || {};
    Object.keys(sb).forEach(id => { if (id !== club.id && sb[id] > 0) { sb[id]--; if (!sb[id]) delete sb[id]; } });
    let grow = null;
    const cur = sb[club.id] || 0;
    if (ok && games >= 20 && rating >= 7.0 && o - club.strength >= S.STAR_GAP && cur < S.STAR_MAX) {
      const n = Math.min(rating >= 7.8 && o - club.strength >= 12 ? 2 : 1, S.STAR_MAX - cur, Math.max(0, o - 3 - club.strength));
      if (n > 0) { sb[club.id] = cur + n; grow = { from: club.strength, to: club.strength + n, name: club.name }; }
    }
    S.applyLeagues(c);
    return grow;
  };
  function moveClub(c, club, to) {
    const from = club.league;
    const pool = D.CLUBS.filter(x => x.league === to);
    // Mantém o tamanho das ligas: o mais fraco de cima desce (ou o mais forte de baixo sobe)
    const up = D.LADDER[from] && D.LADDER[from].up === to;
    const partner = pool.slice().sort((a, b) => up ? a.strength - b.strength : b.strength - a.strength)[0];
    c.leagueOf = c.leagueOf || {};
    c.clubBoost = c.clubBoost || {};
    // Quem sobe investe (+4 de força); quem cai perde elenco (−3)
    c.clubBoost[club.id] = clamp((c.clubBoost[club.id] || 0) + (up ? 4 : -3), -6, 8);
    c.leagueOf[club.id] = to;
    if (partner) c.leagueOf[partner.id] = from;
    S.applyLeagues(c);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round1 = v => Math.round(v * 10) / 10;

  // ---------- jogador ----------
  // c.attrs guarda a base (treino e idade); as características somam por cima.
  // A carta mostra sempre a soma (S.eff).
  const ovrOf = (attrs, pos) => {
    const w = D.POS[pos].w;
    let o = 0;
    for (const k in w) o += attrs[k] * w[k];
    return Math.round(o);
  };
  S.ovrOf = ovrOf;

  // Pontos que um conjunto de características (com níveis) soma em cada atributo
  // Toda característica, qualquer que seja, também soma pontos nos 2 atributos principais da posição
  // (+1 por nível no principal, +1 a cada 2 níveis no segundo)
  // (escolher sempre deixa a carta mais forte; o que diferencia uma da outra é o efeito)
  S.mainAttrs = pos => Object.keys(D.POS[pos].w).sort((a, b) => D.POS[pos].w[b] - D.POS[pos].w[a]).slice(0, 2);
  S.bonusOf = function (traits, lv, pos) {
    const b = {};
    D.ATTRS.forEach(k => { b[k] = 0; });
    if (pos) {
      const levels = traits.reduce((n, id) => n + (lv[id] || 1), 0);
      const [m1, m2] = S.mainAttrs(pos);
      b[m1] += levels; b[m2] += Math.floor(levels / 2);
    }
    traits.forEach(id => {
      const t = D.TRAIT_BY_ID[id], m = D.TRAIT_LV[lv[id] || 1];
      for (const k in t.attr) b[k] += Math.round(t.attr[k] * m);
    });
    D.SYNERGIES.forEach(s => {
      if (traits.includes(s.a) && traits.includes(s.b)) for (const k in s.attr) b[k] += s.attr[k];
    });
    return b;
  };

  // Atributos da posição, do mais importante para o menos
  S.attrOrder = pos => Object.keys(D.POS[pos].w).sort((a, b) => D.POS[pos].w[b] - D.POS[pos].w[a]);
  // Atributo que recebe o que passar do 99 (o mais importante da posição que ainda está abaixo de 99)
  S.spillTo = (c, E) => S.attrOrder(c.pos).find(k => (E || S.eff(c))[k] < 99) || null;
  S.SPILL = 0.5; // metade: com o excedente todo, a nota S ia de 15% para 25% das carreiras
  const effOf = (c, traits, lv, inv) => {
    const b = S.bonusOf(traits, lv, c.pos), out = {};
    inv = inv || c.inv || {};
    D.INVEST.forEach(t => { if (t.attr && inv[t.id]) for (const k in t.attr) b[k] += t.attr[k] * inv[t.id]; });
    // Marcas das decisões (engine/stakes.js): o que um evento deu ou tirou fica para sempre, fora do teto
    if (c.xb) for (const k in c.xb) b[k] += c.xb[k];
    // Ponto de bônus que passaria do 99 não se perde todo: cada 2 acima do 99 viram 1 no atributo mais importante da posição abaixo de 99
    let extra = 0;
    D.ATTRS.forEach(k => { const v = Math.round(c.attrs[k]) + b[k]; extra += Math.max(0, v - 99); out[k] = clamp(v, 20, 99); });
    extra = Math.floor(extra * S.SPILL);
    for (const k of S.attrOrder(c.pos)) { if (extra <= 0) break; const add = Math.min(extra, 99 - out[k]); out[k] += add; extra -= add; }
    return out;
  };
  S.eff = c => effOf(c, c.traits, c.traitLv || {});
  S.ovr = c => ovrOf(S.eff(c), c.pos);
  // Taças de clube na carreira (liga, copa, continental, Intercontinental e Mundial de Clubes)
  S.titleCount = T => T.league + T.cup + T.cont + (T.inter || 0) + (T.cwc || 0);

  // Como a carta fica depois de uma escolha: { add, remove, up } (ids de características)
  S.preview = function (c, ch) {
    let traits = c.traits.slice();
    const lv = Object.assign({}, c.traitLv);
    if (ch.remove) { traits = traits.filter(x => x !== ch.remove); delete lv[ch.remove]; }
    if (ch.add) { traits.push(ch.add); lv[ch.add] = 1; }
    if (ch.up) lv[ch.up] = (lv[ch.up] || 1) + 1;
    const inv = Object.assign({}, c.inv);
    if (ch.buy) inv[ch.buy] = (inv[ch.buy] || 0) + 1;
    const attrs = effOf(c, traits, lv, inv);
    return { attrs, ovr: ovrOf(attrs, c.pos) };
  };

  // Potencial (teto): começa perto para todos e é construído em campo até os 28 anos.
  // Temporada com minutos e nota boa eleva o teto; temporada fraca na juventude derruba um pouco.
  S.POT0 = r => Math.round(64 + 6 * r());
  // Deslocamento da nota por posição: sem ele, a nota média era ATA 7,96 · GOL 7,50 · MEI 7,41 · ZAG 7,26, e tudo que
  // usa limiar de nota (Seleção da liga, pontos de evolução, título, despedida, Bola de Ouro) favorecia o atacante
  S.RATING_ADJ = { ATA: -0.15, MEI: 0.2, ZAG: 0.1, GOL: 0 };
  // Potencial: compara com a nota típica da posição (já descontado o deslocamento acima, para o teto não mudar)
  const POT_ADJ = { ATA: -0.3, MEI: -0.2, ZAG: 0, GOL: 0 };
  S.potDelta = function (c, games, rating) {
    if (c.age > 28 || games < 15) return 0;
    const x = rating + (POT_ADJ[c.pos] || 0);
    // Quanto mais alto o teto, mais difícil subir ainda mais
    const hard = c.pot >= 92 ? 2 : c.pot >= 85 ? 1 : 0;
    const up = x >= 8.0 ? 4 : x >= 7.8 ? 3 : x >= 7.5 ? 2 : x >= 7.2 ? 1 : 0;
    if (up) return Math.max(up >= 3 ? 1 : 0, up - hard);
    if (c.age <= 25) return x < 6.5 ? -2 : x < 6.9 ? -1 : 0;
    return 0;
  };

  S.newCareer = function (opts, seed) {
    S.applyLeagues(null); // carreira nova: divisões originais
    const r = S.rng(seed || (Date.now() ^ 0x5EED));
    const base = r.int(44, 52);
    const attrs = {};
    D.ATTRS.forEach(k => { attrs[k] = clamp(base + r.int(-6, 6), 30, 70); });
    // Atributos principais da posição começam maiores; defesa começa baixa (mais ainda no atacante)
    if (opts.pos === 'ATA') { attrs.fin += 4; attrs.rit += 3; attrs.dri += 2; attrs.def -= 16; }
    else if (opts.pos === 'MEI') { attrs.pas += 4; attrs.dri += 2; attrs.def -= 8; }
    else if (opts.pos === 'ZAG') { attrs.def += 6; attrs.fis += 4; attrs.fin -= 12; attrs.dri -= 6; }
    else { attrs.fin += 4; attrs.def += 3; attrs.fis += 2; attrs.rit -= 6; } // goleiro: REF, POS, ELA
    D.ATTRS.forEach(k => { attrs[k] = clamp(attrs[k], 20, 72); });
    return {
      v: 2, seed: r.state(), tseed: r.state(), // tseed: fixo, só para variar os textos entre carreiras
      name: opts.name, pos: opts.pos, foot: opts.foot, country: opts.country, number: opts.number || D.POS_NUM[opts.pos] || 10,
      age: 16, season: 0, attrs,
      pot: S.POT0(r), // teto escondido: começa numa faixa estreita e sobe (ou cai) com o que ele faz em campo
      traits: [], club: null, clubSince: 0, firstClub: null,
      fame: 0, money: 0, wage: 0,
      mod: { min: 0, form: 0, inj: 0, goal: 0, assist: 0 },
      rel: { coach: 50, fans: 50 }, fansBy: {}, captain: false, renew: 0, wantsOut: false,
      totals: { games: 0, goals: 0, assists: 0, league: 0, cup: 0, cont: 0, ballon: 0, scorer: 0, young: 0, team: 0 },
      spells: [], seasons: [], peak: 0, retired: false, trophies: {},
      traitLv: {}, contract: 0, farewell: false, peakAttrs: null,
      inv: {}, pe: S.PE_START, buys: 0, leagueOf: {}, clubBoost: {},
    };
  };

  // Frase de uma lista (manchete, cronista, destaque). Na mesma carreira, roda a lista sem repetir; cada carreira
  // começa num ponto diferente. No navegador, ui/social.js liga S.TEXT_PICK: memória entre carreiras (a frase só
  // volta depois que as outras saíram). Não usa o sorteio do jogo, então não muda nenhum resultado.
  const hstr = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  S.textAt = (c, key, n, used) => (S.TEXT_PICK ? S.TEXT_PICK(key, n) % n : (hstr(String(c.tseed != null ? c.tseed : c.name + c.pos + c.country) + '|' + key) + (used || 0)) % n);
  // Destaques: contador próprio por tipo (guardado na carreira)
  S.textPick = (c, key, arr) => { const u = (c.txtUsed = c.txtUsed || {}); const i = S.textAt(c, key, arr.length, u[key] || 0); u[key] = (u[key] || 0) + 1; return arr[i]; };
  const rngOf = c => {
    const r = S.rng(c.seed);
    return { r, save: () => { c.seed = r.state(); } };
  };

  // ---------- características e sinergias ----------
  S.synergies = function (c) {
    return D.SYNERGIES.filter(s => c.traits.includes(s.a) && c.traits.includes(s.b));
  };

  S.MAX_SLOTS = 5;
  S.MAX_LV = 3;
  const lvOf = (c, id) => (c.traitLv && c.traitLv[id]) || 1;

  // Força do efeito de uma característica: 0 se não tem; 1 / 1,8 / 2,6 conforme o nível
  S.tm = (c, id) => (c.traits.includes(id) ? D.TRAIT_LV[lvOf(c, id)] : 0);
  // Profissional envelhece mais devagar
  S.declMult = c => 1 - 0.25 * S.tm(c, 'pro');

  const completesSyn = (c, id, without) => D.SYNERGIES.find(s => {
    const has = x => c.traits.includes(x) && x !== without;
    return (s.a === id && has(s.b)) || (s.b === id && has(s.a));
  }) || null;

  // Escolhas da pré-temporada (4 opções). Com espaço livre: características novas e às vezes evoluir uma.
  // Com os 5 espaços cheios: só evoluir as suas. Tudo no nível máximo: build completo (lista vazia).
  S.CHOICES = 4;
  S.buildDone = c => c.traits.length >= S.MAX_SLOTS && c.traits.every(id => lvOf(c, id) >= S.MAX_LV);
  S.traitChoices = function (c) {
    const { r, save } = rngOf(c);
    const out = [];
    const full = c.traits.length >= S.MAX_SLOTS;
    // Características com efeito até certa idade (Rato de Academia, até os 24) saem do sorteio quando já não rendem:
    // nova só com pelo menos duas temporadas de efeito pela frente; evoluir só enquanto ainda vale.
    // Patriota não rende mais depois da despedida da seleção
    const live = (id, seasons) => { const t = D.TRAIT_BY_ID[id]; return (!t.until || c.age + seasons - 1 <= t.until) && !(id === 'patriota' && c.natRetired); };
    const upPool = c.traits.filter(id => lvOf(c, id) < S.MAX_LV && live(id, 1));
    const newPool = D.TRAITS.filter(t => !c.traits.includes(t.id) && D.traitFits(t, c.pos) && live(t.id, 2));
    const pushUp = () => {
      const left = upPool.filter(id => !out.some(o => o.trait.id === id));
      if (!left.length) return false;
      const id = r.pick(left);
      out.push({ type: 'up', trait: D.TRAIT_BY_ID[id], lv: lvOf(c, id) + 1, completes: null });
      return true;
    };
    const pushNew = () => {
      const left = newPool.filter(t => !out.some(o => o.trait.id === t.id));
      if (!left.length) return false;
      // Tende a oferecer o par de uma sinergia que você já começou
      const partners = left.filter(t => completesSyn(c, t.id));
      const t = partners.length && r() < 0.6 ? r.pick(partners) : r.pick(left);
      out.push({ type: 'new', trait: t, lv: 1, completes: completesSyn(c, t.id) });
      return true;
    };
    if (!full) {
      const ups = c.traits.length >= 2 && r() < 0.6 ? 1 : 0;
      for (let i = 0; i < ups; i++) pushUp();
      while (out.length < S.CHOICES && pushNew()) { /* completa com novas */ }
    } else {
      while (out.length < S.CHOICES && pushUp()) { /* só evoluções */ }
    }
    save();
    return out;
  };

  // Opções da pré-temporada guardadas na própria carreira: recarregar a página mostra as mesmas
  // (sortear de novo avançaria a semente e trocaria as opções). Valem só para a temporada em que saíram.
  S.seasonChoices = function (c) {
    const k = c.season + '/' + c.age;
    if (!c.preCh || c.preCh.k !== k) c.preCh = { k, list: S.traitChoices(c).map(x => [x.type, x.trait.id, x.lv]), done: false };
    if (c.preCh.done) return [];
    return c.preCh.list.filter(([, id]) => D.TRAIT_BY_ID[id])
      .map(([type, id, lv]) => ({ type, trait: D.TRAIT_BY_ID[id], lv, completes: type === 'new' ? completesSyn(c, id) : null }));
  };

  // Adiciona característica nova (substituindo outra se os espaços estiverem cheios).
  S.addTrait = function (c, id, replaceId) {
    if (c.traits.includes(id)) return null;
    if (replaceId) {
      c.traits = c.traits.filter(x => x !== replaceId);
      delete c.traitLv[replaceId];
    }
    if (c.traits.length >= S.MAX_SLOTS) return null;
    c.traits.push(id);
    c.traitLv[id] = 1;
    return S.synergies(c).find(s => s.a === id || s.b === id) || null;
  };

  S.upgradeTrait = function (c, id) {
    if (!c.traits.includes(id) || lvOf(c, id) >= S.MAX_LV) return false;
    c.traitLv[id] = lvOf(c, id) + 1;
    return true;
  };
  S.traitLevel = lvOf;

  // ---------- investimentos (pontos de evolução) ----------
  // Cada temporada rende pontos pelo que você fez em campo; o dinheiro fica para o patrimônio e os eventos.
  // Cada melhoria custa o seu nível em pontos (1º nível 1 ponto, 2º 2 pontos... até 5);
  // efeitos sem atributo (fisioterapia) custam o dobro.
  S.PE_START = 2; // o garoto chega ao profissional com 2 pontos
  S.PE_CAP = 2; // no máximo 2 por temporada
  S.investPrice = (c, id) => ((c.inv[id] || 0) + 1) * (D.INVEST_BY_ID[id].attr ? 1 : 2);
  S.investMax = id => D.INVEST_BY_ID[id].max || D.INVEST_MAX;
  // Treino de atributo que já está no 99 não se compra (o ponto não teria onde entrar)
  S.investCapped = (c, id) => { const t = D.INVEST_BY_ID[id], E = S.eff(c); return !!t.attr && Object.keys(t.attr).every(k => E[k] >= 99); };
  S.canInvest = (c, id) => (c.inv[id] || 0) < S.investMax(id) && (c.pe || 0) >= S.investPrice(c, id) && !S.investCapped(c, id);
  S.PE_R1 = 7.4; S.PE_R2 = 8.2; // nota para ganhar 1 ou 2 pontos
  S.trainOf = c => D.TRAIN_BY_ID[c.train] || D.TRAIN_BY_ID.normal;
  // Foco nos treinos automático pela idade (a tela não pede mais essa escolha): jovem treina forte, veterano poupa o corpo
  S.autoTrain = c => (c.age <= 27 ? 'forte' : c.age <= 31 ? 'normal' : 'leve');
  S.canInvestAny = c => D.INVEST.some(t => S.canInvest(c, t.id));
  // Pontos da temporada: jogar, jogar bem, ganhar
  S.peGain = function (s) {
    const why = [];
    if (s.rating >= S.PE_R1) why.push(['Nota ' + s.rating.toFixed(1).replace('.', ','), s.rating >= S.PE_R2 ? 2 : 1]);
    if (s.titles.length) why.push([s.titles.length > 1 ? s.titles.length + ' títulos' : 'Título', 1]);
    if (s.awards.length) why.push([s.awards.some(a => a.id === 'ballon') ? 'Bola de Ouro' : 'Prêmio individual', 1]);
    return { n: Math.min(S.PE_CAP, why.reduce((a, w) => a + w[1], 0)), why };
  };
  S.invest = function (c, id) {
    if (!S.canInvest(c, id)) return false;
    const p = S.investPrice(c, id);
    c.pe -= p; c.peSpent = (c.peSpent || 0) + p; c.buys++;
    c.inv[id] = (c.inv[id] || 0) + 1;
    if (!c.firstBuyAge) c.firstBuyAge = c.age;
    return true;
  };

  // ---------- papel no elenco ----------
  S.role = function (c, club) {
    const diff = S.ovr(c) - club.strength;
    if (diff >= 5) return { id: 'abs', name: 'Titular absoluto', share: 0.92 };
    if (diff >= 1) return { id: 'tit', name: 'Titular', share: 0.78 };
    if (diff >= -3) return { id: 'rod', name: 'Rodízio', share: 0.55 };
    if (diff >= -7) return { id: 'res', name: 'Reserva', share: 0.3 };
    return { id: 'banco', name: 'Banco', share: 0.12 };
  };

  // Copa nacional: todos os clubes do país (todas as divisões), do mais forte ao mais fraco
  const cupCache = {};
  S.cupField = function (club) {
    const ct = D.countryOf(club);
    return cupCache[ct] || (cupCache[ct] = D.CLUBS.filter(x => D.countryOf(x) === ct).sort((a, b) => b.strength - a.strength).map(x => x.id));
  };
  S.cupTop = club => D.CLUB_BY_ID[S.cupField(club)[0]].strength;

  S.wage = function (c, club) {
    const lg = D.LEAGUE_BY_ID[club.league];
    const base = D.TIERS[club.tier].wage * (lg.wageMult || 1);
    const k = clamp(1 + (S.ovr(c) - club.strength) / 20 + c.fame / 400, 0.4, 3);
    return Math.round(base * k * (1 + 0.25 * S.tm(c, 'estrela')) / 100) * 100; // Estrela ganha mais
  };

  // ---------- relação com clube: Técnico e Torcida (0-100) ----------
  const REL0 = 50;
  // Fama: nível, efeito na seleção e texto (aparece na barra e na janela de transferências)
  S.FAME_LV = [[250, 'Lenda'], [150, 'Astro'], [80, 'Famoso'], [30, 'Conhecido'], [0, 'Anônimo']];
  S.fameLabel = f => S.FAME_LV.find(([v]) => f >= v)[1];
  S.fameCut = f => (f >= 150 ? 1 : 0); // Astro: a seleção convoca com nota 1 abaixo
  S.relLabel = v => (v >= 80 ? 'Idolatria' : v >= 62 ? 'Em alta' : v >= 40 ? 'Neutra' : v >= 25 ? 'Em baixa' : 'Crise');
  function bump(c, key, v) { c.rel[key] = clamp(c.rel[key] + v, 0, 100); }

  // Ajudantes usados pelas outras partes do motor
  // Cartas especiais ganhas na carreira (Seleção da Temporada, Herói da Final, Copa do Mundo, Bola de Ouro).
  // Guardam a foto do momento: nota, atributos e clube daquele ano. O texto do rodapé vem pronto.
  // Chance de a carta sair quando a condição é cumprida (quanto mais rara, menor) e no máximo 4 por carreira
  S.CARD_DROP = { tots: 0.05, heroi: 0.1, mundial: 0.12, muralha: 0.04, xerife: 0.06, joia: 0.25, lenda: 0.03,
    chuteira: 0.1, garcom: 0.08, copa: 0.12, bola: 0.12, triplice: 0.12, perfeita: 0.1 };
  S.CARD_MAX = 2;
  S.dropCard = function (c, type, txt) {
    const cards = c.cards || [];
    if (cards.length >= S.CARD_MAX || cards.some(k => k.type === type)) return null;
    // Sorteio próprio (não mexe no sorteio da temporada): mesma carreira, mesmo resultado
    const h = [...(type + ':' + c.season + ':' + c.name + ':' + (c.totals.games || 0))].reduce((a, ch) => Math.imul(a ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
    if (S.rng(h)() >= (S.CARD_DROP[type] || 0.3)) return null;
    return S.addCard(c, type, txt);
  };
  S.addCard = function (c, type, txt) {
    c.cards = c.cards || [];
    const card = { type, season: c.season, age: c.age, ovr: S.ovr(c), attrs: S.eff(c), club: c.club, txt };
    c.cards.push(card);
    return card;
  };

  // Rival de clássico na mesma divisão (D.RIVALS); sem clássico, um rival fixo de força parecida.
  // pick: sorteia entre os rivais (o lance do clássico); sem pick, o maior deles (conta de "freguês")
  S.derbyOf = function (club, pick) {
    const same = (D.RIVALS[club.id] || []).map(id => D.CLUB_BY_ID[id]).filter(x => x && x.league === club.league);
    if (same.length) return pick ? pick(same) : same.sort((a, b) => b.strength - a.strength)[0];
    const pool = D.CLUBS.filter(x => x.league === club.league && x.id !== club.id)
      .sort((a, b) => Math.abs(a.strength0 - club.strength0) - Math.abs(b.strength0 - club.strength0) || (a.id < b.id ? -1 : 1));
    return pool[0] || null;
  };
  S._ = { clamp, round1, rngOf, lvOf, bump, REL0, moveClub, ovrOf };

  root.CRAQUE_SIM = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
