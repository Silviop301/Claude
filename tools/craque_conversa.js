// Conversa da semana no Treinador (`S.coTalkWho`, `S.coTalkWhy`, `S.coTalk1` em engine/coach.js): quem pede, por quê,
// e o preço de cada resposta (promessa cobra e espera o machucado, paciência volta em 4 rodadas, duro cala na temporada).
// Uso: node tools/craque_conversa.js   (esperado: 0 falhas)
const S = require('../craque/src/sim.js');
let bad = 0; const ok = (c, t) => { if (!c) { bad++; console.log('FALHA', t); } };
const co = S.coNew({ name: 'T', country: 'Brasil', start: 'livre' }); S.coSign(co, S.coOffers(co)[0]); co.autoXI = true; S.coStart(co);
if (S.coFinAuto) S.coFinAuto(co);
const play = () => { const m = S.coMatchStart(co); S.coMatchStep(co, m, 999); return S.coMatchEnd(co, m); };
ok(S.coTalkWho(co) === null, 'ninguém pede no começo');
const xi = new Set(co.xi), res = co.squad.filter(p => !xi.has(p.id)), a = res[0], b = res[1];
a.mo = 30; a.bn = 3; b.mo = 35;
ok(S.coTalkWho(co) === a, 'o mais chateado pede');
ok(S.coTalkWhy(co, a).k === 'banco' && /3 jogos/.test(S.coTalkWhy(co, a).tag), 'motivo banco');
ok(S.coTalkWhy(co, b).k === 'fase', 'motivo fase');
b.deny = 1; ok(S.coTalkWhy(co, b).k === 'sair', 'motivo sair'); b.broke = 1; ok(S.coTalkWhy(co, b).k === 'promessa', 'motivo promessa');
ok(S.coMoTxt(a).n === 2 && S.coMoTxt(a).t === 'baixa', 'moral 30 = 2 tracinhos, baixa');
// duro: cai 4 e não pede mais na temporada
S.coTalk1(co, a.id, 'duro'); ok(a.mo === 26 && a.mute === co.season, 'duro'); ok(S.coTalkWho(co) === b, 'depois do duro pede o outro');
// paciência: +5, limpa o motivo e volta a pedir em 4 rodadas
S.coTalk1(co, b.id, 'paciencia'); ok(b.mo === 40 && !b.broke && !b.deny, 'paciência'); ok(S.coTalkWho(co) === null, 'ninguém logo depois');
for (let i = 0; i < 4; i++) { play(); b.mo = 35; a.mo = 20; }
ok(S.coTalkWho(co) === b, 'paciência: volta a pedir em 4 rodadas; o do duro não (' + (S.coTalkWho(co) || {}).n + ')');
// promessa: machucado espera, sem jogar quebra
const c2 = res[2]; c2.mo = 30; S.coTalk1(co, c2.id, 'prometer'); ok(c2.mo === 44 && c2.prom, 'prometer');
co.autoXI = false; c2.out = 9; const r0 = c2.prom; for (let i = 0; i < 4; i++) play();
ok(c2.prom && !c2.broke, 'machucado: promessa espera (' + c2.prom + ' de ' + r0 + ')');
c2.out = 0; co.xi = co.xi.filter(id => id !== c2.id); co.bench = co.bench.filter(id => id !== c2.id); play(); play();
ok(!c2.prom && c2.broke === 1, 'sem entrar: promessa quebra');
ok(S.coTalkWhy(co, c2).k === 'promessa', 'motivo vira promessa');
// temporada nova: quem ouviu o duro pode pedir de novo, e conversa antiga não trava a nova
a.mute = co.season - 1; a.talked = 30; a.talkS = co.season - 1; co.squad.forEach(p => { if (p !== a) p.mo = 60; }); a.mo = 20;
ok(S.coTalkWho(co) === a, 'temporada nova: volta a poder pedir');
// save antigo (talked sem talkS) não quebra
delete a.talkS; ok(S.coTalkWho(co) === a, 'save antigo');
console.log(bad ? bad + ' falhas' : 'conversa da semana: 0 falhas'); process.exit(bad ? 1 : 0);
