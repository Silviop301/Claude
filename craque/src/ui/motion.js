// Interface — animações de momento (prévia aprovada em out/2026):
//  - U.scoreReveal(f, done): fim de carreira. As partes da pontuação entram uma a uma, o total corre, a nota troca
//    a cada faixa (D → C → B → A → S) e a última trava com um carimbo. ~2,8 s; um toque pula; fecha sozinho.
//  - U.transferMove(de, para, nome, done): escudo antigo sai e o novo entra com a cor do uniforme (~1,4 s).
//  - U.rankClimb(el, pontos): no fim da carreira, a posição na semana conta do fim da fila até a sua.
//  - U.riskRoll(p, ok, title, done): decisão arriscada. O ponteiro corre sobre a chance (verde = deu certo) e para
//    no resultado que o motor já sorteou (só mostra; não sorteia nada). ~1,2 s; um toque pula.
// Configuração "rápido" ou "reduzir movimento" do aparelho: sem animação (vai direto ao fim).
(function () {
  const U = window.CRAQUE_UI;
  const { S, esc } = U;
  const still = () => !!(U.cfg && U.cfg.fast) || matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      if (U.sfx) U.sfx(f.grade === 'S' || f.grade === 'A' ? 'goal' : 'whistle');
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
  function riskRoll(p, ok, title, done) {
    if (!(p > 0 && p < 1) || still()) return done();
    const pc = Math.round(p * 100);
    // Onde o ponteiro para: dentro da faixa do resultado que já saiu
    const v = ok ? p * (0.12 + Math.random() * 0.76) : p + (1 - p) * (0.12 + Math.random() * 0.76);
    const w = layer('mo-roll');
    w.innerHTML = '<div class="mo-rcard" role="dialog" aria-label="Sorteio da decisão"><h3>' + esc(title) + '</h3>' +
      '<div class="mo-meter"><div class="win" style="width:' + pc + '%">' + pc + '%</div><div class="lose">' + (100 - pc) + '%</div><i class="mo-needle"></i></div>' +
      '<div class="mo-legend"><span>Verde: deu certo</span><span>Vermelho: deu errado</span></div></div>';
    const needle = w.querySelector('.mo-needle');
    let raf = 0, over = false;
    const finish = () => {
      if (over) return; over = true; cancelAnimationFrame(raf); needle.style.left = (v * 100) + '%';
      w.classList.add(ok ? 'is-ok' : 'is-ko');
      setTimeout(() => { w.classList.add('out'); setTimeout(() => w.remove(), 200); done(); }, 380);
    };
    // Vai e volta pela faixa, cada vez mais devagar, e para em v
    const T = 1200, t0 = performance.now(), sweeps = 2.5;
    (function step(now) {
      const u = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - u, 3), ph = e * sweeps;
      const tri = ph % 2 < 1 ? ph % 1 : 1 - (ph % 1);
      needle.style.left = ((u < 1 ? tri * (1 - e) + v * e : v) * 100) + '%';
      if (u < 1) raf = requestAnimationFrame(step); else finish();
    })(t0);
    w.addEventListener('click', finish);
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

  Object.assign(U, { scoreReveal, riskRoll, transferMove, rankClimb });
})();
