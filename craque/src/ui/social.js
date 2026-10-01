// Nas redes: posts do jogador (só texto) com a reação da torcida e de famosos.
// Quanto mais fama, mais famosos comentam. O jogador posta quando quer: no fim da temporada, depois de um
// evento ou do lance decisivo; anunciar a última temporada já sai como post.
// U.postBtn() devolve o botão; U.postBind(ctx, next) liga o botão; U.socialPost(ctx, next) abre a tela do post.
// ctx: { kind: 'season'|'event'|'moment'|'announce'|'farewell', res?, ok?, m?, ev?, toClub? }
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, $, esc, club, render, year } = U;

  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const pick = (arr, k) => arr[((k % arr.length) + arr.length) % arr.length];
  const num = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' mi' : n >= 1e4 ? (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' mil' : n.toLocaleString('pt-BR');

  // Famosos (fictícios para a simulação): fama mínima para comentar e falas no estilo de cada um.
  // up = notícia boa, down = fase ruim, bye = despedida
  const FAMOUS = [
    { h: 'craqueneto', min: 30, up: ['Joga muito! Eu falei, meu, eu falei!', 'Isso aqui é jogador! Respeita o {n}!', 'Ô, meu, que fase! Tem que estar na Seleção!'], down: ['Acorda, {n}! Você pode muito mais, meu!', 'Eu cobro porque acredito. Bora reagir!'], bye: ['Obrigado por tudo, {n}! O futebol vai sentir falta, meu!'] },
    { h: 'podpah', min: 30, up: ['Brabo demais, mano! Vem pro Podpah contar essa 🎙️', 'É o pai! 🔥🔥', 'Papo reto: o {n} tá voando, mano!'], down: ['Força, mano! Vem pro Podpah desabafar kkkk 🎙️', 'Cabeça erguida, mano, ano que vem é teu!'], bye: ['Lenda, mano! A cadeira do Podpah te espera 🎙️'] },
    { h: 'flowsportclub', min: 30, up: ['Aí é cinema! 🎬', 'Olha o nível, rapaziada!'], down: ['Fase ruim passa, rapaziada. Confia!'], bye: ['Resenha marcada pra contar essa história toda! 🎙️'] },
    { h: 'kaka', min: 80, up: ['Que temporada! Segue firme e humilde 🙏👏', 'Visão de jogo não tem idade. Parabéns! 👏'], down: ['Momentos difíceis fazem parte. Confio muito em você 🙏'], bye: ['Uma carreira linda. Obrigado pelo futebol 🙏'] },
    { h: 'ronaldinho', min: 80, up: ['Alegria demais te ver jogar, irmão! 😁⚽', 'Joga bonito sempre! 🤙'], down: ['Sorri, irmão! Futebol é alegria 😁🤙'], bye: ['Obrigado pelas jogadas, irmão! Agora é só alegria 😁🤙'] },
    { h: 'romario', min: 80, up: ['Craque é craque. Tá no caminho certo 👊', 'Gostei. Muito bom.'], down: ['Tem que decidir mais. Simples assim.'], bye: ['Grande jogador. Bem-vindo ao clube dos aposentados 😎'] },
    { h: 'reymarjr', min: 150, up: ['Monstro demais, parceiro! 👏🔥', 'Tamo junto, mlk! Que fase! 🔥'], down: ['Cabeça erguida, parceiro. Volta mais forte! 🙏'], bye: ['Gigante! Obrigado por tudo, parceiro. Lenda! 🐐'] },
    { h: 'vinijr', min: 150, up: ['Baila, {n}! 💃🔥', 'Que temporada, irmão! Bora! 🔥'], down: ['Segue firme, irmão. Ninguém para a gente 💪'], bye: ['Inspiração pra todos nós. Obrigado, lenda! 🙌'] },
  ];
  const FANS = {
    up: ['Nosso camisa {num}! Fica pra sempre 💚', 'Que fase, {n}! Obrigado por tudo!', 'Melhor jogador que já vi com essa camisa 😍', 'Craque dentro e fora de campo 👏', 'Renova logo esse contrato, diretoria!! 🙏'],
    down: ['Ano que vem é nosso, {n}! Confia!', 'Tamo junto nas boas e nas ruins 🙏', 'Volta mais forte, craque!', 'Ainda acredito em você, {n} 💪'],
    bye: ['Não vai não 😭😭', 'Obrigado por tudo, {n}! Eterno ídolo 💚', 'Chorei aqui 😭 Que carreira!', 'Vou contar pros meus filhos que vi o {n} jogar 🥹'],
  };
  const HATERS = {
    up: ['Ainda acho superestimado 🤷', 'Contra time grande quero ver...', 'Esse post tá mais bonito que a temporada kkkk'],
    down: ['Tá na hora de pendurar a chuteira 😴', 'Salário alto pra pouca coisa...', 'Volta pro banco 🙄', 'Postando em vez de treinar?'],
    bye: ['Já foi tarde 🙄 (brincadeira, valeu, craque)'],
  };
  const CLUB = { up: ['Orgulho de ter você com a nossa camisa! 💪', 'Que temporada, {n}! 👏'], down: ['Seguimos juntos, {n}. 🤝'], bye: ['Obrigado por tudo, {n}. Sua história está escrita aqui. 🙌'] };

  // Frase de estatística da temporada conforme a posição
  const statOf = res => res.pos === 'GOL' ? (res.cleanSheets || 0) + ' jogos sem sofrer gol' : res.pos === 'ZAG' ? (res.tackles || 0) + ' desarmes decisivos'
    : res.pos === 'MEI' ? res.assists + ' assistências' : res.goals + ' gols';

  // Texto do post e o "clima" (up, down, bye) de cada situação
  function postOf(ctx) {
    const c = G.c, n = c.seasons.length + c.name.length, cl = club(c.club).name;
    if (ctx.kind === 'season') {
      const r = ctx.res, ballon = r.awards.some(a => a.id === 'ballon');
      const mood = ballon ? 'ballon' : r.titles.length ? 'title' : !r.games || r.games < 10 ? 'bench' : r.injury >= 25 ? 'injury'
        : r.move && r.move.dir === 'down' ? 'down' : r.rating >= 7.6 ? 'great' : r.rating >= 7.0 ? 'good' : 'bad';
      const age = r.age >= 35 ? ' Aos ' + r.age + ', ainda tenho história pra escrever.' : '';
      const T = {
        ballon: ['Bola de Ouro. Nem nos meus sonhos de moleque eu imaginei isso. Obrigado a todos que estiveram comigo! 🏆✨'],
        title: ['CAMPEÕES! 🏆 ' + r.titles.map(t => t.name).join(' e ') + '. Temporada de muito trabalho. Obrigado, ' + cl + '!', 'É campeão! 🏆 ' + statOf(r) + ' e uma taça pra guardar pra sempre. Obrigado, torcida!'],
        great: [statOf(r) + '. Temporada pra guardar na memória. Obrigado, ' + cl + '! 💪' + age, 'Que ano! ' + statOf(r) + ' e muito orgulho dessa camisa. Bora pra mais! 🔥' + age],
        good: [statOf(r) + ', uma temporada de entrega e muito orgulho de vestir essa camisa.' + (age || ' Obrigado, ' + cl + '! 💪'), 'Temporada de evolução. ' + statOf(r) + ' e a certeza de que dá pra mais. 💪' + age],
        bad: ['Não foi a temporada que eu queria. Vou trabalhar em dobro pra voltar mais forte. 🙏', 'Ano abaixo do que eu espero de mim. Cabeça no lugar e trabalho. 💪'],
        bench: ['Poucos minutos esse ano, mas sigo trabalhando todo dia. Minha hora vai chegar. 💪'],
        injury: ['Ano difícil, longe dos gramados. Obrigado pelo carinho de todos. Já já tô de volta! 🙏'],
        down: ['Dói demais. Peço desculpas à torcida. A gente vai voltar. 💔'],
      };
      return { text: pick(T[mood], n), mood: ['ballon', 'title', 'great', 'good'].includes(mood) ? 'up' : 'down' };
    }
    if (ctx.kind === 'event') {
      if (ctx.toClub) return { text: 'Novo capítulo! Muito feliz de chegar ' + D.ao(club(ctx.toClub).name) + '. Vamos com tudo! ✍️', mood: 'up' };
      return ctx.ok ? { text: pick(['Decisão tomada, foco total no que importa: o campo. 💪', 'Mais um capítulo da história. Seguimos! 🙌', 'Dia importante hoje. Gratidão por tudo! 🙏'], n), mood: 'up' }
        : { text: pick(['Nem tudo sai como a gente planeja. Cabeça erguida e bola pra frente. 🙏', 'Dia difícil. Aprendizado e sigo em frente. 💪'], n), mood: 'down' };
    }
    if (ctx.kind === 'moment') {
      const m = ctx.m, st = S.kickSetupType(m), what = st === 'save' ? 'Que defesa!' : st === 'tackle' ? 'Bola roubada no último minuto!' : st === 'pass' ? 'Que passe!' : 'Que gol!';
      const end = { cup: 'É CAMPEÃO! 🏆', cont: 'É CAMPEÃO! 🏆', title: 'O título é nosso! 🏆', acesso: 'ACESSO! 🚀', classico: 'Clássico é clássico, e é nosso! 🔥' }[m.type];
      return ctx.ok ? { text: what + ' ' + end + ' Isso aqui é pra vocês, torcida!', mood: 'up' }
        : { text: pick(['Assumo a responsabilidade. Dói, mas vou voltar mais forte. 🙏', 'Não foi dessa vez. Obrigado pelo apoio de sempre, torcida. 💔'], n), mood: 'down' };
    }
    if (ctx.kind === 'announce') return { text: 'Chegou a hora. Essa vai ser minha última temporada como jogador. Quero aproveitar cada jogo ao lado de vocês. Obrigado, futebol! ⚽🙏', mood: 'bye' };
    // Despedida: o resumo da carreira
    const T2 = c.totals;
    return { text: 'Hoje eu me despeço dos gramados. ' + c.seasons.length + ' temporadas, ' + T2.goals + ' gols, ' + T2.assists + ' assistências. Obrigado, futebol. ⚽❤️', mood: 'bye' };
  }

  // Comentários: famosos pela fama, torcida, clube e às vezes um hater (mais haters na fase ruim)
  function commentsOf(ctx, mood, k) {
    const c = G.c, fame = c.fame || 0, cl = club(c.club), base = slug(cl.name).slice(0, 12);
    const fill = t => t.replace(/\{n\}/g, c.name).replace(/\{num\}/g, c.number || 10);
    const out = [];
    const nFam = (fame >= 250 ? 4 : fame >= 150 ? 3 : fame >= 80 ? 2 : fame >= 30 ? 1 : 0) + (mood === 'bye' ? 1 : 0);
    // Os mais famosos que alcançam o jogador vêm primeiro; dentro de cada grupo, a ordem varia
    const fam = FAMOUS.filter(f => fame >= f.min || (mood === 'bye' && f.min <= 30)).map((f, i) => [f, (i * 5 + k) % 7]).sort((a, b) => b[0].min - a[0].min || a[1] - b[1]).map(x => x[0]);
    fam.slice(0, nFam).forEach((f, i) => out.push({ h: f.h, v: true, t: fill(pick(f[mood], k + i)) }));
    const fans = [base + '_raiz', base + '.fiel', 'arquibancada_' + (60 + k % 39), base + 'dacadeira', 'torcedor_' + base.slice(0, 6), 'resenha.fc'];
    if (mood !== 'down' || k % 2) out.push({ h: base + 'oficial', v: true, t: fill(pick(CLUB[mood], k)) });
    const hater = mood === 'down' ? k % 3 !== 0 : k % 3 === 0;
    let i = 0;
    while (out.length < (hater ? 4 : 5)) { out.push({ h: pick(fans, k + i), v: false, t: fill(pick(FANS[mood], k + i)) }); i++; }
    if (hater) out.push({ h: pick(['opiniao_sincera', 'futebol.critico', 'zueira_fc', 'secador_oficial'], k), v: false, t: pick(HATERS[mood], k) });
    return out.slice(0, 5);
  }

  const CHECK = '<svg class="sp-check" viewBox="0 0 24 24" aria-label="verificado"><path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.8 1 2.8-2.5 1.6-.9 2.9-3-.2L12 19.3l-2.4-1.8-3 .2-.9-2.9-2.5-1.6 1-2.8-1-2.8 2.5-1.6.9-2.9 3 .2Z" fill="#3897F0"/><path d="m8 10.6 2.8 2.8L16.4 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="#ED4956"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-1.3-4.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  function socialPost(ctx, next) {
    const c = G.c, fame = c.fame || 0, k = c.seasons.length * 7 + c.name.length + (ctx.kind.length * 3);
    const p = postOf(ctx), coms = commentsOf(ctx, p.mood, k);
    const likes = Math.round(80 * Math.pow(1.035, Math.min(320, fame)) * (p.mood === 'bye' ? 3 : p.mood === 'up' ? 1.4 : 0.8));
    const me = slug(c.name) + (c.number || 10);
    const ava = h => '<span class="sp-ava">' + esc(h[0].toUpperCase()) + '</span>';
    render(
      '<div class="eyebrow">Temporada ' + year() + ' · ' + c.age + ' anos</div><h1 class="sp-h1">Nas redes</h1><span class="sp-tag">Post do jogador</span>' +
      '<div class="card sp-card"><div class="sp-head">' + ava(me) + '<div><b>' + esc(me) + '</b>' + (fame >= 80 ? CHECK : '') + '<small>' + esc(club(c.club).name) + ' · há 2 horas</small></div></div>' +
      '<p class="sp-text">' + esc(p.text) + '</p>' +
      '<div class="sp-stats"><span>' + HEART + ' <b>' + num(likes) + '</b></span><i></i><span>' + BUBBLE + ' <b>' + num(Math.max(coms.length, Math.round(likes / 20))) + '</b></span></div>' +
      '<h3 class="sp-ch">Comentários</h3>' +
      coms.map((x, i) => '<div class="sp-com">' + ava(x.h) + '<div><b>' + esc(x.h) + '</b>' + (x.v ? CHECK : '') + '<small>há ' + (1 + Math.floor(i / 2)) + (i < 2 ? ' hora' : ' horas') + '</small><p>' + esc(x.t) + '</p></div></div>').join('') +
      '</div><p class="sp-note">Comentários fictícios para a simulação do jogo.</p>' +
      '<button class="btn" id="b-post-next">Continuar</button>'
    );
    $('b-post-next').onclick = next;
  }

  const postBtn = () => '<button class="btn ghost" id="b-post">' + U.emo('📱', 'sm') + ' Postar nas redes</button>';
  const postBind = (ctx, next) => { const b = $('b-post'); if (b) b.onclick = () => socialPost(ctx, next); };

  Object.assign(U, { socialPost, postBtn, postBind });
})();
