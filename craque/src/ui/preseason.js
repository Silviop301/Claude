// Interface — pré-temporada: características, mini carta e investimentos
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- pré-temporada: característica ----------
  const SUP = ['', '', '²', '³'];
  function traitsHtml() {
    const syn = S.synergies(G.c);
    const slots = [];
    for (let i = 0; i < S.MAX_SLOTS; i++) {
      const id = G.c.traits[i];
      if (id) slots.push('<span class="chip">' + U.icoOf(D.TRAIT_BY_ID[id], 'xs') + ' ' + D.TRAIT_BY_ID[id].name + (S.traitLevel(G.c, id) > 1 ? ' <b>Nv ' + S.traitLevel(G.c, id) + '</b>' : '') + '</span>');
    }
    const free = S.MAX_SLOTS - G.c.traits.length;
    if (free) slots.push('<span class="chip empty">' + free + (free > 1 ? ' espaços livres' : ' espaço livre') + '</span>');
    return '<div class="eyebrow small">Características ' + G.c.traits.length + '/' + S.MAX_SLOTS + ' <button class="link-btn" data-sheet="combos">Ver combinações ›</button></div><div class="chips">' + slots.join('') +
      syn.map(s => '<span class="chip syn">' + U.icoOf(s, 'xs') + ' ' + s.name + '</span>').join('') + '</div>';
  }

  // Texto de atributos: "+4 FIN · +1 DRI"
  const attrTxt = at => Object.keys(at).filter(k => at[k]).map(k => (at[k] > 0 ? '+' : '') + at[k] + ' ' + D.label(G.c.pos, k)).join(' · ');
  // Texto da opção: atributos que entram agora + o efeito no nível escolhido
  function traitTxt(t, lv) {
    const at = {};
    for (const k in t.attr) at[k] = Math.round(t.attr[k] * D.TRAIT_LV[lv]) - (lv > 1 ? Math.round(t.attr[k] * D.TRAIT_LV[lv - 1]) : 0);
    const a = attrTxt(at), fx = t.fx ? t.fx(D.TRAIT_LV[lv]) : '';
    return (a ? '<span class="at">' + a + '</span><br>' : '') + '<span class="fx">' + (lv > 1 ? 'Nv ' + lv + ': ' : '') + esc(fx).replace('⚠️', '<b class="warn">' + U.emo('⚠️', 'xs') + '</b>') + '</span>';
  }

  // Aviso na escolha: atributo que a característica soma e já está no 99 manda o ponto para outro
  // (os 2 atributos principais, que toda característica soma, ficam num aviso só, acima das opções)
  function capNote(t, main) {
    const E = S.eff(G.c), keys = main ? S.mainAttrs(G.c.pos) : Object.keys(t.attr).filter(k => t.attr[k] > 0 && !S.mainAttrs(G.c.pos).includes(k));
    const full = keys.filter(k => E[k] >= 99);
    if (!full.length) return '';
    const to = S.spillTo(G.c, E);
    return (main ? '' : '<br>') + '<span class="cap-note">' + full.map(k => D.label(G.c.pos, k)).join(' e ') + ' já no 99: ' + (to ? 'cada 2 pontos acima viram 1 em ' + D.label(G.c.pos, to) : 'carta no máximo') + '</span>';
  }

  // Mini carta da pré-temporada: mostra os atributos atuais e, ao escolher, quanto cada um muda
  // Mesmas faixas de cor da carta final
  function setTier(o) {
    const el = $('mcard'), t = tierCls(o);
    if (el.dataset.t === t) return;
    el.dataset.t = t;
    const wear = U.wearOf(G.c);
    el.className = 'mcard metal ' + t + (wear ? ' worn' + wear : '');
    void el.offsetWidth; // reinicia a animação: mudou de cor, pulsa de novo
    el.classList.add('pop', 'tierup');
    $('mc-tier').textContent = TIER_NAME[t];
  }
  // Investimentos na mesma posição dos atributos na carta (RIT FIN / PAS DRI / DEF FÍS); fisioterapia embaixo
  const INV_ORDER = () => D.ATTRS.map(k => D.INVEST.find(t => t.attr && t.attr[k])).filter(Boolean).concat(D.INVEST.filter(t => !t.attr));
  // Com pontos para gastar, cada atributo da carta vira o botão do treino dele (um toque compra +2)
  function miniCard(inv) {
    const E = S.eff(G.c), t = tierCls(S.ovr(G.c));
    const wear = U.wearOf(G.c);
    const byAttr = k => D.INVEST.find(x => x.attr && x.attr[k]);
    return '<div class="mcard metal ' + t + (wear ? ' worn' + wear : '') + (inv ? ' trainable' : '') + '" id="mcard" data-t="' + t + '"><span class="mc-tier" id="mc-tier">' + TIER_NAME[t] + '</span><div class="mc-ovr"><b id="mc-ovr">' + S.ovr(G.c) + '</b><span>' + G.c.pos + (G.c.number ? ' ' + G.c.number : '') + '</span><i id="mc-ovr-d"></i></div><div class="mc-grid">' +
      D.ATTRS.map(k => {
        const v = inv && byAttr(k), lb = D.label(G.c.pos, k);
        return v ? '<button class="mc-at" data-k="' + k + '" data-v="' + v.id + '" aria-label="' + esc(D.investName(v, G.c.pos)) + ': +2 ' + lb + '"><b>' + E[k] + '</b><span>' + lb + '</span><i></i><small class="pips"></small><em class="price"></em></button>'
          : '<div class="mc-at" data-k="' + k + '"><b>' + E[k] + '</b><span>' + lb + '</span><i></i></div>';
      }).join('') + '</div>' +
      (inv ? '<p class="mc-hint">Toque num atributo para treinar · cada nível custa mais 1 ' + U.emo('⭐', 'xs') + '</p>' : '') + '</div>';
  }
  // "O que é cada atributo": o que cada um faz para a sua posição (tirado das contas do motor) e o peso na nota da carta
  const ATTR_HELP = {
    ATA: { rit: 'Arrancada: ajuda a fazer gols na temporada.', fin: 'O mais importante: mais gols, e nos chutes a mira anda mais devagar e treme menos.',
      pas: 'Mais assistências; na falta, ajuda a bola a passar por cima da barreira.', dri: 'Ajuda nos gols e nas assistências.',
      def: 'Pesa pouco: só ajuda um pouco nos jogos grandes.', fis: 'Chute mais forte (o goleiro alcança menos), menos lesões e mais força nos jogos grandes.' },
    MEI: { rit: 'Ajuda um pouco nos gols e nas assistências.', fin: 'Gols e chutes de falta: a mira anda mais devagar e treme menos.',
      pas: 'O mais importante: mais assistências e, no lance de passe, a brecha fica maior e a corrida mais lenta.', dri: 'Ajuda nas assistências e nos gols.',
      def: 'Ajuda o time nos jogos grandes (títulos).', fis: 'Menos lesões e mais força nos jogos grandes.' },
    ZAG: { rit: 'No lance de desarme, o atacante vem mais devagar: mais tempo para acertar.', fin: 'Ajuda a fazer gol de bola parada.',
      pas: 'Pesa na nota da carta.', dri: 'Quase não pesa para zagueiro.',
      def: 'O mais importante: mais desarmes, faixa certa maior no lance de desarme, mais jogos sem sofrer gol e mais títulos.',
      fis: 'Menos lesões, gols de cabeça na bola parada e mais força nos jogos grandes.' },
    GOL: { rit: 'Velocidade: quase não pesa para goleiro.', fin: 'Reflexo, o mais importante: mais defesas e pênaltis defendidos, e no pênalti o batedor entrega o lado mais cedo.',
      pas: 'Reposição: pesa pouco na nota da carta.', dri: 'Manejo: segurar a bola; pesa na nota da carta.',
      def: 'Posicionamento: mais pênaltis defendidos, mais jogos sem sofrer gol e mais títulos.', fis: 'Elasticidade: o pulo alcança mais longe, mais defesas e menos lesões.' },
  };
  function attrHelp() {
    const pos = G.c.pos, w = D.POS[pos].w, help = ATTR_HELP[pos];
    const name = k => pos === 'GOL' ? help[k].split(':')[0] : D.ATTR_NAMES[k];
    const txt = k => pos === 'GOL' ? help[k].slice(help[k].indexOf(':') + 2) : help[k];
    return '<details class="more at-help"><summary>' + U.emo('📖', 'xs') + ' O que é cada atributo?</summary>' +
      '<p class="muted small">A nota da carta é a soma dos atributos com estes pesos para ' + D.POS[pos].name.toLowerCase() + '. Mais nota também traz mais jogos e propostas melhores.</p>' +
      D.ATTRS.slice().sort((a, b) => w[b] - w[a]).map(k => '<div class="ah-row"><b>' + D.label(pos, k) + '</b><div><span>' + esc(name(k)) + ' · <em>' + Math.round(w[k] * 100) + '% da nota</em></span><small>' + esc(txt(k)) + '</small></div></div>').join('') +
      '</details>';
  }
  function showPreview(p) {
    const E = S.eff(G.c), o = S.ovr(G.c);
    D.ATTRS.forEach(k => {
      const el = screen.querySelector('.mc-at[data-k="' + k + '"]'), d = p ? p.attrs[k] - E[k] : 0;
      el.classList.toggle('up', d > 0); el.classList.toggle('down', d < 0);
      el.querySelector('i').textContent = d ? (d > 0 ? '+' : '') + d : '';
    });
    const d = p ? p.ovr - o : 0, od = $('mc-ovr-d');
    od.textContent = d ? (d > 0 ? '+' : '') + d : '';
    od.className = d > 0 ? 'up' : d < 0 ? 'down' : '';
  }
  // Números subindo até o valor novo; depois segue
  function applyAnim(from, then) {
    const E = S.eff(G.c), o1 = S.ovr(G.c), t0 = performance.now(), dur = 900;
    screen.querySelectorAll('.choice, .btn, button.mc-at, .inv-chip').forEach(b => { b.disabled = true; });
    const mc = $('mcard');
    mc.classList.add('pop');
    const tick = now => {
      if (!mc.isConnected) return; // já saiu da tela
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      D.ATTRS.forEach(a => { screen.querySelector('.mc-at[data-k="' + a + '"] b').textContent = Math.round(from.attrs[a] + (E[a] - from.attrs[a]) * e); });
      const ov = Math.round(from.ovr + (o1 - from.ovr) * e);
      $('mc-ovr').textContent = ov;
      setTier(ov);
      // Depois da pausa, só segue se a mini carta ainda estiver na tela (voltar ao início no meio da animação
      // redesenharia a pré-temporada por cima da tela inicial, sem carreira)
      if (k < 1) requestAnimationFrame(tick); else setTimeout(() => { if (mc.isConnected && G.c) then(); }, 650);
    };
    requestAnimationFrame(tick);
  }
  function tweenCard(from, dur) {
    const E = S.eff(G.c), o1 = S.ovr(G.c), t0 = performance.now();
    const mc = $('mcard'); mc.classList.remove('pop'); void mc.offsetWidth; mc.classList.add('pop');
    D.ATTRS.forEach(a => {
      const el = screen.querySelector('.mc-at[data-k="' + a + '"]');
      el.classList.toggle('up', E[a] > from.attrs[a]);
      el.querySelector('i').textContent = E[a] > from.attrs[a] ? '+' + (E[a] - from.attrs[a]) : '';
    });
    const tick = now => {
      if (!mc.isConnected) return; // já saiu da tela
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      D.ATTRS.forEach(a => { screen.querySelector('.mc-at[data-k="' + a + '"] b').textContent = Math.round(from.attrs[a] + (E[a] - from.attrs[a]) * e); });
      const ov = Math.round(from.ovr + (o1 - from.ovr) * e);
      $('mc-ovr').textContent = ov;
      setTier(ov);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // Escolha em duas etapas: toca para ver na carta, confirma para aplicar
  function pickable(sel, previewOf, apply) {
    let cur = null;
    const ok = $('b-ok');
    screen.querySelectorAll(sel).forEach(b => b.onclick = () => {
      screen.querySelectorAll(sel).forEach(x => x.classList.toggle('sel', x === b));
      cur = b;
      showPreview(previewOf(b));
      ok.disabled = false;
      ok.textContent = b.dataset.ok || 'Confirmar ' + b.dataset.name;
    });
    ok.onclick = () => {
      if (!cur) return;
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      const next = apply(cur);
      if (next.go) return next.go(); // sem mudança na carta ainda (ex.: ir escolher o que sai)
      showPreview(null);
      bar();
      applyAnim(from, next);
    };
  }

  // Esta temporada termina em ano de Copa? Mostra a nota que a seleção pede
  function wcHint() {
    if ((S.YEAR0 + G.c.season + 1) % 4 !== 2 || G.c.age + 1 < 18 || G.c.natRetired) return '';
    const n = D.NATION_BY_NAME[G.c.country], cut = S.wcCut(n, G.c), o = S.ovr(G.c);
    return '<p class="wc-hint">' + U.flag(n.flag) + ' Ano de Copa: a seleção convoca com nota <b>' + cut + '</b>' + (o >= cut ? ' · você já está dentro' : ' · faltam ' + (cut - o)) + '</p>';
  }

  // ---------- pré-temporada: característica e investimentos numa tela só ----------
  // Um toque numa opção (característica ou investimento) já aplica; "Desfazer" volta o último passo até seguir
  // para a temporada. "Seguir para a temporada" fica sempre fixo embaixo.
  // As opções ficam salvas na carreira (G.c.preCh): recarregar a página não troca o sorteio
  // Texto do foco nos treinos: chance de ponto extra × risco de lesão
  // O foco é automático pela idade (S.autoTrain), então a linha só explica em palavras simples o que ele faz
  const TRAIN_TXT = {
    leve: 'o corpo pede calma: menos lesões e menos desgaste com a idade, sem ponto extra.',
    normal: 'ritmo de meio de carreira: às vezes rende um ponto extra de evolução, risco normal de lesão.',
    forte: 'carga de jovem: boa chance de um ponto extra de evolução no fim do ano, mas se machuca mais.',
    max: 'tudo ou nada: pontos extras de evolução quase garantidos, mas o risco de lesão triplica.',
  };
  function trainTxt(t) {
    return '<b>' + U.emo(t.icon, 'xs') + ' Treino ' + t.name.toLowerCase() + ' (pela idade):</b> ' + (TRAIN_TXT[t.id] || '') + (t.p1 + t.p2 ? ' Lesão séria tira o bônus.' : '');
  }
  // Desfazer: foto da carreira antes de cada escolha desta pré-temporada (some ao seguir)
  let undo = [];
  const snap = () => { undo.push(JSON.stringify(G.c)); if (undo.length > 30) undo.shift(); };
  function preseason() { undo = []; prep(false); }
  function invest() { prep(true); } // retomar depois de já ter escolhido a característica

  // again: a mesma pré-temporada redesenhada (depois da escolha ou do Desfazer): fica no lugar, sem piscar
  function prep(traitDone, justAdded, again) {
    G.c.train = S.autoTrain(G.c); // foco nos treinos pela idade
    const all = S.seasonChoices(G.c), preCh = G.c.preCh;
    if (traitDone) preCh.done = true;
    const ch = preCh.done ? [] : all;
    G.step = preCh.done ? 'invest' : 'preseason';
    save();
    bar();
    const label = { new: 'NOVA', up: 'EVOLUIR' };
    // Sem nada útil para evoluir (tudo no máximo ou só o que já não rende nesta idade): segue sem escolher
    const done = S.buildDone(G.c) || (!ch.length && !preCh.done && G.c.traits.length >= S.MAX_SLOTS);
    const hasInv = S.canInvestAny(G.c);
    const fisio = D.INVEST.find(t => !t.attr);
    const coins = D.INVEST.some(t => (G.c.inv[t.id] || 0) < S.investMax(t.id));
    const star = U.emo('⭐', 'xs');
    // Dica da pré-temporada ainda na tela: volta depois do redesenho (escolha, Desfazer); antes sumia de vez
    const keepTip = screen.querySelector('.tip-card[data-k="pre"]');
    render(
      '<div class="pre-head"><div><div class="eyebrow">Pré-temporada · ' + year() + (G.c.farewell ? ' · temporada de despedida' : '') + '</div>' +
        '<h2>Prepare a temporada</h2></div>' +
        (coins ? '<div class="coins" aria-label="Pontos de evolução">' + U.emo('⭐', 'sm') + '<b id="w-money">' + (G.c.pe || 0) + '</b></div>' : '') + '</div>' +
      wcHint() + miniCard(hasInv) + attrHelp() +
      (justAdded ? '<div class="prep-done">' + justAdded + '</div>' : '') +
      (done && !justAdded ? traitsHtml() + '<p class="muted small">' + (S.buildDone(G.c) ? U.emo('✅', 'xs') + ' Build completo: todas no nível máximo.' : 'Nada para evoluir nesta fase: o que falta já não rende na sua idade.') + '</p>' : '') +
      // Características: as opções lado a lado, como cartas; um toque escolhe
      (ch.length ? '<div class="pick-h"><b>' + (G.c.traits.length >= S.MAX_SLOTS ? 'Evolua 1 de ' : 'Escolha 1 de ') + ch.length + '</b>' +
          (G.c.traits.length < S.MAX_SLOTS ? '<span>fica a carreira toda</span>' : '') + '</div>' +
        '<p class="muted small prep-note">' + (() => { const [a, b] = S.mainAttrs(G.c.pos); return 'Cada nível: +1 ' + D.label(G.c.pos, a) + ' (e +1 ' + D.label(G.c.pos, b) + ' a cada 2)'; })() +
          (capNote(null, true) ? '<br>' + capNote(null, true) : '') + '</p>' +
        '<div class="choices tr-pick" style="--n:' + (ch.length === 4 ? 2 : Math.min(3, ch.length)) + '">' + ch.map((x, i) =>
          '<button class="choice tr' + (x.completes ? ' combo' : '') + '" data-i="' + i + '"><span class="tag ' + (x.type === 'up' ? 'green' : 'blue') + '">' + label[x.type] + '</span>' +
          '<span class="ic">' + U.icoOf(x.trait, 'lg') + '</span>' +
          '<b>' + x.trait.name + (x.type === 'up' ? ' <small>Nv ' + x.lv + '</small>' : '') + '</b>' +
          '<span class="d">' + traitTxt(x.trait, x.lv).replace('>Nv ' + x.lv + ': ', '>') + capNote(x.trait) +
          (x.completes ? '<br><span class="tag gold">Completa ' + U.icoOf(x.completes, 'xs') + ' ' + x.completes.name + ': ' + attrTxt(x.completes.attr) + '</span>' : '') + '</span></button>').join('') + '</div>' +
        traitsHtml() : '') +
      // Fisioterapeuta: o único treino que não é atributo fica num botão à parte, embaixo das escolhas
      (hasInv && fisio ? '<button class="inv-chip" data-v="' + fisio.id + '">' + U.icoOf(fisio, 'sm') + '<span class="nm"><b>' + D.investName(fisio, G.c.pos) + '</b> · ' + fisio.perk + '</span><small class="pips"></small><em class="price"></em></button>' : '') +
      // Foco nos treinos: automático pela idade, só informado
      '<p class="muted small train-txt" id="train-txt"></p>' +
      (!hasInv && coins ? '<p class="muted small prep-note">' + star + ' Pontos de evolução: ' + (G.c.pe || 0) + '. Você ganha com nota ' + String(S.PE_R1).replace('.', ',') + '+ (' + String(S.PE_R2).replace('.', ',') + '+ vale 2), títulos e prêmios.</p>' : '') +
      '<div class="inv-bar fade">' + (undo.length ? '<button class="btn ghost" id="b-undo">Desfazer</button>' : '') + '<button class="btn" id="b-skip">Jogar a temporada</button></div>',
      again ? { same: true } : null
    );
    U.tip('pre');
    if (keepTip) { keepTip.style.animation = 'none'; const at = screen.querySelector('.inv-bar'); if (at) at.before(keepTip); else screen.append(keepTip); }
    const skip = $('b-skip');
    const go = () => { undo = []; delete G.c.preCh; U.eventOrSeason(); };
    const showUndo = () => {
      if (!undo.length || $('b-undo')) return;
      const u = document.createElement('button'); u.className = 'btn ghost'; u.id = 'b-undo'; u.textContent = 'Desfazer';
      skip.parentNode.insertBefore(u, skip); u.onclick = doUndo;
    };
    const doUndo = () => {
      if (!undo.length) return;
      G.c = JSON.parse(undo.pop());
      save(); sfx('tick');
      prep(!!(G.c.preCh && G.c.preCh.done), null, true);
    };
    if ($('b-undo')) $('b-undo').onclick = doUndo;
    // "Seguir" só libera depois de escolher a característica; os pontos podem ficar guardados
    const lockSkip = () => {
      // Pontos podem ficar guardados: juntar para os níveis mais caros vale a pena
      const trait = ch.length && !preCh.done, left = G.c.pe || 0;
      skip.disabled = !!trait;
      skip.classList.toggle('wait', !!trait);
      skip.innerHTML = trait ? 'Escolha 1 característica <i class="up-ar">↑</i><small>antes de jogar a temporada</small>'
        : left && hasInv ? 'Jogar a temporada<small>Guarda ' + left + ' ' + star + ' para depois</small>' : 'Jogar a temporada';
    };
    const refresh = () => {
      if (!skip.isConnected) return; // já saiu da tela
      lockSkip();
      if ($('w-money')) $('w-money').textContent = G.c.pe || 0;
      if (!hasInv) return;
      screen.querySelectorAll('[data-v]').forEach(b => {
        const id = b.dataset.v, n = G.c.inv[id] || 0, max = S.investMax(id), full = n >= max, price = S.investPrice(G.c, id);
        const capped = !full && S.investCapped(G.c, id);
        b.disabled = !S.canInvest(G.c, id);
        b.querySelector('.pips').textContent = '●'.repeat(n) + '○'.repeat(max - n);
        b.querySelector('.price').innerHTML = full ? 'máx' : capped ? '99' : price + ' ' + star;
        b.classList.toggle('full', full || capped);
        b.classList.toggle('poor', !full && !capped && (G.c.pe || 0) < price);
      });
    };
    skip.onclick = () => { if (!skip.disabled) go(); };
    $('train-txt').innerHTML = trainTxt(S.trainOf(G.c));
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const x = ch[+b.dataset.i];
      if (preCh.done) return;
      snap();
      b.classList.add('chosen');
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      sfx('levelup');
      let done;
      if (x.type === 'up') { S.upgradeTrait(G.c, x.trait.id); done = '✓ ' + U.icoOf(x.trait, 'xs') + ' ' + x.trait.name + ' evoluiu para o Nv ' + x.lv; }
      else { const syn = S.addTrait(G.c, x.trait.id); done = '✓ ' + U.icoOf(x.trait, 'xs') + ' ' + x.trait.name + ' entrou' + (syn ? '<br><b>' + U.icoOf(syn, 'xs') + ' Combinação desbloqueada: ' + syn.name + '</b> · ' + attrTxt(syn.attr) + (syn.extra ? ' · ' + syn.extra : '') : ''); }
      if (S.buildDone(G.c)) done += '<br><b>' + U.emo('🏁', 'xs') + ' Build completo!</b> Suas 5 características estão no nível máximo.';
      preCh.done = true;
      save(); // já vale: fechar o jogo durante a animação não perde a escolha
      showPreview(null);
      bar();
      applyAnim(from, () => prep(true, done, true));
    });
    screen.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const id = b.dataset.v;
      if (!S.canInvest(G.c, id)) return;
      snap();
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      S.invest(G.c, id);
      save();
      sfx('coin');
      bar();
      showPreview(null);
      tweenCard(from, 450);
      b.classList.remove('bought'); void b.offsetWidth; b.classList.add('bought');
      showUndo();
      setTimeout(refresh, 480);
    });
    refresh();
  }

  Object.assign(U, { traitsHtml, attrTxt, traitTxt, setTier, miniCard, showPreview, applyAnim, tweenCard, pickable, wcHint, preseason, invest });
})();
