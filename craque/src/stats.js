// Contagem anônima: manda para climbix.app/api/stats.php só eventos sem identidade (o servidor soma por dia).
// O aparelho guarda sozinho o dia da primeira visita e se já mandou cada retorno; nada de id, conta ou IP.
// Eventos: first, d1, d7 e session (sozinhos, aqui); start, season e end vêm das telas por CLIMBIX_STAT(ev, modo, n, chave).
// Quem já jogava antes desta contagem não entra em first/d1/d7 (a linha de base é só de aparelhos novos).
(function () {
  if (typeof window === 'undefined') return;
  // Testes (localhost, ?e2e=) não enviam, a não ser com ?statlog=1
  const test = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]e2e=/.test(location.search);
  const off = test && !/[?&]statlog=1/.test(location.search);
  const API = window.CLIMBIX_STATS_API || (/climbix\.app$/.test(location.hostname) ? '/api/stats.php' : 'https://climbix.app/api/stats.php');
  const KEY = 'climbix-stats-v1';
  const MODE = { completa: 'jaj', rapida: 'rapida', relampago: 'relampago', treinador: 'treinador' };
  let last = '';
  function send(ev, mode, k) {
    if (off) return;
    const body = JSON.stringify({ ev, mode: mode || '', k: k == null ? '' : String(k) });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(API + '?a=hit', new Blob([body], { type: 'text/plain' }));
      else fetch(API + '?a=hit', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {});
    } catch (e) { /* sem rede: deixa para lá */ }
  }
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const put = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* sem espaço: deixa para lá */ } };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayNo = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };

  // Primeira visita e retornos
  (function visit() {
    let st = get();
    const t = today();
    if (!st || typeof st.f !== 'string') {
      // Aparelho que já tinha jogo salvo, perfil ou itens: jogava antes da contagem, fica fora da linha de base
      let old = false;
      try { for (let i = 0; i < localStorage.length; i++) if (/^(craque|climbix)-/.test(localStorage.key(i) || '')) { old = true; break; } } catch (e) { /* sem acesso */ }
      st = { f: t, old: old ? 1 : 0, seen: [] };
      put(st);
      if (!old) send('first');
      return;
    }
    if (st.old) return;
    const gap = dayNo(t) - dayNo(st.f);
    if (gap === 1 && !st.d1) { st.d1 = 1; put(st); send('d1'); }
    if (gap >= 7 && gap <= 13 && !st.d7) { st.d7 = 1; put(st); send('d7'); }
  })();

  // Carreira começou / temporada terminou / carreira terminou. A chave evita contar de novo a mesma tela (recarregar)
  window.CLIMBIX_STAT = (ev, mode, n, key) => {
    const m = MODE[mode] || mode || '';
    if (m) last = m;
    if (key) {
      const st = get() || { f: today(), old: 1, seen: [] }, id = ev + '|' + key;
      st.seen = Array.isArray(st.seen) ? st.seen : [];
      if (st.seen.includes(id)) return;
      st.seen.push(id); st.seen = st.seen.slice(-40); put(st);
    }
    send(ev, m, ev === 'season' ? n : '');
  };

  // Sessão: tempo com o jogo na tela, mandado quando ele sai da tela. Voltar depois de 30 min conta sessão nova
  let shown = Date.now(), acc = 0, sent = false, hiddenAt = 0;
  const band = ms => { const m = ms / 60000; return m < 1 ? '0-1' : m < 5 ? '1-5' : m < 10 ? '5-10' : m < 20 ? '10-20' : m < 40 ? '20-40' : '40+'; };
  const curMode = () => { const U = window.CRAQUE_UI, c = U && U.G && U.G.c; return c ? (c.mode === 'completa' ? 'jaj' : 'rapida') : last || 'inicio'; };
  function leave() {
    if (!shown) return;
    acc += Date.now() - shown; shown = 0; hiddenAt = Date.now();
    if (!sent) { sent = true; send('session', curMode(), band(acc)); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') return leave();
    if (hiddenAt && Date.now() - hiddenAt > 30 * 60000) { acc = 0; sent = false; last = ''; }
    shown = Date.now();
  });
  addEventListener('pagehide', leave);
})();
