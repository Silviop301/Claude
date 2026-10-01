// Interface — jornal: capa da temporada e edições extras, foto ilustrada (cores do clube) e coluna do cronista
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, esc, YEAR0 } = U;

  // Jornais inventados; um sorteado a cada edição (nunca o mesmo duas vezes seguidas)
  const PAPERS = [
    { name: 'Gazeta da Bola', motto: 'O jornal de quem vive futebol' },
    { name: 'Diário do Craque', motto: 'Desde a várzea até a Europa' },
    { name: 'Tribuna Esportiva', motto: 'A voz da arquibancada' },
    { name: 'O Placar', motto: 'Resultado é o que importa' },
    { name: 'Folha do Gramado', motto: 'Notícia com cheiro de grama' },
    { name: 'Jornal da Arquibancada', motto: 'Opinião de torcedor' },
  ];
  let lastPaper = '';

  // Camisas das seleções (para a foto da Copa)
  const NATION_KIT = {
    'Brasil': ['#F7D117', '#1B8A3A'], 'Argentina': ['#8CC8F0', '#FFFFFF'], 'Uruguai': ['#5DA9E9', '#111111'], 'Colômbia': ['#F7D117', '#1C3F94'],
    'Portugal': ['#C8102E', '#0B6B3A'], 'Espanha': ['#C8102E', '#F7D117'], 'Inglaterra': ['#FFFFFF', '#1C2E5E'], 'Itália': ['#1F5FB4', '#FFFFFF'],
    'Alemanha': ['#FFFFFF', '#111111'], 'França': ['#1C2E5E', '#FFFFFF'], 'Holanda': ['#F36C21', '#FFFFFF'], 'Bélgica': ['#C8102E', '#111111'],
    'Croácia': ['#FFFFFF', '#C8102E'], 'Marrocos': ['#C8102E', '#0B6B3A'], 'Suíça': ['#C8102E', '#FFFFFF'], 'Dinamarca': ['#C8102E', '#FFFFFF'],
    'Japão': ['#1C3F94', '#FFFFFF'], 'EUA': ['#FFFFFF', '#1C2E5E'], 'México': ['#0B6B3A', '#FFFFFF'], 'Equador': ['#F7D117', '#1C3F94'],
    'Senegal': ['#FFFFFF', '#0B6B3A'], 'Sérvia': ['#C8102E', '#1C3F94'], 'Polônia': ['#FFFFFF', '#C8102E'], 'Coreia do Sul': ['#C8102E', '#111111'],
    'Nigéria': ['#0B8A3A', '#FFFFFF'], 'Austrália': ['#F7D117', '#0B6B3A'], 'Canadá': ['#C8102E', '#FFFFFF'], 'Camarões': ['#0B8A3A', '#C8102E'],
    'Gana': ['#FFFFFF', '#111111'], 'Irã': ['#FFFFFF', '#C8102E'], 'Tunísia': ['#C8102E', '#FFFFFF'], 'Arábia Saudita': ['#0B8A3A', '#FFFFFF'],
  };
  const kitOf = clubId => (window.CRAQUE_KITS || {})[clubId] || ['#E6E6E6', '#1B1A17'];
  const nationKit = name => NATION_KIT[name] || ['#FFFFFF', '#1B1A17'];

  // Visual do jogador: desenho em src/avatar.js (prancha "Criação do personagem"). Carreiras antigas
  // (sem visual ou com os 5 tons de pele de antes) são convertidas lá.
  const A = window.ClimbixAvatar;
  const { SKIN, HAIR_COLORS, HAIRS, BEARDS } = A;
  const photo = (pose, kit, c, opts) => A.photo(pose, kit, c, opts);

  // ---------- capa ----------
  // o = { c, year, extra, head, pose, kit, caption, stats, lede, subs, column }
  function paper(o, onClose) {
    // Configuração: sem jornais, ou só as edições especiais (transferência, final, Copa, despedida)
    const pc = U.cfg.papers;
    if (pc === 'none' || (pc === 'special' && !o.extra)) { setTimeout(() => onClose && onClose(), 0); return null; }
    // Jornal de verdade do país do clube (brasileiro jogando fora também sai nos jornais daqui)
    const cl = o.c && D.CLUB_BY_ID[o.c.club], lg = cl && D.LEAGUE_BY_ID[cl.league];
    const M = D.MEDIA || { papers: {} }, local = (lg && M.papers[lg.country]) || [];
    const pool = local.concat(o.c && o.c.country === 'Brasil' && lg && lg.country !== 'Brasil' ? M.papers['Brasil'] || [] : []);
    const list = pool.length ? pool.map(([name, motto]) => ({ name, motto, br: (M.papers['Brasil'] || []).some(p => p[0] === name) })) : PAPERS;
    let k;
    do { k = Math.floor(Math.random() * list.length); } while (list.length > 1 && list[k].name === lastPaper);
    const P = list[k];
    lastPaper = P.name;
    const columnist = P.br && M.columnistBR ? M.columnistBR : S.COLUMNIST;
    P.columnist = columnist;
    const wrap = document.createElement('div');
    wrap.className = 'paper-wrap';
    wrap.innerHTML = '<div class="paper' + (o.extra ? ' is-extra' : '') + '"><div class="pp-in"><div class="pp-top"><span>' + (o.extra ? 'Edição extra · ' : 'Edição de ') + o.year + '</span><span>R$ ' + (2 + (o.year % 5)) + ',50</span></div>' +
      '<div class="pp-name">' + P.name + '</div><div class="pp-motto">' + P.motto + '</div>' +
      (o.extra ? '<div class="pp-extra">' + esc(o.extra) + '</div>' : '') +
      '<h3 class="pp-head">' + esc(o.head) + '</h3>' +
      '<div class="pp-body"><figure class="pp-photo">' + photo(o.pose || 'normal', o.kit, o.c) + '<figcaption>' + esc(o.caption) + '</figcaption></figure>' +
      '<div class="pp-col">' + (o.stats ? '<p class="pp-stats">' + esc(o.stats) + '</p>' : '') +
      '<p class="pp-lede">' + esc(o.lede) + '</p>' +
      (o.subs || []).map(h => '<p class="pp-sub">' + esc(h) + '</p>').join('') + '</div></div>' +
      (o.column ? '<div class="pp-opinion"><span>Opinião · ' + columnist + '</span><b>' + esc(o.column.t) + '</b><p>' + esc(o.column.x) + '</p></div>' : '') +
      '<div class="pp-tap">Toque para fechar</div></div></div>';
    // Com 3D: a mesma página desenhada numa folha de papel que chega girando, desdobra e dá para inclinar
    if (window.CRAQUE_BALL && window.CRAQUE_BALL.newspaper && U.cfg.fx3d && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      const box = document.createElement('div');
      box.className = 'paper-wrap paper3d';
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', P.name + ': ' + o.head);
      document.body.appendChild(box);
      sfx('paper');
      pageCanvas(o, P).then(cv => window.CRAQUE_BALL.newspaper(box, cv, () => { box.remove(); onClose && onClose(); }))
        .then(ok => { if (!ok && box.isConnected) { box.remove(); domPaper(); } })
        .catch(() => { if (box.isConnected) { box.remove(); domPaper(); } });
      return box;
    }
    return domPaper();
    function domPaper() {
    document.body.appendChild(wrap);
    sfx('paper');
    unfold(wrap.querySelector('.paper'));
    const close = e => {
      if (e) e.stopPropagation();
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 250);
    };
    setTimeout(() => { wrap.onclick = close; }, 400);
    return wrap;
    }
  }

  // Página do jornal desenhada num canvas 1100×1800 (fundo transparente: o papel 3D aparece por baixo da tinta)
  async function pageCanvas(o, P) {
    const W = 1100, H = 1800, M = 64, INK = '#1B1A17';
    try { if (document.fonts) await Promise.all([document.fonts.load("900 80px 'Playfair Display'"), document.fonts.load("700 40px 'Playfair Display'"), document.fonts.load("700 30px Barlow")]); } catch (e) { /* segue com a fonte que tiver */ }
    // Foto: a ilustração do jogo (SVG) vira imagem
    const svg = photo(o.pose || 'normal', o.kit, o.c).replace('<svg ', '<svg width="480" height="400" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    try { await img.decode(); } catch (e) { /* sem foto */ }
    const SERIF = "'Playfair Display', Georgia, serif", SANS = "Barlow, Arial, sans-serif";
    const draw = k => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d');
      x.fillStyle = INK; x.strokeStyle = INK; x.textBaseline = 'alphabetic';
      const font = (w, s, f, it) => { x.font = (it ? 'italic ' : '') + w + ' ' + Math.round(s * k) + 'px ' + f; };
      const wrap = (txt, maxW) => {
        const out = []; let line = '';
        String(txt).split(/\s+/).forEach(wd => { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t; });
        if (line) out.push(line); return out;
      };
      const rule = (y, w2) => { x.fillRect(M, y, W - 2 * M, w2); };
      let y = M + 30 * k;
      // Cabeçalho
      font(700, 30, SANS);
      x.textAlign = 'left'; x.fillText(((o.extra ? 'Edição extra · ' : 'Edição de ') + o.year).toUpperCase(), M, y);
      x.textAlign = 'right'; x.fillText('R$ ' + (2 + (o.year % 5)) + ',50', W - M, y);
      y += 16 * k; rule(y, 3); y += 20 * k;
      x.textAlign = 'center';
      let ns = 118; font(900, ns, SERIF); while (x.measureText(P.name).width > W - 2 * M && ns > 60) { ns -= 4; font(900, ns, SERIF); }
      y += ns * 0.85 * k; x.fillText(P.name, W / 2, y);
      font(700, 34, SERIF, true); y += 50 * k; x.fillText(P.motto, W / 2, y);
      y += 22 * k; rule(y, 5); rule(y + 11, 2); y += 30 * k;
      if (o.extra) { x.fillStyle = '#B3141F'; x.fillRect(M, y, W - 2 * M, 56 * k); x.fillStyle = '#FFF6E0'; font(800, 32, SANS); x.fillText(o.extra.toUpperCase(), W / 2, y + 39 * k); x.fillStyle = INK; y += 80 * k; }
      // Manchete
      x.textAlign = 'left'; font(900, 78, SERIF);
      wrap(o.head, W - 2 * M).forEach(l => { y += 84 * k; x.fillText(l, M, y); });
      y += 34 * k;
      // Foto (esquerda) e texto (direita)
      const PW = Math.round(400 * Math.min(1.3, Math.max(1, k))), top = y;
      x.fillStyle = '#DDD4BC'; x.fillRect(M, y, PW, 0); // (o fundo da legenda é desenhado depois de medir)
      const ph = PW - 24, phH = Math.round(ph * 400 / 480);
      font(700, 28, SERIF, true);
      const cap = wrap(o.caption || '', PW - 30);
      const boxH = 12 + phH + 14 + cap.length * 36 * k + 10;
      x.fillStyle = '#DDD4BC'; x.fillRect(M, y, PW, boxH); x.fillStyle = INK;
      if (img.complete && img.naturalWidth) { x.save(); x.filter = 'sepia(.3) saturate(.85) contrast(1.05)'; x.drawImage(img, M + 12, y + 12, ph, phH); x.restore(); x.lineWidth = 2; x.strokeRect(M + 12, y + 12, ph, phH); }
      x.textAlign = 'center'; let cy = y + 12 + phH + 10;
      cap.forEach(l => { cy += 34 * k; x.fillText(l, M + PW / 2, cy); });
      x.textAlign = 'left';
      const CX = M + PW + 34, CW = W - M - CX;
      let ty = top;
      if (o.stats) { font(800, 36, SANS); wrap(o.stats, CW).forEach(l => { ty += 42 * k; x.fillText(l, CX, ty); }); ty += 14 * k; }
      font(700, 36, SERIF); wrap(o.lede || '', CW).forEach(l => { ty += 48 * k; x.fillText(l, CX, ty); });
      (o.subs || []).forEach(h => { ty += 26 * k; x.fillStyle = 'rgba(27,26,23,.35)'; x.fillRect(CX, ty, CW, 2); x.fillStyle = INK; font(900, 36, SERIF); wrap(h, CW).forEach(l => { ty += 46 * k; x.fillText(l, CX, ty); }); });
      y = Math.max(top + boxH, ty) + 36 * k;
      // Opinião
      if (o.column) {
        rule(y, 5); rule(y + 11, 2); y += 52 * k;
        font(800, 26, SANS); x.fillStyle = '#6B6553'; x.fillText(('Opinião · ' + ((P && P.columnist) || S.COLUMNIST)).toUpperCase(), M, y); x.fillStyle = INK;
        font(900, 50, SERIF); y += 60 * k; x.fillText(o.column.t, M, y);
        font(700, 38, SERIF, true); wrap(o.column.x, W - 2 * M).forEach(l => { y += 50 * k; x.fillText(l, M, y); });
      }
      return { cv, y };
    };
    // Diminui tudo um pouco se não couber na folha
    // Letra grande para encher a folha; diminui até caber
    // Maior tamanho que ainda cabe (notícia curta ganha letra e foto maiores, sem sobrar papel em branco)
    let k = 2.1, r = draw(k);
    while (r.y > H - M && k > 0.6) { k -= 0.05; r = draw(k); }
    return r.cv;
  }

  // Jornal em 3D: chega girando dobrado ao meio, desdobra (a metade de cima vira pela dobra) e fica flutuando.
  // A metade de cima é uma cópia da página com a frente e o verso (papel liso), girando junto pela dobra.
  function unfold(pp) {
    if (!pp || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    pp.classList.add('folded');
    const flap = document.createElement('div');
    flap.className = 'pp-flap';
    const front = document.createElement('div');
    front.className = 'pp-flap-front';
    front.innerHTML = pp.querySelector('.pp-in').innerHTML;
    const back = document.createElement('div');
    back.className = 'pp-flap-back';
    flap.appendChild(front); flap.appendChild(back);
    pp.appendChild(flap);
    front.style.height = pp.offsetHeight + 'px';
    setTimeout(() => {
      if (!pp.isConnected) return;
      flap.classList.add('open');
      sfx('paper');
      setTimeout(() => { pp.classList.remove('folded'); flap.remove(); pp.classList.add('flat'); }, 520);
    }, 760);
  }

  // ---------- edições extras ----------
  // Transferência: a foto é com a camisa nova
  // prev = passagem pelo clube anterior (antes de assinar)
  function transferPaper(c, prev, offer, onClose) {
    const to = D.CLUB_BY_ID[offer.club], from = prev && D.CLUB_BY_ID[prev.club];
    const nick = c.name, seasonsAt = prev ? prev.seasons || 0 : 0;
    const head = offer.kind === 'home' ? 'A volta do filho pródigo: ' + nick + ' está de volta ' + D.ao(to.name)
      : offer.kind === 'money' && from ? 'Dinheiro fala alto: ' + nick + ' troca ' + D.o(from.name) + ' ' + D.pelo(to.name)
      : 'FECHADO! ' + nick + ' é ' + D.do(to.name);
    const lede = (from ? 'Depois de ' + (seasonsAt > 1 ? seasonsAt + ' temporadas' : 'uma temporada') + ' ' + D.no(from.name) + ', ' : '') +
      nick + ' assina por ' + offer.years + (offer.years > 1 ? ' anos' : ' ano') + ' com ' + D.o(to.name) + '. O salário: R$ ' + U.money(offer.wage) + ' por semana.';
    const tierTxt = from && to.tier > from.tier ? 'Um degrau acima na carreira.' : from && to.tier < from.tier ? 'Um passo atrás para jogar mais?' : '';
    return paper({ c, year: YEAR0 + c.season, extra: 'Mercado da bola', head, pose: 'assina', kit: kitOf(to.id), caption: nick + ' com a camisa ' + D.do(to.name), lede, subs: tierTxt ? [tierTxt] : [] }, onClose);
  }

  // Final continental (Libertadores/Champions)
  function finalPaper(c, m, ok, onClose) {
    const cl = D.CLUB_BY_ID[c.club], nick = c.name;
    const head = ok ? nick + ' decide e ' + D.o(cl.name) + ' conquista a ' + m.comp : 'Drama na final: ' + D.o(cl.name) + ' perde a ' + m.comp;
    const lede = ok ? 'No lance mais importante da noite, ' + nick + ' não tremeu. A ' + m.comp + ' é ' + D.do(cl.name) + ', e a festa vai longe.'
      : 'O lance decisivo passou pelos pés de ' + nick + ', e não deu. O vice dói, mas a campanha fica na memória.';
    return paper({ c, year: YEAR0 + c.season, extra: 'Final da ' + m.comp, head, pose: ok ? 'taca' : 'triste', kit: kitOf(cl.id), caption: ok ? nick + ' ergue a taça' : nick + ' lamenta no gramado', lede }, onClose);
  }

  // Título da Copa do Mundo
  function worldCupPaper(c, run, onClose) {
    const nick = c.name;
    const stats = S.defKick(c.pos) ? run.games.filter(x => x.cs).length + ' jogos sem sofrer gol na Copa' : run.g + (run.g === 1 ? ' gol' : ' gols') + ' e ' + run.a + (run.a === 1 ? ' assistência' : ' assistências') + ' na Copa';
    return paper({ c, year: run.year, extra: 'Copa do Mundo ' + run.year, head: 'CAMPEÃO DO MUNDO! ' + nick + ' leva a taça para casa',
      pose: 'taca', kit: nationKit(c.country), caption: nick + ' com a taça do mundo', stats,
      lede: 'O país para. ' + nick + ' entra para a história como campeão do mundo com ' + (D.NATION_BY_NAME[c.country] ? D.NATION_BY_NAME[c.country].flag + ' ' : '') + c.country + '.' }, onClose);
  }

  // Mundial de Clubes: edição extra do título
  function clubWorldPaper(c, run, onClose) {
    const nick = c.name, cl = D.CLUB_BY_ID[run.club];
    const stats = S.defKick(c.pos) ? run.games.filter(x => x.cs).length + ' jogos sem sofrer gol no Mundial' : run.g + (run.g === 1 ? ' gol' : ' gols') + ' e ' + run.a + (run.a === 1 ? ' assistência' : ' assistências') + ' no Mundial';
    return paper({ c, year: run.year, extra: 'Mundial de Clubes ' + run.year, head: D.O(cl.name) + ' é campeão do mundo! ' + nick + ' ergue a taça',
      pose: 'taca', kit: kitOf(cl.id), caption: nick + ' com a taça do Mundial', stats,
      lede: 'Contra os melhores clubes do planeta, ' + D.o(cl.name) + ' chegou ao topo. A festa da torcida vai varar a madrugada.' }, onClose);
  }

  // Despedida (fim de carreira)
  function farewellPaper(c, f, onClose) {
    const nick = c.name, T = c.totals, main = D.CLUB_BY_ID[f.mainClub];
    const nums = c.pos === 'GOL' ? (T.cs || 0) + ' jogos sem sofrer gol' : c.pos === 'ZAG' ? T.goals + ' gols e ' + (T.cs || 0) + ' jogos sem sofrer gol' : T.goals + ' gols e ' + T.assists + ' assistências';
    const col = f.grade === 'S' ? { t: 'Um dos maiores', x: 'Contem aos netos que viram ' + nick + ' jogar. Eu conto aos meus.' }
      : f.grade === 'A' ? { t: 'Até logo, craque', x: 'O futebol fica mais pobre hoje. ' + nick + ' fez o que poucos fazem: deixou saudade antes de sair.' }
      : f.grade === 'B' ? { t: 'Carreira de respeito', x: 'Não foi o maior de todos, mas nunca fugiu da briga. ' + nick + ' sai de cabeça erguida.' }
      : { t: 'O que poderia ter sido', x: 'Talento havia. Faltou alguma coisa que nem eu sei explicar. Boa sorte na nova vida, ' + nick + '.' };
    return paper({ c, year: YEAR0 + c.season, extra: 'Edição especial', head: 'Obrigado, ' + nick + '! O adeus aos ' + c.age + ' anos',
      pose: 'adeus', kit: kitOf(main.id), caption: nick + ' se despede da torcida', stats: T.games + ' jogos · ' + f.titles + (f.titles === 1 ? ' título' : ' títulos'),
      lede: 'Foram ' + nums + ' em ' + f.nClubs + (f.nClubs > 1 ? ' clubes' : ' clube') + '. ' + D.O(main.name) + ' foi a casa mais marcante.', column: col }, onClose);
  }

  Object.assign(U, { SKIN, HAIR_COLORS, HAIRS, BEARDS, PAPERS, kitOf, nationKit, photo, paper, transferPaper, finalPaper, worldCupPaper, clubWorldPaper, farewellPaper });
})();
