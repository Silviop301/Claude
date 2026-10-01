// Interface — álbum do fim de carreira: uma "história" (estilo stories) com uma tela por temporada
// (carta daquele ano, recorte de jornal e números), as cartas especiais no meio e, no fim, a curva da
// carreira com a carta final. Avança sozinho; toque à direita avança, à esquerda volta.
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, esc, YEAR0 } = U;
  const STEP_MS = 3600;

  // Temporadas antigas (salvas antes do álbum) não guardavam os atributos: estima pela nota do ano
  function attrsOf(c, s) {
    if (s.attrs) return s.attrs;
    const base = c.peakAttrs || c.attrs, k = s.ovr1 / Math.max(1, c.peak);
    const out = {};
    for (const a in base) out[a] = Math.round(base[a] * k);
    return out;
  }
  const poseOf = s => (s.titles.length || s.awards.some(a => a.id === 'ballon') ? 'taca' : s.injury >= 25 ? 'maca' : s.games && s.rating >= 7.3 ? 'celebra' : s.games && s.rating < 6.3 ? 'triste' : 'normal');
  function chipsOf(c, s) {
    const main = c.pos === 'GOL' ? [s.cleanSheets + ' sem sofrer gol'] : c.pos === 'ZAG' ? [s.goals + ' gols', s.cleanSheets + ' sem sofrer gol'] : [s.goals + ' gols', s.assists + ' assist.'];
    return [s.games + ' jogos'].concat(main, s.titles.map(t => '🏆 ' + t.name));
  }

  // Monta a lista de telas: temporadas, cartas especiais (logo depois da temporada em que vieram) e o final
  function frames(c) {
    const out = [];
    c.seasons.forEach((s, i) => {
      out.push({ kind: 'season', i, s });
      (c.cards || []).filter(k => k.season === i).forEach(k => out.push({ kind: 'special', card: k }));
    });
    // Cartas que vieram depois da última temporada (ex.: Copa no último ano)
    (c.cards || []).filter(k => k.season >= c.seasons.length).forEach(k => out.push({ kind: 'special', card: k }));
    out.push({ kind: 'end' });
    return out;
  }

  // Curva da nota ao longo da carreira, marcando os clubes (só as passagens mais longas, para não poluir)
  function chart(c) {
    const ss = c.seasons, n = ss.length, W = 300, H = 150;
    if (!n) return '';
    const vals = ss.map(s => s.ovr1), lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4;
    const x = i => 14 + (n > 1 ? i * (W - 28) / (n - 1) : (W - 28) / 2), y = v => H - 12 - (v - lo) * (H - 44) / Math.max(1, hi - lo);
    const starts = ss.map((s, i) => (i === 0 || ss[i - 1].club !== s.club ? i : -1)).filter(i => i >= 0);
    const len = i => { let j = i; while (j + 1 < n && ss[j + 1].club === ss[i].club) j++; return j - i + 1; };
    // Passagens mais longas primeiro; pula a que ficaria em cima de outra
    const marks = [];
    starts.filter(i => len(i) >= 2 || i === 0).sort((a, b) => len(b) - len(a)).forEach(i => { if (marks.length < 5 && marks.every(j => Math.abs(x(j) - x(i)) > 72)) marks.push(i); });
    marks.sort((a, b) => a - b);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="al-chart"><polyline fill="none" stroke="#F4D675" stroke-width="3" stroke-linejoin="round" points="' + vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '"/>' +
      marks.map((i, k) => '<circle cx="' + x(i) + '" cy="' + y(vals[i]) + '" r="4.5" fill="#fff"/><text x="' + x(i) + '" y="' + (y(vals[i]) + (k % 2 ? 18 : -9)) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + esc(D.CLUB_BY_ID[ss[i].club].name) + '</text>').join('') + '</svg>';
  }

  function album(c, f, finalCard) {
    const list = frames(c);
    const wrap = document.createElement('div');
    wrap.className = 'album';
    document.body.appendChild(wrap);
    let idx = 0, timer = null;

    function show(k) {
      idx = Math.max(0, Math.min(list.length - 1, k));
      clearTimeout(timer);
      const fr = list[idx];
      const prog = '<div class="al-prog">' + list.map((_, i) => '<i class="' + (i < idx ? 'on' : i === idx ? 'now' : '') + '"></i>').join('') + '</div>';
      let body = '';
      if (fr.kind === 'season') {
        const s = fr.s, cl = D.CLUB_BY_ID[s.club];
        body = '<div class="al-t">' + (YEAR0 + fr.i) + ' · ' + s.age + ' anos</div>' +
          '<div class="al-card"><canvas></canvas></div>' +
          '<div class="al-clip"><span>' + U.PAPERS[(fr.i * 7) % U.PAPERS.length].name + '</span><b>' + esc(s.headlines[0]) + '</b>' + U.photo(poseOf(s), U.kitOf(cl.id), c) + '</div>' +
          '<div class="al-chips">' + chipsOf(c, s).map(x => '<em>' + esc(x).replace('🏆', U.emo('🏆', 'xs')) + '</em>').join('') + '</div>';
      } else if (fr.kind === 'special') {
        body = '<div class="al-t">Carta especial</div><div class="al-card big"><canvas></canvas></div>' +
          '<div class="al-chips"><em>' + esc(U.SPECIAL_NAME[fr.card.type]) + '</em></div>';
      } else {
        body = '<div class="al-t">A carreira inteira</div>' + chart(c) +
          '<div class="al-card small"><canvas></canvas></div>' +
          '<div class="al-chips"><em>' + c.seasons.length + ' temporadas</em>' + U.careerStatsOf(c).map(([v, l]) => '<em>' + v + ' ' + l.toLowerCase() + '</em>').join('') + '<em>' + f.titles + (f.titles === 1 ? ' título' : ' títulos') + '</em><em>Nota ' + f.grade + '</em></div>' +
          '<button class="btn al-share" id="al-share">Compartilhar a história</button>';
      }
      wrap.innerHTML = prog + '<button class="al-x" aria-label="Fechar">✕</button>' + body;
      const cv = wrap.querySelector('canvas');
      if (fr.kind === 'season') window.CRAQUE_CARD(cv, U.cardData(c, { ovr: fr.s.ovr1, attrs: attrsOf(c, fr.s), club: fr.s.club, age: fr.s.age }));
      else if (fr.kind === 'special') window.CRAQUE_CARD(cv, U.cardData(c, fr.card));
      else window.CRAQUE_CARD(cv, finalCard);
      wrap.querySelector('.al-x').onclick = e => { e.stopPropagation(); close(); };
      const sh = wrap.querySelector('#al-share');
      if (sh) sh.onclick = async e => { e.stopPropagation(); sh.textContent = 'Preparando…'; const r = await window.CRAQUE_SHARE(await storyImage(c, f, finalCard), c.name + '-historia'); sh.textContent = r === 'download' ? 'Imagem salva' : 'Compartilhar a história'; };
      if (fr.kind !== 'end') timer = setTimeout(() => show(idx + 1), fr.kind === 'special' ? STEP_MS * 0.8 : STEP_MS);
    }
    function close() {
      clearTimeout(timer);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 250);
    }
    wrap.onclick = e => {
      if (e.target.closest('button')) return;
      const r = wrap.getBoundingClientRect();
      show(e.clientX - r.left < r.width * 0.33 ? idx - 1 : idx + 1);
    };
    show(0);
  }

  // Imagem para compartilhar (formato stories, 1080x1920): curva, carta final e cartas especiais
  async function storyImage(c, f, finalCard) {
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1920;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(540, 600, 100, 540, 900, 1300);
    g.addColorStop(0, '#1D4430'); g.addColorStop(1, '#071510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    const DISPLAY = "'Twemoji Country Flags', 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.textAlign = 'center'; ctx.fillStyle = '#F4D675';
    ctx.font = '800 76px ' + DISPLAY; ctx.fillText('A HISTÓRIA DE ' + c.name.toUpperCase(), 540, 130, 980);
    ctx.fillStyle = '#CFE0D4'; ctx.font = '600 36px ' + DISPLAY;
    ctx.fillText('16 a ' + c.age + ' anos · ' + YEAR0 + '–' + (YEAR0 + c.seasons.length) + ' · nota ' + f.grade, 540, 185);
    // Curva
    const ss = c.seasons, n = ss.length;
    if (n) {
      const vals = ss.map(s => s.ovr1), lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4;
      const x = i => 90 + (n > 1 ? i * 900 / (n - 1) : 450), y = v => 600 - (v - lo) * 340 / Math.max(1, hi - lo);
      ctx.strokeStyle = '#F4D675'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
      ctx.beginPath(); vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '600 30px ' + DISPLAY;
      ss.forEach((s, i) => { if (i === 0 || ss[i - 1].club !== s.club) { ctx.beginPath(); ctx.arc(x(i), y(vals[i]), 11, 0, Math.PI * 2); ctx.fill(); } });
      const peakI = vals.indexOf(Math.max(...vals));
      ctx.fillText('pico ' + vals[peakI] + ' · ' + D.CLUB_BY_ID[ss[peakI].club].name, x(peakI), y(vals[peakI]) - 26, 420);
    }
    // Carta final
    const fc = document.createElement('canvas');
    await window.CRAQUE_CARD(fc, finalCard);
    ctx.drawImage(fc, 290, 660, 500, 717);
    // Números
    ctx.fillStyle = '#fff'; ctx.font = '700 40px ' + DISPLAY;
    const nums = [c.seasons.length + ' temporadas'].concat(U.careerStatsOf(c).map(([v, l]) => v + ' ' + l.toLowerCase()), [f.titles + ' títulos']);
    ctx.fillText(nums.join(' · '), 540, 1450, 1000);
    // Cartas especiais (até 5, as mais raras primeiro)
    // Cartas sem lugar na lista ficam por último (sem isso a comparação dava NaN e a ordem saía ao acaso)
    const rank = { bola: 0, copa: 1, heroi: 2, tots: 3 };
    const rk = t => (rank[t] !== undefined ? rank[t] : 9);
    const sp = (c.cards || []).slice().sort((a, b) => rk(a.type) - rk(b.type)).slice(0, 5);
    const w = 180, h = 258, gap = 18, x0 = 540 - (sp.length * w + (sp.length - 1) * gap) / 2;
    for (let i = 0; i < sp.length; i++) {
      const sc = document.createElement('canvas');
      await window.CRAQUE_CARD(sc, U.cardData(c, sp[i]));
      ctx.drawImage(sc, x0 + i * (w + gap), 1500, w, h);
    }
    ctx.fillStyle = '#F4D675'; ctx.font = '800 44px ' + DISPLAY; ctx.fillText('CLIMBIX', 540, 1860);
    return cv;
  }

  Object.assign(U, { album });
})();
