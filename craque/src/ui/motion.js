// Interface — animações de momento (prévia aprovada em out/2026):
//  - U.scoreReveal(f, done): fim de carreira. As partes da pontuação entram uma a uma, o total corre, a nota troca
//    a cada faixa (D → C → B → A → S) e a última trava com um carimbo. ~2,8 s; um toque pula; fecha sozinho.
//  - U.transferMove(de, para, nome, done): escudo antigo sai e o novo entra com a cor do uniforme (~1,4 s).
//  - U.firstContract(c, done): primeiro contrato aos 16, com a assinatura do nome e o escudo carimbando (~2 s).
//  - U.callUp(c, call, done): lista da seleção abrindo por setor, com o seu nome em destaque (~2 s).
//  - U.rankClimb(el, pontos): no fim da carreira, a posição na semana conta do fim da fila até a sua.
//  - U.riskRoll(p, ok, title, done, roll): decisão arriscada. Roleta de 100 números com o verde do tamanho exato da
//    chance; gira e para no número que o motor já sorteou (só mostra; não sorteia nada). ~3 s; um toque pula.
// "Reduzir movimento" do aparelho: sem animação (vai direto ao fim).
(function () {
  const U = window.CRAQUE_UI;
  const { S, esc } = U;
  // Só "reduzir movimento" do aparelho desliga: o resumo rápido da temporada vale só para o resumo
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = cls => { const w = document.createElement('div'); w.className = 'mo-wrap ' + cls; document.body.appendChild(w); return w; };

  // ---------- Nota final ----------
  function scoreReveal(f, done) {
    if (!f || !f.parts || !f.parts.length || still()) return done && done();
    // Ordem: o que soma, depois o que desconta, e a despedida por último (é quando a nota costuma virar)
    const parts = f.parts.filter(p => p.v > 0 && p.k !== 'bonus').concat(f.parts.filter(p => p.v < 0), f.parts.filter(p => p.v > 0 && p.k === 'bonus'));
    const G = S.GRADES, bands = G.filter(([, m]) => m > 0), MAX = Math.max(f.score, bands[0][1]) * 1.1;
    const gradeOf = s => G.find(([, m]) => s >= m)[0];
    const w = layer('mo-score');
    w.innerHTML = '<div class="mo-card" role="dialog" aria-label="Nota da carreira">' +
      '<div class="mo-top"><div><small>Fim de carreira</small><b>Sua nota</b></div><div class="mo-stamp">' + G[G.length - 1][0] + '</div></div>' +
      '<div class="mo-total"><b>0</b><span>pontos</span></div>' +
      '<div class="mo-bar"><i></i>' + bands.map(([g, m]) => '<span class="mo-tick" data-m="' + m + '" style="left:' + (m / MAX * 100).toFixed(1) + '%"><em>' + g + '</em></span>').join('') + '</div>' +
      '<ul class="mo-parts">' + parts.map(p => '<li><span>' + esc(p.txt) + '</span><b' + (p.v < 0 ? ' class="neg"' : '') + '>' + (p.v < 0 ? '−' + -p.v : '+' + p.v) + '</b></li>').join('') + '</ul>' +
      '<div class="mo-verdict"></div><p class="mo-hint">Toque para pular</p></div>';
    const stamp = w.querySelector('.mo-stamp'), tot = w.querySelector('.mo-total b'), fill = w.querySelector('.mo-bar i');
    const ticks = [...w.querySelectorAll('.mo-tick')], lis = [...w.querySelectorAll('.mo-parts li')], verdict = w.querySelector('.mo-verdict');
    let cur = 0, target = 0, raf = 0, timers = [], ended = false, closed = false;
    const set = v => {
      tot.textContent = Math.round(v).toLocaleString('pt-BR');
      fill.style.width = Math.min(100, v / MAX * 100) + '%';
      ticks.forEach(t => t.classList.toggle('hit', v >= +t.dataset.m));
      const g = gradeOf(v);
      if (stamp.textContent !== g) { stamp.textContent = g; stamp.className = 'mo-stamp g-' + g; void stamp.offsetWidth; stamp.classList.add('bump'); }
    };
    const close = () => {
      if (closed) return; closed = true; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      w.classList.add('out'); setTimeout(() => w.remove(), 220); if (done) done();
    };
    const end = () => {
      if (ended) return; ended = true; timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
      lis.forEach(li => li.classList.add('in')); set(f.score);
      stamp.className = 'mo-stamp g-' + f.grade; void stamp.offsetWidth; stamp.classList.add('final');
      w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
      if (U.sfx) U.sfx(f.grade === 'S' || f.grade === 'A' ? 'cheer' : 'whistle');
      const i = G.findIndex(([g]) => g === f.grade), next = i > 0 ? G[i - 1] : null;
      verdict.innerHTML = 'Nota ' + f.grade + ' · ' + esc(f.verdict) + '<small>' + (next ? 'Faltaram ' + (next[1] - f.score) + ' pontos para a nota ' + next[0] + '.' : 'Nota máxima.') + '</small>';
      verdict.classList.add('in');
      w.querySelector('.mo-hint').textContent = 'Toque para ver a carta';
      timers.push(setTimeout(close, 2600));
    };
    const STEP = Math.max(140, Math.min(230, 2000 / parts.length)), LAST = 360;
    lis.forEach((li, i) => timers.push(setTimeout(() => {
      li.classList.add('in'); target += parts[i].v;
      if (i === lis.length - 1) timers.push(setTimeout(end, 420));
    }, 250 + i * STEP + (i === lis.length - 1 ? LAST : 0))));
    (function tick() { cur += (target - cur) * 0.22; if (Math.abs(target - cur) < 0.5) cur = target; set(cur); if (!ended) raf = requestAnimationFrame(tick); })();
    w.addEventListener('click', () => (ended ? close() : end()));
  }

  // ---------- Decisão arriscada ----------
  // Roleta com 100 números: o verde ocupa exatamente a chance (62% = números 1 a 62, 223° da roda) e o vermelho o resto.
  // O motor já sorteou o número (S.roll100); a roda gira e para nele, e o centro acende na cor que passa pelo ponteiro.
  function riskRoll(p, ok, title, done, roll) {
    const pc = S.pct(p);
    if (!(p > 0 && p < 1)) return done();
    const ring = () => U.sfx && U.sfx(ok ? 'levelup' : 'miss');
    if (still()) { ring(); return done(); }
    // Evento salvo antes do número existir: um número qualquer do lado que saiu
    const n = roll >= 1 && roll <= 100 ? roll : ok ? 1 + Math.floor(Math.random() * pc) : pc + 1 + Math.floor(Math.random() * (100 - pc));
    const deg = pc * 3.6, lbl = (txt, cls, mid) => '<span class="mo-wl ' + cls + '" style="--a:' + mid.toFixed(1) + 'deg">' + txt + '</span>';
    const w = layer('mo-roll');
    w.innerHTML = '<div class="mo-rcard" role="dialog" aria-label="Sorteio da decisão: ' + pc + '% de dar certo"><small class="mo-rk">Decisão arriscada</small><h3>' + esc(title) + '</h3>' +
      '<div class="mo-wbox"><i class="mo-pin"></i><div class="mo-wheel" style="--g:' + deg.toFixed(1) + 'deg">' +
      (pc >= 8 ? lbl(pc + '%', 'w', deg / 2) : '') + (pc <= 92 ? lbl((100 - pc) + '%', 'l', deg + (360 - deg) / 2) : '') + '</div>' +
      '<div class="mo-hub"><b>?</b></div></div>' +
      '<div class="mo-keys"><span class="w"><i></i>Verde: deu certo</span><span class="l"><i></i>Vermelho: deu errado</span></div>' +
      '<p class="mo-out" aria-live="polite"></p></div>';
    const wheel = w.querySelector('.mo-wheel'), hub = w.querySelector('.mo-hub'), num = hub.querySelector('b'), out = w.querySelector('.mo-out');
    // Ângulo final: o ponteiro (no topo) fica sobre a fatia do número n, num ponto qualquer dentro dela
    const at = (n - 1 + 0.2 + Math.random() * 0.6) * 3.6, END = 4 * 360 - at, T = 1900;
    const under = r => { const a = ((-r % 360) + 360) % 360; return Math.min(100, Math.floor(a / 3.6) + 1); };
    let raf = 0, over = false, last = 0, lastSeg = '';
    const show = r => {
      wheel.style.transform = 'rotate(' + r.toFixed(2) + 'deg)';
      wheel.style.setProperty('--rot', r.toFixed(2) + 'deg'); // os números da roda giram de volta e ficam sempre de pé
      const k = under(r), side = k <= pc ? 'w' : 'l';
      hub.className = 'mo-hub ' + side; // o centro acende na cor da fatia sob o ponteiro (o número fica só no motor)
      // Um "tic" a cada troca de cor e a cada 10 números (no máximo um a cada 70 ms)
      const seg = side + Math.floor((k - 1) / 10);
      if (U.sfx && seg !== lastSeg && performance.now() - last > 70) { U.sfx('tick'); last = performance.now(); }
      lastSeg = seg;
    };
    const finish = () => {
      if (over) return; over = true; cancelAnimationFrame(raf); show(END);
      w.classList.add(ok ? 'is-ok' : 'is-ko'); ring();
      num.textContent = ok ? '✓' : '✕';
      out.textContent = ok ? 'Deu certo!' : 'Deu errado';
      const t = setTimeout(close, 1100);
      w.onclick = () => { clearTimeout(t); close(); };
    };
    let closed = false;
    const close = () => { if (closed) return; closed = true; w.classList.add('out'); setTimeout(() => w.remove(), 200); done(); };
    const t0 = performance.now();
    (function step(now) {
      const u = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - u, 4);
      show(END * e);
      if (u < 1) raf = requestAnimationFrame(step); else finish();
    })(t0);
    // O mesmo clique que escolheu a opção (no computador ele chega depois que a roda abre) não pula a animação
    w.onclick = () => { if (performance.now() - t0 > 350) finish(); };
  }

  // ---------- Transferência ----------
  // O escudo antigo sai pela esquerda, o novo entra com a cor do uniforme (~1,4 s; um toque pula; fecha sozinho)
  function transferMove(fromId, toId, name, done) {
    const D = U.D, to = D.CLUB_BY_ID[toId], from = D.CLUB_BY_ID[fromId];
    if (!to || !from || fromId === toId || still()) return done && done();
    const REAL = window.CRAQUE_KITS_REAL || {}, K = window.CRAQUE_KITS || {};
    const kit = REAL[to.name] ? REAL[to.name] : K[toId] ? [K[toId][0], K[toId][1]] : ['#145235', '#FBF8EF'];
    const w = layer('mo-move');
    w.style.setProperty('--kit', kit[0]); w.style.setProperty('--kit2', kit[1]);
    w.innerHTML = '<div class="mo-mcard" role="dialog" aria-label="Transferência"><div class="mo-crests"><span class="mo-old">' + U.crest(fromId, 'xl') + '</span><span class="mo-arrow">›</span><span class="mo-new">' + U.crest(toId, 'xl') + '</span></div>' +
      '<small>Mercado da bola</small><b>' + esc(name) + ' é ' + D.do(esc(to.name)) + '!</b><span>Saiu ' + D.do(esc(from.name)) + '</span></div>';
    let over = false;
    const close = () => { if (over) return; over = true; w.classList.add('out'); setTimeout(() => w.remove(), 220); if (done) done(); };
    if (U.sfx) setTimeout(() => U.sfx('whistle'), 500);
    const t = setTimeout(close, 1900);
    w.addEventListener('click', () => { clearTimeout(t); close(); });
  }

  // ---------- Subida no ranking ----------
  // Fim de carreira: busca a posição da semana e conta do fim da fila até ela (~1 s). Sem rede ou fora do top, não mostra nada
  function rankClimb(el, score) {
    if (!el || !U.rankPlayer) return;
    const API = window.CLIMBIX_API || (/climbix\.app$/.test(location.hostname) ? '/api/rank.php' : 'https://climbix.app/api/rank.php');
    const pid = U.rankPlayer().pid;
    const ask = n => fetch(API + '?a=top&m=score&p=week&pid=' + encodeURIComponent(pid)).then(r => r.json()).then(d => {
      // O envio da carreira pode demorar uns segundos: tenta de novo até a pontuação desta carreira aparecer
      if (!d || !d.me || d.me.v < score) { if (n > 0) setTimeout(() => ask(n - 1), 2500); return; }
      if (d.me.v !== score) return; // a melhor da semana é outra carreira sua
      const rank = d.me.rank, from = Math.max(rank, d.players || rank);
      el.innerHTML = U.emo('📈', 'sm') + ' <span>Você está em</span> <b class="mo-rank">' + from + 'º</b> <span>no ranking da semana</span>';
      el.hidden = false;
      const num = el.querySelector('.mo-rank');
      if (still() || from === rank) { num.textContent = rank + 'º'; el.classList.add('done'); return; }
      const t0 = performance.now(), T = Math.min(1100, 120 * (from - rank) + 300);
      (function step(now) {
        if (!num.isConnected) return;
        const u = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - u, 3);
        num.textContent = Math.round(from - (from - rank) * e) + 'º';
        if (u < 1) requestAnimationFrame(step); else { el.classList.add('done'); if (rank <= 3 && U.sfx) U.sfx('levelup'); }
      })(t0);
    }).catch(() => {});
    ask(3);
  }

  // ---------- Primeiro contrato (16 anos) ----------
  // O contrato aparece, o nome é assinado da esquerda para a direita e o escudo do clube carimba (~2 s; um toque pula)
  function firstContract(c, done) {
    const D = U.D, cl = D.CLUB_BY_ID[c.club];
    if (!cl || still()) return done && done();
    const w = layer('mo-sign');
    const yrs = c.contract || 2;
    w.innerHTML = '<div class="mo-doc" role="dialog" aria-label="Primeiro contrato">' +
      '<small>Contrato profissional</small><b class="mo-doc-club">' + esc(cl.name) + '</b>' +
      '<ul><li><span>Atleta</span><b>' + esc(c.name) + '</b></li><li><span>Duração</span><b>' + yrs + (yrs > 1 ? ' anos' : ' ano') + '</b></li>' +
      '<li><span>Salário</span><b>R$ ' + U.money(c.wage || 0) + '/sem</b></li></ul>' +
      '<div class="mo-sigline"><span class="mo-sig" style="--sig:' + Math.max(26, Math.min(44, Math.round(560 / Math.max(8, c.name.length)))) + 'px">' + esc(c.name) + '</span></div><span class="mo-siglbl">Assinatura do atleta</span>' +
      '<span class="mo-seal">' + U.crest(c.club, 'xl') + '</span></div>' +
      '<p class="mo-welcome">Bem-vindo ' + D.ao(esc(cl.name)) + '!</p>';
    let over = false;
    const close = () => { if (over) return; over = true; w.classList.add('out'); setTimeout(() => w.remove(), 220); if (done) done(); };
    if (U.sfx) setTimeout(() => U.sfx('whistle'), 1500);
    const t = setTimeout(close, 3000);
    w.addEventListener('click', () => { clearTimeout(t); close(); });
  }

  // ---------- Convocação para a Copa ----------
  // A lista da seleção vai abrindo por setor e o seu nome entra em destaque no seu (~2 s; um toque pula)
  function callUp(c, call, done) {
    if (!call || !call.nation || still()) return done && done();
    const SECT = [['GOL', 'Goleiros'], ['ZAG', 'Defensores'], ['MEI', 'Meio-campistas'], ['ATA', 'Atacantes']];
    const w = layer('mo-call');
    w.innerHTML = '<div class="mo-list" role="dialog" aria-label="Convocação">' +
      '<div class="mo-list-h">' + U.flag(call.nation.flag, 'lg') + '<div><small>Lista de convocados</small><b>' + esc(call.nation.name || '') + '</b></div></div>' +
      SECT.map(([pos, lbl], k) => '<div class="mo-sect" style="--d:' + (0.25 + k * 0.32).toFixed(2) + 's"><span>' + lbl + '</span><div class="mo-names">' +
        [0, 1, 2].map(j => (pos === c.pos && j === 1 ? '<b class="mo-me">' + esc(c.name) + '</b>' : '<i style="width:' + (52 + ((k * 3 + j) * 17) % 38) + '%"></i>')).join('') + '</div></div>').join('') +
      '<div class="mo-callstamp">Convocado!</div></div>';
    let over = false;
    const close = () => { if (over) return; over = true; w.classList.add('out'); setTimeout(() => w.remove(), 220); if (done) done(); };
    if (U.sfx) setTimeout(() => U.sfx('levelup'), 1500);
    const t = setTimeout(close, 3200);
    w.addEventListener('click', () => { clearTimeout(t); close(); });
  }

  Object.assign(U, { scoreReveal, riskRoll, transferMove, rankClimb, firstContract, callUp });
})();
