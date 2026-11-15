// Interface — Chama do técnico (2026-11-15, jeito Duolingo, Silvio aprovou): dias seguidos jogando o Treinador.
// - O dia conta quando você termina um jogo seu (ao vivo ou Só resultado; o do auxiliar, com o app fechado, não conta).
// - Desafio do dia: um por dia, igual para todo mundo (sorteio pela data), vale 3 moedas.
// - Protetor de chama: 10 moedas, guarda até 2; faltou um dia, ele é gasto sozinho e a chama não apaga.
// - Marcos de 3, 7, 14, 30, 50 e 100 dias pagam moedas (uma vez por chama) e abrem a festa.
// Tudo fica no inventário (U.ITEMS, `inv.ch`), que vai para a nuvem; a junção de aparelhos está em `merge` abaixo
// e é chamada por U.ITEMS.merge. As moedas usam `once` com a data, então dois aparelhos nunca pagam duas vezes.
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;

  const FZ_COST = 10, FZ_MAX = 2, DC_COINS = 3;
  const MARCOS = [[3, 5], [7, 10], [14, 15], [30, 30], [50, 40], [100, 100]];
  const won = l => l.res === 'v';
  // Desafios que dá para cumprir em qualquer jogo do dia; o primeiro aparece mais vezes
  const DESAFIOS = [
    { id: 'v1', t: 'Vença um jogo', w: 3, add: l => (won(l) ? 1 : 0) },
    { id: 'sg', t: 'Vença sem levar gol', w: 2, add: l => (won(l) && l.ga === 0 ? 1 : 0) },
    { id: 'g3', t: 'Faça 3 gols hoje', n: 3, w: 2, add: l => l.gf || 0 },
    { id: 'g2', t: 'Faça 2 gols num jogo', w: 2, add: l => ((l.gf || 0) >= 2 ? 1 : 0) },
    { id: 'in2', t: 'Jogue 2 jogos sem perder', n: 2, w: 2, add: l => (l.res !== 'd' ? 1 : 0), cut: l => l.res === 'd' },
  ];

  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const shift = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const NOW = () => (U.chamaNow ? U.chamaNow() : new Date()); // as ferramentas de teste trocam o relógio

  // inv.ch = { d: {dia: jogos}, fb: {id: 1} protetores comprados, fu: {dia: 1} dias salvos por protetor, dc: {k, p, done} }
  const st = () => { const o = U.ITEMS.get(); o.ch = o.ch || {}; const c = o.ch; c.d = c.d || {}; c.fb = c.fb || {}; c.fu = c.fu || {}; return c; };
  const owned = c => Math.max(0, Object.keys(c.fb).length - Object.keys(c.fu).length);
  const counts = (c, k) => !!(c.d[k] || c.fu[k]);

  function desafio(now) {
    const k = dayKey(now || NOW()), tot = DESAFIOS.reduce((a, x) => a + x.w, 0);
    let r = hash('climbix-desafio-' + k) % tot;
    return DESAFIOS.find(x => (r -= x.w) < 0);
  }

  // Faltou dia(s) desde o último dia contado: gasta protetor se der para cobrir todos (a chama não apaga)
  function settle(now) {
    const c = st(), today = now || NOW();
    let d = shift(today, -1), gap = [];
    for (let i = 0; i < 400 && !counts(c, dayKey(d)); i++) { gap.push(dayKey(d)); d = shift(d, -1); }
    if (!gap.length || gap.length >= 400 || !counts(c, dayKey(d))) return 0;
    if (gap.length > owned(c)) return 0;
    gap.forEach(k => { c.fu[k] = 1; });
    U.ITEMS.put();
    return gap.length;
  }

  // Estado de hoje: n dias seguidos, se hoje já conta, começo da chama, protetores e o desafio
  function state(now) {
    const c = st(), today = now || NOW(), tk = dayKey(today), lit = !!c.d[tk];
    let d = lit ? today : shift(today, -1), n = 0, start = null;
    while (counts(c, dayKey(d))) { n++; start = dayKey(d); d = shift(d, -1); }
    const dc = desafio(today), prog = c.dc && c.dc.k === tk ? c.dc : { k: tk, p: 0 };
    const next = MARCOS.find(m => m[0] > n);
    return { n, lit, start, fz: owned(c), fzMax: FZ_MAX, dc, dp: prog.p || 0, dn: dc.n || 1, done: !!prog.done, next, late: today.getHours() >= 18 };
  }

  // Fim de um jogo do Treinador (profile.js coGame). Volta o que aconteceu para o aviso
  function game(log, aux) {
    if (aux || !log) return null;
    const now = NOW(), c = st(), tk = dayKey(now);
    settle(now);
    const first = !c.d[tk];
    c.d[tk] = (c.d[tk] || 0) + 1;
    Object.keys(c.d).sort().slice(0, -120).forEach(k => delete c.d[k]);
    Object.keys(c.fu).sort().slice(0, -120).forEach(k => delete c.fu[k]);
    // Desafio do dia
    const dc = desafio(now);
    if (!c.dc || c.dc.k !== tk) c.dc = { k: tk, p: 0 };
    let dcDone = false;
    if (!c.dc.done) {
      if (dc.cut && dc.cut(log)) c.dc.p = 0;
      else c.dc.p = Math.min(dc.n || 1, (c.dc.p || 0) + (+dc.add(log) || 0));
      if (c.dc.p >= (dc.n || 1)) { c.dc.done = true; dcDone = true; }
    }
    U.ITEMS.put();
    const s = state(now);
    let coins = 0;
    if (dcDone && U.COINS) coins += U.COINS.add({ n: DC_COINS, t: 'Desafio do dia', once: 'ch-dc-' + tk });
    const mk = first ? MARCOS.find(m => m[0] === s.n) : null;
    let marco = null;
    if (mk && U.COINS) { const got = U.COINS.add({ n: mk[1], t: 'Chama de ' + mk[0] + ' dias', once: 'ch-m' + mk[0] + '-' + s.start }); if (got) marco = { n: mk[0], c: mk[1] }; }
    return { first, n: s.n, dcDone, dc, coins, marco, s };
  }

  function buy() {
    const c = st();
    if (owned(c) >= FZ_MAX || !U.COINS || !U.COINS.spend(FZ_COST, 'Protetor de chama')) return false;
    c.fb['f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)] = 1;
    U.ITEMS.put();
    return true;
  }

  // Junção de dois aparelhos: união dos dias, dos protetores comprados e dos usados; o desafio do mesmo dia fica com o
  // que andou mais
  function merge(a, b) {
    if (!a || !b) return a || b || undefined;
    const u = k => Object.assign({}, a[k], b[k]);
    const d = u('d'); Object.keys(d).forEach(k => { d[k] = Math.max((a.d || {})[k] || 0, (b.d || {})[k] || 0); });
    let dc = a.dc || b.dc;
    if (a.dc && b.dc) dc = a.dc.k !== b.dc.k ? (a.dc.k > b.dc.k ? a.dc : b.dc) : { k: a.dc.k, p: Math.max(a.dc.p || 0, b.dc.p || 0), done: !!(a.dc.done || b.dc.done) };
    return { d, fb: u('fb'), fu: u('fu'), dc };
  }

  // ---------- desenho ----------
  const FLAME = (on, sz) => '<svg class="ch-fl' + (on ? ' on' : '') + '" width="' + sz + '" height="' + Math.round(sz * 1.12) + '" viewBox="0 0 24 26" aria-hidden="true"><path class="o" d="M12 1c1 5 7 7 7 14a7 7 0 0 1-14 0c0-4 2-6 3-8 1 3 2 4 3 4 0-4 0-7 1-10z"/><path class="i" d="M12 11c.6 3 4 4 4 7.5a4 4 0 0 1-8 0c0-2.3 1.2-3.5 1.8-4.7.6 1.7 1.2 2.3 1.8 2.3 0-2.3 0-3.5.4-5.1z"/></svg>';
  const SHIELD = on => '<svg class="ch-sh' + (on ? ' on' : '') + '" width="24" height="28" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 2l9 3v8c0 6-4 10-9 13-5-3-9-7-9-13V5z"/></svg>';
  const dias = n => n + (n === 1 ? ' dia' : ' dias');
  const seg = n => (n === 1 ? '1º dia da chama' : n + ' dias seguidos');

  // Cartão da home deitada (só para quem já tem carreira no Treinador)
  function homeCard() {
    settle();
    const s = state();
    const sub = s.lit ? (s.next ? 'Acesa hoje · marco de ' + s.next[0] + ' dias em ' + (s.next[0] - s.n) : 'Acesa hoje')
      : s.n ? (s.late ? 'Jogue uma rodada para não perder' : 'Jogue uma rodada hoje') : 'Jogue uma rodada para acender';
    const sh = [0, 1].map(i => SHIELD(i < s.fz)).join('');
    const dcTxt = s.done ? '<b class="ch-dc-t">' + esc(s.dc.t) + '</b><span class="ch-ok">Feito</span>'
      : '<b class="ch-dc-t">' + esc(s.dc.t) + (s.dn > 1 ? ' <small>' + s.dp + '/' + s.dn + '</small>' : '') + '</b><span class="ch-pz">' + U.COINS.svg + DC_COINS + '</span>';
    return '<div class="ch-card' + (s.lit ? ' lit' : s.n && s.late ? ' risk' : '') + '">' +
      '<div class="ch-top">' + FLAME(s.lit, 40) + '<div class="ch-n"><b>' + dias(s.n) + '</b><span>' + sub + '</span></div>' +
      '<button class="ch-shs" id="ch-fz" aria-label="Protetores de chama: ' + s.fz + ' de ' + FZ_MAX + '">' + sh + '</button></div>' +
      '<div class="ch-dc"><span class="ch-lb">Desafio do dia</span><div class="ch-dr">' + dcTxt + '</div></div></div>';
  }
  function homeBind(st0, back) {
    const b = st0.querySelector('#ch-fz'); if (!b) return;
    b.onclick = () => { U.sfx && U.sfx('tap'); fzInfo(back); };
  }
  function fzInfo(back) {
    const s = state(), full = s.fz >= FZ_MAX, saldo = U.COINS ? U.COINS.get() : 0;
    const msg = 'Se você faltar um dia, o protetor é gasto sozinho e a chama não apaga. Você tem ' + s.fz + ' de ' + FZ_MAX + '.';
    if (full || saldo < FZ_COST || !U.coinAsk) {
      const box = toastBox('<b>Protetor de chama</b><span>' + msg + (full ? '' : saldo < FZ_COST ? ' Custa ' + FZ_COST + ' moedas.' : '') + '</span>');
      return box;
    }
    U.coinAsk(FZ_COST, 'Protetor de chama', 'salva a chama se faltar um dia (' + s.fz + ' de ' + FZ_MAX + ')', () => { if (buy() && back) back(); });
  }
  function toastBox(inner) {
    if (typeof document === 'undefined') return null;
    document.querySelectorAll('.pay-ty.ch-t').forEach(e => e.remove());
    const box = document.createElement('div'); box.className = 'pay-ty ch-t'; box.setAttribute('role', 'status');
    box.innerHTML = inner + '<button aria-label="Fechar">OK</button>';
    document.body.appendChild(box); box.querySelector('button').onclick = () => box.remove();
    let left = 6000; const iv = setInterval(() => { if (!box.isConnected) return clearInterval(iv); if (!document.querySelector('.tc-ov') && (left -= 250) <= 0) { clearInterval(iv); box.remove(); } }, 250);
    return box;
  }

  // Aviso depois do jogo: festa do marco (tela cheia), desafio cumprido (janelinha) ou só "chama acesa" (aviso pequeno).
  // Espera a festa da taça/acesso sair da tela
  function notify(r) {
    if (!r || typeof document === 'undefined' || (!r.first && !r.dcDone && !r.marco)) return;
    const go = () => {
      if (document.querySelector('.tc-ov')) return setTimeout(go, 600);
      if (!r.marco && !r.dcDone) return toastBox('<b>' + FLAME(true, 18) + ' Chama acesa</b><span>' + seg(r.n) + (r.s.next ? ' · marco de ' + r.s.next[0] + ' em ' + (r.s.next[0] - r.n) : '') + '</span>');
      document.querySelectorAll('.ch-ov').forEach(e => e.remove());
      const ov = document.createElement('div');
      const ins = U.installCan && U.installCan() && r.n >= 2 ? '<p class="ch-ins">Instale o app para ter a chama sempre à mão.</p>' : '';
      if (r.marco) {
        const nx = MARCOS.find(m => m[0] > r.marco.n);
        ov.className = 'ch-ov ch-big';
        ov.innerHTML = '<div class="ch-in">' + FLAME(true, 92) + '<b class="ch-bn">' + dias(r.marco.n) + '</b><span class="ch-bs">' + esc(marcoTxt(r.marco.n)) + '</span>' +
          '<span class="ch-amt">' + U.COINS.svg + '+' + (r.marco.c + (r.dcDone ? DC_COINS : 0)) + '</span>' + ins + '<button class="hl-btn gold ch-go">Continuar</button>' +
          (nx ? '<small class="ch-nx">Próximo marco: ' + nx[0] + ' dias</small>' : '') + '</div>';
      } else {
        ov.className = 'ch-ov';
        ov.innerHTML = '<div class="ch-pop"><span class="ch-k">Desafio cumprido</span><b class="ch-bt">' + esc(r.dc.t) + '</b><span class="ch-amt">' + U.COINS.svg + '+' + DC_COINS + '</span>' +
          '<span class="ch-fr">' + FLAME(true, 18) + seg(r.n) + '</span><p>Amanhã tem desafio novo.</p>' + ins + '<button class="hl-btn gold ch-go">Pegar</button></div>';
      }
      document.body.appendChild(ov);
      U.sfx && U.sfx('coin');
      ov.querySelector('.ch-go').onclick = () => { U.sfx && U.sfx('tap'); ov.remove(); };
    };
    setTimeout(go, 400);
  }
  const marcoTxt = n => ({ 3: 'Três dias seguidos no comando', 7: 'Uma semana sem faltar no vestiário', 14: 'Duas semanas de casa cheia', 30: 'Um mês inteiro à beira do campo', 50: 'Cinquenta dias de prancheta', 100: 'Cem dias. Isso é coisa de técnico de verdade' })[n] || dias(n) + ' seguidos';

  U.CHAMA = { state, game, settle, buy, merge, desafio, homeCard, homeBind, notify, DESAFIOS, MARCOS, FZ_COST, FZ_MAX, DC_COINS, dayKey };
})();
