// Nas redes: posts do jogador no formato de tweet (X), com as respostas da torcida e de famosos com a reação da torcida e de famosos.
// Quanto mais fama, mais famosos comentam. O jogador posta quando quer: no fim da temporada, depois de um
// evento ou do lance decisivo; anunciar a última temporada já sai como post.
// U.postBtn() devolve o botão; U.postBind(ctx, next) liga o botão; U.socialPost(ctx, next) abre a tela do post.
// ctx: { kind: 'season'|'event'|'moment'|'announce'|'farewell', res?, ok?, m?, ev?, toClub? }
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, $, esc, club, render, year, save, bar } = U;

  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const num = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' mi' : n >= 1e4 ? (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' mil' : n.toLocaleString('pt-BR');

  const chance = p => Math.random() < p;
  // Sorteio com memória entre carreiras: a frase usada só volta depois que quase todas as outras da lista saírem.
  // A memória fica no navegador (por lista, guarda os índices usados recentemente).
  const SEEN = 'climbix-seen-v1';
  let seen = null;
  const seenLoad = () => { if (!seen) { try { seen = JSON.parse(localStorage.getItem(SEEN)) || {}; } catch (e) { seen = {}; } } return seen; };
  function fresh(key, arr) {
    if (!arr || !arr.length) return '';
    const sn = seenLoad(), used = sn[key] || [], all = arr.map((_, i) => i), free = all.filter(i => !used.includes(i));
    const pool = free.length ? free : all, i = pool[Math.floor(Math.random() * pool.length)];
    const keep = Math.floor(arr.length * 0.75);
    sn[key] = keep ? (free.length ? used : []).concat(i).slice(-keep) : [];
    try { localStorage.setItem(SEEN, JSON.stringify(sn)); } catch (e) { /* sem armazenamento: só sorteia */ }
    return arr[i];
  }

  // Textos do motor (manchetes, cronista, destaques) com a mesma memória entre carreiras
  S.TEXT_PICK = (key, n) => fresh('t.' + key, Array.from({ length: n }, (_, i) => i));

  // Coração na cor da camisa do clube (vermelho, azul, verde, amarelo, preto, branco, laranja, roxo)
  function heart(id) {
    const k = ((window.CRAQUE_KITS || {})[id] || ['#cc0000'])[0], [r, g, b] = [1, 3, 5].map(i => parseInt(k.slice(i, i + 2), 16));
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 60) return '🖤';
    if (mn > 200) return '🤍';
    if (mx - mn < 40) return mx > 140 ? '🤍' : '🖤';
    const h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4, deg = h * 60;
    return deg < 18 || deg >= 330 ? '❤️' : deg < 42 ? '🧡' : deg < 70 ? '💛' : deg < 165 ? '💚' : deg < 255 ? '💙' : '💜';
  }
  // Frase de estatística da temporada conforme a posição
  const P = D.plural, csTxt = n => P(n || 0, 'jogo sem sofrer gol', 'jogos sem sofrer gol');
  const statOf = res => res.pos === 'GOL' ? csTxt(res.cleanSheets) : res.pos === 'ZAG' ? P(res.tackles || 0, 'desarme', 'desarmes')
    : res.pos === 'MEI' ? P(res.assists, 'assistência', 'assistências') : P(res.goals, 'gol', 'gols');
  // Números da carreira inteira, por posição (para os posts de despedida)
  const careerOf = c => { const T = c.totals || {}; return c.pos === 'GOL' ? csTxt(T.cs) + ' e ' + P(T.penSaved || 0, 'pênalti defendido', 'pênaltis defendidos')
    : c.pos === 'ZAG' ? P(T.goals || 0, 'gol', 'gols') + ' e ' + csTxt(T.cs) : P(T.goals || 0, 'gol', 'gols') + ' e ' + P(T.assists || 0, 'assistência', 'assistências'); };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

  // Clima da temporada: Bola de Ouro, título, banco, lesão, queda, ótima, boa ou fraca
  const seasonSub = r => r.awards.some(a => a.id === 'ballon') ? 'ballon' : r.titles.length ? 'title' : !r.games || r.games < 10 ? 'bench' : r.injury >= 25 ? 'injury'
    : r.move && r.move.dir === 'down' ? 'down' : r.rating >= 7.6 ? 'great' : r.rating >= 7.0 ? 'good' : 'bad';
  const UP = ['ballon', 'title', 'great', 'good'];
  const moodOf = ctx => ctx.kind === 'season' ? (UP.includes(seasonSub(ctx.res)) ? 'up' : 'down') : ctx.kind === 'event' ? (ctx.toClub || ctx.ok ? 'up' : 'down')
    : ctx.kind === 'moment' ? (ctx.ok ? 'up' : 'down') : 'bye';

  // Texto do post e o clima (up, down, bye) de cada situação; sub guarda o detalhe (title, ballon, great...)
  // com: comentário da torcida ligado ao próprio post (posts de evento)
  function postOf(ctx) {
    const P = D.SOCIAL.posts, tags = k => chance(0.3) ? ' ' + fresh('p.tag.' + k, P.parts.tags[k]) + ' ' + fresh('p.tag.' + k, P.parts.tags[k]) : '';
    if (ctx.kind === 'season') {
      const r = ctx.res, sub = seasonSub(r);
      const up = UP.includes(sub), k = up ? 'up' : 'down', Pp = P.parts;
      // Temporadas ótima, boa e fraca: às vezes o post é montado por partes (abertura + fato + fecho)
      let text = ['great', 'good', 'bad'].includes(sub) && chance(0.55)
        ? fresh('p.open.' + k, Pp.open[k]) + ' ' + fresh('p.fact.' + k, Pp.fact[k]) + ' ' + fresh('p.close.' + k, Pp.close[k])
        : fresh('p.' + sub, P.whole[sub]);
      if (r.age >= 35 && up && chance(0.35)) text += ' Aos {idade}, ainda tenho história pra escrever.';
      return { text: text + tags(k), mood: k, sub, res: r };
    }
    if (ctx.kind === 'event') {
      // Post do próprio evento: um por opção, com versão de deu certo e deu errado (social-events.js)
      const ev = ctx.ev || {}, pick = x => Array.isArray(x) ? x[ctx.ok ? 0 : 1] : x;
      if (ctx.toClub) {
        const mv = (D.SOCIAL.evMove || {})[ev.id];
        return { text: mv ? mv[0] : fresh('p.transfer', P.transfer), mood: 'up', sub: 'transfer', club: ctx.toClub, com: mv && mv[1] };
      }
      // No "Sem espaço" com proposta, a opção 0 é a transferência e as outras andam uma casa
      const E = (D.SOCIAL.ev || {})[ev.id], o = E && E[ev.id === 'banco' && ev.dest ? ctx.opt - 1 : ctx.opt];
      if (o) return { text: pick(o[0]), mood: ctx.ok ? 'up' : 'down', sub: 'event', com: pick(o[1]) };
      return ctx.ok ? { text: fresh('p.eventOk', P.eventOk), mood: 'up' } : { text: fresh('p.eventKo', P.eventKo), mood: 'down' };
    }
    if (ctx.kind === 'moment') {
      const m = ctx.m, st = S.kickSetupType(m), key = st === 'save' ? 'save' : st === 'tackle' ? 'tackle' : st === 'pass' ? 'pass' : 'goal';
      if (!ctx.ok) return { text: fresh('p.momentKo', P.momentKo), mood: 'down', m };
      return { text: (chance(0.6) ? fresh('p.mctx', P.momentCtx) + ' ' : '') + fresh('p.mok.' + key, P.momentOk[key]) + ' ' +
        fresh('p.mend.' + m.type, P.momentEnd[m.type] || P.momentEnd.cup) + ' ' + fresh('p.mtail', P.momentTail), mood: 'up', sub: 'moment', m };
    }
    if (ctx.kind === 'announce') return { text: fresh('p.announce', P.announce) + tags('bye'), mood: 'bye' };
    return { text: fresh('p.farewell', P.farewell) + tags('bye'), mood: 'bye' };
  }

  // Comentários: famosos pela fama, clube, página de notícia, torcida (alguns falando do próprio post),
  // um aleatório da internet e às vezes um hater, que pode levar resposta do jogador
  function commentsOf(p, ctx, fx) {
    const c = G.c, fame = c.fame || 0, cl = club(c.club), base = slug(cl.name).slice(0, 12), SO = D.SOCIAL, mood = p.mood;
    const total = fame >= 150 ? 6 : 5, top = [], rest = [];
    // Post de evento fora de campo: comentários falam da escolha (sem "que temporada!" ou "gol é isso")
    const isEv = ctx.kind === 'event' && p.sub !== 'transfer' && !!SO.evFans;
    const nFam = (fame >= 250 ? 4 : fame >= 150 ? 3 : fame >= 80 ? 2 : fame >= 30 ? 1 : 0) + (mood === 'bye' ? 1 : 0);
    // Sorteio com peso: os mais famosos que alcançam o jogador têm mais chance, mas os outros também aparecem
    const fam = SO.famous.filter(f => fame >= f.min || (mood === 'bye' && f.min <= 30)).map(f => [f.min + Math.random() * 230, f]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    fam.slice(0, Math.min(nFam, total - 2)).forEach(f => {
      const which = (p.sub === 'title' || p.sub === 'ballon' || p.sub === 'moment') && f.title && chance(0.6) ? 'title'
        : mood === 'up' && f['up_' + c.pos] && chance(0.5) ? 'up_' + c.pos : mood;
      top.push({ h: f.h, v: true, t: isEv ? fresh('f.ev.' + mood, SO.evFamous[mood] || SO.evFamous.up) : fresh('f.' + f.h + '.' + which, f[which]) });
    });
    if (!isEv && chance(mood === 'down' ? 0.45 : 0.7)) rest.push({ h: base + 'oficial', v: true, t: fresh('c.club.' + mood, SO.club[mood]) });
    if (!isEv && mood !== 'down' && chance(fame >= 80 ? 0.45 : 0.2)) { const pg = fresh('c.pages', SO.pages); rest.push({ h: pg[0], v: true, t: pg[1] }); }
    // Comentário sobre o próprio post (números da temporada, minuto do lance, chegada ao clube, despedida)
    const cx = ctx.kind === 'season' ? ['season.' + mood, SO.ctx.season[mood]] : ctx.kind === 'moment' ? ['moment.' + mood, SO.ctx.moment[mood]]
      : p.sub === 'transfer' ? ['transfer', SO.ctx.transfer] : mood === 'bye' ? ['bye', SO.ctx.bye] : null;
    const handles = SO.fanHandles.map(x => base + x).concat(SO.randomHandles);
    const fan = () => fresh('h.fan', handles);
    if (p.com) rest.push({ h: fan(), v: false, t: p.com });
    if (cx && cx[1]) rest.push({ h: fan(), v: false, t: fresh('c.ctx.' + cx[0], cx[1]) });
    if (chance(0.55)) rest.push({ h: fan(), v: false, t: fresh('c.random', SO.random) });
    // Crítica: até os melhores têm (mais famoso, mais crítica). Não entra no post de fase ruim, que já tem o hater
    const ck = ctx.kind === 'season' ? (p.sub === 'ballon' ? 'ballon' : p.sub === 'title' ? 'title' : 'season') : ctx.kind === 'moment' ? 'moment'
      : p.sub === 'transfer' ? 'transfer' : mood === 'bye' ? 'bye' : 'event';
    const crit = mood !== 'down' && SO.critics && chance(0.35 + Math.min(0.3, fame / 600));
    if (crit) rest.splice(p.com ? 1 : 0, 0, { h: fresh('h.critic', SO.criticHandles), v: false, t: fresh('c.critic.' + ck, SO.critics[ck]) });
    // Haters: quase sempre tem um (mais famoso, mais hater) e às vezes dois. Na aposta do post humilde:
    // deu certo, sem hater; deu errado, eles aparecem em dobro
    const nHater = fx && fx.won ? 0 : fx && fx.won === false ? 2
      : (chance(mood === 'down' ? 0.95 : mood === 'bye' ? 0.45 : 0.7 + Math.min(0.2, fame / 1000)) ? 1 : 0) + (chance(mood === 'down' ? 0.5 : 0.2 + Math.min(0.2, fame / 1000)) ? 1 : 0);
    while (top.length + rest.length < total - nHater) rest.push({ h: fan(), v: false, t: isEv ? fresh('c.evfans.' + mood, SO.evFans[mood] || SO.evFans.up) : fresh('c.fans.' + mood, SO.fans[mood]) });
    const out = top.concat(rest.slice(0, total - top.length - nHater).sort(() => Math.random() - 0.5));
    // Entram no meio da conversa (nunca como primeira resposta); o botão de responder fica só no primeiro hater
    for (let k = 0; k < nHater; k++) {
      const at = 1 + Math.floor(Math.random() * out.length);
      out.splice(at, 0, { h: fresh('h.hater', SO.haterHandles), v: false, t: isEv ? fresh('c.evhater.' + mood, SO.evHaters[mood] || SO.evHaters.down) : fresh('c.hater.' + mood, SO.haters[mood]), hate: true });
    }
    const first = out.find(x => x.hate);
    if (first) first.hater = true;
    return out;
  }

  const CHECK = '<svg class="sp-check" viewBox="0 0 24 24" aria-label="verificado"><path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.8 1 2.8-2.5 1.6-.9 2.9-3-.2L12 19.3l-2.4-1.8-3 .2-.9-2.9-2.5-1.6 1-2.8-1-2.8 2.5-1.6.9-2.9 3 .2Z" fill="#3897F0"/><path d="m8 10.6 2.8 2.8L16.4 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="#ED4956"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-1.3-4.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  // Efeito do post: só o primeiro post de cada temporada conta (anunciar a última temporada e a despedida contam sempre).
  // Temporada boa, título, lance ou evento que deu certo: Fama e Torcida. Fase ruim: aposta no post humilde.
  // Despedida: Torcida +5, e a torcida do clube lembra disso no fim da carreira (Estádio lotado).
  const fxKey = ctx => ctx.kind === 'season' ? G.c.seasons.length - 1 : G.c.seasons.length;
  const ONCE = ['announce', 'farewell'];
  function fxOf(ctx) {
    const c = G.c, mood = moodOf(ctx);
    if (!ONCE.includes(ctx.kind) && c.postS === fxKey(ctx)) return { none: true, lbl: 'Sem efeito: você já postou nesta temporada' };
    if (mood === 'bye') return { fans: 5, lbl: 'Torcida +5' };
    if (mood === 'down') return { gamble: true, lbl: '60%: Torcida +4 · 40%: Torcida −3' };
    if (ctx.kind === 'event') return ctx.toClub ? { fans: 4, lbl: 'Torcida nova +4' } : { fame: 2, fans: 2, lbl: 'Fama +2 · Torcida +2' };
    return { fame: 3, fans: 2, lbl: 'Fama +3 · Torcida +2' };
  }
  const fans = (c, v) => { S._.bump(c, 'fans', v); if (v > 0) c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans); };
  function fxApply(ctx) {
    const c = G.c, fx = fxOf(ctx);
    if (fx.none) return fx;
    if (!ONCE.includes(ctx.kind)) c.postS = fxKey(ctx);
    if (fx.gamble) {
      fx.won = Math.random() < 0.6;
      fans(c, fx.won ? 4 : -3);
      fx.res = fx.won ? 'A torcida abraçou o post humilde: Torcida +4' : 'Os haters tomaram conta dos comentários: Torcida −3';
    } else {
      if (fx.fame) c.fame = (c.fame || 0) + fx.fame;
      if (fx.fans) fans(c, fx.fans);
      fx.res = 'Efeito do post: ' + fx.lbl;
    }
    save(); bar();
    return fx;
  }
  // Responder o hater: metade das vezes a resposta viraliza; na outra, o técnico não gosta.
  // Vale só quando o post conta (o primeiro da temporada, ou o anúncio e a despedida)
  function replyFx(fx) {
    const c = G.c;
    if (fx.none) return 'Sem efeito: o post já não contava';
    if (Math.random() < 0.5) { c.fame = (c.fame || 0) + 6; save(); bar(); return 'A resposta viralizou: Fama +6'; }
    S._.bump(c, 'coach', -3); save(); bar(); return 'O técnico não gostou da treta: Técnico −3';
  }

  function socialPost(ctx, next) {
    const c = G.c;
    const fx = fxApply(ctx), fame = c.fame || 0;
    const p = postOf(ctx), coms = commentsOf(p, ctx, fx), cl = club(p.club || c.club).name, T = c.totals || {}, r = p.res, m = p.m;
    const vs = m && m.vs ? D.o(club(m.vs).name) : 'o adversário', nota = r ? (Math.round(r.rating * 10) / 10).toFixed(1).replace('.', ',') : '';
    const fill = t => t.replace(/\{n\}/g, c.name).replace(/\{num\}/g, c.number || 10).replace(/\{time\}/g, cl).replace(/\{cor\}/g, heart(c.club))
      .replace(/\{aoTime\}/g, D.ao(cl)).replace(/\{doTime\}/g, D.do(cl)).replace(/\{noTime\}/g, D.no(cl)).replace(/\{idade\}/g, c.age)
      .replace(/\{stat\}/g, r ? statOf(r) : '').replace(/\{titulos\}/g, r ? r.titles.map(x => x.name).join(' e ') : '').replace(/\{jogos\}/g, r ? r.games : '')
      .replace(/\{nota\}/g, nota).replace(/\{pos\}/g, r && r.table ? r.table.pos : '').replace(/\{pts\}/g, r && r.table ? r.table.pts : '')
      .replace(/\{naLiga\}/g, r && r.table ? D.na(r.table.league) : '').replace(/\{min\}/g, m ? m.minute || 90 : '').replace(/\{vs\}/g, vs).replace(/\{contraVs\}/g, 'contra ' + vs)
      .replace(/\{numeros\}/g, careerOf(c)).replace(/\{temps\}/g, P(c.seasons.length, 'temporada', 'temporadas')).replace(/\{gols\}/g, T.goals || 0).replace(/\{assist\}/g, T.assists || 0);
    p.text = cap(fill(p.text)); coms.forEach(x => { x.t = fill(x.t); });
    const likes = Math.round(80 * Math.pow(1.035, Math.min(320, fame)) * (p.mood === 'bye' ? 3 : p.mood === 'up' ? 1.4 : 0.8));
    const me = slug(c.name) + (c.number || 10);
    // Formato de tweet (X): sem foto; avatar com a inicial na cor do nome
    const COLORS = ['#1D9BF0', '#F91880', '#7856FF', '#00BA7C', '#FF7A00', '#E0245E', '#8B6CEF', '#16A3B5'];
    const ava = (h, big) => '<span class="xw-ava' + (big ? ' big' : '') + '" style="background:' + COLORS[[...h].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length] + '">' + esc(h[0].toUpperCase()) + '</span>';
    const XCHK = '<svg class="xw-chk" viewBox="0 0 22 22" aria-label="verificado"><path d="M20.4 11c0-1.4-.9-2.7-2.2-3.2.5-1.3.2-2.8-.8-3.8s-2.5-1.3-3.8-.8C13.1 1.9 11.8 1 10.4 1S7.7 1.9 7.2 3.2c-1.3-.5-2.8-.2-3.8.8s-1.3 2.5-.8 3.8C1.3 8.3.4 9.6.4 11s.9 2.7 2.2 3.2c-.5 1.3-.2 2.8.8 3.8s2.5 1.3 3.8.8c.5 1.3 1.8 2.2 3.2 2.2s2.7-.9 3.2-2.2c1.3.5 2.8.2 3.8-.8s1.3-2.5.8-3.8c1.3-.5 2.2-1.8 2.2-3.2Z" fill="#1D9BF0"/><path d="m6.8 11.2 2.7 2.7 5.6-5.8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const IC = {
      rep: '<svg viewBox="0 0 24 24"><path d="M1.8 10c0-4.4 3.6-8 8-8h4.4c4.4 0 8.1 3.6 8.1 8.1 0 2.9-1.6 5.6-4.1 7L10 21.3V18h-.1c-4.5.1-8.1-3.5-8.1-8Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
      rt: '<svg viewBox="0 0 24 24"><path d="M4.5 3.9 8.9 8H6v8a2 2 0 0 0 2 2h5v2H8a4 4 0 0 1-4-4V8H1.1l4.4-4.1M19.5 20.1 15.1 16H18V8a2 2 0 0 0-2-2h-5V4h5a4 4 0 0 1 4 4v8h2.9l-4.4 4.1Z" fill="currentColor"/></svg>',
      like: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="currentColor"/></svg>',
      view: '<svg viewBox="0 0 24 24"><path d="M5 21V10M10 21V3M15 21v-8M20 21V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    };
    const nRep = Math.max(coms.length, Math.round(likes / 20)), nRt = Math.round(likes / 7), nView = likes * 18;
    const hrs = i => (i < 2 ? '1 h' : (1 + Math.floor(i / 2)) + ' h');
    const acts = (r, t, l, v, on) => '<div class="xw-acts"><span>' + IC.rep + num(r) + '</span><span>' + IC.rt + num(t) + '</span><span' + (on ? ' class="on"' : '') + '>' + IC.like + num(l) + '</span><span>' + IC.view + num(v) + '</span></div>';
    const when = String(10 + (likes % 12)).padStart(2, '0') + ':' + String(likes % 60).padStart(2, '0');
    render(
      // Fechar no topo e Continuar fixo embaixo: não precisa rolar até o fim do post
      '<div class="sp-top"><div class="eyebrow">Temporada ' + year() + ' · ' + c.age + ' anos</div><button class="sp-x" id="b-post-x" aria-label="Fechar o post">' + U.ICON.x + '</button></div>' +
      '<p class="sp-fx' + (fx.none ? ' none' : fx.won === false ? ' ko' : '') + '">' + esc(fx.none ? fx.lbl : fx.res) + '</p>' +
      '<article class="xw">' +
      '<div class="xw-main"><header class="xw-head">' + ava(c.name, true) + '<div><b>' + esc(c.name) + '</b>' + (fame >= 80 ? XCHK : '') + '<small>@' + esc(me) + '</small></div></header>' +
      '<p class="xw-text">' + esc(p.text) + '</p>' +
      '<p class="xw-when">' + when + ' · ' + year() + ' · <b>' + num(nView) + '</b> visualizações</p>' +
      '<div class="xw-sum"><span><b>' + num(nRt) + '</b> reposts</span><span><b>' + num(likes) + '</b> curtidas</span></div>' +
      acts(nRep, nRt, likes, nView, true).replace('xw-acts', 'xw-acts big') + '</div>' +
      coms.map((x, i) => '<div class="xw-rep">' + ava(x.h) + '<div class="xw-rc"><p class="xw-rh"><b>' + esc(x.h.replace(/[._]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())) + '</b>' + (x.v ? XCHK : '') + ' <small>@' + esc(x.h) + ' · ' + hrs(i) + '</small></p>' +
        '<p class="xw-rt"><small>Em resposta a <em>@' + esc(me) + '</em></small>' + esc(x.t) + '</p>' +
        (x.hater ? '<div class="sp-reply" id="sp-hater"><button class="sp-hbtn" id="b-hater">Responder o hater<small>' + (fx.none ? 'Sem efeito' : '50%: Fama +6 · 50%: Técnico −3') + '</small></button></div>' : '') +
        acts(1 + ((i * 3 + likes) % 9), (i * 5 + likes) % 14, 3 + ((i * 7 + likes) % 60), 200 + ((i * 131 + likes) % 4000)) + '</div></div>').join('') +
      '</article>' +
      '<p class="sp-note">Post e respostas fictícios, da simulação do jogo.</p>' +
      '<div class="sp-sticky"><button class="btn" id="b-post-next">Continuar</button></div>'
    );
    $('b-post-next').onclick = next;
    $('b-post-x').onclick = next;
    const hb = $('b-hater');
    if (hb) hb.onclick = () => {
      const out = replyFx(fx);
      $('sp-hater').innerHTML = '<div class="xw-rep self">' + ava(c.name) + '<div class="xw-rc"><p class="xw-rh"><b>' + esc(c.name) + '</b>' + (fame >= 80 ? XCHK : '') + ' <small>@' + esc(me) + ' · agora</small></p><p class="xw-rt">' + esc(fill(fresh('c.reply', D.SOCIAL.replies))) + '</p><small class="sp-out">' + esc(out) + '</small></div></div>';
    };
  }

  // Botão de postar com o efeito à vista (ctx igual ao do postBind)
  const postBtn = ctx => '<button class="btn ghost" id="b-post">' + U.emo('📱', 'sm') + ' Postar nas redes<small>' + esc(fxOf(ctx).lbl) + '</small></button>';
  const postBind = (ctx, next) => { const b = $('b-post'); if (b) b.onclick = () => socialPost(ctx, next); };

  Object.assign(U, { socialPost, postBtn, postBind, fresh });
})();
