// Interface — Domínio mundial: o mapa com a porcentagem das taças do jogo já ganhas em cada continente, somando
// todas as carreiras (a coleção da Sala de Troféus). A meta longa de "zerar o jogo"; só visual, não muda a carreira.
(function () {
  const U = window.CRAQUE_UI;
  const { $, esc, render, sfx } = U;

  // Continentes: países das ligas, copas continentais e o ponto onde fica a etiqueta no mapa (coordenadas do mapa)
  const CONT = [
    { id: 'sam', name: 'América do Sul', at: [126, 104], countries: ['Brasil', 'Argentina', 'Uruguai', 'Colômbia', 'Chile', 'Paraguai', 'Equador', 'Peru', 'Bolívia', 'Venezuela'], cups: ['Libertadores', 'Copa Sul-Americana'] },
    { id: 'nam', name: 'América do Norte', at: [86, 48], countries: ['EUA', 'México'], cups: ['Champions da Concacaf'] },
    { id: 'eur', name: 'Europa', at: [196, 30], countries: ['Portugal', 'Espanha', 'Inglaterra', 'Itália', 'Alemanha', 'França', 'Holanda', 'Turquia', 'Bélgica', 'Escócia', 'Grécia', 'Suíça', 'Áustria', 'Dinamarca', 'Croácia', 'Sérvia', 'Noruega', 'Suécia', 'Polônia', 'República Tcheca'], cups: ['Liga dos Campeões', 'Liga Europa', 'Liga Conferência'] },
    { id: 'afr', name: 'África', at: [200, 86], countries: ['Marrocos', 'Egito'], cups: ['Champions da África'] },
    { id: 'asi', name: 'Ásia e Oceania', at: [282, 50], countries: ['Arábia Saudita', 'Japão', 'Coreia do Sul', 'Catar', 'Austrália'], cups: ['Champions da Ásia'], also: ['oce'] },
  ];
  const WORLD = { id: 'mundo', name: 'Mundo', at: [38, 112], cups: ['Copa do Mundo', 'Mundial de Clubes', 'Copa Intercontinental', 'Bola de Ouro'] };

  // Taças de cada continente (pelo catálogo da Sala: ligas e copas de cada país, na ordem dela) e quantas já são suas
  let LIST = null;
  function lists() {
    if (LIST) return LIST;
    const cat = U.salaCat();
    LIST = CONT.concat([WORLD]).map(ct => {
      const groups = (ct.countries || []).map(n => cat.countries.find(p => p.name === n)).filter(Boolean)
        .map(p => ({ name: p.name, flag: p.flag, items: p.ligas.concat(p.copas) }));
      const cups = ct.cups.filter(k => cat.info[k]);
      if (cups.length) groups.push({ name: ct.id === 'mundo' ? 'Taças mundiais' : 'Copas continentais', items: cups });
      return Object.assign({}, ct, { groups, all: groups.flatMap(g => g.items) });
    });
    return LIST;
  }
  function score() {
    const n = U.salaCounts();
    const per = lists().map(ct => { const won = ct.all.filter(k => n[k]).length; return { ct, won, total: ct.all.length, pct: ct.all.length ? Math.round(won / ct.all.length * 100) : 0 }; });
    const won = per.reduce((a, x) => a + x.won, 0), total = per.reduce((a, x) => a + x.total, 0);
    return { per, n, won, total, pct: total ? Math.floor(won / total * 100) : 0 };
  }
  // Cor do continente: do verde do gramado ao ouro, conforme a porcentagem
  const fill = pct => 'color-mix(in srgb, var(--gold) ' + Math.round(pct * 0.85 + (pct ? 15 : 0)) + '%, #2C6B4A)';

  function mapSvg(sc, sel, mini) {
    const W = window.CRAQUE_WORLD;
    if (!W) return '';
    const by = {}; sc.per.forEach(x => { by[x.ct.id] = x; (x.ct.also || []).forEach(a => { by[a] = x; }); });
    const paths = Object.entries(W.d).map(([k, d]) => { const x = by[k]; const f = x ? fill(x.pct) : '#2C6B4A';
      return '<path d="' + d + '" fill="' + f + '" stroke="' + f + '" data-c="' + (x ? x.ct.id : '') + '"' + (x && x.ct.id === sel ? ' class="on"' : '') + '/>'; }).join('');
    // Etiquetas por cima de cada continente (no mini, nenhuma)
    const tags = mini ? '' : sc.per.filter(x => x.ct.at).map(x => '<g class="wd-tag' + (x.ct.id === sel ? ' on' : '') + '" data-c="' + x.ct.id + '" transform="translate(' + x.ct.at + ')">' +
      (x.ct.id === 'mundo' ? '<rect x="-34" y="-11" width="68" height="22" rx="6"/><text y="5">Mundo ' + x.pct + '%</text></g>' : '<rect x="-24" y="-11" width="48" height="22" rx="6"/><text y="5">' + x.pct + '%</text></g>')).join('');
    return '<svg class="wd-map' + (mini ? ' mini' : '') + '" viewBox="0 0 ' + W.w + ' ' + W.h + '" role="img" aria-label="Mapa do Domínio mundial">' + paths + tags + '</svg>';
  }

  // Botão da tela inicial: o mini mapa e a porcentagem total
  function homeHtml() {
    if (!U.salaCat || !window.CRAQUE_WORLD) return '';
    const sc = score();
    return '<button class="hg wd-home" id="b-world"><i>' + mapSvg(sc, null, true) + '</i><b>Domínio mundial · ' + sc.pct + '%</b><small>' + sc.won + ' de ' + sc.total + ' taças do jogo</small></button>';
  }
  function homeBind() { if ($('b-world')) $('b-world').onclick = () => open(); }

  function open(sel) {
    const again = !!sel, y = window.scrollY, sc = score();
    sel = sel || sc.per.filter(x => x.ct.id !== 'mundo').sort((a, b) => b.pct - a.pct)[0].ct.id; // abre no continente mais dominado
    const cur = sc.per.find(x => x.ct.id === sel);
    render(
      '<button class="back-link" id="wd-back">‹ ' + (U.backTo ? 'Voltar' : 'Início') + '</button>' +
      '<div class="wd-head"><h2>Domínio mundial</h2><b class="wd-pct">' + sc.pct + '%</b></div>' +
      '<p class="wd-sub">' + sc.won + ' de ' + sc.total + ' taças do jogo, somando todas as suas carreiras. Zere o mapa.</p>' +
      '<div class="wd-board">' + mapSvg(sc, sel) + '</div>' +
      // Continentes em lista (no celular as etiquetas do mapa ficam pequenas para tocar)
      '<div class="wd-tabs" role="tablist">' + sc.per.map(x => '<button role="tab" data-c="' + x.ct.id + '"' + (x.ct.id === sel ? ' class="on" aria-selected="true"' : '') + '><span>' + esc(x.ct.name) + '</span><b>' + x.won + '/' + x.total + '</b></button>').join('') + '</div>' +
      '<div class="wd-list">' + cur.ct.groups.map(g => '<div class="wd-grp"><div class="wd-gh">' + (g.flag ? U.flag(g.flag, 'sm') + ' ' : '') + esc(g.name) + '</div><div class="wd-items">' +
        g.items.map(k => '<div class="wd-it' + (sc.n[k] ? ' won' : '') + '"><img src="' + U.salaImg(k) + '" alt="" loading="lazy"><span>' + esc(k) + '</span>' + (sc.n[k] > 1 ? '<b>' + sc.n[k] + '×</b>' : '') + '</div>').join('') +
        '</div></div>').join('') + '</div>', { same: again }
    );
    if (again) window.scrollTo(0, y); // trocar de continente não volta a tela para o topo
    $('wd-back').onclick = () => U.goBack(); // do Perfil volta para ele; da tela inicial, para ela
    document.querySelectorAll('[data-c]').forEach(el => { if (el.dataset.c) el.onclick = () => { sfx('tap'); open(el.dataset.c); }; });
  }

  Object.assign(U, { worldMap: open, worldHome: homeHtml, worldHomeBind: homeBind });
})();
