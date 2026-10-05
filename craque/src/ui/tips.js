// Interface — dicas da primeira experiência: um cartão curto no topo da tela, na primeira vez que cada momento aparece.
// "Entendi" fecha aquela dica; "Pular dicas" desliga todas. Depois de aparecer 3 vezes sem resposta, a dica não volta.
// Configurações: "Mostrar as dicas de novo" zera tudo.
(function () {
  const U = window.CRAQUE_UI;
  const { $, esc, load, store } = U;
  const KEY = 'climbix-dicas-v1';
  const st = () => { const s = load(KEY); return s && typeof s === 'object' ? s : { off: false, n: {} }; };
  const TIPS = {
    base: ['Sua carreira começa aqui', 'Uma carreira inteira em uns 9 minutos: a cada temporada você se prepara, decide e joga. No fim, ele vira uma carta com nota de S a D. Dica de começo: quem é titular joga toda semana; no banco, quase não entra em campo.'],
    pre: ['Prepare a temporada', 'Escolha uma característica: ela deixa sua carta mais forte para sempre e tem um efeito próprio. Os pontos de evolução compram treinos, e dá para guardar para a próxima temporada.'],
    evento: ['Decisões que mudam a carreira', 'Cada opção mostra a chance de dar certo e o que ganha ou perde. Não existe resposta certa: a arriscada rende mais, mas pode dar errado de verdade. Atributos valem para sempre; forma e minutos, só esta temporada.'],
    lance: ['Jogo decisivo', 'Agora é com você: o lance decide o jogo e às vezes o título. Antes do primeiro de cada tipo, você treina sem valer nada. Se preferir, "Deixar o jogo decidir" usa a chance da sua carta.'],
    resumo: ['Fim da temporada', 'Jogos, gols e nota puxam a evolução da carta: o quadro abaixo mostra o que ajudou e o que atrapalhou. Postar nas redes rende Fama e Torcida uma vez por temporada.'],
    janela: ['Janela de transferências', 'Compare o papel no elenco (titular joga mais) e o salário. Ficar também é uma opção, e trocar de clube muda a torcida que te apoia.'],
    fim: ['Sua carta final', 'Escolha a assinatura, o acabamento e o estilo da carta e compartilhe com os amigos. Os pacotinhos liberam números, visuais, assinaturas e acabamentos novos.'],
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
