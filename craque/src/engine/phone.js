// Jogo a Jogo — as pessoas do celular (fase 2 do plano). Cada carreira tem as suas pessoas: mãe, parça, empresário,
// jornalista e, em cada clube, o técnico e o capitão (o rival vem de engine/rival.js). Cada uma tem relação de 0 a 100,
// que aparece só no tom da mensagem (bem com você, normal, magoada), e uma memória de fatos que volta temporadas depois.
// As mensagens saem depois dos jogos (S.fcPlay, envolvido aqui) e antes deles (S.fcPhonePre, chamado pela tela do
// celular). Sorteio próprio: nada aqui muda a nota, o placar ou a sorte da carreira.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------- quem é quem ----------
  const BASE = { mae: 75, parca: 62, emp: 60, jor: 55, cap: 60 };
  const ROLE = { mae: 'mãe', parca: 'parça de infância', emp: 'empresário', jor: 'jornalista', cap: 'capitão', coach: 'técnico', rival: 'rival' };
  const ICON = { mae: '❤️', parca: '🤙', emp: '💼', jor: '🎙️', cap: '💪', coach: '📋', rival: '⚔️' };
  const NICK_BR = ['Biel', 'Teteu', 'Dudu', 'Juninho', 'Pedrinho', 'Lipe', 'Gui', 'Vitinho', 'Netinho', 'Bruninho', 'Rafinha', 'Léo', 'Kauê', 'Digão'];
  const EMP_BR = ['Marcão', 'Carlão', 'Toninho', 'Juca', 'Ricardão', 'Beto', 'Serginho', 'Edinho'];
  const JOR_F_PT = ['Tati', 'Bia', 'Carol', 'Renata', 'Luana', 'Paula', 'Camila', 'Júlia', 'Fernanda', 'Mariana'];
  const JOR_F = ['Laura', 'Sofia', 'Emma', 'Anna', 'Clara', 'Sara', 'Lucía', 'Marta', 'Elena', 'Nina'];
  const SUR_BR = ['Moura', 'Lima', 'Prado', 'Rocha', 'Duarte', 'Bastos', 'Freitas', 'Campos', 'Teixeira', 'Valente'];
  const PT = ['Brasil', 'Portugal'];
  const namesOf = country => (D.NAMES && D.NAMES[country]) || null;
  const anyName = (country, r) => (D.randomName ? D.randomName(country, r) : r.pick(['Diego Souza', 'Rafael Lima', 'Bruno Alves', 'André Costa']));
  const surname = (country, r) => { const n = namesOf(country); return n && n.l && n.l.length ? r.pick(n.l) : r.pick(SUR_BR); };
  const first = (country, r) => { const n = namesOf(country); return n && n.f && n.f.length ? r.pick(n.f) : r.pick(NICK_BR); };
  const leagueCountry = c => { const cl = D.CLUB_BY_ID[c.club], lg = cl && D.LEAGUE_BY_ID[cl.league]; return (lg && lg.country) || c.country || 'Brasil'; };

  function rngFor(c, salt) { return S.rng(((Math.imul(Number(c.tseed) || 1, 2246822519) ^ salt) >>> 0) || 1); }

  // Cria as pessoas (carreira nova ou save antigo: na primeira vez que o celular abre) e troca técnico e capitão a cada clube
  S.fcPeople = function (c) {
    if (!c || c.mode !== 'completa') return null;
    let P = c.ppl;
    if (!P || !P.p) {
      const r = rngFor(c, 0x9E0E), home = c.country || 'Brasil', br = home === 'Brasil';
      P = c.ppl = { v: 1, p: {
        mae: { n: 'Mãe', rel: BASE.mae, mem: [] },
        parca: { n: br ? r.pick(NICK_BR) : first(home, r), rel: BASE.parca, mem: [] },
        emp: { n: br ? r.pick(EMP_BR) : anyName(home, r), rel: BASE.emp, mem: [] },
        jor: { n: (PT.includes(home) ? r.pick(JOR_F_PT) : r.pick(JOR_F)) + ' ' + surname(home, r), rel: BASE.jor, mem: [] },
      }, inbox: [], seen: [], unread: 0, season: c.season, first: c.club, abroad: false };
    }
    if (P.club !== c.club) {
      const r = rngFor(c, 0xC1B0 + (c.season || 0) * 31), lc = leagueCountry(c), was = P.club;
      P.p.coach = { n: (lc === 'Brasil' ? 'Professor ' : lc === 'Portugal' ? 'Mister ' : 'Mister ') + surname(lc, r), mem: [] };
      P.p.cap = { n: anyName(lc, r), rel: BASE.cap, mem: [] };
      P.club = c.club;
      // Mudou de clube: o empresário guarda onde você começou; ir para fora do país pesa na mãe e no parça
      if (was) {
        const out = lc !== (c.country || 'Brasil');
        if (out && !P.abroad) { rel(c, 'mae', -8); rel(c, 'parca', -6); P.moved = 'longe'; }
        else P.moved = 'clube';
        P.abroad = out;
      }
    }
    if (P.season !== c.season) {
      // Uma temporada passa: a relação volta um pouco para o normal de cada um
      for (const k in BASE) if (P.p[k]) P.p[k].rel = Math.round(P.p[k].rel + clamp(BASE[k] - P.p[k].rel, -3, 3));
      P.season = c.season;
    }
    return P;
  };
  function rel(c, id, d) {
    const p = c.ppl && c.ppl.p[id];
    if (id === 'coach') { c.rel.coach = clamp(c.rel.coach + d, 0, 100); return; }
    if (p) p.rel = clamp(p.rel + d, 0, 100);
  }
  S.fcRel = rel;
  // O tom: bem com você (≥ 70), normal ou magoada (< 40). O técnico usa a relação de sempre (c.rel.coach); o rival, a carta
  S.fcTone = function (c, id) {
    if (id === 'rival') {
      const rv = c.rival, last = rv && rv.seasons && rv.seasons[rv.seasons.length - 1];
      const d = last ? last.ovr - S.ovr(c) : 0;
      return d >= 3 ? 'mal' : d <= -3 ? 'bom' : 'ok';
    }
    const v = id === 'coach' ? c.rel.coach : c.ppl && c.ppl.p[id] ? c.ppl.p[id].rel : 60;
    return v >= 70 ? 'bom' : v < 40 ? 'mal' : 'ok';
  };
  S.fcContact = function (c, id) {
    const P = c.ppl, p = P && P.p[id];
    const name = id === 'rival' ? (c.rival ? c.rival.name : 'Rival') : p ? p.n : ROLE[id];
    return { id, name, role: ROLE[id], icon: ICON[id] };
  };
  S.FC_PEOPLE = ['mae', 'parca', 'emp', 'jor', 'cap', 'coach', 'rival'];

  // ---------- o que cada um fala ----------
  // T[pessoa][situação][tom]: listas de mensagens; {vs} adversário, {g} gols, {club} seu clube, {tt} título, {x} o fato lembrado,
  // {rv} o rival, {me} o seu nome curto. Mensagem curta, uma voz por pessoa, no máximo um bordão por mensagem.
  const T = {
    mae: {
      gol: {
        bom: ['Filho vi o gol!! Seu pai chorou na sala kkk Te amo, come direito ai', 'Gritei tanto no gol que a vizinha bateu na porta. Orgulho de vc meu amor', 'Seu pai já mandou o video do gol pro grupo da familia 4 vezes', 'Que gol filho!! Sua avó disse que vc puxou o avô', 'Filho {g} contra o {vs}!! Acendi uma vela pra vc antes do jogo, funcionou kkk'],
        ok: ['Vi o gol filho! Parabéns. Liga quando puder', 'Seu pai viu o gol no radio do carro. Ficou todo bobo', 'Gol do meu filho!! Tá se cuidando ai?', 'Vi o gol contra o {vs}. Seu pai pulou do sofá'],
        mal: ['Vi seu gol. Fiquei feliz. Liga quando der', 'Parabéns pelo gol filho. A gente viu daqui'],
      },
      marca: {
        bom: ['{n} gols filho!! Seu pai fez uma planilha com todos, acredita? kkk', 'Filho {n} gols! Lembro do primeiro chutinho no quintal. Te amo', '{n} gols do meu menino. A vizinhança inteira sabe, eu contei kkk'],
        ok: ['Vi no jornal que vc chegou a {n} gols. Parabéns filho', '{n} gols! Seu pai tá todo orgulhoso'],
        mal: ['{n} gols né. Parabéns filho. A gente acompanha daqui'],
      },
      vitoria: {
        bom: ['Que jogo filho! Até a tia Neide ligou pra comentar', 'Ganharam! Seu pai fez churrasco pra comemorar, faltou vc aqui'],
        ok: ['Ganharam né? Parabéns filho. Dorme cedo hoje', 'Vi o jogo com seu pai. Bonito filho'],
        mal: ['Vi que ganharam. Bom'],
      },
      ruim: {
        bom: ['Filho nem liga pro que falam na TV. Pra mim vc foi o melhor', 'Dia ruim acontece meu amor. Amanhã é outro dia. Te amo', 'Seu pai disse que o juiz tava contra vc kkk Cabeça erguida'],
        ok: ['Não fica triste filho, vai dar certo', 'Vi o jogo. Descansa e come bem tá', 'Liga pra mim quando puder, quero ouvir sua voz'],
        mal: ['Vi o jogo. Se precisar a gente tá aqui', 'Tudo bem filho? Ninguém atende ai'],
      },
      banco: {
        bom: ['Filho o técnico não sabe o que perde. Logo logo vc volta', 'Vi que vc ficou no banco. Paciência meu amor, sua hora chega'],
        ok: ['Não te vi jogando hoje. Tá tudo bem?', 'Seu pai perguntou pq vc não entrou. Falei que é estratégia kkk', 'Filho vc tá comendo direito? Vai ver é isso que o técnico quer kkk', 'Sua avó quer saber quando vc volta a jogar. Diz que tá com saudade de ver'],
        mal: ['Não te vi no jogo. Tudo bem?'],
      },
      lesao: {
        bom: ['Filho vi que vc se machucou. Quer que eu vá ai? Faço aquela sopa', 'Ai meu coração. O que o médico falou? Me manda noticia'],
        ok: ['Filho e a lesão? Faz tudo que o médico mandar tá', 'Vi no jornal que vc se machucou. Liga pra mim'],
        mal: ['Soube da lesão pelo jornal. Melhoras filho'],
      },
      titulo: {
        bom: ['CAMPEÃO!!! Filho a rua inteira tá buzinando aqui. Seu pai tá rouco', 'Meu filho campeão do {tt}!! Chorei igual criança. Te amo'],
        ok: ['Campeão do {tt}! Que orgulho filho', 'Vi a festa do título. Seu pai comprou o jornal pra guardar'],
        mal: ['Parabéns pelo título filho. A gente viu'],
      },
      longe: {
        bom: ['Filho já tô com saudade e vc nem foi ainda. Leva casaco que lá é frio', 'Vai com Deus meu amor. Sua cama fica arrumada aqui'],
        ok: ['Mudança grande né filho. Se cuida e me liga toda semana', 'Seu pai já aprendeu a ver jogo de fora pelo celular kkk'],
        mal: ['Tão longe agora né. A gente se vira aqui', 'Sei que vc ta ocupado com a mudança. Tudo bem'],
      },
      rotina: {
        bom: ['Oi filho! Fiz aquele bolo de fubá, se vc tivesse aqui... Te amo', 'Sua avó quer uma foto sua com a camisa. Manda ai', 'Filho tô vendo todos os seus jogos, até os chatos kkk'],
        ok: ['Oi filho, tudo bem? Liga pra sua avó que ela perguntou de vc', 'Filho tá comendo direito? Sei que vc só come besteira', 'Vc viu o áudio que mandei? Acho que não foi'],
        mal: ['Tudo bem filho. Sei que vc ta ocupado. A gente se vira aqui', 'Oi. Faz tempo que vc não liga'],
      },
    },
    parca: {
      gol: {
        bom: ['mano o bairro todo viu kkkkk tu é o orgulho da quebrada', 'GOLAÇO kkkk o bar parou pra ver o replay', 'tu fez {g} e eu ganhei a aposta com o primo kkkk paga a pizza', 'mano o {vs} vai sonhar contigo hoje kkkk', 'comemorei tanto que derrubei o açaí no sofá da minha mãe kkkk tua culpa'],
        ok: ['boa mano, belo gol', 'vi o gol aqui no bar kkkk', 'aí sim hein, gol do moleque', 'gol no {vs} é sempre bom kkkk'],
        mal: ['vi o gol. boa', 'ah, gol né. parabéns aí'],
      },
      marca: {
        bom: ['{n} GOLS MANO kkkk lembra que tu errava gol sem goleiro no campinho?', 'mano {n} gols, vou pintar o número no muro do bar kkkk'],
        ok: ['{n} gols hein, boa mano', 'chegou nos {n} gols, respeito'],
        mal: ['{n} gols. boa'],
      },
      vitoria: {
        bom: ['mano que jogo kkkk tô até rouco', 'é nóis demais, ganhou do {vs} e eu ganhei a resenha'],
        ok: ['boa vitória mano', 'jogo bom hein'],
        mal: ['ganharam né. de boa'],
      },
      ruim: {
        bom: ['mano esquece esse jogo kkkk acontece com todo mundo', 'que isso mano, até o messi tem dia ruim. sexta tem resenha pra esquecer'],
        ok: ['dia difícil hein mano', 'tu tava meio sumido no jogo hoje kkkk'],
        mal: ['é, não foi teu dia', 'vi o jogo. sem comentários kkkk'],
      },
      banco: {
        bom: ['mano esse técnico é cego kkkk logo tu volta', 'banco é temporário, talento é pra sempre. frase de para-choque mas é verdade kkkk'],
        ok: ['nem te vi em campo hoje', 'que houve, tá no banco?', 'mano o técnico tá de marcação contigo? kkkk', 'tu tá esquentando banco mais que o aquecedor da minha vó kkkk'],
        mal: ['tá no banco agora né'],
      },
      derrota: {
        bom: ['perder do {vs} dói mano. mas tu jogou bem', 'calma mano, o campeonato é longo'],
        ok: ['perdeu do {vs} mano kkkk vou ouvir até o ano que vem', 'derrota feia hein'],
        mal: ['perderam. normal'],
      },
      classico: {
        bom: ['CLÁSSICO É NOSSO kkkkkk mano o bairro tá em festa', 'mano ganhar do {vs} vale mais que título kkkk a zoeira tá pronta'],
        ok: ['ganhou o clássico, boa mano', 'vitória no clássico, assim que é'],
        mal: ['ganharam o clássico. legal'],
      },
      titulo: {
        bom: ['CAMPEÃOOOO kkkkk mano lembra quando a gente jogava na rua de chinelo?', 'é campeão do {tt} porra kkkk tô chorando no bar'],
        ok: ['campeão mano! merecido', 'parabéns pelo título, é nóis'],
        mal: ['parabéns pelo título. vi daqui'],
      },
      longe: {
        bom: ['mano vai e arrebenta lá kkkk mas não esquece o bairro', 'tu vai pra fora e eu fico aqui contando que te conheço kkkk'],
        ok: ['vai mudar mesmo hein. boa sorte lá', 'longe agora né, manda foto'],
        mal: ['ah é né, agora é famoso. de boa', 'vai pra longe e esquece a gente, normal'],
      },
      rotina: {
        bom: ['mano sexta tem resenha lá em casa, tua cadeira tá guardada kkkk', 'mano lembra do campinho atrás da escola? fizeram um prédio lá, que tristeza', 'mano meu filho só quer jogar com a tua camisa kkkk'],
        ok: ['e aí sumido, sexta tem resenha lá em casa', 'mano manda um ingresso pro próximo jogo aí', 'tá vivo mano? kkkk'],
        mal: ['ah é né, agora é famoso. de boa', 'nem responde mais os parça kkkk'],
      },
    },
    emp: {
      bom: {
        bom: ['Meu garoto! Com esse jogo teu preço subiu. Já tem gente perguntando', 'Nota alta de novo! Mandei teu vídeo pra três clubes. Confia', 'Assim que eu gosto. Cada jogo desses é um zero a mais no contrato'],
        ok: ['Bom jogo. Tem clube olhando. Me liga quando der', 'Gostei. Continua assim que eu trabalho aqui', 'Nota alta contra o {vs}. Já mandei pro pessoal do mercado', 'Um olheiro me ligou no intervalo. Só isso que vou dizer', 'Jogo assim vale mais que qualquer vídeo que eu mande', 'Teu nome tá circulando. Não fala com ninguém sem mim'],
        mal: ['Bom jogo. Pena que você não me atende pra eu vender isso', 'Jogou bem. Mas negócio é conversa, e você some'],
      },
      ruim: {
        bom: ['Calma, um jogo ruim não muda nada. Teu valor tá guardado comigo', 'Esquece o jogo de hoje. Eu cuido das conversas'],
        ok: ['Jogo fraco. Os olheiros também viram, sabe', 'Precisa de uns jogos bons seguidos. Mercado tem memória curta'],
        mal: ['Assim fica difícil eu te vender', 'Com esse futebol e sem me atender, complica'],
      },
      titulo: {
        bom: ['CAMPEÃO, meu garoto! Já ajustei teu valor na planilha', 'Título do {tt} no currículo. Agora a gente negocia de cima'],
        ok: ['Título é bom pro mercado. Parabéns', 'Campeão. Isso ajuda nas conversas'],
        mal: ['Parabéns pelo título. Quando quiser conversar de contrato, me liga'],
      },
      rotina: {
        bom: ['Meu garoto, tô fechando umas coisas grandes pra você. Paciência', 'Almocei com um diretor ontem. Teu nome surgiu três vezes'],
        ok: ['Tenho umas sondagens. Me liga quando der', 'Mercado tá agitado. Fica ligado no celular'],
        mal: ['Você não me atende há duas semanas', 'Empresário que não fala com o jogador não vende ninguém'],
      },
    },
    jor: {
      bom: {
        bom: ['Exclusiva? Quero contar a sua história do jeito certo', 'Grande jogo contra o {vs}. Tem dez minutos pra mim amanhã?'],
        ok: ['Tem 5 minutos pra uma pergunta? Sobre o jogo contra o {vs}', 'Seu jogo contra o {vs} rendeu. Posso te ligar?', 'Vou fazer a análise do jogo contra o {vs}. Uma frase sua?', 'Você foi o melhor em campo pra mim. Topa um papo rápido?', 'A redação inteira falou do seu jogo. Me dá uma aspa?'],
        mal: ['Vai continuar sem falar com a imprensa depois de um jogo desses?'],
      },
      ruim: {
        bom: ['Jogo difícil. Se quiser explicar o que houve, o espaço é seu', 'A torcida tá cobrando. Prefere falar comigo antes que falem por você?'],
        ok: ['Uma pergunta só: o que aconteceu contra o {vs}?', 'Tem gente pedindo sua saída do time. Comenta?', 'Noite difícil contra o {vs}. Quer dar a sua versão?', 'A nota dos jornais não foi boa. Concorda com ela?'],
        mal: ['Fontes dizem que o técnico perdeu a paciência com você. Confirma?', 'Vou publicar a matéria sobre a sua fase. Quer comentar?'],
      },
    },
    cap: {
      antes: {
        bom: ['Grupo fechado contigo, moleque. Hoje é dia de decidir', 'Jogo grande amanhã. Quero você do meu lado na hora difícil'],
        ok: ['Amanhã é jogo grande. Cabeça no lugar', 'Concentração total. O grupo precisa de todo mundo'],
        mal: ['Amanhã é jogo grande. Faz a tua parte que o resto a gente vê', 'O grupo não gostou do teu jeito essa semana. Mostra em campo'],
      },
      vitoria: {
        bom: ['Que jogo, moleque! O vestiário tá cantando teu nome', 'Isso é time. Jantar do elenco hoje, você vai'],
        ok: ['Boa vitória. Descansa que vem mais', 'Vitória grande. Ninguém comemora demais, beleza?', 'Passar pelo {vs} assim dá moral pro grupo. Bora', 'Vestiário feliz hoje. Amanhã é trabalho de novo', 'Isso que eu chamo de jogo de time'],
        mal: ['Ganhamos. Mas o grupo ainda espera mais de você'],
      },
      derrota: {
        bom: ['Cabeça erguida. Perdemos juntos, levantamos juntos', 'Doeu. Amanhã reunião do grupo e você fala comigo'],
        ok: ['Derrota dura. Ninguém fala com a imprensa hoje', 'Vamos conversar no treino. Não pode repetir', 'Perder pro {vs} assim não dá. Reunião amanhã cedo', 'Cabeça no próximo. Ninguém posta nada hoje', 'Todo mundo deve mais. Eu também'],
        mal: ['O grupo não gostou do que você falou na entrevista', 'Derrota assim pesa. E tem gente aqui achando que você relaxou'],
      },
      rotina: {
        bom: ['Churrasco do elenco sábado. Você leva o pagode', 'Moleque, os mais novos se espelham em você. Segue assim'],
        ok: ['Churrasco do elenco sábado. Aparece', 'Treino às 9h. Ninguém atrasa'],
        mal: ['Vê se aparece no churrasco do grupo dessa vez'],
      },
    },
    coach: {
      bom: {
        bom: ['Gostei do jogo. Domingo você começa', 'Era isso que eu queria. Continua', 'Jogo de gente grande contra o {vs}. Parabéns', 'Mostrei teu jogo pros mais novos. É o exemplo', 'Do jeito que eu pedi. Segue assim'],
        ok: ['Bom jogo. Segue treinando forte', 'Assim. Agora repete', 'Gostei da entrega contra o {vs}', 'Fez o que a gente treinou. É isso'],
        mal: ['Jogou bem. Mas uma semana boa não apaga o resto'],
      },
      ruim: {
        bom: ['Jogo ruim. Confio em você, mas quero reação', 'Não foi teu dia. Semana de treino forte'],
        ok: ['Abaixo do esperado. Treino às 9h, quero intensidade', 'Precisamos conversar sobre o jogo', 'Revê o vídeo do jogo antes do treino', 'Contra o {vs} faltou concentração. Semana séria'],
        mal: ['Assim não dá. Vou pensar na escalação', 'Você chegou atrasado de novo e jogou mal. Banco no domingo'],
      },
    },
    rival: {
      gol: {
        bom: ['Jogou demais ontem. Mas a Bola de Ouro é minha', 'Bonito gol. Vou ter que fazer dois no fim de semana', '{g} no {vs}. Tá bom, tá bom, foi bonito', 'Meu técnico mostrou teu jogo no vídeo. Que raiva kkk', 'Respeito. Mas o artilheiro do ano vai ser eu'],
        ok: ['Vi teu gol. Domingo eu respondo', 'Domingo a gente se vê', 'Gol contra o {vs}, normal. Quero ver contra time grande', 'Anotei. Minha resposta sai no próximo jogo'],
        mal: ['Gol contra o {vs}? Fácil assim até eu', 'Aproveita que um dia acaba'],
      },
      rotina: {
        bom: ['Tô de olho em você. É elogio', 'Vamos ver quem termina o ano na frente'],
        ok: ['Domingo a gente se vê', 'Vi tua tabela. Tá apertado, hein'],
        mal: ['Aproveita que um dia acaba', 'Ainda tô esperando você chegar no meu nível'],
      },
    },
  };
  // As reações mais comuns (o gol) também saem montadas: começo + o que a pessoa viu + fecho, para não repetir a mesma
  // frase a cada temporada. Só nos tons bom e normal (magoada fala pouco)
  const MIX = {
    mae: { gol: {
      a: ['Filho', 'Meu amor', 'Filhão', 'Oi filho', 'Meu menino'],
      b: ['vi o gol contra o {vs}!!', 'seu pai pulou tanto no gol que bateu a cabeça no lustre kkk', 'a vizinha veio aqui só pra me dar parabéns pelo gol', 'gravei o gol na TV com o celular, ficou torto mas tá lindo',
        'sua avó assistiu o jogo inteiro rezando o terço e no gol jogou o terço pro alto kkk', 'o padre falou do seu gol na missa hoje', 'seu primo disse que o gol foi sorte, briguei com ele',
        'fiz bolo de cenoura pra comemorar, guardei um pedaço', 'chorei no gol, seu pai fingiu que não mas chorou também', 'mandei o vídeo do gol pra família toda, até pro tio que não fala com ninguém'],
      z: ['Te amo', 'Come direito ai', 'Liga pra sua avó', 'Se agasalha', 'Dorme cedo hoje', 'Orgulho de vc', ''] } },
    parca: { gol: {
      a: ['mano', 'MANO', 'ae', 'pai', 'irmão'],
      b: ['que gol no {vs} kkkk', 'o bar inteiro gritou teu nome kkkk', 'tô rouco do teu gol', 'ontem tu fez gol comigo no videogame e hoje fez de verdade kkkk', 'o tiozinho da banca falou que tu é craque, eu disse que sempre soube',
        'o grupo da escola tá em chamas por causa do teu gol kkkk', 'teu gol já virou figurinha no zap', 'apostei uma coxinha que tu marcava e ganhei kkkk', 'até o síndico comemorou', 'gritei tanto que o cachorro do vizinho latiu a noite toda'],
      z: ['kkkk', 'é nóis', 'tu é brabo', 'orgulho da quebrada', 'sexta tem resenha', ''] } },
  };
  // Memória: um fato guardado vira mensagem temporadas depois (uma vez cada)
  const MEM = {
    gol1: { p: 'mae', t: 'Achei o recorte do jornal do seu primeiro gol, contra o {x}. Tá na geladeira até hoje' },
    tit1: { p: 'parca', t: 'mano lembra do primeiro título? {x}. a resenha foi até de manhã kkkk' },
    base: { p: 'emp', t: 'Lembra quando ninguém te queria e o {x} apostou em você? Hoje o telefone não para' },
    lesao: { p: 'mae', t: 'Lembra daquela lesão em {x}? Eu não dormia. Hoje te vejo correndo e agradeço' },
  };
  S.FC_PHONE_TEXT = T; S.FC_PHONE_MEM = MEM;

  function remember(c, id, k, x) {
    const p = c.ppl.p[id];
    if (!p || (p.mem || []).some(m => m.k === k)) return;
    (p.mem = p.mem || []).push({ k, s: c.season, x });
  }
  function fill(c, t, v) {
    return t.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : k === 'me' ? String(c.name || '').split(' ')[0] : k === 'club' ? (D.CLUB_BY_ID[c.club] || {}).name || '' : k === 'rv' ? (c.rival ? c.rival.name : '') : ''));
  }
  // Escreve uma mensagem da pessoa na situação, no tom de hoje, sem repetir as últimas
  function say(c, r, id, sit, v) {
    const P = c.ppl, tone = S.fcTone(c, id), pool = T[id] && T[id][sit] && (T[id][sit][tone] || T[id][sit].ok);
    if (!pool) return null;
    const mx = MIX[id] && MIX[id][sit];
    if (mx && tone !== 'mal' && r() < 0.65) {
      const ks = mx.b.map((_, k) => id + '.' + sit + '.mix.' + k), fr = ks.filter(k => !P.seen.includes(k)), key = r.pick(fr.length ? fr : ks);
      P.seen.push(key); if (P.seen.length > 60) P.seen.splice(0, P.seen.length - 60);
      const cap = t => t.charAt(0).toUpperCase() + t.slice(1), low = id === 'parca';
      let t = r.pick(mx.a) + (low ? ' ' : ', ') + mx.b[+key.split('.').pop()];
      const z = r.pick(mx.z); if (z) t += (low ? ' ' : /[!?]$/.test(t) ? ' ' : '. ') + (low ? z : cap(z));
      return post(c, id, fill(c, low ? t : cap(t), v || {}), tone);
    }
    const keys = pool.map((_, k) => id + '.' + sit + '.' + tone + '.' + k), free = keys.filter(k => !P.seen.includes(k));
    const key = r.pick(free.length ? free : keys), t = pool[+key.split('.').pop()];
    P.seen.push(key); if (P.seen.length > 60) P.seen.splice(0, P.seen.length - 60);
    return post(c, id, fill(c, t, v || {}), tone);
  }
  function post(c, id, t, tone) {
    const P = c.ppl, m = { p: id, t, at: c.fc ? c.fc.i : 0, s: c.season, tone };
    P.inbox.push(m); if (P.inbox.length > 120) P.inbox.splice(0, P.inbox.length - 120);
    P.unread = (P.unread || 0) + 1;
    if (S.fcPhoneHook) S.fcPhoneHook(c, m); // ferramentas: contar e medir repetição
    return m;
  }
  function recall(c, r) {
    const P = c.ppl;
    const due = [];
    for (const id in P.p) (P.p[id].mem || []).forEach(m => { if (!m.used && c.season - m.s >= 2 && MEM[m.k] && MEM[m.k].p === id) due.push([id, m]); });
    if (!due.length) return null;
    const [id, m] = r.pick(due);
    if (m.k === 'base' && m.x === (D.CLUB_BY_ID[c.club] || {}).name) return null; // ainda no primeiro clube: nada a lembrar
    m.used = true;
    return post(c, id, fill(c, MEM[m.k].t, { x: m.x }), S.fcTone(c, id));
  }
  const pickW = (r, list) => { const s = list.reduce((a, x) => a + x[1], 0); let u = r() * s; for (const x of list) if ((u -= x[1]) <= 0) return x[0]; return list[list.length - 1][0]; };

  // ---------- depois do jogo ----------
  const play = S.fcPlay;
  S.fcPlay = function (c) {
    const fc = c.fc;
    if (fc && fc.wkDue) S.fcWeek(c); // como no S.fcPlay: a semana fecha antes de olhar o jogo (senão a escalação sai duas vezes)
    const nx = fc && !fc.done ? S.fcNext(c) : null;
    const big = nx ? S.fcBig(c, nx) : '';
    const out = play.apply(this, arguments);
    if (out && c.mode === 'completa') after(c, out, big);
    return out;
  };
  function after(c, out, big) {
    const P = S.fcPeople(c);
    if (!P) return;
    const fc = c.fc, r = rngFor(c, 0xA77E + (c.season || 0) * 977 + fc.i * 131), m = out.my;
    const vs = out.nx && out.nx.vs ? (D.CLUB_BY_ID[out.nx.vs] || {}).name || '' : '';
    const v = { vs, tt: out.title ? out.title.name : '', g: m && m.goals > 1 ? m.goals + ' gols' : 'gol' };
    if (!P.p.emp.mem.length) remember(c, 'emp', 'base', (D.CLUB_BY_ID[P.first] || {}).name || '');
    // Mudou de clube na janela: a mãe e o parça falam primeiro
    if (P.moved) { if (P.moved === 'longe') { say(c, r, 'mae', 'longe', v); say(c, r, 'parca', 'longe', v); } P.moved = null; }
    if (out.title) {
      remember(c, 'parca', 'tit1', out.title.name);
      ['mae', 'parca', 'emp', 'cap'].forEach(id => rel(c, id, id === 'emp' || id === 'cap' ? 5 : 4));
      const two = ['mae', 'parca', 'emp'].sort(() => r() - 0.5).slice(0, 2);
      two.forEach(id => say(c, r, id, 'titulo', v));
      return;
    }
    if (!m) { if (r() < 0.15) routine(c, r, v); return; }
    const on = m.on, won = m.gf > m.ga, lost = m.gf < m.ga, R = m.rating || 0, G = m.goals || 0;
    if (on && G > 0 && !P.p.mae.mem.some(x => x.k === 'gol1')) remember(c, 'mae', 'gol1', vs);
    // Marca da carreira (10, 25, 50, 100... gols): os gols de antes da temporada + os deste ano
    const tot = ((c.totals && c.totals.goals) || 0) + ((fc.acc && fc.acc.goals) || 0), MK = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500];
    const mark = on && G > 0 ? MK.find(k => tot >= k && tot - G < k) : 0;
    const first = on && G > 0 && fc.acc && fc.acc.goals === G; // primeiro gol da temporada
    if (mark) { v.n = mark; rel(c, 'mae', 2); rel(c, 'parca', 2); }
    // Mensagem só quando o jogo diz algo (marca, jogo grande, dois gols, nota muito alta ou muito baixa), e com folga
    // entre uma e outra: o celular não vira spam de "golaço" toda rodada
    const W = [], hot = !!(mark || out.title || (big && on && (G > 0 || R >= 8 || R < 5.3)) || G >= 2);
    if (mark) W.push([[r() < 0.5 ? 'mae' : 'parca', 'marca'], 10]);
    else if (on && G > 0 && (G >= 2 || big || first)) { W.push([['mae', 'gol'], 3], [['parca', 'gol'], 3]); if (G >= 2 && c.rival && !c.rival.retired) W.push([['rival', 'gol'], 1.2]); }
    if (on && R >= 8.3 && !G) W.push([['emp', 'bom'], 2], [['coach', 'bom'], 2], [['mae', 'vitoria'], won ? 1 : 0]);
    if (on && R >= 8 && big) W.push([['jor', 'bom'], 1.5]);
    if (on && R < 5.3) W.push([['parca', 'ruim'], 2], [['mae', 'ruim'], 2], [['coach', 'ruim'], 2], [['emp', 'ruim'], 1]);
    if (on && R < 5.6 && big) W.push([['jor', 'ruim'], 1.5]);
    // Banco: só quando a sequência fora do time chama atenção (2, 6 e 12 jogos seguidos)
    let off = 0; for (let k = fc.log.length - 1; k >= 0 && !fc.log[k].on; k--) off++;
    if (!on && !(fc.injOut > 0) && [2, 6, 12].includes(off)) W.push([['mae', 'banco'], 1], [['parca', 'banco'], 1]);
    const huge = big === 'classico' || big === 'decisao' || big === 'mata' || big === 'ultima';
    if (huge && on && won) W.push([big === 'classico' ? ['parca', 'classico'] : ['cap', 'vitoria'], 2.5]);
    if (huge && lost) W.push([['cap', 'derrota'], 2], [['parca', 'derrota'], 1]);
    // A mesma reação (pessoa + situação) descansa uns jogos antes de voltar
    P.n = (P.n || 0) + 1; P.ls = P.ls || {};
    const live = W.filter(x => x[1] > 0 && (x[0][1] === 'marca' || !(P.n - (P.ls[x[0].join('.')] || -99) < 8))), gap = fc.i - (P.lastAt === undefined || P.lastS !== c.season ? -9 : P.lastAt);
    if (live.length && (hot || gap >= 3) && r() < (hot ? 0.85 : 0.45)) { const [id, sit] = pickW(r, live); if (say(c, r, id, sit, v)) { P.lastAt = fc.i; P.lastS = c.season; P.ls[id + '.' + sit] = P.n; } }
    else if (gap >= 4 && r() < 0.1) { routine(c, r, v); P.lastAt = fc.i; P.lastS = c.season; }
  }
  function routine(c, r, v) {
    if (r() < 0.5 && recall(c, r)) return;
    const id = pickW(r, [['mae', 3], ['parca', 3], ['emp', 2], ['cap', 1.5], ['rival', c.rival && !c.rival.retired ? 0.8 : 0]].filter(x => x[1] > 0));
    say(c, r, id, 'rotina', v);
  }

  // ---------- antes do jogo (a tela do celular chama com o próximo jogo já montado) ----------
  S.fcPhonePre = function (c, nx) {
    const P = S.fcPeople(c), fc = c.fc;
    if (!P || !fc || !nx || P.pre === fc.season * 1000 + fc.i) return;
    P.pre = fc.season * 1000 + fc.i;
    const r = rngFor(c, 0x9BE0 + (c.season || 0) * 389 + fc.i * 17);
    if (nx.injury && !/suspensão/.test(nx.injury)) {
      const key = fc.season + ':' + fc.injName;
      if (P.inj !== key) {
        P.inj = key;
        say(c, r, 'mae', 'lesao', {});
        if (nx.injLeft >= 8) remember(c, 'mae', 'lesao', (D.CLUB_BY_ID[c.club] || {}).name || '');
      }
      return;
    }
    const big = nx.vs ? S.fcBig(c, nx) : '';
    if ((big === 'classico' || big === 'decisao' || big === 'mata' || big === 'ultima') && nx.on !== false && r() < 0.6) say(c, r, 'cap', 'antes', {});
  };
  // As mensagens que chegaram desde o último jogo (o celular mostra as de agora em cima das notificações)
  S.fcPhoneNew = function (c) {
    const P = c.ppl, fc = c.fc;
    if (!P || !fc) return [];
    return P.inbox.filter(m => m.s === c.season && m.at === fc.i);
  };
  // Conversas: uma por pessoa, a mais recente em cima
  S.fcThreads = function (c) {
    const P = c.ppl;
    if (!P) return [];
    const by = {};
    P.inbox.forEach((m, k) => { (by[m.p] = by[m.p] || []).push(Object.assign({ k }, m)); });
    return Object.keys(by).map(id => ({ id, c: S.fcContact(c, id), msgs: by[id] })).sort((a, b) => b.msgs[b.msgs.length - 1].k - a.msgs[a.msgs.length - 1].k);
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
