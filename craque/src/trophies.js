// Taças: imagem da taça real quando existe (craque/trophies, via tools/craque_trophies.py);
// senão, a taça desenhada aqui (SVG próprio) — ex.: Bola de Ouro, US Open Cup, Copa MX.
// Tipos: league (liga), cup (copa nacional), ucl (Liga dos Campeões), lib (Libertadores), ballon (Bola de Ouro), wc (Copa do Mundo).
(function (root) {
  const INK = '#13201A';
  const defs =
    '<defs>' +
    '<linearGradient id="tg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE68A"/><stop offset=".5" stop-color="#F2C230"/><stop offset="1" stop-color="#B98700"/></linearGradient>' +
    '<linearGradient id="tg-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#C9D2DA"/><stop offset="1" stop-color="#8793A0"/></linearGradient>' +
    '</defs>';

  const base = (fill) =>
    '<path d="M22 52h20v6H22z" fill="' + INK + '"/><path d="M26 46h12v6H26z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';

  const SHAPES = {
    // Taça de liga: bojo largo com duas alças
    league: g =>
      '<path d="M18 10h28v10c0 10-6 17-14 17S18 30 18 20z" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M18 14h-6c0 8 4 12 8 13M46 14h6c0 8-4 12-8 13" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M29 37h6v9h-6z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' + base(g) +
      '<path d="M24 14c0 6 2 10 5 12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>',
    // Copa nacional: taça alta com tampa
    cup: g =>
      '<circle cx="32" cy="6" r="3" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M24 10h16v4H24z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M22 14h20l-3 18c-1 4-4 6-7 6s-6-2-7-6z" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M30 38h4v8h-4z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' + base(g) +
      '<path d="M26 17l2 12" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>',
    // "Orelhuda": alças enormes
    ucl: g =>
      '<path d="M20 12h24v10c0 9-5 15-12 15s-12-6-12-15z" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M20 12C6 10 5 30 22 30M44 12c14-2 15 18-2 18" fill="none" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M20 12C6 10 5 30 22 30M44 12c14-2 15 18-2 18" fill="none" stroke="' + g + '" stroke-width="3"/>' +
      '<path d="M29 37h6v9h-6z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' + base(g) +
      '<path d="M25 15c0 6 2 10 5 12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>',
    // Taça alta com bola no topo
    lib: g =>
      '<circle cx="32" cy="9" r="6" fill="#fff" stroke="' + INK + '" stroke-width="2"/><path d="M28 7l4-2 4 2-1 4h-6z" fill="' + INK + '"/>' +
      '<path d="M24 16h16l-2 16c-1 3-3 5-6 5s-5-2-6-5z" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M29 37h6v9h-6z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' + base(g),
    // Bola de Ouro
    ballon: g =>
      '<circle cx="32" cy="24" r="17" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M32 14l6 4-2 7h-8l-2-7z" fill="#B98700" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M26 32l6 5 6-5" fill="none" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M22 18c2-4 5-6 8-7" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M26 41h12v5H26z" fill="' + g + '" stroke="' + INK + '" stroke-width="2"/>' + base(g),
  };
  // Copa do Mundo (desenho próprio): corpo em espiral segurando um globo, anéis verdes na base
  SHAPES.wc = g =>
    '<path d="M25 47c-4-7-5-13-1-19 2-3 5-4 5-8h6c0 4 3 5 5 8 4 6 3 12-1 19z" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M28 44c-2-5-2-10 1-14M36 44c2-5 2-10-1-14" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-opacity=".6"/>' +
    '<circle cx="32" cy="13" r="10" fill="' + g + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M22.5 13h19M32 3.2c-5 5-5 14.6 0 19.6M32 3.2c5 5 5 14.6 0 19.6" fill="none" stroke="' + INK + '" stroke-width="1.3" stroke-opacity=".7"/>' +
    '<path d="M26 8c2-2 4-3 6-3" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M22 47h20v11H22z" fill="' + INK + '"/><path d="M22 49.5h20M22 54.5h20" stroke="#1FA35A" stroke-width="2.4"/>';
  // Mundial de Clubes e Intercontinental (sem imagem real): usam as taças desenhadas parecidas
  SHAPES.cwc = SHAPES.wc || SHAPES.cup;
  SHAPES.inter = SHAPES.cup;
  const METAL = { league: 'gold', cup: 'silver', ucl: 'silver', lib: 'gold', ballon: 'gold', wc: 'gold', cwc: 'gold', inter: 'gold' };

  // name: nome da competição. Se houver imagem da taça real (src/trophy-imgs.js), usa ela;
  // se não houver (ou a imagem falhar), fica a taça desenhada.
  const WC_NAME = { wc: 'Copa do Mundo', lib: 'Libertadores', ucl: 'Liga dos Campeões', ballon: 'Bola de Ouro', cwc: 'Mundial de Clubes', inter: 'Copa Intercontinental' };
  root.CRAQUE_TROPHY = function (type, size, name) {
    const img = (root.CRAQUE_TROPHY_IMGS || {})[name || WC_NAME[type]];
    const s = size || 40;
    if (img) return '<img class="trophy trophy-real" src="' + img + '" alt="" style="height:' + s + 'px;max-width:' + Math.round(s * 1.3) + 'px" onerror="this.outerHTML=window.CRAQUE_TROPHY(\'' + type + '\',' + s + ')">';
    const shape = SHAPES[type] || SHAPES.league;
    const g = 'url(#tg-' + (METAL[type] || 'gold') + ')';
    return '<svg class="trophy" width="' + (size || 40) + '" height="' + (size || 40) + '" viewBox="0 0 64 64" aria-hidden="true">' + defs + shape(g) + '</svg>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
