// Rival de geração: um jogador da mesma idade e da mesma posição que faz a carreira dele em paralelo.
// Ele cresce, troca de clube, ganha taças e disputa com você a Bola de Ouro (engine/season.js chama S.rivalWinsVote).
// Usa um sorteio próprio (rv.seed): a carreira dele nunca mexe nos sorteios da sua.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const DEF = p => D.DEF_POS.includes(p);

  // Força do rival a cada idade: sobe até o teto até os 27, fica até os 30 e cai depois (um pouco mais devagar que a sua)
  const DECL = a => (a <= 30 ? 0 : a <= 32 ? 2.5 : a <= 34 ? 4.5 : a <= 36 ? 6.5 : 8);

  function pickClub(rv, r) {
    const pool = D.CLUBS.filter(x => x.strength <= rv.ovr + 2 && x.strength >= rv.ovr - 7 && (rv.age >= 30 || !D.MONEY.includes(x.league)));
    const home = pool.filter(x => D.LEAGUE_BY_ID[x.league].country === rv.country);
    const list = (rv.age <= 19 && home.length ? home : pool).sort((a, b) => b.strength - a.strength).slice(0, 8);
    if (!list.length) return D.CLUBS.slice().sort((a, b) => Math.abs(a.strength - rv.ovr + 4) - Math.abs(b.strength - rv.ovr + 4))[0];
    return list[Math.floor(r() * r() * list.length)]; // os mais fortes da faixa saem mais
  }

  S.rivalInit = function (c) {
    if (c.rival || !c.club) return c.rival;
    const r = S.rng(((c.tseed || 1) ^ 0x51DE) >>> 0);
    const names = Object.keys(D.DAILY_NAMES);
    const country = names.includes(c.country) && r() < 0.5 ? c.country : names[Math.floor(r() * names.length)];
    const pool = D.DAILY_NAMES[country].filter(n => n !== c.name);
    const rv = c.rival = {
      name: pool[Math.floor(r() * pool.length)], country, pos: c.pos, age: c.age, seed: r.state(),
      ovr: S.ovr(c) + r.int(-2, 3), pot: r.int(83, 94), club: null, contract: 0, retired: false,
      totals: { games: 0, goals: 0, assists: 0, cs: 0, titles: 0, ballon: 0 }, seasons: [], peak: 0,
    };
    rv.peak = rv.ovr;
    return rv;
  };

  // Antes da sua temporada: o rival evolui, troca de clube se precisar e joga a temporada dele
  S.rivalPre = function (c) {
    const rv = S.rivalInit(c);
    if (!rv || rv.retired) { if (rv) rv.now = null; return; }
    const r = S.rng(rv.seed);
    const a = rv.age;
    if (a > 16) rv.ovr += a <= 27 ? Math.max(0, rv.pot - rv.ovr) * 0.2 + r.gauss() * 1.2 : a <= 30 ? r.gauss() * 0.8 : -DECL(a) + r.gauss() * 0.8;
    rv.ovr = clamp(rv.ovr, 40, 97);
    const o = Math.round(rv.ovr);
    rv.peak = Math.max(rv.peak, o);
    let cl = rv.club && D.CLUB_BY_ID[rv.club];
    if (!cl || rv.contract <= 0 || o - cl.strength >= 9 || cl.strength - o >= 4) { cl = pickClub({ ovr: o, age: a, country: rv.country }, r); rv.club = cl.id; rv.contract = r.int(2, 4); }
    rv.contract--;
    const starter = o >= cl.strength - 1;
    const games = Math.round((starter ? 40 : 24) + r.int(0, 10));
    let goals = 0, assists = 0, cs = 0;
    if (rv.pos === 'ATA') { goals = Math.round(games * Math.max(0.06, (o - 50) * 0.02) * S.GOAL_SCALE * (0.85 + r() * 0.3)); assists = Math.round(goals * 0.35); }
    else if (rv.pos === 'MEI') { assists = Math.round(games * Math.max(0.05, (o - 50) * 0.012) * S.GOAL_SCALE * (0.85 + r() * 0.3)); goals = Math.round(assists * 0.5); }
    else { cs = Math.round(games * clamp(0.22 + (o - 70) * 0.012, 0.1, 0.55)); goals = rv.pos === 'ZAG' ? r.int(0, 5) : 0; }
    const top = Math.max(...D.CLUBS.filter(x => x.league === cl.league).map(x => x.strength));
    // Taças: força do clube mais o que ele carrega (mesma ideia da sua temporada, mais simples)
    const sEff = cl.strength + Math.max(0, o - cl.strength) * 0.3;
    let titles = 0;
    const league = r() < clamp(0.05 + (sEff - top + 5) / 16, 0.02, 0.42);
    if (league) titles++;
    if (r() < clamp(0.04 + (sEff - top + 5) / 22, 0.01, 0.28)) titles++;
    if (cl.tier >= 4 && r() < clamp((sEff - 80) / 40, 0.01, 0.2)) titles++;
    if (league && r() < 0.35) titles++; // supercopa
    // Candidato à Bola de Ouro: nível de craque num clube grande e uma temporada à altura
    const contender = cl.tier >= 4 && o >= 86;
    const claim = contender && r() < clamp((o - 85) * 0.06, 0, 0.36) * (DEF(rv.pos) ? 0.45 : 1);
    rv.now = { age: a, club: cl.id, ovr: o, games, goals, assists, cs, titles, contender, claim, ballon: false };
    rv.seed = r.state();
  };

  // Você ganhou a votação e ele estava na briga (craque num clube grande): quem leva? Sorteio do rival, puxado pela
  // diferença de nível e por ele ter feito o ano da vida dele (claim)
  S.rivalWinsVote = function (c, o) {
    const rv = c.rival, now = rv && rv.now;
    if (!now || !now.contender) return false;
    const r = S.rng(rv.seed);
    const win = r() < clamp((now.claim ? 0.4 : 0.2) + (now.ovr - o) * 0.08, 0.05, 0.75) * (DEF(rv.pos) ? 0.6 : 1);
    rv.seed = r.state();
    return win;
  };

  // Depois da sua temporada: fecha a temporada dele, compara com a sua e envelhece
  S.rivalPost = function (c, res) {
    const rv = c.rival, now = rv && rv.now;
    if (!now) return;
    const youBallon = res.awards.some(a => a.id === 'ballon');
    now.ballon = (now.claim || !!res.ballonLost) && !youBallon;
    const T = rv.totals;
    T.games += now.games; T.goals += now.goals; T.assists += now.assists; T.cs += now.cs; T.titles += now.titles; T.ballon += now.ballon ? 1 : 0;
    rv.seasons.push(now);
    const cl = D.CLUB_BY_ID[now.club], yours = D.CLUB_BY_ID[res.club];
    res.rival = Object.assign({ name: rv.name, country: rv.country, pos: rv.pos, first: rv.seasons.length === 1,
      sameClub: now.club === res.club, sameLeague: !!cl && !!yours && cl.league === yours.league && now.club !== res.club,
      tookBallon: !!res.ballonLost, beatHim: youBallon && now.contender }, now);
    rv.age++;
    if (rv.age >= 39 || (rv.age >= 34 && (rv.ovr < 72 || S.rng(rv.seed)() < (rv.age - 33) * 0.15))) { rv.retired = true; res.rival.retires = true; }
    rv.now = null;
  };

  // A sua temporada passa a incluir a dele
  const play = S.playSeason;
  S.playSeason = function (c) {
    S.rivalPre(c);
    const res = play(c);
    S.rivalPost(c, res);
    return res;
  };

  // Texto curto do duelo no fim da temporada (ui/season.js)
  S.rivalLine = function (c, res) {
    const x = res.rival;
    if (!x) return '';
    const cl = D.CLUB_BY_ID[x.club];
    const stat = x.pos === 'ATA' ? D.plural(x.goals, 'gol', 'gols') : x.pos === 'MEI' ? D.plural(x.assists, 'assistência', 'assistências') : D.plural(x.cs, 'jogo sem sofrer gol', 'jogos sem sofrer gol');
    const base = x.name + ' (' + (cl ? cl.name : '') + ') · carta ' + x.ovr + ' · ' + stat + (x.titles ? ' · ' + D.plural(x.titles, 'taça', 'taças') : '');
    const tag = x.tookBallon ? 'tirou a Bola de Ouro de você na votação'
      : x.ballon ? 'ganhou a Bola de Ouro'
      : x.beatHim ? 'você bateu ele na votação da Bola de Ouro'
      : x.sameClub ? 'agora vocês jogam juntos'
      : x.sameLeague ? 'duelo na mesma liga: ' + (x.pos === 'ATA' ? res.goals + ' gols seus contra ' + x.goals : x.pos === 'MEI' ? res.assists + ' assistências suas contra ' + x.assists : res.cleanSheets + ' jogos sem sofrer gol seus contra ' + x.cs)
      : x.retires ? 'anunciou a aposentadoria' : '';
    return (x.first ? 'Seu rival de geração: ' : 'Rival: ') + base + (tag ? ' · ' + tag : '');
  };

  // Balanço da rivalidade no fim da carreira (ui/finale.js)
  S.rivalSummary = function (c, titles) {
    const rv = c.rival;
    if (!rv || !rv.seasons.length) return null;
    const T = c.totals, R = rv.totals, def = DEF(c.pos);
    const rows = [[def ? 'Jogos sem sofrer gol' : c.pos === 'MEI' ? 'Assistências' : 'Gols', def ? T.cs || 0 : c.pos === 'MEI' ? T.assists : T.goals, def ? R.cs : c.pos === 'MEI' ? R.assists : R.goals],
      ['Títulos', titles, R.titles], ['Bolas de Ouro', T.ballon, R.ballon], ['Melhor carta', c.peak, rv.peak]];
    return { name: rv.name, country: rv.country, rows, retired: rv.retired };
  };

  // ---------- decisões com o rival ----------
  const P = S.chance, X = S.ctx;
  const risk = (label, p, win, lose) => ({ label, p, win, lose });
  const out = (tag, fx, txt) => ({ tag, fx, txt });
  const safe = (label, fx, txt) => ({ label, safe: { fx, txt } });
  const active = c => !!c.rival && !c.rival.retired && c.rival.seasons.length >= 2;
  if (S.addStake) {
    S.addStake({ id: 'rival_provoca', icon: '⚔️', tone: 'red', weight: 5, max: 2, when: c => active(c) && c.age >= 19 }, {
      build: c => ({ title: c.rival.name + ' provocou', text: 'Na entrevista depois do jogo, ' + c.rival.name + ' disse que você "é bom, mas não decide". O vídeo já tem milhões de visualizações.' }),
      options: c => [risk('Responder na mesma moeda', P(0.5, X.t(c, 'estrela', 0.15), X.edge(c, 0.02)),
          out('a resposta viraliza', { fame: 10, form: 0.06, fans: 6 }, 'Sua resposta foi mais vista que a provocação. E você ainda jogou com raiva boa.'),
          out('vira novela', { fame: 6, form: -0.06, coach: -6 }, 'A troca de farpas virou novela. O técnico pediu foco e o seu jogo sentiu.')),
        safe('Responder só em campo', { form: 0.03 }, '"Eu respondo jogando." A imprensa achou maduro.')],
    });
    S.addStake({ id: 'rival_numeros', icon: '📈', tone: 'blue', weight: 4, max: 2,
      when: c => active(c) && c.age >= 21 && c.age <= 27 && c.rival.seasons[c.rival.seasons.length - 1].ovr > S.ovr(c) + 2 }, {
      build: c => ({ title: c.rival.name + ' está na sua frente', text: 'A comparação está em todo lugar: ' + c.rival.name + ' tem carta ' + c.rival.seasons[c.rival.seasons.length - 1].ovr + ' e você, ' + S.ovr(c) + '. A cobrança chegou até o seu treino.' }),
      options: c => [risk('Treinar dobrado para alcançar', P(0.4, X.t(c, 'pro', 0.15), X.young(c, 0.05)),
          out('a diferença cai', { main: 1, form: 0.03 }, 'Treino extra todo dia. A diferença para ele caiu, e todo mundo percebeu.'),
          out('o corpo cobra', { inj: 0.2, form: -0.06 }, 'Exagerou na carga para correr atrás dele. Lesão muscular e semanas fora.')),
        safe('Seguir no seu ritmo', { form: 0.03 }, '"Cada um tem o seu tempo." Você seguiu o plano.')],
    });
  }

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
