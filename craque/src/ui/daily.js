// Interface — carreira do dia: a data vira a semente; todo mundo recebe o mesmo garoto e o mesmo sorteio.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, esc, load, store, $ } = U;
  const KEY = 'craque-daily-v1'; // { 'AAAA-MM-DD': melhor resultado do dia }

  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const shortDate = k => k.slice(8, 10) + '/' + k.slice(5, 7);

  // Mesmo dia → mesmo jogador (hash FNV-1a da data)
  function dailySpec(key) {
    let h = 2166136261;
    for (const ch of 'craque-' + key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const r = S.rng(h);
    const pos = r() < 0.5 ? 'ATA' : 'MEI';
    const foot = r() < 0.75 ? 'D' : 'E', country = r.pick(D.COUNTRIES).id;
    // Nome conforme a nacionalidade do garoto do dia
    return { seed: h, name: r.pick((D.DAILY_NAMES || {})[country] || D.NICKNAMES), pos, foot, country,
      number: r.pick(pos === 'ATA' ? [9, 7, 11, 19, 99] : [10, 8, 20, 17, 23]) };
  }

  function dailyStart() {
    const key = todayKey(), sp = dailySpec(key);
    G.c = S.newCareer(sp, sp.seed);
    G.c.daily = key;
    U.academy();
  }

  // Botão/cartão da tela inicial
  function dailyCard() {
    const key = todayKey(), sp = dailySpec(key), best = (load(KEY) || {})[key];
    const flag = (D.COUNTRIES.find(x => x.id === sp.country) || {}).flag || '';
    return '<button class="daily" id="b-daily"><span class="dl-seal">' + U.ICON['calendar-days'] + '</span><span class="dl-top">Carreira do dia · ' + shortDate(key) + '</span>' +
      '<b>' + esc(sp.name) + ' <span>' + U.flag(flag) + ' ' + (sp.pos === 'ATA' ? 'Atacante' : 'Meia') + ' · ' + sp.number + '</span></b>' +
      '<span class="dl-sub">' + (best ? 'Seu melhor hoje: nota ' + best.grade + ' · ' + best.score + ' pts' : 'Desafio de hoje: todos jogam com ele. Quem vai mais longe?') + '</span></button>';
  }

  // Fim de carreira do dia: guarda o melhor resultado e prepara o texto para compartilhar
  function dailyFinish(c, f) {
    if (!c.daily) return '';
    const all = load(KEY) || {}, prev = all[c.daily];
    const r = { score: f.score, grade: f.grade, verdict: f.verdict, goals: c.totals.goals, assists: c.totals.assists, titles: f.titles, ballon: c.totals.ballon, wc: c.totals.wc || 0 };
    const best = !prev || r.score > prev.score;
    if (best) { all[c.daily] = r; store(KEY, all); }
    const txt = 'Climbix do dia ' + shortDate(c.daily) + ' — ' + c.name + ': nota ' + r.grade + ' · ' + r.score + ' pts\n' +
      r.goals + ' gols · ' + r.assists + ' assist. · ' + r.titles + ' títulos' + (r.ballon ? ' · ' + r.ballon + ' Bola(s) de Ouro' : '') + (r.wc ? ' · campeão do mundo' : '') + '\n' + r.verdict;
    setTimeout(() => {
      const b = $('b-daily-share');
      if (b) b.onclick = async () => {
        try {
          if (navigator.share) { await navigator.share({ text: txt + '\n' + location.href }); return; }
          await navigator.clipboard.writeText(txt + '\n' + location.href);
          b.textContent = 'Copiado! Cole para os amigos';
        } catch (e) { /* cancelado */ }
      };
    }, 0);
    return '<div class="daily-res"><span class="dl-top">' + U.ICON['calendar-days'] + ' Carreira do dia · ' + shortDate(c.daily) + '</span>' +
      '<b>' + (best ? (prev ? 'Novo melhor do dia!' : 'Resultado do dia registrado') : 'Seu melhor hoje continua: ' + prev.score + ' pts') + '</b>' +
      '<button class="btn" id="b-daily-share">Compartilhar resultado do dia</button></div>';
  }

  Object.assign(U, { dailyStart, dailyCard, dailyFinish, dailySpec, todayKey });
})();
