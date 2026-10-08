// Interface — desafio "bata minha nota": no fim da carreira, um link com a pontuação para mandar a um amigo.
// Quem abre o link (?d=...) vê o desafio na tela inicial; no fim da própria carreira, o jogo compara as duas
// e oferece devolver o desafio. Tudo vai dentro do link (sem servidor); o desafio fica guardado no aparelho.
(function () {
  const U = window.CRAQUE_UI;
  const { D, G, esc, load, store } = U;
  const KEY = 'climbix-desafio';
  const GRADES = ['S', 'A', 'B', 'C', 'D'];

  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // n: nome do jogador, p: posição, s: pontos, g: nota, k: gols, t: títulos, b: Bolas de Ouro
  function encode(c, f) {
    return b64(JSON.stringify({ n: String(c.name).slice(0, 24), p: c.pos, s: f.score, g: f.grade, k: c.totals.goals || 0, t: f.titles || 0, b: c.totals.ballon || 0 }));
  }
  function decode(s) {
    try {
      const d = JSON.parse(unb64(String(s).slice(0, 400)));
      const int = (v, max) => Math.max(0, Math.min(max, Math.round(+v) || 0));
      if (!d || !GRADES.includes(d.g) || !D.POS[d.p]) return null;
      return { n: String(d.n || 'Alguém').slice(0, 24), p: d.p, s: int(d.s, 20000), g: d.g, k: int(d.k, 3000), t: int(d.t, 200), b: int(d.b, 25) };
    } catch (e) { return null; }
  }
  const base = () => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, ''));
  const pts = n => n.toLocaleString('pt-BR');
  const active = () => load(KEY);

  // Link com desafio: guarda e segue para a tela inicial (que mostra o desafio)
  function fromLink() {
    const q = new URLSearchParams(location.search).get('d');
    if (!q) return;
    const d = decode(q);
    history.replaceState(null, '', location.pathname);
    if (d) store(KEY, Object.assign(d, { at: Date.now() }));
  }

  // Cartão da tela inicial enquanto há desafio aberto
  function homeCard() {
    const d = active();
    if (!d || d.done) return '';
    return '<div class="card dz-home"><button class="dz-x" id="dz-x" aria-label="Descartar desafio">' + U.ICON.x + '</button>' +
      '<div class="dz-top">' + U.emo('🎯', 'md') + '<div><small>Desafio recebido</small><b>' + esc(d.n) + ' fez ' + pts(d.s) + ' pontos</b>' +
      '<span>Nota ' + d.g + ' · ' + D.POS[d.p].name.toLowerCase() + (d.b ? ' · ' + d.b + (d.b > 1 ? ' Bolas de Ouro' : ' Bola de Ouro') : '') + ' · ' + d.t + (d.t === 1 ? ' título' : ' títulos') + '</span></div></div>' +
      '<p>Consegue fazer uma carreira melhor? No fim, o jogo compara as duas.</p></div>';
  }
  function homeBind() {
    const x = document.getElementById('dz-x');
    if (x) x.onclick = () => { localStorage.removeItem(KEY); const c = document.querySelector('.dz-home'); if (c) c.remove(); };
  }

  // Fim de carreira: resultado do desafio (se havia um) e o botão de desafiar
  function finaleBox(c, f) {
    const d = active();
    let res = '';
    if (d && !d.done) {
      const diff = f.score - d.s;
      res = '<div class="card dz-res ' + (diff > 0 ? 'win' : 'lose') + '">' + U.emo(diff > 0 ? '🏆' : '😤', 'md') +
        '<div><small>Desafio de ' + esc(d.n) + '</small><b>' + (diff > 0 ? 'Você venceu por ' + pts(diff) + (diff === 1 ? ' ponto!' : ' pontos!') : diff === 0 ? 'Empate exato!' : 'Faltaram ' + pts(-diff) + (diff === -1 ? ' ponto' : ' pontos')) + '</b>' +
        '<span>' + pts(f.score) + ' (' + f.grade + ') contra ' + pts(d.s) + ' (' + d.g + ')' + (diff > 0 ? '. Devolva o desafio!' : '. Tente de novo ou desafie de volta.') + '</span></div></div>';
      if (diff > 0) store(KEY, Object.assign(d, { done: true }));
    }
    // Portal sem links para fora (CLIMBIX_SOLO): o desafio é um link, então não aparece
    if (window.CLIMBIX_SOLO) return res;
    return res + '<button class="btn ghost dz-btn" id="b-desafio">' + U.emo('🎯', 'sm') + ' Desafiar um amigo<small>Manda sua nota e vê se ele bate</small></button>';
  }
  function finaleBind(c, f) {
    const b = document.getElementById('b-desafio');
    if (!b) return;
    b.onclick = async () => {
      const url = base() + '?d=' + encode(c, f);
      const text = 'Fiz ' + pts(f.score) + ' pontos (nota ' + f.grade + ') com ' + c.name + ' no Climbix. Duvido você bater 😏';
      const old = b.innerHTML;
      try {
        if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(text + ' ' + url); b.innerHTML = 'Link copiado! Cole no WhatsApp'; setTimeout(() => { b.innerHTML = old; }, 2500); }
      catch (e) { prompt('Copie o link do desafio:', text + ' ' + url); }
    };
  }

  Object.assign(U, { challengeFromLink: fromLink, challengeHome: homeCard, challengeHomeBind: homeBind, challengeFinale: finaleBox, challengeFinaleBind: finaleBind, challengeEncode: encode, challengeDecode: decode });
})();
