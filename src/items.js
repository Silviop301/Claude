// Itens, raridades, caixas e bônus de itens equipados.
(function () {
  PS.RARITIES = [
    { id: 'comum',    name: 'Comum',    color: '#B8B4C8', weight: 60 },
    { id: 'mid',      name: 'Mid',      color: '#2FD27A', weight: 25 },
    { id: 'raro',     name: 'Raro',     color: '#3D8BFF', weight: 10 },
    { id: 'brabo',    name: 'Brabo',    color: '#A64DFF', weight: 4 },
    { id: 'lendario', name: 'Lendário', color: '#FFC928', weight: 0.9 },
    { id: 'stonks',   name: 'STONKS',   color: '#FF4DB8', weight: 0.1 },
  ];
  PS.MAX_LEVEL = 10;
  PS.MAX_ATIVO_SLOTS = 5;
  // Pesquisas do MBA mudam esses dois valores, por isso são calculados.
  Object.defineProperty(PS, 'PITY', { get: () => 60 - (PS.B ? PS.B.pityCut : 0) });
  Object.defineProperty(PS, 'ATIVO_SLOTS', { get: () => 3 + (PS.B ? PS.B.slots : 0) });

  // Custo em Farelo para craftar um item (por raridade). Subir nível custa metade x nível atual.
  PS.CRAFT_COST = [20, 50, 150, 400, 1500, 6000];

  // Efeitos: prod (% produção), tap (% valor do toque), crit (pontos % de chance),
  // offline (min extras), event (% eventos mais frequentes), shark (s extras no Modo Tubarão),
  // floor (piso do mercado).
  const A = (id, icon, name, r, fx, flavor) => ({ id, icon, name, r, kind: 'ativo', fx, flavor });
  const V = (id, icon, name, r, slot, prod, flavor) => ({ id, icon, name, r, kind: 'visual', slot, fx: { prod }, flavor });

  PS.ITEMS = [
    A('planilha',   '📊', 'Planilha de Excel',          0, { prod: 3 },  'Fórmulas que ninguém entende.'),
    A('calc',       '🧮', 'Calculadora Solar',          0, { tap: 10 },  'Só funciona no sol da praça.'),
    A('paodormido', '🥖', 'Pão Amanhecido',             0, { offline: 10 }, 'Rende mais que parece.'),
    A('agenda',     '📒', 'Agenda de Coach',            0, { event: 5 }, 'Acordar 4h. Riscado.'),
    V('bone',       '🧢', 'Boné Aba Reta',              0, 'head', 1, 'Estilo investidor de podcast.'),
    V('palha',      '👒', 'Chapéu de Palha',            0, 'head', 1, 'Agro é tech, agro é pombo.'),
    V('nerd',       '🤓', 'Óculos de Nerd',             0, 'eyes', 1, 'Lê balanço patrimonial por diversão.'),

    A('sinais',     '📱', 'Celular com 3 Grupos de Sinais', 1, { event: 10 }, '99+ mensagens não lidas.'),
    A('gravsorte',  '👔', 'Gravata da Sorte',           1, { crit: 1 },  'Nunca foi lavada.'),
    A('cafe',       '☕', 'Café Extra Forte',           1, { shark: 3 }, 'Taquicardia produtiva.'),
    A('cofrinho',   '🐷', 'Cofrinho de Porco',          1, { offline: 20 }, 'Guarda até migalha.'),
    V('headset',    '🎧', 'Headset de Call',            1, 'head', 2, '"Tá me ouvindo? Tô no mudo?"'),
    V('esportivo',  '🕶️', 'Óculos Esportivo',           1, 'eyes', 2, 'Para corridas de ações.'),
    V('cachecol',   '🧣', 'Cachecol de Inverno',        1, 'neck', 2, 'Frio de mercado em baixa.'),

    A('livrocoach', '📕', 'Livro de Coach Autografado', 2, { prod: 10 }, '"Para o Pombo, com sucesso."'),
    A('mouse',      '🖱️', 'Mouse Gamer RGB',            2, { tap: 30 },  'As luzes dão +30% de clique.'),
    A('ferradura',  '🧲', 'Ferradura de Ouro',          2, { crit: 2 },  'Atrai sorte e clipes de papel.'),
    V('cowboy',     '🤠', 'Chapéu de Cowboy',           2, 'head', 4, 'Agronegócio de alto nível.'),
    V('borboleta',  '🎀', 'Gravata Borboleta',          2, 'neck', 4, 'Para jantares de gala na praça.'),

    A('amaldicoada','📈', 'Planilha Amaldiçoada',       3, { prod: 25 }, 'As células somam sozinhas.'),
    A('terminal',   '🖥️', 'Terminal Bloomberg Pirata',  3, { event: 25 }, 'Baixado de um site duvidoso.'),
    A('barbatana',  '🦈', 'Barbatana de Estimação',     3, { shark: 8 }, 'Ela te escolheu.'),
    V('monoculo',   '🧐', 'Monóculo',                   3, 'eyes', 7, 'Aristocracia financeira.'),
    V('diamante',   '💎', 'Colar de Diamante',          3, 'neck', 7, 'Mãos de diamante, pescoço também.'),

    A('paodourado', '🍞', 'Pão Dourado',                4, { prod: 60 }, 'Brilha no escuro. Não coma.'),
    A('bola',       '🔮', 'Bola de Cristal do Mercado', 4, { floor: 0.8, prod: 15 }, 'O mercado nunca cai abaixo de x0,8.'),
    V('coroa',      '👑', 'Coroa de Ouro',              4, 'head', 15, 'Rei da praça, oficialmente.'),
    V('laser',      '🔴', 'Olhos de Laser',             4, 'eyes', 15, 'Visão de mercado a laser.'),

    A('impressora', '🖨️', 'Máquina de Imprimir Dinheiro', 5, { prod: 150, tap: 100 }, 'O Banco Central odeia esse truque.'),
    V('aureola',    '😇', 'Auréola de Diamante',        5, 'head', 30, 'Santo protetor dos investidores.'),
  ];
  PS.ITEM_BY_ID = {};
  PS.ITEMS.forEach(it => { PS.ITEM_BY_ID[it.id] = it; });

  PS.BOXES = [
    { id: 'camelo',    name: 'Caixa do Camelô',     cur: 'grana', minR: 0, n: 1, desc: 'Procedência duvidosa. Preço sobe com sua produção.' },
    { id: 'maleta',    name: 'Maleta Executiva',    cur: 'coins', cost: 25,  minR: 1, n: 1, desc: 'Garante Mid ou melhor.' },
    { id: 'cofre',     name: 'Cofre Suíço',         cur: 'cupons', cost: 1,  minR: 2, n: 1, desc: 'Garante Raro ou melhor.' },
    { id: 'container', name: 'Container do Porto',  cur: 'coins', cost: 200, minR: 1, n: 10, desc: '10 itens. Garante 1 Brabo ou melhor.' },
  ];
  PS.BOX_BY_ID = {};
  PS.BOXES.forEach(b => { PS.BOX_BY_ID[b.id] = b; });

  PS.CUR = {
    grana: { icon: '💸', name: 'grana' },
    coins: { icon: '🪙', name: 'PomboCoin' },
    cupons: { icon: '🎫', name: 'Cupom Dourado' },
  };

  PS.itemLevelMult = lvl => 1 + 0.25 * (lvl - 1);

  PS.itemEffectText = function (it, lvl) {
    const m = PS.itemLevelMult(lvl || 1), f = it.fx, out = [];
    const n = v => (Math.round(v * m * 10) / 10).toString().replace('.', ',');
    if (f.prod) out.push('+' + n(f.prod) + '% produção');
    if (f.tap) out.push('+' + n(f.tap) + '% no toque');
    if (f.crit) out.push('+' + n(f.crit) + '% chance de crítico');
    if (f.offline) out.push('+' + n(f.offline) + ' min de ganho offline');
    if (f.event) out.push('eventos ' + n(f.event) + '% mais frequentes');
    if (f.shark) out.push('+' + n(f.shark) + 's de Modo Tubarão');
    if (f.floor) out.push('mercado nunca abaixo de x0,8');
    return out.join(' · ') + (it.kind === 'visual' ? ' (equipado)' : '');
  };

  // Álbum: ter todos os itens de um set (não precisa equipar) dá um bônus permanente.
  PS.SETS = [
    { id: 'coach',   name: 'Kit Coach',      items: ['agenda', 'livrocoach', 'headset', 'bone'],        fx: { prod: 10 },   txt: '+10% produção' },
    { id: 'praca',   name: 'Kit Praça',      items: ['palha', 'paodormido', 'cachecol', 'cofrinho'],    fx: { offline: 60 }, txt: '+1h de ganho offline' },
    { id: 'nerd',    name: 'Kit Nerd',       items: ['nerd', 'calc', 'planilha', 'mouse'],              fx: { tap: 50 },    txt: '+50% no toque' },
    { id: 'trader',  name: 'Kit Trader',     items: ['sinais', 'amaldicoada', 'terminal', 'planilha'],  fx: { event: 15 },  txt: 'eventos +15%' },
    { id: 'sorte',   name: 'Kit Sorte',      items: ['gravsorte', 'ferradura', 'bola', 'paodourado'],   fx: { crit: 3 },    txt: '+3% crítico' },
    { id: 'tubarao', name: 'Kit Tubarão',    items: ['barbatana', 'cafe', 'esportivo', 'mouse'],        fx: { shark: 10 },  txt: '+10s de Modo Tubarão' },
    { id: 'luxo',    name: 'Kit Luxo',       items: ['coroa', 'diamante', 'monoculo', 'borboleta'],     fx: { prod: 25 },   txt: '+25% produção' },
    { id: 'lenda',   name: 'Kit Lenda',      items: ['impressora', 'aureola', 'laser', 'coroa'],        fx: { mult: 2 },    txt: 'produção x2' },
  ];

  PS.setDone = set => set.items.every(id => PS.S.inv[id]);

  // Comemora sets recém-completados (chamado após ganhar itens e 1x por segundo).
  PS.checkSets = function () {
    const S = PS.S;
    PS.SETS.forEach(set => {
      if (S.setsDone[set.id] || !PS.setDone(set)) return;
      S.setsDone[set.id] = true;
      PS.recalcBonuses();
      PS.recalc();
      setTimeout(() => {
        PS.fx.banner('SET COMPLETO!', set.name + ': ' + set.txt, PS.C.gold);
        PS.fx.confetti(90);
        PS.audio.promote();
        PS.ui.toast('📚', 'Álbum: ' + set.name + ' completo! ' + set.txt, 'gold');
      }, 400);
    });
  };

  // Soma pesquisas do MBA, sets completos, itens equipados e coleção.
  PS.bonuses = function () {
    const S = PS.S;
    const b = { prod: 0, tap: 0, crit: 0, offline: 0, event: 0, shark: 0, floor: 0, mult: 1,
      slots: 0, pityCut: 0, costCut: 0, cameloDisc: 0, rslots: 0, autobuy: 0, autocollect: 0, farelo: 0 };
    const add = fx => {
      for (const k in fx) {
        if (k === 'floor') b.floor = Math.max(b.floor, fx.floor);
        else if (k === 'mult') b.mult *= fx.mult;
        else b[k] += fx[k];
      }
    };
    (PS.RESEARCH || []).forEach(r => { if (S.research && S.research.done[r.id]) add(r.fx); });
    PS.SETS.forEach(set => { if (PS.setDone(set)) add(set.fx); });
    const slots = 3 + b.slots;
    const eq = [...S.equip.ativos.slice(0, slots), S.equip.head, S.equip.eyes, S.equip.neck].filter(Boolean);
    eq.forEach(id => {
      const it = PS.ITEM_BY_ID[id], lvl = S.inv[id];
      if (!it || !lvl) return;
      const m = PS.itemLevelMult(lvl);
      for (const k in it.fx) {
        if (k === 'floor') b.floor = Math.max(b.floor, it.fx.floor);
        else b[k] += it.fx[k] * m;
      }
    });
    b.collection = Object.keys(S.inv).length;
    return b;
  };

  PS.recalcBonuses = function () {
    PS.B = PS.bonuses();
  };

  PS.permMult = function () {
    const b = PS.B;
    return b ? (1 + b.prod / 100) * (1 + b.collection / 100) * b.mult : 1;
  };
})();
