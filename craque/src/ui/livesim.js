// Jogo a Jogo, partida ao vivo: o campinho com jogadores que decidem (só apresentação, nada muda o resultado).
// A cada toque, quem tem a bola pesa tocar, lançar nas costas, inverter, cruzar, driblar, conduzir ou chutar pela chance de
// dar certo vezes o perigo que cria; quem ataca sem a bola procura espaço e corre na linha do zagueiro; quem defende
// pressiona, fecha o passe e marca do lado do gol. O motor manda em duas coisas: quem está melhor (bx de flowOf) e os gols
// (out.my.ev), que só saem no minuto deles. Você ataca para a direita; o adversário é espelhado.
(function () {
  const U = window.CRAQUE_UI, LP = U.LP || (U.LP = {});
  const L = 105, WD = 68, GL = 30.34, GR = 37.66;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const sig = v => 1 / (1 + Math.exp(-v));
  const F433 = [['GK', 0, 50], ['LB', .22, 12], ['CB', .16, 37], ['CB', .16, 63], ['RB', .22, 88], ['CM', .5, 30], ['DM', .38, 50], ['CM', .5, 70], ['LW', .8, 15], ['ST', .9, 50], ['RW', .8, 85]];
  const F442 = [['GK', 0, 50], ['LB', .22, 12], ['CB', .16, 37], ['CB', .16, 63], ['RB', .22, 88], ['LM', .55, 14], ['CM', .45, 40], ['CM', .45, 60], ['RM', .55, 86], ['ST', .86, 40], ['ST', .86, 60]];
  // Quanto vale ter a bola num ponto (no referencial de quem ataca): perto do gol e pelo meio vale muito mais
  const V = (x, y) => { const u = cl(x, 0, L) / L; return 0.01 + 0.1 * Math.pow(u, 1.5) + 0.32 * Math.pow(u, 4) * Math.exp(-Math.pow((y - 34) / 20, 2)); };
  const lossAt = (x, y) => 0.01 + V(L - x, WD - y) * 0.5;
  const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = cl(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1); return Math.hypot(px - ax - dx * u, py - ay - dy * u); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toW = (s, x, y) => (s ? [L - x, WD - y] : [x, y]);
  // Avançar vale por si (time que só roda a bola atrás não é futebol), quem chega perto chuta, e o bote dá certo 3 vezes em 10
  const DOTK = 0.65; // tamanho dos bonecos no desenho
  const PASS_OK = 0.25, PASS_PAT = 0.55; // passe executado: quanto do risco o jogador salva (todos um pouco, o time de posse mais)
  const NEED = 10, CRZ0 = 0.02, CRZ1 = 0.14; // NEED: passes antes de forçar no estilo mais paciente; cruzamento vale menos que antes (era 0,05 + 0,3 × lados)
  const PROG = 0.05, SHOT = 3.2, TK = 0.3, DUE_AHEAD = 6, AHEAD_S = 9; // a jogada do gol do motor começa uns 9 s do campinho antes (6 minutos sem o ritmo da tela), para dar tempo de construir
  const tf = (s, o) => (s ? [L - o.x, WD - o.y] : [o.x, o.y]);

  // o: { me: índice do seu jogador (-1 fora), num, seed, goals: [{ m, side: 0 seu time | 1, me, as }], t0, speed(): 1|3 }
  // Cores dos bonecos: o uniforme do clube (kits-real.js; senão as cores do escudo, kits.js). O mandante joga com o
  // principal; o visitante troca para o reserva se a camisa parece com a do mandante (e, sem reserva bom, pega uma cor
  // da paleta bem longe das duas). Goleiros com cor própria, longe dos dois times e do gramado.
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const cdist = (a, b) => { const x = hx(a), y = hx(b), r = (x[0] + y[0]) / 2, d = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
    return Math.sqrt((2 + r / 256) * d[0] * d[0] + 4 * d[1] * d[1] + (2 + (255 - r) / 256) * d[2] * d[2]); };
  const lum = h => { const [r, g2, b] = hx(h); return (0.299 * r + 0.587 * g2 + 0.114 * b) / 255; };
  const PITCH = '#2F7A47', NEAR = 190;
  const PAL = ['#C8323A', '#1F4FA8', '#F4F1E8', '#1D1D1F', '#E8742A', '#6B2D8F', '#7FC4EE', '#F7D117'];
  const GKS = ['#FF8A1F', '#9B5DE5', '#20C5C5', '#E84A8A', '#B7E34B', '#1D1D1F', '#F4F1E8'];
  LP.kitFor = function (name, id) {
    const R = window.CRAQUE_KITS_REAL || {}, K = window.CRAQUE_KITS || {}, ok = h => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
    const k = R[name] ? R[name] : id && K[id] ? [K[id][0], K[id][1], K[id][1], K[id][0]] : null; // só o escudo: o reserva é a cor 2
    if (!k || !k.every(ok)) return null;
    // desenho da camisa titular (listras, aros, faixa...): vai junto como .pat = [desenho, cor]
    const P = (window.CRAQUE_KITS_PAT || {})[name], out = k.slice(); if (P && ok(P[1])) out.pat = P; return out;
  };
  // mine/opp: [camisa, calção, camisa 2, calção 2] ou null; home: você é o mandante
  LP.kits = function (mine, opp, home) {
    const H = (home ? mine : opp) || ['#F4F1E8', '#1D1D1F'], A = (home ? opp : mine) || ['#1F4FA8', '#FFFFFF'];
    const hk = [H[0], H[1]]; hk.pat = H.pat; // o mandante sempre de titular, com o desenho dela
    const far = c => cdist(c, hk[0]) > NEAR;
    let ak = far(A[0]) ? [A[0], A[1]] : A[2] && far(A[2]) ? [A[2], A[3] || A[0]] : null;
    if (ak && ak[0] === A[0]) ak.pat = A.pat; // o reserva é liso
    if (!ak) { const c = PAL.slice().sort((a, b) => cdist(b, hk[0]) - cdist(a, hk[0]))[0]; ak = [c, lum(c) > 0.5 ? '#1D1D1F' : '#F4F1E8']; }
    const gk = GKS.filter(c => cdist(c, hk[0]) > NEAR && cdist(c, ak[0]) > NEAR && cdist(c, PITCH) > 120);
    const out = home ? [hk, ak] : [ak, hk];
    return { mine: out[0], opp: out[1], gk: [gk[0] || '#FF8A1F', gk[1] || gk[0] || '#9B5DE5'] };
  };

  LP.sim = function (o) {
    if (LP._sim) LP._sim.stop(); // uma partida por vez
    let seed = ((o.seed >>> 0) % 2147483646) + 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    let ME = o.me;
    const KT = o.kits || LP.kits(null, null, true);
    // q: o overall do jogador (4º número da formação, 60 se não vier) em -0,3..+0,3; pesa no drible, no bote, no passe e no pique
    const qOf = v => (v === undefined || v === null ? 0 : Math.max(-0.3, Math.min(0.3, (v - 60) / 100)));
    // o.str: [força do seu clube, do rival] quando a formação não traz o overall de cada um (Jogo a Jogo); o.meOv = o seu overall
    const ovOf = (form, side, k) => (form[k][3] !== undefined ? form[k][3] : side === 0 && k === o.me && o.meOv ? o.meOv : o.str && o.str[side] ? o.str[side] + ((k * 37 + side * 11) % 9) - 4 : undefined);
    const mk = (form, side) => form.map(([r, d, w], k, f, ov = ovOf(form, side, k)) => ({ r, d, w: w * 0.68, k, side, q: qOf(ov), x: 0, y: 0, tx: 0, ty: 0, gx: 0, gy: 0, vx: 0, vy: 0,
      rt: 0, th: 0, spd: 0.9 + rnd() * 0.22 + qOf(ovOf(form, side, k)) * 0.5, risk: 0.7 + rnd() * 0.6, ph: k * 1.9 + side * 4.1, fx: side ? -1 : 1, fy: 0,
      run: 0, runX: 0, runY: 0, go: 0, goX: 0, goY: 0, stun: 0, cd: 0, lg: 0, sprint: 0, drib: 0, mark: null,
      inf: form[k][4] || null, e0: form[k][4] && form[k][4].en !== undefined ? form[k][4].en : 96 + rnd() * 4, eT: o.t0 || 0, eK: 0.24 + rnd() * 0.12 }));
    // o.forms: [seu time, adversário] como [[papel, profundidade 0-1, largura 0-100], ...] (o Treinador manda a formação de verdade)
    const T = [mk((o.forms && o.forms[0]) || F433, 0), mk((o.forms && o.forms[1]) || F442, 1)];
    let ALL = T[0].concat(T[1]);
    let tip = null; // toque num boneco: { p, at } mostra nome, número e energia por 2,4 s
    const at = (s, i) => T[s][Math.min(i, T[s].length - 1)]; // com expulso o time tem menos gente
    const isMe = p => ME >= 0 && p.side === 0 && p.k === ME;
    // O estilo de cada time (S.CO_STY do Treinador; no Jogo a Jogo, equilibrado): ctrl segura a bola e evita passe arriscado,
    // press sobe a marcação e dá mais bote, line é a altura da defesa, counter acelera depois de roubar, wide abre o time e cruza
    const stOf = x => ({ ctrl: x && x.ctrl !== undefined ? x.ctrl : 1, press: x && x.press !== undefined ? x.press : 0.35, line: x && x.line !== undefined ? x.line : 0.5, counter: x && x.counter !== undefined ? x.counter : 0.35, wide: x && x.wide !== undefined ? x.wide : 0.5 });
    // Mando de campo (o.home: 0 seu time, 1 o adversário, sem: campo neutro): nos primeiros 15 minutos quem joga em casa
    // sobe a linha e dá mais bote, empurrado pela torcida; o visitante se fecha um pouco. Só o jeito de jogar muda
    const STb = [stOf(o.styles && o.styles[0]), stOf(o.styles && o.styles[1])], ST = STb.slice();
    const HOME = o.home === 0 || o.home === 1 ? o.home : -1, HOME_MIN = 15;
    function stRefresh() {
      const on = HOME >= 0 && curT < HOME_MIN;
      [0, 1].forEach(s => { const b = STb[s]; ST[s] = !on ? b : s === HOME ? Object.assign({}, b, { press: b.press + 0.3, line: Math.min(1, b.line + 0.15) }) : Object.assign({}, b, { press: Math.max(0, b.press - 0.1), line: Math.max(0, b.line - 0.1) }); });
    }
    const lossK = s => 1.4 + 1.6 * ST[s].ctrl, progK = s => 0.6 + 1.2 * ST[s].counter;
    // Jeito de circular a bola de cada estilo: paciência (1 na posse, ~0,5 no equilibrado, 0 na retranca e no contra) e ligação
    // direta (contra ~1, retranca ~0,5, posse 0). As jogadas com nome (tabela, terceiro homem, parede, ultrapassagem, inversão,
    // saída de trás, ligação direta) pesam por eles; o rastro dos últimos passes e a etiqueta da jogada aparecem na tela
    const patOf = s => cl((ST[s].ctrl - 0.75) / 0.55, 0, 1), dirOf = s => cl((ST[s].counter - 0.3) / 0.9, 0, 1) * (1 - patOf(s));
    const trail = [], PLAYS = {}; let playTag = null, passH = null, tagClk = -9;
    // O que acontece no campinho vai para a narração (o: onEv(tipo, { side, a, b }); a e b: 'me' ou a posição)
    const tag = p => (p ? (isMe(p) ? 'me' : p.r) : '');
    const emit = (k, side, a, b, how) => { if (o.onEv && (mode === 'play' || mode === 'rein') && !lc) o.onEv(k, { side, a: tag(a), b: tag(b), how: how || '' }); };
    const ball = { x: 52.5, y: 34, owner: null, fly: null, loose: null, carry: null, hold: 0, rcv: 0 };
    let poss = 0, mode = o.t0 > 0 ? 'ko' : 'wait', modeT = 1.2, koSide = 0, hero = null, bias = [1, 1], mom = 0, momT = 0, runT = 2, defT = 0, clk = 0;
    let curT = o.t0 || 0, mClk = 0, bxT = 50, lastPasser = null, lastPassClk = -9, frozen = false, en = null, cv = null, g = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, alive = true;
    stRefresh();
    const goals = (o.goals || []).map(e => ({ m: e.m, side: e.side, me: !!e.me, as: !!e.as, done: e.m <= (o.t0 || 0) && (o.t0 || 0) > 0 }));
    const reform = (p, [r, d, w, ov, inf]) => { p.r = r; p.d = d; p.w = w * 0.68; if (ov !== undefined) { p.spd += (qOf(ov) - p.q) * 0.5; p.q = qOf(ov); }
      if (inf) { p.inf = inf; if (inf.en !== undefined) { p.e0 = inf.en; p.eT = curT; } } numbers(p.side); };
    // Número da camisa: o que vier (inf.num), senão o clássico da posição (1 goleiro, 2 e 6 laterais, 3 e 4 zagueiros, 5 volante,
    // 8 e 10 meias, 7 e 11 pelos lados, 9 centroavante); repetido vira 13, 14... Você fica com o seu número
    const NUMS = { GK: [1], RB: [2], LB: [6], CB: [3, 4, 15], DM: [5], CM: [8, 10, 5, 16], RM: [7], LM: [11], RW: [7], LW: [11], ST: [9, 10, 19] };
    function numbers(s) {
      const used = new Set(), list = T[s];
      if (s === 0 && ME >= 0 && list[ME]) { list[ME].num = o.num || 9; used.add(list[ME].num); }
      list.forEach(p => { if (p.inf && p.inf.num && !(s === 0 && ME >= 0 && p === list[ME]) && !used.has(p.inf.num)) { p.num = p.inf.num; used.add(p.num); } });
      list.slice().sort((a, b) => (a.r === 'ST' && Math.abs(a.w - 34) <= 17 ? -1 : 0) - (b.r === 'ST' && Math.abs(b.w - 34) <= 17 ? -1 : 0)).forEach(p => { if (used.has(p.num) && (p.num === (p.inf && p.inf.num) || (s === 0 && ME >= 0 && p === list[ME]))) return;
        const wide = Math.abs(p.w - 34) > 17, pref = p.r === 'ST' && wide ? (p.w < 34 ? [11, 7] : [7, 11]) : NUMS[p.r] || [];
        let n = pref.concat(NUMS[p.r] || []).find(x => !used.has(x)); for (let x = 13; !n; x++) if (!used.has(x)) n = x; p.num = n; used.add(n); });
    }
    // Energia de cada um: começa no que veio (Treinador) ou perto de 100 e cai com os minutos (mais rápido na pressão alta)
    const enOf = p => (isMe(p) && en !== null ? en : p.inf && p.inf.enf ? cl(p.inf.enf(), 0, 100) : cl(p.e0 - (curT - p.eT) * p.eK * (0.8 + 0.5 * Math.min(1.2, ST[p.side].press)), 5, 100));
    numbers(0); numbers(1);
    let due = null; // o gol do motor que está para sair
    // Seu lance (o texto que a narração vai escrever): a jogada acontece no campinho e só então a linha sai (cb)
    // k: chute, fora, drible, conduz, perde, passe, erra, impedido (com a bola) · desarme, corte, driblado, falta, defesa,
    // oppfora, pega, saimal, rebate (eles atacam perto de você) · none
    let lc = null, stopWhy = '';
    const DEF = { desarme: 1, corte: 1, driblado: 1, falta: 1, defesa: 1, oppfora: 1, pega: 1, saimal: 1, rebate: 1 };
    function lcDone() { const f = lc && lc.cb; lc = null; if (f) f(); }
    const acc = { x: 0, n: 0 }, pt = [0, 0]; // quem mandou no minuto (média) e tempo de posse de cada time

    function lineOf(s) { let m = 0; T[1 - s].forEach(q => { if (q.r !== 'GK') m = Math.max(m, tf(s, q)[0]); }); return Math.max(m, L / 2); }
    // Onde cada um quer estar (no referencial de quem ataca para a direita). Com a bola o time se arma em linhas: atrás
    // seguram os zagueiros e o volante, o lateral do lado da bola passa e o outro fecha por dentro (na posse) ou fica aberto,
    // os meias jogam nos corredores entre lateral e zagueiro deles, os pontas abertos e o centroavante na linha do último
    // zagueiro. Sem a bola cada estilo tem o seu bloco: altura da linha, distância entre as linhas e quanto fecha o meio
    const lineOfRole = p => (p.d < 0.3 ? 0 : p.d < 0.75 ? 1 : 2);
    const isWide = p => p.r === 'LM' || p.r === 'RM' || p.r === 'LW' || p.r === 'RW' || (p.r === 'ST' && Math.abs(p.w - 34) > 17);
    const isFB = p => p.r === 'LB' || p.r === 'RB';
    function shapeOf(p, has, bx, by, line) {
      if (p.r === 'GK') return has ? [cl(4 + bx * 0.12, 5, 16), 34 + (by - 34) * 0.2] : [cl(2 + bx * 0.05, 2, 7), 34 + (by - 34) * 0.3];
      const st = ST[p.side], ln = Math.min(1, st.line), pr = Math.min(1, st.press), wd = Math.min(1, st.wide), posse = st.ctrl > 1.1;
      const role = lineOfRole(p), sgn = p.w < 34 ? -1 : 1, ballSide = (by - 34) * sgn > 4;
      let x, y;
      // Saída de trás (posse): com a bola no goleiro, os zagueiros abrem nos lados da área, o volante desce entre eles e os laterais sobem
      if (has && ball.owner && ball.owner.r === 'GK' && ball.owner.side === p.side && patOf(p.side) > 0.3) {
        if (role === 0 && !isFB(p)) return Math.abs(p.w - 34) < 4 ? [15, 34] : [9, 34 + sgn * 18];
        if (isFB(p)) return [24, 34 + sgn * 29];
        if (role === 1 && p.d < 0.45) return [17, 34 + (p.w - 34) * 0.4];
      }
      if (has) {
        const L2 = Math.max(line, 52), back = cl(bx - 30 + 12 * ln, 14 + 22 * ln, 34 + 18 * ln);
        if (isFB(p) && role <= 1) {
          {
            if (ballSide && bx > 42 - 10 * wd) { x = Math.min(bx + 4, L2 - 1); y = 34 + sgn * (30 + 2 * wd); } // passa por fora
            else if (posse) { x = back + 12; y = 34 + sgn * 13; } // lateral por dentro, vira volante
            else { x = back + 7 + (role ? 8 : 0); y = 34 + sgn * (24 + 4 * wd); } // ala (3 zagueiros) fica mais adiantado
          }
        } else if (role === 0) {
          { x = back + (Math.abs(p.w - 34) > 8 ? 2 : 0); y = 34 + (p.w - 34) * 0.9 + (by - 34) * 0.12; }
        } else if (role === 1) {
          if (isWide(p)) { x = Math.min(L2 - 4, bx + 8); y = 34 + sgn * (28 + 4 * wd); }
          else if (p.d < 0.45 || (p.d < 0.5 && Math.abs(p.w - 34) < 3)) { x = back + 11; y = 34 + Math.sign(p.w - 34) * Math.min(8, Math.abs(p.w - 34)) + (by - 34) * 0.3; } // volante(s): na frente dos zagueiros
          else { x = cl(bx + 1 + 6 * ln, back + 14, L2 - 3); y = 34 + sgn * Math.max(10, Math.abs(p.w - 34) * 0.75) + (by - 34) * 0.15; } // corredor
        } else {
          if (isWide(p)) { x = L2 - 1.5; y = 34 + sgn * (27 + 5 * wd); }
          else { x = L2 - 0.6; y = 34 + (p.w - 34) * 0.6 + (by - 34) * 0.2; }
        }
        // Bola na ponta perto da área (zaga e área, 2026-11-07): o ataque ocupa as zonas do cruzamento: o centroavante na
        // 1ª trave, o ponta do outro lado na 2ª trave, o meia de chegada na marca do pênalti (passe para trás e rebote)
        const wideB = bx > 72 && Math.abs(by - 34) > 12, bs = Math.sign(by - 34) || 1, mine = (p.w - 34) * bs > 4;
        if (wideB && ball.owner && ball.owner.side === p.side && ball.owner !== p) {
          if (role === 2 && !isWide(p)) { x = L - 7 - (bx < 88 ? 3 : 0); y = 34 + bs * 3.5; }
          else if (role === 2 && !mine) { x = L - 8; y = 34 - bs * 7; }
          else if (role === 1 && !isWide(p) && !isFB(p) && p.d >= 0.45) { x = L - 13 - (bx < 88 ? 4 : 0); y = 34 - bs * 2; }
        }
        if (role === 2 || (role === 1 && x > L2 - 1)) x = Math.min(x, Math.max(L2 - 0.8, bx - 2)); // sem ficar impedido
      } else {
        // Bloco: a linha de defesa fica a uma distância da bola que depende do estilo, entre um mínimo e um máximo
        // Bola perto da área (zaga e área, 2026-11-07): a linha entra na área (a ~metade da distância da bola ao gol) e os
        // volantes fecham a entrada, onde nasce o passe para trás; a zaga se fecha no meio da área em vez de seguir a bola
        const deep = cl((34 - bx) / 14, 0, 1);
        const H = Math.min(cl(bx - (30 - 10 * ln), 9 + 30 * ln, 22 + 30 * ln), Math.max(5.5, 3 + bx * 0.5)), gap = (9 + 5 * pr) * (1 - 0.25 * deep), nar = (0.5 + 0.18 * wd + 0.12 * pr) * (1 - 0.2 * deep);
        if (role === 0 || isFB(p)) x = H + (isFB(p) ? 1 : 0); // ala volta para a linha (vira linha de 5)
        else if (role === 1) x = H + gap + (p.d < 0.45 ? -2 : 0);
        else x = Math.max(H + gap * 2 + (pr < 0.2 ? 8 : 0), 28 * deep); // na retranca os da frente ficam esperando o contra-ataque; com a área fechada eles não descem junto
        y = 34 + (p.w - 34) * nar + (by - 34) * (0.45 - 0.1 * pr) * (role === 0 && !isFB(p) ? 1 - 0.45 * deep : 1);
        x += LN[p.side] * (1 - deep);
      }
      return [cl(x, 2, 102), cl(y, 2.5, 65.5)];
    }
    function findSpace(p, s, line) {
      if (p.run > 0) return toW(s, p.runX, p.runY);
      if (p.go > 0) return toW(s, p.goX, p.goY);
      const [bx, by] = tf(s, ball), [sx, sy] = shapeOf(p, true, bx, by, line), pt = patOf(s);
      let best = toW(s, sx, sy), bs = -1e9;
      // Procura o espaço: longe de onde os adversários VÃO estar (posição + velocidade), com a linha do passe limpa,
      // nem colado na bola nem longe demais dela, sem empilhar com o companheiro e sem largar muito a sua faixa
      const zone = sx > 88 && bx > 72 && Math.abs(by - 34) > 12; // atacando a 1ª/2ª trave ou a marca do pênalti: ajusta pouco
      for (let i = 0; i < 12; i++) {
        const a = i * 0.52 + rnd() * 0.5, r = i === 0 ? 0 : zone ? 1 + rnd() * 2.5 : 3 + rnd() * 11;
        let cx = cl(sx + Math.cos(a) * r, 2, 103), cy = cl(sy + Math.sin(a) * r, 3, 65);
        if (p.d > 0.6) cx = Math.min(cx, Math.max(line - 0.8, bx - 2));
        if (p.d < 0.3) cx = Math.max(cx, sx - 3); // zaga não recua para fugir da marcação: segura a altura do bloco
        const [wx, wy] = toW(s, cx, cy);
        let open = 16, lane = 12, crowd = 0;
        for (const q of T[1 - s]) { open = Math.min(open, Math.hypot(q.x + q.vx * 0.45 - wx, q.y + q.vy * 0.45 - wy)); lane = Math.min(lane, segD(q.x, q.y, ball.x, ball.y, wx, wy)); }
        for (const q of T[s]) if (q !== p) { const d = Math.hypot(q.x - wx, q.y - wy); if (d < 9) crowd += 9 - d; }
        const db = Math.hypot(wx - ball.x, wy - ball.y), near = db < 7 ? (7 - db) * 0.8 : db > 34 ? (db - 34) * 0.12 : 0;
        // Triângulo (mais na posse): perto da bola, oferecer-se a 8–16 m e fora da linha reta de quem tem a bola (em ângulo)
        const tri = pt > 0 && db < 26 && ball.owner && ball.owner.side === s ? pt * (Math.min(Math.abs(wy - ball.y), 9) * 0.25 - Math.max(0, Math.abs(db - 12) - 4) * 0.3) : 0;
        const sc = open * 0.6 + lane * 0.8 + (cx - sx) * 0.15 - Math.hypot(cx - sx, cy - sy) * 0.22 - crowd * 0.6 - near + tri + rnd() * 0.8;
        if (sc > bs) { bs = sc; best = [wx, wy]; }
      }
      return best;
    }
    function defend(s, dt) {
      const own = T[s], att = T[1 - s], gx = s ? L : 0, gy = 34;
      const tgt = ball.fly && !ball.fly.shot ? { x: ball.fly.x1, y: ball.fly.y1 } : ball;
      const outs = own.filter(p => p.r !== 'GK').sort((a, b) => dist(a, tgt) - dist(b, tgt));
      const pr = outs[0], cv2 = outs[1], th3 = outs[2], [bx, by] = tf(s, ball), owner = ball.owner;
      const stl = ST[s], ln1 = Math.min(1, stl.line), pr1 = Math.min(1, stl.press);
      // A linha sobe junta no passe para trás e recua quando quem tem a bola está de frente e livre no meio
      let ofr = 99; if (owner && owner.side !== s) for (const q of own) if (q.r !== 'GK') ofr = Math.min(ofr, dist(q, owner));
      const oax = owner && owner.side !== s ? tf(1 - s, owner)[0] : 0, afx = owner ? (owner.side ? -owner.fx : owner.fx) : 0;
      const freeFwd = owner && owner.side !== s && owner.r !== 'GK' && ofr > 7 && oax > 35 && oax < 78 && afx > 0.2;
      const lnT = stepT[s] > 0 ? 3 + 4 * ln1 : freeFwd ? -(3 + 4 * (1 - ln1)) : 0;
      LN[s] += cl(lnT - LN[s], -4 * dt, 4 * dt); stepT[s] = Math.max(0, stepT[s] - dt); cpT[s] = Math.max(0, cpT[s] - dt);
      // Gatilhos de pressão: bola no lateral perto da linha, passe para trás, quem está de costas para o gol dele.
      // Cada estilo só sai na pressão até uma altura (pressão até a saída deles; posse e equilibrado do meio para trás;
      // contra e retranca só perto da própria área). Sem gatilho, o bloco espera
      const zoneOk = bx < (stl.press > 0.8 ? 101 : stl.press >= 0.2 ? 56 : 34);
      const trig = !!owner && owner.side !== s && owner.r !== 'GK' && zoneOk && (Math.abs(owner.y - 34) > 24 || stepT[s] > 0 || afx < -0.3);
      const cp = cpT[s] > 0 && !!owner && owner.side !== s, trap = trig && Math.abs(owner.y - 34) > 24;
      defT -= dt;
      if (defT <= 0) {
        defT = 0.5; own.forEach(p => { p.mark = null; });
        const pairs = [];
        outs.slice(2).forEach(d => { if (lineOfRole(d) === 2 && bx < 40) return; // os da frente não descem marcando: ficam para o contra-ataque
          const [zx, zy] = shapeOf(d, false, bx, by, 0), [wx, wy] = toW(s, zx, zy);
          att.forEach(a => { if (a === owner || a.r === 'GK') return; const ax = tf(s, a)[0], hot = ax < 24 || a.run > 0;
            // atacante na área ou correndo nas costas: vale mais (é ele que faz o gol) e o zagueiro vai buscá-lo de mais longe
            const k = (hot ? Math.min(Math.hypot(a.x - wx, a.y - wy), dist(a, d)) : Math.hypot(a.x - wx, a.y - wy)) * (hot ? 0.7 : 1); if (k < (hot ? 14 : 13)) pairs.push([k, d, a]); }); });
        pairs.sort((a, b) => a[0] - b[0]); const used = new Set();
        pairs.forEach(([, d, a]) => { if (!d.mark && !used.has(a)) { d.mark = a; used.add(a); } });
      }
      // Pressão alta com a bola na saída deles: os da frente encaixam (cada um fecha o passe para um zagueiro ou lateral),
      // não só um correndo atrás da bola
      const jam = new Map();
      if (ST[s].press > 0.8 && owner && tf(s, ball)[0] > 62) {
        const taken = new Set();
        own.filter(p => p !== pr && p.r !== 'GK' && lineOfRole(p) === 2).forEach(p => {
          const c = att.filter(a => a !== owner && !taken.has(a) && tf(s, a)[0] > 60 && dist(a, p) < 22).sort((a, b) => dist(a, p) - dist(b, p))[0];
          if (c) { taken.add(c); jam.set(p, c); }
        });
      }
      own.forEach(p => {
        if (p.r === 'GK') { const d = Math.hypot(ball.x - gx, ball.y - gy) || 1; let k = Math.min(6, 1.2 + d * 0.07);
          // Cara a cara (fase 5): o atacante entra na área sem ninguém entre ele e o gol; o goleiro sai e fecha o ângulo
          if (owner && owner.side !== s && owner.r !== 'GK' && d < 18 && Math.abs(ball.y - gy) < 13 && !own.some(q => q.r !== 'GK' && Math.hypot(q.x - gx, q.y - gy) < d - 1 && segD(q.x, q.y, ball.x, ball.y, gx, gy) < 2.5)) k = cl(d - 3.2, k, 10);
          p.tx = gx + (ball.x - gx) / d * k; p.ty = gy + (ball.y - gy) / d * k * 0.9; if (k > 6) p.sprint = 1; return; }
        const [zx, zy] = shapeOf(p, false, bx, by, 0); let [wx, wy] = toW(s, zx, zy);
        const hunt = due && due.side === s; // o gol do motor é deles: vão buscar a bola de qualquer jeito
        const nearBox = bx < 32; // bola perto da área: quem está mais perto sempre sai e fica na frente do chute
        if (p === pr && (hunt || cp || nearBox || dist(pr, tgt) < 12 + 26 * ST[s].press + (trig ? 14 : 0)) && !(owner && owner.r === 'GK')) {
          // Quem pressiona fica a uns 2,6 m, do lado do gol (fecha o caminho sem grudar); de vez em quando dá o bote (lg)
          if (owner) {
            if (p.lg <= 0 && (p.cd <= 0 || hunt) && dist(p, owner) < 4.5 && (hunt || rnd() < dt * (0.3 + 0.9 * ST[s].press) * (cp ? 3 : trig ? 2.2 : 1) * cl(enOf(p) / 70, 0.5, 1))) { p.lg = 0.7; p.cd = 0; }
            const d = Math.hypot(gx - owner.x, gy - owner.y) || 1, k = p.lg > 0 ? 0.8 : nearBox ? 2.4 : 3.4 + (1 - Math.min(1, ST[s].press)) * 1.4; // a um corpo de distância (o desenho não encosta), até dar o bote
            wx = owner.x + (gx - owner.x) / d * k; wy = owner.y + (gy - owner.y) / d * k;
          } else { wx = tgt.x; wy = tgt.y; }
          p.tx = wx; p.ty = wy; p.sprint = p.lg > 0 || dist(p, tgt) > 5 ? 1 : 0; return;
        }
        if (p === cv2 && owner && owner.r !== 'GK') {
          const n = att.filter(a => a !== owner && a.r !== 'GK').sort((a, b) => dist(a, owner) - dist(b, owner))[0];
          if (n) { p.tx = owner.x + (n.x - owner.x) * 0.55; p.ty = owner.y + (n.y - owner.y) * 0.55; if (trig || cp) p.sprint = 1; return; }
        }
        if (p === th3 && owner && owner.side !== s && owner.r !== 'GK' && (trap || cp || (trig && stl.press > 0.8 && bx > 62))) {
          if (cp && dist(p, owner) < 16) { const a = Math.atan2(owner.y - pr.y, owner.x - pr.x) + 1.9; p.tx = owner.x + Math.cos(a) * 3.2; p.ty = owner.y + Math.sin(a) * 3.2; p.sprint = 1; return; }
          const n2 = att.filter(a => a !== owner && a.r !== 'GK').sort((a, b) => dist(a, owner) - dist(b, owner))[1];
          if (n2) { p.tx = owner.x + (n2.x - owner.x) * 0.55; p.ty = owner.y + (n2.y - owner.y) * 0.55; p.sprint = dist(p, n2) > 6 ? 1 : 0; return; }
        }
        if (jam.has(p) && owner) { const a = jam.get(p); p.tx = a.x + (owner.x - a.x) * 0.3; p.ty = a.y + (owner.y - a.y) * 0.3; p.sprint = dist(p, a) > 8 ? 1 : 0; return; }
        if (p.mark) { const a = p.mark, d = Math.hypot(gx - a.x, gy - a.y) || 1, ax = tf(s, a)[0];
          // Marcação do lado do gol: perto da área cola (1,5 m, entre ele e o gol); quem corre nas costas é acompanhado ombro a ombro
          const run = a.run > 0 || a.go > 0, tight = run || ax < 24, kd = run ? 2.2 : ax < 24 ? 2.4 : 4.6, wm = run ? 1 : ax < 24 ? 0.9 : 0.65;
          const lead = run ? 0.35 : 0.15; // vai para onde ele vai estar
          wx = wx * (1 - wm) + (a.x + a.vx * lead + (gx - a.x) / d * kd) * wm; wy = wy * (1 - wm) + (a.y + a.vy * lead + (gy - a.y) / d * kd) * wm;
          if (tight && dist(p, a) > 3) p.sprint = 1;
          // Zagueiro não afunda atrás do atacante além do que a linha permite: linha alta segura e deixa em impedimento
          if (p.d < 0.3 && !run) { const lo = zx - 4 - (1 - Math.min(1, ST[s].line)) * 10, fx = tf(s, { x: wx, y: wy })[0]; if (fx < lo) wx = toW(s, lo, 0)[0]; } }
        p.tx = wx; p.ty = wy;
      });
    }
    function passOdds(s, tx, ty, lofted, q, turn) {
      const [wx, wy] = toW(s, tx, ty), d = Math.hypot(wx - ball.x, wy - ball.y), spd = lofted ? 23 : 21;
      let pI = 0, cut = null;
      for (const op of T[1 - s]) {
        for (let f = lofted ? 0.8 : 0.12; f <= 1.001; f += 0.11) {
          const px = ball.x + (wx - ball.x) * f, py = ball.y + (wy - ball.y) * f;
          const tb = d * f / spd + 0.08, to = Math.max(0, Math.hypot(op.x - px, op.y - py) - 1.1) / 7.5 + (op.r === 'GK' ? 0.15 : 0.44 + (turn ? 0.45 : 0) - (op.q || 0) * 0.6) + (op.stun > 0 ? 0.6 : 0);
          const r = sig((tb - to) * 4) * (f > 0.95 ? 0.7 : 1);
          if (r > pI) { pI = r; cut = { o: op, x: px, y: py }; }
        }
      }
      const tr = Math.max(0, Math.hypot(q.x - wx, q.y - wy) - 0.8) / 7.8, late = sig((tr - d / spd) * 2.5) * 0.35;
      return { p: cl((1 - pI) * (1 - late) + (bias[s] - 1) * 0.6, 0.03, 0.97), cut, wx, wy };
    }
    function shotXg(s, bx, by, head) {
      const ang = Math.abs(Math.atan2(GR - by, L - bx) - Math.atan2(GL - by, L - bx)), [gwx, gwy] = toW(s, L, 34);
      let block = 0, press = 99;
      for (const op of T[1 - s]) { if (op.r !== 'GK' && segD(op.x, op.y, ball.x, ball.y, gwx, gwy) < 1.4) block++; press = Math.min(press, dist(op, ball)); }
      return cl(ang * 0.42 - block * 0.03 - (press < 1.8 ? 0.03 : 0), 0.01, 0.5) * (head ? 0.6 : 1);
    }
    // Quem faz o gol que o motor mandou: você, ou um atacante do time
    const scorerOf = d => d.who || (d.me && ME >= 0 && d.side === 0 ? T[0][ME] : at(d.side, d.side ? 9 + (d.m % 2) : [9, 8, 10][d.m % 3]));
    // Como nasce o gol do motor (zaga e área, 2026-11-07): pelo estilo, a mistura do futebol de verdade. corte = o ponta vai
    // ao fundo e toca para trás na marca do pênalti; cabeca = cruza na 1ª trave; enfiada = bola nas costas e cara a cara;
    // drible = conduz para dentro da área; fora = de fora da área, com espaço. Só o gol (a chance que não entra fica como era)
    function duePick(e) {
      if (e.out && e.out !== 'gol') return;
      const s = e.side, pt = patOf(s), wd = Math.min(1, ST[s].wide), dr = dirOf(s);
      const W = { corte: 0.24 + 0.14 * pt + 0.1 * wd, cabeca: 0.1 + 0.26 * wd, enfiada: 0.1 + 0.3 * dr, drible: 0.15, fora: 0.12 };
      let r = rnd() * Object.values(W).reduce((a, b) => a + b, 0), pl = 'drible'; for (const k in W) { r -= W[k]; if (r <= 0) { pl = k; break; } }
      const sc = scorerOf(e), [sx] = tf(s, sc);
      if (e.me || (e.as && ME >= 0 && s === 0)) pl = pl === 'corte' || pl === 'cabeca' ? 'drible' : pl; // a jogada passa por você: sem ponta
      let wg = null;
      if (pl === 'corte' || pl === 'cabeca') {
        wg = T[s].filter(q => q !== sc && q.r !== 'GK' && !isMe(q) && (isWide(q) || isFB(q))).sort((a, b) => (tf(s, b)[0] + (isWide(b) ? 8 : 0)) - (tf(s, a)[0] + (isWide(a) ? 8 : 0)))[0];
        if (!wg) pl = 'drible';
      }
      const ws = wg ? Math.sign(tf(s, wg)[1] - 34) || 1 : 1;
      e.play = pl; e.wing = wg; e.ws = ws;
      if (pl === 'corte') { e.rx = 94; e.ry = 34 - ws * (1 + rnd() * 3); }
      else if (pl === 'cabeca') { e.rx = 98.5; e.ry = 34 + ws * (1.5 + rnd() * 2.5); }
      else if (pl === 'enfiada') { e.rx = 95 + rnd() * 2; e.ry = 34 + gauss() * 4; }
      else if (pl === 'fora') { e.rx = 80 + rnd() * 3; e.ry = 34 + gauss() * 5; }
      else { e.rx = 88; e.ry = 34 + gauss() * 6; }
    }
    // Jogada pela ponta: a bola procura o ponta, ele vai ao fundo e espera quem vai marcar chegar na zona para servir
    function wingPlay(p, s, bx, by) {
      const pl = due.play, wg = due.wing;
      if (!(pl === 'corte' || pl === 'cabeca') || !wg || !T[wg.side].includes(wg) || due.now || due.dl) return null;
      const sc = scorerOf(due);
      if (p === sc && (due.age || 0) < 1) return null;
      if (p === wg) {
        if (bx < 95.5 && Math.abs(by - 34) > 8) { const [wx, wy] = toW(s, Math.min(bx + 8, 99.5), by); ball.carry = { x: wx, y: wy, t: 0.6 }; return 'done'; }
        const [qx, qy] = tf(s, sc);
        if ((curT < due.m - 1 || Math.hypot(qx - due.rx, qy - due.ry) > 4.5) && (due.wt = (due.wt || 0) + 1) < 12) { ball.hold = 0.25; return 'done'; }
        due.dl = true; const [wx, wy] = toW(s, qx + (pl === 'cabeca' ? 0.5 : 0), qy);
        fly(p, wx, wy, sc, pl === 'cabeca', pl === 'cabeca' ? 'cruz' : 'curto', false); ball.fly.quick = true; emit(pl === 'cabeca' ? 'cruz' : 'curto', s, p, sc); return 'done';
      }
      const budget = 2 + 4.5 * patOf(s) + 1.5 * ST[s].wide * (1 - patOf(s));
      if ((due.age || 0) < budget) return { dm: wg };
      const [qx, qy] = tf(s, wg), tx = cl(Math.max(qx + 4, Math.min(bx + 14, 96)), 2, 99), [wx, wy] = toW(s, tx, qy);
      fly(p, wx, wy, wg, Math.hypot(wx - p.x, wy - p.y) > 28, 'curto', false); return 'done';
    }
    function decide(p) {
      const s = p.side, own = T[s], opp = T[1 - s], [bx, by] = tf(s, ball), line = lineOf(s);
      if (lc && lc.have && isMe(p)) return myAct(p, bx, by, line);
      // Rebote (fase 5): quem pegou a sobra perto do gol bate de primeira; o goleiro, já de pé ou não, segura ou a bola vai longe
      if (p.reb > 0 && !due && !lc && bx > 80 && Math.abs(by - 34) < 20) { p.reb = 0; return shoot(p, 'chute', 0, rnd() < 0.55 ? 'fora' : 'def', 'segura'); }
      let dm = null; // jogando a jogada do gol do motor pelo estilo: dm é quem vai marcar
      const pat = patOf(s), dir = dirOf(s), wd = ST[s].wide;
      const wp = due && due.side === s && p.r !== 'GK' ? wingPlay(p, s, bx, by) : null;
      if (wp === 'done') return;
      if (wp && wp.dm) dm = wp.dm;
      // O gol do motor: a jogada procura quem vai marcar (passando antes por você, se a assistência é sua) e ele bate
      if (due && due.side === s && !wp) {
        // Chance que não entra: quem chegar com a bola na entrada da área bate (o chute de fora que o goleiro pega ou vai longe), sem esperar o atacante da jogada
        if (due.out && due.out !== 'gol' && !due.who && p.r !== 'GK' && (due.age || 0) > 1.5 && bx > (due.age > 5 ? 73 : 85) && Math.abs(by - 34) < 18) due.who = p; // de dentro da área primeiro; de fora só se a jogada demorar (fase 5)
        const sc = scorerOf(due), mid = due.as && ME >= 0 && s === 0 && !due.asDone ? T[0][ME] : null;
        if (mid && p !== mid && p !== sc) return fly(p, mid.x + (mid.side ? -1 : 1), mid.y, mid, false, 'curto', false);
        if (mid && p === mid) due.asDone = true;
        // Gol só de perto da área: quem vai marcar e ainda está longe conduz para dentro antes de bater
        const near = due.out && due.out !== 'gol'; // chance que não entra (Treinador): pode bater de mais longe
        // now: a tela já esperou demais; bate de mais longe, mas nunca do meio-campo (só da entrada da área para a frente)
        // gol de perto (zaga e área): de dentro da área, ou da entrada só na jogada de fora
        const gx0 = due.play === 'fora' ? 77 : due.play === 'enfiada' ? 91 : due.play === 'drible' ? 89 : due.play ? 87 : 79, gy0 = due.play === 'fora' ? 16 : due.play ? 14 : 17;
        const inBox = (due.now && bx > 70 && Math.abs(by - 34) < 24) || (bx > (near ? ((due.age || 0) > 5 ? 73 : 85) : gx0) && Math.abs(by - 34) < (near ? 18 : gy0));
        if (p === sc && !inBox) { const [wx, wy] = toW(s, Math.min(bx + 12, due.play === 'fora' ? 81 : due.play ? 95 : 90), 34 + (by - 34) * 0.4); ball.carry = { x: wx, y: wy, t: 0.8 }; return; }
        // Demorou (now): lançamento direto na área para quem vai marcar, que já está correndo para lá
        // Quem vai marcar está além do último zagueiro: o passe espera ele voltar para a linha (nunca gol na banheira)
        const scOff = p !== sc && tf(s, sc)[0] > Math.max(line, bx) + 0.3;
        if (scOff && !(inBox && !due.me && !mid)) { sc.run = Math.max(sc.run, 0.6); sc.runX = Math.max(line, bx) - 1; sc.runY = due.ry; const [wx, wy] = toW(s, bx < line - 1 ? Math.min(bx + 2, line - 1) : bx + 0.5, by); ball.carry = { x: wx, y: wy, t: 0.4 }; return; }
        if (due.now && p !== sc && !inBox) { const [wx, wy] = toW(s, due.rx, due.ry); sc.run = Math.max(sc.run, 1.5); sc.runX = due.rx; sc.runY = due.ry; return fly(p, wx, wy, sc, true, 'costas', false); }
        // Chegou cedo? Prepara (ajeita para o lado) até o minuto do gol, para a rede balançar junto com o placar
        if (inBox && (p === sc || (!due.me && !mid)) && curT < due.m - 1) { const [wx, wy] = toW(s, due.play === 'fora' ? bx : Math.min(bx + 1.5, 92), cl(by + (by < 34 ? 3 : -3), 22, 46)); ball.carry = { x: wx, y: wy, t: 0.35 }; return; }
        if (inBox && (p === sc || (!due.me && !mid))) { const kd = Math.hypot(L - bx, 34 - by) > 22 ? 'fora' : !due.play && bx > 84 && Math.abs(by - 34) < 15 && rnd() < 0.3 ? 'cabeca' : 'chute';
          if (due.out && due.out !== 'gol') { shoot(p, kd, 0, due.out); ball.fly.due = due; return; } // chance do motor que não entra
          return shoot(p, kd, 1); }
        // A jogada do estilo leva a bola até lá (posse troca passes, contra lança, lados vai à ponta); só quando o tempo do
        // estilo acaba o passe vai direto na frente de quem vai marcar, no caminho da área
        const pt0 = patOf(s), budget = 2 + 4.5 * pt0 + 1.5 * ST[s].wide * (1 - pt0);
        if (!due.now && (due.age || 0) < budget && !mid) dm = sc;
        else {
          const [qx, qy] = tf(s, sc), tx = cl(Math.max(qx + 6, Math.min(due.rx, qx + 12)), 2, 100), ty = cl(qy + (due.ry - qy) * 0.5, 4, 64), [wx, wy] = toW(s, tx, ty);
          return fly(p, wx, wy, sc, Math.hypot(wx - p.x, wy - p.y) > 28, tx > bx + 15 ? 'costas' : 'curto', false);
        }
      }
      let press = 99, presser = null; for (const op of opp) { const d = dist(op, p); if (d < press) { press = d; presser = op; } }
      // Zagueiro apertado perto da própria área: chutão. Metade vai para a lateral (lateral para eles), metade para o meio-campo
      if (p.r !== 'GK' && p.d < 0.3 && bx < 26 && press < 3.2 && !lc && !dm && outCd <= 0 && rnd() < 0.45 * (1 - 0.6 * pat)) {
        if (rnd() < 0.5) { const [wx, wy] = toW(s, bx + 18 + rnd() * 14, by < 34 ? -2.5 : WD + 2.5); return flyOut(p, wx, wy, true, 'afasta'); }
        const [wx, wy] = toW(s, 50 + rnd() * 12, cl(by + gauss() * 12, 6, 62)); let nr = null, nd = 1e9; for (const q of ALL) { if (q.r === 'GK') continue; const d = Math.hypot(q.x - wx, q.y - wy); if (d < nd) { nd = d; nr = q; } }
        outCd = 3; return fly(p, wx, wy, nr, true, 'longo', nr.side !== s);
      }
      // Ritmo: cada estilo troca um número de passes antes de forçar (posse ~6, equilibrado ~3, contra e ligação direta 0).
      // Antes disso o time circula; lado fechado (3 deles perto) faz a bola voltar e trocar de lado. Gatilho para acelerar:
      // alguém livre nas costas com o passe quase certo, ou a posse já ter rodado o bastante
      // Transição: acabou de ganhar (até 2,5 s) e eles têm pouca gente atrás da bola: o primeiro passe vai para a frente
      // (contra sempre; equilibrado e lados com campo; posse quase nunca: segura e recomeça)
      const beh = opp.filter(q => q.r !== 'GK' && tf(s, q)[0] > bx).length, trans = clk - regClk[s] < 2.5 && posN <= 1 && beh <= 5 && !dm && !due && !lc;
      const tk = trans ? (0.02 + 0.06 * dir) * (1 - 0.8 * pat) : 0;
      const need = Math.round(NEED * pat), early = posN < need && !dm && !due && !lc && bx < 82 && !(tk > 0.02);
      let crowd = 0; for (const op of opp) if (dist(op, p) < 10) crowd++;
      const opts = [];
      for (const q of own) {
        if (q === p || (q.r === 'GK' && (bx > 40 || press > 6))) continue;
        const [qx, qy] = tf(s, q), qv = s ? [-q.vx, -q.vy] : [q.vx, q.vy], d0 = Math.hypot(qx - bx, qy - by);
        if (d0 < 5 || d0 > (p.r === 'GK' ? 65 : 52)) continue;
        if (q.r !== 'GK' && qx > Math.max(line, bx) + 0.3) continue; // impedido na hora do passe (vale para cruzamento e bola nas costas também)
        let kind = 'curto', lofted = false, tx = qx + qv[0] * 0.45, ty = qy + qv[1] * 0.45;
        // Cruzamento: a bola no lado, perto da área, e alguém chegando na área (correndo ou já lá)
        const inB = (x, y) => x > 76 && Math.abs(y - 34) < 16, cx = q.run > 0 ? q.runX : qx, cy = q.run > 0 ? q.runY : qy;
        if (bx > 66 && Math.abs(by - 34) > 11 && q.r !== 'GK' && inB(cx, cy)) { kind = 'cruz'; lofted = true; tx = cl(cx + 3, 86, 99); ty = cl(cy + (34 - cy) * 0.3, 26, 42); }
        else if (q.run > 0.7) { kind = 'costas'; tx = q.runX; ty = q.runY; lofted = d0 > 24; }
        else if (Math.abs(ty - by) > 26 && d0 > 28) { kind = 'inv'; lofted = true; }
        else if (d0 > 32) { kind = 'longo'; lofted = true; }
        tx = cl(tx, 2, 103); ty = cl(ty, 2, 66);
        const od = passOdds(s, tx, ty, lofted, q, kind === 'costas');
        let val = V(tx, ty) + (kind === 'costas' ? (lofted ? 0.06 - 0.05 * pat + 0.03 * dir : 0.06) : 0) + (kind === 'cruz' ? CRZ0 + CRZ1 * wd : 0) + (kind === 'inv' ? 0.02 * wd + 0.01 * pat : 0) + (isMe(q) && tx > 70 ? 0.03 : 0);
        // Jogadas com nome: devolver para quem tocou e saiu correndo (tabela), o passe de primeira para quem já vinha (terceiro
        // homem), o pivô escorando para o meia que chega (parede), o lateral passando por fora (ultrapassagem)
        if (q === lastPasser && q.go > 0 && clk - lastPassClk < 2.5) val += 0.02 + 0.04 * pat;
        if (p.third === q && clk - p.thirdT < 2.5 && q.run > 0) val += 0.025 + 0.035 * pat;
        if (p.lay === q && clk - p.layT < 2.5) val += 0.04;
        if (isFB(q) && q.ovl > 0 && q.run > 0) val += 0.02 + 0.04 * wd;
        if ((isWide(q) || isFB(q)) && Math.abs(ty - 34) > 14 && tx > 35) val += 0.035 * Math.max(0, wd - 0.3); // pelos lados: a bola procura as pontas
        if (tx < bx - 2) val *= 0.9 + 0.08 * pat; // na posse, voltar e recomeçar faz parte
        if (kind === 'curto' && d0 < 22) val += 0.008 + 0.012 * ST[s].ctrl + 0.03 * pat; // tocar curto e de primeira é o jogo de time profissional
        else if (lofted && kind !== 'cruz') val *= 0.92 - 0.3 * pat + (q.r === 'ST' ? 0.25 : 0.05) * dir; // ligação direta: o contra e a retranca procuram o centroavante
        if (p.r === 'GK' && d0 > 30) val *= 1 - 0.55 * pat; // posse: o goleiro sai jogando curto com o zagueiro aberto
        if (tk && tx > bx + 8) val += tk * Math.min(1, (tx - bx) / 25);
        if (bx > 92 && Math.abs(by - 34) > 9 && kind === 'curto' && tx > 80 && tx < bx - 3 && Math.abs(ty - 34) < 12) val += 0.04; // passe para trás da linha de fundo
        if (early) {
          if (kind === 'cruz' || kind === 'longo' || (kind === 'costas' && od.p < 0.9)) val *= 0.55;
          else if (tx <= bx + 4) val += (0.01 + (crowd >= 3 ? 0.02 : 0)) * pat + (kind === 'inv' && crowd >= 3 ? 0.03 : 0);
        }
        if (dm) val += (q === dm ? 0.03 : 0) + 0.0012 * Math.max(0, tx - bx); // jogada do gol do motor: andar para a área e achar quem vai marcar
        if (q.r === 'GK') val *= 0.6; // recuar para o goleiro é a última saída, não o caminho de sempre
        val += PROG * progK(s) * (tx - bx) / 30 * (bx < 52 ? 1.6 : 1); // no campo de defesa, subir vale mais: o time sai jogando
        opts.push({ type: 'pass', kind, q, wx: od.wx, wy: od.wy, lofted, od, p: od.p, u: Math.pow(od.p, kind === 'cruz' ? 1.2 : kind === 'costas' ? 1.5 + 0.6 * ST[s].ctrl : 1.5 + 1.2 * ST[s].ctrl + 1.4 * pat) * val - (1 - od.p) * lossAt((bx + tx) / 2, (by + ty) / 2) * lossK(s) });
      }
      if (p.r !== 'GK') for (const a of [0, 0.6, -0.6]) {
        const tx = cl(bx + Math.cos(a) * 9, 2, 101), ty = cl(by + Math.sin(a) * 9, 3, 65), [wx, wy] = toW(s, tx, ty);
        let near = 99; for (const op of opp) near = Math.min(near, segD(op.x, op.y, p.x, p.y, wx, wy));
        const drib = press < 2.2, dq = (p.q - (presser ? presser.q : 0)) * 1.3, pk = drib ? cl(0.42 + (near - 1.5) * 0.08 + (bias[s] - 1) * 0.6 + dq, 0.1, 0.78) : cl(sig((near - 2.2) * 1.8) + (bias[s] - 1) * 0.4, 0.05, 0.97);
        opts.push({ type: 'carry', kind: drib ? 'drible' : 'conduz', wx, wy, p: pk, presser, u: Math.pow(pk, 1.5 + 1.2 * ST[s].ctrl) * (V(tx, ty) + PROG * progK(s) * Math.cos(a) * 9 / 30) - (1 - pk) * lossAt(bx, by) * lossK(s) + (!drib && near > 8 ? 0.004 : 0) - (!drib && near < 12 ? 0.02 * pat : 0) });
      }
      // Ir ao fundo: o ponta com espaço leva a bola até perto da linha antes de cruzar ou tocar para trás
      if ((isWide(p) || isFB(p)) && bx > 74 && bx < 95 && Math.abs(by - 34) > 13 && press > 2.4) { const tx = Math.min(bx + 9, 100), ty = cl(by + Math.sign(by - 34) * 0.5, 3, 65), [wx, wy] = toW(s, tx, ty);
        let near = 99; for (const op of opp) near = Math.min(near, segD(op.x, op.y, p.x, p.y, wx, wy)); const pk = cl(sig((near - 2) * 1.6), 0.1, 0.95);
        opts.push({ type: 'carry', kind: 'conduz', wx, wy, p: pk, presser, u: pk * (V(tx, ty) + 0.04 + 0.08 * wd) }); }
      if (p.r !== 'GK' && bx > 70 && !dm) { const xg = shotXg(s, bx, by, false); const sd = Math.hypot(L - bx, 34 - by); opts.push({ type: 'shot', kind: sd > 20 ? 'fora' : 'chute', u: xg * SHOT * (Math.abs(by - 34) > 11 ? 1 - 0.7 * ST[s].wide : 1) * (early && xg < 0.25 ? 0.4 : 1) * (sd > 22 && press < 7 ? 0.45 : 1) * (bx > 88 && Math.abs(by - 34) < 14 ? 1.3 : 1) }); } // de longe só com espaço (fase 5) // do lado, quem joga pelos lados prefere cruzar
      if (!opts.length) { ball.hold = 0.3; return; }
      let best = opts[0], bu = -1e9;
      for (const op of opts) { const u = op.u * (1 + 0.28 * gauss() * p.risk) + 0.004 * gauss(); if (u > bu) { bu = u; best = op; } }
      if (best.type === 'shot') return shoot(p, best.kind, 0);
      if (best.type === 'carry') {
        if (best.kind === 'drible') { if (dm || rnd() < best.p) { best.presser.stun = 1.3; ball.carry = { x: best.wx, y: best.wy, t: 1.1 }; emit('drible', s, p); } else { why = 'drible'; setOwner(best.presser); emit('desarme', 1 - s, best.presser, p); } }
        else ball.carry = { x: best.wx, y: best.wy, t: 0.7 + rnd() * 0.6 };
        return;
      }
      lastPasser = p; lastPassClk = clk;
      if (dm || rnd() < best.p + (1 - best.p) * cl(p.q * 1.2 + PASS_OK + PASS_PAT * pat, -0.5, 0.85)) { // quem passa melhor erra menos (só na hora, não muda a escolha); time de posse treina o passe curto
        fly(p, best.wx, best.wy, best.q, best.lofted, best.kind, false);
        if (best.kind !== 'curto') emit(best.kind, s, p, best.q);
        const q = best.q, [qx, qy] = tf(s, q);
        // Tocou curto e tem espaço? Corre para pedir de volta (é assim que nasce a tabela)
        if (best.kind === 'curto' && p.r !== 'GK' && bx > 30 && bx < 88 && rnd() < 0.2 + 0.45 * pat) { p.go = 1.4; p.goX = Math.min(bx + 12, p.d > 0.6 ? line - 0.8 : 100); p.goY = cl(by + (34 - by) * 0.2 + gauss() * 5, 4, 64); ball.fly.quick = true; }
        // Terceiro homem: enquanto a bola vai, um terceiro já parte para o espaço na frente de quem recebe (que toca de primeira)
        else if (best.kind === 'curto' && bx > 25 && qx < 86 && rnd() < 0.1 + 0.35 * pat) {
          const c = T[s].filter(x => x !== p && x !== q && x.r !== 'GK' && x.d > 0.35 && x.run <= 0 && dist(x, q) > 7 && dist(x, q) < 26 && tf(s, x)[0] > qx - 6)[0];
          if (c) { const [cx, cy] = tf(s, c); c.run = 1.4; c.runX = Math.min(qx + 10 + rnd() * 4, Math.max(line - 0.8, qx + 2)); c.runY = cl(cy + (qy - cy) * 0.35 + gauss() * 3, 5, 63); q.third = c; q.thirdT = clk; ball.fly.quick = true; }
        }
        // Parede: bola vertical no centroavante de costas; o meia de trás chega para receber a escorada de primeira
        if (q.r === 'ST' && qx - bx > 14 && qx < 90 && rnd() < 0.35 + 0.35 * (1 - pat)) {
          const c = T[s].filter(x => x !== p && x !== q && x.r !== 'GK' && x.d > 0.35 && x.d < 0.8).sort((a, b2) => dist(a, q) - dist(b2, q))[0];
          if (c) { c.go = 1.6; c.goX = qx - 6; c.goY = cl(qy + (qy < 34 ? 5 : -5), 6, 62); q.lay = c; q.layT = clk; ball.fly.quick = true; }
        }
      } else {
        // passe alto errado: às vezes passa de todo mundo e sai (lateral ou tiro de meta)
        if (best.kind !== 'cruz' && (best.lofted || best.wy < 14 || best.wy > WD - 14) && !due && !lc && outCd <= 0 && rnd() < 0.5) {
          const dx = best.wx - ball.x, dy = best.wy - ball.y, dl = Math.hypot(dx, dy) || 1, ex = best.wx + dx / dl * 10, ey = best.wy + dy / dl * 10 + (best.wy < 34 ? -1 : 1) * (4 + rnd() * 8);
          if (ex < 0 || ex > L || ey < 0 || ey > WD) return flyOut(p, ex, ey, true, best.kind);
        }
        const c = best.od.cut, thief = c ? c.o : opp.slice().sort((a, b) => Math.hypot(a.x - best.wx, a.y - best.wy) - Math.hypot(b.x - best.wx, b.y - best.wy))[0];
        fly(p, c ? c.x : best.wx, c ? c.y : best.wy, thief, best.lofted, best.kind, true);
      }
    }
    function fly(from, wx, wy, to, lofted, kind, cut) {
      const d = Math.hypot(wx - ball.x, wy - ball.y), spd = (lofted ? 23 : kind === 'curto' ? 22 : 20) * (due && from.side === due.side && !cut ? 1.35 : 1);
      ball.fly = { x0: ball.x, y0: ball.y, x1: cl(wx, 0.5, L - 0.5), y1: cl(wy, 0.5, WD - 0.5), t: 0, dur: Math.max(0.25, d / spd), to, kind, cut, from, loft: lofted ? d * 0.35 : 0, shot: false };
      ball.owner = null; ball.carry = null; ball.loose = null; lastSide = from.side;
      // Cruzamento (fase 5): a bola cai perto do gol e o goleiro chega antes; ele sai, sobe e segura ou soca para longe
      if (kind === 'cruz' && !cut && !due && !lc && from.side !== undefined) { const gk = T[1 - from.side][0], f = ball.fly;
        if (Math.hypot(gk.x - f.x1, gk.y - f.y1) < 9.5 && Math.abs(f.y1 - 34) < 9 && rnd() < 0.45) { f.to = gk; f.cut = true; f.gkc = rnd() < 0.5 ? 'soco' : 'segura'; } }
    }
    // Bola que vai sair: o alvo fica além da linha (não é preso dentro do campo); ao chegar lá, ballOut decide o reinício
    function flyOut(from, wx, wy, lofted, kind) {
      DBG[kind] = (DBG[kind] || 0) + 1;
      fly(from, wx, wy, null, lofted, kind, true);
      const f = ball.fly, d = Math.hypot(wx - f.x0, wy - f.y0); f.x1 = cl(wx, -3, L + 3); f.y1 = cl(wy, -3, WD + 3); f.out = true; f.dur = Math.max(0.35, d / (lofted ? 21 : 19)); f.loft = lofted ? d * 0.3 : 0;
      outCd = 3.5;
    }
    // Saiu: lateral (linha lateral) ou linha de fundo (escanteio se quem defende tocou por último, senão tiro de meta)
    function ballOut(last, x, y) {
      ball.owner = ball.fly = ball.loose = ball.carry = null;
      if (y < 0 || y > WD) return restart('lat', 1 - last, cl(x, 1, L - 1), y < 0 ? 0 : WD);
      const dS = x > L / 2 ? 1 : 0; // lado 1 defende o gol da direita
      if (last === dS) return restart('esc', 1 - dS, x > L / 2 ? L : 0, y < WD / 2 ? 0 : WD);
      mode = 'tiro'; modeT = 1.4; poss = dS; signal(dS, x > L / 2 ? L - 5.5 : 5.5, 34, 'tiro');
    }
    // Sinais: o bandeirinha daquela metade (se a bola saiu do lado dele) aponta, e o juiz aponta com o braço quem cobra
    function signal(s, x, y, k) {
      const sd = (s === 0 ? 1 : -1) * (mir() ? -1 : 1);
      REF.sig = 'braco'; REF.dir = sd; REF.sigT = 2.2;
      const a = arFor(x);
      if ((k === 'lat' && ((a.top && y <= 0.5) || (!a.top && y >= WD - 0.5))) || k === 'esc' || k === 'tiro') { a.sig = 'point'; a.dir = sd; a.sigT = 2.2; }
    }
    // Sem a bola (fase 4): LN ajuste da altura da linha (m, sobe no passe para trás, recua com o meia deles livre), stepT tempo
    // do gatilho do passe para trás, cpT contrapressão depois de perder, regClk quando cada time ganhou a bola
    const LN = [0, 0], stepT = [0, 0], cpT = [0, 0], regClk = [-9, -9];
    let rs = null, outCd = 0, lastSide = 0, posN = 0; // posN: passes certos da posse (o ritmo: circular antes de acelerar)
    function restart(k, s, x, y) {
      mode = 'rein'; modeT = 0; poss = s;
      const sp = { x, y }, pool = T[s].filter(p => p.r !== 'GK' && !isMe(p) || (isMe(p) && !lc));
      let taker;
      if (k === 'lat') taker = pool.filter(p => /LB|RB|LM|RM|LW|RW/.test(p.r) && dist(p, sp) < 14)[0] || pool.slice().sort((a, b) => dist(a, sp) - dist(b, sp))[0];
      else taker = pool.filter(p => /LW|RW|LM|RM/.test(p.r)).sort((a, b) => dist(a, sp) - dist(b, sp))[0] || pool.filter(p => p.r === 'CM').sort((a, b) => dist(a, sp) - dist(b, sp))[0] || pool[0];
      rs = { k, s, x, y, taker, t: 0 };
      signal(s, x, y, k);
      ALL.forEach(p => { p.run = 0; p.go = 0; p.lg = 0; });
    }
    // Escanteio: onde cada um fica (quadro de quem ataca: x até 105 = gol deles). Quem ataca: zagueiros e o centroavante na
    // área (primeiro pau, segundo pau, marca do pênalti), um na entrada da área, dois atrás. Quem defende: todos na área,
    // marcando de perto quem entrou, um em cada pau, e um ou dois lá na frente para o contra-ataque
    const ESC_A = [[99.5, 30], [98.5, 39], [94, 34], [92, 27], [89, 40], [84, 33]];
    function reinStep(dt) {
      const R = rs, s = R.s, q = R.taker && ALL.indexOf(R.taker) >= 0 ? R.taker : at(s, 6), [bx, by] = tf(s, R), sg = R.y < WD / 2 ? -1 : 1;
      R.t += dt;
      // a bola rola até o lugar da cobrança; quem cobra vai até ela (no lateral, fica do lado de fora da linha)
      const dd = Math.hypot(R.x - ball.x, R.y - ball.y), kb = dd > 0.01 ? Math.min(1, 16 * dt / dd) : 1; ball.x += (R.x - ball.x) * kb; ball.y += (R.y - ball.y) * kb;
      const out = R.k === 'lat' ? (R.y <= 0 ? -0.9 : 0.9) : 0;
      q.tx = cl(R.x + (R.k === 'esc' ? (R.x > L / 2 ? 0.6 : -0.6) : 0), -1, L + 1); q.ty = R.y + out + (R.k === 'esc' ? (R.y < WD / 2 ? -0.6 : 0.6) : 0); q.sprint = 1;
      if (R.k === 'lat') {
        T[s].forEach(p => { if (p === q || p.r === 'GK') return; const [x, y] = shapeOf(p, true, bx, by, lineOf(s)); [p.tx, p.ty] = toW(s, x, y); });
        T[1 - s].forEach(p => { if (p.r === 'GK') return; const [ox, oy] = tf(1 - s, R), [x, y] = shapeOf(p, false, ox, oy, 0); [p.tx, p.ty] = toW(1 - s, x, y); if (Math.hypot(p.tx - R.x, p.ty - R.y) < 3) p.ty = R.y - sg * 3.5; });
      } else {
        // escanteio: quem ataca sobe (zagueiros primeiro), quem defende marca dentro da área
        const atk = T[s].filter(p => p !== q && p.r !== 'GK').sort((a, b) => (a.r === 'CB' ? 0 : a.r === 'ST' ? 1 : 2) - (b.r === 'CB' ? 0 : b.r === 'ST' ? 1 : 2) || b.d - a.d);
        const inBox = atk.slice(0, ESC_A.length);
        atk.forEach((p, i) => { const sp = i < ESC_A.length ? ESC_A[i] : i === ESC_A.length ? [62, 26] : i === ESC_A.length + 1 ? [62, 42] : [76, 34 + (i % 2 ? -16 : 16)]; [p.tx, p.ty] = toW(s, sp[0], 34 + (sp[1] - 34) * -sg); });
        const def = T[1 - s].filter(p => p.r !== 'GK').sort((a, b) => a.d - b.d), gk = T[1 - s][0];
        const [gx, gy] = toW(1 - s, 0.8, 34); gk.tx = gx; gk.ty = gy;
        def.forEach((p, i) => {
          if (i < inBox.length) { const a = inBox[i], [ax, ay] = tf(1 - s, { x: a.tx, y: a.ty }); [p.tx, p.ty] = toW(1 - s, Math.max(1.5, ax - 1.6), ay + (ay < 34 ? 0.8 : -0.8)); }
          else if (i === inBox.length) [p.tx, p.ty] = toW(1 - s, 1.2, 34 + sg * 3.6); // no pau perto
          else if (i === def.length - 1) [p.tx, p.ty] = toW(1 - s, 38, 34); // fica na frente para o contra-ataque
          else [p.tx, p.ty] = toW(1 - s, 13, 34 + (i % 2 ? -7 : 7));
        });
      }
      ALL.forEach(p => { if (p !== q) p.sprint = Math.hypot(p.tx - p.x, p.ty - p.y) > 6 ? 1 : 0; });
      const ready = dist(q, { x: q.tx, y: q.ty }) < 1.2 && dd < 0.3;
      if (!(ready && R.t > (R.k === 'esc' ? 2.0 : 0.7)) && R.t < 5.5) return;
      mode = 'play'; rs = null; q.outT = 0.7; ball.x = q.x; ball.y = q.y; setOwner(q); ball.hold = 9;
      if (R.k === 'lat') {
        // lateral: com as mãos, para o companheiro livre mais perto (até uns 16 m); no ataque, perto da área, às vezes longo na área
        let best = null, bu = -1e9;
        T[s].forEach(p => { if (p === q || p.r === 'GK') return; const d = dist(p, q); if (d < 4 || d > 18) return; let fr = 99; for (const o2 of T[1 - s]) fr = Math.min(fr, dist(o2, p)); const u = Math.min(fr, 6) - d * 0.08 + tf(s, p)[0] * 0.02 + rnd() * 0.8; if (u > bu) { bu = u; best = p; } });
        if (!best) best = T[s].filter(p => p !== q && p.r !== 'GK').sort((a, b) => dist(a, q) - dist(b, q))[0];
        fly(q, best.x, best.y, best, true, 'curto', false); ball.fly.loft = Math.min(ball.fly.loft, 1.6);
      } else {
        // escanteio: cruzamento na área; o desfecho sai do sorteio (cabeçada de quem ataca, zagueiro afasta ou goleiro segura)
        const r = rnd(), atkIn = T[s].filter(p => p !== q && p.r !== 'GK' && tf(s, p)[0] > 88.5 && Math.abs(tf(s, p)[1] - 34) < 20), dfIn = T[1 - s].filter(p => p.r !== 'GK' && tf(s, p)[0] > 88.5), gk = T[1 - s][0];
        if (r < 0.3 && atkIn.length) { const h = atkIn[Math.floor(rnd() * atkIn.length)]; fly(q, h.x, h.y, h, true, 'cruz', false); }
        else if (r < 0.75 && dfIn.length) { const h = dfIn[Math.floor(rnd() * dfIn.length)]; fly(q, h.x, h.y, h, true, 'cruz', true); }
        else { const [wx, wy] = toW(s, 100, 34 + rnd() * 6 - 3); fly(q, wx, wy, gk, true, 'cruz', true); }
        emit('escanteio', s, q);
      }
    }
    // Chute (fase 5): só é gol o que o motor mandou; o resto bate com o que o narrador conta. out: gol | def (o goleiro defende:
    // segura, espalma no rebote ou manda para escanteio) | fora | trave | bloq (o zagueiro trava na frente). O goleiro já está no
    // ângulo e mergulha para o lado da bola; sv força o tipo de defesa (o 2º chute do rebote ele segura)
    function shoot(p, kind, forced, want, sv) {
      const s = p.side, gx = s ? 0 : L, gk = T[1 - s][0], dg = s ? 1 : -1;
      let out = forced ? 'gol' : want || (() => { const r = rnd(); return r < 0.24 ? 'bloq' : r < 0.27 ? 'trave' : r < 0.6 ? 'def' : 'fora'; })();
      let blk = null;
      if (out === 'bloq') { // quem trava: o zagueiro mais perto da linha do chute, entre a bola e o gol
        const cand = T[1 - s].filter(q => q.r !== 'GK' && !q.down && (s ? q.x < ball.x : q.x > ball.x) && Math.abs(q.x - ball.x) < 14).map(q => [segD(q.x, q.y, ball.x, ball.y, gx, 34), q]).sort((a, b) => a[0] - b[0])[0];
        if (cand && cand[0] < 6) blk = cand[1]; else out = 'def';
      }
      let ty, tx = gx - dg * 1.5, dive = null;
      const far = gk.y < 34 ? 1 : -1, reach = 3.2;
      if (out === 'gol') { ty = gk.y < 34 ? GR - 0.35 - rnd() * 1.5 : GL + 0.35 + rnd() * 1.5; dive = gk.y + cl(ty - gk.y, -reach, reach) * 0.78; }
      else if (out === 'def') { const off = (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 2.3); ty = cl(gk.y + off, GL + 0.3, GR - 0.3); tx = gk.x + dg * 0.3; if (Math.abs(ty - gk.y) > 0.9) dive = ty;
        sv = sv || (Math.abs(ty - gk.y) < 1.4 && rnd() < 0.75 ? 'segura' : (() => { const r = rnd(); return r < 0.22 ? 'segura' : r < 0.68 ? 'espalma' : 'escanteio'; })()); }
      else if (out === 'trave') { ty = far > 0 ? GR : GL; tx = gx; dive = gk.y + cl(ty - gk.y, -reach, reach) * 0.7; }
      else if (out === 'bloq') { const t = cl(Math.hypot(blk.x - ball.x, blk.y - ball.y) / (Math.hypot(gx - ball.x, 34 - ball.y) || 1), 0.15, 0.8); tx = ball.x + (gx - ball.x) * t; ty = ball.y + (34 - ball.y) * t + gauss() * 0.4; }
      else { ty = rnd() < 0.5 ? GL - 1 - rnd() * 4 : GR + 1 + rnd() * 4; if (Math.abs(ty - gk.y) < 5.5 && rnd() < 0.5) dive = cl(ty, GL - 0.5, GR + 0.5); }
      const d = Math.hypot(tx - ball.x, ty - ball.y);
      api._lastShot = { x: tf(s, ball)[0], out };
      const high = kind === 'fora' || (out !== 'bloq' && rnd() < 0.35);
      ball.fly = { x0: ball.x, y0: ball.y, x1: tx, y1: ty, t: 0, dur: forced ? Math.max(0.3, d / 30) : Math.max(0.3, d / (kind === 'cabeca' ? 15 : 25)), shot: true, out, side: s, from: p, kind, lc: !!want, sv, blk,
        loft: kind === 'cabeca' ? 2 : out === 'bloq' ? 0.6 : high ? 4 + rnd() * 2 : 0.8, curve: out === 'bloq' ? 0 : gauss() * 2, gk0: { x: gk.x, y: gk.y }, dive, gkx: out === 'def' ? tx : gk.x };
      ball.owner = null; ball.carry = null; ball.loose = null;
      if (blk) { blk.tx = tx; blk.ty = ty; blk.sprint = 1; }
    }
    const WHY = {}, DBG = {}; let why = '?', lastWhy = ''; // diagnóstico (_state().WHY): por que a posse trocou de lado
    function setOwner(p, quick) {
      if (ball.owner ? ball.owner.side !== p.side : poss !== p.side) WHY[why] = (WHY[why] || 0) + 1; lastWhy = why; why = '?';
      ball.owner = p; ball.fly = null; ball.loose = null; ball.carry = null; ball.rcv = 0.3; p.run = 0; p.go = 0; lastSide = p.side; p.ovChk = true;
      let press = 99; for (const q of T[1 - p.side]) press = Math.min(press, dist(q, p));
      const won = p.side !== poss, fast = won && rnd() < ST[p.side].counter * 0.6; // roubou e o time é de contra-ataque: sai rápido
      ball.hold = p.r === 'GK' ? 0.8 + rnd() * 0.6 : quick || fast ? 0.25 + rnd() * 0.2 : press < 3 ? 0.35 + rnd() * 0.25 : (0.25 + rnd() * 0.5) * (0.6 + 0.5 * ST[p.side].ctrl - 0.5 * patOf(p.side)); // a posse gira a bola rápido (triângulos de um, dois toques)
      if (due && due.side === p.side) ball.hold = Math.min(ball.hold, 0.35);
      if (lc && !lc.have && !DEF[lc.k] && isMe(p)) { lc.have = true; ball.hold = 0.35; }
      if (lc && !lc.have && DEF[lc.k] && p === lc.q) { lc.have = true; ball.hold = 1; }
      if (p.side !== poss) { lostBall(poss, p.side); poss = p.side; posN = 0; trail.length = 0; passH = null; ALL.forEach(q => { q.th = rnd() * 0.35; q.run = 0; q.go = 0; q.ovl = 0; }); }
    }
    // Passe para trás: da linha de fundo, pelo lado, de volta para quem chega na marca do pênalti
    function cutback(s, f) { const [x0, y0] = tf(s, { x: f.x0, y: f.y0 }), [x1, y1] = tf(s, ball); return x0 > 92 && Math.abs(y0 - 34) > 9 && x1 > 80 && x1 < x0 - 3 && Math.abs(y1 - 34) < 12; }
    // Trocou a posse: quem perdeu decide entre contrapressão (5 s, menos se cansado) e recompor; quem ganhou marca a hora
    function lostBall(a, b) {
      const st = ST[a], [ax] = tf(a, ball), en = T[a].reduce((u, q) => u + enOf(q), 0) / T[a].length, ef = cl(en / 70, 0.45, 1);
      const cp = st.press > 0.8 || patOf(a) > 0.5 ? 1 : st.press >= 0.2 && ax > 52 ? 0.8 : 0;
      cpT[a] = cp ? 5 * cp * ef : 0; cpT[b] = 0; regClk[b] = clk; stepT[a] = 0;
      // Ganhou com campo livre e o estilo é de contra: os pontas já saem correndo (sem passar da linha)
      const [bx] = tf(b, ball), beh = T[a].filter(q => q.r !== 'GK' && tf(b, q)[0] > bx).length;
      if (beh <= 5 && dirOf(b) > 0.25) { const line = lineOf(b); T[b].forEach(q => { if (q.r === 'GK' || !(isWide(q) || q.r === 'ST')) return; const [qx, qy] = tf(b, q); q.run = 2.2; q.runX = Math.min(line - 0.8, qx + 22); q.runY = cl(qy + (qy < 34 ? -3 : 3), 5, 63); }); }
    }
    function receive(f) {
      const p = f.to, lo = ball.loose, lv = lo ? Math.hypot(lo.vx || 0, lo.vy || 0) : 0;
      why = f.cut ? 'corte' : 'passe'; setOwner(p, f.quick);
      // Rastro dos passes da posse e o nome da jogada que acabou de sair (uma etiqueta a cada 5 s, no máximo)
      if (!f.cut && f.from && f.from.side === p.side && f.from !== p && mode === 'play') {
        posN++;
        if (tf(p.side, ball)[0] < tf(p.side, { x: f.x0, y: f.y0 })[0] - 8) stepT[1 - p.side] = 2.5; // passe para trás: gatilho para a linha subir e apertar
        trail.push({ x0: f.x0, y0: f.y0, x1: ball.x, y1: ball.y, t: 2.2 }); if (trail.length > 5) trail.shift();
        const a = f.from, pv = passH;
        const tg = pv && pv.to === a && pv.from === p && clk - pv.clk < 3.5 && f.kind === 'curto' ? 'TABELA' : a.third === p && clk - a.thirdT < 3 ? 'TERCEIRO HOMEM' : a.lay === p && clk - a.layT < 3 ? 'PAREDE' :
          isFB(p) && p.ovl > 0 ? 'ULTRAPASSAGEM' : cutback(p.side, f) ? 'PASSE PARA TRÁS' : f.kind === 'inv' ? 'INVERSÃO' : (a.r === 'GK' || a.d < 0.3) && p.r === 'ST' && f.loft > 0 ? 'LIGAÇÃO DIRETA' : '';
        if (tg) { const kp = tg + ':' + p.side; PLAYS[kp] = (PLAYS[kp] || 0) + 1; if (clk - tagClk > 5) { playTag = { txt: tg, p, t: 1.8 }; tagClk = clk; } }
        passH = { from: a, to: p, clk };
      }
      // Domínio orientado: ele ajeita a bola no sentido em que ela vinha (ela não bate no pé e volta)
      if (lv > 0.5) { p.bfx = lo.vx / lv; p.bfy = lo.vy / lv; }
      if (lc && DEF[lc.k] && !lc.have && isMe(p) && lc.q) lcDone(); // cortou / segurou o cruzamento
      if (f.cut && f.from && f.from.side !== p.side) emit('corte', p.side, p, f.from);
      if (!f.cut && f.kind === 'cruz' && due && due.dl && due.side === p.side && p === scorerOf(due)) shoot(p, 'cabeca', 1);
      else if (!f.cut && f.kind === 'cruz') { const [bx, by] = tf(p.side, ball); if (bx > 84 && Math.abs(by - 34) < 15) shoot(p, 'cabeca', 0); }
      // zagueiro corta o cruzamento de cabeça: às vezes manda para escanteio
      else if (f.cut && f.kind === 'cruz' && p.r !== 'GK' && !due && !lc && outCd <= 0 && rnd() < 0.6) { const [bx] = tf(p.side, ball); if (bx < 20) flyOut(p, p.side ? L + 2.5 : -2.5, ball.y + (ball.y < 34 ? -4 : 4), true, 'corte'); }
    }
    function shotEnd(f) {
      const s = f.side, gk = T[1 - s][0], dg = s ? 1 : -1, gx = s ? 0 : L;
      if (f.out !== 'gol') emit(f.out === 'def' ? 'defesa' : f.out === 'trave' ? 'trave' : f.out === 'bloq' ? 'bloqueio' : 'fora', s, f.from, f.out === 'bloq' ? f.blk : gk, f.kind);
      if (f.due) { f.due.done = true; if (due === f.due) due = null; if (f.due.cb) f.due.cb(); }
      // Sobra: a bola vai para (rx, ry) e fica com quem chegar primeiro (um atacante perto bate de novo: o 2º chute do rebote)
      const spill = (from, rx, ry, k) => { rx = cl(rx, 1, L - 1); ry = cl(ry, 2, WD - 2); let q = null, qd = 1e9; for (const z of ALL) { if (z.r === 'GK' || z.down || z === f.blk) continue; const dd = Math.hypot(z.x - rx, z.y - ry) * (z.side === s ? 1.15 : 1); if (dd < qd) { qd = dd; q = z; } }
        if (!q) return setOwner(gk); if (q.side === s && rnd() < 0.7 && !lc) q.reb = 1.6; fly(from, rx, ry, q, k === 'soco', k, true); ball.fly.from = from; };
      if (f.out === 'gol') { mode = 'goal'; modeT = 2; koSide = 1 - s; hero = f.from; back = 0; if (due) { const e = due; due.done = true; due = null; if (o.onGoal) o.onGoal(e.m); if (e.cb) e.cb(); } }
      else if (f.out === 'def' && f.lc && lc && lc.k === 'rebate') { const q = T[s].filter(x => x.r !== 'GK').sort((a, b) => dist(a, gk) - dist(b, gk))[0]; setOwner(q); }
      else if (f.out === 'def' && f.sv === 'escanteio' && !lc) { flyOut(gk, s ? -2.5 : L + 2.5, 34 + (ball.y < 34 ? -1 : 1) * (5 + rnd() * 6), true, 'espalma'); }
      else if (f.out === 'def' && f.sv === 'espalma' && !lc) { why = 'rebote'; spill(gk, gx + dg * (6 + rnd() * 5), ball.y + (ball.y < 34 ? -1 : 1) * (3 + rnd() * 7), 'rebote'); }
      else if (f.out === 'def') { why = 'defesa'; setOwner(gk); }
      else if (f.out === 'trave' && !lc) { why = 'trave'; post = { x: f.x1, y: f.y1, t: 0.5 }; spill(gk, gx + dg * (5 + rnd() * 6), 34 + (f.y1 < 34 ? -1 : 1) * (1 + rnd() * 5), 'trave'); }
      else if (f.out === 'bloq' && !lc) { why = 'bloqueio'; const b = f.blk || gk;
        if (rnd() < 0.5 && outCd <= 0) { outCd = 2; flyOut(b, s ? -2.5 : L + 2.5, (ball.y < 34 ? GL - 4 - rnd() * 10 : GR + 4 + rnd() * 10), false, 'travado'); }
        else spill(b, ball.x - dg * (5 + rnd() * 8), ball.y + gauss() * 9, 'travado'); }
      else if (f.out === 'trave' || f.out === 'bloq') { why = 'defesa'; setOwner(gk); }
      else { mode = 'tiro'; modeT = 1.6; poss = 1 - s; }
      if (f.lc && lc) lcDone();
    }
    // Seu lance com a bola: faz o que a narração vai contar
    function myAct(p, bx, by, line) {
      const s = p.side, k = lc.k, opp = T[1 - s];
      const near = opp.filter(q => q.r !== 'GK').sort((a, b) => dist(a, p) - dist(b, p))[0];
      lc.have = false;
      if (k === 'chute' || k === 'fora') { shoot(p, Math.hypot(L - bx, 34 - by) > 20 ? 'fora' : 'chute', 0, k === 'chute' ? 'def' : 'fora'); return; } // a linha sai quando a bola chega
      if (k === 'drible' || k === 'conduz') {
        const [wx, wy] = toW(s, Math.min(bx + (k === 'drible' ? 9 : 14), 95), by + (34 - by) * 0.15);
        if (k === 'drible' && near) { near.x = p.x + (s ? -1.2 : 1.2); near.y = p.y + 0.6; near.stun = 1.4; }
        ball.carry = { x: wx, y: wy, t: k === 'drible' ? 1.1 : 1.5 };
      } else if (k === 'perde') { if (near) setOwner(near); }
      else if (k === 'passe') {
        const q = T[s].filter(x => x !== p && x.r !== 'GK' && tf(s, x)[0] <= Math.max(line, bx) + 0.3).sort((a, b) => tf(s, b)[0] - tf(s, a)[0])[0]; // o mais adiantado sem estar impedido
        if (q) { const [qx, qy] = tf(s, q), [wx, wy] = toW(s, Math.min(Math.max(qx, line) + 7, 97), qy); q.run = 1.4; q.runX = Math.min(Math.max(qx, line) + 7, 97); q.runY = qy; fly(p, wx, wy, q, Math.hypot(wx - p.x, wy - p.y) > 26, 'costas', false); }
      } else if (k === 'erra') {
        const q = T[s].filter(x => x !== p && x.r !== 'GK').sort((a, b) => dist(a, p) - dist(b, p))[1] || T[s][6], th = near || opp[6];
        fly(p, (p.x + q.x) / 2, (p.y + q.y) / 2, th, false, 'curto', true); th.tx = (p.x + q.x) / 2; th.ty = (p.y + q.y) / 2;
      } else if (k === 'impedido') whistle('Impedimento', opp.filter(q => q.r !== 'GK').sort((a, b) => tf(1 - s, a)[0] - tf(1 - s, b)[0])[0]);
      lcDone();
    }
    // Apito (falta, impedimento): todos param um instante e a bola fica com quem vai cobrar
    // A cobrança sai de onde foi a infração (spot; sem spot, onde a bola está): a bola rola até lá e o cobrador vai até ela
    function whistle(why, taker, spot) { mode = 'falta'; modeT = 1.5; stopWhy = why; foulSpot = spot ? { x: spot.x, y: spot.y } : { x: ball.x, y: ball.y }; ball.owner = ball.fly = ball.loose = ball.carry = null; foulTo = taker; }
    // O juiz (o motor já decidiu): falta, cartão ou impedimento de quem joga na posição pos do lado side. O campinho para,
    // o cartão sobe em cima de quem fez, e só então a narração escreve (cb). O expulso sai da lógica na hora (o time joga com
    // um a menos) e fica parado no lugar até o apito acabar; depois sai andando pela lateral mais perto
    let refFx = null, offLine = null, post = null; // post: a trave que acabou de tremer (fase 5)
    const leaving = [];
    const ROLE_OF = { GOL: /GK/, ZAG: /CB/, LAT: /LB|RB/, VOL: /DM|CM/, MEI: /CM|DM|LM|RM/, PON: /LW|RW|LM|RM/, ATA: /ST|LW|RW/ };
    function whoDid(side, pos, me, num) {
      if (me && side === 0 && ME >= 0) return T[0][ME];
      const bn = num && T[side].find(p => p.num === num); if (bn) return bn;
      const re = ROLE_OF[pos], L0 = T[side].filter(p => !isMe(p) && (pos === 'GOL' ? p.r === 'GK' : p.r !== 'GK')), Lr = re ? L0.filter(p => re.test(p.r)) : [];
      return (Lr.length ? Lr : L0).sort((a, b) => dist(a, ball) - dist(b, ball))[0] || null;
    }
    function goOff(p, wait) {
      const s = p.side, i = T[s].indexOf(p); if (i < 0) return;
      const wasMe = isMe(p);
      T[s].splice(i, 1);
      if (s === 0 && ME >= 0) { if (i === ME) { ME = -1; en = null; if (lc) lcDone(); } else if (i < ME) ME--; }
      ALL = T[0].concat(T[1]);
      ALL.forEach(q => { if (q.mark === p) q.mark = null; });
      if (ball.owner === p) { ball.owner = null; setOwner(at(s, 6)); }
      if (ball.fly && ball.fly.to === p) ball.fly.to = at(s, 6);
      if (ball.loose && ball.loose.to === p) ball.loose.to = at(s, 6);
      if (foulTo === p) foulTo = at(s, 6);
      leaving.push({ p, wasMe, wait: wait || 0, t: 0, ty: p.y < WD / 2 ? -1 : WD + 1 });
    }
    function refDo(o) {
      const kind = o.kind, p = whoDid(o.side, o.pos, o.me, o.num);
      if (!p) return false;
      if (kind === 'impedimento') {
        // Nada de teleporte: o mais adiantado do ataque passa da linha correndo, recebe o passe lá e o apito sai onde ele
        // recebeu (offStep); a cobrança é dali. Sem a bola, o ataque espera tê-la um pouco antes do passe
        const s = o.side, own = ball.owner && ball.owner.side === s ? ball.owner : null;
        const q = T[s].filter(x => x.r !== 'GK' && !isMe(x) && x !== own).sort((a, b) => tf(s, b)[0] - tf(s, a)[0])[0];
        if (!q) return false;
        offPend = { s, q, t: 0, f: null };
        return 'pend';
      }
      // Falta e cartão só na disputa: espera o time que sofre ter a bola, quem faz vai no bote em quem está com ela e o
      // apito sai no contato (foulStep). Nada de cartão em quem está longe da bola
      foulPend = { o, t: 0, c: 0, p: null };
      return 'pend';
    }
    function foulNow(o, p, v) {
      const kind = o.kind;
      v.stun = 1.6; v.down = 1.6;
      whistle('Falta', v, v);
      const card = kind === 'amarelo' || kind === 'vermelho';
      modeT = card ? 2.3 : 1.3;
      if (card) refFx = { p, kind, how: o.how, t: 2.3 };
      if (kind === 'vermelho') goOff(p, 2.3);
    }
    // Quem faz: você (se o motor disse que foi você); senão quem joga na posição e está perto de quem tem a bola; senão o
    // mais perto dele
    function fouler(o, v) {
      if (o.me && o.side === 0 && ME >= 0) return T[0][ME];
      const bn = o.num && T[o.side].find(p => p.num === o.num && !p.down); if (bn) return bn; // o Treinador diz quem foi pelo número
      const re = ROLE_OF[o.pos], L0 = T[o.side].filter(p => !isMe(p) && p.r !== 'GK').sort((a, b) => dist(a, v) - dist(b, v));
      return (re && L0.find(p => re.test(p.r) && dist(p, v) < 14)) || L0[0] || null;
    }
    function foulEnd(ok) {
      const P = foulPend; foulPend = null; if (!P) return;
      if (!ok && P.o.kind === 'vermelho') { const p = whoDid(P.o.side, P.o.pos, P.o.me, P.o.num); if (p) goOff(p, 0); }
      if (P.cb) setTimeout(P.cb, ok ? (P.o.kind === 'falta' ? 500 : 900) / Math.max(1, o.speed ? o.speed() : 1) : 0);
    }
    function foulStep(dt) {
      const P = foulPend, so = P.o.side;
      if (mode !== 'play' || lc || due) return foulEnd(false);
      P.t += dt;
      let v = ball.owner && ball.owner.side !== so && ball.owner.r !== 'GK' ? ball.owner : null;
      // o time que sofre demora a ter a bola: a disputa é com quem dele está mais perto da bola (e perto dela de verdade)
      // com a bola no time de quem faz (passou do tempo): a falta é de quem tem a bola (ou de quem da posição está do lado
      // dele) em quem chega para tirar; os dois se encontram
      if (!v && P.t > 1.5 && ball.owner && ball.owner.side === so && ball.owner.r !== 'GK') {
        const own = ball.owner, re = ROLE_OF[P.o.pos];
        const n = T[1 - so].filter(x => x.r !== 'GK').sort((a, b) => dist(a, own) - dist(b, own))[0];
        if (n && dist(n, own) < 12) {
          const mate = re && T[so].find(x => x !== own && !isMe(x) && re.test(x.r) && dist(x, own) < 4);
          const p = P.o.me && so === 0 && ME >= 0 ? T[0][ME] : re && !re.test(own.r) && mate ? mate : own;
          if (P.p !== p) { P.p = p; P.c = 0; }
          v = n; v.tx = own.x; v.ty = own.y; v.sprint = 1;
        }
      }
      if (!v) { if (P.p) P.p.cd = 0; P.p = null; P.c = 0; if (P.t > 4.5) foulEnd(false); return; }
      if (!P.p || T[so].indexOf(P.p) < 0 || dist(P.p, v) > 16) { if (P.p) P.p.cd = 0; P.p = fouler(P.o, v); P.c = 0; if (!P.p) return foulEnd(false); }
      const p = P.p; P.c += dt;
      p.tx = v.x; p.ty = v.y; p.sprint = 1; p.cd = 1; p.lg = Math.max(p.lg || 0, 0.3); // vai no bote (sem desarme limpo: o lance é falta; encosta nele)
      ball.hold = Math.max(ball.hold || 0, 0.25); // quem tem a bola segura um instante, o bote chega
      if (dist(p, v) < 1.6 || (P.c > 1.2 && dist(p, v) < 5)) { foulPend = null; p.cd = 0; foulNow(P.o, p, v); P.cb && setTimeout(P.cb, (P.o.kind === 'falta' ? 500 : 900) / Math.max(1, o.speed ? o.speed() : 1)); return; }
      if (P.t > 5.5) foulEnd(false);
    }
    let foulTo = null, foulSpot = null, offPend = null, foulPend = null;
    // Impedimento a caminho: 1) quem vai ficar impedido corre para além da linha; 2) com a bola no ataque, sai o passe para
    // ele; 3) a bola chega e o apito sai ali. Se o jogo parar antes (gol, seu lance, outra parada), fica só na narração
    function offEnd(ok) { const P = offPend; offPend = null; if (P && P.cb) setTimeout(P.cb, ok ? 500 / Math.max(1, o.speed ? o.speed() : 1) : 0); }
    function offStep(dt) {
      const P = offPend, s = P.s, q = P.q;
      if (mode !== 'play' || lc || due || T[s].indexOf(q) < 0) return offEnd(false);
      P.t += dt;
      const line = lineOf(s), [qx, qy] = tf(s, q), rx = Math.min(L - 4, Math.max(qx, line + 2));
      if (!P.f) {
        q.run = Math.max(q.run || 0, 0.5); q.runX = rx; q.runY = qy;
        const own = ball.owner && ball.owner.side === s && ball.owner !== q ? ball.owner : null;
        // o passe só sai com ele já além da linha (impedimento de verdade: na hora do passe ele está à frente do último zagueiro)
        if (own && qx > line + 0.8) {
          const [wx, wy] = toW(s, Math.max(rx, qx + 1.5), qy);
          fly(own, wx, wy, q, Math.hypot(wx - own.x, wy - own.y) > 26, 'costas', false); ball.fly.dur = Math.min(ball.fly.dur, 1.2); P.f = ball.fly; P.line = line;
        } else if (P.t > 5) offEnd(false);
        return;
      }
      if (ball.fly === P.f) return;
      if (ball.owner === q || (ball.loose && ball.loose.f === P.f)) {
        const d = T[1 - s].filter(x => x.r !== 'GK').sort((a, b) => dist(a, q) - dist(b, q))[0] || at(1 - s, 0);
        whistle('Impedimento', d, ball); modeT = 1.8;
        offLine = { s, x: P.line, t: 1.8 }; arFor(toW(s, P.line, 0)[0]).flag = 1.8; refFx = { p: q, kind: 'impedimento', t: 1.8 };
        return offEnd(true);
      }
      offEnd(false); // a bola não chegou nele (cortaram no caminho)
    }
    // Seu lance sem a bola: eles atacam perto de você (ou na sua área, se você é o goleiro)
    function defAct(dt) {
      const me = T[0][ME], q = lc.q, k = lc.k; lc.t2 = (lc.t2 || 0) + dt;
      const [qx] = tf(1, q), gkAct = k === 'defesa' || k === 'oppfora' || k === 'pega' || k === 'saimal' || k === 'rebate';
      ball.hold = 1; // quem tem a bola espera a jogada
      if (gkAct) {
        if (qx < 78 && lc.t2 < 3) { if (!ball.carry) { const [wx, wy] = toW(1, Math.min(qx + 12, 86), 34 + (tf(1, q)[1] - 34) * (k === 'pega' || k === 'saimal' ? 1 : 0.4)); ball.carry = { x: wx, y: wy, t: 0.8 }; } return; }
        lc.have = false; ball.carry = null;
        if (k === 'pega') { fly(q, me.x + 1.5, me.y, me, true, 'cruz', true); return; } // a linha sai quando você segura
        if (k === 'saimal') { const st = T[1][9] === q ? T[1][10] : T[1][9]; me.tx = me.x + 5; fly(q, st.x, st.y, st, true, 'cruz', false); me.stun = 1.2; return lcDone(); }
        shoot(q, 'chute', 0, k === 'oppfora' ? 'fora' : 'def'); return;
      }
      me.tx = q.x; me.ty = q.y; me.sprint = 1;
      if (k === 'corte') { lc.have = false; const t2 = T[1].filter(x => x !== q && x.r !== 'GK').sort((a, b) => dist(a, me) - dist(b, me))[0] || q; fly(q, (me.x + t2.x) / 2, (me.y + t2.y) / 2, me, false, 'curto', true); return; }
      if (k === 'driblado') { lc.have = false; const [wx, wy] = toW(1, Math.min(qx + 12, 90), tf(1, q)[1]); me.stun = 1.4; ball.carry = { x: wx, y: wy, t: 1.2 }; return lcDone(); }
      if (dist(me, q) < 1.8 || lc.t2 > 1.6) {
        lc.have = false;
        if (k === 'falta') whistle('Falta', q); else setOwner(me);
        lcDone();
      }
    }
    // Saída de bola: cada time no seu campo
    const kicker = s => at(s, 9), kick2 = s => at(s, s ? 10 : 7);
    // Troca (fase de trocas, 2026-11-07): subQ { s, items: [{ p, f, oldNum, newNum }], ph: wait → sai → entra }
    let subQ = null;
    function subApply(quiet) { // quem entra assume a vaga; quiet: no intervalo (vem do túnel), sem placa
      subQ.items.forEach(it => { reform(it.p, it.f); });
      for (let i = leaving.length - 1; i >= 0; i--) if (leaving[i].bench) leaving.splice(i, 1);
      if (quiet) subQ = null;
    }
    function subStart() {
      subQ.ph = 'sai'; subQ.t = 0; subQ.save = { mode, modeT }; mode = 'troca';
      const s = subQ.s, out = [], inn = [];
      subQ.items.forEach((it, i) => { const p = it.p;
        // sai pela linha mais perto (lateral ou de fundo), correndo
        const c = [[p.x, -1.4], [p.x, WD + 1.4], [-1.4, p.y], [L + 1.4, p.y]].sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y) - Math.hypot(b[0] - p.x, b[1] - p.y))[0];
        leaving.push({ p: { x: p.x, y: p.y, side: p.side, r: p.r }, num: it.oldNum, sub: true, run: true, wait: 0, t: 0, tx: c[0], ty: c[1] });
        it.hx = p.x; it.hy = p.y; out.push(it.oldNum); inn.push(it.newNum);
        reform(p, it.f); p.x = 52.5 + (s ? 1 : -1) * (3 + i * 1.8); p.y = WD + 1.1; p.vx = p.vy = 0; p.tx = p.x; p.ty = p.y; p.outT = 99; p.outE = 3; p.subW = 1; });
      for (let i = leaving.length - 1; i >= 0; i--) if (leaving[i].bench) leaving.splice(i, 1);
      Q4.b = { out, in: inn }; Q4.t = 99;
    }
    function subStep(dt) {
      subQ.t += dt; const items = subQ.items;
      ALL.forEach(p => { if (!p.subW) { p.tx = p.x; p.ty = p.y; p.sprint = 0; } });
      if (subQ.ph === 'sai') { items.forEach(it => { it.p.tx = it.p.x; it.p.ty = it.p.y; });
        if (!leaving.some(q => q.sub && q.run) || subQ.t > 7) { subQ.ph = 'entra'; subQ.t = 0; items.forEach(it => { it.p.outT = 4; it.p.outE = 3; }); } }
      else { items.forEach(it => { it.p.tx = it.hx; it.p.ty = it.hy; it.p.sprint = 1; });
        // pela regra o jogo recomeça assim que quem entra pisa no campo (pelo meio); ele termina de chegar com a bola rolando
        if (items.every(it => it.p.y < WD - 3) || subQ.t > 3) {
          items.forEach(it => { it.p.subW = 0; }); mode = subQ.save.mode; modeT = subQ.save.modeT; Q4.t = 1.2; subQ = null; } }
    }
    // Túnel (Silvio, 2026-11-07): no meio da lateral de baixo; no intervalo os times saem por ele e no 2º tempo voltam por ele, em fila
    function tunnel(p) { const i = T[p.side].indexOf(p); return [52.5 + (p.side ? 1.6 : -1.6), WD + 2 + Math.max(0, i) * 1.7]; }
    function koShape(p, s) {
      if (p.r === 'GK') return toW(s, 4, 34);
      let x = Math.min(5 + p.d * 44, 49), y = p.w;
      if (s === koSide && p === kicker(s)) { x = 52; y = 34; }
      else if (s === koSide && p === kick2(s)) { x = 50; y = 39; }
      else if (Math.abs(y - 34) < 12) x = Math.min(x, 42);
      return toW(s, x, y);
    }
    function play(dt) {
      if (lc) { lc.t += dt; if (lc.t > 4.5 || due) lcDone(); }
      // Quem manda no minuto: ter a bola e levar para a frente (com a bola atrás quase empata; sem ela, perde)
      const sd = ball.owner ? ball.owner.side : poss, ax = tf(sd, ball)[0] / L * 100, ctl = cl(55 + (ax - 25) * 0.6, 40, 100);
      acc.x += sd ? 100 - ctl : ctl; acc.n++; pt[sd] += dt;
      // Quem está melhor vem do motor (a bola de flowOf); o resto é o jogo
      momT -= dt; if (momT <= 0) { momT = 4 + rnd() * 5; mom = gauss() * 0.08; }
      const nxt = goals.find(e => !e.done && e.m >= curT - 1 && e.m <= curT + 3);
      let b = (bxT - 50) / 50 * 0.2 + mom;
      if (nxt) b += nxt.side ? -0.22 : 0.22;
      if (HOME >= 0 && curT < HOME_MIN) b += HOME ? -0.12 : 0.12; // a casa empurra no começo
      bias = [1 + cl(b, -0.35, 0.35), 1 - cl(b, -0.35, 0.35)];
      // O minuto do gol chegou: a jogada sai (se o time não tem a bola, rouba a próxima)
      // (começa um pouco antes do minuto dele, para a bola entrar junto com o placar)
      if (!due) {
        const ah = o.spm ? Math.max(2, Math.min(DUE_AHEAD, AHEAD_S / Math.max(0.1, o.spm() * (o.speed ? o.speed() : 1)))) : DUE_AHEAD;
        let e = goals.find(q => !q.done && (q.m <= curT + ah));
        // Lance do Treinador (shot): a jogada só começa quando o time já tem a bola do meio para a frente (até 4 s esperando);
        // antes disso o jogo segue normal, sem todo mundo correndo para a chance
        if (e && e.out && !e.now) { e.w = (e.w || 0) + dt; const ow = ball.owner; if (e.w < 4 && !(ow && ow.side === e.side && ow.r !== 'GK' && tf(e.side, ow)[0] > 45)) e = null; }
        if (e) { due = e; due.t0 = clk; due.asDone = false; due.rx = 86 + rnd() * 5; due.ry = 34 + gauss() * 7; duePick(e); if (ball.owner && ball.owner.side === e.side) { ball.carry = null; ball.hold = Math.min(ball.hold, 0.1); } }
      }
      // O relógio da jogada só anda com a bola rolando (saída depois de outro gol não conta): gol do motor demorando 9 s vira lançamento
      if (due) { due.age = (due.age || 0) + dt; if (due.out === 'gol' || due.out === undefined) { if (due.age > 9 && due.cb) due.now = true; } }
      if (due && ball.owner && ball.owner.side !== due.side && ball.owner.r !== 'GK') {
        const th = T[due.side].filter(q => q.r !== 'GK').sort((a, b2) => dist(a, ball.owner) - dist(b2, ball.owner))[0]; th.lg = Math.max(th.lg, 0.8); th.cd = 0; th.tx = ball.owner.x; th.ty = ball.owner.y; th.sprint = 1; // vai dar o bote (e ganha)
      }
      // Quem vai marcar o gol do motor corre para a área enquanto a jogada sai
      if (due && poss === due.side && due.wing && !due.dl && ball.owner !== due.wing && !(ball.fly && ball.fly.to === due.wing)) { const w = due.wing, ln = Math.max(lineOf(due.side), tf(due.side, ball)[0]); w.run = Math.max(w.run, 0.4); w.runX = Math.min(97, ln - 0.6); w.runY = 34 + due.ws * 25; }
      if (due && poss === due.side) { const sc = scorerOf(due); if (ball.owner !== sc && !(ball.fly && ball.fly.to === sc)) { sc.run = Math.max(sc.run, 0.4); sc.runX = Math.min(due.rx, Math.max(lineOf(due.side), tf(due.side, ball)[0]) - 0.6); sc.runY = due.ry; } } // espera na linha (sem ficar impedido) até o passe sair
      const s = poss, line = lineOf(s), owner = ball.owner;
      runT -= dt;
      if (runT <= 0 && owner && owner.side === s && owner.r !== 'GK') {
        const bx = tf(s, ball)[0]; let ofr = 99; for (const q of T[1 - s]) ofr = Math.min(ofr, dist(q, owner));
        // Gatilho: quem tem a bola de frente e livre no meio é o sinal para a corrida nas costas (sai mais cedo e mais vezes)
        const trig = ofr > 6 && bx > 34 && bx < 82;
        runT = trig ? 0.35 + rnd() * 0.4 : 0.8 + rnd() * 0.9;
        const c = T[s].filter(q => q !== owner && q.d > 0.45 && q.run <= 0 && line - tf(s, q)[0] < 14 && bx > 28);
        if (c.length) {
          const r = s === 0 && ME >= 0 && c.includes(T[0][ME]) && rnd() < 0.5 ? T[0][ME] : c[Math.floor(rnd() * c.length)], qy = tf(s, r)[1];
          // A corrida vai no buraco da linha de defesa mais perto dele (entre dois zagueiros, ou entre o lateral e a lateral do campo)
          const ys = [2].concat(T[1 - s].filter(q => q.r !== 'GK' && line - tf(s, q)[0] < 9).map(q => tf(s, q)[1]).sort((a, b) => a - b), [66]);
          let gy = qy, gd = 1e9; for (let k = 1; k < ys.length; k++) if (ys[k] - ys[k - 1] > 7) { const m = (ys[k] + ys[k - 1]) / 2, d = Math.abs(m - qy); if (d < gd) { gd = d; gy = m; } }
          r.run = 1.5; r.runX = Math.min(95, line + 7 + rnd() * 6); r.runY = cl(gy + gauss() * 2, 6, 62);
          if (dist(r, owner) < 45 && rnd() < 0.65) ball.hold = Math.min(ball.hold, 0.3 + rnd() * 0.25);
        }
      }
      // Desmarque: marcado de perto, dá um pique curto para longe do marcador (para o lado da bola, ou nas costas se é
      // atacante e tem buraco); quem está com a bola pressionado ganha um companheiro que vem dar o apoio no ângulo livre
      if (owner && owner.side === s) {
        let opr = 99; for (const q of T[1 - s]) opr = Math.min(opr, dist(q, owner));
        let sup = null, sd = 99;
        T[s].forEach(p => {
          if (p === owner || p.r === 'GK' || p.run > 0 || p.go > 0 || p.stun > 0) return;
          const db = dist(p, ball); if (db < sd && db > 5) { sd = db; sup = p; }
          let mk = null, md = 99; for (const q of T[1 - s]) { const d = dist(q, p); if (d < md) { md = d; mk = q; } }
          if (md > 3.8 || db > 42 || rnd() > dt * 1.4) return;
          const [px, py] = tf(s, p), [mx, my] = tf(s, mk), [ox, oy] = tf(s, ball);
          if (p.d > 0.6 && px > line - 4 && rnd() < 0.5) { p.run = 1.3; p.runX = Math.min(95, line + 6 + rnd() * 5); p.runY = cl(py + (py - my) * 1.5, 6, 62); return; }
          let ux = (px - mx) + (ox - px) * 0.15, uy = (py - my) + (oy - py) * 0.15;
          // O marcador fica do lado do gol: fugir dele em linha reta é voltar. Meia e atacante saem de lado (ou na diagonal), não para trás
          if (p.d > 0.3) { if (Math.abs(uy) < 0.8) uy = (py < 34 ? 1 : -1) * 1.5; ux = Math.max(ux, -Math.abs(uy) * 0.35); }
          const ul = Math.hypot(ux, uy) || 1;
          p.go = 0.9; p.goX = cl(px + ux / ul * 7.5, 3, p.d > 0.6 ? Math.max(line - 0.8, ox - 2) : 100); p.goY = cl(py + uy / ul * 7.5, 4, 64);
        });
        if (sup && opr < 3.2 && owner.r !== 'GK' && rnd() < dt * 2.5) {
          const [ox, oy] = tf(s, owner), side = oy < 34 ? 1 : -1;
          sup.go = 1; sup.goX = cl(ox - 5, 3, 100); sup.goY = cl(oy + side * 9, 4, 64);
        }
      }
      // Bola no lado, perto da área: os atacantes entram na área (primeiro e segundo pau) esperando o cruzamento
      if (owner && owner.side === s && owner.r !== 'GK') {
        const [obx, oby] = tf(s, ball);
        if (obx > 54 && Math.abs(oby - 34) > 12) T[s].forEach(q => {
          if (q === owner || q.d < 0.6 || q.run > 0 || rnd() > dt * (0.8 + 2.2 * ST[s].wide)) return;
          const far = rnd() < 0.5; q.run = 1.6; q.runX = 88 + rnd() * 7; q.runY = cl(34 + (oby < 34 ? 1 : -1) * (far ? 7 : -4) + gauss() * 2, 22, 46);
        });
      }
      // Ultrapassagem: a ponta segura a bola e o lateral do mesmo lado passa por fora dela (mais nos times que jogam pelos lados)
      // (decide uma vez, quando a ponta recebe; se vai, ela segura um instante esperando o lateral chegar)
      if (owner && owner.side === s && owner.ovChk && !lc) {
        owner.ovChk = false;
        const [obx, oby] = tf(s, ball);
        if (isWide(owner) && !isFB(owner) && obx > 40 && obx < 86 && Math.abs(oby - 34) > 10 && rnd() < 0.15 + 0.65 * ST[s].wide) {
          const sg = oby < 34 ? -1 : 1, fb = T[s].find(q => isFB(q) && (tf(s, q)[1] - 34) * sg > 0 && q.run <= 0 && tf(s, q)[0] < obx + 2 && dist(q, owner) < 40);
          if (fb) { fb.run = 2.2; fb.ovl = 3; fb.runX = Math.min(obx + 12, line - 0.8); fb.runY = 34 + sg * 30.5; ball.hold = Math.max(ball.hold, 0.7); }
        }
      }
      T[s].forEach(p => {
        if (p === owner) return;
        if (p.r === 'GK') { const [bx, by] = tf(s, ball), [x, y] = shapeOf(p, true, bx, by, line); [p.tx, p.ty] = toW(s, x, y); return; }
        p.th -= dt; if (p.th <= 0) { p.th = 0.35 + rnd() * 0.5; [p.tx, p.ty] = findSpace(p, s, line); }
        if (p.run > 0 || p.go > 0) { [p.tx, p.ty] = findSpace(p, s, line); p.sprint = 1; }
      });
      defend(1 - s, dt);
      if (ball.owner) {
        const p = ball.owner, dir = p.side ? -1 : 1; ball.rcv -= dt;
        if (ball.carry) { p.tx = ball.carry.x; p.ty = ball.carry.y; p.sprint = 1; p.drib = 1; ball.carry.t -= dt; if (ball.carry.t <= 0 || Math.hypot(p.x - ball.carry.x, p.y - ball.carry.y) < 1) { ball.carry = null; ball.hold = 0.2 + rnd() * 0.3; } }
        else { let pr = 99; for (const q of T[1 - p.side]) pr = Math.min(pr, dist(q, p)); const adv = p.r === 'GK' ? 0 : pr > 7 ? 3 : pr > 4 ? 1.2 : -0.6; p.tx = p.x + dir * adv; p.ty = p.y + (34 - p.y) * 0.02; ball.hold -= dt; }
        // Condução: toca a bola para a frente e ela vai perdendo para o corpo devagar (dente de serra), nunca anda para trás no campo
        const sp = Math.hypot(p.vx, p.vy), ph = (clk / 0.55 + p.ph) % 1, touch = 0.7 + 1.2 * cl((sp - 1.5) / 4, 0, 1) * (1 - ph);
        // O lado para onde ele olha vira devagar (não troca de lado num passo e a bola não dá meia-volta no pé)
        if (p.bfx === undefined) { p.bfx = dir; p.bfy = 0; }
        if (sp > 1) { const kf = Math.min(1, 5 * dt); p.bfx += (p.vx / sp - p.bfx) * kf; p.bfy += (p.vy / sp - p.bfy) * kf; const fl = Math.hypot(p.bfx, p.bfy) || 1; p.bfx /= fl; p.bfy /= fl; }
        // A bola vai até o pé do dono deslizando (nunca pula: virar o corpo, receber longe ou recomeçar não teleporta a bola)
        { const bxw = p.x + p.bfx * touch, byw = p.y + p.bfy * touch + 0.3, dd = Math.hypot(bxw - ball.x, byw - ball.y), mx = 20 * dt;
          if (dd <= mx) { ball.x = bxw; ball.y = byw; } else { ball.x += (bxw - ball.x) * mx / dd; ball.y += (byw - ball.y) * mx / dd; } }
        // O bote: quem chega perto tenta tirar; se erra, fica para trás um instante (no gol do motor, ninguém tira)
        if (ball.rcv <= 0 && p.r !== 'GK' && !(due && due.side === p.side) && !lc) for (const d of T[1 - p.side]) {
          if (d.cd > 0 || d.stun > 0 || d.r === 'GK' || d.lg <= 0 || dist(d, p) > 1.7) continue;
          d.cd = 1.6 + rnd() * 1.2; d.lg = 0;
          if ((due && due.side === d.side) || rnd() < cl(TK - (bias[p.side] - 1) * 0.8 + (d.q - p.q) * 1.2 + (cpT[d.side] > 0 ? 0.1 : 0) + (Math.abs(p.y - 34) > 24 && ST[d.side].press >= 0.2 ? 0.08 : 0), 0.05, 0.65)) { why = 'bote'; setOwner(d); emit('desarme', d.side, d, p);
            // bote perto da lateral: a bola espirra para fora (lateral para quem perdeu)
            if (!due && !lc && outCd <= 0 && (d.y < 17 || d.y > WD - 17) && rnd() < 0.65) flyOut(d, d.x + gauss() * 4, d.y < 34 ? -2 : WD + 2, false, 'espirra');
            break; }
          d.stun = 0.45;
        }
        if (lc && lc.have && DEF[lc.k] && p === lc.q) defAct(dt);
        else if (ball.owner === p && !ball.carry && ball.hold <= 0) decide(p);
      } else if (ball.fly) {
        const f = ball.fly; f.t += dt / f.dur;
        const u = Math.min(1, f.t), e = f.shot ? u : u * 0.6 + u * (2 - u) * 0.4; // rasteiro: desacelera, mas chega ainda rolando (não para seco e volta)
        ball.x = f.x0 + (f.x1 - f.x0) * e; ball.y = f.y0 + (f.y1 - f.y0) * e + (f.curve || 0) * Math.sin(u * Math.PI);
        if (f.shot) { const gk = T[1 - f.side][0];
          // O goleiro reage (um instante) e mergulha: vai deitado até onde alcança; sem mergulho, só acompanha a bola
          if (f.dive != null && u > 0.18) { const v = Math.min(1, (u - 0.18) / 0.72), e2 = v * (2 - v); gk.x = f.gk0.x + (f.gkx - f.gk0.x) * e2; gk.y = f.gk0.y + (f.dive - f.gk0.y) * e2; gk.tx = gk.x; gk.ty = gk.y; gk.vx = gk.vy = 0;
            if (!gk.down) { gk.dva = Math.sign(f.dive - f.gk0.y) || 1; gk.down = 0.01; } gk.down = Math.max(gk.down, 0.9); gk.stun = Math.max(gk.stun, 0.9); }
          else if (f.dive == null) { gk.ty = cl(f.y1, GL - 1, GR + 1); gk.sprint = 1; }
          if (f.blk && u > 0.55 && !f.blk.down) { f.blk.dva = 0; f.blk.down = 1.1; f.blk.stun = 1.1; } }
        else if (f.to) { f.to.tx = f.x1; f.to.ty = f.y1; f.to.sprint = 1; }
        if (f.t >= 1) { if (f.shot) shotEnd(f); else if (f.out) ballOut(f.from ? f.from.side : lastSide, f.x1, f.y1);
          // passe cortado perto da lateral: o desvio às vezes manda a bola para fora (lateral para quem passou)
          else if (f.cut && f.to && !due && !lc && outCd <= 0 && (f.y1 < 20 || f.y1 > WD - 20) && rnd() < 0.75) { lastSide = f.to.side; flyOut(f.to, f.x1 + (f.x1 - f.x0) * 0.2, f.y1 < 34 ? -2 : WD + 2, false, 'desvio'); ball.fly.from = f.to; }
          else if (f.gkc === 'soco' && f.to && !due && !lc) { const gk = f.to, dg = gk.side ? -1 : 1, rx = cl(gk.x + dg * (16 + rnd() * 10), 2, L - 2), ry = cl(34 + gauss() * 16, 4, WD - 4); emit('soco', gk.side, gk);
            let q = null, qd = 1e9; for (const z of ALL) { if (z.r === 'GK') continue; const dd = Math.hypot(z.x - rx, z.y - ry); if (dd < qd) { qd = dd; q = z; } } why = 'soco'; fly(gk, rx, ry, q, true, 'soco', true); }
          else { ball.fly = null; const k0 = (f.loft ? 0.35 : 0.6) / f.dur; ball.loose = { to: f.to, f, t: 0, vx: (f.x1 - f.x0) * k0, vy: (f.y1 - f.y0) * k0 }; } }
      } else if (ball.loose) {
        const lo = ball.loose, p = lo.to, d = dist(p, ball); lo.t += dt;
        // A bola segue rolando para a frente e perde velocidade no atrito; quem vai receber corre até ela (a bola nunca volta sozinha)
        const v = Math.hypot(lo.vx || 0, lo.vy || 0), nv = Math.max(0, v - 7 * dt), kv = v > 0 ? nv / v : 0;
        lo.vx = (lo.vx || 0) * kv; lo.vy = (lo.vy || 0) * kv;
        ball.x += lo.vx * dt; ball.y += lo.vy * dt;
        if (ball.x < -0.3 || ball.x > L + 0.3 || ball.y < -0.3 || ball.y > WD + 0.3) { if (!due && !lc) return ballOut(lastSide, ball.x, ball.y); ball.x = cl(ball.x, 0.5, L - 0.5); ball.y = cl(ball.y, 0.5, WD - 0.5); lo.vx = lo.vy = 0; }
        p.tx = ball.x + lo.vx * 0.35; p.ty = ball.y + lo.vy * 0.35; p.sprint = 1;
        // Bola parada no chão não fica esperando: quem chega primeiro nela fica com ela (o adversário em cima rouba, salvo
        // no lance do motor), e depois de 2 s quem ia receber domina (ninguém fica parado colado do lado da bola)
        if (d < 1.3 || lo.t > 2) receive(lo.f);
        else if (lo.t > 0.35 && !lc && !(due && due.side === p.side)) { const q = ball.y > 1 && ball.y < WD - 1 && T[1 - p.side].find(x => x.r !== 'GK' && x.stun <= 0 && dist(x, ball) < 1.1); if (q) { ball.loose = null; why = 'solta'; setOwner(q); } }
      } else { why = 'semdono'; setOwner(at(poss, 6)); }
    }
    let back = 0; // voltando para o meio depois do gol (correm de volta)
    let koHold = false; // saída do começo de cada tempo: o relógio da tela espera o apito (todos no lugar)
    function startPlay() { koHold = false; back = 0; mode = 'play'; const k = kicker(koSide); ball.x = 52.5; ball.y = 34; setOwner(k); lastPasser = k; lastPassClk = clk; fly(k, at(koSide, 6).x, at(koSide, 6).y, at(koSide, 6), false, 'curto', false); }
    // A volta para o meio depois do gol passa em velocidade 3× (é o tempo de recomeçar, não um lance)
    function step(dt) { step1(dt); if (back && mode === 'ko') { step1(dt); step1(dt); } }
    function step1(dt) {
      clk += dt;
      if (refFx && (refFx.t -= dt) <= 0) refFx = null;
      if (offLine && (offLine.t -= dt) <= 0) offLine = null;
      for (const t of trail) t.t -= dt; while (trail.length && trail[0].t <= 0) trail.shift();
      if (playTag && (playTag.t -= dt) <= 0) playTag = null;
      if (post && (post.t -= dt) <= 0) post = null;
      ALL.forEach(p => { if (p.reb > 0) p.reb -= dt; if (!p.down && p.dva != null) p.dva = null; });
      for (const p of ALL) if (p.ovl > 0) p.ovl -= dt;
      if (offPend) offStep(dt);
      if (foulPend) foulStep(dt);
      for (let i = leaving.length - 1; i >= 0; i--) { const q = leaving[i]; q.wait -= dt; if (q.wait > 0) continue; q.t += dt;
        if (q.bench) continue;
        if (q.sub) { const dx = q.tx - q.p.x, dy = q.ty - q.p.y, d = Math.hypot(dx, dy), v = Math.min(d, (q.run ? 5.5 : 3.2) * dt); if (d > 0.01) { q.p.x += dx / d * v; q.p.y += dy / d * v; } if (d < 0.5 || q.t > 16) leaving.splice(i, 1); continue; } // a troca sai andando até o meio
        q.p.y += cl(q.ty - q.p.y, -3.6 * dt, 3.6 * dt); if (q.t > 6 || q.p.y < -0.5 || q.p.y > WD + 0.5) leaving.splice(i, 1); }
      if (Q4.t > 0) Q4.t -= dt;
      if (subQ && subQ.ph === 'wait') { subQ.t += dt; const busy = subQ.items.some(it => ball.owner === it.p || (rs && rs.taker === it.p) || foulTo === it.p || (ball.fly && ball.fly.to === it.p) || (ball.loose && ball.loose.to === it.p));
        if ((mode === 'rein' || mode === 'tiro' || mode === 'falta' || mode === 'ko') && !busy || (subQ.t > 15 && mode === 'play' && !busy && !due && !lc)) subStart(); }
      ALL.forEach(p => { if (p.down) p.down = Math.max(0, p.down - dt); });
      offStepRef(dt); if (outCd > 0) outCd -= dt;
      if (mode === 'wait') { ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); }); ball.x = 52.5; ball.y = 34; }
      else if (mode === 'fim') { ALL.forEach(p => { p.tx = p.x + (p.tx - p.x) * 0.9; p.ty = p.y + (p.ty - p.y) * 0.9; p.sprint = 0; }); }
      else if (mode === 'play') play(dt);
      else if (mode === 'troca') subStep(dt);
      else if (mode === 'half') { ALL.forEach(p => { [p.tx, p.ty] = tunnel(p); p.outT = 30; p.outE = 40; }); }
      else if (mode === 'ko') {
        ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        modeT -= dt;
        // Só sai quando todos voltaram para o seu campo e para perto do lugar (depois do gol, a volta é longa)
        const home = ALL.every(p => tf(p.side, p)[0] < 53.5 && Math.hypot(p.tx - p.x, p.ty - p.y) < 2.5);
        if (mode === 'ko' && modeT <= 0 && (home || modeT < -14)) startPlay();
      } else if (mode === 'goal') {
        modeT -= dt;
        const s = hero.side, cx = s ? 5 : 100, cy = hero.y < 34 ? 5 : 63;
        hero.tx = cx; hero.ty = cy; hero.sprint = 1;
        T[s].forEach(p => { if (p !== hero && p.r !== 'GK' && p.d > 0.3) { p.tx = cx + (s ? 3 : -3) * (1 + (p.k % 3)); p.ty = cy + (cy < 34 ? 1 : -1) * (2 + (p.k % 4) * 1.6); } });
        T[1 - s].forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        if (modeT <= 0) { mode = 'ko'; modeT = 0.6; back = 1; }
      } else if (mode === 'falta') {
        // Todos param; a bola rola até o lugar da infração, o cobrador vai até ela (atrás da bola) e quem é do outro
        // time e está em cima recua um pouco. Só recomeça com o cobrador na bola
        modeT -= dt;
        const q = foulTo || at(poss, 6), sp = foulSpot || { x: ball.x, y: ball.y }, dir = q.side ? -1 : 1;
        ALL.forEach(p => {
          if (p === q) return;
          const d = dist(p, sp);
          if (p.side !== q.side && d < 4.5 && p.r !== 'GK') { const a = Math.atan2(p.y - sp.y, p.x - sp.x); p.tx = sp.x + Math.cos(a) * 5; p.ty = sp.y + Math.sin(a) * 5; }
          else { p.tx = p.x; p.ty = p.y; }
        });
        const bd = Math.hypot(sp.x - ball.x, sp.y - ball.y), kb = bd > 0.01 ? Math.min(bd * dt * 4, 16 * dt) / bd : 0; ball.x += (sp.x - ball.x) * kb; ball.y += (sp.y - ball.y) * kb;
        q.tx = cl(sp.x - dir * 0.9, 0.5, L - 0.5); q.ty = sp.y; q.sprint = dist(q, sp) > 3 ? 1 : 0;
        if (modeT <= 0 && (dist(q, sp) < 1.6 || modeT < -3)) { mode = 'play'; stopWhy = ''; foulTo = foulSpot = null; if (q.side !== poss) ALL.forEach(x => { x.th = 0; }); setOwner(q); }
      } else if (mode === 'rein') { reinStep(dt);
      } else if (mode === 'tiro') {
        modeT -= dt; const s = poss, gk = T[s][0], [sx, sy] = toW(s, 5.5, 34);
        gk.tx = sx; gk.ty = sy;
        ball.x += (sx - ball.x) * Math.min(1, dt * 2.5); ball.y += (sy - ball.y) * Math.min(1, dt * 2.5);
        T[s].forEach(p => { if (p !== gk) { const [x, y] = shapeOf(p, true, 6, 34, lineOf(s)); [p.tx, p.ty] = toW(s, x, y); } });
        T[1 - s].forEach(p => { if (p.r !== 'GK') { const [x, y] = shapeOf(p, false, L - 6, 34, 0); [p.tx, p.ty] = toW(1 - s, x, y); } });
        if (modeT <= 0 || (due && due.side === s && modeT < 0.6)) { mode = 'play'; setOwner(gk); } // a bola rola até o goleiro (sem pular para a marca)
      }
      if (lc && mode !== 'play') lcDone();
      // Impedimento a caminho: a zaga sobe junta para deixar o atacante impedido e ele segue em frente (depois do play, que
      // não desfaz os alvos); o passe sai em offStep quando ele já está além da linha
      if (offPend && !offPend.f && mode === 'play') {
        const P = offPend, s = P.s, q = P.q, [, qy] = tf(s, q), l0 = P.l0 = P.l0 || lineOf(s);
        T[1 - s].forEach(d => { if (d.r === 'GK') return; const [dx, dy] = tf(s, d); if (dx > l0 - 2) { [d.tx, d.ty] = toW(s, Math.max(L / 2, l0 - 2), dy); d.sprint = 1; } });
        [q.tx, q.ty] = toW(s, Math.min(L - 6, l0 + 2.5), qy); q.sprint = 1;
      }
      if (mode === 'ko' || mode === 'half') { const dd = Math.hypot(52.5 - ball.x, 34 - ball.y), k = dd > 0.01 ? Math.min(1, 16 * dt / dd) : 1; ball.x += (52.5 - ball.x) * k; ball.y += (34 - ball.y) * k; } // volta ao meio rolando, não voando
      // Andar: cada um reage no seu tempo, acelera e freia; ninguém vira na hora nem atravessa o companheiro
      ALL.forEach(p => {
        p.lg = Math.max(0, (p.lg || 0) - dt); p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, p.stun - dt); p.run = Math.max(0, p.run - dt); p.go = Math.max(0, p.go - dt);
        p.rt -= dt;
        if (p.sprint || p.rt <= 0 || mode !== 'play') {
          const dr = mode === 'play' && !p.sprint ? 0.5 : 0;
          p.gx = p.tx + Math.sin(clk * 0.7 + p.ph) * dr; p.gy = p.ty + Math.cos(clk * 0.55 + p.ph * 1.3) * dr;
          if (p.rt <= 0) p.rt = 0.15 + rnd() * 0.3;
        }
        let gx = p.gx, gy = p.gy;
        // Espaço pessoal do tamanho do desenho: ninguém entra no boneco do outro (só quem dá o bote e quem tem a bola, no duelo).
        // Olha meio segundo à frente: se o caminho vai cruzar alguém, desvia antes de encostar
        if (mode === 'play') {
          const own = ball.owner, lo = ball.loose, ahead = 0.5, fx = p.x + p.vx * ahead, fy = p.y + p.vy * ahead;
          for (const q of ALL) {
            if (q === p) continue;
            const duel = ((p.lg > 0 || q.lg > 0) && (p === own || q === own)) || (lo && lo.to === p && dist(p, ball) < 6); // quem vai na bola solta não desvia
            const mn = duel ? 0 : q.side === p.side ? 5.2 : p.mark === q || q.mark === p ? 2.3 : (p === own || q === own) ? 2.8 : 3.6; // marcação colada: corpo a corpo (os bonecos de 0,65 se tocam a ~2,1 m)
            if (!mn) continue;
            const d = dist(p, q);
            if (d < mn && d > 0.01) { gx += (p.x - q.x) / d * (mn - d) * 2.6; gy += (p.y - q.y) / d * (mn - d) * 2.6; continue; }
            const qx = q.x + q.vx * ahead, qy = q.y + q.vy * ahead, df = Math.hypot(fx - qx, fy - qy);
            if (df < mn * 0.9 && d < 9) { const sx = -(p.vy), sy = p.vx, sm = Math.hypot(sx, sy) || 1, side = ((q.x - p.x) * sx + (q.y - p.y) * sy) > 0 ? -1 : 1; gx += sx / sm * side * (mn - df) * 0.8; gy += sy / sm * side * (mn - df) * 0.8; }
          }
        }
        const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
        const top = (p.stun > 0 ? 2.2 : p.drib ? 6.6 : p.sprint ? 8.2 : mode === 'play' ? (d > 12 ? 7.4 : d > 6 ? 6.2 : 5) : back && d > 4 ? 8.6 : 5.6) * p.spd * (isMe(p) && en !== null && en < 30 ? 0.86 : 1);
        const want = d > 0.05 ? Math.min(top, d * 1.8) : 0, wx = d > 0.05 ? dx / d * want : 0, wy = d > 0.05 ? dy / d * want : 0, acc = (p.sprint ? 20 : 12) * dt;
        let ax = wx - p.vx, ay = wy - p.vy; const am = Math.hypot(ax, ay);
        if (am > acc) { ax *= acc / am; ay *= acc / am; }
        p.vx += ax; p.vy += ay;
        { if (p.outT > 0 && (p.outT -= dt) <= 0) p.outE = 0; const e = p.outT > 0 && p.outE ? -p.outE : (mode === 'rein' && rs && p === rs.taker) || p.outT > 0 ? -1.2 : 0.5; p.x = cl(p.x + p.vx * dt, e, L - e); p.y = cl(p.y + p.vy * dt, e, WD - e); }
        const sp = Math.hypot(p.vx, p.vy);
        let fx = sp > 1.5 ? p.vx / sp : ball.x - p.x, fy = sp > 1.5 ? p.vy / sp : ball.y - p.y; const fm = Math.hypot(fx, fy) || 1;
        p.fx += (fx / fm - p.fx) * Math.min(1, dt * 8); p.fy += (fy / fm - p.fy) * Math.min(1, dt * 8);
        p.sprint = 0; p.drib = 0;
      });
    }

    // ---------- desenho (o gramado listrado vem do CSS) ----------
    const PAD = 14; // folga fora das linhas: os bandeirinhas correm ali
    // Fora de casa o seu time fica à direita (como no placar) e ataca para a esquerda: só o desenho espelha
    // No 2º tempo os times trocam de lado: o desenho espelha de novo
    let half2 = o.half2 !== undefined ? !!o.half2 : (o.t0 || 0) >= 45; // o Treinador diz (o t0 dele conta os acréscimos)
    const mir = () => !!o.flip !== half2;
    const X = x => PAD + (mir() ? L - x : x) / L * (W - 2 * PAD), Y = y => PAD + y / WD * (H - 2 * PAD);
    function size() {
      if (!cv) return;
      const r = cv.getBoundingClientRect(), z = U.zk ? U.zk() : 1;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width / z); H = Math.max(1, r.height / z);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    function lines() {
      // As linhas são simétricas: desenha sem espelhar (espelhado, as larguras sairiam negativas)
      const XL = x => PAD + x / L * (W - 2 * PAD);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
      g.strokeRect(XL(0), Y(0), XL(L) - XL(0), Y(WD) - Y(0));
      g.beginPath(); g.moveTo(XL(52.5), Y(0)); g.lineTo(XL(52.5), Y(WD)); g.stroke();
      g.beginPath(); g.ellipse(XL(52.5), Y(34), XL(9.15) - XL(0), Y(9.15) - Y(0), 0, 0, Math.PI * 2); g.stroke();
      const bw = XL(16.5) - XL(0), sw = XL(5.5) - XL(0);
      g.strokeRect(XL(0), Y(13.85), bw, Y(54.15) - Y(13.85)); g.strokeRect(XL(L) - bw, Y(13.85), bw, Y(54.15) - Y(13.85));
      g.strokeRect(XL(0), Y(24.85), sw, Y(43.15) - Y(24.85)); g.strokeRect(XL(L) - sw, Y(24.85), sw, Y(43.15) - Y(24.85));
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(XL(0) - 4, Y(GL), 4, Y(GR) - Y(GL)); g.fillRect(XL(L), Y(GL), 4, Y(GR) - Y(GL));
      // Marca do pênalti, arco da área (a 9,15 m da marca, só a parte fora da área), quartos de círculo e bandeirinhas de escanteio
      const rx = XL(9.15) - XL(0), ry = Y(9.15) - Y(0), a0 = Math.acos(5.5 / 9.15);
      g.fillStyle = 'rgba(255,255,255,.6)'; [11, L - 11].forEach(x => { g.beginPath(); g.arc(XL(x), Y(34), 1.6, 0, Math.PI * 2); g.fill(); });
      g.beginPath(); g.ellipse(XL(11), Y(34), rx, ry, 0, -a0, a0); g.stroke();
      g.beginPath(); g.ellipse(XL(L - 11), Y(34), rx, ry, 0, Math.PI - a0, Math.PI + a0); g.stroke();
      const cr = XL(1) - XL(0);
      [[0, 0, 0], [L, 0, 0.5], [L, WD, 1], [0, WD, 1.5]].forEach(([x, y, a]) => {
        g.beginPath(); g.arc(XL(x), Y(y), cr * 1.6, a * Math.PI, (a + 0.5) * Math.PI); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(XL(x), Y(y)); g.lineTo(XL(x), Y(y) - 7); g.stroke();
        g.fillStyle = '#F2C230'; g.beginPath(); g.moveTo(XL(x), Y(y) - 7); g.lineTo(XL(x) + (x ? -5 : 5), Y(y) - 5.5); g.lineTo(XL(x), Y(y) - 4); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; });
    }
    // Boneco: camisa com o número (na cor do calção, para ler em qualquer uniforme) e o anel de energia em volta, que esvazia
    // e passa de verde a amarelo e vermelho; você continua maior, dourado, com VOCÊ e o seu marcador de energia embaixo
    function dot(p, k) {
      const x = X(p.x), y = Y(p.y), me = isMe(p), r = (me ? 11 : 9.6) * k;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 2.5, r + 1.5 * k, (r + 1.5 * k) * 0.6, 0, 0, Math.PI * 2); g.fill();
      if (me) { g.fillStyle = 'rgba(242,194,48,.35)'; g.beginPath(); g.arc(x, y, r + 5.5 * k, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = p.stun > 0 ? 0.65 : 1;
      const kt = p.r === 'GK' ? [KT.gk[p.side], '#1D1D1F'] : p.side ? KT.opp : KT.mine, shirt = me ? '#F2C230' : kt[0];
      const edge = me ? '#0F3D2A' : cdist(kt[1], kt[0]) > 120 ? kt[1] : lum(kt[0]) > 0.55 ? '#1D1D1F' : '#F4F1E8';
      if (!me && !p.down) {
        const e = enOf(p), rr = r + 2.6 * k, col = e > 55 ? '#7BE3A0' : e >= 30 ? '#F2C230' : '#FF6B6B';
        g.lineWidth = 2.4 * k; g.strokeStyle = 'rgba(7,17,12,.55)'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = col; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, e / 100)); g.stroke(); g.lineCap = 'butt';
      }
      g.fillStyle = shirt; g.strokeStyle = edge; g.lineWidth = 1.6 * k;
      g.beginPath(); if (p.down) g.ellipse(x, y, r * (p.dva != null ? 1.5 : 1.2), r * 0.62, p.dva != null ? (p.dva ? Math.PI / 2 : 0) : 0.5, 0, Math.PI * 2); else g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (!me && p.r !== 'GK' && kt.pat) shirtPat(x, y, r, kt.pat, p.down, kt[0]);
      g.stroke();
      // Bico: para onde ele olha (corre ou vira para a bola), na borda do disco
      if (!p.down) { const fx = mir() ? -p.fx : p.fx, fy = p.fy, fm = Math.hypot(fx, fy) || 1, ux = fx / fm, uy = fy / fm, a = r + 3.6 * k, b = r - 0.6 * k, w = 2.6 * k;
        g.fillStyle = me ? '#F2C230' : '#FBF8EF'; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 0.9 * k;
        g.beginPath(); g.moveTo(x + ux * a, y + uy * a); g.lineTo(x + ux * b - uy * w, y + uy * b + ux * w); g.lineTo(x + ux * b + uy * w, y + uy * b - ux * w); g.closePath(); g.fill(); g.stroke(); }
      // Número sempre em branco ou preto (o que tiver mais contraste com a camisa) e com contorno: lê em qualquer uniforme
      const num = String(p.num || ''), dark = me || lum(shirt) > 0.5, txt = dark ? '#0B120E' : '#FFFFFF';
      g.font = '800 ' + Math.round((me ? 14 : num.length > 1 ? 12.5 : 14) * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 2.6 * k; g.strokeStyle = dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.8)'; g.strokeText(num, x, y + 0.8 * k);
      g.fillStyle = txt; g.fillText(num, x, y + 0.8 * k);
      g.globalAlpha = 1;
      // Amarelado (Treinador: inf.yc diz quem tem amarelo neste jogo): cartãozinho no ombro, depois que o juiz mostrou
      if (p.inf && p.inf.yc && p.inf.yc() && !(refFx && refFx.p === p) && !(foulPend && foulPend.o.num === p.num && foulPend.o.side === p.side)) card(x + r * 0.95, y - r * 0.15, '#F2C230', k * 0.62, 0.2);
      if (!me) return;
      const kb = cl(W / 380, 0.85, 1.45), tw = 36 * kb, ty = cl(y - r - 19 * kb, 2, H - 14 * kb);
      g.fillStyle = '#F2C230'; g.beginPath(); g.roundRect(x - tw / 2, ty, tw, 13 * kb, 4 * kb); g.fill();
      g.fillStyle = '#13201A'; g.font = '800 ' + Math.round(10.5 * kb) + 'px "Barlow Condensed", sans-serif'; g.fillText('VOCÊ', x, ty + 7 * kb);
      if (en !== null) energy(x, y + r + 4 * kb, kb);
    }
    // Desenho da camisa dentro do disco (fixo na tela, como um escudo): listras verticais, aros, faixa diagonal, faixa no peito,
    // metade e metade ou xadrez, na segunda cor do clube
    function shirtPat(x, y, r, pat, down, base) {
      const [kind, c2] = pat; g.save(); g.beginPath(); if (down) g.ellipse(x, y, r * 1.2, r * 0.62, 0.5, 0, Math.PI * 2); else g.arc(x, y, r, 0, Math.PI * 2); g.clip(); g.fillStyle = c2;
      const R = r * 1.25;
      if (kind === 'listras') for (let i = -2; i <= 2; i++) g.fillRect(x + i * r * 0.62 - r * 0.15, y - R, r * 0.3, 2 * R);
      else if (kind === 'aros') for (let i = -2; i <= 2; i++) g.fillRect(x - R, y + i * r * 0.62 - r * 0.15, 2 * R, r * 0.3);
      else if (kind === 'faixa') { g.beginPath(); g.moveTo(x - R, y - R * 0.55); g.lineTo(x - R * 0.55, y - R); g.lineTo(x + R, y + R * 0.55); g.lineTo(x + R * 0.55, y + R); g.closePath(); g.fill(); }
      else if (kind === 'faixah') g.fillRect(x - R, y - r * 0.26, 2 * R, r * 0.52);
      else if (kind === 'meio') g.fillRect(x, y - R, R, 2 * R);
      else if (kind === 'xadrez') { const q = r * 0.5; for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) if ((i + j) & 1) g.fillRect(x + i * q, y + j * q, q, q); }
      // listras e xadrez enchem o disco: o número ganha um fundo liso na cor da camisa para continuar lendo
      if (base && (kind === 'listras' || kind === 'xadrez')) { g.fillStyle = base; g.beginPath(); g.arc(x, y, r * 0.52, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    // Toque num boneco: um cartão com número e nome (ou a posição), e a energia; some sozinho
    const POSN = { GK: 'Goleiro', LB: 'Lateral', RB: 'Lateral', CB: 'Zagueiro', DM: 'Volante', CM: 'Meia', LM: 'Meia', RM: 'Meia', LW: 'Ponta', RW: 'Ponta', ST: 'Atacante' };
    function tipCard(k) {
      const p = tip.p, age = (Date.now() - tip.at) / 1000; if (ALL.indexOf(p) < 0 || age > 2.4) { tip = null; return; }
      const x = X(p.x), y = Y(p.y), e = Math.round(enOf(p));
      const l1 = p.num + ' · ' + (isMe(p) ? (o.meName || 'Você') : p.inf && p.inf.nm ? p.inf.nm : POSN[p.r] || p.r), l2 = 'Energia ' + e + '%' + (e < 30 ? ' · cansado' : '');
      g.font = '800 ' + Math.round(12 * k) + 'px Inter, sans-serif'; const w1 = g.measureText(l1).width; g.font = '600 ' + Math.round(11 * k) + 'px Inter, sans-serif'; const w2 = g.measureText(l2).width;
      const w = Math.max(w1, w2) + 16 * k, h = 36 * k, bx = cl(x - w / 2, 4, W - w - 4), by = y - 14 * k - h > 4 ? y - 14 * k - h : y + 14 * k;
      g.globalAlpha = Math.min(1, (2.4 - age) * 4, age * 8 + 0.2);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.roundRect(bx + 1, by + 2, w, h, 7 * k); g.fill();
      g.fillStyle = '#F4F1E8'; g.beginPath(); g.roundRect(bx, by, w, h, 7 * k); g.fill();
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = '#13201A'; g.font = '800 ' + Math.round(12 * k) + 'px Inter, sans-serif'; g.fillText(l1, bx + 8 * k, by + 12 * k);
      g.fillStyle = e > 55 ? '#1E7A45' : e >= 30 ? '#8A6400' : '#B83A2E'; g.font = '600 ' + Math.round(11 * k) + 'px Inter, sans-serif'; g.fillText(l2, bx + 8 * k, by + 26 * k);
      g.textAlign = 'center'; g.globalAlpha = 1;
    }
    function onTap(ev) {
      if (!cv) return;
      const rc = cv.getBoundingClientRect(), z = U.zk ? U.zk() : 1, px = (ev.clientX - rc.left) / z, py = (ev.clientY - rc.top) / z;
      let best = null, bd = 22; ALL.forEach(p => { const d = Math.hypot(X(p.x) - px, Y(p.y) - py); if (d < bd) { bd = d; best = p; } });
      tip = best ? { p: best, at: Date.now() } : null;
      if (best && o.onPick) o.onPick(best.side, best.inf, best.k); // a tela abre o jogador tocado (Treinador deitado)
      if (frozen) draw();
    }
    // Marcador de energia embaixo de você: raio, barra e número; muda de cor quando cansa
    function energy(cx, top, k) {
      const w = 62 * k, h = 15 * k, x0 = cl(cx - w / 2, 2, W - w - 2), y0 = Math.min(top, H - h - 2), v = Math.round(en);
      const col = v > 55 ? '#7BE3A0' : v >= 30 ? '#F2C230' : '#FF6B6B';
      g.fillStyle = 'rgba(7,17,12,.88)'; g.beginPath(); g.roundRect(x0, y0, w, h, 5 * k); g.fill();
      const bx = x0 + 4 * k, by = y0 + 2 * k, s = k * 0.6;
      g.fillStyle = col; g.beginPath();
      g.moveTo(bx + 8 * s, by); g.lineTo(bx + 1 * s, by + 10 * s); g.lineTo(bx + 6 * s, by + 10 * s); g.lineTo(bx + 3 * s, by + 18 * s); g.lineTo(bx + 11 * s, by + 7 * s); g.lineTo(bx + 6 * s, by + 7 * s); g.closePath(); g.fill();
      const bw = 30 * k, bxx = x0 + 13 * k, byy = y0 + h / 2 - 2.5 * k;
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(bxx, byy, bw, 5 * k, 2.5 * k); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(bxx, byy, Math.max(3, bw * v / 100), 5 * k, 2.5 * k); g.fill();
      g.font = '800 ' + Math.round(11 * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(v), x0 + w - 4 * k, y0 + h / 2 + 0.5);
      g.textAlign = 'center';
    }
    // Cartão: retângulo inclinado com sombra (w×h ~ 11×15 px)
    function card(x, y, col, k, rot) {
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-5.5 * k + 1.5, -15 * k + 2.5, 11 * k, 15 * k);
      g.fillStyle = col; g.strokeStyle = '#13201A'; g.lineWidth = 1.4 * k; g.beginPath(); g.roundRect(-5.5 * k, -15 * k, 11 * k, 15 * k, 2 * k); g.fill(); g.stroke();
      g.restore();
    }
    // Arbitragem: o juiz anda na diagonal perto da bola e os bandeirinhas ficam em laterais opostas, cada um só na sua
    // metade, a que fica à direita dele olhando o campo (de cima: a metade esquerda da tela; de baixo: a direita), na altura do penúltimo defensor (ou da bola, se ela passou)
    // Uniforme: amarelo ou preto, o que mais se diferencia das camisas dos dois times e dos goleiros
    const REFC = (() => { const sh = [KT.mine[0], KT.opp[0], KT.gk[0], KT.gk[1]], sc = c => Math.min(...sh.map(x => cdist(c, x))); return sc('#F5D90A') >= sc('#161616') ? ['#F5D90A', '#161616'] : ['#161616', '#F5D90A']; })();
    const REF = { x: 52.5, y: 40, vx: 0, vy: 0, sig: null, sigT: 0 }, AR = [{ x: 52.5, y: -1.3, top: true, flag: 0 }, { x: 52.5, y: WD + 1.3, top: false, flag: 0 }];
    // Cada bandeirinha cuida da metade à direita dele olhando o campo: na tela, o de cima fica na esquerda e o de baixo na
    // direita. O campo vira de lado (mir) a cada tempo, então a metade do mundo de cada um troca junto (wl = metade esquerda do mundo)
    const wl = a => a.top !== mir(), arFor = x => AR.find(a => wl(a) === (x <= L / 2));
    function offStepRef(dt) {
      const bx = ball.x, by = ball.y, arTop = arFor(bx).top;
      // O juiz acompanha de longe, na diagonal: uns 13 m para o lado oposto ao bandeirinha que trabalha e um pouco atrás da
      // jogada, sempre a 10 m ou mais da bola; não entra na grande área (para na linha dela) e só corre quando o lance se
      // afasta (Silvio, 2026-11-06: não fica em cima da bola nem vai até o goleiro)
      const fw = (poss === 0 ? 1 : -1) * (mode === 'play' ? -3 : 0);
      let tx = cl(bx + fw, 18, L - 18), ty = cl(by + (arTop ? 13 : -13), 4, WD - 4);
      { const dx = tx - bx, dy = ty - by, db = Math.hypot(dx, dy) || 1; if (db < 10) { tx = bx + dx / db * 10; ty = by + dy / db * 10; } }
      const inBox = (x, y) => (x < 17.5 || x > L - 17.5) && Math.abs(y - 34) < 21.2;
      if (inBox(tx, ty)) tx = tx < L / 2 ? 18.5 : L - 18.5;
      tx = cl(tx, 18.5 - (Math.abs(ty - 34) < 21.2 ? 0 : 14), L - 18.5 + (Math.abs(ty - 34) < 21.2 ? 0 : 14)); ty = cl(ty, 3, WD - 3);
      const d = Math.hypot(tx - REF.x, ty - REF.y), v = d < 5 ? 0 : Math.min(d - 5, Math.min(6.2, 0.6 * d) * dt);
      if (v > 0) { REF.x += (tx - REF.x) / d * v; REF.y += (ty - REF.y) / d * v; }
      for (const p of ALL) { const dd = dist(p, REF); if (dd < 2.2 && dd > 0.01) { REF.x += (REF.x - p.x) / dd * (2.2 - dd) * 0.5; REF.y += (REF.y - p.y) / dd * (2.2 - dd) * 0.5; } }
      if (inBox(REF.x, REF.y)) REF.x = REF.x < L / 2 ? 17.5 : L - 17.5;
      // bandeirinhas: penúltimo defensor de quem defende aquele gol (lado 1 defende o gol da direita, lado 0 o da esquerda)
      const pen = (s, sign) => { const xs = T[s].map(p => p.x).sort((a, b) => sign * (b - a)); return xs.length > 1 ? xs[1] : L / 2; };
      AR.forEach(a => {
        a.wl = wl(a);
        const tx2 = a.wl ? cl(Math.min(pen(0, -1), bx), 0, L / 2) : cl(Math.max(pen(1, 1), bx), L / 2, L), d2 = tx2 - a.x;
        a.x += Math.sign(d2) * Math.min(Math.abs(d2), 7 * dt);
        if (a.flag > 0) a.flag = Math.max(0, a.flag - dt);
      });
      if (REF.sigT > 0 && (REF.sigT -= dt) <= 0) REF.sig = null;
    }
    // Boneco da arbitragem: menor que os jogadores, sem número, com a cor do uniforme; o bandeirinha segura a bandeira
    function official(x, y, k, flag, flagDir, vy, small) {
      vy = vy || -1; // para onde a bandeira levantada aponta: para dentro do campo (o bandeirinha de cima levanta para baixo na tela)
      const r = 9.6 * k * (flag === undefined && !small ? 1 : 0.8); // o juiz do tamanho dos jogadores; bandeirinhas e quarto árbitro um pouco menores
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 2, r + 1, (r + 1) * 0.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = REFC[0]; g.strokeStyle = REFC[1]; g.lineWidth = 1.6 * k; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      if (flag === undefined) return;
      // bandeira: abaixada (junto ao corpo), levantada (impedimento) ou apontando (lateral, escanteio, tiro de meta)
      const fx = flag === 'up' ? x : x + flagDir * 12 * k, fy = flag === 'up' ? y + vy * 17 * k : flag === 'point' ? y - 5 * k : y + 3 * k, bx2 = flag === 'down' ? x + 4 * k : x;
      g.strokeStyle = '#FBF8EF'; g.lineWidth = 1.8 * k; g.beginPath(); g.moveTo(bx2, y); g.lineTo(flag === 'down' ? x + 5 * k : fx, flag === 'down' ? y + 7 * k : fy); g.stroke();
      if (flag === 'down') return;
      const w = 10 * k, h = 7 * k, ox = flag === 'up' ? fx : fx - (flagDir < 0 ? w : 0), oy = fy - (flag === 'up' ? (vy > 0 ? h : 0) : h / 2);
      g.fillStyle = '#F2C230'; g.fillRect(ox, oy, w / 2, h / 2); g.fillRect(ox + w / 2, oy + h / 2, w / 2, h / 2); g.fillStyle = '#D8404A'; g.fillRect(ox + w / 2, oy, w / 2, h / 2); g.fillRect(ox, oy + h / 2, w / 2, h / 2);
    }
    // Quarto árbitro: no meio da lateral de baixo; com a placa luminosa levantada (acréscimos +N, ou troca: sai em
    // vermelho, entra em verde) por alguns segundos
    const Q4 = { b: null, t: 0 };
    function drawQ4(k) {
      const x = X(52.5), y = Y(WD) + 6 * k;
      official(x, y, Math.max(k * DOTK, 0.75), undefined, 0, 0, true);
      if (!(Q4.t > 0) || !Q4.b) return;
      const b = Q4.b, parts = b.add ? [['+' + b.add, '#FFE14D']] : [[(b.out || []).join(' '), '#FF5C5C'], ['⇄', '#8A8A8A'], [(b.in || []).join(' '), '#5CFF8A']];
      g.font = '800 ' + Math.round(15 * k) + 'px "Barlow Condensed", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      const ws = parts.map(q => g.measureText(q[0]).width), gap = 5 * k, w = ws.reduce((a, c) => a + c, 0) + gap * (parts.length - 1) + 12 * k, h = 20 * k;
      const bx = cl(x - w / 2, 2, W - w - 2), by = y - 13 * k - h - (o.boardUp || 0); // boardUp: a tela tem algo por cima da lateral de baixo (deitado: a narração)
      g.strokeStyle = '#9A9A9A'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(x + 3 * k, y - 4 * k); g.lineTo(x + 3 * k, by + h); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx + 1.5, by + 2.5, w, h);
      g.fillStyle = '#111'; g.strokeStyle = '#3A3A3A'; g.lineWidth = 1.5 * k; g.beginPath(); g.roundRect(bx, by, w, h, 4 * k); g.fill(); g.stroke();
      let cx = bx + 6 * k; parts.forEach((q, i) => { g.shadowColor = q[1]; g.shadowBlur = 6 * k; g.fillStyle = q[1]; g.fillText(q[0], cx, by + h / 2 + 0.5); cx += ws[i] + gap; }); g.shadowBlur = 0;
    }
    function drawRefs(k) {
      AR.forEach(a => { const up = !a.sig && a.flag > 0; if (up) { g.strokeStyle = 'rgba(216,64,74,.85)'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(X(a.x), Y(a.y), 10 * k, 0, Math.PI * 2); g.stroke(); } official(X(a.x), Y(a.y), k, a.sig || (up ? 'up' : 'down'), (a.dir || 1) * (mir() ? -1 : 1), a.top ? 1 : -1); });
      official(X(REF.x), Y(REF.y), k);
      if (REF.sig) { const x = X(REF.x), y = Y(REF.y); g.strokeStyle = REFC[0]; g.lineWidth = 2.2 * k; g.lineCap = 'round'; g.beginPath();
        if (REF.sig === 'braco') { g.moveTo(x, y); g.lineTo(x + (REF.dir || 1) * 11 * k, y - 7 * k); }
        else if (REF.sig === 'alto') { g.moveTo(x, y); g.lineTo(x, y - 13 * k); }
        g.stroke(); g.lineCap = 'butt'; }
    }
    let vig = null;
    function draw() {
      if (!g || W < 60 || H < 40) return; // tela ainda sem tamanho (palco recém-aberto): o laço mede de novo
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      // Luz de estádio: o meio do gramado mais claro e os cantos mais escuros (o gramado listrado vem do CSS)
      if (!vig || vig.w !== W || vig.h !== H) { vig = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.56); vig.addColorStop(0, 'rgba(255,255,240,.05)'); vig.addColorStop(1, 'rgba(0,0,0,.26)'); vig.w = W; vig.h = H; }
      g.fillStyle = vig; g.fillRect(0, 0, W, H);
      lines();
      // Bonecos, bola e árbitros em 65% (Silvio, 2026-11-06: o campo respirando vale mais que o número grande); placa, etiqueta,
      // o VOCÊ e o cartão do toque ficam no tamanho cheio (k0)
      const k0 = cl(W / 380, 0.85, 1.45), k = Math.max(k0 * DOTK, 0.75); // campinho pequeno (em pé) não encolhe tanto
      if (ball.fly) { g.strokeStyle = ball.fly.shot ? 'rgba(242,194,48,.8)' : 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * k; g.setLineDash([4 * k, 4 * k]); g.beginPath(); g.moveTo(X(ball.fly.x0), Y(ball.fly.y0)); g.lineTo(X(ball.x), Y(ball.y)); g.stroke(); g.setLineDash([]); }
      // Duelo: quem tem a bola e quem vem no bote ganham um anel pontilhado em volta dos dois (um duelo por vez)
      // o.clean (Treinador deitado, Silvio 2026-11-07): campo limpo, sem anel do duelo nem nome da jogada; fica o rastro do passe
      if (!o.clean && mode === 'play' && ball.owner) { const o2 = ball.owner, d2 = T[1 - o2.side].find(q => q.lg > 0 && dist(q, o2) < 5);
        if (d2) { const mx = X((o2.x + d2.x) / 2), my = Y((o2.y + d2.y) / 2), rr = Math.hypot(X(o2.x) - X(d2.x), Y(o2.y) - Y(d2.y)) / 2 + 13 * k;
          g.strokeStyle = 'rgba(242,194,48,.85)'; g.lineWidth = 1.6 * k; g.setLineDash([3 * k, 3 * k]); g.beginPath(); g.arc(mx, my, rr, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); } }
      // Rastro: os últimos passes da posse no gramado (o mais antigo some primeiro)
      g.lineCap = 'round';
      trail.forEach((t, i) => { const a = Math.min(1, t.t / 1.2) * (0.3 + 0.55 * (i + 1) / trail.length); g.strokeStyle = g.fillStyle = 'rgba(242,194,48,' + a.toFixed(2) + ')'; g.lineWidth = 2.4 * k;
        g.beginPath(); g.moveTo(X(t.x0), Y(t.y0)); g.lineTo(X(t.x1), Y(t.y1)); g.stroke(); g.beginPath(); g.arc(X(t.x0), Y(t.y0), 2.2 * k, 0, Math.PI * 2); g.fill(); });
      g.lineCap = 'butt';
      ALL.forEach(p => { if (!isMe(p)) dot(p, k); });
      if (ME >= 0) dot(T[0][ME], k);
      if (post) { const u = 1 - post.t / 0.5; g.strokeStyle = 'rgba(255,225,77,' + (1 - u).toFixed(2) + ')'; g.lineWidth = 2.5 * k0; g.beginPath(); g.arc(X(post.x), Y(post.y), (4 + u * 14) * k0, 0, Math.PI * 2); g.stroke(); } // a trave treme
      drawRefs(k); drawQ4(k0);
      if (playTag && !o.clean && mode === 'play') { const p = playTag.p, x = X(p.x), y = Y(p.y) - 14 * k0, al = Math.min(1, playTag.t * 3, (1.8 - playTag.t) * 6);
        g.globalAlpha = Math.max(0, al); g.font = '800 ' + Math.round(12.5 * k0) + 'px "Barlow Condensed", sans-serif'; const w = g.measureText(playTag.txt).width + 12 * k0, h = 17 * k0, x0 = cl(x - w / 2, 2, W - w - 2), y0 = Math.max(2, y - h / 2);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + 1.5, y0 + 2, w, h); g.fillStyle = '#F2C230'; g.beginPath(); g.roundRect(x0, y0, w, h, 5 * k0); g.fill();
        g.fillStyle = '#13201A'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(playTag.txt, x0 + w / 2, y0 + h / 2 + 0.5); g.globalAlpha = 1; }
      // Quem foi expulso sai andando (um pouco apagado); o cartão em cima de quem fez; a linha do impedimento
      leaving.forEach(q => { const p = q.p, x = X(p.x), y = Y(p.y), r = (q.wasMe ? 9.5 : q.sub ? 9.6 : 6.2) * k, kt = p.side ? KT.opp : KT.mine;
        g.globalAlpha = q.bench ? 1 : 0.7; g.fillStyle = q.wasMe ? '#F2C230' : kt[0]; g.strokeStyle = '#F4F1E8'; g.lineWidth = 2 * k; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.globalAlpha = 1;
        if (q.wasMe || q.num) { g.fillStyle = q.wasMe ? '#13201A' : lum(kt[0]) > 0.5 ? '#0B120E' : '#FFFFFF'; g.font = '800 ' + Math.round(12 * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(q.wasMe ? o.num || 9 : q.num), x, y + 0.5); }
        if (!q.sub && (!refFx || refFx.p !== p)) card(x + 5 * k, y - r - 2 * k, '#D8404A', k * 0.7, -0.14); });
      if (offLine) {
        const [wx] = toW(offLine.s, offLine.x, 0), lx = X(wx);
        g.fillStyle = 'rgba(242,194,48,.10)'; const x2 = X(toW(offLine.s, L, 0)[0]); g.fillRect(Math.min(lx, x2), Y(0), Math.abs(x2 - lx), Y(WD) - Y(0));
        g.strokeStyle = '#F2C230'; g.lineWidth = 2 * k; g.setLineDash([5 * k, 4 * k]); g.beginPath(); g.moveTo(lx, Y(0)); g.lineTo(lx, Y(WD)); g.stroke(); g.setLineDash([]);
        // a bandeira do bandeirinha, levantada na lateral de cima
        const fy = Y(0) - 1; g.strokeStyle = '#FBF8EF'; g.lineWidth = 1.8 * k; g.beginPath(); g.moveTo(lx, fy + 12 * k); g.lineTo(lx, fy - 8 * k); g.stroke();
        g.fillStyle = '#F2C230'; g.fillRect(lx, fy - 8 * k, 6 * k, 4 * k); g.fillStyle = '#D8404A'; g.fillRect(lx + 6 * k, fy - 8 * k, 6 * k, 4 * k); g.fillRect(lx, fy - 4 * k, 6 * k, 4 * k); g.fillStyle = '#F2C230'; g.fillRect(lx + 6 * k, fy - 4 * k, 6 * k, 4 * k);
      }
      if (refFx) {
        const p = refFx.p, x = X(p.x), y = Y(p.y), up = Math.min(1, (2.3 - refFx.t) * 4);
        if (refFx.kind === 'impedimento') { g.strokeStyle = 'rgba(216,64,74,.9)'; g.lineWidth = 3 * k; g.beginPath(); g.arc(x, y, 10 * k, 0, Math.PI * 2); g.stroke(); }
        else if (refFx.kind !== 'falta') {
          const red = refFx.kind === 'vermelho';
          g.strokeStyle = red ? 'rgba(216,64,74,.6)' : 'rgba(242,194,48,.55)'; g.lineWidth = 3.5 * k; g.beginPath(); g.arc(x, y, 10 * k, 0, Math.PI * 2); g.stroke();
          if (red && refFx.how === '2am') card(x - 3 * k, y - 15 * k - up * 6 * k, '#F2C230', k, 0.16);
          card(x + 4 * k, y - 15 * k - up * 6 * k, red ? '#D8404A' : '#F2C230', k, red ? -0.14 : 0.16);
        }
      }
      const bx = X(ball.x), by = Y(ball.y), air = ball.fly ? Math.sin(Math.min(1, ball.fly.t) * Math.PI) * (ball.fly.loft || 0) * 1.3 * k : 0;
      { const hs = Math.min(1, air / (12 * k)); g.fillStyle = 'rgba(0,0,0,' + (0.32 - 0.16 * hs).toFixed(2) + ')'; g.beginPath(); g.ellipse(bx + 1 + air * 0.25, by + 2.5 + air * 0.1, (4 - 1.2 * hs) * k, (2.5 - 0.8 * hs) * k, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; g.strokeStyle = '#13201A'; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(bx, by - air, (4.5 + air / 12) * k, 0, Math.PI * 2); g.fill(); g.stroke();
      if (tip) tipCard(k0);
    }
    loop.n = 0;
    function loop(ts) {
      raf = 0;
      if (!alive) return;
      if (!cv || !cv.isConnected) return; // a tela trocou (intervalo, fim): para até o próximo attach
      const dt = Math.min(0.05, (ts - (last || ts)) / 1000) * (o.speed ? o.speed() : 1); last = ts;
      if (W < 60 || H < 40 || ++loop.n % 30 === 0) { const r = cv.getBoundingClientRect(), z = U.zk ? U.zk() : 1; if (Math.abs(r.width / z - W) > 1 || Math.abs(r.height / z - H) > 1) size(); }
      raf = requestAnimationFrame(loop); // antes de tudo: um erro da tela num aviso do campinho não pode parar o campinho
      try {
        if (!frozen && !document.hidden) { const n = Math.ceil(dt / 0.02); for (let i = 0; i < n; i++) step(dt / n); }
        draw();
        if (o.onFrame) o.onFrame(api.info());
      } catch (err) { if (!loop.rep && window.CLIMBIX_REPORT) { loop.rep = 1; window.CLIMBIX_REPORT('campinho: ' + err.message, err.stack); } }
    }
    // Começo: no apito todos no seu campo; voltando do seu lance, a bola com o seu time no meio
    ALL.forEach(p => { const [x, y] = koShape(p, p.side); p.x = p.gx = p.tx = x; p.y = p.gy = p.ty = y; });
    if (o.t0 > 0) { ALL.forEach(p => { const [x, y] = toW(p.side, ...shapeOf(p, p.side === 0, p.side === 0 ? 50 : 55, 34, 60)); p.x = p.gx = p.tx = x; p.y = p.gy = p.ty = y; }); mode = 'play'; setOwner(T[0][6]); }
    const onResize = () => size();
    window.addEventListener('resize', onResize);
    const api = {
      attach(el) {
        if (cv && cv !== el) cv.removeEventListener('pointerdown', onTap);
        cv = el; g = el.getContext('2d'); size(); draw(); el.addEventListener('pointerdown', onTap);
        if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); }
      },
      // Novo minuto: volta quem mandou no minuto que acabou (0 eles, 50 igual, 100 você: posse e campo juntos), ou null
      minute(t, bx) {
        const avg = acc.n > 0 && t === curT + 1 ? acc.x / acc.n : null; acc.x = 0; acc.n = 0;
        if (t - curT > 1) goals.forEach(e => { if (e.m < t) e.done = true; });
        curT = t; bxT = bx; mClk = clk; stRefresh(); return avg;
      },
      // O que a tela escreve sai daqui: quem tem a bola, onde ela está (no sentido de quem ataca) e a posse até agora
      info() {
        const side = ball.owner ? ball.owner.side : poss, [ax, ay] = tf(side, ball), tot = pt[0] + pt[1];
        return { mode, why: stopWhy, side, ax: ax / L * 100, ay: ay / WD * 100, sx: (mir() ? L - ball.x : ball.x) / L * 100, posse: (pt[0] + 4) / (tot + 8) }; // a posse começa em 50% e anda com o jogo
      },
      // Seu lance: a bola chega em você (passe do companheiro, ou você corta a jogada deles)
      lance(k, cb) {
        if (lc) lcDone();
        if (k && (ME < 0 || mode !== 'play' || due || k === 'none')) { if (cb) cb(); return; }
        if (ME < 0 || mode !== 'play') return;
        const me = T[0][ME];
        if (k) lc = { k, cb, t: 0, have: false };
        if (k && DEF[k]) {
          // A bola vai para um deles perto de você (o atacante, se você é o goleiro)
          const gkA = k === 'defesa' || k === 'oppfora' || k === 'pega' || k === 'saimal' || k === 'rebate';
          const q = gkA ? T[1][k === 'pega' || k === 'saimal' ? (me.y < 34 ? 5 : 8) : 9 + (curT % 2)] : T[1].filter(x => x.r !== 'GK').sort((a, b) => dist(a, me) - dist(b, me))[0];
          lc.q = q;
          if (ball.owner === q) { lc.have = true; return; }
          const from = ball.owner || (ball.fly && ball.fly.from) || at(poss, 6);
          fly(from, q.x + (gkA ? -1 : 0), q.y, q, dist(from, q) > 28, from.side === 1 ? 'curto' : 'longo', from.side === 0);
          return;
        }
        if (ball.owner === me) { if (lc) { lc.have = true; ball.hold = Math.min(ball.hold, 0.35); ball.carry = null; } return; }
        const from = ball.owner || (ball.fly && ball.fly.from) || at(poss, 6);
        if (ball.owner || ball.loose) fly(from, me.x + 1, me.y, me, dist(from, me) > 30, 'curto', from.side !== 0);
        else if (ball.fly && !ball.fly.shot) { const f = ball.fly; f.to = me; f.x0 = ball.x; f.y0 = ball.y; f.x1 = me.x + 1; f.y1 = me.y; f.t = 0; f.dur = Math.max(0.25, Math.hypot(f.x1 - f.x0, f.y1 - f.y0) / 18); f.cut = f.from.side !== 0; } // desvia a partir de onde a bola está (sem pular)
      },
      // Antes do apito todos parados na formação de saída; go() é o apito
      // Substituído: você vira um jogador como os outros e o marcador some
      sub() { if (lc) lcDone(); ME = -1; en = null; },
      // Ainda falta sair no campinho o gol do motor do minuto m? (a tela segura o relógio até a rede balançar)
      // A tela esperou e o gol não saiu: quem vai marcar bate de onde estiver (golaço de longe, mas a rede balança antes do placar)
      force(m) { const e = goals.find(q => !q.done && q.m === m); if (!e || mode !== 'play') return; if (due !== e) { due = e; e.t0 = clk; e.asDone = false; e.rx = 88; e.ry = 34; } e.now = true; },
      // Treinador: o motor já decidiu o lance (chute do lado side que vira out: gol, def ou fora); o campinho joga e avisa em cb
      shot(side, out, cb) {
        const e = { m: curT + 1, side, me: false, as: false, out, cb, done: false };
        // Gol na fila: as chances que ainda não saíram ficam para trás (a linha delas aparece já) e o gol vem primeiro
        if (out === 'gol') goals.forEach(q => { if (!q.done && q.out && q.out !== 'gol') { q.done = true; if (due === q) due = null; if (q.cb) q.cb(); } });
        goals.push(e);
        // now: a tela esperou demais, quem vai bater bate de onde estiver; sem now: desiste do lance
        return now => { if (e.done) return; if (now) { if (due !== e && mode === 'play') { due = e; e.t0 = clk; e.asDone = false; e.rx = 88; e.ry = 34; } e.now = true; return; } e.done = true; if (due === e) due = null; };
      },
      // O juiz: { side: 0 seu time | 1, pos, kind: falta|amarelo|vermelho|impedimento, me, how }. cb quando o lance aparece
      // (com a bola parada, num gol saindo ou no seu lance, a linha sai na hora; o vermelho tira o jogador do mesmo jeito)
      ref(r0, cb) {
        const free = mode === 'play' && !lc && !due && !r0.quiet;
        const r = free && !offPend && !foulPend ? refDo(r0) : false;
        if (r === 'pend') { (offPend || foulPend).cb = cb; return; }
        if (r) { if (cb) setTimeout(cb, r0.kind === 'falta' ? 500 : 900 / Math.max(1, o.speed ? o.speed() : 1)); return; }
        if (r0.kind === 'vermelho') { const p = whoDid(r0.side, r0.pos, r0.me, r0.num); if (p) goOff(p, 0); }
        if (cb) cb();
      },
      // Treinador: mudou a formação (ou alguém foi expulso: a lista vem menor); cada um corre para o lugar novo
      lineup(s, form) {
        if (!form || !form.length) return;
        while (T[s].length > form.length) { const out = T[s].pop(); if (ball.owner === out) setOwner(at(s, 6)); if (ball.fly && ball.fly.to === out) ball.fly.to = at(s, 6); if (ball.loose && ball.loose.to === out) ball.loose.to = at(s, 6); }
        const was = T[s].map(p => (p.inf && p.inf.num) || 0), now = mode === 'wait' || mode === 'half' || (mode === 'ko' && koHold);
        T[s].forEach((p, k) => { const f = form[k], n = (f[4] && f[4].num) || 0;
          // Troca pela regra (Silvio, 2026-11-07): quem sai joga até a bola parar; aí a placa sobe, ele sai pela linha mais perto
          // e só então quem entra pisa no campo, pelo meio. Antes do apito ou no intervalo, a troca é na hora
          if (!now && was[k] && n && n !== was[k] && !was.includes(n) && !isMe(p)) {
            if (!subQ) subQ = { s, items: [], ph: 'wait', t: 0 };
            const it = subQ.items.find(q => q.p === p); if (it) { it.f = f; it.newNum = n; } else subQ.items.push({ p, f, oldNum: was[k], newNum: n });
          } else if (!(subQ && subQ.items.some(q => q.p === p))) reform(p, f);
        });
        if (subQ && subQ.ph === 'wait') { leaving.splice(0, leaving.length, ...leaving.filter(q => !q.bench));
          subQ.items.forEach((it, i) => leaving.push({ p: { x: 52.5 + (s ? 1 : -1) * (3 + i * 1.8), y: WD + 1.1, side: s, r: it.f[0] }, num: it.newNum, sub: true, bench: true, wait: 0, t: 0 })); }
        ALL = T[0].concat(T[1]); ALL.forEach(p => { p.mark = null; p.th = 0; }); defT = 0;
      },
      // Treinador: mudou o estilo no meio do jogo
      style(s, x) { STb[s] = stOf(x); stRefresh(); },
      mirror() { return mir(); },
      pending(m) { return mode !== 'wait' && goals.some(e => !e.done && e.m === m); },
      go() { if (mode === 'wait') { mode = 'ko'; modeT = 0.3; koHold = true; } },
      // true enquanto os times ainda se arrumam para a saída do 1º ou do 2º tempo: a tela não anda o minuto
      koWait() { return koHold && (mode === 'ko' || mode === 'wait'); },
      unhold() { koHold = false; }, // a tela destrava o relógio (vigia do Treinador)
      // Placa do quarto árbitro: { add: n } (acréscimos) ou { out: [nums], in: [nums] } (troca)
      board(b) { Q4.b = b; Q4.t = b && b.add ? 4.5 : 4; },
      // Fim de jogo: três apitos, os jogadores param onde estão
      fin() { if (lc) lcDone(); mode = 'fim'; stopWhy = 'Fim de jogo'; ball.owner = ball.fly = ball.loose = ball.carry = null; },
      half() { if (lc) lcDone(); mode = 'half'; koSide = 1; ball.owner = ball.fly = ball.loose = ball.carry = null; },
      second() { half2 = true; mode = 'ko'; modeT = 0.4; koSide = 1; koHold = true; if (subQ) subApply(true); ALL.forEach(p => { [p.x, p.y] = tunnel(p); p.vx = p.vy = 0; p.outT = 9; p.outE = 40; }); REF.x = 52.5; REF.y = WD + 1; }, // voltam do túnel
      freeze(v) { frozen = !!v; },
      energy(v) { en = v === null || v === undefined ? null : cl(v, 0, 100); },
      meAt() { if (ME < 0) return null; const p = T[0][ME]; return [p.x / L * 100, p.y / WD * 100]; },
      ballAt() { return [ball.x / L * 100, ball.y / WD * 100]; },
      stop() { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', onResize); },
      _refs: () => ({ REF, AR, REFC }), _place: (fn) => { fn({ T, ball, REF, AR, ALL }); },
      _step: step, _state: () => { const lw = lastWhy; lastWhy = ''; return ({ lastWhy: lw, ALLX: ALL, WHY, DBG, PLAYS, trail, REF, AR, Q4, leaving, rs, mode, poss, ball, due, goals, lc, offPend, foulPend, refFx, wrong: ALL.filter(p => tf(p.side, p)[0] > 53.5).length }); }
    };
    LP._sim = api;
    return api;
  };
})();
