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

  // Sorteios: um item, ou vários sem repetir
  const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const chance = p => Math.random() < p;

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

  // Texto do post e o clima (up, down, bye) de cada situação
  function postOf(ctx) {
    const c = G.c, P = D.SOCIAL.posts;
    if (ctx.kind === 'season') {
      const r = ctx.res, ballon = r.awards.some(a => a.id === 'ballon');
      const mood = ballon ? 'ballon' : r.titles.length ? 'title' : !r.games || r.games < 10 ? 'bench' : r.injury >= 25 ? 'injury'
        : r.move && r.move.dir === 'down' ? 'down' : r.rating >= 7.6 ? 'great' : r.rating >= 7.0 ? 'good' : 'bad';
      let text = rnd(P[mood]);
      if (r.age >= 35 && (mood === 'great' || mood === 'good') && chance(0.6)) text += ' Aos ' + r.age + ', ainda tenho história pra escrever.';
      return { text, mood: ['ballon', 'title', 'great', 'good'].includes(mood) ? 'up' : 'down', res: r };
    }
    if (ctx.kind === 'event') {
      if (ctx.toClub) return { text: rnd(P.transfer), mood: 'up', club: ctx.toClub };
      return ctx.ok ? { text: rnd(P.eventOk), mood: 'up' } : { text: rnd(P.eventKo), mood: 'down' };
    }
    if (ctx.kind === 'moment') {
      const m = ctx.m, st = S.kickSetupType(m), key = st === 'save' ? 'save' : st === 'tackle' ? 'tackle' : st === 'pass' ? 'pass' : 'goal';
      return ctx.ok ? { text: rnd(P.momentOk[key]) + ' ' + rnd(P.momentEnd[m.type] || P.momentEnd.cup) + ' ' + rnd(P.momentTail), mood: 'up' } : { text: rnd(P.momentKo), mood: 'down' };
    }
    if (ctx.kind === 'announce') return { text: rnd(P.announce), mood: 'bye' };
    return { text: rnd(P.farewell), mood: 'bye' };
  }

  // Comentários: famosos pela fama, clube, torcida, um aleatório da internet e às vezes um hater (que pode levar resposta)
  function commentsOf(mood) {
    const c = G.c, fame = c.fame || 0, cl = club(c.club), base = slug(cl.name).slice(0, 12), SO = D.SOCIAL;
    const out = [];
    const nFam = (fame >= 250 ? 4 : fame >= 150 ? 3 : fame >= 80 ? 2 : fame >= 30 ? 1 : 0) + (mood === 'bye' ? 1 : 0);
    // Sorteio com peso: os mais famosos que alcançam o jogador têm mais chance, mas os outros também aparecem
    const fam = SO.famous.filter(f => fame >= f.min || (mood === 'bye' && f.min <= 30)).map(f => [f.min + Math.random() * 230, f]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    fam.slice(0, nFam).forEach(f => out.push({ h: f.h, v: true, t: rnd(f[mood]) }));
    if (chance(mood === 'down' ? 0.5 : 0.75)) out.push({ h: base + 'oficial', v: true, t: rnd(SO.club[mood]) });
    const hater = chance(mood === 'down' ? 0.65 : mood === 'bye' ? 0.2 : 0.3);
    const extra = chance(0.55); // comentário aleatório da internet
    const fanTexts = shuffle(SO.fans[mood]), fanHandles = shuffle(SO.fanHandles.map(x => base + x).concat(SO.randomHandles));
    let i = 0;
    while (out.length < 5 - (hater ? 1 : 0) - (extra ? 1 : 0)) { out.push({ h: fanHandles[i], v: false, t: fanTexts[i] }); i++; }
    if (extra) out.splice(1 + Math.floor(Math.random() * (out.length - 1)), 0, { h: fanHandles[i++], v: false, t: rnd(SO.random) });
    if (hater) out.push({ h: rnd(SO.haterHandles), v: false, t: rnd(SO.haters[mood]), reply: chance(0.45) ? rnd(SO.replies) : null });
    return out.slice(0, 5);
  }

  const CHECK = '<svg class="sp-check" viewBox="0 0 24 24" aria-label="verificado"><path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.8 1 2.8-2.5 1.6-.9 2.9-3-.2L12 19.3l-2.4-1.8-3 .2-.9-2.9-2.5-1.6 1-2.8-1-2.8 2.5-1.6.9-2.9 3 .2Z" fill="#3897F0"/><path d="m8 10.6 2.8 2.8L16.4 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="#ED4956"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-1.3-4.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  function socialPost(ctx, next) {
    const c = G.c, fame = c.fame || 0;
    const p = postOf(ctx), coms = commentsOf(p.mood), cl = club(p.club || c.club).name, T = c.totals || {};
    const fill = t => t.replace(/\{n\}/g, c.name).replace(/\{num\}/g, c.number || 10).replace(/\{time\}/g, cl).replace(/\{cor\}/g, heart(c.club)).replace(/\{aoTime\}/g, D.ao(cl))
      .replace(/\{idade\}/g, c.age).replace(/\{stat\}/g, p.res ? statOf(p.res) : '').replace(/\{titulos\}/g, p.res ? p.res.titles.map(x => x.name).join(' e ') : '')
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
      coms.map((x, i) => '<div class="sp-com">' + ava(x.h) + '<div><b>' + esc(x.h) + '</b>' + (x.v ? CHECK : '') + '<small>há ' + (1 + Math.floor(i / 2)) + (i < 2 ? ' hora' : ' horas') + '</small><p>' + esc(x.t) + '</p>' +
        (x.reply ? '<div class="sp-reply"><b>' + esc(me) + '</b>' + (fame >= 80 ? CHECK : '') + '<p>' + esc(x.reply) + '</p></div>' : '') + '</div></div>').join('') +
      '</div><p class="sp-note">Comentários fictícios para a simulação do jogo.</p>' +
      '<button class="btn" id="b-post-next">Continuar</button>'
    );
    $('b-post-next').onclick = next;
  }

  const postBtn = () => '<button class="btn ghost" id="b-post">' + U.emo('📱', 'sm') + ' Postar nas redes</button>';
  const postBind = (ctx, next) => { const b = $('b-post'); if (b) b.onclick = () => socialPost(ctx, next); };

  Object.assign(U, { socialPost, postBtn, postBind });
})();
