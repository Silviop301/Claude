// Interface — configurações: abre por cima de qualquer tela (a carreira segue de onde parou).
// Guardadas no aparelho em window.CLIMBIX_CFG (definido em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;
  const canVibe = typeof navigator !== 'undefined' && !!navigator.vibrate;
  // Duas caixas: chaves de liga/desliga (som e tela) e escolhas curtas na linha (o que muda a partida). Salva no toque
  const GROUPS = () => [
    { t: 'Som e tela', rows: [
      { k: 'sound', t: 'Som' },
    ].concat(window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.has ? [{ k: 'music', t: 'Música' }] : []).concat(canVibe ? [{ k: 'vibe', t: 'Vibração' }] : []).concat([
      { k: 'fx3d', t: 'Efeitos 3D', d: 'desligue se o celular esquentar' },
    ]) },
    { t: 'Na partida', rows: [
      { k: 'moments', t: 'Lances decisivos', d: 'Cobrar ou deixar a carta decidir', opts: [['play', 'Jogar'], ['auto', 'Auto']] },
      { k: 'cups', t: 'Copa e Mundial', d: 'Jogo a jogo ou só o placar', opts: [['play', 'Jogar'], ['sim', 'Simular']] },
      { k: 'fast', t: 'Fim de temporada', d: 'Números contando', opts: [[false, 'Normal'], [true, 'Rápido']] },
      { k: 'papers', t: 'Jornais', d: 'Capa no fim do ano', opts: [['all', 'Todos'], ['special', 'Especiais'], ['none', 'Não']] },
      { k: 'tips', t: 'Dicas', d: 'Religar mostra todas outra vez' },
    ] },
  ];
  const value = k => (k === 'tips' ? U.tipsOn() : k === 'sound' ? !!(window.CRAQUE_SFX && window.CRAQUE_SFX.on) : k === 'music' ? !!(window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.on) : window.CLIMBIX_CFG[k]);

  // Versão do jogo (aparece nas Configurações e decide quando mostrar as novidades)
  const VERSION = '1.0';
  const NEWS_KEY = 'climbix-novidades';
  const NEWS = [
    ['🎲', 'Decisões que mudam a carreira', 'Todo evento mostra a chance de dar certo e o que se ganha ou perde. Atributos ganhos ou perdidos ficam para sempre.'],
    ['🧭', 'Escolhas de fim de carreira', 'Depois dos 30: liderança, herdeiro, ambição, cuidar do corpo. Valem legado na nota final.'],
    ['🏆', 'Mais taças', 'Sul-Americana, Liga Europa, Liga Conferência, Champions da Ásia, da Concacaf e da África, e Supercopas.'],
    ['🌍', '39 países', 'Todos os países com liga viraram jogáveis, mais 12 novos: Peru, Croácia, Noruega, Marrocos, Egito, Austrália...'],
    ['🏟️', 'Treino dos lances', 'Antes do primeiro lance de cada tipo, um treino que não vale nada. Repita quando quiser nas Configurações.'],
  ];
  // Novidades: uma vez por versão, só para quem já jogava (quem chega agora vê o jogo direto)
  function whatsNew(force) {
    let seen = null; try { seen = localStorage.getItem(NEWS_KEY); } catch (e) {}
    const veteran = !!(U.load('craque-v5') || U.load('craque-hall-v1'));
    if (!force && (seen === VERSION || !veteran)) { try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {} return; }
    try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {}
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    w.innerHTML = '<div class="cfg news-sheet" role="dialog" aria-modal="true" aria-label="Novidades"><div class="cfg-head"><b>Climbix ' + VERSION + ' · Novidades</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
      '<div class="news-list">' + NEWS.map(([ic, t, d]) => '<div class="news-it">' + U.emo(ic, 'sm') + '<div><b>' + esc(t) + '</b><small>' + esc(d) + '</small></div></div>').join('') + '</div>' +
      '<button class="btn" id="news-ok">Bora jogar</button></div>';
    const close = () => w.remove();
    w.onclick = e => { if (e.target === w) close(); };
    w.querySelector('.cfg-x').onclick = close;
    w.querySelector('#news-ok').onclick = close;
    document.body.appendChild(w);
  }

  function settings() {
    document.querySelectorAll('.cfg-wrap').forEach(x => x.remove());
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    const solo = !!window.CLIMBIX_SOLO;
    const paint = () => {
      const y = w.querySelector('.cfg') ? w.querySelector('.cfg').scrollTop : 0;
      const sw = r => { const on = !!value(r.k);
        return '<button class="sw' + (on ? ' on' : '') + '" data-k="' + r.k + '" data-v="' + !on + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(r.t) + '"><i></i></button>'; };
      const seg = r => '<span class="cfg-seg2" role="group" aria-label="' + esc(r.t) + '">' + r.opts.map(([v, l]) =>
        '<button data-k="' + r.k + '" data-v="' + v + '" aria-pressed="' + (value(r.k) === v) + '"' + (value(r.k) === v ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</span>';
      const row = r => '<div class="cfg-r"><span class="cfg-rt"><b>' + esc(r.t) + '</b>' + (r.d ? '<small>' + esc(r.d) + '</small>' : '') + '</span>' + (r.opts ? seg(r) : sw(r)) + '</div>';
      const name = U.cloudName(), st = U.cloudStatus ? U.cloudStatus() : null;
      // Conta: carteirinha com canhoto (o mesmo ingresso da tela inicial)
      const conta = solo ? '' : '<button class="tk tk-acc" id="cfg-acc"><span class="tk-in"><span class="tk-paper"><span class="tk-frame">' +
        '<i class="tk-cloud">' + U.ICON.cloud + '</i><span class="tk-t"><small>' + (st ? 'Sua conta' : 'Salve na nuvem') + '</small><b>' + esc(st ? name : 'Criar conta') + '</b>' +
        '<small id="cloud-st">' + esc(st || 'jogue em outro aparelho') + '</small></span></span></span><span class="tk-stub"><b>' + (st ? 'Conta' : 'Entrar') + ' ›</b></span></span></button>';
      const link = (id, ic, t) => '<button class="cfg-link" id="' + id + '">' + U.emo(ic, 'sm') + '<span>' + t + '</span>' + U.ICON['chevron-right'] + '</button>';
      w.innerHTML = '<div class="cfg cfg2" role="dialog" aria-modal="true" aria-label="Configurações"><div class="cfg-head"><b>Configurações</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
        conta + GROUPS().map(g => '<div class="cfg-grp"><h3>' + g.t + '</h3><div class="cfg-box">' + g.rows.map(row).join('') + '</div></div>').join('') +
        '<div class="cfg-links">' + link('cfg-train', '🥅', 'Treinar lances') + link('cfg-fb', '💬', 'Dar opinião sobre o jogo') + link('cfg-news', '📣', 'Novidades da versão ' + VERSION) + '</div>' +
        // Crédito exigido pela licença dos emojis
        '<p class="cfg-credit">Emojis: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> (CC-BY 4.0)</p></div>';
      w.querySelector('.cfg').scrollTop = y;
      w.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw;
        if (k === 'tips') U.tipsSet(v);
        else if (k === 'sound') { if (window.CRAQUE_SFX && window.CRAQUE_SFX.on !== v) window.CRAQUE_SFX.toggle(); }
        else if (k === 'music') { if (window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.on !== v) window.CRAQUE_MUSIC.toggle(); }
        else U.setCfg(k, v);
        if (k === 'vibe' && v) U.vibe(20);
        paint();
      });
      const close = () => { w.remove(); if (U.G.c) U.bar(); };
      w.querySelector('.cfg-x').onclick = close;
      w.querySelector('#cfg-train').onclick = () => { close(); U.trainMenu(); };
      w.querySelector('#cfg-fb').onclick = () => { close(); U.feedback('config'); };
      w.querySelector('#cfg-news').onclick = () => { close(); whatsNew(true); };
      // A conta é uma tela inteira: no meio da carreira pergunta antes (a carreira fica salva)
      if (w.querySelector('#cfg-acc')) w.querySelector('#cfg-acc').onclick = () => { close(); if (U.G.c) U.ask('Abrir a conta?', 'Sua carreira fica salva e você continua de onde parou.', 'Abrir conta', () => U.cloud('login')); else U.cloud('login'); };
    };
    w.onclick = e => { if (e.target === w) { w.remove(); if (U.G.c) U.bar(); } };
    paint();
    document.body.appendChild(w);
    setTimeout(() => w.classList.add('shown'), 300); // a animação de entrada só na abertura
  }

  // Ajustes deitados (2026-11-09, quadro 52 do canvas): tela inteira no palco U.LD no lugar da janelinha em pé, aberta pela
  // home deitada. Só o que vale no Treinador: Som, Sua opinião e a conta. Vibração, Efeitos 3D, as escolhas "Na partida",
  // Treinar lances e as Novidades (texto ainda do Jogador) ficam na janelinha em pé, que os modos em pé continuam abrindo
  function settingsLand(back) {
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const out = () => (back || U.home)();
    const draw = () => {
      const rot = !!(U.rotPref && U.rotPref()), rotSw = rot || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); // tela girada (rotação travada em pé, ui/coachland.js)
      const on = !!value('sound'), mus = !!value('music'), vel = U.coVel ? U.coVel() : '1', fx = U.coFx ? U.coFx() : true, st = !window.CLIMBIX_SOLO && U.cloudStatus ? U.cloudStatus() : null, solo = !!window.CLIMBIX_SOLO;
      U.LD.show('<div class="aj' + (solo ? ' aj-solo' : '') + '"><div class="tm-h"><button class="tcr-back" id="aj-back" aria-label="Voltar">' + BK + '</button><b>Ajustes</b><small class="aj-v">Climbix ' + VERSION + '</small></div>' +
        '<div class="aj-l' + (mus && rotSw ? ' n6 n7' : mus || rotSw ? ' n6' : '') + '"><button class="aj-sw' + (on ? ' on' : '') + '" id="aj-som" role="switch" aria-checked="' + on + '"><b>Som</b><span class="aj-tg"><i></i></span></button>' +
          (window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.has ? '<button class="aj-sw' + (mus ? ' on' : '') + '" id="aj-mus" role="switch" aria-checked="' + mus + '"><b>Música</b><span class="aj-tg"><i></i></span></button>' +
            (mus ? '<button class="aj-sw' + (window.CRAQUE_MUSIC.live ? ' on' : '') + '" id="aj-mlv" role="switch" aria-checked="' + window.CRAQUE_MUSIC.live + '"><b>Música no jogo ao vivo</b><span class="aj-tg"><i></i></span></button>' : '') : '') +
          '<button class="aj-sw aj-vel" id="aj-vel" aria-label="Velocidade dos jogos: ' + vel + 'x"><b>Velocidade dos jogos</b><span class="aj-seg"><i' + (vel === '1' ? ' class="on"' : '') + '>1×</i><i' + (vel === '3' ? ' class="on"' : '') + '>3×</i></span></button>' +
          '<button class="aj-sw' + (fx ? ' on' : '') + '" id="aj-fx" role="switch" aria-checked="' + fx + '"><b>Comemoração e câmera lenta</b><span class="aj-tg"><i></i></span></button>' +
          (rotSw ? '<button class="aj-sw' + (rot ? ' on' : '') + '" id="aj-rot" role="switch" aria-checked="' + rot + '"><b>Tela girada</b><span class="aj-tg"><i></i></span></button>' : '') +
          '<button class="aj-lk" id="aj-fb">Sua opinião</button></div>' +
        (solo ? '' : '<div class="aj-acc"><small>' + (st ? 'SUA CONTA' : 'CONTA') + '</small><b>' + esc(st ? U.cloudName() : 'Salve na nuvem') + '</b>' +
          '<span>' + esc(st || 'Suas carreiras e moedas em qualquer aparelho.') + '</span><i></i>' +
          '<button class="aj-go' + (st ? ' dark' : '') + '" id="aj-acc">' + (st ? 'Abrir a conta' : 'Entrar ou criar conta') + '</button></div>') + '</div>',
        w => {
          w.querySelector('#aj-back').onclick = () => { U.sfx('tap'); out(); };
          w.querySelector('#aj-som').onclick = () => { if (window.CRAQUE_SFX) window.CRAQUE_SFX.toggle(); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-mus')) w.querySelector('#aj-mus').onclick = () => { if (window.CRAQUE_MUSIC) window.CRAQUE_MUSIC.toggle(); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-mlv')) w.querySelector('#aj-mlv').onclick = () => { window.CRAQUE_MUSIC.liveToggle(); U.sfx('tap'); draw(); };
          w.querySelector('#aj-vel').onclick = () => { if (U.coVel) U.coVel(vel === '3' ? '1' : '3'); U.sfx('tap'); draw(); };
          w.querySelector('#aj-fx').onclick = () => { if (U.coFx) U.coFx(!fx); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-rot')) w.querySelector('#aj-rot').onclick = () => { U.rotPref(!rot); U.sfx('tap'); draw(); U.LD.fit(); };
          w.querySelector('#aj-fb').onclick = () => { U.sfx('tap'); U.feedbackLand ? U.feedbackLand(draw) : U.feedback('config'); };
          if (w.querySelector('#aj-acc')) w.querySelector('#aj-acc').onclick = () => { U.sfx('tap'); U.cloud('login', null, null, draw); };
        }, 'O Climbix é jogado com o celular deitado.');
    };
    draw();
  }

  // Novidades deitadas (2026-11-11; Silvio escolheu a entrada A do desenho https://claude.ai/artifact/WmxuvUV4Ci5FsPrvTS2M2z):
  // na home deitada a pílula "1.0 · Novidades" no canto de cima à esquerda (ui/start.js) leva o pontinho dourado enquanto a
  // versão não foi vista (U.newsNew) e abre esta tela no palco U.LD. Cada versão = um anúncio curto e até 4 destaques, sem
  // rolar; a mais nova primeiro, e com mais de uma as setas do topo trocam. `dt` = data por extenso (vazio não mostra)
  const NEWS_LAND = [{ v: '1.0', dt: '', tag: 'LANÇAMENTO · VERSÃO 1.0', h: 'O Climbix chegou!', art: '🎉',
    p: 'Você é o técnico. Escale o time, mexa com a bola rolando e leve o seu clube da última divisão ao topo.', s: 'Bom jogo, professor!', foot: 'Modo Jogador chega em breve.',
    lt: 'O QUE TEM NA 1.0', li: [['⚽', 'Jogo ao vivo de verdade', 'Cada lance é decidido na hora.'], ['📣', 'Momentos da auxiliar', 'Ela sugere, você decide.'], ['🤝', 'Mercado e treino', 'Compre, venda e evolua o elenco.'], ['🏟️', 'O seu clube', 'Estádio, médico e finanças.']] }];
  const newsNew = () => { try { return localStorage.getItem(NEWS_KEY) !== VERSION; } catch (e) { return false; } };
  function novidadesLand(back, i) {
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', AR = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
    const out = () => (back || U.home)(), n = NEWS_LAND.length; i = Math.max(0, Math.min(n - 1, i || 0));
    const N = NEWS_LAND[i];
    try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {}
    U.LD.show('<div class="nvd"><div class="tm-h"><button class="tcr-back" id="nvd-back" aria-label="Voltar">' + BK + '</button><span class="mk-tt"><b>Novidades</b><small>Versão ' + N.v + (N.dt ? ' · ' + N.dt : '') + '</small></span>' +
        (n > 1 ? '<span class="nvd-pg"><button id="nvd-nx" aria-label="Versão mais nova"' + (i ? '' : ' disabled') + '>' + AR(-1) + '</button><button id="nvd-pv" aria-label="Versão anterior"' + (i < n - 1 ? '' : ' disabled') + '>' + AR(1) + '</button></span>' : '') + '</div>' +
      '<div class="nvd-c">' + U.emo(N.art, 'lg') + '<small>' + N.tag + '</small><b>' + N.h + '</b><p>' + N.p + '</p>' + (N.s ? '<strong>' + N.s + '</strong>' : '') + (N.foot ? '<em>' + N.foot + '</em>' : '') + '</div>' +
      '<div class="nvd-r"><div class="nvd-l"><small>' + N.lt + '</small>' + N.li.map(([e, t, d]) => '<div>' + U.emo(e, 'md') + '<span><b>' + t + '</b><small>' + d + '</small></span></div>').join('') + '</div>' +
        '<button class="tm-go" id="nvd-go">Bora jogar</button></div></div>', st => {
      st.querySelector('#nvd-back').onclick = () => { U.sfx('tap'); out(); };
      st.querySelector('#nvd-go').onclick = () => { U.sfx('tap'); out(); };
      if (st.querySelector('#nvd-nx')) { st.querySelector('#nvd-nx').onclick = () => { U.sfx('tap'); novidadesLand(back, i - 1); }; st.querySelector('#nvd-pv').onclick = () => { U.sfx('tap'); novidadesLand(back, i + 1); }; }
    });
  }

  // Termos e reembolso deitados (2026-11-11; Silvio: a página termos.html abria com letra enorme e rolando no celular
  // deitado): o mesmo texto de craque/termos.html em 7 abas curtas, sem rolar, com o contato à direita (legalLand, mais abaixo).
  // Mudou um termo: mude aqui, em termos.html e em i18n/termos.en.html, e a data TERMOS_DT. tab = índice ou nome da aba
  const CONTATO = 'contato@climbix.app', TERMOS_DT = '10 de novembro de 2026';
  const TERMOS = [
    ['O jogo', ['Ao jogar o Climbix (climbix.app) você concorda com estes termos.',
      'O Climbix é um jogo de futebol <b>gratuito para jogar</b>. As carreiras, partidas e notícias são de ficção.',
      'Nomes de clubes, seleções, competições e pessoas aparecem só como referência e não indicam ligação oficial com eles.',
      'Estes termos seguem as leis do Brasil e podem mudar. A data no alto mostra a última versão.']],
    ['Moedas', ['As <b>moedas</b> são um item do jogo. Você ganha moedas jogando e, se quiser, pode comprar pacotes na Loja. Comprar é opcional: dá para jogar tudo sem pagar.',
      'Elas servem para escolher o clube em que a carreira começa e para fazer aportes no clube que você treina. Nenhuma compra é sorteio: o pacote mostra quantas moedas vêm e quanto custa antes de você pagar.',
      'Para comprar é preciso ter conta, porque as moedas ficam guardadas nela. Elas não valem dinheiro, não podem ser trocadas por dinheiro nem passadas para outra conta.']],
    ['Pagamento', ['O pagamento é feito pelo <b>Mercado Pago</b>, em reais, com os meios que ele oferecer (Pix e cartão, por exemplo).',
      'As moedas entram na conta quando o Mercado Pago confirma o pagamento. Na fatura a compra aparece com o nome CLIMBIX.',
      'Se você tem menos de 18 anos, compre só com a autorização de um responsável.',
      'Os preços, os pacotes e o que as moedas compram podem mudar. O que você já comprou continua na sua conta.']],
    ['Reembolso', ['Você pode desistir da compra em até <b>7 dias</b>, desde que as moedas daquele pacote ainda não tenham sido usadas. Devolvemos o valor inteiro pelo mesmo meio do pagamento e as moedas saem da conta.',
      'Se você pagou e as moedas não chegaram, ou foi cobrado duas vezes, nós entregamos as moedas ou devolvemos o valor, como você preferir.',
      'Para pedir, escreva para o e-mail ao lado com o seu usuário e a data da compra.',
      'Moedas já usadas e compras com mais de 7 dias não são reembolsadas, a não ser nos casos em que a lei garante.']],
    ['Conta', ['A conta é opcional e serve para salvar o jogo na nuvem e continuar em outro aparelho.',
      'Cuide da sua senha e dos serviços (Google, GitHub ou Discord) ligados à conta: quem tiver acesso a eles entra na sua conta.',
      'Sem um serviço ligado, uma senha esquecida não tem como ser recuperada.',
      'Se você pedir para apagar a conta, as moedas que estiverem nela são apagadas junto.']],
    ['Regras', ['Não use usuário ou apelido ofensivo, que engane ou que se passe por outra pessoa.',
      'Não tente burlar o ranking, invadir contas ou sobrecarregar o servidor.',
      'Podemos tirar do ranking, renomear ou apagar apelidos, carreiras e contas que desrespeitem essas regras.']],
    ['Garantias', ['O jogo é oferecido como está. Ele pode mudar, ficar fora do ar ou ter o ranking reiniciado.',
      'Fazemos o possível para guardar bem o seu jogo, mas não garantimos que ele nunca será perdido.',
      'Sem conta, o jogo fica só no navegador e some se os dados do navegador forem apagados.']]];
  // Privacidade deitada (2026-11-11; Silvio: "Altere tbm"): o texto de craque/privacidade.html revisto para o Treinador da
  // 1.0, nas mesmas 7 abas curtas. Mudou algo: mude aqui, em privacidade.html e em i18n/privacidade.en.html, e a data PRIV_DT
  const PRIV_DT = '11 de novembro de 2026';
  const PRIV = [
    ['Sem conta', ['Sem conta, o seu jogo fica salvo só no seu aparelho, no armazenamento do navegador: carreiras, perfil, moedas e ajustes. Limpar os dados do navegador apaga tudo isso.',
      '<b>Não vendemos nem compartilhamos</b> seus dados, não mostramos anúncios e não usamos cookies nem ferramentas de rastreamento.',
      'Os dados servem só para o jogo funcionar: salvar, entrar na conta e entregar as moedas compradas.']],
    ['Com conta', ['<b>Usuário</b>, o nome da sua conta.',
      '<b>Senha</b>, se você criar uma. Ela fica guardada de forma irreversível (hash): nem nós conseguimos ver a senha.',
      '<b>Seu jogo</b>: carreiras, perfil, times comprados e o saldo de moedas, para você continuar em outro aparelho.',
      '<b>Sessões</b> de cada aparelho conectado: um código de acesso (guardado como hash), quando você entrou, o último uso e se entrou por senha ou por um serviço.']],
    ['Entrar', ['Se você entrar com Google, GitHub ou Discord, recebemos só o <b>identificador</b> da sua conta no serviço e um <b>nome para mostrar</b> em Formas de entrar (o e-mail no Google, o @usuário no GitHub ou o nome no Discord).',
      'No primeiro acesso usamos o seu nome no serviço só para sugerir um usuário, e apagamos logo depois.',
      'Não recebemos a sua senha, não acessamos contatos, arquivos ou mensagens e não publicamos nada em seu nome. O acesso que o serviço dá é usado uma vez, no login, e descartado.',
      'Você pode desconectar um serviço em Conta, Formas de entrar.']],
    ['Compras', ['O pagamento acontece na página do <b>Mercado Pago</b>. Cartão, CPF, e-mail e conta ficam com ele e seguem a política de privacidade dele: nós não recebemos nem guardamos nada disso.',
      'Enviamos ao Mercado Pago só o pacote, o preço e um código aleatório da compra, sem o seu usuário.',
      'Guardamos, ligado à sua conta, o registro de cada compra: pacote, moedas, valor, datas, situação e número do pagamento. Ele serve para entregar as moedas, evitar entrega em dobro e atender reembolso, e pode ser mantido pelo tempo que a lei exigir.']],
    ['Envios', ['<b>Opinião</b>: guardamos as respostas, um código aleatório do aparelho (só para evitar envio repetido), a versão do jogo e o tipo de navegador. Sem nome, e-mail ou conta. Não escreva dados pessoais no texto livre.',
      '<b>Contagem anônima</b>: primeira visita, volta no dia ou na semana seguinte, sessão e carreira que começou, passou de temporada ou terminou. O servidor só soma por dia, sem código do aparelho, conta ou IP.',
      '<b>Erros</b>: se o jogo falhar, ele manda a mensagem do erro, a versão, a tela e o tipo de navegador, para a gente corrigir.']],
    ['Servidor', ['Para bloquear tentativas em massa de adivinhar senhas, o servidor conta as tentativas erradas por usuário e por endereço IP.',
      'A hospedagem do site (Hostinger) mantém registros técnicos de acesso, como qualquer site.',
      'O <b>ranking</b> está desligado nesta versão. Carreiras enviadas antes continuam guardadas com o apelido escolhido e podem ser apagadas a pedido.']],
    ['Direitos', ['Pela <b>LGPD</b>, você pode pedir para ver, corrigir ou apagar seus dados.',
      'Para apagar a conta, o jogo salvo na nuvem, as moedas, os serviços conectados e carreiras antigas do ranking, escreva para o e-mail ao lado com o seu usuário.',
      'Sair da conta no jogo para de salvar na nuvem, mas não apaga a conta.',
      'Se esta política mudar, a data no alto é atualizada.']]];
  // As duas telas saem por cima da tela aberta (.lg-ov dentro do palco): o Voltar só tira a folha, então a Loja e a Conta
  // ficam como estavam (campo digitado, pacote escolhido). Uma leva à outra pelo link de baixo e o Voltar devolve
  const LEGAL = {
    termos: { h: 'Termos e reembolso', dt: 'Atualizados em ' + TERMOS_DT, tabs: TERMOS, p: 'Dúvida ou pedido? Escreva com o seu usuário.', to: 'privacidade', lk: 'Política de privacidade' },
    privacidade: { h: 'Privacidade', dt: 'Atualizada em ' + PRIV_DT, tabs: PRIV, p: 'Quer ver ou apagar seus dados? Escreva com o seu usuário.', to: 'termos', lk: 'Termos e reembolso' } };
  function legalLand(doc, tab, back, prev) {
    const st = document.getElementById('ld-st'), L = LEGAL[doc]; if (!st || !L) return;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    let t = typeof tab === 'string' ? L.tabs.findIndex(x => x[0] === tab) : tab | 0; if (!L.tabs[t]) t = 0;
    let ov = st.querySelector('.lg-ov'); if (!ov) { ov = document.createElement('div'); ov.className = 'lg-ov'; st.appendChild(ov); }
    const esc = e => { if (e.key === 'Escape') out(); };
    const close = () => { document.removeEventListener('keydown', esc); };
    const out = () => { close(); if (prev) return legalLand(prev.doc, prev.t, back); ov.remove(); if (back) back(); };
    document.addEventListener('keydown', esc);
    const draw = () => {
      ov.innerHTML = '<div class="trm" role="dialog" aria-label="' + L.h + '"><div class="tm-h"><button class="tcr-back" id="trm-back" aria-label="Voltar">' + BK + '</button><span class="mk-tt"><b>' + L.h + '</b><small>' + L.dt + '</small></span></div>' +
        '<div class="trm-tabs" role="tablist">' + L.tabs.map((x, i) => '<button role="tab" data-trm="' + i + '"' + (i === t ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>' + x[0] + '</button>').join('') + '</div>' +
        '<ul class="trm-c">' + L.tabs[t][1].map(x => '<li>' + x + '</li>').join('') + '</ul>' +
        '<div class="trm-s"><small>CONTATO</small><p>' + L.p + '</p><b>' + CONTATO + '</b>' +
          '<a class="trm-bt" id="trm-mail" href="mailto:' + CONTATO + '">Escrever e-mail</a>' +
          '<button class="trm-lk" id="trm-lk">' + L.lk + '</button></div></div>';
      ov.querySelector('#trm-back').onclick = () => { U.sfx('tap'); out(); };
      ov.querySelectorAll('[data-trm]').forEach(b => b.onclick = () => { U.sfx('tap'); t = +b.dataset.trm; draw(); });
      ov.querySelector('#trm-lk').onclick = () => { U.sfx('tap'); close(); prev ? legalLand(prev.doc, prev.t, back) : legalLand(L.to, 0, back, { doc, t }); };
    };
    draw();
  }
  const termosLand = (tab, back) => legalLand('termos', tab, back), privacidadeLand = (tab, back) => legalLand('privacidade', tab, back);

  Object.assign(U, { settings, settingsLand, whatsNew, VERSION, novidadesLand, newsNew, termosLand, privacidadeLand });
})();
