// Postagens no Instagram do jogador: a imagem é montada com o personagem (avatar.js) e a cena do evento.
// U.instaPost(kind, opts) devolve o HTML do post (cabeçalho, foto, curtidas, legenda e comentários).
(function () {
  const U = window.CRAQUE_UI, D = window.CRAQUE_DATA;
  const A = () => window.ClimbixAvatar;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // Coloca um avatar (viewBox -60 0 240 200, pés em x 60, y 195) com os pés em (cx, feet), na escala s
  const put = (svg, cx, feet, s) => svg.replace('<svg ', '<svg x="' + (cx - 120 * s) + '" y="' + (feet - 195 * s) + '" width="' + 240 * s + '" height="' + 200 * s + '" overflow="visible" ');
  const handle = name => '@' + String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const num = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' mi' : n >= 1e4 ? Math.round(n / 1e3) + ' mil' : n.toLocaleString('pt-BR');
  const kitOf = c => (window.CRAQUE_KITS || {})[c.club] || ['#12824A', '#F4F1E8'];

  // Cenas: cada uma devolve o SVG quadrado da foto do post
  const SCENES = {
    // Doação para um instituto: você com o cheque gigante, crianças do projeto comemorando, faixa do instituto e confete
    doacao(c, o) {
      const AV = A(), inst = o.inst || 'Instituto Craques do Amanhã';
      const me = AV.photo('cheque', kitOf(c), c, { flat: true, cheque: { to: inst.toUpperCase(), val: o.val || 'R$ 1.000.000,00', ext: o.ext || 'Um milhão de reais', date: o.date || '' } });
      // Crianças com a camiseta do projeto (verde e branco), cada uma com um visual
      // Camiseta do projeto: verde, ou laranja se o seu clube também for verde
      const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), k = rgb(kitOf(c)[0]);
      const tee = k[1] > k[0] + 30 && k[1] > k[2] + 20 ? ['#E8742A', '#F4F2EA'] : ['#2E9E6A', '#F4F2EA'];
      const kid = (i, pose) => AV.photo(pose, tee, { name: 'kid' + i + c.name, pos: 'MEI', look: { v: 2, skin: [1, 4, 6, 2, 5, 7][(i + c.name.length) % 6], hair: ['curto', 'black', 'trancas', 'raspado', 'topete', 'longo'][(i * 2 + c.name.length) % 6], hc: [0, 0, 1, 2, 0, 3][(i + c.name.length) % 6], beard: 'nenhuma' } }, { flat: true, num: String(i + 2) });
      let conf = '';
      for (let i = 0; i < 46; i++) {
        const x = (i * 83 + 17) % 400, y = (i * 47 + 11) % 210, col = ['#F2C230', '#2E9E6A', '#E8463C', '#2F6FD6', '#FF8FC2'][i % 5];
        conf += '<rect x="' + x + '" y="' + y + '" width="5" height="9" rx="1.2" fill="' + col + '" transform="rotate(' + ((i * 37) % 180) + ' ' + (x + 2.5) + ' ' + (y + 4.5) + ')" opacity=".9"/>';
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
        '<defs><linearGradient id="ig-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDF3DD"/><stop offset="1" stop-color="#F3DEB4"/></linearGradient>' +
        '<radialGradient id="ig-light" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="400" height="400" fill="url(#ig-wall)"/><rect width="400" height="400" fill="url(#ig-light)"/>' +
        // Faixa do instituto na parede
        '<rect x="40" y="28" width="320" height="64" rx="10" fill="#2E9E6A"/><rect x="40" y="84" width="320" height="8" fill="#1B6B45"/>' +
        '<path d="M74 52c-6-9-20-4-16 6 3 7 16 15 16 15s13-8 16-15c4-10-10-15-16-6Z" fill="#F2C230" stroke="#1B1A17" stroke-width="2"/>' +
        '<text x="102" y="56" textLength="244" lengthAdjust="spacingAndGlyphs" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="24" fill="#fff">' + esc(inst.toUpperCase()) + '</text>' +
        '<text x="102" y="76" font-family="Barlow, Arial, sans-serif" font-weight="600" font-size="12" fill="#D9F2E4">Esporte e educação para crianças</text>' +
        conf +
        // Piso
        '<rect y="330" width="400" height="70" fill="#D9B98A"/><rect y="330" width="400" height="4" fill="#C49F6E"/>' +
        // Você no centro com o cheque; crianças do projeto dos lados (atrás as menores)
        put(kid(0, 'celebra'), 100, 356, 0.74) + put(kid(1, 'celebra'), 300, 356, 0.74) +
        put(me, 200, 394, 1.55) +
        put(kid(2, 'celebra'), 44, 396, 0.86) + put(kid(3, 'celebra'), 356, 396, 0.86) +
        '</svg>';
    },
  };

  // Ícones da barra de ações (desenhados aqui, sem depender de fonte)
  const ICO = {
    heart: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 21s-7.5-4.6-9.6-9.3C.7 7.8 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.8C13.2 5.1 14.7 4 16.8 4c3.8 0 6.5 3.8 4.8 7.7C19.5 16.4 12 21 12 21Z" fill="#ED4956"/></svg>',
    comment: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-1.3-4.6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M22 3 9.2 10.1M22 3l-7 18-3.8-8.1L3 9.4 22 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M19 21l-7-5.5L5 21V3h14v18Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.8 1 2.8-2.5 1.6-.9 2.9-3-.2L12 19.3l-2.4-1.8-3 .2-.9-2.9-2.5-1.6 1-2.8-1-2.8 2.5-1.6.9-2.9 3 .2Z" fill="#3897F0"/><path d="m8 10.6 2.8 2.8L16.4 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // Texto de cada tipo de post: legenda, local e comentários (curtidas sobem com a fama)
  const TEXT = {
    doacao: c => ({
      place: 'Instituto Craques do Amanhã',
      caption: 'Hoje foi dia de retribuir. O futebol me deu tudo, e nada mais justo do que ajudar quem está começando. Obrigado, molecada, pela tarde incrível! 💚⚽ #CraquesDoAmanhã',
      comments: [['instcraquesdoamanha', 'Gratidão eterna! As crianças não param de falar de você 💚'], ['torcedor_raiz', 'Craque dentro e fora de campo 👏👏'], ['mae.do.joaozinho', 'Meu filho ganhou o dia! Obrigada!! 😭']],
    }),
  };

  // kind: tipo do post; opts: { c, likes?, val?, ext?, inst? }
  function instaPost(kind, opts) {
    opts = opts || {};
    const c = opts.c || (U.G && U.G.c), AV = A();
    if (!c || !AV || !SCENES[kind]) return '';
    const t = TEXT[kind](c), h = handle(c.name), fame = c.fame || 0;
    const likes = opts.likes || Math.round(2500 + fame * fame * 9 + fame * 400), coms = Math.round(likes / 38);
    const face = AV.url(AV.photo('normal', kitOf(c), c, { flat: true, crop: true }));
    return '<div class="ig">' +
      '<div class="ig-head"><span class="ig-ring"><img src="' + face + '" alt=""></span><div class="ig-who"><b>' + esc(h.slice(1)) + '</b>' + (fame >= 40 ? ICO.check : '') +
      '<span>' + esc(t.place) + '</span></div><span class="ig-more">•••</span></div>' +
      '<div class="ig-photo">' + SCENES[kind](c, opts) + '</div>' +
      '<div class="ig-act">' + ICO.heart + ICO.comment + ICO.send + '<span class="ig-sp"></span>' + ICO.save + '</div>' +
      '<div class="ig-txt"><p class="ig-likes">' + num(likes) + ' curtidas</p>' +
      '<p><b>' + esc(h.slice(1)) + '</b> ' + esc(t.caption) + '</p>' +
      '<p class="ig-all">Ver todos os ' + num(coms) + ' comentários</p>' +
      t.comments.slice(0, 2).map(([u, x]) => '<p><b>' + esc(u) + '</b> ' + esc(x) + '</p>').join('') +
      '<p class="ig-when">Há 2 horas</p></div></div>';
  }
  Object.assign(U, { instaPost });
})();
