// Origens e desafios: mudam o começo da carreira e a regra do jogo, não o poder do jogador.
// Origem (c.origin): de onde o garoto vem. Desafio (c.challenge): uma regra opcional que rende pontos se for cumprida.
// As duas são liberadas por conquistas (ui/achievements.js guarda quais você já tem; S.ORIGINS[].need / S.CHALLENGES[].need).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp, bump } = S._;

  S.EUROPE = ['Portugal', 'Espanha', 'Inglaterra', 'Itália', 'Alemanha', 'França', 'Holanda', 'Bélgica', 'Turquia', 'Escócia', 'Grécia',
    'Suíça', 'Áustria', 'Dinamarca', 'Croácia', 'Sérvia', 'Noruega', 'Suécia', 'Polônia', 'República Tcheca'];
  const inEurope = cl => S.EUROPE.includes(D.countryOf(cl));

  S.ORIGINS = [
    { id: 'base', icon: '🌱', name: 'Revelação da base', desc: 'O caminho de sempre: três clubes do seu país querem você na base aos 16.' },
    { id: 'filho', icon: '👨‍👦', name: 'Filho de ex-jogador', need: 'estreia',
      desc: 'Começa famoso e com mais portas abertas. Em compensação, temporada ruim pesa o dobro com a torcida e o técnico.' },
    { id: 'tardia', icon: '🏚️', name: 'Revelação tardia', need: 'acesso',
      desc: 'Descoberto na várzea aos 19 por um clube pequeno. Chega mais pronto e com o corpo inteiro, então demora mais para cair.' },
    { id: 'exportado', icon: '✈️', name: 'Vendido cedo', need: 'icone',
      desc: 'Aos 16 vai para a base de um clube estrangeiro, com luvas no bolso. Os dois primeiros anos longe de casa pesam no rendimento.' },
  ];
  S.ORIGIN_BY_ID = Object.fromEntries(S.ORIGINS.map(o => [o.id, o]));

  // Pontos do desafio cumprido. Medido no simulador (com o nível das ligas, engine/finish.js): ficar no clube grande
  // da base a carreira toda ou jogar só fora da Europa já rende quase o mesmo que o caminho normal, então o bônus é pequeno
  S.CHALLENGES = [
    { id: 'fiel', icon: '💍', name: 'Um clube só', need: 'estreia', v: 120,
      desc: 'Jogue a carreira inteira pelo primeiro clube, sem empréstimo. Cumprido: +120 pts.' },
    { id: 'semeuropa', icon: '🌎', name: 'Sem Europa', need: 'estreia', v: 60, when: c => !S.EUROPE.includes(c.country),
      desc: 'Nunca jogue numa liga europeia. Cumprido: +60 pts.' },
  ];
  S.CHALLENGE_BY_ID = Object.fromEntries(S.CHALLENGES.map(o => [o.id, o]));
  S.challengeFits = (ch, country) => !ch.when || ch.when({ country });

  // Idade em que a carreira começou (16, ou 19 na revelação tardia)
  S.startAge = c => c.age0 || 16;

  // Carreira nova com origem e desafio (chamar logo depois de S.newCareer, antes da base)
  S.setOrigin = function (c, origin, challenge) {
    const o = S.ORIGIN_BY_ID[origin] ? origin : 'base';
    c.origin = o;
    const ch = S.CHALLENGE_BY_ID[challenge];
    c.challenge = ch && S.challengeFits(ch, c.country) ? challenge : null;
    c.chFail = false;
    if (o === 'filho') c.fame = 45;
    if (o === 'tardia') {
      // Três anos de várzea: o corpo cresceu, a técnica um pouco menos
      c.age = 19;
      D.ATTRS.forEach(k => { c.attrs[k] = clamp(c.attrs[k] + (['fis', 'rit'].includes(k) ? 10 : 8), 20, 82); });
      c.pot += 2; c.pe = (c.pe || 0) + 1;
      c.longev = (c.longev || 0) + 1;
    }
    if (o === 'exportado') c.money = 300000;
    c.age0 = c.age;
    return c;
  };

  // A base de cada origem
  const offers = S.offers;
  S.offers = function (c, academy) {
    if (!academy || !c.origin || c.origin === 'base' || c.origin === 'filho') return offers(c, academy);
    const r = S.rng(c.seed), mine = x => D.countryOf(x) === c.country, out = [], used = new Set();
    const pick = f => { const pool = D.CLUBS.filter(x => !used.has(x.id) && f(x)); if (!pool.length) return null; const cl = pool[Math.floor(r() * pool.length)]; used.add(cl.id); return cl; };
    let list = [];
    if (c.origin === 'tardia') {
      // Só os pequenos do país (Série C/D, segundas divisões) olham para a várzea
      const minT = Math.min(...D.CLUBS.filter(mine).map(x => x.tier));
      for (let i = 0; i < 3; i++) list.push(pick(x => mine(x) && x.tier <= minT + (i === 0 ? 1 : 0)) || pick(mine));
    } else {
      // Vendido cedo: base de fora, em clubes que vivem de revelar jogador (Europa média e alguns grandes)
      const abroad = x => D.countryOf(x) !== c.country && inEurope(x);
      list = [pick(x => abroad(x) && x.tier >= 4), pick(x => abroad(x) && x.tier === 3), pick(x => abroad(x) && x.tier === 3)];
    }
    c.seed = r.state();
    list.filter(Boolean).forEach(cl => {
      const role = S.role(c, cl);
      out.push({ club: cl.id, kind: 'base', role: role.name, share: role.share, wage: S.wage(c, cl), years: 3 });
    });
    return out;
  };

  // Desafios: sair do clube (ou ir para a Europa) quebra a regra na hora
  const breaks = (c, clubId) => {
    if (!c.challenge || c.chFail || !clubId) return false;
    const cl = D.CLUB_BY_ID[clubId];
    if (c.challenge === 'fiel') return !!c.firstClub && clubId !== c.firstClub;
    if (c.challenge === 'semeuropa') return inEurope(cl);
    return false;
  };
  S.breaksChallenge = (c, offer) => breaks(c, offer && offer.club);
  const join = S.join;
  S.join = function (c, offer) {
    if (breaks(c, offer.club)) c.chFail = true;
    return join(c, offer);
  };
  const loanOut = S.loanOut;
  if (loanOut) S.loanOut = function (c, offer) {
    if (c.challenge === 'fiel' || breaks(c, offer.club)) c.chFail = true;
    return loanOut(c, offer);
  };

  // Temporada: saudade de casa (vendido cedo) e cobrança pelo sobrenome (filho de ex-jogador)
  const play = S.playSeason;
  S.playSeason = function (c) {
    if (c.origin === 'exportado' && c.seasons.length < 2) c.mod.form -= 0.05;
    const res = play(c);
    if (c.origin === 'filho' && res.rating < 6.8 && !res.loan) {
      bump(c, 'fans', -6); bump(c, 'coach', -4);
      res.fans1 = Math.round(c.rel.fans); res.coach1 = Math.round(c.rel.coach);
      res.originNote = 'A comparação com o seu pai pesou: torcida −6 · técnico −4';
    }
    return res;
  };

  // Fim de carreira: desafio cumprido entra na conta
  const finish = S.finish;
  S.finish = function (c) {
    const f = finish(c);
    const ch = S.CHALLENGE_BY_ID[c.challenge];
    if (ch) {
      f.challenge = { id: ch.id, name: ch.name, ok: !c.chFail };
      if (!c.chFail) {
        const p = { k: 'bonus', txt: 'Desafio cumprido: ' + ch.name, v: ch.v };
        f.parts.push(p);
        f.score += ch.v; f.grade = S.gradeOf(f.score);
      }
    }
    return f;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
