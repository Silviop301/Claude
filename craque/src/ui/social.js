// Nas redes: posts do jogador (só texto) com a reação da torcida e de famosos.
// Quanto mais fama, mais famosos comentam. O jogador posta quando quer: no fim da temporada, depois de um
// evento ou do lance decisivo; anunciar a última temporada já sai como post.
// U.postBtn() devolve o botão; U.postBind(ctx, next) liga o botão; U.socialPost(ctx, next) abre a tela do post.
// ctx: { kind: 'season'|'event'|'moment'|'announce'|'farewell', res?, ok?, m?, ev?, toClub? }
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, $, esc, club, render, year } = U;

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
  const statOf = res => res.pos === 'GOL' ? (res.cleanSheets || 0) + ' jogos sem sofrer gol' : res.pos === 'ZAG' ? (res.tackles || 0) + ' desarmes'
    : res.pos === 'MEI' ? res.assists + ' assistências' : res.goals + ' gols';
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

  // Texto do post e o clima (up, down, bye) de cada situação; sub guarda o detalhe (title, ballon, great...)
  function postOf(ctx) {
    const P = D.SOCIAL.posts, tags = k => chance(0.3) ? ' ' + fresh('p.tag.' + k, P.parts.tags[k]) + ' ' + fresh('p.tag.' + k, P.parts.tags[k]) : '';
    if (ctx.kind === 'season') {
      const r = ctx.res, ballon = r.awards.some(a => a.id === 'ballon');
      const sub = ballon ? 'ballon' : r.titles.length ? 'title' : !r.games || r.games < 10 ? 'bench' : r.injury >= 25 ? 'injury'
        : r.move && r.move.dir === 'down' ? 'down' : r.rating >= 7.6 ? 'great' : r.rating >= 7.0 ? 'good' : 'bad';
      const up = ['ballon', 'title', 'great', 'good'].includes(sub), k = up ? 'up' : 'down', Pp = P.parts;
      // Temporadas ótima, boa e fraca: às vezes o post é montado por partes (abertura + fato + fecho)
      let text = ['great', 'good', 'bad'].includes(sub) && chance(0.55)
        ? fresh('p.open.' + k, Pp.open[k]) + ' ' + fresh('p.fact.' + k, Pp.fact[k]) + ' ' + fresh('p.close.' + k, Pp.close[k])
        : fresh('p.' + sub, P.whole[sub]);
      if (r.age >= 35 && up && chance(0.35)) text += ' Aos {idade}, ainda tenho história pra escrever.';
      return { text: text + tags(k), mood: k, sub, res: r };
    }
    if (ctx.kind === 'event') {
      if (ctx.toClub) return { text: fresh('p.transfer', P.transfer), mood: 'up', sub: 'transfer', club: ctx.toClub };
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
  function commentsOf(p, ctx) {
    const c = G.c, fame = c.fame || 0, cl = club(c.club), base = slug(cl.name).slice(0, 12), SO = D.SOCIAL, mood = p.mood;
    const total = fame >= 150 ? 6 : 5, top = [], rest = [];
    const nFam = (fame >= 250 ? 4 : fame >= 150 ? 3 : fame >= 80 ? 2 : fame >= 30 ? 1 : 0) + (mood === 'bye' ? 1 : 0);
    // Sorteio com peso: os mais famosos que alcançam o jogador têm mais chance, mas os outros também aparecem
    const fam = SO.famous.filter(f => fame >= f.min || (mood === 'bye' && f.min <= 30)).map(f => [f.min + Math.random() * 230, f]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    fam.slice(0, Math.min(nFam, total - 2)).forEach(f => {
      const which = (p.sub === 'title' || p.sub === 'ballon' || p.sub === 'moment') && f.title && chance(0.6) ? 'title'
        : mood === 'up' && f['up_' + c.pos] && chance(0.5) ? 'up_' + c.pos : mood;
      top.push({ h: f.h, v: true, t: fresh('f.' + f.h + '.' + which, f[which]) });
    });
    if (chance(mood === 'down' ? 0.45 : 0.7)) rest.push({ h: base + 'oficial', v: true, t: fresh('c.club.' + mood, SO.club[mood]) });
    if (mood !== 'down' && chance(fame >= 80 ? 0.45 : 0.2)) { const pg = fresh('c.pages', SO.pages); rest.push({ h: pg[0], v: true, t: pg[1] }); }
    // Comentário sobre o próprio post (números da temporada, minuto do lance, chegada ao clube, despedida)
    const cx = ctx.kind === 'season' ? ['season.' + mood, SO.ctx.season[mood]] : ctx.kind === 'moment' ? ['moment.' + mood, SO.ctx.moment[mood]]
      : p.sub === 'transfer' ? ['transfer', SO.ctx.transfer] : mood === 'bye' ? ['bye', SO.ctx.bye] : null;
    const handles = SO.fanHandles.map(x => base + x).concat(SO.randomHandles);
    const fan = () => fresh('h.fan', handles);
    if (cx && cx[1]) rest.push({ h: fan(), v: false, t: fresh('c.ctx.' + cx[0], cx[1]) });
    if (chance(0.55)) rest.push({ h: fan(), v: false, t: fresh('c.random', SO.random) });
    const hater = chance(mood === 'down' ? 0.65 : mood === 'bye' ? 0.2 : 0.3);
    while (top.length + rest.length < total - (hater ? 1 : 0)) rest.push({ h: fan(), v: false, t: fresh('c.fans.' + mood, SO.fans[mood]) });
    const out = top.concat(rest.slice(0, total - top.length - (hater ? 1 : 0)).sort(() => Math.random() - 0.5));
    if (hater) out.push({ h: fresh('h.hater', SO.haterHandles), v: false, t: fresh('c.hater.' + mood, SO.haters[mood]), reply: chance(0.45) ? fresh('c.reply', SO.replies) : null });
    return out;
  }

  const CHECK = '<svg class="sp-check" viewBox="0 0 24 24" aria-label="verificado"><path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.8 1 2.8-2.5 1.6-.9 2.9-3-.2L12 19.3l-2.4-1.8-3 .2-.9-2.9-2.5-1.6 1-2.8-1-2.8 2.5-1.6.9-2.9 3 .2Z" fill="#3897F0"/><path d="m8 10.6 2.8 2.8L16.4 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="#ED4956"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-1.3-4.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  function socialPost(ctx, next) {
    const c = G.c, fame = c.fame || 0;
    const p = postOf(ctx), coms = commentsOf(p, ctx), cl = club(p.club || c.club).name, T = c.totals || {}, r = p.res, m = p.m;
    const vs = m && m.vs ? D.o(club(m.vs).name) : 'o adversário', nota = r ? (Math.round(r.rating * 10) / 10).toFixed(1).replace('.', ',') : '';
    const fill = t => t.replace(/\{n\}/g, c.name).replace(/\{num\}/g, c.number || 10).replace(/\{time\}/g, cl).replace(/\{cor\}/g, heart(c.club))
      .replace(/\{aoTime\}/g, D.ao(cl)).replace(/\{doTime\}/g, D.do(cl)).replace(/\{noTime\}/g, D.no(cl)).replace(/\{idade\}/g, c.age)
      .replace(/\{stat\}/g, r ? statOf(r) : '').replace(/\{titulos\}/g, r ? r.titles.map(x => x.name).join(' e ') : '').replace(/\{jogos\}/g, r ? r.games : '')
      .replace(/\{nota\}/g, nota).replace(/\{pos\}/g, r && r.table ? r.table.pos : '').replace(/\{pts\}/g, r && r.table ? r.table.pts : '')
      .replace(/\{naLiga\}/g, r && r.table ? D.na(r.table.league) : '').replace(/\{min\}/g, m ? m.minute || 90 : '').replace(/\{vs\}/g, vs).replace(/\{contraVs\}/g, 'contra ' + vs)
      .replace(/\{temps\}/g, c.seasons.length).replace(/\{gols\}/g, T.goals || 0).replace(/\{assist\}/g, T.assists || 0);
    p.text = cap(fill(p.text)); coms.forEach(x => { x.t = fill(x.t); if (x.reply) x.reply = fill(x.reply); });
    const likes = Math.round(80 * Math.pow(1.035, Math.min(320, fame)) * (p.mood === 'bye' ? 3 : p.mood === 'up' ? 1.4 : 0.8));
    const me = slug(c.name) + (c.number || 10);
    const ava = h => '<span class="sp-ava">' + esc(h[0].toUpperCase()) + '</span>';
    render(
      '<div class="eyebrow">Temporada ' + year() + ' · ' + c.age + ' anos</div><h1 class="sp-h1">Nas redes</h1><span class="sp-tag">Post do jogador</span>' +
      '<div class="card sp-card"><div class="sp-head">' + ava(me) + '<div><b>' + esc(me) + '</b>' + (fame >= 80 ? CHECK : '') + '<small>' + esc(club(c.club).name) + ' · há 2 horas</small></div></div>' +
      '<p class="sp-text">' + esc(p.text) + '</p>' +
      '<div class="sp-stats"><span>' + HEART + ' <b>' + num(likes) + '</b></span><i></i><span>' + BUBBLE + ' <b>' + num(Math.max(coms.length, Math.round(likes / 20))) + '</b></span></div>' +
      '<h3 class="sp-ch">Comentários</h3>' +
      coms.map((x, i) => '<div class="sp-com">' + ava(x.h) + '<div><b>' + esc(x.h) + '</b>' + (x.v ? CHECK : '') + '<small>' + (i < 2 ? 'há 1 hora' : 'há ' + (1 + Math.floor(i / 2)) + ' horas') + '</small><p>' + esc(x.t) + '</p>' +
        (x.reply ? '<div class="sp-reply"><b>' + esc(me) + '</b>' + (fame >= 80 ? CHECK : '') + '<p>' + esc(x.reply) + '</p></div>' : '') + '</div></div>').join('') +
      '</div><p class="sp-note">Comentários fictícios para a simulação do jogo.</p>' +
      '<button class="btn" id="b-post-next">Continuar</button>'
    );
    $('b-post-next').onclick = next;
  }

  const postBtn = () => '<button class="btn ghost" id="b-post">' + U.emo('📱', 'sm') + ' Postar nas redes</button>';
  const postBind = (ctx, next) => { const b = $('b-post'); if (b) b.onclick = () => socialPost(ctx, next); };

  Object.assign(U, { socialPost, postBtn, postBind, fresh });
})();
