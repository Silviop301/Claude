// Contrato: o que você pede na mesa ao assinar (salário, minutos ou cláusula de saída) e a proposta
// no meio do contrato que o seu clube pode recusar.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp, bump } = S._;

  // Termos do contrato: cada pedido custa alguma coisa
  S.TERMS = [
    { id: 'padrao', icon: '🤝', name: 'Padrão', desc: 'O contrato como veio.' },
    { id: 'salario', icon: '💰', name: 'Mais salário', desc: 'Salário +40%. A diretoria cobra resultado: técnico −5 na chegada.' },
    { id: 'minutos', icon: '⏱️', name: 'Minutos garantidos', desc: 'Salário −30%. Para quem chega sem vaga: o técnico promete mais espaço na primeira temporada.' },
    { id: 'clausula', icon: '🔓', name: 'Cláusula de saída', desc: 'Salário −15%. Se você brilhar acima do nível do clube, a janela abre antes do fim do contrato.' },
  ];
  S.TERM_BY_ID = Object.fromEntries(S.TERMS.map(t => [t.id, t]));
  // Cláusula: janela antecipada quando você está 5+ acima do clube e fez boa temporada
  S.CLAUSE_EDGE = 5; S.CLAUSE_RATING = 7.0;
  S.termsFor = offer => !!offer && offer.kind !== 'base' && offer.kind !== 'loan';

  // Proposta com o termo aplicado (o que a tela mostra antes de assinar)
  S.withTerm = function (offer, term) {
    const o = Object.assign({}, offer, { term: S.TERM_BY_ID[term] && S.termsFor(offer) ? term : 'padrao' });
    const mult = { salario: 1.4, minutos: 0.7, clausula: 0.85 }[o.term];
    if (mult) o.wage = Math.round(o.wage * mult / 1000) * 1000;
    return o;
  };

  const join = S.join;
  S.join = function (c, offer) {
    const term = offer.term || 'padrao';
    const ret = join(c, offer);
    c.clause = term === 'clausula';
    c.clauseOpen = false;
    c.term = term;
    if (term === 'salario') bump(c, 'coach', -5);
    if (term === 'minutos' && (offer.share || 0) < 0.78) c.promise = Math.max(c.promise || 0, 0.12); // titular já tem o espaço
    return ret;
  };

  // Fim da temporada: com cláusula, brilhar acima do clube abre a janela (o clube não pode recusar)
  const play = S.playSeason;
  S.playSeason = function (c) {
    const res = play(c);
    if (c.clause && c.contract > 0 && !c.loan && res.games >= 15 && res.rating >= S.CLAUSE_RATING && S.edge(c) >= S.CLAUSE_EDGE) {
      c.clauseOpen = true; res.clauseOpen = true;
    }
    return res;
  };
  const wopen = S.windowOpen;
  S.windowOpen = c => wopen(c) || !!c.clauseOpen;

  // ---------- proposta no meio do contrato: o seu clube pode dizer não ----------
  const P = S.chance, X = S.ctx;
  const risk = (label, p, win, lose) => ({ label, p, win, lose });
  const out = (tag, fx, txt) => ({ tag, fx, txt });
  const one = (label, fx, txt, note) => ({ label, note, safe: { fx, txt } });
  const club = c => D.CLUB_BY_ID[c.club];
  S.addStake({ id: 'nao_vende', icon: '🚫', tone: 'red', weight: 5, max: 2,
    when: c => !!c.club && !c.loan && !c.clause && c.contract >= 2 && c.age <= 31 && S.edge(c) >= 4 && club(c).tier <= 4 && !c.wantsOut }, {
    build: (c, r) => {
      const cl = club(c), o = S.ovr(c);
      const pool = D.CLUBS.filter(x => x.tier > cl.tier && x.strength <= o + 3 && x.strength >= o - 8 && !D.MONEY.includes(x.league));
      if (!pool.length) return null;
      const dest = pool[Math.floor(r() * pool.length)];
      return { title: D.O(cl.name) + ' não quer vender', text: D.O(dest.name) + ' fez uma proposta por você. A diretoria ' + D.do(cl.name) + ' respondeu que você tem ' + c.contract + ' anos de contrato e não está à venda.', dest: dest.id };
    },
    options: (c, ev) => [
      // Quanto mais contrato pela frente, mais o clube segura
      risk('Forçar a saída', P(0.55, X.edge(c, 0.03), -0.1 * (c.contract - 2), X.fans(c, -0.05)),
        out('o clube cede', { move: true, fans: -20, fame: 6 }, 'Depois de uma semana de queda de braço, o clube aceitou. Você saiu pela porta dos fundos, mas saiu.'),
        out('o clube segura', { coach: -12, fans: -10, form: -0.06 }, 'O clube bateu o pé e você ficou. O clima no vestiário azedou e a torcida não esqueceu.')),
      one('Ficar e pedir aumento', { wage: 1.2, fans: 6 }, 'Você ficou. A diretoria agradeceu com um aumento e a torcida, com aplauso.'),
    ],
  });
  S.EV_KIND.nao_vende = 'up';

  // ---------- volta do empréstimo: o clube que te emprestou e o que te recebeu ----------
  const lastLoan = c => { const s = c.seasons[c.seasons.length - 1]; return s && s.loan && s.club !== c.club && s.games >= 18 && s.rating >= 6.9 ? s : null; };
  S.addStake({ id: 'volta_emprestimo', icon: '🔁', tone: 'blue', weight: 30, max: 2, when: c => !!c.club && !c.loan && !!lastLoan(c) && c.contract >= 1 }, {
    build: c => {
      const s = lastLoan(c), lc = D.CLUB_BY_ID[s.club];
      return { title: D.O(lc.name) + ' quer você de vez', text: 'Você voltou do empréstimo com nota ' + s.rating.toFixed(1).replace('.', ',') + '. ' + D.O(lc.name) + ' quer comprar o seu passe, e ' + D.o(club(c).name) + ' ainda não sabe onde você encaixa.', dest: lc.id };
    },
    options: (c, ev) => [
      one('Ficar de vez ' + D.no(D.CLUB_BY_ID[ev.dest].name), { move: true, fans: 6, coach: 8 }, 'Você assinou com quem apostou em você. A torcida de lá já te tratava como da casa.', 'Titular onde já te conhecem'),
      risk('Voltar e brigar pela vaga', P(0.5, X.edge(c, 0.04), X.coach(c, 0.05)),
        out('ganha a vaga', { min: 0.12, coach: 6, form: 0.03 }, 'O técnico viu os jogos do empréstimo e te deu a camisa de titular.'),
        out('volta para o banco', { min: -0.12, form: -0.04 }, 'O técnico agradeceu o esforço, mas manteve o time. De volta ao banco.')),
    ],
  });
  S.EV_KIND.volta_emprestimo = 'mid';

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
