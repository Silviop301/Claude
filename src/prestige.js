// Prestígio: A Pirâmide Desmoronou. Reinicia a economia em troca de Lições de Vida (+2% em tudo cada)
// e pontos para a árvore de talentos.
(function () {
  const fmt = PS.fmt, $ = id => document.getElementById(id);
  const PR = PS.prestige = {};
  const UNIT = 1e5; // Lições = raiz(ganho da pirâmide / 100K)

  const T = (id, icon, name, desc, cost, fx, req) => ({ id, icon, name, desc, cost, fx, req });
  PS.TALENTS = [
    T('poupanca', '🐷', 'Poupança de Emergência', 'Cada pirâmide nova começa com 10K de grana.',          2,  { startMoney: 1e4 }),
    T('contatos', '📇', 'Rede de Contatos',       'Começa com 10 Revendas de Migalha e 10 Pipocas.',      4,  { startBiz: 10 }),
    T('dedo',     '👆', 'Dedo Veterano',          '+100% no valor do toque.',                             3,  { tap: 100 }),
    T('aposent',  '🏖️', 'Aposentadoria Precoce', '+3h de ganho offline.',                                3,  { offline: 180 }),
    T('treta',    '🧲', 'Ímã de Treta',           'Eventos 30% mais frequentes.',                         5,  { event: 30 }),
    T('crise',    '📉', 'Faro de Crise',          'MEGA STONKS (x100) duas vezes mais comum.',            5,  { megaMult: 1 }, 'dedo'),
    T('cofrinho', '🪙', 'Cofrinho Eterno',        '+50% de PomboCoin ganhas.',                            8,  { coinMult: 50 }),
    T('rei',      '🦈', 'Tubarão Rei',            'Modo Tubarão dá x7 em vez de x5.',                     8,  { sharkX: 2 }),
    T('juros',    '📈', 'Juros sobre Juros',      '+50% de produção.',                                    12, { prod: 50 }),
    T('insider',  '🕵️', 'Insider',                'O mercado fica, em média, mais alto.',                 15, { insider: 0.3 }, 'treta'),
    T('veterano', '🎯', 'Sorte de Veterano',      'Lendário garantido 10 itens antes.',                   20, { pityCut: 10 }),
    T('olho',     '👁️', 'Olho Clínico',           'Lendário e STONKS duas vezes mais comuns nas caixas.', 30, { lendMult: 1 }, 'veterano'),
    T('juros2',   '🏦', 'Juros Compostos',        'Produção x2.',                                         40, { mult: 2 }, 'juros'),
  ];
  const BY_ID = {};
  PS.TALENTS.forEach(t => { BY_ID[t.id] = t; });

  const S = () => PS.S;
  PR.gain = () => Math.floor(Math.sqrt(S().lifetime / UNIT));
  PR.nextAt = () => Math.pow(PR.gain() + 1, 2) * UNIT;
  PR.free = () => S().lvTotal - S().lvSpent;
  PR.unlocked = () => S().lvTotal > 0 || S().lifetime >= 5e4;
  PR.lvMult = () => 1 + 0.02 * S().lvTotal;

  PR.tstate = function (t) {
    if (S().talents[t.id]) return 'done';
    if (t.req && !S().talents[t.req]) return 'locked';
    return PR.free() >= t.cost ? 'can' : 'open';
  };

  PR.buyTalent = function (id) {
    const t = BY_ID[id];
    if (PR.tstate(t) !== 'can') { PS.audio.error(); return; }
    S().lvSpent += t.cost;
    S().talents[id] = true;
    PS.recalcBonuses();
    PS.recalc();
    PS.audio.milestone();
    PS.fx.confetti(40);
    PS.ui.toast('🎓', 'Talento: ' + t.name, 'gold');
    PR.render();
  };

  PR.claimable = function () {
    const g = PR.gain();
    return (g >= 1 && g >= Math.max(1, Math.ceil(S().lvTotal * 0.3))) || PS.TALENTS.some(t => PR.tstate(t) === 'can');
  };

  PR.confirm = function () {
    const g = PR.gain();
    if (g < 1) { PS.audio.error(); return; }
    PS.ui.modal({
      title: 'Desmoronar a pirâmide?',
      html: '<p>Você ganha <b>+' + g + ' Lições de Vida</b>: <b>+' + (g * 2) + '% em tudo</b> para sempre e ' + g + ' pontos de talento.</p>' +
        '<p class="m-note"><b>Zera:</b> grana, negócios, promoções do pombo e posição no mercado.</p>' +
        '<p class="m-note"><b>Fica:</b> itens, PomboCoin, Cupons, Farelo, cursos do MBA, conquistas, missões e talentos.</p>',
      actions: [
        { label: 'Ainda não', onClick: PS.ui.close },
        { label: 'DESMORONAR 🔺', kind: 'primary', onClick: () => { PS.ui.close(); PR.run(); } },
      ],
    });
  };

  // A animação e o reinício.
  PR.run = function () {
    const g = PR.gain();
    if (g < 1 || PR.running) return;
    PR.running = true;
    const app = $('app');
    PS.audio.crash();
    PS.pombo.setMood('cry', 3);
    PS.pombo.say('NÃÃÃO! Minha pirâmide!', 2.4);
    PS.fx.banner('A PIRÂMIDE DESMORONOU!', 'mas você aprendeu +' + g + ' lições', PS.C.red);
    PS.fx.shake(24);
    PS.fx.flash('#FF9AAE', 0.6);
    app.classList.add('collapse');

    setTimeout(() => {
      reset(g);
      app.classList.remove('collapse');
      app.classList.add('rebuild');
      PS.fx.flash('#FFFFFF', 0.9);
      PS.fx.confetti(150);
      PS.fx.banner('DESSA VEZ É DIFERENTE', '+' + g + ' Lições · +' + (S().lvTotal * 2) + '% em tudo', PS.C.gold);
      PS.audio.promote();
      PS.pombo.celebrate(2.4);
      PS.pombo.say('Dessa vez é diferente. Confia.', 3.2);
      setTimeout(() => { app.classList.remove('rebuild'); PR.running = false; }, 900);
    }, 2300);
  };

  function reset(g) {
    const s = S(), B = PS.B;
    s.lvTotal += g;
    s.pyramids++;
    s.bestPyramid = Math.max(s.bestPyramid, s.lifetime);
    s.money = 0;
    s.lifetime = 0;
    s.owned = PS.BUSINESSES.map(() => 0);
    s.revealed = 1;
    s.stage = 0;
    s.maxTier = 0;
    s.pos = null;
    s.market = { v: 1.2 };
    PS.recalcBonuses();
    if (PS.B.startMoney) PS.earn(PS.B.startMoney);
    if (PS.B.startBiz) { s.owned[0] = PS.B.startBiz; s.owned[1] = PS.B.startBiz; s.revealed = 2; }
    PS.market.init();
    PS.combo = 0;
    PS.recalc();
    PS.save();
    PS.ui.init();
    PS.ui.setTab('biz');
    void B;
  }

  PR.key = function () {
    return S().lvTotal + '|' + S().lvSpent + '|' + PR.gain() + '|' + Object.keys(S().talents).length + '|' + Math.floor(S().lifetime / PR.nextAt() * 50);
  };

  PR.render = function () {
    const el = $('pyramid'), s = S(), g = PR.gain();
    const nx = PR.nextAt(), prevAt = Math.pow(g, 2) * UNIT;
    const pct = Math.min(100, (s.lifetime - prevAt) / (nx - prevAt) * 100);
    let html = '<div class="pyr-head"><span class="pyr-ico">🔺</span><div><b>A Pirâmide</b><span>' +
      s.lvTotal + ' Lições de Vida · <b class="pos">+' + (s.lvTotal * 2) + '% em tudo</b> · ' + s.pyramids + ' pirâmides desmoronadas</span></div></div>';
    html += '<div class="pyr-now' + (g >= 1 ? ' ready' : '') + '"><div class="pn-top"><span>Desmoronar agora rende</span><b>+' + g + ' 🎓</b></div>' +
      '<div class="meter gold"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<span class="pn-next">Próxima lição com ' + fmt(nx) + ' ganhos nesta pirâmide (agora ' + fmt(s.lifetime) + ')</span>' +
      '<button type="button" class="btn ' + (g >= 1 ? 'primary' : '') + '" id="btn-collapse"' + (g >= 1 ? '' : ' disabled') + '>' +
      (g >= 1 ? 'Desmoronar a pirâmide' : 'Libera com 100K ganhos nesta pirâmide') + '</button></div>';
    html += '<div class="sec-title">Talentos <small>' + PR.free() + ' pontos livres</small></div>';
    PS.TALENTS.forEach(t => {
      const st = PR.tstate(t);
      const right = st === 'done' ? '<span class="ach-check">✓</span>'
        : st === 'locked' ? '<span class="res-lock">🔒</span>'
          : '<button type="button" class="buy" data-talent="' + t.id + '" id="tal-' + t.id + '"' + (st === 'can' ? '' : ' disabled') + '><span class="q">Aprender</span><span class="c">🎓 ' + t.cost + '</span></button>';
      html += '<div class="research ' + (st === 'done' ? 'done' : st === 'locked' ? 'locked' : st === 'can' ? 'open can' : 'open') + '"><span class="rs-ico">' + t.icon + '</span>' +
        '<div class="rs-info"><b>' + t.name + '</b><span>' + (st === 'locked' ? 'Requer: ' + BY_ID[t.req].name : t.desc) + '</span></div>' + right + '</div>';
    });
    el.innerHTML = html;
    $('btn-collapse').addEventListener('click', PR.confirm);
    el.querySelectorAll('[data-talent]').forEach(b => b.addEventListener('click', () => PR.buyTalent(b.dataset.talent)));
    PR._key = PR.key();
  };

  // Aviso na primeira vez que a pirâmide fica pronta
  PR.tick = function () {
    if (!S().pyrHinted && PR.gain() >= 1) {
      S().pyrHinted = true;
      PS.ui.toast('🔺', 'A pirâmide está pronta para desmoronar! Veja a aba Pirâmide', 'gold');
      PS.pombo.say('Sinto que essa pirâmide vai cair… e isso é bom?', 3);
    }
  };
})();
