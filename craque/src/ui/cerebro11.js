// Cérebro 11x11 do campinho (teste, ?motor=11): o jogo jogado de verdade. Nada é disparado nem sorteado no fim: a bola tem
// física (atrito, quique, altura), cada jogador lê a bola e escolhe tocar, lançar, cruzar, conduzir, driblar ou chutar com erro
// humano, o passe pode ser cortado no caminho, o goleiro mergulha e o chute pode bater na trave ou sobrar. O gol sai do lance.
// Veio da simulação 11x11 que o Silvio trouxe (13/11), adaptada: atributos de cada jogador do Climbix (fin, pas, dri, def, vel,
// gol), as formações e os estilos do Treinador. Desde 13/11 à noite (Silvio: "nada scriptado, deixe acontecer") o juiz também
// é daqui: impedimento só de quem estava à frente do penúltimo defensor na hora do passe e tocou na bola, falta só no bote
// (cartão pela falta), pênalti só da falta dentro da área; cobrança de falta com barreira e de pênalti também. Cada apito vai
// para a tela por o.onRef, que o livesim desenha e o motor anota. O livesim fica com o desenho, as trocas, o gol e a festa.
// Coordenadas em metros, 105 x 68; o lado 0 ataca para a direita e o lado 1 é espelhado (igual ao livesim).
(function () {
  const U = (typeof window !== 'undefined' && window.CRAQUE_UI) || {}, LP = U.LP || (U.LP = {});
  const CL = 105, CW = 68, G = 9.81, DT = 1 / 20, TAU = Math.PI * 2;
  const GOL_Y1 = 30.34, GOL_Y2 = 37.66, GOL_ALT = 2.44;
  const AREA_F = 16.5, AREA_Y1 = 13.85, AREA_Y2 = 54.15, PEQ_F = 5.5;
  const FATOR_PAPEL = { GOL: 0.9, ZAG: 0.97, LAT: 1.02, VOL: 0.98, MEI: 1.0, PON: 1.04, ATA: 1.02 };
  const P_INFILTRA = { GOL: 0, ZAG: 0, LAT: 0.1, VOL: 0.05, MEI: 0.18, PON: 0.42, ATA: 0.5 };
  const P_DRIBLE = { GOL: -9, ZAG: -0.3, LAT: 0.1, VOL: 0, MEI: 0.25, PON: 0.42, ATA: 0.3 };
  const _e = (typeof process !== 'undefined' && process.env) || {}, num = (k, d) => (_e[k] !== undefined && _e[k] !== '' ? +_e[k] : d);
  // Equilíbrio (os mesmos nomes da simulação original; no node cada um aceita variável de ambiente B11_<nome>)
  const BAL = {
    velBase: 7.3, acel: 10,
    atritoK: 0.30, atritoC: 0.8, arrastoAr: 0.06, quique: 0.52,
    raioDominio: 0.95, dominioBase: 1.18, raioDesarme: 1.35, raioBloqueio: 0.8, reacaoCorte: 0.4, raioCorte: 0.65,
    recuoDefesa: 20, linhaAltaMax: 40,
    ruidoDecisao: 0.34, velChegada: 12, freioPasseAlto: 0.55, pesoAvanco: 0.022, vontadeCruzar: 0.7,
    erroPasse: 0.045, pPegaMal: 0.035, distMaxChute: 31, pesoChute: 6.8, freioChute: 0.55,
    erroChute: 0.08, erroChuteDist: 0.0024, erroChutePressao: 0.45,
    gkDist: 0.02, // chute de longe: o goleiro tem tempo de ver a bola (mais defesa por metro além de 11 m)
    distChute: 18, // a chance que o jogador enxerga cai e^(-d/distChute)
    gkReacao: 0.26, gkMergulho: 5.7, gkAlcance: 1.45, gkBase: 0.86, gkAlcancePen: 0.16, gkVelPen: 75,
    pDesarme: 0.36, pFalta: 0.06, pFaltaBatido: 0.4, pAmarelo: 0.22, pVermelho: 0.015, pFaltaArea: 0.8, erroLinha: 2.6, pSemFreio: 0.25, // falta no bote: a desajeitada (pFalta) e a de quem foi batido e segura (pFaltaBatido; na própria área ele se segura: pFaltaArea); erroLinha: metros que o passador erra ao ler a linha do impedimento
    gastoBase: 0.0004, gastoCorrida: 0.000018,
    kAt: 1, // quanto o atributo se afasta da média dos 22 em campo (1 = um ponto vale um ponto da simulação original)
    kForma: 26, // pontos de atributo por unidade de ln(força do ataque no minuto / 1,3): tática, mando, moral e cansaço do motor
  };
  Object.keys(BAL).forEach(k => { BAL[k] = num('B11_' + k, BAL[k]); });
  LP.B11 = BAL;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hip = (a, b) => Math.sqrt(a * a + b * b);
  const lerp = (a, b, t) => a + (b - a) * t;

  // o: { R(): aleatório 0..1, T(): [lado 0, lado 1] (bonecos do livesim), at(p, k): atributo 0..99, en(p): energia 0..100,
  //      sty(s): estilo do lado { ctrl, press, line, counter, wide }, onShot(info), onGoal(p, lado, y, v) }
  LP.cerebro11 = function (o) {
    const R = o.R, gauss = () => (R() + R() + R() + R() - 2) * 1.7320508, sorteia = (a, b) => a + R() * (b - a);
    const RX = (T, x) => T.dir > 0 ? x : CL - x, RY = (T, y) => T.dir > 0 ? y : CW - y;
    const A = { id: 0, dir: 1, jogadores: [], adv: null, dl: 24, impLinha: 52.5, sty: null }, B = { id: 1, dir: -1, jogadores: [], adv: null, dl: 24, impLinha: 52.5, sty: null };
    A.adv = B; B.adv = A; const TM = [A, B];
    let todos = [];
    const bola = { x: 52.5, y: 34, z: 0, vx: 0, vy: 0, vz: 0, dono: null, ultimo: null, ultimoTime: A, receptor: null, chute: null, cruz: false, desvioEsc: false, tSolta: 0 };
    const M = { fase: 'fora', parado: null, posse: A, traj: [], nTraj: 0 };
    let TX = 0, TY = 0, MP = null, acc = 0, tEn = 0, clk = 0;
    const W = new Map(); // boneco do livesim -> jogador do cérebro (guarda o estado entre trocas)
    // Atributo efetivo (0..100): o do Climbix, afastado de 70 por kAt
    // Atributo efetivo (0..100): o do Climbix contado a partir da média dos 22 em campo (o jogo tem sempre o mesmo nível de
    // base; o que pesa é quem é melhor que quem), mais a forma do lado no minuto que o motor manda (o.forma: tática, mando...)
    const MED = {}, FORMA = [0, 0];
    const at = (p, k) => clamp(70 + ((o.at(p.lp, k) || 60) - (MED[k] || 60)) * BAL.kAt + FORMA[p.time.id] * BAL.kForma, 20, 99);
    function medias() { ['fin', 'pas', 'dri', 'def', 'vel', 'gol'].forEach(k => { let n = 0, t = 0; for (const p of todos) { if ((k === 'gol') !== p.gol && k !== 'pas' && k !== 'vel') continue; t += o.at(p.lp, k) || 60; n++; } MED[k] = n ? t / n : 60; });
      if (o.forma) [0, 1].forEach(s => { const f = clamp(o.forma(s), -2, 2); FORMA[s] = f * 1.2 / (1 + 0.6 * Math.abs(f)); /* no meio da tabela vale inteiro; gigante contra pequeno, uns 75% */ }); }
    // Papel e lugar de partida a partir da vaga do livesim (r: GK, CB, LB..., d: altura 0-1, w: largura em metros)
    function papelDe(lp) {
      const r = lp.r;
      if (r === 'GK') return ['GOL', 0];
      if (r === 'CB') return ['ZAG', 1];
      if (r === 'LB' || r === 'RB') return lp.d > 0.45 ? ['PON', 2] : ['LAT', 1];
      if (r === 'DM') return ['VOL', 2];
      if (r === 'ST') return lp.d >= 0.7 ? ['ATA', 3] : ['MEI', 2];
      if (r === 'LW' || r === 'RW') return ['PON', 3];
      if (r === 'LM' || r === 'RM') return lp.d >= 0.65 ? ['PON', 3] : ['PON', 2];
      return lp.d >= 0.7 ? ['MEI', 3] : ['MEI', 2]; // CM
    }
    function base(lp) { const [papel, linha] = papelDe(lp); return { papel, linha, x: papel === 'GOL' ? 5 : 15 + lp.d * 70, y: clamp(lp.w, 4, 64) }; }
    function novo(lp, T, i) {
      return { lp, time: T, i, base: base(lp), gol: lp.r === 'GK', x: lp.x, y: lp.y, vx: 0, vy: 0, dir: T.dir > 0 ? 0 : Math.PI,
        ax: lp.x, ay: lp.y, vDes: 1, e: 1, ativo: true, caido: 0, atord: 0, cdToque: 0, cdDes: 0,
        tDec: 0, conduz: 0, driblando: false, naMao: false, acao: 'abrir', tAcao: R() * 2, desvX: 0, desvY: 0, infY: lp.w,
        apX: 0, apY: 0, tPos: 0, tInter: 99, iX: 0, iY: 0, mergulho: false, de: null, deT: -9 };
    }
    // Escalação: segue os bonecos do livesim (troca, expulsão, formação nova) sem perder quem já estava
    function elenco() {
      const LT = o.T(); let mud = false;
      TM.forEach((T, s) => { const L0 = LT[s];
        if (T.jogadores.length !== L0.length || T.jogadores.some((p, i) => p.lp !== L0[i])) { mud = true;
          T.jogadores = L0.map((lp, i) => { let p = W.get(lp); if (!p) { p = novo(lp, T, i); W.set(lp, p); } p.i = i; p.time = T; return p; }); }
        T.jogadores.forEach(p => { p.base = base(p.lp); p.gol = p.lp.r === 'GK'; });
      });
      if (mud) todos = A.jogadores.concat(B.jogadores);
      if (bola.dono && !todos.includes(bola.dono)) bola.dono = null;
      if (bola.receptor && !todos.includes(bola.receptor)) bola.receptor = null;
    }
    const goleiro = T => T.jogadores.find(p => p.gol) || T.jogadores[0];
    // O estilo do Treinador vira o jeito de jogar: linha (altura da defesa), pressão, paciência (ctrl), contra-ataque e abertura
    function estilos() {
      TM.forEach((T, s) => { const x = o.sty(s) || {}, v = (k, d) => (x[k] === undefined ? d : x[k]);
        const line = v('line', 0.5), press = v('press', 0.35), ctrl = v('ctrl', 1), counter = v('counter', 0.35), wide = v('wide', 0.5);
        T.sty = { recuo: BAL.recuoDefesa - (line - 0.5) * 14, linhaMax: BAL.linhaAltaMax + (line - 0.5) * 18, press, cober: press > 0.8,
          ruido: BAL.ruidoDecisao * clamp(1.25 - 0.25 * ctrl, 0.8, 1.1), avanco: BAL.pesoAvanco * (0.75 + 0.7 * counter) * clamp(1.3 - 0.3 * ctrl, 0.8, 1.1),
          alto: BAL.freioPasseAlto * clamp(0.7 + 0.3 * ctrl, 0.8, 1.2), infK: 0.75 + 0.7 * counter, larg: 1 + 0.28 * (wide - 0.5) * 2 * 0.5, cruz: BAL.vontadeCruzar + (wide - 0.5) * 0.6 };
      });
    }
    const emPe = p => p.ativo && p.caido <= 0;
    function velMax(p) {
      let v = BAL.velBase * (0.86 + 0.28 * at(p, 'vel') / 100) * (0.82 + 0.18 * p.e) * FATOR_PAPEL[p.base.papel];
      if (bola.dono === p) v *= 0.87 - (78 - at(p, 'dri')) * 0.002;
      if (p.atord > 0) v *= 0.45;
      return v;
    }
    function distMaisPerto(T, x, y) { let d = 99; MP = null; for (const q of T.jogadores) { if (!q.ativo) continue; const k = hip(q.x - x, q.y - y); if (k < d) { d = k; MP = q; } } return d; }

    /* ---------------- Física da bola ---------------- */
    function fisicaBola(b, dt) {
      if (b.z > 0 || b.vz > 0) {
        b.vz -= G * dt; const ar = 1 - BAL.arrastoAr * dt; b.vx *= ar; b.vy *= ar;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        if (b.z <= 0) { b.z = 0; if (b.vz < -1.6) { b.vz = -b.vz * BAL.quique; b.vx *= 0.78; b.vy *= 0.78; } else b.vz = 0; }
      } else {
        const v = hip(b.vx, b.vy);
        if (v > 0) { const f = Math.max(0, v - (BAL.atritoC + BAL.atritoK * v) * dt) / v; b.vx *= f; b.vy *= f; }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
    }
    const bPrev = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    function prever() {
      const b = bPrev; b.x = bola.x; b.y = bola.y; b.z = bola.z; b.vx = bola.vx; b.vy = bola.vy; b.vz = bola.vz; let n = 0;
      for (let i = 0; i < 28; i++) { fisicaBola(b, 0.1); if (b.x < 0.3 || b.x > CL - 0.3 || b.y < 0.3 || b.y > CW - 0.3) break;
        const q = M.traj[n] || (M.traj[n] = { x: 0, y: 0, z: 0 }); q.x = b.x; q.y = b.y; q.z = b.z; n++; }
      M.nTraj = n;
    }
    function interceptar(p) {
      const vm = velMax(p), alt = p.gol ? 2.3 : 1.6, n = M.nTraj, adv = p.time !== bola.ultimoTime;
      const reac = adv ? BAL.reacaoCorte * (1.25 - at(p, 'def') / 280) : 0.15, folga = adv ? 0.4 : 0.7;
      for (let i = 0; i < n; i++) { const s = M.traj[i]; if (s.z > alt) continue; const tt = (i + 1) * 0.1, d = hip(s.x - p.x, s.y - p.y);
        if (d <= vm * Math.max(0, tt - reac) + folga) { p.tInter = tt; p.iX = s.x; p.iY = s.y; return; } }
      if (n > 0) { const s = M.traj[n - 1]; p.iX = s.x; p.iY = s.y; p.tInter = n * 0.1 + hip(s.x - p.x, s.y - p.y) / vm + (n < 28 ? 4 : 0); }
      else { p.iX = clamp(bola.x, 0, CL); p.iY = clamp(bola.y, 0, CW); p.tInter = 9; }
    }

    /* ---------------- Leitura coletiva ---------------- */
    function segundoUltimo(T) { let m1 = 0, m2 = 0; for (const q of T.adv.jogadores) { if (!q.ativo) continue; const x = RX(T, q.x); if (x > m1) { m2 = m1; m1 = x; } else if (x > m2) m2 = x; } return m2; }
    const naAreaPropria = (T, x, y) => RX(T, x) < AREA_F && y > AREA_Y1 && y < AREA_Y2;
    function coletivo(dt) {
      const dono = bola.dono; M.posse = dono ? dono.time : bola.ultimoTime;
      for (const T of TM) { const atq = T === M.posse, brx = RX(T, bola.x);
        const alvo = atq ? clamp(brx - 26, 20, 60) : clamp(brx - T.sty.recuo, 8.5, T.sty.linhaMax);
        T.dl += (alvo - T.dl) * Math.min(1, dt * 1.5); T.impLinha = Math.max(segundoUltimo(T), brx, 52.5);
        T.pressor = T.cobertura = T.perseguidor = null; }
      if (M.fase !== 'jogo') return;
      if (!dono) {
        prever();
        for (const T of TM) { let melhor = null, tm = 1e9;
          for (const p of T.jogadores) { if (!emPe(p)) { p.tInter = 99; continue; } interceptar(p); if (p.gol) continue;
            const t = p.tInter + (p.cdToque > 0 ? p.cdToque : 0); if (t < tm) { tm = t; melhor = p; } }
          T.perseguidor = melhor; T.tPers = tm; }
        for (const T of TM) { const g = goleiro(T); if (!g || !emPe(g) || (bola.chute && bola.chute.time !== T)) continue;
          if (naAreaPropria(T, g.iX, g.iY) && g.tInter < T.adv.tPers - 0.25 && g.tInter < T.tPers) T.perseguidor = g; }
      } else {
        const T = dono.time.adv; let p1 = null, t1 = 1e9, p2 = null, t2 = 1e9;
        for (const p of T.jogadores) { if (!emPe(p) || p.gol) continue; const t = hip(p.x - bola.x, p.y - bola.y) / velMax(p);
          if (t < t1) { p2 = p1; t2 = t1; p1 = p; t1 = t; } else if (t < t2) { p2 = p; t2 = t; } }
        // pressão baixa: quem está longe da própria área espera no bloco em vez de correr atrás (retranca e contra-ataque)
        if (p1 && T.sty.press < 0.3 && RX(T, bola.x) > 60 && t1 > 0.9) p1 = null;
        if (!dono.naMao) { T.pressor = p1; T.cobertura = p2; }
      }
    }

    /* ---------------- Posicionamento ---------------- */
    function ancora(p, atq) {
      const T = p.time, f = p.base, brx = RX(T, bola.x), bry = RY(T, bola.y); let x;
      if (f.linha === 1) { x = T.dl;
        if (f.papel === 'LAT') { const mesmoLado = (f.y - 34) * (bry - 34) > 0; x = atq ? (mesmoLado ? Math.max(T.dl + 8, brx - 5) : T.dl + 6) : T.dl + 1.2; }
      } else if (f.linha === 2) {
        x = !atq ? T.dl + 10 + (f.x - 45) * 0.45 : f.papel === 'VOL' ? Math.max(T.dl + 9, brx - 7) : Math.max(T.dl + 14, brx + 5 + (f.x - 50));
      } else { x = !atq ? T.dl + 22 + (f.x - 75) * 0.6 : f.papel === 'ATA' ? Math.max(brx + 20, T.dl + 36) : Math.max(brx + 13, T.dl + 30); }
      if (atq) x = Math.min(x, T.impLinha - (f.papel === 'ATA' ? 1 : 2.5), 99);
      const y = 34 + (f.y - 34) * (atq ? 1.14 * T.sty.larg : 0.64) + (bry - 34) * (atq ? 0.22 : 0.5);
      TX = RX(T, clamp(x, 3, 101)); TY = RY(T, clamp(y, 2.5, 65.5));
    }
    function alvoGoleiro(p) {
      const T = p.time, brx = RX(T, bola.x), dy = RY(T, bola.y) - 34, d = hip(brx, dy) || 1;
      let fora = clamp(d * 0.16, 1.0, T === M.posse ? 15 : 6.5); const dono = bola.dono;
      if (dono && dono.time !== T && brx < 20 && Math.abs(dy) < 16) fora = clamp(d * 0.3, 1.2, 5);
      TX = RX(T, brx / d * fora); TY = RY(T, 34 + dy / d * fora);
    }
    function escolherAcao(p, brx) {
      const T = p.time, papel = p.base.papel; let pInf = P_INFILTRA[papel] * T.sty.infK;
      if (brx < 38) pInf *= 0.45; else if (brx > 65) pInf *= 1.5;
      if (papel === 'LAT') pInf = ((p.base.y - 34) * (RY(T, bola.y) - 34) > 0 && brx > 42) ? 0.3 : 0.03;
      const r = R();
      if (r < pInf) { p.acao = 'infiltrar'; p.tAcao = sorteia(1.6, 3.2); const ry = RY(T, p.y);
        p.infY = papel === 'LAT' ? ry : clamp(papel === 'PON' ? ry + (34 - ry) * sorteia(0, 0.6) : ry + sorteia(-9, 9), 5, 63);
        p.semFreio = R() < BAL.pSemFreio; /* às vezes sai antes da hora: se o passe sair, é impedimento */ }
      else if (r < pInf + 0.33) { p.acao = 'apoio'; p.tAcao = sorteia(1.2, 2.6); p.tPos = 0; }
      else { p.acao = 'abrir'; p.tAcao = sorteia(0.9, 2.2); p.desvX = sorteia(-3.5, 3.5); p.desvY = sorteia(-4, 4); }
    }
    function calcApoio(p, dono, ancX, ancY) {
      const T = p.time, ang0 = Math.atan2(ancY - dono.y, ancX - dono.x); let melhor = -1e9; p.apX = ancX; p.apY = ancY;
      for (let k = 0; k < 5; k++) { const ang = ang0 + (k === 0 ? 0 : (k % 2 ? 1 : -1) * 0.55 * Math.ceil(k / 2)), dd = sorteia(8, 13);
        let cx = dono.x + Math.cos(ang) * dd; const cy = dono.y + Math.sin(ang) * dd;
        if (cx < 2 || cx > CL - 2 || cy < 2 || cy > CW - 2) continue;
        if (RX(T, cx) > T.impLinha - 0.5) cx = RX(T, T.impLinha - 0.5);
        const nota = Math.min(distMaisPerto(T.adv, cx, cy), 8) * 0.5 + (1 - riscoLinha(dono.x, dono.y, cx, cy, T.adv)) * 3 + (RX(T, cx) - RX(T, dono.x)) * 0.03;
        if (nota > melhor) { melhor = nota; p.apX = cx; p.apY = cy; } }
    }
    function pensarAtaque(p, dt) {
      const T = p.time, dono = bola.dono, brx = RX(T, bola.x);
      if (p.gol) { alvoGoleiro(p); p.vDes = 0.7; return; }
      const bry = RY(T, bola.y);
      if (brx > 72 && Math.abs(bry - 34) > 11 && bola.receptor !== p) {
        const lado = bry < 34 ? -1 : 1, papel = p.base.papel, longe = (p.base.y - 34) * lado < 0; let ex = 0, ey = 0;
        if (papel === 'ATA') { ex = 97; ey = 34 + lado * 2.5; }
        else if (papel === 'PON' && longe) { ex = 96; ey = 34 - lado * 4.5; }
        else if (papel === 'MEI' && longe) { ex = 92.5; ey = 34 - lado * 0.5; }
        else if (papel === 'MEI') { ex = 86; ey = 34 + lado * 7; }
        if (ex) { TX = RX(T, Math.min(ex + p.desvX * 0.4, Math.max(T.impLinha - 0.3, brx))); TY = RY(T, ey + p.desvY * 0.4); p.vDes = 1; p.tAcao -= dt; if (p.tAcao <= 0) { p.tAcao = 1; p.desvX = sorteia(-3.5, 3.5); p.desvY = sorteia(-4, 4); } return; }
      }
      p.tAcao -= dt; if (p.tAcao <= 0) escolherAcao(p, brx);
      if (p.acao === 'infiltrar') { let x = Math.min(T.impLinha + 10, 99.5); if (!p.semFreio && bola.receptor !== p) x = Math.min(x, T.impLinha - 0.4); TX = RX(T, x); TY = RY(T, p.infY); p.vDes = 1; return; }
      ancora(p, true); const ancX = TX, ancY = TY;
      if (p.acao === 'apoio' && dono) { p.tPos -= dt; if (p.tPos <= 0) { p.tPos = 0.45; calcApoio(p, dono, ancX, ancY); } TX = p.apX; TY = p.apY; p.vDes = 0.9; return; }
      let ox = 0, oy = 0; const d = distMaisPerto(T.adv, p.x, p.y);
      if (MP && d < 5 && d > 0.01) { ox = (p.x - MP.x) / d * 2.5; oy = (p.y - MP.y) / d * 2.5; }
      TX = clamp(ancX + p.desvX + ox, 1.5, CL - 1.5); TY = clamp(ancY + p.desvY + oy, 1.5, CW - 1.5); p.vDes = 0.85;
    }
    function pensarDefesa(p) {
      const T = p.time, dono = bola.dono;
      if (p.gol) { alvoGoleiro(p); p.vDes = 1; return; }
      const gx = T.dir > 0 ? 0 : CL; let ux = gx - bola.x, uy = 34 - bola.y; const n = hip(ux, uy) || 1; ux /= n; uy /= n;
      if (dono) {
        if (p === T.pressor) { TX = bola.x + ux * 0.5; TY = bola.y + uy * 0.5; p.vDes = clamp(0.85 + 0.2 * T.sty.press, 0.85, 1); return; }
        if (p === T.cobertura) { const k = T.sty.cober ? 3 : 5.5; TX = dono.x + ux * k; TY = dono.y + uy * k; p.vDes = 0.95; return; }
      }
      ancora(p, false); const ancX = TX, ancY = TY, raio = p.base.linha === 1 ? 10 : 8; let alvo = null, dm = raio;
      for (const q of T.adv.jogadores) { if (!q.ativo || q.gol || q === dono) continue; const d = hip(q.x - ancX, q.y - ancY); if (d < dm) { dm = d; alvo = q; } }
      if (alvo) { let bx = bola.x - alvo.x, by = bola.y - alvo.y; const nb = hip(bx, by) || 1; let vx = gx - alvo.x, vy = 34 - alvo.y; const nv = hip(vx, vy) || 1;
        const mx = alvo.x + vx / nv * 1.6 + bx / nb * 0.8, my = alvo.y + vy / nv * 1.6 + by / nb * 0.8, w = (p.base.linha === 1 && RX(T, bola.x) < 45) ? 0.75 : 0.5;
        TX = lerp(ancX, mx, w); TY = lerp(ancY, my, w);
        if (p.base.linha === 1 && RX(T, TX) > T.dl + 2.5) TX = RX(T, T.dl + 2.5); }
      if (dono && dono.naMao) { const dx = TX - dono.x, dy = TY - dono.y, d = hip(dx, dy); if (d < 9) { if (d < 0.1) TX = dono.x - T.dir * 9; else { TX = dono.x + dx / d * 9; TY = dono.y + dy / d * 9; } } }
      p.vDes = 0.9;
    }
    function pensar(p, dt) {
      p.mergulho = false;
      if (p.caido > 0) { p.ax = p.x; p.ay = p.y; p.vDes = 0; return; }
      if (M.fase === 'parado') { alvoParado(p); p.ax = TX; p.ay = TY; return; }
      const dono = bola.dono, T = p.time;
      if (dono === p) { if (p.naMao) { p.ax = p.x; p.ay = p.y; p.vDes = 0; return; } p.ax = clamp(p.x + Math.cos(p.conduz) * 6, 1, CL - 1); p.ay = clamp(p.y + Math.sin(p.conduz) * 6, 1, CW - 1); p.vDes = 1; return; }
      if (!dono) {
        const ch = bola.chute;
        if (p.gol && ch && ch.time !== T && !ch.tentou) {
          p.ax = p.x; p.ay = p.y; p.vDes = 0;
          if (ch.idade >= ch.reacao && Math.abs(bola.vx) > 1) { const tt = (p.x - bola.x) / bola.vx;
            if (tt > 0 && tt < 3) { let yp = bola.y + bola.vy * tt; if (ch.penalti && ch.palpite * (yp - 34) < 0) yp = 34 + ch.palpite * 2.6; /* pênalti: pulou para o lado errado */
              p.ay = clamp(yp, GOL_Y1 - 1.5, GOL_Y2 + 1.5); p.mergulho = true; } }
          return;
        }
        if (p === T.perseguidor || p === bola.receptor) { const perto = hip(bola.x - p.x, bola.y - p.y) < 2.5 && bola.z < 1; p.ax = perto ? bola.x : p.iX; p.ay = perto ? bola.y : p.iY; p.vDes = 1; return; }
      }
      if (T === M.posse) pensarAtaque(p, dt); else pensarDefesa(p);
      p.ax = TX; p.ay = TY;
    }
    function mover(p, dt) {
      if (p.caido > 0) { p.vx = p.vy = 0; return; }
      if (p.mergulho) { const vm = BAL.gkMergulho * (0.75 + 0.5 * at(p, 'gol') / 100); p.vx = 0; p.vy = clamp((p.ay - p.y) / dt, -vm, vm); p.y += p.vy * dt; return; }
      const dx = p.ax - p.x, dy = p.ay - p.y, d = hip(dx, dy), des = Math.min(velMax(p) * p.vDes, d * 3.2);
      let dvx = (d > 0.01 ? dx / d * des : 0) - p.vx, dvy = (d > 0.01 ? dy / d * des : 0) - p.vy; const dv = hip(dvx, dvy), lim = BAL.acel * dt;
      if (dv > lim) { dvx *= lim / dv; dvy *= lim / dv; }
      p.vx += dvx; p.vy += dvy; p.x = clamp(p.x + p.vx * dt, -2, CL + 2); p.y = clamp(p.y + p.vy * dt, -2, CW + 2);
      const v = hip(p.vx, p.vy), alvo = (bola.dono === p) ? p.conduz : v > 0.8 ? Math.atan2(p.vy, p.vx) : Math.atan2(bola.y - p.y, bola.x - p.x);
      let da = alvo - p.dir; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; p.dir += clamp(da, -9 * dt, 9 * dt);
    }
    function separar() {
      for (let i = 0; i < todos.length; i++) { const a = todos[i]; if (!a.ativo) continue;
        for (let j = i + 1; j < todos.length; j++) { const b = todos[j]; if (!b.ativo) continue; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.81 && d2 > 1e-6) { const d = Math.sqrt(d2), e = (0.9 - d) * 0.25; a.x -= dx / d * e; a.y -= dy / d * e; b.x += dx / d * e; b.y += dy / d * e; } } }
    }

    /* ---------------- Percepção de quem tem a bola ---------------- */
    function riscoLinha(x0, y0, x1, y1, adv) {
      const dx = x1 - x0, dy = y1 - y0, Ln = hip(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln; let r = 0;
      for (const q of adv.jogadores) { if (!emPe(q)) continue; const s = (q.x - x0) * ux + (q.y - y0) * uy; if (s < 0.5) continue; let v;
        if (s > Ln - 0.3) v = 0.6 * (1 - hip(q.x - x1, q.y - y1) / 3); else v = 1.25 - hip(q.x - (x0 + ux * s), q.y - (y0 + uy * s)) / (0.6 + 0.16 * s);
        if (v > r) r = v; }
      return r > 1 ? 1 : r;
    }
    function valorPos(rx, ry) { const v = clamp(1 - hip(CL - rx, 34 - ry) / 90, 0, 1); return v * Math.sqrt(v); }
    function chancePercebida(p, T, dGol) {
      const gx = T.dir > 0 ? CL : 0; let ang = Math.abs(Math.atan2(GOL_Y2 - p.y, gx - p.x) - Math.atan2(GOL_Y1 - p.y, gx - p.x)); if (ang > Math.PI) ang = TAU - ang;
      let c = Math.pow(ang / 1.5, 1.15) * Math.exp(-dGol / BAL.distChute) * 1.25; const dx = gx - p.x, dy = 34 - p.y, Ln = dGol || 1, ux = dx / Ln, uy = dy / Ln;
      for (const q of T.adv.jogadores) { if (!emPe(q) || q.gol) continue; const s = (q.x - p.x) * ux + (q.y - p.y) * uy; if (s < 0.3 || s > 8) continue; if (hip(q.x - (p.x + ux * s), q.y - (p.y + uy * s)) < 1.0) c *= 0.72; }
      return c;
    }
    function avaliarPasses(p, pressao, lista, op) {
      const T = p.time, S = T.sty, prx = RX(T, bola.x), pry = RY(T, bola.y), vAqui = valorPos(prx, pry), ruido = () => gauss() * S.ruido;
      for (const m of T.jogadores) {
        if (m === p || !emPe(m)) continue; const d0 = hip(m.x - bola.x, m.y - bola.y); if (d0 < 5 || d0 > (op.max || 62)) continue;
        const mrx = RX(T, m.x); if (mrx > T.impLinha + 0.2 + gauss() * BAL.erroLinha * (1.3 - at(p, 'pas') / 100) && mrx > prx) continue; // não passa para quem ele vê impedido (às vezes lê mal a linha)
        const tEst = d0 / 15, ax = clamp(m.x + m.vx * tEst * 0.8, 1.5, CL - 1.5), ay = clamp(m.y + m.vy * tEst * 0.8, 1.5, CW - 1.5);
        const d = hip(ax - bola.x, ay - bola.y), arx = RX(T, ax), ary = RY(T, ay), risco = riscoLinha(bola.x, bola.y, ax, ay, T.adv);
        const dRec = distMaisPerto(T.adv, ax, ay), aberto = clamp(dRec / 7, 0, 1), prog = arx - prx, ganho = valorPos(arx, ary) - vAqui;
        const comum = 0.5 + prog * S.avanco + ganho * 2.2 + aberto * 0.45 - (m.gol ? 0.5 : 0) + (prog < 0 ? pressao * 0.35 : 0);
        lista.push({ u: comum - risco * 2.4 - (d > 30 ? 0.2 : 0) + ruido(), tipo: 'passe', m, x: ax, y: ay, alto: false });
        if (d0 > 24 && !op.soCurto) lista.push({ u: comum - S.alto - (clamp(1 - dRec / 6, 0, 1) * 0.7 + 0.25 + d0 * 0.004) * 1.6 + ruido(), tipo: 'passe', m, x: ax, y: ay, alto: true });
        if (m.acao === 'infiltrar' && mrx > prx && T.impLinha < 93 && d0 > 12 && d0 < 48 && !op.soCurto) {
          const lx = RX(T, Math.min(Math.max(mrx, T.impLinha) + sorteia(7, 14), 98)), ly = RY(T, lerp(RY(T, m.y), 34, 0.2));
          const esp = clamp(distMaisPerto(T.adv, lx, ly) / 10, 0, 1), rl = riscoLinha(bola.x, bola.y, lx, ly, T.adv), alto = rl > 0.45 || hip(lx - bola.x, ly - bola.y) > 28;
          lista.push({ u: 0.5 + (valorPos(RX(T, lx), RY(T, ly)) - vAqui) * 1.6 + esp * 0.6 - (alto ? 0.6 : rl * 1.6) - d0 * 0.012 + (at(p, 'pas') - 70) / 120 + ruido(), tipo: 'passe', m, x: lx, y: ly, alto, lanc: true });
        }
      }
    }
    function decidirDono(p, dt) {
      p.tDec -= dt; if (p.tDec > 0) return;
      const T = p.time, S = T.sty, prx = RX(T, p.x), pry = RY(T, p.y), frente = T.dir > 0 ? 0 : Math.PI, gx = T.dir > 0 ? CL : 0, dGol = hip(gx - p.x, 34 - p.y);
      let dOp = 99, op = null, nPerto = 0;
      for (const q of T.adv.jogadores) { if (!emPe(q)) continue; const d = hip(q.x - p.x, q.y - p.y); if (d < dOp) { dOp = d; op = q; } if (d < 4) nPerto++; }
      const pressao = clamp(1 - (dOp - 1) / 5, 0, 1), ruido = () => gauss() * S.ruido, ops = [];
      avaliarPasses(p, pressao, ops, {});
      if (p.naMao) ops.push({ u: 0.45 + ruido(), tipo: 'chutao' });
      else {
        if (dGol < BAL.distMaxChute) ops.push({ u: Math.sqrt(chancePercebida(p, T, dGol)) * BAL.pesoChute * (0.85 + 0.3 * at(p, 'fin') / 100) - BAL.freioChute + pressao * 0.15 + ruido(), tipo: 'chute' });
        if (prx > 72 && Math.abs(pry - 34) > 11) { let nArea = 0; for (const m of T.jogadores) if (m !== p && emPe(m) && RX(T, m.x) > 86 && Math.abs(m.y - 34) < 13) nArea++;
          if (nArea) ops.push({ u: S.cruz + 0.28 * nArea + (prx > 90 ? 0.3 : 0) + pressao * 0.2 + ruido(), tipo: 'cruz' }); }
        let mc = null;
        for (let k = 0; k < 6; k++) {
          const ang = k === 0 ? Math.atan2(34 - p.y, gx - p.x) : frente + [0, 0.6, -0.6, 1.2, -1.2][k - 1], ux = Math.cos(ang), uy = Math.sin(ang), cx = p.x + ux * 5, cy = p.y + uy * 5;
          if (cx < 1.5 || cx > CL - 1.5 || cy < 1.5 || cy > CW - 1.5) continue; let livre = 12;
          for (const q of T.adv.jogadores) { if (!emPe(q)) continue; const ox = q.x - p.x, oy = q.y - p.y, al = ox * ux + oy * uy; if (al > 0 && al < livre && Math.abs(ox * uy - oy * ux) < 2.2 + al * 0.25) livre = al; }
          let da = ang - p.conduz; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const u = 0.2 + livre / 12 * 0.75 + ux * T.dir * 0.25 + (valorPos(RX(T, p.x + ux * 8), RY(T, p.y + uy * 8)) - valorPos(prx, pry)) * 1.5 - pressao * 0.35 + (Math.abs(da) < 0.35 ? 0.12 : 0) + ruido() * 0.7;
          if (!mc || u > mc.u) mc = { u, tipo: 'conduz', ang };
        }
        if (mc) ops.push(mc);
        if (op && dOp < 4.5 && prx > 35 && (op.x - p.x) * T.dir > 0) ops.push({ u: 0.3 + P_DRIBLE[p.base.papel] + (at(p, 'dri') - 70) / 90 + (prx > 70 ? 0.25 : 0) - (nPerto - 1) * 0.3 + ruido(), tipo: 'drible', op });
        if (prx < 22 && pressao > 0.55) ops.push({ u: 0.9 + pressao * 0.5 + ruido(), tipo: 'chutao' });
      }
      let m = null; for (const q of ops) if (!m || q.u > m.u) m = q;
      if (!m) { p.tDec = 0.3; return; }
      p.driblando = false;
      switch (m.tipo) {
        case 'chute': chutar(p, { pressao }); break;
        case 'passe': passar(p, m.x, m.y, m.alto, m.m, { pressao }); break;
        case 'cruz': cruzar(p, { pressao }); break;
        case 'chutao': chutao(p); break;
        case 'conduz': p.conduz = m.ang; p.tDec = sorteia(0.2, 0.4); break;
        case 'drible': { const a = Math.atan2(m.op.y - p.y, m.op.x - p.x), lado = ((m.op.y - p.y) * T.dir > 0 ? -1 : 1) * (R() < 0.75 ? 1 : -1);
          let ang = a + lado * 0.85; const cy = p.y + Math.sin(ang) * 5; if (cy < 2 || cy > CW - 2) ang = a - lado * 0.85; p.conduz = ang; p.driblando = true; p.tDec = 0.55; break; }
      }
    }

    /* ---------------- Ações com a bola ---------------- */
    function soltar(p, ang, vh, vz) {
      if (bola.dono === p) { bola.x = p.x + Math.cos(ang) * 0.6; bola.y = p.y + Math.sin(ang) * 0.6; }
      bola.dono = null; bola.z = 0; bola.vx = Math.cos(ang) * vh; bola.vy = Math.sin(ang) * vh; bola.vz = vz;
      bola.ultimo = p; bola.ultimoTime = p.time; bola.receptor = null; bola.chute = null; bola.cruz = false; bola.desvioEsc = false; bola.impedidos = null;
      p.cdToque = 0.45; p.naMao = false; p.driblando = false; p.dir = ang; bola.tSolta = 0;
    }
    function passar(p, ax, ay, alto, m, op) {
      const T = p.time, dx = ax - bola.x, dy = ay - bola.y, d = hip(dx, dy); let ang = Math.atan2(dy, dx), fv = 1 + gauss() * 0.07;
      ang += gauss() * (BAL.erroPasse * (1.6 - at(p, 'pas') / 100) * (1 + (op.pressao || 0) * 0.9) * (1 + (1 - p.e) * 0.4) * (alto ? 1.25 : 1) * (op.erro || 1) + d * 0.0007);
      if (R() < BAL.pPegaMal) { ang += gauss() * 0.25; fv *= sorteia(0.5, 0.85); }
      if (alto) { const tv = (op.tVoo || 0.75 + d / 38); soltar(p, ang, d / tv * fv * (1 + BAL.arrastoAr * tv * 0.5), G * tv / 2); }
      else soltar(p, ang, clamp((BAL.velChegada + BAL.atritoK * d + BAL.atritoC * d / 14) * fv, 5, op.maxVel || 27), op.vz || 0);
      bola.receptor = m; if (m) { m.de = p; m.deT = clk; }
      // impedimento de verdade: quem está à frente do penúltimo defensor (o goleiro conta), da bola e no campo deles na hora do passe
      // fica marcado; se for ele a tocar na bola, apita (lateral, escanteio e tiro de meta não têm impedimento)
      let imp = null;
      if (!op.semImp) { const lin = Math.max(segundoUltimo(T), RX(T, bola.x), 52.5); for (const q of T.jogadores) if (q !== p && q.ativo && RX(T, q.x) > lin + 0.15) (imp || (imp = [])).push(q); }
      bola.impedidos = imp;
      if (!alto && d < 18 && !p.gol && p.base.papel !== 'ZAG' && R() < 0.4) { p.acao = 'infiltrar'; p.tAcao = 2.2; p.infY = clamp(RY(T, p.y) + sorteia(-5, 5), 5, 63); p.semFreio = false; }
      else p.tAcao = Math.min(p.tAcao, 0.4);
    }
    function cruzar(p, op) {
      const T = p.time, lado = RY(T, bola.y) < 34 ? 1 : -1, tx = RX(T, CL - sorteia(5.5, 12)), ty = RY(T, 34 + lado * sorteia(-4, 7)); let m = null, dm = 99;
      for (const q of T.jogadores) { if (q === p || !emPe(q) || q.gol) continue; const d = hip(q.x - tx, q.y - ty); if (d < dm) { dm = d; m = q; } }
      const d = hip(tx - bola.x, ty - bola.y); passar(p, tx, ty, true, m, { pressao: op.pressao || 0, erro: 1.2, tVoo: 0.85 + d / 40, semImp: op.semImp }); bola.cruz = true;
    }
    function chutao(p) {
      const T = p.time, tx = RX(T, Math.min(RX(T, bola.x) + sorteia(35, 55), 95)), ty = clamp(RY(T, 34 + sorteia(-24, 24)), 3, CW - 3); let m = null, dm = 99;
      for (const q of T.jogadores) { if (q === p || !emPe(q)) continue; const d = hip(q.x - tx, q.y - ty); if (d < dm) { dm = d; m = q; } }
      passar(p, tx, ty, true, m, { erro: 1.8, semImp: true }); bola.impedidos = null; // o chutão do tiro de meta e da zaga: sem impedimento (não é passe para alguém)
    }
    function chutar(p, op) {
      const T = p.time, gx = T.dir > 0 ? CL : 0, fin = at(p, 'fin'), gk = goleiro(T.adv);
      let lado = gk && gk.y > 34 ? -1 : 1; if (R() < 0.3) lado = -lado;
      const yAim = 34 + lado * (op.penalti ? sorteia(1.7, 3.0) : sorteia(1.5, 3.1)), zAim = op.falta ? sorteia(1.2, 2.1) : R() < 0.55 ? sorteia(0.15, 0.65) : sorteia(0.7, 2.0), dx = gx - bola.x, dy = yAim - bola.y, d = hip(dx, dy);
      let v = (op.cabeca ? sorteia(14, 19) : sorteia(21, 28) + fin * 0.03);
      const sig = op.penalti ? 0.035 * (1.5 - fin / 100) : BAL.erroChute * (1.55 - fin / 100) * (1 + (op.pressao || 0) * BAL.erroChutePressao) * (1 + (1 - p.e) * 0.3) * (op.mult || 1) + d * BAL.erroChuteDist;
      let ang = Math.atan2(dy, dx) + gauss() * sig; const tv = d / v; let vz = (zAim + 0.5 * G * tv * tv) / tv + gauss() * sig * 0.6 * v;
      if (!op.penalti && R() < BAL.pPegaMal * 2) { v *= 0.6; ang += gauss() * 0.15; vz *= R() * 1.6; }
      const x0 = bola.x, y0 = bola.y; soltar(p, ang, v, Math.max(0, vz));
      if (o.onKick) o.onKick({ p: p.lp, pen: !!op.penalti }); // a tela liga a câmera lenta no instante do chute
      bola.chute = { time: T, autor: p, idade: 0, tentou: false, fim: false, cabeca: !!op.cabeca, x0, y0, ast: p.de && p.de.time === T && clk - p.deT < 10 ? p.de : null,
        penalti: !!op.penalti, falta: !!op.falta, palpite: R() < 0.5 ? -1 : 1,
        reacao: op.penalti ? 0 : BAL.gkReacao * (1.35 - 0.5 * (gk ? at(gk, 'gol') : 70) / 100) + R() * 0.08 };
    }
    // O chute acabou (gol, defesa, trave, travado ou fora): a tela conta (placar, narração, números do jogo) uma vez por chute
    function fimChute(ch, out, x) {
      if (!ch || ch.fim) return; ch.fim = true;
      const s = ch.time.id, [fx, fy] = s ? [CL - ch.x0, CW - ch.y0] : [ch.x0, ch.y0], yy = x && x.y !== undefined ? x.y : bola.y;
      o.onShot({ side: s, out, sv: x && x.sv, kind: ch.penalti ? 'pen' : ch.falta ? 'falta' : ch.cabeca ? 'cabeca' : 'chute', p: ch.autor.lp, ast: ch.ast ? ch.ast.lp : null, blk: x && x.blk ? x.blk.lp : null,
        dist: hip(CL - fx, 34 - fy), box: CL - fx <= 16.5 && Math.abs(34 - fy) <= 20.15, near: out === 'trave' || (out === 'fora' && Math.min(Math.abs(yy - GOL_Y1), Math.abs(yy - GOL_Y2)) < 2), lane: fy < 24 ? -1 : fy > 44 ? 1 : 0 });
    }

    /* ---------------- Contato com a bola ---------------- */
    function dominar(p) {
      const T = p.time; bola.dono = p; bola.z = 0; bola.vz = 0; bola.receptor = null; bola.impedidos = null; bola.chute = null; bola.cruz = false; bola.desvioEsc = false;
      bola.ultimo = p; bola.ultimoTime = T; p.naMao = p.gol && naAreaPropria(T, p.x, p.y);
      p.tDec = p.naMao ? sorteia(1.2, 2.3) : sorteia(0.18, 0.45); p.driblando = false; p.conduz = T.dir > 0 ? 0 : Math.PI;
      for (const q of T.adv.jogadores) if (q.cdDes < 0.3) q.cdDes = 0.3;
    }
    function espirrar(p, forca) {
      const a = R() * TAU, f = forca || sorteia(2, 5.5);
      bola.vx = p.vx * 0.5 + bola.vx * 0.2 + Math.cos(a) * f; bola.vy = p.vy * 0.5 + bola.vy * 0.2 + Math.sin(a) * f; bola.vz = R() * 2.5;
      bola.ultimo = p; bola.ultimoTime = p.time; bola.receptor = null; bola.chute = null; bola.cruz = false; bola.impedidos = null; p.cdToque = 0.4;
    }
    function defender(p, dPerp) {
      const ch = bola.chute, T = p.time, v = hip(bola.vx, bola.vy); ch.tentou = true; p.cdToque = 0.5;
      const pS = clamp(BAL.gkBase + Math.max(0, hip(ch.x0 - p.x, ch.y0 - p.y) - 11) * BAL.gkDist - dPerp * BAL.gkAlcancePen - Math.max(0, v - 20) / BAL.gkVelPen + (at(p, 'gol') - 70) / 140, 0.08, 0.97);
      if (R() >= pS) return false;
      if (v < 16 || R() < 0.4) { fimChute(ch, 'def', { sv: 'segura' }); dominar(p); return true; }
      const fora = T.dir > 0 ? 1 : -1; bola.ultimo = p; bola.ultimoTime = T; bola.chute = null; bola.receptor = null; bola.cruz = false;
      if (R() < 0.5) { fimChute(ch, 'def', { sv: 'escanteio' }); bola.desvioEsc = true; bola.vx = -fora * sorteia(4, 7); bola.vy = (bola.y < 34 ? -1 : 1) * sorteia(2, 6); bola.vz = sorteia(5, 7); bola.z = Math.max(bola.z, 1); }
      else { fimChute(ch, 'def', { sv: 'espalma' }); bola.vx = fora * sorteia(1, 7); bola.vy = (R() < 0.5 ? -1 : 1) * sorteia(3, 10); bola.vz = sorteia(1, 4); }
      return true;
    }
    function tocar(p, dPerp) {
      const b = bola, T = p.time, ch = b.chute;
      if (ch && T !== ch.time) {
        if (p.gol) return defender(p, dPerp);
        fimChute(ch, 'bloq', { blk: p });
        const v = hip(b.vx, b.vy), fr = sorteia(0.2, 0.5), a = R() < 0.55 ? Math.atan2(b.vy, b.vx) + (R() < 0.5 ? -1 : 1) * sorteia(0.45, 1.0) : Math.atan2(-b.vy, -b.vx) + gauss() * 0.9;
        b.vx = Math.cos(a) * v * fr; b.vy = Math.sin(a) * v * fr; b.vz = R() * 4;
        if (Math.cos(a) * ch.time.dir > 0.3) { b.vx *= 1.6; b.vy *= 1.6; b.vz = sorteia(3, 7); }
        b.ultimo = p; b.ultimoTime = T; b.chute = null; b.receptor = null; b.cruz = false; p.cdToque = 0.4; return true;
      }
      if (b.impedidos && b.impedidos.indexOf(p) >= 0) { impedimento(p); return true; }
      const vb = hip(b.vx - p.vx, b.vy - p.vy), meuPasse = T === b.ultimoTime;
      if (!meuPasse && b.tSolta < 0.35 && !p.gol && vb > 8) { const v = hip(b.vx, b.vy), a = Math.atan2(b.vy, b.vx) + (R() < 0.5 ? -1 : 1) * sorteia(0.4, 1.3), f = v * sorteia(0.35, 0.6);
        b.vx = Math.cos(a) * f; b.vy = Math.sin(a) * f; b.vz = sorteia(1, 5); b.ultimo = p; b.ultimoTime = T; b.receptor = null; b.cruz = false; p.cdToque = 0.45; return true; }
      if (b.cruz) { const gx = T.dir > 0 ? CL : 0;
        if (meuPasse && p !== b.ultimo && hip(gx - p.x, 34 - p.y) < 17 && R() < 0.8) { b.x = p.x; b.y = p.y; chutar(p, { mult: 1.35, cabeca: b.z > 0.9, pressao: clamp(1 - (distMaisPerto(T.adv, p.x, p.y) - 0.8) / 3, 0, 1) }); return true; }
        if (!meuPasse && !p.gol && naAreaPropria(T, p.x, p.y) && R() < 0.7) {
          const a = R() < 0.35 ? (T.dir > 0 ? Math.PI : 0) + (b.y < 34 ? -1 : 1) * T.dir * sorteia(0.5, 1.1) : (T.dir > 0 ? 0 : Math.PI) + sorteia(-1.1, 1.1), f = sorteia(9, 17);
          b.vx = Math.cos(a) * f; b.vy = Math.sin(a) * f; b.vz = sorteia(4, 8); b.ultimo = p; b.ultimoTime = T; b.receptor = null; b.cruz = false; p.cdToque = 0.5; return true; } }
      let pc = BAL.dominioBase - vb / 60 - (b.z > 0.6 ? 0.12 : 0) + (at(p, p.gol ? 'gol' : 'dri') - 70) / 180 + (p === b.receptor ? 0.06 : 0) - (!meuPasse && vb > 9 ? 0.2 : 0);
      if (p.gol && naAreaPropria(T, p.x, p.y)) pc += 0.2;
      if (R() < clamp(pc, 0.12, 0.985)) dominar(p); else espirrar(p);
      return true;
    }
    function contatos(x0, y0) {
      const b = bola, ch = b.chute, dx = b.x - x0, dy = b.y - y0, L2 = dx * dx + dy * dy, vel = hip(b.vx, b.vy); let melhor = null, dm = 1e9, dReal = 0;
      for (const p of todos) {
        if (!emPe(p) || p.cdToque > 0) continue; let raio = BAL.raioDominio, alt = 1.9;
        if (ch) { if (p.time === ch.time) { if (vel > 12 || p === ch.autor) continue; } else if (p.gol) { if (ch.tentou) continue; raio = BAL.gkAlcance; alt = 2.55; } else { raio = BAL.raioBloqueio; alt = 1.8; } }
        else if (p.gol && naAreaPropria(p.time, p.x, p.y)) { raio = 1.15; alt = 2.45; }
        else if (p.time !== b.ultimoTime && b.z < 0.5) raio = b.tSolta < 0.3 ? 0.45 : vel > 8 ? BAL.raioCorte : raio;
        if (b.z > alt) continue;
        let s = L2 > 1e-9 ? ((p.x - x0) * dx + (p.y - y0) * dy) / L2 : 0; s = clamp(s, 0, 1); const d = hip(p.x - (x0 + dx * s), p.y - (y0 + dy * s));
        if (d > raio) continue; const nota = d / raio + R() * 0.35; if (nota < dm) { dm = nota; melhor = p; dReal = d; }
      }
      return melhor ? tocar(melhor, dReal) : false;
    }
    // Bote: quem chega perto da bola dominada tenta roubar (pode ganhar, levar o drible ou fazer falta)
    function desarmes() {
      const dono = bola.dono; if (!dono || dono.naMao) return;
      for (const q of dono.time.adv.jogadores) {
        if (!emPe(q) || q.cdDes > 0 || q.atord > 0) continue; if (hip(q.x - bola.x, q.y - bola.y) > BAL.raioDesarme) continue;
        q.cdDes = sorteia(0.8, 1.2);
        let pW = BAL.pDesarme + (at(q, 'def') - at(dono, 'dri')) / 220, pF = BAL.pFalta; const n = hip(dono.x - q.x, dono.y - q.y) || 1;
        const tras = ((dono.x - q.x) * Math.cos(dono.dir) + (dono.y - q.y) * Math.sin(dono.dir)) / n;
        if (tras > 0.4) { pW -= 0.14; pF += 0.07; } if (dono.driblando) { pW -= 0.1; pF += 0.02; } if (q.gol) { pW += 0.25; pF = 0.03; } pW += (q.e - dono.e) * 0.1;
        pF *= 1 + (1 - q.e) * 0.4 - (at(q, 'def') - 70) / 250; // cansado e marcador ruim chegam atrasados
        if (naAreaPropria(q.time, dono.x, dono.y)) pF *= BAL.pFaltaArea;
        const r = R();
        if (r < pF) { falta(q, dono); return; }
        if (r >= pF + pW && R() < pF / BAL.pFalta * BAL.pFaltaBatido) { falta(q, dono); return; } // foi batido e segura, puxa ou chega atrasado
        if (r < pF + pW) { dono.atord = 0.4; dono.cdToque = 0.5; dono.naMao = false;
          if (R() < 0.55) dominar(q);
          else { bola.dono = null; espirrar(q, sorteia(3, 7)); q.cdToque = 0.25;
            if (RX(q.time, q.x) < 22 && R() < 0.6) { const f = sorteia(11, 16); bola.vx = -q.time.dir * f; bola.vy = (bola.y < 34 ? -1 : 1) * sorteia(3, 8); bola.vz = bola.y > GOL_Y1 - 2 && bola.y < GOL_Y2 + 2 ? 9 : sorteia(3, 6); } }
          return; }
        q.atord = sorteia(0.5, 0.85);
      }
    }

    /* ---------------- Regras ---------------- */
    // Falta: quem sofreu cai; cartão pelo lance (vermelho direto raro, amarelo; o 2º amarelo do jogo expulsa: o.amarelos diz
    // quantos ele já tem na súmula). Dentro da própria área é pênalti. A tela apita, desenha o cartão e o motor anota (o.onRef)
    function falta(q, v) {
      const To = q.time, Tv = v.time; v.caido = 1.3; v.vx = v.vy = 0; bola.dono = null;
      const r = R(), am0 = o.amarelos ? o.amarelos(q.lp) : 0; let card = '';
      if (!q.gol && r < BAL.pVermelho) card = 'direto';
      else if (r < BAL.pVermelho + BAL.pAmarelo) card = am0 >= 1 && !q.gol ? '2am' : 'am';
      if (card === 'direto' || card === '2am') q.ativo = false;
      const fx = clamp(v.x, 0.5, CL - 0.5), fy = clamp(v.y, 0.5, CW - 0.5), pen = naAreaPropria(To, fx, fy);
      if (o.onRef) o.onRef({ t: 'falta', side: To.id, p: q.lp, v: v.lp, card, pen, x: fx, y: fy });
      if (pen) parar('penalti', Tv, RX(Tv, CL - 11), 34); else parar('falta', Tv, fx, fy);
    }
    function impedimento(q) {
      const T = q.time, ln = Math.max(segundoUltimo(T), 52.5);
      if (o.onRef) o.onRef({ t: 'impedimento', side: T.id, p: q.lp, x: q.x, y: q.y, lin: ln });
      parar('falta', T.adv, clamp(q.x, 1, CL - 1), clamp(q.y, 1, CW - 1), { indireta: true });
    }
    function gol(T, yc) {
      const ch = bola.chute, autor = ch && ch.time === T ? ch.autor : (bola.ultimo && bola.ultimo.time === T ? bola.ultimo : null);
      if (ch && ch.time === T) fimChute(ch, 'gol', { y: yc });
      M.fase = 'fora'; bola.dono = null; bola.chute = null;
      o.onGoal(autor ? autor.lp : null, T.id, yc, hip(bola.vx, bola.vy), !(ch && ch.time === T));
    }
    function limites(x0, y0, z0) {
      const b = bola;
      if (b.x < 0 || b.x > CL) {
        const lado = b.x < 0 ? 0 : CL, f = (lado - x0) / ((b.x - x0) || 1e-9), yc = y0 + (b.y - y0) * f, zc = z0 + (b.z - z0) * f, def = lado === 0 ? A : B, atq = def.adv;
        if (b.desvioEsc) { parar('escanteio', atq, lado, yc < 34 ? 0 : CW); return true; }
        const naTrave = ((Math.abs(yc - GOL_Y1) < 0.13 || Math.abs(yc - GOL_Y2) < 0.13) && zc < GOL_ALT + 0.1) || (yc > GOL_Y1 && yc < GOL_Y2 && Math.abs(zc - GOL_ALT) < 0.11);
        if (naTrave && !b.dono) { const ch = b.chute; if (ch) fimChute(ch, 'trave', { y: yc }); if (o.onPost) o.onPost(lado === 0 ? 0.25 : CL - 0.25, yc);
          b.x = lado === 0 ? 0.25 : CL - 0.25; b.y = yc; b.vx = -b.vx * sorteia(0.3, 0.6); b.vy = b.vy * 0.5 + gauss() * 3; b.vz = Math.abs(b.vz) * 0.4; b.chute = null; b.receptor = null; b.cruz = false; return false; }
        if (yc > GOL_Y1 && yc < GOL_Y2 && zc < GOL_ALT) { gol(atq, yc); return true; }
        if (b.chute) fimChute(b.chute, 'fora', { y: yc });
        if (b.ultimoTime === def) parar('escanteio', atq, lado, yc < 34 ? 0 : CW);
        else parar('meta', def, lado === 0 ? PEQ_F : CL - PEQ_F, yc < 34 ? 29 : 39);
        return true;
      }
      if (b.y < 0 || b.y > CW) { if (b.chute) fimChute(b.chute, 'fora'); parar('lateral', b.ultimoTime.adv, clamp(b.x, 1, CL - 1), b.y < 0 ? 0 : CW); return true; }
      return false;
    }
    function moverBola(dt) {
      const b = bola;
      if (b.dono) { const p = b.dono, x0 = b.x, y0 = b.y; b.x = p.x + Math.cos(p.dir) * 0.75; b.y = p.y + Math.sin(p.dir) * 0.75; b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0; limites(x0, y0, 0); return; }
      if (b.chute) b.chute.idade += dt; b.tSolta += dt;
      for (let s = 0; s < 3; s++) { const x0 = b.x, y0 = b.y, z0 = b.z; fisicaBola(b, dt / 3); if (limites(x0, y0, z0)) return; if (contatos(x0, y0) && (b.dono || M.fase !== 'jogo')) return; }
      if (b.chute && hip(b.vx, b.vy) < 2) { fimChute(b.chute, 'fora'); b.chute = null; }
    }

    /* ---------------- Bola parada (lateral, escanteio, tiro de meta) ---------------- */
    const ESPERA = { lateral: 1.2, escanteio: 2.4, meta: 1.8, falta: 2.6, penalti: 4.5 };
    // Escanteio por função (no original era pela ordem do 4-3-3): quem cabeceia vai para a área, um fica para o contra-ataque
    const PRI_A = { ZAG: 0, ATA: 1, PON: 2, MEI: 3, VOL: 4, LAT: 5 }, PRI_D = { ZAG: 0, VOL: 1, LAT: 2, MEI: 3, PON: 4, ATA: 5 };
    const ESC_A = [[99, 0], [97.5, 4], [96, -4], [93.5, -4.5], [93.5, 4.5], [88, 0], [96, 22], [72, 0], [62, -12], [62, 12]];
    const ESC_D = [[2.5, -2.5], [2.5, 2.5], [5.5, -3], [5.5, 3], [9, 0], [8, -5], [8, 5], [12, -4], [12, 4], [38, 0]];
    function parar(tipo, T, x, y, op) {
      op = op || {};
      const b = bola; M.fase = 'parado'; b.dono = null; b.receptor = null; b.chute = null; b.cruz = false; b.desvioEsc = false; b.impedidos = null;
      for (const p of todos) { p.naMao = false; p.driblando = false; }
      const s = M.parado = { tipo, time: T, x, y, t: 0, espera: ESPERA[tipo], cobrador: null, jit: [], vaga: new Map(), indireta: !!op.indireta, barreira: null };
      for (let i = 0; i < 30; i++) s.jit.push(sorteia(-1.5, 1.5));
      const sai = { vx: b.vx, vy: b.vy }; // como a bola saiu (a tela deixa ela rolar para fora)
      b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0;
      const J = T.jogadores, maisPerto = filtro => { let m = null, dm = 1e9; for (const q of J) { if (!q.ativo || q.gol || q.caido > 0 || (filtro && !filtro(q))) continue; const d = hip(q.x - x, q.y - y); if (d < dm) { dm = d; m = q; } } return m; };
      const dGol = hip((T.dir > 0 ? CL : 0) - x, 34 - y), melhorEm = k => { let m = null; for (const q of J) if (emPe(q) && !q.gol && (!m || at(q, k) > at(m, k))) m = q; return m; };
      if (tipo === 'meta') s.cobrador = goleiro(T);
      else if (tipo === 'penalti') s.cobrador = (o.batedor && W.get(o.batedor(T.id))) || melhorEm('fin');
      else if (tipo === 'falta' && dGol < 30 && !op.indireta) s.cobrador = melhorEm('fin');
      else if (tipo === 'escanteio') s.cobrador = maisPerto(q => q.base.papel === 'PON' || q.base.papel === 'MEI') || maisPerto();
      else s.cobrador = maisPerto() || J.find(q => q.ativo);
      if (tipo === 'escanteio') {
        J.filter(q => q !== s.cobrador && !q.gol).sort((a, c) => PRI_A[a.base.papel] - PRI_A[c.base.papel]).forEach((q, k) => s.vaga.set(q, ESC_A[Math.min(k, ESC_A.length - 1)]));
        T.adv.jogadores.filter(q => !q.gol).sort((a, c) => PRI_D[a.base.papel] - PRI_D[c.base.papel]).forEach((q, k) => s.vaga.set(q, ESC_D[Math.min(k, ESC_D.length - 1)]));
      }
      if (s.cobrador && !emPe(s.cobrador)) s.cobrador = maisPerto() || s.cobrador;
      if (tipo === 'falta' && dGol < 32) s.barreira = T.adv.jogadores.filter(q => emPe(q) && !q.gol).sort((a, c) => hip(a.x - x, a.y - y) - hip(c.x - x, c.y - y)).slice(0, dGol < 24 ? 4 : 3); // barreira: os mais perto
      if (o.onStop) o.onStop(tipo, T.id, x, y, sai);
    }
    function alvoParado(p) {
      const s = M.parado, T = p.time, atq = T === s.time, tipo = s.tipo; p.vDes = 0.85;
      if (p === s.cobrador) { let ox = -T.dir * 0.8, oy = 0; if (tipo === 'lateral') { ox = 0; oy = s.y < 34 ? -0.5 : 0.5; } if (tipo === 'escanteio') { ox = s.x < 52 ? -0.5 : 0.5; oy = s.y < 34 ? -0.5 : 0.5; } TX = s.x + ox; TY = s.y + oy; p.vDes = 1; return; }
      if (p.gol) { if (tipo === 'penalti' && !atq) { TX = RX(T, 0.4); TY = 34; } else alvoGoleiro(p); return; }
      const jx = s.jit[(p.i * 2) % 30], jy = s.jit[(p.i * 2 + 1) % 30];
      if (tipo === 'penalti') { const S = s.time; TX = RX(S, 84.5 - (p.i % 3) * 2); TY = RY(S, 15 + p.i * 3.4 + (atq ? 0 : 1.7)); } // todos fora da área, atrás da bola
      else if (s.barreira && s.barreira.indexOf(p) >= 0) { const k = s.barreira.indexOf(p), n0 = s.barreira.length, gx = T.dir > 0 ? 0 : CL; let ux = gx - s.x, uy = 34 - s.y; const nn = hip(ux, uy) || 1; ux /= nn; uy /= nn;
        TX = s.x + ux * 9.3 - uy * (k - (n0 - 1) / 2) * 0.9; TY = s.y + uy * 9.3 + ux * (k - (n0 - 1) / 2) * 0.9; p.vDes = 1; TX = clamp(TX, 0.5, CL - 0.5); TY = clamp(TY, 0.5, CW - 0.5); return; }
      else if (tipo === 'escanteio' && s.vaga.has(p)) { const S = s.time, lado = RY(S, s.y) < 34 ? -1 : 1, e = s.vaga.get(p);
        if (atq) { TX = RX(S, e[0] + jx); TY = RY(S, 34 + lado * e[1] + jy); } else { TX = RX(T, e[0] + jx * 0.4); TY = RY(T, 34 + e[1] + jy * 0.4); } }
      else ancora(p, atq);
      if (!atq) { const r0 = tipo === 'lateral' ? 3 : tipo === 'meta' ? 0 : 9.3;
        if (r0) { let dx = TX - s.x, dy = TY - s.y, d = hip(dx, dy); if (d < r0) { if (d < 0.1) { dx = -T.dir; dy = 0; d = 1; } TX = s.x + dx / d * r0; TY = s.y + dy / d * r0; } }
        if (tipo === 'meta') { const S = s.time; if (RX(S, TX) < 18.5 && TY > 12 && TY < 56) TX = RX(S, 18.5); } }
      TX = clamp(TX, 0.5, CL - 0.5); TY = clamp(TY, 0.5, CW - 0.5);
    }
    function atualizarParado(dt) {
      const s = M.parado; s.t += dt; const c = s.cobrador;
      if (c && c.caido > 0) { s.t = Math.min(s.t, s.espera - 0.5); return; }
      if (!c || !c.ativo || !todos.includes(c)) { s.cobrador = s.tipo === 'meta' ? goleiro(s.time) : s.time.jogadores.find(q => q.ativo && !q.gol); return; }
      if (s.t < s.espera) return; const d = hip(c.x - s.x, c.y - s.y);
      if (d > 1.6 && s.t < s.espera + 4) return; if (d > 1.6) { c.x = s.x - c.time.dir * 0.8; c.y = s.y; }
      cobrar();
    }
    function cobrar() {
      const s = M.parado, p = s.cobrador, T = s.time, tipo = s.tipo; M.fase = 'jogo'; M.parado = null; const ops = [];
      const melhor = () => { let m = null; for (const q of ops) if (!m || q.u > m.u) m = q; return m; };
      if (tipo === 'lateral') { avaliarPasses(p, 0, ops, { max: 24, soCurto: true }); const m = melhor();
        if (m) passar(p, m.x, m.y, false, m.m, { maxVel: 13, vz: 3.2, semImp: true }); else passar(p, clamp(bola.x + T.dir * 10, 2, CL - 2), bola.y < 34 ? 6 : CW - 6, false, null, { maxVel: 12, vz: 3, semImp: true }); }
      else if (tipo === 'escanteio') { const curto = [...s.vaga.entries()].find(([q, e]) => q.time === T && e[1] === 22); if (R() < 0.15 && curto && emPe(curto[0])) passar(p, curto[0].x, curto[0].y, false, curto[0], { semImp: true }); else cruzar(p, { semImp: true }); }
      else if (tipo === 'meta') { avaliarPasses(p, 0, ops, { semImp: true }); const m = melhor(); if (m && m.u > 0.5 && R() < 0.8) passar(p, m.x, m.y, m.alto, m.m, { semImp: true }); else chutao(p); }
      else if (tipo === 'penalti') chutar(p, { penalti: true });
      else { const dGol = hip((T.dir > 0 ? CL : 0) - bola.x, 34 - bola.y); // falta: de frente e perto bate direto, no ataque cruza, senão toca
        if (!s.indireta && dGol < 29 && Math.abs(bola.y - 34) < 20 && R() < 0.6) chutar(p, { mult: 1.15, falta: true });
        else if (RX(T, bola.x) > 68) cruzar(p, {});
        else { avaliarPasses(p, 0, ops, {}); const m = melhor(); if (m) passar(p, m.x, m.y, m.alto, m.m, {}); else chutao(p); } }
      p.cdToque = 0.7;
    }

    /* ---------------- Um passo ---------------- */
    function passo() {
      clk += DT; const b = bola;
      if ((tEn -= DT) <= 0) { tEn = 1; elenco(); estilos(); medias(); for (const p of todos) p.e = clamp((o.en ? o.en(p.lp) : 100) / 100, 0.05, 1); }
      coletivo(DT);
      if (M.fase === 'parado') atualizarParado(DT);
      for (const p of todos) { if (!p.ativo) continue; if (p.caido > 0) p.caido -= DT; if (p.atord > 0) p.atord -= DT; if (p.cdToque > 0) p.cdToque -= DT; if (p.cdDes > 0) p.cdDes -= DT; pensar(p, DT); }
      if (M.fase === 'jogo' && b.dono) decidirDono(b.dono, DT);
      for (const p of todos) if (p.ativo) mover(p, DT);
      separar();
      if (M.fase === 'jogo') { moverBola(DT); if (M.fase === 'jogo') desarmes(); }
    }
    // Escreve no livesim onde cada um está (o desenho e o resto da tela leem de lá)
    function escrever(ball) {
      for (const p of todos) { const q = p.lp; q.x = q.tx = q.gx = p.x; q.y = q.ty = q.gy = p.y; q.vx = p.vx; q.vy = p.vy; q.fx = Math.cos(p.dir); q.fy = Math.sin(p.dir); q.sprint = 0; q.drib = 0; q.stun = p.atord > 0 ? p.atord : 0; }
      ball.x = bola.x; ball.y = bola.y; ball.z = bola.z; ball.owner = bola.dono ? bola.dono.lp : null; ball.fly = ball.loose = ball.carry = null;
      ball.b11shot = !!bola.chute;
    }
    const api = {
      bola, M,
      // A bola volta a rolar depois de uma parada do livesim (saída, falta, troca, pênalti): o cérebro pega de onde está
      entrar(ball) {
        elenco(); estilos(); medias(); tEn = 1;
        for (const p of todos) { p.x = p.lp.x; p.y = p.lp.y; p.vx = p.lp.vx || 0; p.vy = p.lp.vy || 0; p.atord = 0; p.caido = 0; p.mergulho = false; }
        // a nossa bola parada (lateral, escanteio, meta) que a troca interrompeu continua de onde estava
        if (M.fase === 'parado' && hip(ball.x - bola.x, ball.y - bola.y) < 1.5 && !ball.fly && !ball.owner) return;
        M.parado = null; M.fase = 'jogo'; bola.chute = null; bola.cruz = false; bola.desvioEsc = false; bola.receptor = null; bola.tSolta = 1;
        bola.x = clamp(ball.x, 0.3, CL - 0.3); bola.y = clamp(ball.y, 0.3, CW - 0.3); bola.z = 0; bola.vx = bola.vy = bola.vz = 0; bola.dono = null;
        const f = ball.fly;
        if (f && f.dur > 0) { // um toque do livesim no ar (saída, cobrança): vira bola de verdade com a mesma direção e tempo
          const tr = Math.max(0.25, (1 - Math.min(1, f.t || 0)) * f.dur), dx = f.x1 - bola.x, dy = f.y1 - bola.y, d = hip(dx, dy) || 0.01, ang = Math.atan2(dy, dx);
          const fr = f.from && W.get(f.from), to = f.to && W.get(f.to);
          if (f.loft || f.kind === 'cruz' || f.kind === 'longo') { bola.vx = Math.cos(ang) * d / tr; bola.vy = Math.sin(ang) * d / tr; bola.vz = G * tr / 2; }
          else { const v = clamp(BAL.velChegada * 0.8 + BAL.atritoK * d + BAL.atritoC * d / 14, 5, 27); bola.vx = Math.cos(ang) * v; bola.vy = Math.sin(ang) * v; }
          if (fr) { bola.ultimo = fr; bola.ultimoTime = fr.time; fr.cdToque = 0.5; } if (to && to.time === bola.ultimoTime) { bola.receptor = to; to.de = fr; to.deT = clk; }
          bola.tSolta = 0;
        } else if (ball.owner && W.get(ball.owner)) { const p = W.get(ball.owner); p.x = bola.x - Math.cos(p.dir) * 0.75; p.y = bola.y - Math.sin(p.dir) * 0.75; dominar(p); }
        else if (ball.loose) { bola.vx = ball.loose.vx || 0; bola.vy = ball.loose.vy || 0; }
        ball.fly = ball.loose = ball.carry = null;
      },
      // dt em segundos do campinho já na escala do cérebro
      passo(dt, ball) { if (M.fase === 'fora') return; acc += dt; let n = 0; while (acc >= DT && n++ < 12) { acc -= DT; passo(); if (M.fase === 'fora') break; } if (acc > DT) acc = 0; escrever(ball); },
      sair() { M.fase = 'fora'; M.parado = null; bola.dono = null; bola.chute = null; },
      parado: () => M.fase === 'parado',
      // o juiz espera: chute ou cruzamento no ar, bola perto de uma das áreas, escanteio para sair
      perigo: () => !!(bola.chute || bola.cruz || (M.fase === 'parado' && (M.parado.tipo === 'escanteio' || M.parado.tipo === 'penalti' || (M.parado.tipo === 'falta' && M.parado.barreira))) || (M.fase === 'jogo' && (bola.x < 20 || bola.x > CL - 20))),
      posse: () => (bola.dono ? bola.dono.time.id : bola.ultimoTime.id),
    };
    return api;
  };
})();
