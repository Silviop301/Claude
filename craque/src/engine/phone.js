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
    if (out && c.mode === 'completa') { after(c, out, big); if (c.fc && c.fc.wkDue && c.ppl) invOpen(c); }
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

  // ---------- convites da semana (fase 2, parte 2) ----------
  // Chegam no celular quando a semana abre (0 a 2 por semana) e ocupam um dia da agenda. Cada um tem uma opção segura
  // (ganho pequeno e certo) e uma arriscada (pode dar muito, com um lado ruim de verdade); não responder é a terceira
  // escolha, e a pessoa lembra. A resposta sai na hora (o sorteio da arriscada também), não dá para voltar atrás.
  // fx: en (energia), wk (salários da semana: + recebe, − paga), fame, fans, coach, pe (passo de treino), rel {pessoa: n}
  // Na tela, a relação aparece como "Biel gosta" ou "Biel fica chateado", nunca o número.
  const INV = [
    { id: 'niver', p: 'parca', t: ['mano aniversário da minha mãe sábado, ela perguntou se tu vem 🥺', 'sábado tem niver da minha coroa, ela fez questão de te chamar', 'mano minha mãe faz 60 sábado. vai ter bolo e pagode, tu vem?'],
      a: { l: 'Mandar um presente', fx: { wk: -0.25, rel: { parca: 2 } }, re: 'valeu pelo presente mano, ela amou. mas sentiu tua falta kkkk' },
      b: { l: 'Ir à festa', p: 0.7, win: { tag: 'Noite boa', fx: { en: -8, rel: { parca: 7, mae: 2 } }, re: 'mano minha mãe não para de falar que tu veio kkkk valeu demais' },
        lose: { tag: 'Virou madrugada', fx: { en: -22, coach: -3, rel: { parca: 7 } }, re: 'kkkkk tu dormiu no sofá mano. chegou atrasado no treino né' } },
      ig: { fx: { rel: { parca: -7 } }, re: 'visualizou e não respondeu né. de boa', mem: 'niver' } },
    { id: 'gravacao', p: 'emp', t: ['Gravação pra uma marca de energético amanhã cedo. Paga bem.', 'Uma marca de tênis quer você num comercial. Uma manhã só, dinheiro bom.', 'Campanha de celular pra gravar amanhã. É rápido e o cachê é ótimo.'],
      a: { l: 'Recusar', fx: { rel: { emp: -2 } }, re: 'Tudo bem. Mas dinheiro assim não aparece toda semana.' },
      b: { l: 'Gravar', p: 0.6, win: { tag: 'Comercial no ar', fx: { wk: 0.8, fame: 2, en: -8, rel: { emp: 4 } }, re: 'Ficou ótimo, meu garoto! Já tem outra marca perguntando.' },
        lose: { tag: 'Virou meme', fx: { wk: 0.8, fans: -4, en: -8 }, re: 'O vídeo virou meme. Calma, semana que vem ninguém lembra.' } },
      ig: { fx: { rel: { emp: -5 } }, re: 'Te liguei três vezes. A marca fechou com outro.', mem: 'marca' } },
    { id: 'aluguel', p: 'mae', need: 2, t: ['Filho a tia Neide precisa de ajuda com o aluguel, só esse mês', 'Filho seu primo perdeu o emprego. Será que dá pra ajudar com o aluguel dele?', 'Filho não queria pedir mas a casa da sua avó precisa de reforma no telhado'],
      a: { l: 'Mandar metade', fx: { wk: -1, rel: { mae: 3 } }, re: 'Obrigada filho, já ajuda muito. Deus te abençoe' },
      b: { l: 'Pagar tudo', p: 0.6, win: { tag: 'Resolvido', fx: { wk: -1.5, rel: { mae: 10 } }, re: 'Filho vc é um anjo. A família toda tá agradecida' },
        lose: { tag: 'Virou todo mês', fx: { wk: -3, rel: { mae: 10 } }, re: 'Filho... pediram de novo esse mês. Desculpa, sei que é muito' } },
      ig: { fx: { rel: { mae: -8 } }, re: 'Tudo bem filho. A gente se vira aqui', mem: 'aluguel' } },
    { id: 'faltas', p: 'coach', t: ['Quem quiser ficar depois do treino batendo falta, fico até as 13h.', 'Treino extra de finalização amanhã depois do almoço. Opcional.', 'Vou ficar trabalhando posicionamento com quem quiser depois do treino.'],
      a: { l: 'Ir para casa descansar', fx: { en: 5 }, re: 'Tudo bem. Descanso também é treino.' },
      b: { l: 'Ficar no treino extra', p: 0.75, win: { tag: 'Treino bom', fx: { pe: 1, coach: 3, en: -10 }, re: 'Gostei de ver. É assim que se ganha vaga.' },
        lose: { tag: 'Sentiu a coxa', fx: { en: -22, coach: 1 }, re: 'Exagerou. Vai pro gelo e descansa.' } },
      ig: { fx: { coach: -1 }, re: 'Senti tua falta no treino extra.' } },
    { id: 'exclusiva', p: 'jor', t: ['Exclusiva amanhã? Prometo uma pergunta só sobre a seleção.', 'Quero fazer um perfil seu pro programa de domingo. Topa?', 'Tem meia hora amanhã? Matéria grande sobre a sua fase.'],
      a: { l: 'Recusar com educação', fx: { rel: { jor: -1 } }, re: 'Entendo. Fica pra próxima.' },
      b: { l: 'Dar a entrevista', p: 0.65, press: 0.85, win: { tag: 'Matéria boa', fx: { fame: 3, en: -4, rel: { jor: 5 } }, re: 'Ficou linda a matéria. Obrigada!' },
        lose: { tag: 'Frase polêmica', fx: { fame: 1, coach: -4, en: -4, rel: { cap: -5 } }, re: 'Sua frase sobre o técnico virou manchete. Não fui eu que escolhi o título!' } },
      ig: { fx: { rel: { jor: -4 } }, re: 'Sem resposta, vou escrever com o que eu tenho.' } },
    { id: 'emprestimo', p: 'cap', need: 1, t: ['Vou emprestar uma grana pro {x}, ele tá apertado. Entra comigo?', 'O {x} tá enrolado com dívida. O grupo vai ajudar. Tá dentro?', 'Vaquinha pro {x}, a casa dele alagou. Contribui?'],
      a: { l: 'Dizer que não pode', fx: { rel: { cap: -1 } }, re: 'Beleza, sem problema.' },
      b: { l: 'Emprestar', p: 0.5, win: { tag: 'Devolveu', fx: { rel: { cap: 6 }, coach: 1 }, re: 'O {x} devolveu tudo e mandou um abraço. Isso é grupo.' },
        lose: { tag: 'Não voltou', fx: { wk: -1, rel: { cap: 6 } }, re: 'O {x} sumiu com a grana. Foi mal, moleque. Não esqueço que você ajudou.' } },
      ig: { fx: { rel: { cap: -4 } }, re: 'Te chamei e nada. O grupo reparou.' } },
    { id: 'post', p: 'emp', t: ['Marca de chuteira quer um post seu. Simples, ou uma campanha grande?', 'Um app de delivery quer você. Post rápido ou campanha com gravação?', 'Marca de relógio na linha. Story simples ou ensaio de fotos completo?'],
      a: { l: 'Só o post', fx: { wk: 0.4 }, re: 'Feito. Pinga na conta essa semana.' },
      b: { l: 'Campanha grande', p: 0.65, win: { tag: 'Campanha no ar', fx: { wk: 1.5, fame: 2, en: -10, rel: { emp: 3 } }, re: 'Campanha no ar e teu rosto em todo ponto de ônibus!' },
        lose: { tag: 'Campanha cancelada', fx: { en: -10, rel: { emp: -1 } }, re: 'A marca cancelou depois da gravação. Mercado é assim.' } },
      ig: { fx: { rel: { emp: -4 } }, re: 'Perdemos a marca. Responde o celular, garoto.' } },
    { id: 'churrasco', p: 'cap', t: ['Churrasco do elenco sábado. Aparece', 'Resenha do grupo depois do treino de sábado. Conto contigo', 'Aniversário do roupeiro sábado, o grupo todo vai'],
      a: { l: 'Passar rapidinho', fx: { en: -3, rel: { cap: 2 } }, re: 'Valeu por aparecer.' },
      b: { l: 'Ficar até o fim', p: 0.7, win: { tag: 'Grupo fechado', fx: { en: -10, coach: 1, rel: { cap: 6 } }, re: 'Que resenha! O grupo tá fechado contigo.' },
        lose: { tag: 'Exagerou', fx: { en: -20, coach: -3, rel: { cap: 3 } }, re: 'Moleque, o técnico ficou sabendo da hora que você saiu.' } },
      ig: { fx: { rel: { cap: -5 } }, re: 'Faltou só você no churrasco.' } },
    { id: 'resenha', p: 'parca', t: ['e aí sumido, sexta tem resenha lá em casa', 'mano sexta tem pagode no bar do seu Zé, a turma toda vai', 'bora jogar uma bola com a rapaziada do bairro sexta? igual antigamente'],
      a: { l: 'Passar só pra dar oi', fx: { en: -4, rel: { parca: 2 } }, re: 'valeu ter vindo mano, mesmo que rapidinho' },
      b: { l: 'Virar a noite', p: 0.65, win: { tag: 'Noite lendária', fx: { en: -10, rel: { parca: 7 } }, re: 'mano que noite kkkk igual nos velhos tempos' },
        lose: { tag: 'Foto vazou', fx: { en: -10, fans: -2, coach: -2, rel: { parca: 5 } }, re: 'mano vazou uma foto tua de madrugada kkkk foi mal, não fui eu' } },
      ig: { fx: { rel: { parca: -5 } }, re: 'tá famoso demais pros parça né kkkk', mem: 'resenha' } },
    { id: 'visita', p: 'mae', t: ['Filho posso ir te ver no fim de semana? Saudade', 'Filho seu pai quer ver um jogo seu no estádio. A gente pode ir?', 'Filho tô com saudade. Que tal eu passar uns dias ai?'],
      a: { l: 'Mandar passagem e ingresso', fx: { wk: -0.3, rel: { mae: 3 } }, re: 'Obrigada filho! Vou torcer da arquibancada' },
      b: { l: 'Receber em casa', p: 0.6, win: { tag: 'Comida de mãe', fx: { en: 5, rel: { mae: 6 } }, re: 'Deixei comida congelada pra semana toda. Te amo' },
        lose: { tag: 'Veio a família toda', fx: { en: -12, wk: -0.8, rel: { mae: 6 } }, re: 'Desculpa filho, seus tios quiseram vir junto kkk' } },
      ig: { fx: { rel: { mae: -7 } }, re: 'Tudo bem. Fica pra outra vez', mem: 'visita' } },
    { id: 'podcast', p: 'jor', t: ['Vou apresentar um podcast novo. Topa ser o primeiro convidado?', 'Mesa redonda ao vivo domingo à noite. Quer vir?', 'Live com a torcida no meu canal amanhã. Uma hora só.'],
      a: { l: 'Recusar', fx: { rel: { jor: -1 } }, re: 'Tranquilo. Fica o convite.' },
      b: { l: 'Ir ao programa', p: 0.6, press: 0.8, win: { tag: 'Bombou', fx: { fame: 3, fans: 1, en: -6, rel: { jor: 4 } }, re: 'Recorde de audiência! Volta quando quiser.' },
        lose: { tag: 'Falou demais', fx: { fame: 2, coach: -5, en: -6 }, re: 'Aquela parte sobre o banco repercutiu. O clube não gostou.' } },
      ig: { fx: { rel: { jor: -3 } }, re: 'Achei que ia responder. Chamei outro.' } },
  ];
  const INV_BY = Object.fromEntries(INV.map(x => [x.id, x]));
  S.FC_INV = INV;
  Object.assign(MEM, {
    niver: { p: 'parca', t: 'lembra quando tu furou o niver da minha mãe? ela ainda fala kkkk. mas sexta tu vem né' },
    marca: { p: 'emp', t: 'Lembra da marca que você deixou passar? Hoje é a maior do país. Só dizendo.' },
    aluguel: { p: 'mae', t: 'Lembra quando a tia Neide precisou e vc não respondeu? Ela já esqueceu. Eu não' },
    resenha: { p: 'parca', t: 'mano fizeram um churrasco dos amigos de escola e ninguém te chamou. achei que tu nem ia querer kkkk' },
    visita: { p: 'mae', t: 'Seu pai guardou o ingresso daquele jogo que a gente não foi. Ainda tá na carteira dele' },
  });
  const weekPay = c => Math.round((c.wage || 0) * 52 / Math.max(1, (c.fc && c.fc.cal ? c.fc.cal.length : 46)));
  // Valor de um efeito em "semanas" (só para o robô e a auditoria): energia, dinheiro em salários, fama, torcida, técnico,
  // treino e relação. Escala pequena, da semana: não é a mesma régua dos eventos da temporada
  S.fcInvValue = function (c, fx) {
    let v = (fx.en || 0) * 0.1 + (fx.wk || 0) * 1 + (fx.fame || 0) * 0.4 + (fx.fans || 0) * 0.3 + (fx.coach || 0) * 0.3 + (fx.pe || 0) * 1.5;
    for (const k in (fx.rel || {})) v += fx.rel[k] * 0.12;
    return v;
  };
  const pOf = (c, o) => (o.press && c.staff && c.staff.press ? o.press : o.p);
  S.fcInvEV = (c, inv, k) => { const d = INV_BY[inv.id]; if (k === 'ig') return S.fcInvValue(c, d.ig.fx); if (k === 'a') return S.fcInvValue(c, d.a.fx); if (d.b.later) return S.fcInvValue(c, d.b.fx) + (d.b.ev || 0); const p = pOf(c, d.b); return p * S.fcInvValue(c, d.b.win.fx) + (1 - p) * S.fcInvValue(c, d.b.lose.fx); };
  // O efeito na tela: "−10 energia", "+R$ 3 mil", "Fama +2", "Biel gosta", "Técnico −3", "+evolução"
  S.fcInvParts = function (c, fx) {
    const P = [], money = n => 'R$ ' + (Math.abs(n) >= 1e6 ? (Math.abs(n) / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(Math.abs(n) / 1000) + ' mil');
    if (fx.en) P.push((fx.en > 0 ? '+' : '−') + Math.abs(fx.en) + ' energia');
    if (fx.wk) P.push((fx.wk > 0 ? '+' : '−') + money(Math.max(1000, Math.round(Math.abs(fx.wk) * weekPay(c) / 1000) * 1000)));
    if (fx.pe) P.push('+' + String(S.FC_TRAIN_STEP).replace('.', ',') + ' de evolução');
    if (fx.fame) P.push('Fama ' + (fx.fame > 0 ? '+' : '−') + Math.abs(fx.fame));
    if (fx.fans) P.push('Torcida ' + (fx.fans > 0 ? '+' : '−') + Math.abs(fx.fans));
    if (fx.coach) P.push('Técnico ' + (fx.coach > 0 ? '+' : '−') + Math.abs(fx.coach));
    for (const k in (fx.rel || {})) { const n = S.fcContact(c, k).name; P.push(k === 'mae' ? (fx.rel[k] > 0 ? 'Sua mãe gosta' : 'Sua mãe fica chateada') : n + (fx.rel[k] > 0 ? ' gosta' : ' fica chateado')); }
    return P;
  };
  function applyInv(c, fx) {
    const fc = c.fc;
    if (fx.en) fc.en = clamp(fc.en + fx.en, 0, 100);
    if (fx.wk) { const m = Math.max(1000, Math.round(Math.abs(fx.wk) * weekPay(c) / 1000) * 1000) * Math.sign(fx.wk); c.money = Math.max(0, (c.money || 0) + m); }
    if (fx.fame) c.fame += fx.fame;
    if (fx.fans) c.rel.fans = clamp(c.rel.fans + fx.fans, 0, 100);
    if (fx.coach) c.rel.coach = clamp(c.rel.coach + fx.coach, 0, 100);
    if (fx.pe) S.fcTrainPe(c);
    for (const k in (fx.rel || {})) rel(c, k, fx.rel[k]);
  }
  const nm = c => { const n = D.randomName ? D.randomName(leagueCountry(c), rngFor(c, 0xD0 + c.fc.i)) : 'Kauã'; return n.split(' ')[0]; };
  // Abre a semana: sorteia os convites (no máximo 2 do mesmo tipo por temporada e com 5 semanas de folga entre eles)
  function invOpen(c) {
    const P = c.ppl, fc = c.fc;
    if (!fc.wkDue || P.invAt === fc.season * 1000 + fc.i) return;
    P.invAt = fc.season * 1000 + fc.i; P.wk = (P.wk || 0) + 1; P.invLast = P.invLast || {}; P.invN = P.invS === c.season ? P.invN || {} : {}; P.invS = c.season;
    const r = rngFor(c, 0x1A7E + (c.season || 0) * 613 + fc.i * 29);
    const n = r() < 0.5 ? 0 : r() < 0.76 ? 1 : 2;
    const ok = INV.filter(d => !d.story && (d.p !== 'cap' || P.p.cap) && (P.invN[d.id] || 0) < 2 && P.wk - (P.invLast[d.id] || -99) >= 5 && (!d.need || (c.money || 0) >= d.need * 2 * weekPay(c)));
    fc.inv = [];
    for (let k = 0; k < n && ok.length; k++) {
      const d = ok.splice(Math.floor(r() * ok.length), 1)[0];
      if (fc.inv.some(x => INV_BY[x.id].p === d.p)) continue; // uma pessoa, um convite por semana
      P.invT = P.invT || {}; const ti = ((P.invT[d.id] === undefined ? Math.floor(r() * d.t.length) - 1 : P.invT[d.id]) + 1) % d.t.length; P.invT[d.id] = ti; // os textos se revezam
      fc.inv.push({ id: d.id, ti, x: d.id === 'emprestimo' ? nm(c) : '', ans: null });
      P.invLast[d.id] = P.wk; P.invN[d.id] = (P.invN[d.id] || 0) + 1;
    }
    storyTick(c, r);
  }
  // ---------- histórias que voltam (fase 2, parte 3) ----------
  // Uma história é uma sequência de 3 a 5 passos espalhados pelas temporadas: um convite que decide o rumo e mensagens que
  // contam o que veio depois (com um segundo convite quando dá problema). Estado em c.ppl.st[id] = { n: passo, due:
  // temporada do próximo passo, f: o que você decidiu }. No máximo uma história começa por temporada; cada passo sai numa
  // semana a partir do 6º jogo do ano, nunca junto com outro convite da mesma pessoa.
  const go = (c, id, n, wait, f) => { const st = c.ppl.st[id]; st.n = n; st.due = c.season + (wait || 0); if (f) Object.assign(st.f, f); };
  const end = (c, id) => { const st = c.ppl.st[id]; st.n = 0; st.done = c.season; };
  INV.push(
    { id: 'bar1', story: 'bar', p: 'parca', t: ['mano tive uma ideia. bar com o teu nome no bairro. tu entra com a grana e eu toco. bora?'],
      a: { l: 'Desejar boa sorte', fx: { rel: { parca: 1 } }, re: 'de boa mano, vou atrás de outro sócio' },
      b: { l: 'Entrar de sócio', ev: 6, later: 'O bar pode dar lucro ou problema nas próximas temporadas', fx: { wk: -6, rel: { parca: 6 } }, re: 'É NÓIS mano kkkk vou pendurar tua camisa na parede' },
      ig: { fx: { rel: { parca: -4 } }, re: 'achei que tu ia topar. deixa quieto' },
      then: (c, a) => (a === 'b' ? go(c, 'bar', 2, 1, { in: 1 }) : go(c, 'bar', 2, 1, { in: 0 })) },
    { id: 'bar3', story: 'bar', p: 'parca', t: ['mano deu ruim, o fiscal fechou o bar. preciso de uma grana pra reabrir'],
      a: { l: 'Mandar uma parte', fx: { wk: -1.2, rel: { parca: 2 } }, re: 'valeu mano, já ajuda. vou ver o resto com o banco' },
      b: { l: 'Mandar tudo', ev: 4, later: 'Reaberto, o bar pode voltar a dar lucro', fx: { wk: -2.5, rel: { parca: 7 } }, re: 'mano tu salvou o bar. não esqueço nunca' },
      ig: { fx: { rel: { parca: -8 } }, re: 'tudo bem. fechei o bar. foi bom enquanto durou' },
      then: (c, a) => (a === 'b' ? go(c, 'bar', 4, 1, { help: 1 }) : a === 'a' ? go(c, 'bar', 4, 1, { help: 0.5 }) : end(c, 'bar')) },
    { id: 'casa1', story: 'casa', p: 'mae', t: ['Filho eu e seu pai queremos voltar pra nossa cidade. A casa de lá tá caindo aos pedaços'],
      a: { l: 'Ajudar na reforma', fx: { wk: -1.5, rel: { mae: 5 } }, re: 'Obrigada filho, seu pai já chamou o pedreiro' },
      b: { l: 'Comprar uma casa nova', ev: 2, later: 'Eles se mudam no ano que vem, e a cidade inteira fica sabendo', fx: { wk: -6, rel: { mae: 12 } }, re: 'FILHO!!! Seu pai não consegue nem falar. Te amo' },
      ig: { fx: { rel: { mae: -6 } }, re: 'Tudo bem filho. A gente dá um jeito', mem: 'casa' },
      then: (c, a) => (a === 'ig' ? end(c, 'casa') : go(c, 'casa', 2, 1, { casa: a === 'b' ? 1 : 0 })) },
    { id: 'pat1', story: 'pat', p: 'emp', t: ['Fechei um patrocínio de três anos com uma marca grande. Muito dinheiro, mas tem cláusula de gravação.'],
      a: { l: 'Não assinar', fx: { rel: { emp: -2 } }, re: 'Você que sabe. Contrato assim não aparece de novo.', mem: 'pat' },
      b: { l: 'Assinar', ev: 0, later: 'Paga todo ano; a marca pode pedir gravação em semana de jogo', fx: { wk: 1, rel: { emp: 5 } }, re: 'Assinado! Meu garoto agora é garoto-propaganda.' },
      ig: { fx: { rel: { emp: -5 } }, re: 'A marca cansou de esperar. Fechou com outro.', mem: 'pat' },
      then: (c, a) => (a === 'b' ? go(c, 'pat', 2, 1, { y: 0 }) : (a === 'a' && remember(c, 'emp', 'pat', ''), end(c, 'pat'))) },
  );
  INV.forEach(x => { INV_BY[x.id] = x; });
  Object.assign(MEM, {
    casa: { p: 'mae', t: 'Seu pai ainda fala da casa da nossa cidade. Ele passa na frente e fica olhando' },
    pat: { p: 'emp', t: 'Lembra do patrocínio de três anos que você não quis? A marca virou a maior do país. Só dizendo.' },
  });
  const STORIES = [
    { id: 'bar', from: 2, ok: c => (c.money || 0) >= 8 * weekPay(c) },
    { id: 'casa', from: 4, ok: c => (c.money || 0) >= 14 * weekPay(c) },
    { id: 'pat', from: 3, ok: c => (c.fame || 0) >= 10 },
  ];
  // Passos que são mensagens (ou um convite quando o rumo pede)
  function storyStep(c, id, r) {
    const st = c.ppl.st[id], f = st.f, P = c.ppl;
    const say1 = (p, t, fx) => { if (fx) applyInv(c, fx); post(c, p, t, S.fcTone(c, p)); };
    const invite = iid => { c.fc.inv.push({ id: iid, ti: 0, x: '', ans: null }); };
    if (st.n === 1) return invite(id + '1');
    if (id === 'bar') {
      if (st.n === 2) { if (!f.in) { say1('parca', 'de boa mano, o primo do Kauã entrou de sócio no teu lugar. o bar tá indo'); return end(c, id); }
        say1('parca', 'o bar tá lotado nos dias de jogo kkkk tua camisa tá na parede'); return go(c, id, 3, 1); }
      if (st.n === 3) { if (r() < 0.5) { say1('parca', 'mano o bar deu lucro, tua parte tá aqui. é nóis', { wk: 9 }); return go(c, id, 5, 2, { good: 1 }); } return invite('bar3'); }
      if (st.n === 4) { if (f.help === 1 && r() < 0.7) { say1('parca', 'reabrimos e tá bombando kkkk tua parte do mês caiu aí', { wk: 6 }); return go(c, id, 5, 2, { good: 1 }); }
        say1('parca', f.help === 1 ? 'não deu mano, fechou de vez. mas valeu, irmão. tu foi o único que ajudou' : 'reabri pequeno, só no fim de semana. valeu pela força'); return f.help === 1 ? go(c, id, 5, 2) : end(c, id); }
      if (st.n === 5) { say1('parca', 'tu foi o único que nunca me largou. no teu jogo de despedida o bairro inteiro vai tá lá', { rel: { parca: 5 }, fame: 1 }); remember(c, 'parca', 'bar', ''); return end(c, id); }
    }
    if (id === 'casa') {
      if (st.n === 2) { if (f.casa) { say1('mae', 'Filho a casa nova tem varanda que dá pro campinho onde vc começou. Seu pai fica lá o dia todo', { fans: 2 }); return go(c, id, 3, 2); }
        say1('mae', 'A reforma ficou linda filho. Seu pai pintou o portão com as cores do seu time kkk'); return end(c, id); }
      if (st.n === 3) { say1('mae', 'Os meninos do campinho agora jogam com camisa com seu nome. Seu pai que deu pra todos', { fame: 1, rel: { mae: 3 } }); return end(c, id); }
    }
    if (id === 'pat') {
      if (st.n === 2) {
        f.y = (f.y || 0) + 1;
        say1('emp', 'Caiu a parcela do patrocínio. ' + (f.y < 3 ? 'Ano ' + f.y + ' de 3.' : 'Última do contrato.'), { wk: 1.5 });
        if (r() < 0.5) say1('emp', 'A marca exigiu uma gravação na véspera do jogo. Cláusula é cláusula, garoto.', { en: -25, coach: -2 });
        return f.y >= 3 ? go(c, id, 3, 1) : go(c, id, 2, 1);
      }
      if (st.n === 3) { say1('emp', 'Acabou o contrato com a marca. Eles gostaram: quando quiser renovar, me liga.', { rel: { emp: 3 } }); return end(c, id); }
    }
  }
  function storyTick(c, r) {
    const P = c.ppl, fc = c.fc;
    P.st = P.st || {}; P.s0 = P.s0 === undefined ? c.season : P.s0;
    if (fc.i < 6) return; // o começo do ano é dos jogos
    const busy = new Set(fc.inv.map(x => INV_BY[x.id].p));
    // Um passo por semana, de uma história que já está andando
    for (const S0 of STORIES) {
      const st = P.st[S0.id];
      if (!st || !st.n || st.due > c.season || st.at === c.season * 1000 + fc.i) continue;
      const pid = INV_BY[S0.id + '1'].p;
      if (busy.has(pid) || r() > 0.25) continue;
      st.at = c.season * 1000 + fc.i; st.due = 999; // o passo decide quando volta
      storyStep(c, S0.id, r);
      if (st.due === 999) st.due = c.season + 1;
      return;
    }
    // Uma história nova por temporada, no máximo
    if (P.stS === c.season || r() > 0.12) return;
    const can = STORIES.filter(x => !P.st[x.id] && c.season - P.s0 >= x.from && x.ok(c) && !busy.has(INV_BY[x.id + '1'].p));
    if (!can.length) return;
    const x = can[Math.floor(r() * can.length)];
    P.st[x.id] = { n: 1, due: 999, f: {}, at: c.season * 1000 + fc.i }; P.stS = c.season; // a resposta do convite marca o próximo passo
    storyStep(c, x.id, r);
  }
  S.fcStories = c => (c.ppl && c.ppl.st) || {};

  S.fcInvites = c => (c.fc && c.fc.wkDue && c.fc.inv) || [];
  S.fcInvText = (c, inv) => fill(c, INV_BY[inv.id].t[inv.ti], { x: inv.x });
  S.fcInvDef = inv => INV_BY[inv.id];
  // Responde: 'a' (segura) ou 'b' (arriscada, sorteada agora). Volta o que aconteceu
  S.fcInvAnswer = function (c, k, ans) {
    const fc = c.fc, inv = (fc.inv || [])[k];
    if (!inv || inv.ans || !fc.wkDue || (ans !== 'a' && ans !== 'b')) return null;
    const d = INV_BY[inv.id], r = rngFor(c, 0x5A5E + (c.season || 0) * 211 + fc.i * 41 + k);
    let o, ok = true;
    if (ans === 'a') o = d.a;
    else if (d.b.later) o = d.b; // história: o que acontece vem nas próximas temporadas
    else { const roll = Math.floor(r() * 100) + 1, p = Math.round(pOf(c, d.b) * 100); ok = roll <= p; o = ok ? d.b.win : d.b.lose; inv.roll = roll; inv.p = p; }
    applyInv(c, o.fx); inv.ans = ans; inv.ok = ok; inv.tag = o.tag || '';
    post(c, d.p, fill(c, o.re, { x: inv.x }), S.fcTone(c, d.p));
    if (ans === 'a' && d.id === 'niver') remember(c, 'parca', 'niver', '');
    if (d.then) d.then(c, ans, ok);
    return { ok, tag: o.tag || '', parts: S.fcInvParts(c, o.fx) };
  };
  // Fecha a semana: o que ficou sem resposta
  S.fcInvClose = function (c, out) {
    const fc = c.fc;
    if (!c.ppl || !fc.inv) return;
    (fc.inv || []).forEach(inv => {
      if (inv.ans) return;
      const d = INV_BY[inv.id];
      applyInv(c, d.ig.fx); inv.ans = 'ig';
      post(c, d.p, fill(c, d.ig.re, { x: inv.x }), S.fcTone(c, d.p));
      if (d.ig.mem) remember(c, d.p, d.ig.mem, '');
      if (d.then) d.then(c, 'ig', false);
    });
    if (out) out.inv = fc.inv.map(x => ({ id: x.id, ans: x.ans, ok: x.ok }));
    fc.inv = null;
  };
  // Robô (simulador e auditoria): responde cada convite pela melhor média; RND=1 responde ao acaso
  S.fcInvAuto = function (c, rnd) {
    S.fcInvites(c).forEach((inv, k) => {
      if (inv.ans) return;
      const opts = ['a', 'b', 'ig'];
      const pick = rnd ? opts[Math.floor(Math.random() * 3)] : opts.sort((x, y) => S.fcInvEV(c, inv, y) - S.fcInvEV(c, inv, x))[0];
      if (pick !== 'ig') S.fcInvAnswer(c, k, pick);
    });
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
