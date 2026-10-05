// Interface — temporada: contadores, revelação, jornal e resumo
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- temporada ----------
  // Os dois números da temporada que mais importam para a posição
  function seasonStats(res) {
    if (res.pos === 'GOL') return [[res.cleanSheets || 0, 'Sem sofrer'], [res.saves || 0, 'Defesas']];
    if (res.pos === 'ZAG') return [[res.goals, 'Gols'], [res.cleanSheets || 0, 'Sem sofrer']];
    return [[res.goals, 'Gols'], [res.assists, 'Assist.']];
  }

  // Pontos de evolução da temporada: desempenho (com limite) + bônus do foco nos treinos
  function peLine(pe) {
    if (!pe || (!pe.n && !(pe.train && pe.train.lost))) return '';
    const tr = pe.train, t = tr && D.TRAIN_BY_ID[tr.id];
    const base = pe.n - (tr && tr.n ? tr.n : 0), sum = pe.why.reduce((a, w) => a + w[1], 0);
    const parts = pe.why.map(w => esc(w[0]));
    if (sum > base) parts.push('máximo de ' + S.PE_CAP + ' pelo desempenho');
    if (tr && tr.lost) parts.push(t.name.toLowerCase() === 'normal' ? 'lesão: sem bônus do treino' : 'treino ' + t.name.toLowerCase() + ': a lesão tirou o bônus');
    else if (tr && tr.n) parts.push(U.emo(t.icon, 'xs') + ' treino ' + t.name.toLowerCase() + ': +' + tr.n + ' extra');
    return '<p class="pe-gain rv">' + U.emo('⭐', 'xs') + ' <b>' + (pe.n ? '+' + pe.n + (pe.n > 1 ? ' pontos' : ' ponto') + ' de evolução' : 'Nenhum ponto de evolução') + '</b> · ' + parts.join(' · ') + '</p>';
  }

  // Resenha da temporada: um programa sorteado comenta no seu estilo (D.MEDIA.shows), sobre o destaque do ano
  // (gols, assistências, idade, paredão, xerife) ou, sem destaque, sobre o ano (título, banco, lesão, nota).
  const GOAL_TALK = /\bgols?\b|gola[çc]o|dribl|pedalada|artilh/i;
  function resenha(res) {
    const shows = (D.MEDIA || {}).shows || [];
    if (!shows.length) return '';
    const cl = club(res.club);
    const ballon = res.awards.some(a => a.id === 'ballon');
    const mood = ballon ? 'ballon' : res.titles.length ? 'title' : !res.games || res.games < 10 ? 'bench' : res.injury >= 25 ? 'injury'
      : res.move && res.move.dir === 'down' ? 'down' : res.rating >= 7.6 ? 'great' : res.rating >= 7.0 ? 'good' : 'bad';
    const atk = res.pos === 'ATA' || res.pos === 'PON';
    const topic = res.games < 10 ? null : res.goals >= (atk ? 16 : 10) ? 'gols' : res.assists >= 10 ? 'assist'
      : res.pos === 'GOL' && res.cleanSheets >= 24 ? 'paredao' : res.pos === 'ZAG' && res.tackles >= 19 ? 'xerife'
      : res.age <= 20 && res.rating >= 7.2 ? 'joia' : res.age >= 33 && res.rating >= 7.0 ? 'veterano' : null;
    // Goleiro e zagueiro de poucos gols: nada de "gols", "dribla" ou "pedalada" nas falas do ano
    const noGoal = res.pos === 'GOL' || (res.pos === 'ZAG' && res.goals < 5);
    const first = Math.floor(Math.random() * shows.length);
    const nota = (Math.round(res.rating * 10) / 10).toFixed(1).replace('.', ',');
    const fill = t => t.replace(/\{n\}/g, G.c.name).replace(/\{time\}/g, cl.name).replace(/\{clube\}/g, D.o(cl.name))
      .replace(/\{Clube\}/g, D.o(cl.name).replace(/^./, ch => ch.toUpperCase())).replace(/\{campeao\}/g, D.fem(cl.name) ? 'campeã' : 'campeão').replace(/\{doTime\}/g, D.do(cl.name)).replace(/\{noTime\}/g, D.no(cl.name))
      .replace(/\{g\}/g, res.goals).replace(/\{a\}/g, res.assists).replace(/\{idade\}/g, res.age).replace(/\{nota\}/g, nota)
      .replace(/\{jogos\} jogos/g, D.plural(res.games || 0, 'jogo', 'jogos')).replace(/\{jogos\}/g, res.games || 0).replace(/\{cs\}/g, res.cleanSheets || 0).replace(/\{desarmes\}/g, res.tackles || 0);
    // Fala sorteada com memória entre carreiras (U.fresh): a mesma frase só volta depois das outras
    const say = (sh, key) => {
      let arr = sh.talk[key] && sh.talk[key].length ? sh.talk[key] : sh.talk[mood], k = 'r.' + sh.id + '.' + key;
      if (noGoal && key === mood) { const ok = arr.filter(x => !GOAL_TALK.test(x)); if (ok.length && ok.length < arr.length) { arr = ok; k += '.ng'; } }
      return fill(U.fresh ? U.fresh(k, arr) : arr[Math.floor(Math.random() * arr.length)]);
    };
    const item = (sh, q) => '<div class="rs-item"><div class="np">' + U.emo('🎙️', 'xs') + ' ' + esc(sh.who) + ' ' + esc(sh.where) + '</div><p>“' + esc(q) + '”</p></div>';
    return '<div class="news resenha rv">' + item(shows[first], say(shows[first], topic || mood)) + '</div>';
  }

  // ---------- reta final: a corrida da liga rodada a rodada ----------
  // A tabela final já sai do motor (res.table); aqui ela vira uma corrida para ver ao vivo, só quando a briga é de
  // verdade: título (campeão, ou até 3º a 6 pontos), acesso ou degola. O caminho é sorteado com semente (mesma
  // temporada, mesma corrida) e termina no resultado real. Quando o fim é apertado (até 3 pontos), a liderança
  // troca de mãos na reta final: é aí que mora o "quase".
  const RACE_AT = [0.2, 0.35, 0.5, 0.62, 0.74, 0.84, 0.92];
  function raceOf(res) {
    const tb = res.table;
    if (!tb || !tb.rounds) return null;
    const r = S.rng(((G.c && G.c.tseed) || 7) * 31 + res.age * 977 + tb.pos * 13);
    const n = tb.n, R = tb.rounds, up = res.move && res.move.dir === 'up', down = res.move && res.move.dir === 'down';
    let kind, fin;
    if (tb.pos === 1) { kind = 'title'; fin = tb.lead; }
    else if (tb.pos <= 3 && tb.gap <= 6) { kind = 'title'; fin = -tb.gap; }
    else if (tb.promo && tb.pos <= tb.promo + 2) { kind = 'acesso'; fin = up ? r.int(1, 4) : -r.int(1, 4); }
    else if (tb.releg && tb.pos >= n - tb.releg - 1) { kind = 'degola'; fin = down ? -r.int(1, 4) : r.int(1, 4); }
    else if (tb.ids && tb.all) { kind = 'meio'; fin = 0; } // meio da tabela: a posição flutua e termina na real
    else return null;
    // Lance decisivo na última rodada (título ou acesso): chegam empatados e o jogo vale os 3 pontos
    const last = (tb.m === 'title' && kind === 'title') || (tb.m === 'acesso' && kind === 'acesso');
    if (last) fin = fin > 0 ? 3 : -3;
    // Acesso e degola: com a tabela salva, a diferença sai dela (você contra o primeiro de fora ou o último de dentro);
    // 0 = decidido no saldo. inside: terminou dentro do G-acesso / fora da degola
    const L = kind === 'acesso' ? tb.promo : kind === 'degola' ? n - tb.releg : 0, inside = L ? tb.pos <= L : tb.pos === 1;
    if (L && tb.all) fin = tb.all[tb.pos - 1] - tb.all[inside ? L : L - 1];
    const rounds = RACE_AT.map(f => Math.max(1, Math.round(R * f))).concat([R - 1, R]);
    const amp = kind === 'meio' ? 5 : 3, v0 = Math.round(fin * 0.3 + r.gauss() * amp);
    const vals = rounds.map((rd, i) => {
      const f = rd / R;
      return Math.round(v0 + (fin - v0) * Math.pow(f, 1.5) + r.gauss() * (1 - f) * amp);
    });
    // Final apertado: quem ganhou estava atrás, quem perdeu estava na frente
    if (kind !== 'meio' && Math.abs(fin) <= 3 && r() < 0.75) {
      // Na penúltima rodada a troca só cabe com diferença mínima (uma rodada vale 3 pontos)
      const at = r.pick(Math.abs(fin) <= 2 ? [5, 6, 7] : [5, 6]);
      vals[at] = -Math.sign(fin) * (at === 7 ? 1 : r.int(1, 3));
      for (let i = at + 1; i < vals.length - 1; i++) vals[i] = Math.round(vals[at] + (fin - vals[at]) * (i - at) / (vals.length - 1 - at));
    }
    if (last) vals[vals.length - 2] = 0;
    vals[vals.length - 1] = fin;
    const posAt = (v, i) => {
      if (i === vals.length - 1) return tb.pos;
      const a = Math.abs(v), step = Math.floor(a / 3);
      if (kind === 'title') return v >= 0 ? 1 : Math.min(2 + step, Math.max(2, n - 1));
      if (kind === 'acesso') return v >= 0 ? Math.max(2, tb.promo - step) : Math.min(tb.promo + 1 + step, n);
      return v > 0 ? Math.max(1, n - tb.releg - step) : Math.min(n - tb.releg + 1 + step, n);
    };
    const frames = vals.map((v, i) => ({ rd: rounds[i], v, pos: posAt(v, i) }));
    // Mini tabela de cada rodada (temporadas salvas antes de tb.ids ficam só com a linha): os outros somam pontos
    // na proporção das rodadas; você fica a v pontos da referência (líder, último do G-acesso ou primeiro fora da degola)
    if (tb.ids && tb.all) {
      const me = res.club, others = tb.ids.map((id, i) => ({ id, pf: tb.all[i] })).filter(x => x.id !== me);
      const line = kind === 'title' ? 1 : kind === 'acesso' ? tb.promo : kind === 'meio' ? tb.pos : n - tb.releg;
      // Seus pontos nunca caem, sobem no máximo 3 por rodada e chegam no total real (até 3 por rodada que falta)
      const myFin = tb.all[tb.pos - 1];
      let prevPts = 0, prevRd = 0;
      frames.forEach((f, i) => {
        const last = i === frames.length - 1;
        const rows = last ? tb.ids.map((id, j) => ({ id, pts: tb.all[j], me: id === me }))
          : (() => {
            const os = others.map(x => ({ id: x.id, pts: Math.round(x.pf * f.rd / R) })).sort((a, b) => b.pts - a.pts);
            const ref = os[Math.min(os.length - 1, line - 1)].pts;
            const lo = Math.max(prevPts, myFin - 3 * (R - f.rd)), hi = Math.min(myFin, prevPts + 3 * (f.rd - prevRd));
            const mine = { id: me, pts: Math.max(lo, Math.min(hi, ref + f.v)), me: true };
            f.v = mine.pts - ref;
            const at = os.findIndex(x => x.pts < mine.pts || (x.pts === mine.pts && f.v >= 0));
            os.splice(at < 0 ? os.length : at, 0, mine);
            return os;
          })();
        rows.forEach((x, j) => { x.pos = j + 1; });
        f.rows = rows;
        f.pos = rows.find(x => x.me).pos;
        f.lead = rows[0].me ? 0 : rows[0].pts - rows.find(x => x.me).pts;
        f.line = line;
        prevPts = rows.find(x => x.me).pts; prevRd = f.rd;
      });
    }
    // Para o veredito: até quando liderou (vice) ou quando saiu da zona (escapou)
    let lastLead = 0, leftZone = 0, wasBehind = false;
    frames.forEach((f, i) => {
      if (i < frames.length - 1 && f.v > 0) lastLead = f.rd;
      if (i > 0 && f.v > 0 && frames[i - 1].v <= 0) leftZone = f.rd;
      if (i >= 4 && i < frames.length - 1 && f.v < 0) wasBehind = true;
    });
    return { kind, fin, R, frames, lastLead, leftZone, wasBehind, last, inside, pos: tb.pos, promo: tb.promo, pts: tb.pts, gap: tb.gap };
  }

  function raceLabel(rc, v, f) {
    const p = n => D.plural(Math.abs(n), 'ponto', 'pontos');
    if (rc.kind === 'meio') return f.lead ? 'A ' + p(f.lead) + ' do líder' : 'Na liderança';
    if (rc.kind === 'title') return v > 0 ? 'Lidera por ' + p(v) : v === 0 ? 'Empatado com o líder' : 'A ' + p(v) + ' do líder';
    if (rc.kind === 'acesso') return v > 0 ? p(v) + ' acima da zona de acesso' : v === 0 ? 'Empatado na briga pelo acesso' : 'A ' + p(v) + ' da zona de acesso';
    return v > 0 ? p(v) + ' acima da degola' : v === 0 ? 'Empatado com a zona da degola' : 'Na zona da degola, a ' + p(v) + ' de sair';
  }

  function raceVerdict(rc) {
    const a = Math.abs(rc.fin), p = D.plural(a, 'ponto', 'pontos');
    if (rc.kind === 'meio') return [rc.pos + 'º lugar com ' + D.plural(rc.pts, 'ponto', 'pontos') + ', a ' + rc.gap + ' do líder.', 'mid'];
    if (rc.kind === 'title') {
      if (rc.pos === 1) return [rc.last ? 'Título decidido na última rodada!' : a <= 3 ? 'Campeão por ' + p + '!' + (rc.wasBehind ? ' Virada na reta final.' : '') : 'Campeão com ' + p + ' de vantagem', 'win'];
      if (rc.pos === 2) return [rc.last ? 'O título escapou na última rodada.' : 'Vice por ' + p + '.' + (rc.lastLead >= rc.R * 0.5 ? ' Liderou até a rodada ' + rc.lastLead + '.' : ''), 'miss'];
      return [rc.pos + 'º lugar, a ' + p + ' do título.', 'miss'];
    }
    const by = a ? 'por ' + p : 'no saldo de gols';
    if (rc.kind === 'acesso') return rc.inside ? [rc.last ? 'Acesso garantido na última rodada!' : 'Acesso garantido ' + by + '!', 'win'] : ['O acesso escapou ' + by + '.', 'miss'];
    return rc.inside ? ['Escapou da degola ' + by + '!' + (rc.leftZone >= rc.R * 0.6 ? ' Saiu da zona na rodada ' + rc.leftZone + '.' : ''), 'win'] : ['Rebaixado ' + by + '.', 'miss'];
  }

  // Desenha a corrida até a fração u (0 a 1); em 1, mostra o veredito
  // Quatro linhas da tabela em volta do que está em jogo (topo, corte do acesso ou da degola), sempre com você;
  // a linha tracejada marca o corte. Times de fora da lista (id 0, completam ligas pequenas) não aparecem.
  function miniTable(rc, f) {
    const real = f.rows.filter(x => x.id);
    const n = f.rows.length, a = rc.kind === 'meio' ? Math.max(1, Math.min(f.pos - 1, n - 3)) : Math.max(1, f.line - (rc.kind === 'title' ? 0 : 1)), b = a + 3;
    let rows = real.filter(x => x.pos >= a && x.pos <= b);
    if (!rows.some(x => x.me)) rows = rows.slice(0, 3).concat(real.filter(x => x.me));
    const cut = rc.kind === 'title' || rc.kind === 'meio' ? 0 : f.line;
    return '<div class="rc-tbl">' + rows.map((x, i) => (i && x.pos - rows[i - 1].pos > 1 ? '<div class="rt-gap">⋯</div>' : '') +
      '<div class="rt-r' + (x.me ? ' me' : '') + (x.pos === cut ? ' cut' : '') + (rc.kind === 'title' && x.pos === 1 ? ' top' : '') + '"><i>' + x.pos + '</i>' + crest(x.id, 'xs') +
      '<span>' + esc(club(x.id).name) + '</span><b>' + x.pts + '</b></div>').join('') + '</div>';
  }
  // (o primeiro quadro da animação pode chegar com u < 0: o relógio do quadro é anterior ao início)
  function drawRace(rc, u) {
    const el = $('race');
    if (!el) return;
    const k = Math.max(0, Math.min(rc.frames.length - 1, Math.floor(u * (rc.frames.length - 1) + 1e-9))), f = rc.frames[k], end = u >= 1;
    const vs = rc.frames.map(x => x.v), hi = Math.max(3, ...vs.map(Math.abs));
    // Raiz no eixo: as diferenças pequenas (1 a 3 pontos), que são o que importa, ficam visíveis
    const X = i => 4 + (i / (rc.frames.length - 1)) * 232, Y = v => 22 - Math.sign(v) * Math.sqrt(Math.abs(v) / hi) * 18;
    const pts = rc.frames.slice(0, k + 1).map((x, i) => X(i).toFixed(1) + ',' + Y(x.v).toFixed(1)).join(' ');
    const tone = f.v > 0 ? 'up' : f.v < 0 ? 'down' : 'zero';
    const vd = end ? raceVerdict(rc) : null;
    el.className = 'race ' + rc.kind + (end ? ' end ' + vd[1] : '');
    el.innerHTML = '<div class="rc-top"><span class="rc-rd">' + (end ? 'Fim da liga' : 'Rodada ' + f.rd + ' de ' + rc.R) + '</span><b class="rc-pos">' + f.pos + 'º</b></div>' +
      (f.rows ? miniTable(rc, f) : '<svg class="rc-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="240" y1="22" y2="22"/><polyline points="' + pts + '"/>' +
      '<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(f.v).toFixed(1) + '" r="3.5"/></svg>') +
      '<p class="rc-lbl ' + tone + '">' + (end ? esc(vd[0]) : esc(raceLabel(rc, f.v, f))) + '</p>';
  }

  // Etiqueta do papel: o prometido pelo clube, ou o que de fato aconteceu quando quase não jogou (lesão, técnico, escolhas)
  function roleSeen(res) {
    const sh = res.src && res.src.max ? res.games / res.src.max : 1;
    return sh >= 0.3 || res.role === 'Banco' || res.role === 'Reserva' ? res.role : sh >= 0.15 ? 'Reserva' : 'Banco';
  }
  function season() {
    const res = S.playSeason(G.c);
    U.rankSave(G.c); // ranking: nota máxima, gols e títulos já contam durante a carreira
    sfx('whistle');
    // Em ano de Copa com convocação, fechar o jogo no resumo não pula a Copa
    G.step = S.isWcYear(G.c) && G.c.wcYearDone !== year() && S.wcCall(G.c).called ? 'wc'
      : S.isCwcYear(G.c) && G.c.cwcYearDone !== year() && S.cwcCall(G.c).called ? 'cwc' : S.windowOpen(G.c) ? 'offers' : 'preseason';
    save();
    const cl = club(res.club);
    const [c1, c2] = seasonStats(res);
    const t0c = tierCls(res.ovr0);
    const race = raceOf(res);
    res.race = race ? race.kind : false;
    render(
      '<div class="season-head"><div><div class="eyebrow">Temporada ' + (year() - 1) + ' · ' + res.age + ' anos</div><h2 class="with-crest">' + crest(cl.id, 'lg') + esc(cl.name) + '</h2></div><span class="tag">' + (res.farewell ? 'Despedida' : roleSeen(res)) + '</span></div>' +
      // A carta no centro: a nota sobe (ou cai) depois dos números da temporada
      '<div class="s-hero"><div class="scard metal ' + t0c + '" id="scard"><span class="sc-tier" id="sc-tier">' + TIER_NAME[t0c] + '</span><b id="sc-ovr">' + res.ovr0 + '</b><span class="sc-pos">' + G.c.pos + '</span></div>' +
      '<div class="s-verdict"><span class="sv-lbl" id="sv-lbl">&nbsp;</span><i class="sv-d" id="sc-d"></i></div></div>' +
      '<div class="counters"><div class="counter"><b id="k-j">0</b><span>Jogos</span></div><div class="counter"><b id="k-g">0</b><span>' + c1[1] + '</span></div>' +
      '<div class="counter"><b id="k-a">0</b><span>' + c2[1] + '</span></div><div class="counter rate"><b id="k-n">–</b><span>Nota</span></div></div>' +
      (race ? '<div class="race" id="race"></div>' : '') +
      '<div class="feed" id="feed"></div><div id="after"></div><p class="skip-hint" id="skip-hint">Toque para pular</p>'
    );
    // Com reta final, a temporada dura um pouco mais: a tabela precisa de tempo para virar
    const few = res.src && res.src.max && res.games / res.src.max < 0.15; // do banco não há o que contar: a tela não se arrasta
    const dur = few ? (race ? 1400 : 800) : race ? (race.kind === 'meio' ? 2200 : 2800) : 1500, t0 = performance.now();
    let skip = !!U.cfg.fast, shown = [0, 0, 0]; // configuração: resumo rápido
    // Liga o "pular" só depois: o toque que abriu esta tela ainda está se propagando
    setTimeout(() => { screen.onclick = () => { skip = true; }; }, 50);
    (function tick(now) {
      if (!$('k-j')) return; // saiu da tela durante a contagem (voltou ao início): nada mais a desenhar
      const u = skip ? 1 : Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2);
      const now3 = [Math.round(res.games * e), Math.round(c1[0] * e), Math.round(c2[0] * e)];
      // Cada gol/assistência que entra faz um "tic"
      if (!skip && (now3[1] > shown[1] || now3[2] > shown[2])) sfx('tick');
      shown = now3;
      $('k-j').textContent = now3[0]; $('k-g').textContent = now3[1]; $('k-a').textContent = now3[2];
      if (race) drawRace(race, u);
      if (u < 1) return requestAnimationFrame(tick);
      if (race && !skip) { const vd = raceVerdict(race); if (vd[1] === 'win' && race.kind !== 'title') sfx('levelup'); if (vd[1] === 'win') U.vibe(25); }
      $('k-n').textContent = res.games ? res.rating.toFixed(1).replace('.', ',') : '–';
      $('k-n').parentNode.classList.add('pop');
      const v = verdictOf(res);
      $('sv-lbl').textContent = v[0]; $('sv-lbl').className = 'sv-lbl ' + v[1];
      cardRise(res, skip);
      // Títulos, Bola de Ouro e acesso ganham tela cheia antes do resumo
      const big = bigMoments(res);
      if (big.length && !skip) { res.celebrated = true; screen.onclick = null; setTimeout(() => celebrate(big, () => summary(res, false)), 700); }
      else summary(res, skip);
    })(t0);
  }

  function bigMoments(res) {
    // Tela cheia só para taça grande (liga e continental); copa nacional, supercopa, segunda continental e
    // Intercontinental ficam no resumo: quando toda taça ganha festa, nenhuma vale muito
    const out = res.titles.filter(t => t.id === 'league' || t.id === 'cont').map(t => ({ art: trophy(titleType(t), 150, t.name), top: 'Campeão!', name: t.name }));
    if (res.awards.some(a => a.id === 'ballon')) out.push({ art: trophy('ballon', 150), top: 'O melhor do mundo', name: 'Bola de Ouro' });
    if (res.move && res.move.dir === 'up') out.push({ art: '<div class="bm-emoji">' + U.emo('⬆️', 'lg') + '</div>', top: 'Acesso!', name: D.O(club(res.club).name) + ' sobe ' + D.paraA(res.move.toName) });
    return out;
  }

  // Tela cheia de comemoração: taça grande, confete e fanfarra (toque passa)
  function celebrate(list, done) {
    const w = document.createElement('div');
    w.className = 'bigmoment';
    document.body.appendChild(w);
    let i = 0, tmr = 0, ending = false;
    const colors = ['#F4D675', '#FFFFFF', '#5FD690', '#FF8A93', '#7AC7FF'];
    const confetti = Array.from({ length: 36 }, (_, k) => '<i style="left:' + ((k * 37) % 100) + '%;background:' + colors[k % 5] + ';animation-delay:' + ((k * 0.13) % 1.2).toFixed(2) + 's;animation-duration:' + (1.6 + (k % 5) * 0.25).toFixed(2) + 's"></i>').join('');
    const show = () => {
      // Fim da fila só uma vez: toque duplo na saída montava o resumo duas vezes (destaque repetido)
      if (i >= list.length) { if (ending) return; ending = true; w.onclick = null; clearTimeout(tmr); w.classList.add('out'); return setTimeout(() => { w.remove(); done(); }, 250); }
      const m = list[i++];
      w.innerHTML = '<div class="bm-confetti">' + confetti + '</div><div class="bm-in"><div class="bm-art">' + m.art + '</div><span class="bm-top">' + esc(m.top) + '</span><b class="bm-name">' + esc(m.name) + '</b><small>Toque para continuar</small></div>';
      sfx('fanfare');
      U.vibe([30, 40, 30]);
      clearTimeout(tmr); tmr = setTimeout(show, 2600);
    };
    w.onclick = show;
    show();
  }

  // Selo da temporada pela nota
  function verdictOf(res) {
    if (!res.games) return ['Sem jogos', 'low'];
    if (res.src && res.src.max && res.games / res.src.max < 0.15) return ['Quase não jogou', 'low']; // 2 jogos não fazem temporada
    const r = res.rating;
    return r >= 8 ? ['Temporada de craque', 'top'] : r >= 7.3 ? ['Grande temporada', 'good'] : r >= 6.8 ? ['Boa temporada', 'ok'] : r >= 6.3 ? ['Temporada regular', 'mid'] : ['Temporada apagada', 'low'];
  }

  // A nota da carta conta de ovr0 até ovr1; se mudar de faixa, o metal troca na hora
  function cardRise(res, skip) {
    const el = $('scard'), num = $('sc-ovr'), d = res.ovr1 - res.ovr0, t1 = tierCls(res.ovr1);
    const finish = () => {
      if (!el.isConnected) return;
      num.textContent = res.ovr1;
      $('sc-d').textContent = d > 0 ? '+' + d : d < 0 ? String(d) : '=';
      $('sc-d').className = 'sv-d ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'zero');
      if (t1 !== tierCls(res.ovr0)) { el.className = 'scard metal ' + t1 + ' tierup'; $('sc-tier').textContent = TIER_NAME[t1]; }
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      if (d > 0) { sfx('levelup'); U.vibe(25); }
    };
    if (skip || !d) return finish();
    const t0 = performance.now(), ms = Math.min(900, 180 * Math.abs(d));
    (function step(now) {
      if (!el.isConnected) return;
      const u = Math.min(1, (now - t0) / ms);
      num.textContent = Math.round(res.ovr0 + d * u);
      if (u < 1) requestAnimationFrame(step); else finish();
    })(t0);
  }

  // Jornal da temporada (a capa em si fica em ui/paper.js)
  function lede(res, cl) {
    const tb = res.table;
    const pos = tb.pos === 1 ? 'terminou campeão ' + D.da(tb.league) : 'terminou em ' + tb.pos + 'º lugar ' + D.na(tb.league);
    const perf = !res.games ? G.c.name + ' quase não entrou em campo, e ' + D.o(cl.name) + ' ' + pos + '.'
      : res.rating >= 7.5 && tb.pos >= 11 ? G.c.name + ' foi o nome ' + D.do(cl.name) + ', mas o time não acompanhou e ' + pos + '.'
      : res.rating >= 7.5 ? G.c.name + ' foi o nome ' + D.do(cl.name) + ', que ' + pos + '.'
      : res.rating >= 6.8 ? 'Com atuações seguras de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.'
      : 'Em temporada irregular de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.';
    return perf + (res.titles.length ? ' A torcida comemorou ' + res.titles.map(t => t.name).join(' e ') + '.' : '');
  }
  function showPaper(res, onClose) {
    // Temporada sem notícia: o jornal não sai (a manchete fica só no resumo); cartas reveladas seguem valendo
    if (res.quiet) {
      const up = U.tierReveal(G.c, res.ovr0, res.ovr1); if (up) save();
      const list = (up ? [null] : []).concat(res.cards || []);
      return list.length ? U.walkouts(G.c, list, onClose) : onClose && onClose();
    }
    const cl = club(res.club), [main, ...rest] = res.headlines, nick = G.c.name;
    // Foto da capa conforme a temporada: taça, maca (lesão), comemoração ou pose normal
    const won = res.titles.length || res.awards.some(a => a.id === 'ballon');
    const pose = won ? 'taca' : res.injury >= 25 ? 'maca' : res.games && res.rating >= 7.3 ? 'celebra' : res.games && res.rating < 6.3 ? 'triste' : 'normal';
    const caption = { taca: nick + ' ergue a taça', maca: nick + ' deixa o campo de maca', celebra: nick + ' comemora com a torcida', triste: nick + ' cabisbaixo após mais um tropeço' }[pose] || nick + ' com a camisa ' + D.do(cl.name);
    U.paper({ c: Object.assign({}, G.c, { age: res.age }), year: year() - 1, head: main, pose, kit: U.kitOf(cl.id), caption, big: !!won,
      stats: D.plural(res.games, 'jogo', 'jogos') + ' · ' + seasonStats(res).map(([v, l]) => (l === 'Gols' ? D.plural(v, 'gol', 'gols') : l === 'Assist.' ? D.plural(v, 'assistência', 'assistências') : l === 'Defesas' ? D.plural(v, 'defesa', 'defesas') : v + ' ' + l.toLowerCase())).join(' · ') + (res.games ? ' · nota ' + res.rating.toFixed(1).replace('.', ',') : ''),
      lede: lede(res, cl), subs: rest, column: res.column },
      // Depois do jornal: revelação da carta nova (subiu de faixa) e das cartas especiais da temporada
      () => { const up = U.tierReveal(G.c, res.ovr0, res.ovr1); if (up) save(); U.walkouts(G.c, (up ? [null] : []).concat(res.cards || []), onClose); });
  }

  // Mostra os blocos do resumo um de cada vez (troféus com mais destaque). Tocar mostra tudo.
  function reveal(skipNow, res) {
    const items = Array.from(screen.querySelectorAll('.rv'));
    let i = 0, timer = null, paper = false;
    const done = () => { screen.onclick = null; const h = $('skip-hint'); if (h) h.remove(); };
    // O jornal aparece uma vez por temporada, mesmo se a pessoa pular o resto
    const all = () => {
      clearTimeout(timer); items.forEach(el => el.classList.add('in')); done();
      if (!paper) { paper = true; showPaper(res); }
    };
    if (skipNow) return all();
    screen.onclick = all;
    (function next() {
      if (i >= items.length) return done();
      if (!items[0].isConnected) return; // já saiu desta tela
      const el = items[i++];
      el.classList.add('in');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if ((el.classList.contains('title-won') || el.classList.contains('ballon')) && !res.celebrated) sfx('fanfare');
      else if (el.classList.contains('move-line') && el.classList.contains('up')) sfx('levelup');
      else if (el.classList.contains('wc-call')) sfx('levelup');
      if (el.classList.contains('news') && !paper) {
        paper = true;
        screen.onclick = null;
        return setTimeout(() => { if (el.isConnected) showPaper(res, () => { screen.onclick = all; timer = setTimeout(next, 200); }); }, 300);
      }
      timer = setTimeout(next, el.classList.contains('title-won') ? 900 : el.classList.contains('award') ? 700 : el.classList.contains('hl') ? 450 : 220);
    })();
  }

  function summary(res, skipNow) {
    const feed = $('feed');
    if (!feed || !G.c) return; // a tela do resumo já não está aberta (ex.: voltou ao início durante a comemoração)
    // Só o lance mais marcante na tela; os outros ficam nos detalhes
    res.highlights.slice(0, 1).forEach(h => { const d = document.createElement('div'); d.className = 'rv hl'; d.textContent = h; feed.appendChild(d); });
    const dOvr = res.ovr1 - res.ovr0;
    const fin = S.mustRetire(G.c);
    const tb = res.table;
    // Com reta final na tela, a linha da tabela já está lá em cima (o veredito da corrida)
    const tableTxt = !res.games || res.race ? '' : tb.pos === 1 ? U.emo('🥇', 'sm') + ' Campeão ' + D.da(tb.league) + ' com ' + tb.pts + ' pontos'
      : tb.pos + 'º lugar ' + D.na(tb.league) + ' · ' + tb.pts + ' pts, a ' + tb.gap + ' do líder';
    // Acesso e rebaixamento: com a mini tabela na tela, o veredito dela já conta
    // (com a mini tabela de título ou meio da tabela, o acesso ou a queda ainda precisam aparecer)
    const moveTxt = !res.move || res.race === 'acesso' || res.race === 'degola' || res.race === true ? '' : res.move.dir === 'up' ? U.emo('⬆️', 'sm') + ' Acesso ' + D.paraA(res.move.toName) + '!' : U.emo('⬇️', 'sm') + ' Rebaixado ' + D.paraA(res.move.toName);
    // O que mexeu na nota: minutos, desempenho, lesão, idade e treinos (a soma bate com a variação)
    const great = res.games >= 15 && res.rating >= 7.5;
    const why = (great && dOvr <= 0 ? '<p class="why-note">Grande temporada! Seu desempenho valeu ' + ((v => (v > 0 ? '+' : '') + v)((res.why.find(w => w.k === 'perf') || { v: 0 }).v)) + ' na nota' + (res.ovr0 >= G.c.pot - 3 ? ', mas você já está perto do seu teto' : '') + '. Também rendeu fama, torcida e propostas melhores.</p>' : '') +
      (res.why.length ? '<ul class="why">' + res.why.map(w => '<li><span>' + esc(w.txt) + '</span><b class="' + (w.pot ? 'pot' : w.potDown ? 'down' : w.note ? 'note' : w.v > 0 ? 'up' : w.v < 0 ? 'down' : 'zero') + '">' + (w.pot ? 'teto ↑' : w.potDown ? 'teto ↓' : w.note ? U.emo('ℹ️', 'xs') : (w.v > 0 ? '+' : w.v < 0 ? '' : '±') + w.v) + '</b></li>').join('') + '</ul>' : '');
    const open = S.windowOpen(G.c);
    const contractTxt = G.c.contract > 0 ? 'Contrato: mais ' + G.c.contract + (G.c.contract > 1 ? ' temporadas' : ' temporada') + ' ' + D.no(esc(club(G.c.club).name)) : 'Seu contrato acabou: hora de decidir o futuro';
    // Copa do Mundo: convocação logo depois da temporada, em ano de Copa
    const wcNow = S.isWcYear(G.c) && G.c.wcYearDone !== year();
    const call = wcNow ? S.wcCall(G.c) : null;
    let wcBlock = '';
    if (call && call.called) wcBlock = '<div class="wc-call rv"><span class="wc-flag">' + U.flag(call.nation.flag) + '</span><div><b>Convocado para a Copa do Mundo ' + year() + '!</b><span>' + (call.starter ? 'Titular da seleção' : 'Vai como reserva (nota perto do corte de ' + call.cut + ')') + '</span></div></div>';
    else if (call && call.retired) { wcBlock = '<p class="wc-miss rv">' + U.emo('👋', 'sm') + ' Copa de ' + year() + ' sem você, que já se despediu da seleção.</p>'; G.c.wcYearDone = year(); save(); }
    else if (call && G.c.age >= 18) { wcBlock = '<p class="wc-miss rv">' + U.emo('🌍', 'sm') + ' Fora da Copa de ' + year() + ': ' + (S.ovr(G.c) >= call.cut ? 'aos ' + G.c.age + ' anos, a seleção preferiu apostar na nova geração.' : 'a seleção pedia nota ' + call.cut + ', você tem ' + S.ovr(G.c) + '.') + '</p>'; G.c.wcYearDone = year(); save(); }
    // Mundial de Clubes (a cada 4 anos): o clube classificado joga logo depois da temporada
    const cwcCall = S.isCwcYear(G.c) && G.c.cwcYearDone !== year() ? S.cwcCall(G.c) : null;
    if (cwcCall && cwcCall.called) wcBlock = '<div class="wc-call rv">' + crest(cwcCall.club.id, 'lg') + '<div><b>' + D.O(esc(cwcCall.club.name)) + ' está no Mundial de Clubes ' + year() + '!</b><span>' + (cwcCall.champ ? 'Vaga de campeão continental' : 'Vaga pelo ranking de clubes') + ' · 32 clubes, jogo a jogo</span></div></div>';
    else if (cwcCall) { G.c.cwcYearDone = year(); save(); }
    const goCwc = !!(cwcCall && cwcCall.called);
    const goWc = call && call.called;
    const goTour = goWc || goCwc, tourIntro = goWc ? U.wcIntro : U.cwcIntro;
    const tourLbl = goWc ? 'Copa do Mundo ' + year() + ' ' + U.emo('🌍', 'sm') : 'Mundial de Clubes ' + year() + ' ' + U.emo('🌐', 'sm');
    let actions;
    const pctx = { kind: fin ? 'farewell' : 'season', res };
    if (fin) actions = '<p class="lead">' + (res.farewell ? 'Fim da temporada de despedida. Hora de pendurar as chuteiras.' : (G.c.age >= S.RETIRE_AGE ? 'Aos ' + G.c.age + ' anos, o corpo pediu para parar.' : S.ovr(G.c) < S.RETIRE_OVR ? 'Com a carta em ' + S.ovr(G.c) + ', nenhum clube quis renovar. Hora de pendurar as chuteiras.' : 'Aos ' + G.c.age + ' anos, o corpo já não acompanha a cabeça: a carta caiu de ' + G.c.peak + ' para ' + S.ovr(G.c) + '. Hora de pendurar as chuteiras.')) + '</p><button class="btn" id="b-next">' + (goTour ? 'Última dança: ' + tourLbl : 'Ver sua carreira') + '</button>' + U.postBtn(pctx);
    else {
      actions = '<button class="btn" id="b-next">' + (goTour ? 'Jogar ' + (goWc ? 'a ' : 'o ') + tourLbl : open ? 'Janela de transferências' : 'Próxima temporada') + '</button>' + U.postBtn(pctx);
      // Sinal do fim: mais uma queda como a desta temporada e a carreira acaba (dá tempo de anunciar a despedida)
      if (S.nearRetire(G.c, dOvr)) actions = '<p class="wc-miss rv">' + U.emo('⏳', 'sm') + ' O corpo dá sinais: mais uma queda como esta e a carreira acaba. Pode ser a hora de anunciar a última temporada.</p>' + actions;
      if (S.canAnnounce(G.c)) actions += '<button class="btn ghost" id="b-farewell">Anunciar a última temporada<small>Torcida +10 (+5 com o post) e mais minutos · parar em alta rende pontos extras</small></button>';
      if (S.canRetire(G.c)) actions += '<button class="btn ghost" id="b-stop">Parar agora</button>';
    }
    // De onde vieram os números: minutos, gols (ou jogos sem sofrer gol) e nota, com o peso de cada parte
    const srcBlock = (() => {
      const sc = res.src;
      if (!sc) return '';
      const num = (v, dec) => (dec ? v.toFixed(1).replace('.', ',') : String(v));
      const chip = (t, v, unit, sign) => '<span class="sr-c' + (!v || !sign ? '' : v > 0 ? ' up' : ' down') + '">' + esc(t) +
        (v ? ' <b>' + (sign && v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), unit === '') + unit + '</b>' : '') + '</span>';
      const row = (lbl, val, chips) => '<div class="sr-row"><span class="sr-l">' + lbl + ' <b>' + val + '</b></span><div class="sr-cs">' + chips + '</div></div>';
      const gk = res.pos === 'GOL';
      return '<div class="src-card rv">' +
        row('Minutos', res.games + ' de ' + sc.max + ' jogos', sc.min.map((x, i) => chip(x[0], x[1], '%', i > 0)).join('')) +
        (res.games ? row(gk ? 'Sem sofrer gol' : 'Gols', gk ? res.cleanSheets : res.goals, sc.gol.map((x, i) => chip(x[0], x[1], '%', true)).join('')) : '') +
        (sc.nota.length ? row('Nota', res.rating.toFixed(1).replace('.', ','), sc.nota.map((x, i) => chip(x[0], x[1], '', i > 0)).join('')) : '') +
        '</div>';
    })();
    $('after').innerHTML =
      srcBlock +
      (tableTxt ? '<p class="table-line rv">' + tableTxt + '</p>' : '') +
      (moveTxt ? '<div class="move-line rv ' + res.move.dir + '">' + moveTxt + '</div>' : '') +
      (res.loanBack ? '<p class="contract rv">Fim do empréstimo: você volta ' + D.ao(esc(club(res.loanBack.to).name)) + '.</p>' : '') +
      (res.titles.length ? '<div class="titles">' + res.titles.map(t => '<div class="title-won rv">' + trophy(titleType(t), 60, t.name) + '<span>Campeão<br><b>' + esc(t.name) + '</b></span></div>').join('') + '</div>' : '') +
      '<div class="awards">' + res.awards.map(a => '<div class="award rv' + (a.id === 'ballon' ? ' ballon' : '') + '">' + (a.id === 'ballon' ? trophy('ballon', 44) + ' ' : U.emo('🥇', 'sm') + ' ') + a.name + '</div>').join('') + '</div>' +
      '<div class="news rv"><div class="np">' + U.emo('📰', 'xs') + ' Nos jornais</div><p>' + esc(res.headlines[0] || '') + '</p></div>' +
      resenha(res) +
      // Rival de geração (engine/rival.js): o que ele fez no ano e o duelo com você
      (res.rival ? '<p class="rival-line rv' + (res.rival.tookBallon || res.rival.ballon ? ' hot' : '') + '">' + U.emo('⚔️', 'xs') + ' ' + esc(S.rivalLine(G.c, res)) + '</p>' : '') +
      wcBlock +
      // Detalhes (fechados): outros lances, o porquê da nota, técnico/torcida e contrato
      // Craque carregando um time fraco (a partir do 2º ano) e o clube crescendo com ele
      (res.carry >= 1 || res.grow ? '<p class="star-line rv">' + U.emo('💪', 'xs') + ' ' + (res.carry >= 1 ? 'Você carregou o time: <b>+' + res.carry + ' de força</b> nos jogos' : '') +
        (res.grow ? (res.carry >= 1 ? '. ' : '') + 'Com você, ' + D.o(esc(res.grow.name)) + ' se reforçou: força <b>' + res.grow.from + ' → ' + res.grow.to + '</b>' : '') + '</p>' : '') +
      // Pontos de evolução ganhos nesta temporada (e por quê)
      peLine(res.pe) +
      '<details class="more rv"><summary>Detalhes da temporada</summary>' +
      res.highlights.slice(1).map(h => '<div class="hl">' + esc(h) + '</div>').join('') +
      '<div class="card why-card"><p class="delta-in ' + (dOvr >= 0 ? 'up' : 'down') + '">Nota geral ' + res.ovr0 + ' → ' + res.ovr1 + ' (' + (dOvr >= 0 ? '+' : '') + dOvr + ')</p>' + why + '</div>' +
      '<p class="rel-delta">' + U.emo('👔', 'xs') + ' Técnico ' + res.coach0 + ' → ' + res.coach1 + ' · ' + U.emo('📣', 'xs') + ' Torcida ' + res.fans0 + ' → ' + res.fans1 + ' (' + S.relLabel(res.fans1) + ')</p>' +
      (fin ? '' : '<p class="contract">' + contractTxt + '</p>') + '</details>' + '<div class="rv">' + actions + '</div>';
    bar();
    reveal(skipNow, res);
    U.tip('resumo');
    // Depois do resumo: as taças da temporada entram na Sala de Troféus (sem tela extra; a taça já aparece no resumo)
    const goOn = () => { U.salaRecord(G.c); (goTour ? tourIntro : afterSeason)(); };
    $('b-next').onclick = goOn;
    // Postar nas redes: o post e as reações, e depois segue o mesmo caminho
    U.postBind(pctx, goOn);
    // Anunciar a última temporada já sai como post
    if ($('b-farewell')) $('b-farewell').onclick = () => { S.announce(G.c); save(); bar(); U.socialPost({ kind: 'announce' }, () => goTour ? tourIntro() : U.preseason()); };
    if ($('b-stop')) $('b-stop').onclick = U.finale;
  }

  // Para onde ir depois da temporada (e da Copa, se houver)
  function afterSeason() {
    if (S.mustRetire(G.c)) return U.finale();
    if (S.windowOpen(G.c)) return U.windowOffers();
    return S.benchCase(G.c) ? U.squad() : U.preseason();
  }

  Object.assign(U, { celebrate, season, lede, showPaper, reveal, summary, afterSeason });
})();
