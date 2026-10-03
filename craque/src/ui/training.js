// Interface — Treino dos lances: o mesmo minigame do jogo, sem valer nada, com o passo a passo na tela.
// Aparece sozinho antes do primeiro lance de cada tipo (pênalti, falta, goleiro, zagueiro, meia) e fica nas
// Configurações para treinar de novo quando quiser. Abre por cima da tela atual: fechar devolve tudo como estava.
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, G, esc, load, store, sfx } = U;
  const KEY = 'climbix-treino-v1';
  const done = () => load(KEY) || {};
  const trained = st => !!done()[st];
  const markTrained = st => { const d = done(); d[st] = (d[st] || 0) + 1; store(KEY, d); };

  // Cada tipo de lance: nome, posição e o passo a passo
  const DRILLS = {
    cup: { name: 'Pênalti', pos: 'ATA', ico: '⚽', steps: [
      'A mira corre de um lado para o outro do gol. Toque para travar a direção.',
      'Agora ela sobe e desce. Toque de novo para travar a altura.',
      'O goleiro escolhe um canto. No ângulo (canto de cima) ele não alcança, mas a bola pode ir para fora.'] },
    classico: { name: 'Falta', pos: 'ATA', ico: '🎯', steps: [
      'Igual ao pênalti: o primeiro toque trava a direção, o segundo a altura.',
      'Agora tem barreira: bola baixa no meio para nela. Passe por cima ou busque o canto livre.',
      'Quanto mais longe do centro, mais difícil para o goleiro, e mais fácil de errar.'] },
    save: { name: 'Defender pênalti', pos: 'GOL', ico: '🧤', steps: [
      'O batedor corre para a bola. Fique de olho nele.',
      'Pouco antes do chute aparece uma seta mostrando o lado.',
      'Toque na esquerda, no meio ou na direita da tela para pular. Cedo demais, ele troca o canto; tarde demais, não dá tempo.'] },
    tackle: { name: 'Carrinho', pos: 'ZAG', ico: '🛡️', steps: [
      'O atacante vem conduzindo a bola em direção ao seu gol.',
      'Há uma faixa verde no caminho dele.',
      'Toque quando ele pisar na faixa verde para dar o carrinho. Cedo, ele passa; tarde, ele chuta.'] },
    pass: { name: 'Passe decisivo', pos: 'MEI', ico: '👟', steps: [
      'O atacante corre entre os zagueiros procurando espaço.',
      'Há uma faixa verde: é a brecha na defesa.',
      'Toque quando ele passar pela faixa verde para enfiar a bola. Se demorar, ele fica impedido.'] },
  };
  // Lances da sua posição (atacante treina pênalti e falta)
  const OF_POS = { ATA: ['cup', 'classico'], MEI: ['pass'], ZAG: ['tackle'], GOL: ['save'] };

  // Jogador do treino: a sua carta quando o lance é da sua posição; senão, um jogador médio da posição do lance
  function trainee(st) {
    const pos = DRILLS[st].pos;
    if (G.c && (G.c.pos === pos || (st === 'cup' && G.c.pos !== 'GOL'))) return G.c;
    const c = S.newCareer({ name: 'Treino', pos, foot: 'D', country: 'Brasil' }, 77);
    for (const k in c.attrs) c.attrs[k] = 66;
    return c;
  }

  // opts.real: função que começa o lance de verdade (o treino abriu antes do primeiro lance)
  function training(st, opts) {
    opts = opts || {};
    const dr = DRILLS[st];
    if (!dr) return opts.real && opts.real();
    document.querySelectorAll('.trn-wrap').forEach(x => x.remove());
    const w = document.createElement('div');
    w.className = 'trn-wrap';
    document.body.appendChild(w);
    let tries = 0, hits = 0;
    const close = () => { w.remove(); };
    const goReal = () => { markTrained(st); close(); opts.real(); };
    const head = '<div class="trn-head"><b>' + U.emo(dr.ico, 'sm') + ' Treino · ' + esc(dr.name) + '</b>' +
      (opts.real ? '' : '<button class="cfg-x" id="trn-x" aria-label="Fechar">' + U.ICON.x + '</button>') + '</div>';
    const intro = () => {
      w.innerHTML = '<div class="trn">' + head +
        '<p class="lead small">' + (opts.real ? 'Antes do seu primeiro lance de verdade, treine aqui. Não vale nada: erre à vontade.' : 'Treine o lance quantas vezes quiser. Não vale nada para a carreira.') + '</p>' +
        '<ol class="trn-steps">' + dr.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
        '<button class="btn" id="trn-go">Começar o treino</button>' +
        (opts.real ? '<button class="btn ghost" id="trn-skip">Pular o treino</button>' : '') + '</div>';
      bind();
    };
    const play = () => {
      w.innerHTML = '<div class="trn">' + head + '<p class="trn-tip">' + esc(dr.steps[dr.steps.length - 1]) + '</p><div id="trn-mini"></div></div>';
      bind();
      sfx('whistle');
      U.playMini(w.querySelector('#trn-mini'), st, (ok, why) => { if (!w.isConnected) return; tries++; if (ok) hits++; result(ok, why); }, trainee(st));
    };
    const WHY = { defesa: 'O goleiro defendeu.', trave: 'Na trave!', fora: 'Foi para fora.', alto: 'Foi por cima.', barreira: 'Parou na barreira.', cedo: 'Você chegou cedo.', impedido: 'Demorou e ele ficou impedido.' };
    const result = (ok, why) => {
      const big = ok ? ({ save: 'DEFENDEU!', tackle: 'ROUBOU!', pass: 'ASSISTÊNCIA!' }[st] || 'GOL!') : 'Não foi…';
      w.innerHTML = '<div class="trn">' + head +
        '<div class="card mom-res ' + (ok ? 'ok' : 'ko') + '"><div class="mr-big">' + big + '</div><p class="mr-txt">' + esc(ok ? 'Isso! É assim no jogo de verdade.' : (WHY[why] || 'Tente de novo: o tempo certo é tudo.')) + '</p>' +
        '<p class="trn-score">' + tries + (tries === 1 ? ' tentativa' : ' tentativas') + ' · ' + hits + (hits === 1 ? ' acerto' : ' acertos') + '</p></div>' +
        '<button class="btn' + (opts.real ? ' ghost' : '') + '" id="trn-go">Treinar de novo</button>' +
        (opts.real ? '<button class="btn" id="trn-real">Ir para o lance de verdade</button>' : '<button class="btn ghost" id="trn-out">Sair do treino</button>') + '</div>';
      bind();
    };
    function bind() {
      const on = (id, f) => { const b = w.querySelector('#' + id); if (b) b.onclick = f; };
      on('trn-go', play); on('trn-skip', goReal); on('trn-real', goReal); on('trn-x', close); on('trn-out', close);
    }
    intro();
  }

  // Antes do primeiro lance de cada tipo, o treino; depois, direto ao lance
  const gateTrain = (st, real) => () => (trained(st) ? real() : training(st, { real }));

  // Menu das Configurações: os 5 lances, os da sua posição primeiro
  function trainMenu() {
    const mine = G.c ? OF_POS[G.c.pos] : [];
    const order = Object.keys(DRILLS).sort((a, b) => mine.includes(b) - mine.includes(a));
    document.querySelectorAll('.trn-wrap').forEach(x => x.remove());
    const w = document.createElement('div');
    w.className = 'trn-wrap';
    w.innerHTML = '<div class="trn"><div class="trn-head"><b>' + U.emo('🏟️', 'sm') + ' Treinar lances</b><button class="cfg-x" id="trn-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
      '<p class="lead small">Os mesmos lances do jogo, sem valer nada. Escolha um:</p>' +
      '<div class="trn-menu">' + order.map(st => '<button class="btn ghost" data-st="' + st + '">' + U.emo(DRILLS[st].ico, 'sm') + ' ' + esc(DRILLS[st].name) +
        '<small>' + (mine.includes(st) ? 'Da sua posição' : 'Lance de ' + D.POS[DRILLS[st].pos].name.toLowerCase()) + '</small></button>').join('') + '</div></div>';
    document.body.appendChild(w);
    w.querySelector('#trn-x').onclick = () => w.remove();
    w.querySelectorAll('[data-st]').forEach(b => b.onclick = () => training(b.dataset.st));
  }

  Object.assign(U, { training, gateTrain, trainMenu, trainedLance: trained });
})();
