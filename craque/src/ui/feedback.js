// Interface — opinião do jogador: nota, do que mais gostou, onde se perdeu, se indicaria e texto livre.
// Vai para climbix.app/api/feedback.php sem nome nem conta. Abre no fim da carreira (cartão no fim da tela)
// e nas Configurações. Sem internet, o rascunho fica guardado e dá para tentar de novo.
(function () {
  const U = window.CRAQUE_UI;
  const { G, esc, load, store } = U;
  const API = window.CLIMBIX_FEEDBACK_API || (/climbix\.app$/.test(location.hostname) ? '/api/feedback.php' : 'https://climbix.app/api/feedback.php');
  const KEY = 'climbix-opiniao';
  const st = () => load(KEY) || {};

  const RATES = [[1, '😖'], [2, '😕'], [3, '😐'], [4, '🙂'], [5, '🤩']];
  const LIKES = [['decisoes', 'Decisões'], ['lances', 'Lances'], ['rede', 'Rede social'], ['jornal', 'Jornal'],
    ['tacas', 'Taças'], ['ranking', 'Ranking'], ['cartas', 'Cartas'], ['copa', 'Copa do Mundo']];
  const RECS = [['sim', 'Sim'], ['talvez', 'Talvez'], ['nao', 'Não']];
  const ua = () => {
    const u = navigator.userAgent || '';
    const os = /Android [\d.]+/.exec(u) || /iPhone OS [\d_]+|iPad; CPU OS [\d_]+/.exec(u) || /Windows NT [\d.]+|Mac OS X [\d_]+|Linux/.exec(u);
    const br = /SamsungBrowser\/\d+|Edg\/\d+|OPR\/\d+|Firefox\/\d+|CriOS\/\d+|Chrome\/\d+|Version\/[\d.]+ (?:Mobile\/\w+ )?Safari/.exec(u);
    return ((br && br[0]) || '?') + ' · ' + ((os && os[0]) || '?');
  };

  // where: 'fim' (fim de carreira) ou 'config'; ctx: {pos, seasons, grade} da carreira que acabou
  function feedback(where, ctx, onSent) {
    ctx = ctx || {};
    document.querySelectorAll('.cfg-wrap').forEach(x => x.remove());
    const s = st();
    const d = Object.assign({ rate: 0, likes: [], lost: '', rec: '', more: '' }, s.draft || {});
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    const keep = () => { const o = st(); o.draft = d; store(KEY, o); };
    const close = () => { keep(); w.remove(); if (G.c) U.bar(); };
    const seg = (k, opts) => '<div class="seg fb-seg">' + opts.map(([v, l]) => '<button data-' + k + '="' + v + '"' + (d[k] === v ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>';
    w.innerHTML = '<div class="cfg fb" role="dialog" aria-modal="true" aria-label="Sua opinião">' +
      '<div class="cfg-head"><b>' + U.emo('💬', 'sm') + ' Sua opinião</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
      '<p class="lead small">Leva 1 minuto e me ajuda muito a melhorar o Climbix. Tudo é opcional e não vai seu nome.</p>' +
      '<div class="fb-q"><b>O que está achando do jogo?</b><div class="fb-rate">' +
        RATES.map(([v, e]) => '<button data-rate="' + v + '" aria-label="Nota ' + v + '"' + (d.rate === v ? ' class="on"' : '') + '>' + U.emo(e, 'md') + '</button>').join('') + '</div></div>' +
      '<div class="fb-q"><b>Do que você mais gostou?</b><small>Marque quantos quiser</small><div class="fb-likes">' +
        LIKES.map(([v, l]) => '<button data-like="' + v + '"' + (d.likes.includes(v) ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div></div>' +
      '<div class="fb-q"><label for="fb-lost"><b>Teve algo confuso ou chato? Em que momento?</b></label>' +
        '<textarea id="fb-lost" rows="3" maxlength="800" placeholder="Ex.: não entendi a escolha de clube, a temporada demorou…">' + esc(d.lost) + '</textarea></div>' +
      '<div class="fb-q"><b>Indicaria para um amigo?</b>' + seg('rec', RECS) + '</div>' +
      '<div class="fb-q"><label for="fb-more"><b>Mais alguma coisa?</b></label>' +
        '<textarea id="fb-more" rows="3" maxlength="1500" placeholder="Ideia, bug, o que faria você jogar de novo…">' + esc(d.more) + '</textarea></div>' +
      '<p class="fb-msg" id="fb-msg" role="status"></p>' +
      '<button class="btn" id="fb-send">Enviar</button>' +
      '<p class="cfg-credit">Sem nome, e-mail ou conta: só as respostas, a versão do jogo e o tipo de celular. <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p></div>';
    const $w = q => w.querySelector(q);
    const msg = (t, ok) => { const m = $w('#fb-msg'); m.textContent = t; m.className = 'fb-msg' + (ok ? ' ok' : ''); };
    w.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      d.rate = d.rate === +b.dataset.rate ? 0 : +b.dataset.rate;
      w.querySelectorAll('[data-rate]').forEach(x => x.classList.toggle('on', +x.dataset.rate === d.rate));
    });
    w.querySelectorAll('[data-like]').forEach(b => b.onclick = () => {
      const v = b.dataset.like, i = d.likes.indexOf(v);
      if (i >= 0) d.likes.splice(i, 1); else d.likes.push(v);
      b.classList.toggle('on', i < 0);
    });
    w.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
      d.rec = d.rec === b.dataset.rec ? '' : b.dataset.rec;
      w.querySelectorAll('[data-rec]').forEach(x => x.classList.toggle('on', x.dataset.rec === d.rec));
    });
    $w('#fb-lost').oninput = e => { d.lost = e.target.value; };
    $w('#fb-more').oninput = e => { d.more = e.target.value; };
    $w('#fb-send').onclick = () => {
      if (!d.rate && !d.likes.length && !d.lost.trim() && !d.rec && !d.more.trim()) return msg('Responda pelo menos uma pergunta.');
      const btn = $w('#fb-send');
      btn.disabled = true; msg('Enviando…', true);
      const body = JSON.stringify({ pid: U.rankPlayer ? U.rankPlayer().pid : '', rate: d.rate || 0, likes: d.likes, lost: d.lost.trim(), rec: d.rec, more: d.more.trim(),
        where, pos: ctx.pos || (G.c && G.c.pos) || '', seasons: ctx.seasons || (G.c ? G.c.seasons.length : 0), grade: ctx.grade || '', ver: window.CLIMBIX_VER || '', ua: ua() });
      fetch(API + '?a=send', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body })
        .then(r => r.json().then(j => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
          if (!ok) throw new Error(j && j.error === 'slow' ? 'slow' : 'net');
          const o = st(); delete o.draft; o.sent = (o.sent || 0) + 1; o.at = Date.now(); store(KEY, o);
          w.querySelector('.cfg').innerHTML = '<div class="cfg-head"><b>' + U.emo('💚', 'sm') + ' Valeu demais!</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
            '<p class="lead">Recebi sua opinião. Cada resposta é lida e ajuda a decidir o que muda no Climbix.</p><button class="btn" id="fb-ok">Voltar ao jogo</button>';
          const done = () => { w.remove(); if (G.c) U.bar(); if (onSent) onSent(); };
          w.querySelector('.cfg-x').onclick = done; w.querySelector('#fb-ok').onclick = done;
        })
        .catch(e => { btn.disabled = false; keep(); msg(e.message === 'slow' ? 'Calma! Espere um pouquinho e envie de novo.' : 'Não deu para enviar agora (sem internet?). Suas respostas ficam guardadas: tente de novo.'); });
    };
    w.querySelector('.cfg-x').onclick = close;
    w.onclick = e => { if (e.target === w) close(); };
    document.body.appendChild(w);
  }

  // ---------- Sua opinião deitada (2026-11-10, quadro 55) ----------
  // Aberta pelos Ajustes deitados, no palco U.LD: carinhas, do que mais gostou (assuntos do Treinador), se indicaria e um
  // campo só de texto (vai em `more`). O rascunho é o mesmo da tela em pé; enviado, mostra o agradecimento e volta
  const LIKES_CO = [['aovivo', 'Jogo ao vivo'], ['tatica', 'Tática'], ['mercado', 'Mercado'], ['treino', 'Treino'], ['financas', 'Finanças'], ['olheiro', 'Olheiro']];
  const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  function feedbackLand(back) {
    const out = () => (back || U.home)(), s = st();
    const d = Object.assign({ rate: 0, likes: [], lost: '', rec: '', more: '' }, s.draft || {});
    d.likes = d.likes.filter(v => LIKES_CO.some(l => l[0] === v));
    const keep = () => { const o = st(); o.draft = d; store(KEY, o); };
    const head = '<div class="tm-h"><button class="tcr-back" id="op-back" aria-label="Voltar">' + BK + '</button><b>Sua opinião</b><small>não vai seu nome</small></div>';
    const thanks = () => U.LD.show('<div class="op op-ty">' + head + '<div class="op-done"><b>Valeu demais!</b><span>Cada resposta é lida e ajuda a decidir o que muda no Climbix.</span><i></i><button class="op-go" id="op-ok">Voltar</button></div></div>',
      w => { w.querySelector('#op-back').onclick = w.querySelector('#op-ok').onclick = () => { U.sfx('tap'); out(); }; }, 'O Climbix é jogado com o celular deitado.');
    U.LD.show('<div class="op">' + head +
      '<div class="op-l"><span class="op-lb">O QUE ESTÁ ACHANDO?</span><div class="op-fc">' + RATES.map(([v, e]) => '<button class="op-f' + (d.rate === v ? ' on' : '') + '" data-rate="' + v + '" aria-label="Nota ' + v + ' de 5" aria-pressed="' + (d.rate === v) + '">' + U.emo(e, 'md') + '</button>').join('') + '</div>' +
        '<span class="op-lb">DO QUE MAIS GOSTOU?</span><div class="op-ch">' + LIKES_CO.map(([v, l]) => '<button class="op-c' + (d.likes.includes(v) ? ' on' : '') + '" data-like="' + v + '" aria-pressed="' + d.likes.includes(v) + '">' + l + '</button>').join('') + '</div>' +
        '<span class="op-lb">INDICARIA PARA UM AMIGO?</span><div class="op-seg">' + RECS.map(([v, l]) => '<button class="op-s' + (d.rec === v ? ' on' : '') + '" data-rec="' + v + '" aria-pressed="' + (d.rec === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="op-card"><label class="op-lb2" for="op-more">QUER CONTAR MAIS?</label><textarea id="op-more" maxlength="1500" placeholder="Algo confuso, chato ou que faltou? Uma ideia?">' + esc(d.more) + '</textarea>' +
        '<p class="op-msg" id="op-msg" role="status"></p><button class="op-go" id="op-send">Enviar</button></div></div>',
      w => {
        const q = x => w.querySelector(x), all = x => w.querySelectorAll(x);
        const mark = (sel, on) => all(sel).forEach(b => { const y = on(b); b.classList.toggle('on', y); b.setAttribute('aria-pressed', y); });
        const msg = (t, ok) => { const m = q('#op-msg'); m.textContent = t; m.className = 'op-msg' + (ok ? ' ok' : ''); };
        q('#op-back').onclick = () => { U.sfx('tap'); keep(); out(); };
        all('[data-rate]').forEach(b => b.onclick = () => { U.sfx('tap'); d.rate = d.rate === +b.dataset.rate ? 0 : +b.dataset.rate; mark('[data-rate]', x => +x.dataset.rate === d.rate); keep(); });
        all('[data-like]').forEach(b => b.onclick = () => { U.sfx('tap'); const v = b.dataset.like, i = d.likes.indexOf(v); if (i >= 0) d.likes.splice(i, 1); else d.likes.push(v); mark('[data-like]', x => d.likes.includes(x.dataset.like)); keep(); });
        all('[data-rec]').forEach(b => b.onclick = () => { U.sfx('tap'); d.rec = d.rec === b.dataset.rec ? '' : b.dataset.rec; mark('[data-rec]', x => x.dataset.rec === d.rec); keep(); });
        q('#op-more').oninput = e => { d.more = e.target.value; };
        q('#op-more').onblur = keep;
        q('#op-send').onclick = () => {
          if (!d.rate && !d.likes.length && !d.lost.trim() && !d.rec && !d.more.trim()) return msg('Responda pelo menos uma pergunta.');
          const btn = q('#op-send'); btn.disabled = true; msg('Enviando…', true);
          const body = JSON.stringify({ pid: U.rankPlayer ? U.rankPlayer().pid : '', rate: d.rate || 0, likes: d.likes, lost: d.lost.trim(), rec: d.rec, more: d.more.trim(),
            where: 'config', pos: '', seasons: 0, grade: '', ver: window.CLIMBIX_VER || '', ua: ua() });
          fetch(API + '?a=send', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body })
            .then(r => r.json().then(j => ({ ok: r.ok, j })))
            .then(({ ok, j }) => { if (!ok) throw new Error(j && j.error === 'slow' ? 'slow' : 'net');
              const o = st(); delete o.draft; o.sent = (o.sent || 0) + 1; o.at = Date.now(); store(KEY, o); thanks(); })
            .catch(e => { btn.disabled = false; keep(); msg(e.message === 'slow' ? 'Calma! Espere um pouquinho e envie de novo.' : 'Não deu para enviar agora. Suas respostas ficam guardadas.'); });
        };
        if (U.LD.lift) U.LD.lift(w.querySelector('.op'));
      }, 'O Climbix é jogado com o celular deitado.');
  }

  // Cartão do fim de carreira: chama mais na primeira vez; depois de responder, vira só um link discreto
  function feedbackCard() {
    const sent = st().sent;
    return '<div class="card fb-card' + (sent ? ' done' : '') + '"><div>' + U.emo('💬', 'sm') + '<b>' + (sent ? 'Algo novo para contar?' : 'O que achou do Climbix?') + '</b>' +
      '<span>' + (sent ? 'Pode mandar outra opinião quando quiser.' : '1 minuto, sem nome. Me ajuda a melhorar o jogo.') + '</span></div>' +
      '<button class="btn' + (sent ? ' ghost' : '') + '" id="b-feedback">Dar opinião</button></div>';
  }

  // Botão da tela inicial: destacado (borda dourada) até a primeira resposta
  function feedbackHome() {
    const sent = st().sent;
    return '<button class="hg fb-home' + (sent ? ' done' : '') + '" id="b-opiniao"><i>' + U.emo('💬', 'md') + '</i><b>Dar opinião</b><small>' +
      (sent ? 'Valeu! Mande outra quando quiser' : '1 minuto · me ajuda a melhorar o jogo') + '</small></button>';
  }

  Object.assign(U, { feedback, feedbackLand, feedbackCard, feedbackHome });
})();
