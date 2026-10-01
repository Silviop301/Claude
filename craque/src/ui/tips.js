// Interface — dicas da primeira experiência: um cartão curto no topo da tela, na primeira vez que cada momento aparece.
// "Entendi" fecha aquela dica; "Pular dicas" desliga todas. Depois de aparecer 3 vezes sem resposta, a dica não volta.
// Configurações: "Mostrar as dicas de novo" zera tudo.
(function () {
  const U = window.CRAQUE_UI;
  const { $, esc, load, store } = U;
  const KEY = 'climbix-dicas-v1';
  const st = () => { const s = load(KEY); return s && typeof s === 'object' ? s : { off: false, n: {} }; };
  const TIPS = {
    base: ['Sua carreira começa aqui', 'A cada temporada você se prepara, toma decisões e joga. No fim, a carreira vira uma carta com nota de S a D. Toque num clube para ver a proposta e toque de novo para assinar.'],
    pre: ['Prepare a temporada', 'Escolha uma característica: ela soma pontos nos atributos principais e tem um efeito próprio. São 5 na carreira, e depois dá para evoluir. Os pontos de evolução compram treinos e podem ficar guardados.'],
    evento: ['Decisões fora de campo', 'Cada escolha mexe com Técnico, Torcida e Fama, que ficam na barra do topo. O selo mostra o tipo: oportunidade, risco ou decisão. A chance de cada resultado aparece na própria opção.'],
    lance: ['Jogo decisivo', 'Agora é com você: o lance decide o jogo e às vezes o título. Se preferir, nas Configurações dá para deixar a carta decidir sozinha.'],
    resumo: ['Fim da temporada', 'A nota da temporada puxa a evolução da carta. Em Detalhes você vê por que a nota geral mudou. Postar nas redes rende Fama e Torcida uma vez por temporada.'],
    janela: ['Janela de transferências', 'Compare o papel no elenco (titular joga mais) e o salário. Ficar também é uma opção, e trocar de clube muda a torcida que te apoia.'],
    fim: ['Sua carta final', 'Escolha a assinatura e o estilo da carta e compartilhe com os amigos. Os pacotinhos liberam números, visuais e assinaturas novas.'],
  };
  // Mostra a dica no topo da tela atual (chamar logo depois do render)
  function tip(key) {
    const s = st(), t = TIPS[key], screen = $('screen');
    if (!t || !screen || s.off || (s.n[key] || 0) >= 3) return;
    s.n[key] = (s.n[key] || 0) + 1; store(KEY, s);
    const el = document.createElement('div');
    el.className = 'tip-card';
    el.setAttribute('role', 'note');
    el.innerHTML = '<span class="tip-ic">' + U.emo('💡', 'sm') + '</span><div><b>' + esc(t[0]) + '</b><p>' + esc(t[1]) + '</p>' +
      '<div class="tip-acts"><button class="tip-ok">Entendi</button><button class="tip-off">Pular dicas</button></div></div>';
    el.querySelector('.tip-ok').onclick = () => { const s2 = st(); s2.n[key] = 3; store(KEY, s2); el.remove(); };
    el.querySelector('.tip-off').onclick = () => { const s2 = st(); s2.off = true; store(KEY, s2); el.remove(); };
    const back = screen.querySelector(':scope > .back-link, :scope > .cr-top');
    if (back) back.after(el); else screen.prepend(el);
  }
  const tipsReset = () => store(KEY, { off: false, n: {} });
  const tipsSet = on => (on ? tipsReset() : store(KEY, Object.assign(st(), { off: true })));
  const tipsOn = () => !st().off;
  Object.assign(U, { tip, tipsReset, tipsSet, tipsOn });
})();
