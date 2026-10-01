// Nas redes: o post e um comentário da torcida para cada evento, conforme a opção escolhida.
// D.SOCIAL.ev[id] = [opção 0, opção 1, ...]; cada opção = [post, comentário]
//   post e comentário: texto único ou [deu certo, deu errado] (quando a opção pode falhar)
// D.SOCIAL.evMove[id] = [post, comentário] quando a escolha leva a outro clube ({time} já é o clube novo)
// Mesmos marcadores dos outros posts: {n} {time} {doTime} {noTime} {aoTime} {num} {idade} {cor}
(function () {
  const D = window.CRAQUE_DATA;
  D.SOCIAL.ev = {
    banco: [
      [['Treinei calado, treinei dobrado e a vaga veio. Obrigado pela confiança, professor 💪', 'Ainda não foi dessa vez. Mas eu não paro de treinar até a vaga ser minha 💪'],
        ['Isso é que é brigar pela vaga! Titular merecido 👏', 'Esse técnico tá cego? Coloca o {n} pra jogar!']],
      ['Momento de ajudar de onde eu estiver. Banco também é time 🤝', 'Atitude de profissional. Sua hora vai chegar, {n}'],
    ],
    assedio: [null, ['Sobre as notícias: eu fico. Renovado e feliz {noTime} {cor}', 'Recusou proposta pra ficar com a gente? Respeito eterno {cor}']],
    funcao: [
      ['Função nova, mesma vontade. Onde o professor precisar, eu jogo 💪', 'Jogador inteligente joga em qualquer lugar 🧠'],
      ['Conversei com o professor e expliquei onde rendo mais. Agora é mostrar em campo ⚽', 'Recusou a função? Agora vai ter que jogar muito, hein 👀'],
    ],
    arabia: [null, ['Recebi uma proposta que mudaria minha vida. Recusei. Tem coisa que dinheiro não paga {cor}', 'Recusou milhões pra ficar aqui. A faixa na arquibancada é pouco 😭']],
    renovar: [
      ['Mais 3 anos {noTime}! Aqui é minha casa ✍️{cor}', 'Renovou por 3 anos! Melhor notícia da semana 🙌'],
      ['Renovado! Feliz por seguir {noTime} ✍️', 'Cláusula de saída? Hmm... tô de olho 👀'],
    ],
    capitao: [
      ['Capitão {doTime}. Uma honra carregar essa faixa. Prometo honrar cada jogo 🫡{cor}', 'Nosso capitão! Faixa no braço certo 💪'],
      ['Agradeço a confiança do professor. Sigo liderando do meu jeito, dentro de campo ⚽', 'Nem precisa de faixa pra ser líder 🫡'],
    ],
    classico: [
      [['Mancando, mas de pé. Clássico é clássico! 🔥', 'Quis ajudar e o corpo não deixou. Agora é recuperação. Volto mais forte 🙏'],
        ['Jogou com uma perna e ganhou o clássico. Herói! 🦸', 'Precisava ter forçado? Se cuida, {n} 🙏']],
      ['Decisão difícil, mas o certo era cuidar do corpo. Logo estou de volta 🙏', 'Clássico sem o {n}... mas antes isso que perder ele meses'],
    ],
    festa: [
      [['Dá pra curtir e jogar bem. Ontem provei 😎', 'Errei. Peço desculpas ao grupo e ao professor. Vou responder em campo 🙏'],
        ['Festa na véspera e ainda jogou bem? Lenda 😂', 'Festa na véspera, {n}? Sério? 🤦']],
      ['Sábado à noite: sofá, série e cama cedo. Amanhã tem jogo 😴', 'Ficou em casa? Profissional demais 👏'],
    ],
    sub20: [
      ['Vestir a camisa da seleção é um sonho. Que orgulho! 🙏', 'O país inteiro te conheceu agora! Seleção é pouco 🔥'],
      ['Meu foco agora é o {time}. A seleção vai chegar na hora certa {cor}', 'Escolheu ficar com a gente. Respeito! {cor}'],
    ],
    protesto: [
      [['Fui lá conversar olho no olho. Torcida e time juntos, sempre {cor}', 'Tentei conversar. Não deu. Respeito o protesto, mas sigo trabalhando 💪'],
        ['Encarou a torcida de peito aberto. Isso é jogador!', 'Saiu vídeo dessa conversa... que climão 😬']],
      ['Tem momento que a gente precisa pensar no futuro. Obrigado por tudo, {time} 🙏', 'Já tá pedindo pra sair?? 😡'],
    ],
    tecnico: [
      ['Ponta, centro, lateral... onde o professor mandar 😂 Bora!', 'Na ponta também resolve! Peça-chave 🔑'],
      [['Conversa franca com o professor. Agora é jogar onde eu rendo mais ⚽', 'Nem toda conversa termina como a gente quer. Vou ganhar a vaga no treino 💪'],
        ['O professor montou o time em volta de você. Craque é assim 👑', 'Bateu de frente com o técnico... agora é banco 😬']],
    ],
    mentor: [
      ['Aula particular com um veterano todo dia depois do treino. Aprendizado que não tem preço 🙏', 'Aprender com quem já ganhou tudo! Vai voar 🚀'],
      ['Férias merecidas 🏖️ Volto com tudo', 'Descansa, que a temporada vai ser longa 😴'],
    ],
    patrocinio: [
      ['Novo parceiro! Orgulho de estampar essa marca 🤝', 'Te vi no outdoor da avenida! Rosto lindo 😂'],
      ['Agradeço o convite, mas agora meu foco é só o campo ⚽', 'Recusou patrocínio pra focar no futebol? Raiz demais'],
    ],
    redes: [
      ['Errei no que falei. Peço desculpas a quem se sentiu ofendido. Aprendizado 🙏', 'Pediu desculpas, assunto encerrado. Bola pra frente'],
      [['Falei e não volto atrás 😎 Quem gostou, gostou', 'O professor me chamou pra conversar. Mensagem recebida 😅'],
        ['Virou meme e eu tô rindo até agora 😂', 'Precisava dobrar a aposta, {n}? 🤦']],
    ],
    joelho: [
      [['Com dor ou sem dor, eu tô lá. Joelho aguentou firme 💪', 'O joelho não aguentou. Agora é cirurgia e muita fisioterapia. Volto 🙏'],
        ['Ninguém percebeu nada! Jogou demais', 'Força, {n}! Volta inteiro, sem pressa 🙏']],
      ['Algumas semanas de tratamento e já estou de volta. Corpo em primeiro lugar 🩺', 'Melhor decisão. Volta 100%!'],
    ],
    faltas: [
      ['Centenas de cobranças por dia. A bola tá começando a obedecer 🎯', 'Treino de falta todo dia? Vem golaço por aí 🎯'],
      ['Descanso também é treino 😴', 'Descansa e volta voando'],
    ],
    caridade: [
      ['A escolinha da minha cidade agora tem nome. Retribuir é o mínimo 🙏❤️', 'Craque dentro e fora de campo. Orgulho de torcer por você ❤️'],
      ['Ajudar a minha cidade vai acontecer na hora certa. Prometo 🙏', 'Fica pra próxima então, {n}'],
    ],
    reencontro: [
      ['Respeito eterno a quem me abriu as portas. Não comemorei. Nunca vou comemorar 🙏', 'Marcou e não comemorou. Que respeito, {n} 👏'],
      ['Gol é gol, e eu comemoro onde estiver 😤🔥', 'Comemorou na cara deles?? A antiga torcida nunca vai esquecer 😂'],
    ],
    estudos: [
      ['Diploma na mão! Futebol de dia, sala de aula à noite. Mãe, conseguimos 🎓', 'Craque e formado! Exemplo pra molecada 🎓'],
      ['Foco total no futebol. Um sonho de cada vez ⚽', 'Corpo descansado, cabeça na bola 💪'],
    ],
    carro: [
      ['Realizei um sonho de moleque. Esse aqui é pra quem disse que eu não chegava 🏎️', 'Carrão? Eu queria ver era gol, {n} 🙄'],
      ['Hoje entreguei as chaves da casa nova pra minha mãe. O melhor dia da minha vida 🏠❤️', 'Chorei com o vídeo da sua mãe 😭❤️'],
    ],
    saudade: [
      ['A família chegou! Agora sim me sinto em casa 🏠❤️', 'Família por perto, futebol fluindo! 🙌'],
      [['Longe de casa, mas perto do sonho. Cada dia mais forte 💪', 'Tem dia que a saudade aperta. Obrigado pelas mensagens de carinho 🙏'],
        ['Amadureceu demais, dá pra ver no campo', 'Força, {n}! A torcida também é sua família']],
    ],
    olheiro: [
      [['Joguei pra me divertir e saiu tudo certo 😎', 'Prendi demais a bola hoje. Aprendizado: o time vem primeiro 🙏'],
        ['Olheiro saiu do estádio querendo te contratar 🤩', 'Fominha demais hoje, hein 😬']],
      ['Vitória do time é a melhor vitória 🤝', 'Jogador de time! O olheiro viu isso'],
    ],
    empresario: [
      ['Novo time ao meu lado fora de campo. Grandes planos vêm aí 🤝', 'Já vai sair? Empresário novo é sinal de transferência 👀'],
      ['Quem esteve comigo no começo vai estar comigo até o fim 🤝', 'Lealdade é coisa rara. Respeito 👏'],
    ],
    dieta: [
      ['Três quilos a menos e muito fôlego a mais. Obrigado, nutri 🥗', 'Você tá voando em campo! A dieta funcionou 💪'],
      ['Equilíbrio é tudo. Salada de segunda a sábado, churrasco no domingo 🥩😂', 'Churrasco no domingo é sagrado mesmo 🥩'],
    ],
    fisgada: [
      [['Uma fisgada não ia me tirar desse jogo 💪', 'Forcei e virou estiramento. Agora é paciência e fisioterapia 🙏'],
        ['Jogou com dor e ainda foi o melhor!', 'Precisava jogar assim, {n}? Se cuida 🙏']],
      ['Avisei o médico, duas semanas de tratamento e estou 100% 🩺', 'Corpo é ferramenta de trabalho. Fez certo!'],
    ],
    jejum: [
      ['Trezentas finalizações por dia depois do treino. A bola voltou a me obedecer ⚽', 'Treinou até a bola cansar! Agora é gol atrás de gol'],
      ['Cuidar da cabeça também é treino. Obrigado à nossa psicóloga 🧠🙏', 'Cuidar da cabeça é coisa de gente grande. Os gols voltaram! 🧠'],
      [['DESENCANTOU! De canela, mas vale igual 😂⚽', 'A fase não é boa, mas eu sigo confiante. Vai entrar 🙏'],
        ['Gol de canela também vale! Desencantou 😂', 'Seca continua... mas a gente confia em você']],
    ],
    cobrador: [
      [['Bola na marca da cal é minha. Pode confiar 🎯', 'Exagerei na discussão. Grupo acima de tudo 🙏'],
        ['Cobrador oficial! Agora é gol todo jogo 🎯', 'Briga pelo pênalti em público? Clima pesado 😬']],
      ['Grupo forte é grupo unido. Pode bater, irmão 🤝', 'Gesto de grupo. Isso é time 🤝'],
    ],
    var: [
      [['Eu falo o que todo mundo viu. Gol legítimo 📺', 'Falei com a cabeça quente e vou pagar com suspensão. Aprendi 🙏'],
        ['Falou tudo! A torcida tá contigo 📢', 'Dois jogos de gancho... valeu a pena, {n}? 🤦']],
      ['Não adianta reclamar. Bola pra frente, próximo jogo ⚽', 'Maturidade. Esse VAR que lute'],
    ],
    provocacao: [
      [['Ele provocou, eu respondi. Acabou a conversa 😤', 'Perdi a cabeça. Peço desculpas ao grupo. Três jogos fora, volto melhor 🙏'],
        ['Mediu forças e ele sumiu do jogo 😂', 'Vermelho por revidar... cabeça fria, {n}!']],
      ['A melhor resposta é sempre com a bola ⚽🤫', 'Drible no provocador e gol. Resposta perfeita 🤫'],
    ],
    volante: [
      ['Zagueiro de volante e descobri um passe longo que nem eu sabia que tinha 😂', 'Esse lançamento foi de meia, não de zagueiro! 🎯'],
      ['Meu lugar é na zaga, e lá eu vou dar o meu melhor 🛡️', 'Zagueiro raiz. Respeito'],
    ],
    reserva_gol: [
      ['Concorrência faz bem. Treino dobrado e o gol segue fechado 🧤', 'Ninguém tira esse gol de você 🧤'],
      [['O garoto tem talento e vou ajudar ele a crescer. Goleiro é família 🧤🤝', 'O garoto aproveitou a chance. Mérito dele. Vou buscar meu lugar de volta 💪'],
        ['Liderança de verdade. Respeito máximo 🫡', 'Ensinou o garoto e ele tomou a vaga 😅']],
    ],
    goleiro_area: [
      [['GOL DO GOLEIRO!!! Eu não acredito até agora 😱🧤⚽', 'Fui pro tudo ou nada. Dessa vez foi nada. Assumo 🙏'],
        ['GOLEIRO ARTILHEIRO! Eu tava no estádio 😭', 'Subiu e tomou gol no contra-ataque 🤦']],
      ['Perder por pouco dói, mas o gol ficou guardado 🧤', 'Segurou a posição. Fez o certo'],
    ],
    treino_gol: [
      ['Reflexo afiado. As bolas que entravam agora param na minha mão 🧤⚡', 'Que reflexo! Treino novo funcionando 🧤'],
      ['Goleiro moderno sai jogando. Treino de pé todo dia ⚽🧤', 'O time sai jogando com você agora. Goleiro moderno 👏'],
    ],
    aereo: [
      ['Treino de bola aérea pago. Cruzamento na área agora é meu 💪', 'Tempo de bola perfeito! Ninguém ganha de você no alto'],
      ['Pescoço poupado, corpo inteiro pra temporada 😅', 'Descansa que a temporada é longa'],
    ],
    atraso: [
      [['Juntos somos mais fortes. Salários em dia, agora é só bola ⚽🤝', 'Defendi meus companheiros. Não me arrependo, mesmo com o clima pesado 🤝'],
        ['Liderou a greve e resolveu. Respeito!', 'Greve? E a gente na arquibancada como fica? 😡']],
      ['Meu trabalho é jogar. Sigo dando o meu melhor por essa camisa {cor}', 'Jogou sem receber e ainda foi bem. Profissional demais'],
      ['Preciso pensar na minha família. Obrigado por tudo, {time} 🙏', 'Sem salário ninguém fica. Entendo, {n}'],
    ],
    presidente: [
      [['Confiei e ele cumpriu. Três reforços chegaram! Vem temporada boa 🚀', 'Renovei acreditando no projeto. Os reforços não vieram, mas eu sigo aqui {cor}'],
        ['Renovou e ainda chegou reforço! Ano promete 🔥', 'Promessa de presidente... nunca acredita, {n} 😂']],
      ['Antes de assinar, quero ver o projeto andar. Tô feliz aqui {cor}', 'Esperto. Primeiro os reforços, depois a caneta ✍️'],
    ],
    vestiario: [
      [['Grupo unido de novo. Briga se resolve conversando 🤝', 'Tentei separar e sobrou pra mim 😅 Mas grupo é isso, a gente resolve'],
        ['Isso é liderança! Segurou o vestiário 💪', 'Levou empurrão tentando ajudar... 😬']],
      ['Foco no meu trabalho. A comissão resolve o resto ⚽', 'Ficou de fora da confusão. Sábio'],
    ],
    rival: [null, ['"Aqui é minha casa." Não tem dinheiro que me faça vestir aquela camisa {cor}', 'A frase já virou bandeira na arquibancada! Ídolo {cor}']],
    gringo: [
      ['Aula de idioma toda noite. Já entendo tudo que o professor fala 📚😄', 'Já virou o intérprete do elenco kkkk 😂'],
      [['O tradutor é craque também. Tudo entendido 🤝', 'Um mal-entendido tático e eu levei a bronca. Vou aprender o idioma 😅'],
        ['Deu certo com tradutor mesmo! Bola não tem idioma ⚽', 'Bronca na frente de todo mundo por causa do tradutor 😂']],
    ],
    estrela: [
      [['Chegou estrela? Ótimo. Concorrência me faz melhor. A vaga continua minha ⭐', 'O professor escolheu. Respeito. Vou trabalhar pra voltar 💪'],
        ['O craque famoso virou SEU reserva 😂⭐', 'Perdeu a vaga pro recém-chegado... reage, {n}!']],
      ['Elenco forte é bom pra todo mundo. Rodízio e foco nos títulos 🤝', 'Maturidade. Elenco forte ganha título'],
      ['Preciso jogar. Vou buscar um lugar onde eu seja peça importante 🙏', 'Vai sair por causa de uma estrela? Fica, {n}!'],
    ],
    demitido: [
      ['Obrigado, professor. Tudo o que eu sou hoje tem um pouco de você 🙏', 'Defendeu o técnico demitido. Lealdade rara 🫡'],
      ['Página virada. Agora é foco no novo trabalho ⚽', 'Vida que segue. Bora com o professor novo'],
    ],
    organizada: [
      [['Que noite com a bateria! Essa torcida é diferente {cor}🥁', 'Fui com carinho e terminou em confusão. Não compactuo com violência 🙏'],
        ['Cantou com a bateria! Virou um de nós 🥁{cor}', 'Saiu foto sua no meio da confusão 😬']],
      ['Não deu pra ir, mas mandei meu recado. Vocês são gigantes {cor}', 'O vídeo passou no telão e todo mundo gritou seu nome!'],
    ],
    homenagem: [
      ['Chorei. O estádio chorou junto. Obrigado, {time}. Nunca vou esquecer {cor}😭', 'Eu tava lá e chorei junto 😭'],
      ['Placa na mão, chuteira no pé e ainda saiu gol. Obrigado pela homenagem {cor}', 'Recebeu a placa e foi fazer gol. Isso é ídolo'],
    ],
    padrinho: [
      ['Meu afilhado marcou na estreia e correu pra me abraçar. Orgulho 🥹🤝', 'O garoto correu pra te abraçar 😭 Que cena'],
      ['Cabeça no meu jogo. Cada um no seu caminho ⚽', 'Foco total no próprio jogo 💪'],
    ],
    centenario: [
      ['Estrelar a campanha do aniversário {doTime} é uma honra 🎂{cor}', 'Comprei a camisa da campanha! Esgotou em um dia 👕'],
      ['O aniversário é dos ídolos que construíram essa história. Eu só sigo o caminho deles 🙏', 'Humildade de quem respeita a história do clube'],
    ],
    casamento: [
      ['Casei!!! Festa pra 800 pessoas e eu ainda tô cansado 😂💍', 'Festança! Mas volta pro treino, hein 😂'],
      ['Só a família e quem a gente ama. O dia mais feliz da minha vida 💍❤️', 'Que casamento lindo! Felicidades ❤️'],
    ],
    filho: [
      ['Ele nasceu. Eu vi. Nada no futebol se compara a isso 👶❤️', 'Prioridade certa. Parabéns, papai! 👶'],
      [['Esse gol é pra você, filho! Embalei o bebê na comemoração 👶⚽', 'Meu filho nasceu enquanto eu jogava. Corri pro hospital depois do jogo. Seja bem-vindo 👶❤️'],
        ['Comemoração de embalar o bebê! Foto do ano 😭', 'Perdeu o parto pra jogar... espero que tenha valido 🙏']],
    ],
    documentario: [
      [['A série está no ar! Obrigado por assistirem minha história 🎬', 'Nem tudo que aparece na tela é o que parece. Eu e o professor estamos bem 🎬'],
        ['Maratonei a série inteira num dia 🍿', 'Aquele episódio 3... que climão 😬']],
      ['Minha vida fora de campo é minha. Dentro de campo, é de vocês ⚽', 'Privacidade é tudo'],
    ],
    podcast: [
      [['Papo sem filtro! Obrigado pelo convite 🎙️', 'Pegaram um trecho fora do contexto. Assistam o episódio inteiro antes de julgar 🎙️'],
        ['Melhor episódio que já vi! Falou tudo 🎙️', 'Esse corte rodou a internet inteira... 😬']],
      ['Muita risada e histórias de infância. Foi bom demais 🎙️😂', 'A história da infância me matou de rir 😂'],
    ],
    negocio: [
      [['Novo negócio e deu certo! Investir no futuro também é treino 📈', 'Nem todo investimento dá certo. Lição aprendida 📉'],
        ['Jogador e empresário de sucesso 📈', 'Perdeu dinheiro nessa sociedade? Que pena 😬']],
      ['Dinheiro guardado é dinheiro tranquilo 😌', 'Pé no chão. Sábio'],
    ],
    reality: [
      ['O reality acabou e eu voltei cansado, mas feliz. Obrigado pelos votos 📺', 'Votei em você em todas as provas! 📺'],
      ['Férias de verdade: família, praia e celular desligado 🏖️', 'Férias de verdade! Volta descansado'],
    ],
    beneficente: [
      [['Golaço de letra e muito dinheiro arrecadado. Futebol que faz o bem ❤️', 'Torci o tornozelo no jogo beneficente. Mas a causa valeu cada minuto ❤️'],
        ['Golaço de letra por uma boa causa ❤️', 'Machucado em jogo beneficente... cuidado, {n}! 😬']],
      ['Camisas autografadas pro leilão. Que ajudem muita gente ❤️', 'Arrematei uma camisa sua no leilão! 👕'],
    ],
    amistosos: [
      [['Gol com a camisa da seleção. Sem palavras 🙏', 'Voltei da seleção com um problema muscular. Agora é tratar e voltar 🙏'],
        ['Gol pela seleção! O país inteiro viu 🔥', 'Voltou machucado da seleção... clube que se vire 😩']],
      ['Pedi dispensa pra cuidar do clube. Seleção é sempre um orgulho 🙏', 'O clube agradece!'],
    ],
    adaptacao: [
      ['Aula de idioma e comida de casa. Já me sinto em casa {noTime} 🌍', 'Já pede café no idioma local! Adaptado 😂'],
      [['Aprendendo na marra e me sentindo em casa cada dia mais 🌍', 'Adaptação leva tempo. Paciência e trabalho 🙏'],
        ['Adaptação rápida! O técnico ficou impressionado', 'Saudade de casa, né? Força, {n}']],
    ],
    manipulacao: [
      ['Recebi uma proposta de manipulação e denunciei. Futebol limpo sempre ⚖️', 'Denunciou o esquema! Exemplo pro país inteiro 👏'],
      ['Tem gente que não respeita o futebol. Comigo não 🚫', 'Bloqueou na hora. Caráter 👏'],
    ],
    lesionou: [
      ['Visitei ele no hospital. Rivalidade só dentro de campo. Força, irmão 🙏', 'A foto da visita emocionou todo mundo 🥹'],
      [['Desejo uma recuperação rápida ao meu colega de profissão 🙏', 'Peço desculpas pelo lance. Nunca tive intenção de machucar ninguém 🙏'],
        ['O adversário respondeu agradecendo. Classe 👏', 'Só uma nota? Podia ter ido visitar 😒']],
    ],
    selecao_adeus: [
      ['Obrigado, seleção. Foram anos de orgulho. Agora o foco é todo no {time} 🙏', 'Adeus à seleção... vai deixar saudade 😭'],
      [['Sigo à disposição da seleção. Enquanto me chamarem, eu vou 🙏', 'Na última convocação a coxa não aguentou. Faz parte 🙏'],
        ['Ainda convocado! Tem lenha pra queimar 🔥', 'Machucou na seleção de novo... 😩']],
    ],
    corte_salario: [
      ['Assinei sem discutir. Aqui eu jogo por amor {cor}', 'Abriu mão de salário pra ficar! Ídolo {cor}'],
      [['Contrato mantido. Valorização é importante 🤝', 'Pelo jeito meu nome vai pro mercado. Seja o que Deus quiser 🙏'],
        ['A diretoria cedeu! Valorizado', 'Brigou por salário e agora vai sair? 😬']],
    ],
    curso_tecnico: [
      ['Aluno de novo! Curso de treinador pra enxergar o jogo de outro jeito 📋', 'Futuro técnico! Já quero ver na beira do campo 📋'],
      ['Segunda-feira é pra descansar 😴', 'Primeiro jogar, depois treinar 😅'],
    ],
    recuperacao: [
      ['Câmara hiperbárica, crioterapia e muito cuidado. Corpo de 25 anos 💪🧊', 'Investiu no corpo! Vai jogar até os 40 💪'],
      ['O departamento médico do clube é o melhor que tem. Confiança total 🩺', 'Confia no clube. Certo'],
    ],
    reserva_luxo: [
      ['Entrar no segundo tempo e decidir também é ser importante 💪', 'Reserva de luxo que decide jogo grande!'],
      [['Ainda tenho muita lenha pra queimar. Quem viu o treino sabe 🔥', 'Falei o que penso. O professor não gostou. Vou mostrar em campo 💪'],
        ['Mostrou no treino que ainda é titular!', 'Cobrar titularidade em público? Hmm 😬']],
    ],
    lateral: [
      ['Lateral improvisado, assistência garantida 😂 Onde o time precisar 💪', 'Lateral de improviso e deu passe pra gol! 👏'],
      ['Minha posição é outra, e o professor entendeu. Bora ⚽', 'O técnico improvisou outro. Ok'],
    ],
    parceiro_zaga: [
      ['Zaga é dupla. Eu corro por dois até o garoto pegar confiança 🛡️🤝', 'Que parceiro! O garoto cresceu do seu lado'],
      [['Cobrei em público e funcionou. Hoje somos a melhor dupla da liga 🛡️', 'Exagerei na cobrança. Já conversamos e seguimos juntos 🤝'],
        ['O puxão de orelha funcionou! Dupla de ferro', 'Cobrança em público? Vestiário rachado 😬']],
    ],
    camisa10: [
      [['A 10 é minha! Honra vestir esse número {doTime} 🔟', 'A 10 pesa. Mas eu vou mostrar que ela é minha 🔟'],
        ['A camisa mais vendida da loja! A 10 é sua 🔟', 'A 10 pesou, hein... calma que vai'],
      ],
      ['A {num} me trouxe até aqui. Não troco 👕', 'Fiel ao número! Respeito'],
    ],
    centroavante: [
      ['Centroavante de área. Pouco toque e muita bola na rede ⚽🎯', 'Matador de área! Cada toque um gol'],
      ['Saindo da área e abrindo espaço pra todo mundo. Futebol coletivo ⚽', 'Atacante móvel que faz o time jogar 👏'],
    ],
    analista_gol: [
      ['Estudei cada batedor da liga. Agora eu sei o canto preferido de todo mundo 📹🧤', 'Goleiro que estuda pega pênalti!'],
      ['Goleiro bom é goleiro leve. Confio no meu instinto 🧤', 'Instinto puro! Goleiro raiz'],
    ],
    frango: [
      ['Até eu ri desse frango 🐔😂 Próximo jogo eu pego tudo', 'Postou o meme antes de todo mundo kkkk respeito 😂'],
      ['Treino extra e silêncio. Nunca mais 🧤', 'Silêncio e trabalho. Vai voltar'],
    ],
    venda_forcada: [null, ['Bati o pé. Fico {noTime} e vou ajudar o clube dentro de campo {cor}', 'Recusou a venda pra ficar! Isso é amor {cor}']],
    bicho: [
      [['Vitória, festa no vestiário e bicho na conta 💰🔥', 'Hoje a ansiedade venceu. Derrota no clássico. Peço desculpas 🙏'],
        ['Bicho dobrado bem gasto! 💰', 'Jogou pilhado demais, deu nisso 😩']],
      ['Bicho ou não, eu jogo do mesmo jeito: com tudo ⚽', 'Jogo sério! Profissional'],
    ],
    pre_contrato: [
      ['Assinei o pré-contrato. Vou dar tudo até o último jogo aqui, prometo 🙏', 'Já assinou com outro?? E a gente? 💔'],
      ['Renovado! Não saio daqui {cor}', 'Renovou e mandou o recado! Aqui é sua casa {cor}'],
    ],
    receita: [
      ['Acordo feito. Tudo resolvido com a Receita ✅', 'Resolveu rápido. Melhor assim'],
      [['Provamos na justiça que estava tudo certo ⚖️', 'Perdi a causa. Vou pagar o que devo e seguir 🙏'],
        ['Venceu na justiça! Tudo certo', 'Perdeu pro leão kkk 🦁']],
    ],
    apostas: [
      [['Novo parceiro! Jogue com responsabilidade 🤝', 'Entendo as críticas à campanha. Vou repensar 🙏'],
        ['Comercial no ar! Ficou bom', 'Garoto-propaganda de casa de apostas? Decepção 😒']],
      ['Recusei a proposta da casa de apostas. Tem coisa que não combina comigo 🚫', 'Recusou! Muito respeito 👏'],
    ],
    emprestimo: [
      [['Um ano depois, o dinheiro voltou com um abraço. Amizade de verdade 🤝', 'Ajudei um amigo e o negócio não deu certo. Faz parte. A amizade fica 🤝'],
        ['Amigo de verdade devolve! 🤝', 'Emprestou e perdeu tudo? 😬']],
      ['Conversa difícil com um amigo hoje. A amizade continua 🤝', 'Às vezes o não é o melhor presente'],
    ],
    capa_game: [
      ['Capa do videogame! Meu eu de 10 anos não acreditaria 🎮🤩', 'Já comprei o jogo só por causa da capa 🎮'],
      ['Recusei a capa do videogame. Tem maldição nisso, todo mundo sabe 😂🎮', 'Fugiu da maldição da capa! Esperto 😂'],
    ],
    comemoracao: [
      [['Comemoração nova! Quero ver a molecada imitando 🕺', 'O rival achou provocação. Não foi. Era só alegria 😅'],
        ['Meu filho já imita sua comemoração na escolinha 😂', 'Essa comemoração esquentou o jogo, hein 😬']],
      ['Gol é de todo mundo. Abraço coletivo sempre 🤝', 'Abraço coletivo! Isso é time'],
    ],
    invasao: [
      ['Ele invadiu o campo só pra me abraçar. Esse abraço vale mais que qualquer gol 🥹❤️', 'Essa foto do abraço vai ser a foto do ano 🥹'],
      ['Segurança em primeiro lugar. Mas o carinho do menino eu guardo 🙏', 'Pelo menos acenou pro menino'],
    ],
    critica: [
      [['Respondi o que precisava ser respondido 🎤', 'Talvez eu tenha passado do tom na resposta. Fica o aprendizado 🙏'],
        ['Resposta afiada! Calou o comentarista 🎤', 'Soou arrogante, {n}... 😬']],
      ['Respondi do único jeito que eu sei: com gols ⚽⚽🤫', 'Dois gols e silêncio no estúdio. Resposta perfeita 🤫'],
    ],
    musica: [
      ['Tem música com o meu nome e ainda gravei o clipe 🎵😂', 'Já escutei o clipe 50 vezes hoje 🎵'],
      ['Ouvir a torcida cantando meu nome não tem preço 🎵{cor}', 'A arquibancada inteira cantando o refrão! 🎵'],
    ],
    ofensas: [
      ['Parei o jogo. Racismo e ofensa não têm lugar no futebol. Nem em lugar nenhum ✊', 'Todo o país do seu lado. Nunca se cale ✊'],
      ['Segui jogando, mas aquilo não sai da cabeça. Precisamos falar sobre isso ✊', 'Força, {n}. Estamos contigo ✊'],
    ],
    torcida_tecnico: [
      ['O professor tem o nosso apoio. O grupo está fechado com ele 🤝', 'Defendeu o técnico na frente da torcida. Coragem'],
      ['O grupo precisa melhorar, eu primeiro. Ninguém aponta dedo aqui 💪', 'Resposta de líder 💪'],
    ],
    virose: [
      [['Com febre, mas em campo. Vitória é vitória 💪🤒', 'Forcei com a virose e paguei o preço. Repouso agora 🤒'],
        ['Jogou doente e ainda ganhou! Guerreiro', 'Febre voltou... devia ter ficado de repouso 🤒']],
      ['Três dias de cama e de volta. Melhor assim 🤒➡️💪', 'Repousou e voltou inteiro. Certo'],
    ],
    insonia: [
      ['Quarto escuro, rotina nova e oito horas por noite. Sono é treino 😴', 'Dormindo bem e jogando melhor ainda 😴'],
      [['O sono voltou sozinho. Corpo é sábio 😴', 'Noites mal dormidas e cansaço em campo. Vou procurar ajuda 🙏'],
        ['O sono voltou! Bom demais', 'Tá cansado em campo, dá pra ver... dorme, {n}! 😴']],
    ],
    pubalgia: [
      ['Cirurgia feita. Volto mais forte 🏥💪', 'Operou e voltou voando! 💪'],
      [['Fisioterapia diária e a dor foi embora 🙌', 'A dor piorou e a cirurgia veio do mesmo jeito. Faz parte 🏥'],
        ['Tratou sem operar! Deu certo', 'Devia ter operado logo... força 🙏']],
    ],
    pai_empresario: [
      [['Meu pai é meu empresário agora. E que negociador 😂👨‍👦', 'Meu pai fechou o contrato do jeito dele. Família em primeiro lugar 👨‍👦'],
        ['Seu pai negociando melhor que muito empresário 😂', 'Ele aceitou a primeira proposta? Ai ai 😅']],
      ['Meu pai segue sendo meu maior torcedor. E agora sem dor de cabeça com contrato 😂👨‍👦', 'Pai torcedor é o melhor pai ❤️'],
    ],
    irmao: [
      [['Meu irmão foi aprovado na base! Os irmãos juntos no mesmo clube 👬⚽', 'Não passou no teste dessa vez. Mas eu sei do seu talento, irmão 👬'],
        ['Os irmãos juntos no mesmo clube! 👬', 'Não passou no teste... que situação 😬']],
      ['Meu irmão tá evoluindo demais na escolinha. Vai longe 👬⚽', 'Investiu no irmão! Família é tudo'],
    ],
    cachorro: [
      ['Apareceu no CT, ficou no meu coração. Novo membro da família 🐶❤️', 'O mascote mais famoso do futebol! 🐶'],
      ['O vira-lata do CT ganhou uma família em uma semana. Adotem! 🐶❤️', 'Adotem, não comprem! 🐶'],
    ],
    concentracao: [
      ['Três dias de concentração: hotel, videogame e foco total 🎮⚽', 'Concentração com videogame? Quero 😂'],
      [['O grupo falou e o professor ouviu. Grupo unido 🤝', 'Falei pelo grupo e sobrou pra mim 😅'],
        ['O técnico liberou! Grupo forte', 'Ele descobriu quem reclamou kkk 😂']],
    ],
    pretemporada: [
      ['Todos os amistosos da excursão! Camisas esgotadas por onde passamos ✈️👕', 'Jogou todos os amistosos! Cuidado com o cansaço'],
      ['Chegando inteiro pra estreia. Pré-temporada inteligente 💪', 'Poupado e pronto pra estreia!'],
    ],
    faixa: [
      ['Entreguei a faixa. Agora é jogar solto e ajudar de outro jeito 🤝', 'Sem a faixa e jogando solto! Decisão certa'],
      [['A faixa fica comigo. A responsabilidade também 🫡', 'A cobrança aumentou. Mas capitão não foge 🫡'],
        ['Chamou a responsabilidade! Capitão de verdade 🫡', 'Cada tropeço é culpa do capitão... pesado 😬']],
    ],
    rebaixamento: [
      ['Não abandono o barco. Vamos sair dessa juntos {cor}', 'Ficou pra lutar com a gente! A faixa já tá pronta {cor}'],
      ['Preciso pensar na minha carreira. Desejo tudo de bom {aoTime} 🙏', 'Abandonou o barco? 💔'],
    ],
    acesso_briga: [
      [['Joguei todas e puxei o time na reta final. O acesso é nosso! 🚀', 'Joguei tudo e o corpo cobrou a conta. Fiz o que pude 🙏'],
        ['Jogou tudo e puxou o time! Monstro 🚀', 'O corpo cobrou... devia ter descansado 😩']],
      ['Descanso na hora certa. Inteiro pra reta final do acesso 🚀', 'Comissão sabe o que faz. Inteiro pra reta final'],
    ],
    saf: [
      ['Novo projeto, novos reforços. Acredito no futuro {doTime} 📈', 'Apoiou a SAF! O dinheiro chegou'],
      ['Clube é da torcida. Falei e não me arrependo {cor}', 'Falou o que a torcida pensa! {cor}'],
    ],
    estadio: [
      [['Primeiro gol do estádio novo é MEU! Meu nome na placa 🏟️⚽', 'Na trave! A festa ficou pro segundo tempo 😅'],
        ['Seu nome na placa do estádio pra sempre 🏟️', 'Pegou a bola e acertou a trave... 🤦']],
      ['Deixei pro cobrador e ele marcou! Festa de todo mundo 🏟️🤝', 'Gesto de grupo na inauguração. Bonito'],
    ],
    olimpiada: [
      ['Olimpíadas! Representar o país é a maior honra 🏅', 'Olímpico! Que orgulho 🏅'],
      ['Fiquei no clube. Meu foco agora é o {time} {cor}', 'O clube agradece com mais minutos'],
    ],
    alojamento: [
      ['Quarto individual. Dormindo como nunca 😴', 'Quarto só seu, que luxo 😂'],
      [['Meu colega de quarto virou meu melhor amigo no time 🤝', 'Meses de olheiras. O ronco do meu colega venceu 😂😴'],
        ['Dupla inseparável! O técnico gostou', 'O ronco venceu kkkkk 😂']],
    ],
    vlog_base: [
      [['Novo episódio no ar! Todo garoto da base quer ser eu 😂🎥', 'O episódio do rango viralizou e a diretoria mandou parar. Fim da série 🎥😅'],
        ['Maratonei o vlog! Mais episódios! 🎥', 'O episódio do rango kkkkk 😂']],
      ['Câmera só no dia de jogo. Foco no treino ⚽', 'Foco total! Profissional desde a base'],
    ],
    primeira_entrevista: [
      [['Primeira entrevista ao vivo! Fui eu mesmo 🎤😄', 'Chamei o repórter de professor ao vivo. Virei meme e tô rindo junto 😂🎤'],
        ['Espontâneo demais! Já é ídolo 🎤', 'Agradeceu ao grupo de WhatsApp kkkkk 😂']],
      ['Agradecer ao grupo e foco no próximo jogo. Simples assim 🎤', 'Frases prontas, zero risco 😂'],
    ],
    ingressos: [
      ['Comprei ingresso pra turma toda. O setor inteiro gritando meu nome 🎟️❤️', 'Eu tava nesse setor! Valeu, {n} 🎟️'],
      ['Ingresso só pra família. Pra turma, prometo gol 😅🎟️', 'E o meu ingresso, {n}? 😂'],
    ],
    hino: [
      [['Eu estava concentrado no hino. Respeito total pelo meu país 🙏', 'Dei minha explicação. Quem quiser entender, entende 🙏'],
        ['Assunto encerrado. Foco no jogo', 'Concentrado? Sei... 🙄']],
      ['Cantei o hino em casa com a família. Desafinado, mas de coração 🎶😂', 'Desafinou tudo, mas foi sincero 😂🎶'],
    ],
    arbitro_foto: [
      [['Ele é meu amigo de infância, do mesmo bairro. Só isso 📸🤝', 'Cada apito virou teoria da conspiração. Paciência 😅'],
        ['História linda do bairro! Assunto encerrado', 'Toda falta virou suspeita 😂']],
      ['Pedi a troca do árbitro pra evitar qualquer dúvida. Futebol limpo sempre ⚖️', 'Postura correta! 👏'],
    ],
    drone: [
      ['Treino fechado é fechado 🎯🚁 Bolada certeira', 'A bolada no drone kkkkk melhor vídeo da semana 😂'],
      ['Segurança resolveu. Treino segue ⚽', 'Calma e profissionalismo'],
    ],
    cartola: [
      ['Pra quem me escalou e eu decepcionei: semana que vem eu pago com juros 😅📈', 'Te escalei de capitão e você me deu −2 😭'],
      [['Foco no campo. Fantasy é com vocês 😂', 'Virei a figurinha mais zoada do fantasy. Mereço 😅'],
        ['Ignorou e os memes passaram', 'Te tirei do meu time, {n} 😤']],
    ],
    videogame_nota: [
      [['Pedi pra revisarem minha nota no game. Milhões concordaram comigo 🎮', 'A produtora respondeu com um vídeo meu perdendo corrida. Doeu 😂🎮'],
        ['A produtora vai rever! Nota justa já 🎮', 'O vídeo da produtora kkkkk 😂']],
      ['Minha nota no videogame? Vou responder em campo 😉🎮', 'Deixou o campo responder. A nota subiu!'],
    ],
    palco: [
      [['Subi no palco e cantei! Será que tenho futuro? 🎤😄', 'Desafinei no refrão. O vestiário não vai me deixar esquecer 😂🎤'],
        ['Afinado! Já quero o feat 🎤', 'Desafinou feio kkkk 😂']],
      ['Show incrível do camarote. Cama cedo, amanhã tem treino 🎶😴', 'Curtiu e dormiu cedo. Profissional'],
    ],
    tatuagem: [
      [['Promessa é dívida. Escudo {doTime} tatuado pra sempre 🖋️{cor}', 'O escudo saiu meio torto, mas o amor é reto 😂🖋️{cor}'],
        ['Tatuou o escudo! Ídolo eterno {cor}', 'O escudo saiu torto kkkk mas vale 😂']],
      ['Promessa? Que promessa? 😅', 'Esqueceu a promessa né, {n}? 😒'],
    ],
    penteado: [
      [['O corte é meu e eu gosto 💇😎', 'O professor não curtiu o corte. Mas eu curti 😅💇'],
        ['Já pedi "o corte do {n}" no barbeiro 💇', 'Aqui a gente joga bola, não desfila 😂']],
      ['Careca e feliz. Sem assunto 😂🪒', 'Careca combina! 😂'],
    ],
    sosia: [
      ['Achei meu sósia! Quem é quem? 👯😂', 'Não sei quem é quem kkkk 😂'],
      [['Sósia? Que sósia? 😂', 'Aviso: aquele da confusão na balada não era eu. Era meu sósia 😅'],
        ['O sósia sumiu sozinho kkk', 'A manchete saiu com seu nome kkkk 😂']],
    ],
    figurinha: [
      ['Mil figurinhas entregues em escolas. Agora todo mundo tem a rara 😂📒', 'Minha filha ganhou a figurinha da sua mão! 😭'],
      ['Minha figurinha é rara? Nem eu tenho a minha 😂📒', 'Procurei sua figurinha o ano inteiro 😂'],
    ],
    namoro: [
      [['Sim, estamos juntos ❤️', 'Muita foto e muita notícia. Peço respeito à nossa vida 🙏❤️'],
        ['Casal do ano! ❤️', 'Mais revista que gol... foco, {n} 😬']],
      ['Minha vida pessoal é pessoal. Aqui é só futebol ⚽', 'Discreto e focado'],
    ],
    idioma: [
      ['Minha coletiva no idioma local virou meme. Ainda estou aprendendo 😂🗣️', 'O goleiro adversário respondeu kkkk 😂'],
      ['Com tradutor por enquanto. Logo eu falo sozinho 🗣️', 'Sem graça, mas sem risco 😂'],
    ],
    mae_entrevista: [
      ['Minha mãe contou TODAS as histórias da minha infância na TV 😂❤️ Te amo, mãe', 'Sua mãe é a melhor entrevistada do ano 😂❤️'],
      ['Mãe, por favor, pare de dar entrevista 😂❤️', 'Ela vai contar mais histórias, certeza 😂'],
    ],
    pai_arquibancada: [
      [['Ninguém mexe com a minha família. Meu pai é meu maior torcedor 👨‍👦', 'Defendi meu pai. Mas peço desculpas ao grupo pela distração 🙏'],
        ['Defendeu o pai! Família em primeiro lugar 👏', 'Essa história tirou o foco do time... 😬']],
      ['Meu pai agora assiste de camarote. Mais tranquilo pra todo mundo 😂👨‍👦', 'Seu pai de camarote kkk 😂'],
    ],
    cueca: [
      ['A cueca da sorte foi costurada e segue em campo 🩲🍀😂', 'Costura essa cueca e não lava nunca 😂🍀'],
      [['Descobri que a sorte era eu mesmo 😎🍀', 'Joguei sem a cueca da sorte e só pensei nela o jogo todo 😅🩲'],
        ['A sorte é você, {n}! 🍀', 'Volta com a cueca, pelo amor de Deus 😂']],
    ],
    benzedeira: [
      ['Minha avó benzeu o elenco inteiro. Até o técnico pediu um galho de arruda 🌿🙏', 'Benzeção da vó funciona mais que VAR 😂🌿'],
      [['A benzedeira entendeu e benzeu o portão do CT 😂🌿', 'Minha avó ficou chateada comigo. Vó, me liga 🙏❤️'],
        ['Benzeu o portão kkkk 😂', 'Liga pra sua avó, {n}! 😂']],
    ],
    trofeu_sumido: [
      [['Achamos a taça! Estava na banheira do zagueiro, cheia de gelo 🏆🧊😂', 'A taça apareceu num bar da cidade servindo chope 🏆🍺😂'],
        ['Na banheira com gelo kkkkk 😂', 'Taça de chope kkkkk virou lenda 😂🍺']],
      ['Paguei a réplica da taça. A original apareceu uma semana depois 🏆😂', 'Agora são duas taças kkkk 😂'],
    ],
    apelido: [
      ['O apelido pegou e eu abracei! Agora é oficial 😂', 'Apelido na camisa oficial kkk 😂'],
      [['Pedi e pararam com o apelido. Obrigado, galera 🙏', 'Pedi pra pararem com o apelido. Agora todo mundo usa 😂'],
        ['Apelido aposentado', 'Proibir só piorou kkkk 😂']],
    ],
    grito_torcida: [
      ['Pedi pra mudarem a letra e a torcida atendeu. Obrigado, {cor}', 'A letra nova ficou bonita {cor}'],
      [['Cantei junto com a torcida. Arrepiei {cor}🎶', 'Cantei junto e a federação não gostou. Valeu a multa {cor}'],
        ['Cantou com a torcida! Ídolo absoluto 🎶', 'Multa por cantar kkk vale cada centavo 😂']],
    ],
    presente_torcedor: [
      ['Passei a tarde com um sócio de 80 anos ouvindo histórias do clube. O relógio está no meu pulso ⌚❤️', 'Que gesto lindo com o torcedor ❤️'],
      ['Devolvi o relógio: esse presente é seu, meu amigo. Mas o carinho eu guardo ⌚❤️', 'Ele chorou de alegria, e eu também 😭'],
    ],
    clausula: [
      ['Renovado com cláusula alta. Ninguém me tira daqui barato ✍️{cor}', 'Cláusula nas alturas! Fica pra sempre {cor}'],
      [['Ninguém bateu a cláusula. Sigo aqui {cor}', 'Pelo jeito vou arrumar as malas. Obrigado por tudo 🧳'],
        ['Ninguém pagou a cláusula! Fica!', 'Vai embora por causa de cláusula baixa? 💔']],
    ],
    gol_contra: [
      ['Foi o gol mais bonito que eu já fiz. Pena que foi contra 😂🤦', 'Melhor coletiva do ano kkkk 😂'],
      ['Treino de posicionamento todo dia. Nunca mais 🛡️', 'Treinou e calou. Respeito'],
    ],
    xerife: [
      [['Xerife da área, sem cartão. O rival nem passou perto 🛡️🤠', 'Amarelo bobo e clássico visto da arquibancada. Erro meu 🙏'],
        ['Xerife! O rival nem chegou perto 🤠', 'Amarelo bobo e fora do clássico... 🤦']],
      ['Mais calma, mesma firmeza. Zaga fechada 🛡️', 'Zaga calma e firme'],
    ],
    luvas: [
      [['Luvas novas com o meu nome! Agarrando tudo 🧤✨', 'Voltei pras luvas velhas. Luva velha é luva de confiança 🧤'],
        ['Comprei as luvas com seu nome! 🧤', 'A bola escorregou duas vezes kkkk 😬']],
      ['Luva velha é luva de confiança 🧤', 'Superstição de goleiro é sagrada 🧤'],
    ],
    penalti_goleiro: [
      [['GOLEIRO BATEU E FEZ!!! Classificados 🧤⚽😱', 'Chutei nas nuvens. Volto pro meu gol 😅🧤'],
        ['GOL DO GOLEIRO NA DECISÃO! Eterno 😭', 'Isola na arquibancada kkkk 😂']],
      ['O zagueiro converteu e eu defendi o próximo. Trabalho de equipe 🧤🤝', 'Defendeu o próximo! Monstro 🧤'],
    ],
    assistencia_roubada: [
      [['A assistência foi minha e corrigiram. Obrigado 📊', 'Reclamei de uma assistência e virei "chorão". Justo 😂'],
        ['Corrigiram! Assistência é sua 📊', 'Chorão kkkk 😂']],
      ['Quem viu o jogo sabe de quem foi o passe 😉', 'O técnico sabe, a gente sabe'],
    ],
    maestro: [
      ['Primeiro volante e o time passando por mim. Cérebro do time 🧠⚽', 'Virou o maestro do time! 🎼'],
      ['Meu lugar é perto da área, criando 🎯', 'Na armação é onde você brilha'],
    ],
    gol_mao: [
      ['Avisei o árbitro e o gol foi anulado. Fair play acima de tudo 🤝', 'Fair play! O mundo aplaudiu 👏'],
      [['Gol da vitória! 😏⚽', 'O replay mostrou tudo. Errei e assumo 🙏'],
        ['Ninguém viu, gol da vitória 😂', 'Mão santa kkkkk 😂🙌']],
    ],
    artilharia: [
      [['Gol aos 89 e artilheiro da competição! Inteiro pra final 🏆⚽', 'O gol não saiu e cheguei cansado. Mas a final é nossa 🙏'],
        ['ARTILHEIRO! E inteiro pra final 🏆', 'Devia ter descansado... 😩']],
      ['Descansado pra final. A artilharia fica pro ano que vem 😉', 'Pensou no time! Agora vence a final'],
    ],
    grisalho: [
      [['Fio branco? Que fio branco? 😎', 'A tinta saiu alaranjada. Me chamem de cenoura 🥕😂'],
        ['Ninguém notou nada 😂', 'Cenoura kkkkkk 🥕😂']],
      ['Grisalho de tanto carregar esse time 😎👴', 'Grisalho e craque! Charme 😎'],
    ],
    comentarista: [
      [['Estreia como comentarista! Vai ser difícil voltar pro outro lado 📺😄', 'Falei demais na TV sobre um companheiro. Já pedi desculpas a ele 🙏'],
        ['Comentarista nato! Futuro na TV 📺', 'Criticar companheiro ao vivo? Pesado 😬']],
      ['Enquanto eu jogo, eu jogo. A TV fica pra depois 📺⚽', 'Foco total em jogar'],
    ],
    recorde: [
      [['RECORDE! Estádio de pé e placa na entrada do CT 🏆🙏', 'Recorde batido, mesmo com a coxa travada. Valeu cada passo 🙏'],
        ['Eu tava no estádio do recorde! 😭', 'Bateu o recorde e se machucou... força 🙏']],
      ['O recorde veio na hora certa, num jogo em casa 🏆{cor}', 'Recorde em casa! Foi mais bonito assim'],
    ],
    estatua: [
      ['Posei pro escultor. A estátua ficou idêntica, até a tatuagem 🗿', 'A estátua ficou igualzinha! 🗿'],
      [['A estátua ficou ótima! Obrigado pela homenagem 🗿🙏', 'A estátua não ficou parecida comigo. Mas já é ponto turístico 😂🗿'],
        ['Fui tirar foto com a estátua! 🗿', 'Essa estátua é de quem?? 😂🗿']],
    ],
    oculos: [
      ['Lentes de contato e descobri que o placar tem números 👀😂', 'Agora enxerga o jogo inteiro 👀'],
      [['Sempre joguei assim, sigo assim 😎', 'Dois passes pro bandeirinha. Talvez eu precise de óculos 😂👓'],
        ['Nem precisa de lente! Raiz', 'Passe pro bandeirinha kkkkk 😂']],
    ],
    teste_fisico: [
      ['Treino às 5h da manhã por dois meses. Meio da tabela no teste físico 💪⏰', 'Treino escondido rendeu! 💪'],
      [['Corro pouco porque penso rápido 🧠😎', 'O professor não achou graça na minha entrevista. Bora correr 🏃'],
        ['Essa frase virou camiseta kkkk 😂', 'O técnico leu a entrevista kkkk 😬']],
    ],
    dirigente: [
      ['Jogador e dirigente: reuniões de manhã, treino à tarde. O futuro começa agora 📋', 'Futuro presidente do clube! 📋'],
      ['Dirigente eu viro depois. Hoje eu jogo ⚽', 'Jogando ainda! Que bom'],
    ],
    turne: [
      ['Turnê de despedida: cada estádio, uma lágrima. Obrigado a todos 🙏', 'Fui ver sua despedida no meu estádio 😭'],
      ['Uma só despedida, do jeito que eu queria 🙏', 'Uma despedida só, mas inesquecível 😭'],
    ],
    palestra: [
      ['Dez palestras, dez cidades. Contar minha história é um privilégio 🎤', 'Fui na sua palestra! Inspirador 🎤'],
      ['Uma palestra de graça na escola onde tudo começou. As crianças nunca vão esquecer, nem eu 🏫❤️', 'Voltou na escola da infância! Que gesto ❤️'],
    ],
  };
  // Escolhas que levam a outro clube
  D.SOCIAL.evMove = {
    banco: ['Emprestado pra jogar! Chego {aoTime} pra ser titular e mostrar meu futebol ⚽', 'Vem jogar aqui que vaga tem! Bem-vindo {cor}'],
    assedio: ['Proposta grande, desafio maior ainda. Cheguei, {time}! ✍️{cor}', 'Contratação do ano! Bem-vindo, {n} {cor}'],
    arabia: ['Nova cultura, novo desafio. Feliz de chegar {aoTime} ✈️✍️', 'Foi pela grana, né? 💰😂'],
    rival: ['Sei que muita gente não vai entender. Mas hoje começo uma nova história {noTime} ✍️', 'Saiu do rival pra jogar com a gente!! Agora é nosso {cor}'],
    venda_forcada: ['Saio ajudando o clube que me formou. Agora vamos com tudo {noTime} ✍️🙏', 'Bem-vindo! A gente sabe que você saiu pela porta da frente {cor}'],
  };
})();
