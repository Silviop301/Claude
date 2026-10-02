// Decisões com o que está em jogo de verdade (vem depois de events.js e events2.js, antes de events3.js).
// Cada opção é segura ({ safe }) ou arriscada ({ p, win, lose }). Dar certo faz a carreira andar
// (atributos para sempre, mais minutos, fase boa); dar errado faz parar (banco, fase ruim) ou perder (lesão, atributo).
// A dica é gerada daqui, com a chance e o que se ganha ou perde, e o jogador decide sabendo do risco.
// A chance depende do momento (nível acima ou abaixo do clube, características, idade, relação com técnico e torcida).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { bump, clamp } = S._;
  const club = c => D.CLUB_BY_ID[c.club];
  const has = (c, t) => c.traits.includes(t);
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1e3) + ' mil');
  const sg = n => (n > 0 ? '+' : '−') + Math.abs(n);

  // ---------- contexto que mexe na chance ----------
  // Nível acima do clube facilita (titular indiscutível); abaixo, cada aposta pesa mais
  S.edge = c => (c.club ? S.ovr(c) - club(c).strength : 0);
  // Chance final: base + ajustes, em múltiplos de 5% e entre 15% e 90%
  S.chance = (base, ...adds) => clamp(Math.round((base + adds.reduce((a, b) => a + b, 0)) * 20) / 20, 0.15, 0.9);
  // Ajustes prontos para as chances
  S.ctx = {
    has,
    // nível em relação ao clube (o normal é estar uns 4 pontos acima): ±20% no máximo
    edge: (c, k) => clamp(S.edge(c) - 4, -10, 10) * (k || 0.02),
    coach: (c, k) => clamp((c.rel.coach - 60) / 40, -1, 1) * (k || 0.1), // técnico do seu lado ajuda
    fans: (c, k) => clamp((c.rel.fans - 60) / 40, -1, 1) * (k || 0.1),
    young: (c, k) => (c.age <= 22 ? (k || 0.1) : 0),
    vet: (c, k) => (c.age >= 31 ? (k || -0.1) : 0),
    t: (c, id, k) => (has(c, id) ? k : 0),
  };

  // ---------- efeitos ----------
  // main: n nos 2 atributos principais da posição · attr: {k: n} · pot: teto (sem número na tela)
  // form/min/inj/goal/assist (só nesta temporada)
  // coach/fans/fame/money · wage (multiplica o salário) · boost (reforços no clube) · captain · wantsOut · contract
  const mainOf = c => S.mainAttrs(c.pos);
  const lab = (c, k) => D.label(c.pos, k);
  S.fxParts = function (c, fx) {
    const p = [];
    // Atributos: soma o que vem dos dois principais (main) com o de um atributo só (attr) e agrupa por valor
    // ("+3 FIN e RIT", "−4 FÍS, −1 DEF")
    const d = {};
    if (fx.main) mainOf(c).forEach(k => { d[k] = (d[k] || 0) + fx.main; });
    if (fx.attr) for (const k in fx.attr) d[k] = (d[k] || 0) + fx.attr[k];
    const byVal = new Map();
    Object.keys(d).filter(k => d[k]).sort((a, b) => Math.abs(d[b]) - Math.abs(d[a])).forEach(k => { if (!byVal.has(d[k])) byVal.set(d[k], []); byVal.get(d[k]).push(lab(c, k)); });
    byVal.forEach((labs, n) => p.push(sg(n) + ' ' + labs.join(' e ')));
    if (fx.pot) p.push(fx.pot > 0 ? (fx.pot >= 2 ? 'teto sobe bastante' : 'teto sobe') : (fx.pot <= -2 ? 'teto cai bastante' : 'teto cai'));
    if (fx.form) p.push('forma ' + sg(Math.round(fx.form * 100)) + '%');
    if (fx.min) p.push(sg(Math.round(fx.min * 100)) + '% de minutos');
    if (fx.goal) p.push('gols ' + sg(Math.round(fx.goal * 100)) + '%');
    if (fx.assist) p.push('assistências ' + sg(Math.round(fx.assist * 100)) + '%');
    if (fx.inj) p.push('lesão: perde ' + Math.round(fx.inj * 100) + '% da temporada');
    if (fx.coach) p.push('Técnico ' + sg(fx.coach));
    if (fx.fans) p.push('Torcida ' + sg(fx.fans));
    if (fx.fame) p.push('Fama ' + sg(fx.fame));
    if (fx.money) p.push((fx.money > 0 ? '+' : '−') + 'R$ ' + money(Math.abs(fx.money)));
    if (fx.wage) p.push('salário ' + sg(Math.round((fx.wage - 1) * 100)) + '%');
    if (fx.boost) p.push(fx.boost > 0 ? 'time mais forte' : 'time mais fraco');
    if (fx.captain) p.push('vira capitão');
    if (fx.wantsOut) p.push('abre a janela de transferências');
    if (fx.contract) p.push('contrato +' + fx.contract + (fx.contract > 1 ? ' anos' : ' ano'));
    return p;
  };
  const pctOf = p => Math.round(p * 100) + '%';
  function outcomeTxt(c, o) {
    // "lesão longa (perde 30% da temporada)": sem repetir a palavra lesão quando o resultado já diz
    const parts = S.fxParts(c, o.fx || {}).map(x => (o.tag && /lesão/.test(o.tag) ? x.replace('lesão: ', '') : x));
    if (o.tag && parts.length) return o.tag + ' (' + parts.join(', ') + ')';
    return o.tag || parts.join(', ') || 'nada muda';
  }
  S.stakeHint = function (c, st) {
    if (st.safe) { const parts = S.fxParts(c, st.safe.fx || {}); return (st.note ? [st.note] : []).concat(parts).join(' · ') || 'Nada muda'; }
    return pctOf(st.p) + ': ' + outcomeTxt(c, st.win) + ' · ' + pctOf(1 - st.p) + ': ' + outcomeTxt(c, st.lose);
  };

  // Valor aproximado de cada efeito em pontos de carreira, medido no simulador (só o robô de teste usa).
  // O que fica para sempre pesa muito mais que o que vale só nesta temporada; o teto (potencial) pesa mais ainda
  // quando o jogador é novo, porque muda a evolução da carreira inteira.
  const MAIN_PT = a => Math.min(80, 10 + 60 * Math.exp(-0.2 * (a - 19))) * (a >= 34 ? 0.7 : 1);
  const POT_PT = a => (a > 28 ? 0 : 95 * Math.exp(-0.25 * Math.max(0, a - 18)));
  S.fxValue = function (c, fx) {
    const w = D.POS[c.pos].w, [m1, m2] = mainOf(c), wm = w[m1] + w[m2];
    let v = (fx.main || 0) * MAIN_PT(c.age) + (fx.pot || 0) * POT_PT(c.age);
    if (fx.attr) for (const k in fx.attr) v += fx.attr[k] * w[k] / wm * MAIN_PT(c.age);
    v += (fx.form || 0) * (c.age <= 21 ? 180 : 130) + (fx.min || 0) * 30 - (fx.inj || 0) * 35;
    v += (fx.goal || 0) * 20 + (fx.assist || 0) * 12;
    const co = fx.coach || 0, fa = fx.fans || 0;
    v += co > 0 ? co * 0.2 : co * 0.5;
    v += fa * 0.1 + (fx.boost || 0) * 4;
    return v;
  };
  const stakeValue = (c, st) => (st.safe ? S.fxValue(c, st.safe.fx || {}) : st.p * S.fxValue(c, st.win.fx || {}) + (1 - st.p) * S.fxValue(c, st.lose.fx || {}));

  // Aplica o efeito: o que é permanente muda aqui; o que vale para a temporada volta no formato de resolveEvent
  S.applyStake = function (c, fx) {
    const out = {};
    // Ganho ou perda de atributo fica numa conta à parte (c.xb), somada por cima como os investimentos:
    // assim o teto não "engole" o ganho nem devolve a perda com o tempo. É para sempre de verdade.
    if (fx.main || fx.attr) c.xb = c.xb || {};
    if (fx.main) mainOf(c).forEach(k => { c.xb[k] = (c.xb[k] || 0) + fx.main; });
    if (fx.attr) for (const k in fx.attr) c.xb[k] = (c.xb[k] || 0) + fx.attr[k];
    if (fx.pot) c.pot = clamp(c.pot + fx.pot, 50, 99); // teto (potencial): muda a evolução até os 28
    if (fx.form) out.form = fx.form;
    if (fx.min) out.min = fx.min;
    if (fx.inj) out.inj = fx.inj;
    if (fx.goal) out.goalMul = fx.goal;
    if (fx.assist) out.assistMul = fx.assist;
    if (fx.fame) out.fame = fx.fame;
    if (fx.money) out.money = fx.money;
    if (fx.coach) bump(c, 'coach', fx.coach);
    if (fx.fans) bump(c, 'fans', fx.fans);
    if (fx.wage) c.wage = Math.round(c.wage * fx.wage);
    if (fx.contract) c.contract += fx.contract;
    if (fx.captain) c.captain = true;
    if (fx.wantsOut) c.wantsOut = true;
    if (fx.move) out.move = true; // resolveEvent leva para o clube da proposta (ev.dest)
    if (fx.boost) {
      c.clubBoost = c.clubBoost || {};
      c.clubBoost[c.club] = Math.max(-6, Math.min(8, (c.clubBoost[c.club] || 0) + fx.boost));
      if (S.applyLeagues) S.applyLeagues(c);
    }
    return out;
  };

  // Força dos ganhos e perdas nos 2 atributos principais (o grande salto ou a grande perda): calibrado no simulador.
  // Os treinos de um atributo só (attr) ficam como estão.
  S.STAKE_K = 1;      // ganhos
  S.STAKE_LOSS = 1;   // perdas
  const scaleFx = fx => {
    if (!fx || (S.STAKE_K === 1 && S.STAKE_LOSS === 1)) return fx;
    const f = Object.assign({}, fx), sc = n => Math.sign(n) * Math.max(1, Math.round(Math.abs(n) * (n > 0 ? S.STAKE_K : S.STAKE_LOSS)));
    if (f.main) f.main = sc(f.main);
    return f;
  };
  const scaleOut = o => (o ? Object.assign({}, o, { fx: scaleFx(o.fx) }) : o);
  const scaleOpt = o => (o.safe ? Object.assign({}, o, { safe: scaleOut(o.safe) }) : Object.assign({}, o, { win: scaleOut(o.win), lose: scaleOut(o.lose) }));

  // ---------- trocar um evento pelo formato novo ----------
  // spec: { build(c, r) → {title, text, ...dados} | null, options(c, ev) → [{ label, note?, safe:{fx, txt, ok?} } | { label, p, win:{fx, txt, tag?}, lose:{fx, txt, tag?} }] }
  // Mantém peso, quando aparece, limite, ícone e tom do evento original. A ordem das opções importa para as consequências (events3.js).
  S.stake = function (id, spec) {
    const def = S.EVENT_DEFS.find(e => e.id === id);
    if (!def) throw new Error('stake: evento ' + id + ' não existe');
    if (spec.when) def.when = spec.when;
    if (spec.weight) def.weight = spec.weight;
    def.stakes = true;
    def.build = function (c, r) {
      const base = spec.build(c, r);
      if (!base) return null;
      const options = spec.options(c, base).map(scaleOpt).map(o => {
        const st = o.safe ? { safe: o.safe, note: o.note } : { p: o.p, win: o.win, lose: o.lose };
        // Custo à vista (opção segura que tira dinheiro): sem saldo, a opção fica travada (ver S.pickEvent)
        const cost = st.safe && st.safe.fx && st.safe.fx.money < 0 ? -st.safe.fx.money : 0;
        return Object.assign({ label: o.label, hint: S.stakeHint(c, st), st, ev: Math.round(stakeValue(c, st) * 10) / 10 }, cost ? { cost } : {});
      });
      return Object.assign(base, { options });
    };
    def.resolve = function (c, ev, i, r) {
      // Evento salvo antes desta versão (sem a aposta guardada): monta de novo com o momento atual
      const o = (ev.options[i] && ev.options[i].st) ? ev.options[i] : (spec.options(c, ev).map(scaleOpt).map(x => ({ st: x.safe ? { safe: x.safe } : { p: x.p, win: x.win, lose: x.lose } }))[i] || { st: { safe: { fx: {}, txt: '' } } });
      const st = o.st;
      let res, ok;
      if (st.safe) { res = st.safe; ok = st.safe.ok !== false; }
      else { ok = r() < st.p; res = ok ? st.win : st.lose; }
      const fx = res.fx || {};
      const before = S.ovr(c);
      const out = S.applyStake(c, fx);
      return { ok, text: res.txt, fx: out, gain: S.fxParts(c, fx), ovrFrom: before, stake: true };
    };
    return def;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
