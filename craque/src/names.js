// Nomes para sortear na criação do jogador (botão 🎲 ao lado do nome): nomes comuns de cada país jogável.
// Cada país tem primeiros nomes (f) e sobrenomes (l), em texto separado por vírgula. O Brasil tem mais formas:
// nome + sobrenome, nome composto, diminutivo, apelido de boleiro, nome curto + sobrenome, nome + apelido/estado
// e nome + Júnior/Neto/Filho. A Coreia usa sobrenome antes do nome, como na camisa de lá.
// Fora da tradução (tools/craque_i18n.js pula este arquivo): nome de gente não se traduz.
(function (root) {
  const D = root.CRAQUE_DATA;
  const L = s => s.split(',').map(x => x.trim()).filter(Boolean);
  const N = (f, l, extra) => Object.assign({ f: L(f), l: L(l) }, extra || {});

  const BR = {
    f: L('Gabriel,Lucas,Matheus,Mateus,Rafael,Pedro,Vinícius,Thiago,Tiago,Caio,Diego,Bruno,Igor,Enzo,Davi,Kauã,Renan,Wesley,' +
      'João,Gustavo,Felipe,Filipe,Guilherme,Henrique,Arthur,Miguel,Heitor,Bernardo,Samuel,Nicolas,Leonardo,Eduardo,Rodrigo,' +
      'Marcelo,Daniel,Vitor,Victor,Luan,Luiz,Luís,André,Anderson,Alex,Alexandre,Fernando,Fábio,Fabrício,Paulo,Marcos,Ricardo,' +
      'Rogério,Ronaldo,Roberto,Carlos,Cláudio,Júlio,César,Alan,Allan,Ryan,Raul,Murilo,Otávio,Emerson,Everton,Éverson,Wellington,' +
      'Willian,Weverton,Jefferson,Jean,Jonathan,Kaio,Kauan,Kaique,Kevin,Erick,Yuri,Iago,Ítalo,Breno,Bento,Benício,Lorenzo,Théo,' +
      'Joaquim,Antônio,Francisco,Raimundo,Sebastião,José,Sávio,Douglas,Danilo,Denílson,Edson,Elias,Emanuel,Fagner,Gilberto,Hugo,' +
      'Jorge,Juan,Lázaro,Marlon,Maicon,Michel,Nathan,Natan,Patrick,Raphael,Reinaldo,Robson,Rômulo,Ruan,Sérgio,Tales,Valdir,' +
      'Wagner,Walter,Wanderson,Washington,Yago,Yan,Adriano,Alisson,Ademir,Cristiano,Cleiton,Cauã,Cauê,Gerson,Gilson,Hélio,Ivan,' +
      'Jadson,Jair,Jhonatan,Lucca,Mauro,Mário,Moisés,Nilton,Osvaldo,Pablo,Richard,Thalles,Vanderlei,Wallace,Wendel,Rian,Kayky,' +
      'Endrick,Estêvão,Isaque,Ezequiel,Abner,Gilmar,Edmílson,Gleison,Rivaldo,Cícero,Nicolas,Mateus,Ramon,Renato,Wilson,Wesley,' +
      'Diogo,Jonas,Jorginho,Lauro,Leandro,Mailson,Márcio,Rafael,Railan,Sidnei,Tiago,Uilian,Vagner,Valdemar,Vicente,Zeca'),
    l: L('Silva,Santos,Oliveira,Souza,Sousa,Rodrigues,Ferreira,Alves,Pereira,Lima,Gomes,Costa,Ribeiro,Martins,Carvalho,Almeida,' +
      'Lopes,Soares,Fernandes,Vieira,Barbosa,Rocha,Dias,Nascimento,Andrade,Moreira,Nunes,Marques,Machado,Mendes,Freitas,Cardoso,' +
      'Ramos,Gonçalves,Santana,Teixeira,Araújo,Batista,Moura,Correia,Pinto,Monteiro,Cavalcanti,Campos,Rezende,Castro,Vasconcelos,' +
      'Miranda,Borges,Brito,Macedo,Pires,Bezerra,Medeiros,Farias,Azevedo,Matos,Siqueira,Coelho,Tavares,Fonseca,Leite,Xavier,' +
      'Duarte,Sales,Peixoto,Queiroz,Guimarães,Cunha,Pacheco,Aguiar,Prado,Amaral,Viana,Barros,Bastos,Neves,Paiva,Rangel,Sampaio,' +
      'Magalhães,Damasceno,Brandão,Cruz,Fontes,Galvão,Lacerda,Lins,Maia,Melo,Mota,Moraes,Nogueira,Pimentel,Porto,Reis,Sá,Seixas,' +
      'Toledo,Valente,Veloso,Figueiredo,Assunção,Conceição,Jesus,Paixão,Assis,Bittencourt,Guedes,Honorato,Lemos,Mesquita,Paz,' +
      'Rios,Serafim,Simões,Torres,Vidal,Albuquerque,Antunes,Arruda,Barreto,Bueno,Caldeira,Camargo,Coutinho,Dantas,Diniz,Estrela,' +
      'Falcão,Feitosa,Frota,Garcia,Godoy,Holanda,Jardim,Leal,Loureiro,Lobo,Mattos,Muniz,Nóbrega,Novaes,Pontes,Quintela,Rabelo,' +
      'Sabino,Severino,Tenório,Trindade,Valadares,Vilela,Aragão,Calixto,Fagundes,Gusmão,Ventura'),
    // Dois nomes, como se chama de verdade em campo
    comp: L('João Pedro,João Victor,João Lucas,João Paulo,João Gabriel,João Vitor,Pedro Henrique,Pedro Lucas,Pedro Augusto,' +
      'Luiz Felipe,Luiz Henrique,Luiz Gustavo,Luiz Otávio,Carlos Eduardo,Paulo Henrique,Paulo Victor,Bruno Henrique,' +
      'Marcos Paulo,José Carlos,Victor Hugo,Kaio César,Lucas Gabriel,Matheus Henrique,Arthur Henrique,Davi Lucca,' +
      'Enzo Gabriel,Jean Lucas,Igor Gabriel,Caio Henrique,Gabriel Henrique,Rodrigo Caio,Luan Pedro,Ruan Carlos,Ryan Lucas,' +
      'José Vítor,Antônio Carlos,Marcos Vinícius,Paulo Roberto,Carlos Alberto,Luiz Fernando,Pedro Paulo,João Guilherme,' +
      'Miguel Ângelo,Kauã Elias,Vitor Hugo,Gabriel Lucas,Lucas Daniel,Jorge Henrique,Luís Miguel'),
    // Diminutivos e aumentativos, sozinhos
    dim: L('Pedrinho,Vitinho,Juninho,Robinho,Paulinho,Fernandinho,Marquinhos,Carlinhos,Zezinho,Toninho,Luizinho,Joãozinho,' +
      'Matheuzinho,Rafinha,Thiaguinho,Diguinho,Lucão,Diegão,Igão,Renanzão,Brunão,Gilsinho,Fabinho,Danilinho,Andrezinho,' +
      'Kaiquinho,Kauãzinho,Davizinho,Enzinho,Luquinha,Felipinho,Henriquinho,Ruanzinho,Wesleyzinho,Serginho,Marcelinho,Julinho,' +
      'Betinho,Edinho,Jorginho,Lulinha,Mineirinho,Baianinho,Gabrielzinho,Caiozinho,Rafaelzinho,Guilherminho,Neymarzinho,' +
      'Gersinho,Ronaldinho,Ricardinho,Rodriguinho,Douglinhas,Arthurzinho,Miguelzinho,Samuelzinho,Leozinho,' +
      'Alexzinho,Allanzinho,Thiagão,Pedrão,Rafão,Gabrielzão,Danilão,Marcão,Paulão,Fabão,Fernandão,Guilhermão,' +
      'Netinho,Zinho,Joãozão,Tchequinho,Patrickzinho,Kevinho,Ryanzinho,Igorzinho,Kauanzinho,Nathanzinho,Murilinho,Otavinho'),
    // Apelidos de boleiro, sozinhos
    nick: L('Dudu,Biel,Guga,Tita,Dadá,Fred,Bebeto,Pepê,Jajá,Nenê,Dedé,Didi,Lelê,Tetê,Vavá,Babá,Cacá,Chicão,Tuca,Tuta,Bobô,' +
      'Careca,Magrão,Baixinho,Alemão,Gringo,Gaúcho,Paraíba,Pitbull,Tanque,Foguete,Pipoca,Formiga,Cabelo,Canhoto,Tchê,Zé,' +
      'Lulu,Juca,Kiko,Nino,Teco,Tico,Xuxa,Pelezinho,Dinho,Duda,Fuba,Gegê,Jojô,Kaká,Lalá,Mimi,Nanã,Popó,Quinho,Riquelme,' +
      'Sassá,Tatá,Vinição,Xandão,Zezé,Bolinha,Bigode,Coxinha,Pirulito,Piá,Marreta,Catatau,Muralha,Morceguinho,' +
      'Galeguinho,Bochecha,Pezão,Cabeção,Baiano,Carioca,Paulista,Mineiro,Potiguar,Capixaba'),
    // Nome curto + sobrenome (Léo Pereira, Gui Santos)
    short: L('Léo,Gui,Vini,Rafa,Edu,Zé,Nando,Biel,Pepê,Dudu,Juca,Téo,Lipe,Rick,Nino,Dani,Luca,Kadu,Caju,Digo,' +
      'Fabi,Tom,Chico,Beto,Tonho,Dé,Cadu,Bruninho,Juninho,Pedrinho,Nenê,Kaká,Gil,Tinho,Juan'),
    // Nome + apelido ou estado (Caio Bala, Rafael Paulista)
    tag: L('Paulista,Baiano,Mineiro,Gaúcho,Carioca,Paraíba,Potiguar,Maranhão,Cearense,Goiano,Capixaba,Sergipano,Alagoano,' +
      'Paraense,Manauara,Catarina,Pernambuco,Bala,Love,Foguete,Matador,Show,Canhão,Bomba,Pitbull,Tanque,Raio,Trator,Monstro,' +
      'Maravilha,Mágico,Fumaça,Sorriso,Pantera,Gavião,Leão,Xerife,Paredão,Rei,Príncipe'),
    suf: L('Júnior,Neto,Filho,Sobrinho'),
  };

  D.NAMES = {
    'Brasil': BR,
    'Argentina': N('Lautaro,Thiago,Valentín,Nicolás,Facundo,Matías,Agustín,Santiago,Joaquín,Franco,Gonzalo,Julián,Leandro,' +
      'Ezequiel,Emiliano,Maximiliano,Cristian,Lucas,Tomás,Federico,Rodrigo,Gastón,Pablo,Diego,Juan,Juan Cruz,Juan Manuel,' +
      'Ignacio,Nahuel,Lisandro,Enzo,Alexis,Exequiel,Germán,Marcos,Mauro,Bruno,Iván,Ramiro,Benjamín,Bautista,Mateo,Felipe,' +
      'Martín,Leonel,Ángel,Sergio,Claudio,Walter,Hernán,Brian,Kevin,Gerónimo,Valentino,Lorenzo,Francisco,Ulises,Ciro,Alan,' +
      'Elías,Nico,Facu,Lauti,Maxi,Tincho,Fede,Santi,Juampi,Guido,Marcelo,Ariel,Darío,Fabricio,Thiago Ezequiel,Lucio',
    'González,Rodríguez,Gómez,Fernández,López,Díaz,Martínez,Pérez,Romero,Sosa,Álvarez,Torres,Ruiz,Ramírez,Flores,Acosta,' +
      'Benítez,Medina,Suárez,Herrera,Aguirre,Pereyra,Gutiérrez,Giménez,Molina,Silva,Castro,Rojas,Ortiz,Núñez,Luna,Juárez,' +
      'Cabrera,Ríos,Ferreyra,Godoy,Morales,Domínguez,Moreno,Peralta,Vega,Carrizo,Quiroga,Ledesma,Ojeda,Ponce,Vera,Villalba,' +
      'Correa,Paz,Coronel,Figueroa,Ibáñez,Barrios,Maidana,Mansilla,Paredes,Palacios,Lucero,Varela,Funes,Bustos,Zárate,' +
      'Sánchez,Navarro,Ledesma,Arias,Toledo,Escobar,Cáceres,Guzmán,Insaurralde,Echeverría,Bianchi,Russo,Lombardi,Galarza'),
    'Uruguai': N('Agustín,Santiago,Facundo,Mateo,Joaquín,Nicolás,Matías,Federico,Rodrigo,Diego,Martín,Gastón,Sebastián,' +
      'Maximiliano,Bruno,Felipe,Franco,Thiago,Juan Manuel,Ignacio,Brian,Kevin,Darwin,Ronald,Giorgian,Manuel,Mauricio,Álvaro,' +
      'Gonzalo,Leandro,Damián,Emiliano,Lucas,Bautista,Benjamín,Valentín,Germán,Cristian,Sergio,Pablo,Marcelo,Fabián,' +
      'Washington,Walter,Gerónimo,Nahitan,Rodrigo,Christian,Edinson,Diego,Ezequiel,Mathías,Luciano,Renzo,Camilo,Juan Ignacio',
    'Pereira,Rodríguez,González,Fernández,Martínez,Suárez,Cabrera,Olivera,Sosa,Silva,Núñez,López,Díaz,Pérez,Álvarez,García,' +
      'Méndez,Acosta,Techera,Viera,Píriz,De León,Correa,Castro,Ferreira,Romero,Benítez,Cardozo,Machado,Cáceres,Rocha,Moreira,' +
      'Barreto,Da Silva,Delgado,Gómez,Hernández,Ramos,Ríos,Cuello,Sánchez,Varela,Larrañaga,Piñeyro,Lemos,Etcheverry,' +
      'Arismendi,Brum,Cardona,Morales,Sena,Pintos,Ferrari,Bueno,Duarte,Oliveira,Bentancor,Soria,Lorenzo,Cabral'),
    'Colômbia': N('Juan Camilo,Juan David,Juan Pablo,Yerson,Kevin,Duván,Jhon,Jhon Jader,Brayan,Yerry,Jefferson,Wilmar,' +
      'Davinson,Luis,Carlos,Andrés,Santiago,Sebastián,Daniel,Mateo,Jhojan,Jáminton,Déiver,Yáser,Steven,Stiven,Cristian,' +
      'Miguel Ángel,Edwin,Harold,Fredy,Wílmer,Dairon,Jorman,Andrés Felipe,Johan,Éider,Nelson,Óscar,Faber,Yeison,Jhonier,' +
      'Álex,Camilo,Felipe,Alejandro,Diego,Jhon Fredy,Richard,Yimmi,Frank,Johan Carlos,Déinner,Marlon,Elkin,Jorge',
    'Ríos,Mina,Cuesta,Arias,Castaño,Rodríguez,Gómez,Martínez,Moreno,Valencia,Mosquera,Murillo,Palacios,Hinestroza,Sánchez,' +
      'Rentería,Córdoba,Perea,Zapata,Quintero,Cuadrado,Borja,Lerma,Muñoz,Ospina,Restrepo,Cardona,Giraldo,Henao,Arboleda,' +
      'Ibargüen,Asprilla,Carabalí,Caicedo,Angulo,Banguero,Chará,Díaz,Pérez,Torres,Ramírez,Vargas,Rojas,Herrera,Ortiz,' +
      'Ocampo,Salazar,Uribe,Mejía,Montoya,Londoño,Bedoya,Machado,Lucumí,Riascos,Cuéllar,Barrios,Mosquera,Sinisterra,Velasco'),
    'Portugal': N('Tiago,Rúben,Diogo,Gonçalo,Rafael,João,Bernardo,Bruno,Nuno,Ricardo,Pedro,Rui,André,Francisco,Duarte,Tomás,' +
      'Martim,Afonso,Rodrigo,Miguel,Vítor,Sérgio,Fábio,Hugo,Hélder,Luís,Manuel,José,Paulo,Renato,Nélson,Daniel,Fernando,' +
      'Simão,Vasco,Henrique,Gustavo,Salvador,Santiago,Lourenço,Dinis,Guilherme,Leonardo,Samuel,Mateus,Joaquim,Raúl,Filipe,' +
      'Rafa,Zé,Kiko,Quim,Jota,Toni,Gonçalo,David,Carlos,Jorge,Rúben,Edgar,Marco,Xavier,João Mário,João Pedro,Zé Luís,Tó',
    'Mendes,Costa,Neves,Pires,Lopes,Silva,Santos,Ferreira,Pereira,Oliveira,Rodrigues,Martins,Sousa,Fernandes,Gonçalves,Gomes,' +
      'Marques,Alves,Almeida,Ribeiro,Pinto,Carvalho,Teixeira,Moreira,Correia,Cardoso,Soares,Monteiro,Vieira,Nunes,Coelho,' +
      'Cunha,Rocha,Leite,Mota,Moura,Matos,Faria,Sequeira,Fonseca,Simões,Tavares,Borges,Antunes,Quaresma,Guerreiro,Esteves,' +
      'Barbosa,Araújo,Magalhães,Freitas,Brito,Nogueira,Morais,Vaz,Valente,Domingos,Cruz,Patrício,Macedo,Salgado,Pacheco,' +
      'Amaral,Baptista,Sá,Figueiredo,Lobo,Branco,Vasconcelos,Rebelo,Sampaio,Couto,Abreu,Azevedo'),
    'Espanha': N('Pablo,Álex,Iker,Hugo,Dani,Álvaro,Sergio,David,Javier,Jorge,Carlos,Adrián,Raúl,Rubén,Marcos,Mario,Diego,' +
      'Unai,Aitor,Mikel,Asier,Pau,Marc,Jordi,Gerard,Pol,Nico,Fermín,Pedro,Fernando,Íñigo,Gonzalo,Rodrigo,Martín,Lucas,Mateo,' +
      'Leo,Bruno,Rafa,Nacho,Manu,Víctor,Óscar,Iván,Ander,Jon,Oier,Borja,Yeremy,Aleix,Oriol,Joan,Ferran,Ángel,Samuel,Eric,' +
      'Héctor,Gabriel,Juanma,Chema,Jesús,Toni,Santi,Kike,Isco,Koke,Alejandro,Andrés,Xabi,Gorka,Eneko,Julen,Izan,Thiago',
    'García,Fernández,González,Rodríguez,López,Martínez,Sánchez,Pérez,Gómez,Martín,Jiménez,Ruiz,Hernández,Díaz,Moreno,' +
      'Muñoz,Álvarez,Romero,Alonso,Gutiérrez,Navarro,Torres,Domínguez,Vázquez,Ramos,Gil,Ramírez,Serrano,Blanco,Molina,' +
      'Morales,Suárez,Ortega,Delgado,Castro,Ortiz,Rubio,Marín,Sanz,Iglesias,Núñez,Medina,Garrido,Cortés,Castillo,Santos,' +
      'Lozano,Guerrero,Cano,Prieto,Méndez,Cruz,Calvo,Gallego,Vidal,León,Herrera,Márquez,Peña,Flores,Cabrera,Campos,Vega,' +
      'Fuentes,Carrasco,Díez,Aguirre,Etxeberria,Puig,Ferrer,Soler,Roca,Pujol,Vila,Arana,Larrea,Gavira,Sanjuán,Oyarzabal'),
    'Inglaterra': N('Jack,Harry,Oliver,Ollie,Charlie,George,James,Thomas,Tom,William,Alfie,Joshua,Josh,Jacob,Daniel,Sam,Ben,' +
      'Joe,Luke,Callum,Connor,Kieran,Jordan,Jamie,Ryan,Lewis,Mason,Declan,Jude,Marcus,Kyle,Reece,Trent,Cole,Phil,Ethan,Noah,' +
      'Leo,Archie,Freddie,Theo,Max,Henry,Elliot,Dominic,Aaron,Tyler,Kai,Jarrod,Morgan,Ashley,Danny,Liam,Nathan,Curtis,Dean,' +
      'Conor,Eddie,Ivan,Levi,Rico,Harvey,Jarell,Tino,Morgan,Ezri,Myles,Archie,Jayden,Kobbie,Jaden,Alex,Ross,Jonjo',
    'Smith,Jones,Taylor,Brown,Williams,Wilson,Johnson,Davies,Robinson,Wright,Thompson,Evans,Walker,White,Roberts,Green,Hall,' +
      'Wood,Jackson,Clarke,Harrison,Bennett,Walsh,Fletcher,Mason,Hughes,Edwards,Lewis,Turner,Hill,Moore,Cooper,Ward,Morris,' +
      'King,Watson,Baker,Harris,Clark,Young,Allen,Mitchell,Carter,Phillips,Parker,Shaw,Cole,Barnes,Stones,Rice,Foster,Ellis,' +
      'Webb,Holmes,Palmer,Barker,Lloyd,Marshall,Kelly,Gray,Chapman,Mills,Price,Rose,Grant,Saunders,Burton,Murphy,Pope,Dixon,' +
      'Gibbs,Henderson,Gordon,Lamptey,Ramsdale,Trippier,Maguire,Guéhi,Chilwell,Dunk,Mainoo,Eze,Wharton,Branthwaite'),
    'Itália': N('Lorenzo,Matteo,Federico,Davide,Andrea,Alessandro,Leonardo,Francesco,Gabriele,Riccardo,Tommaso,Giovanni,' +
      'Giuseppe,Marco,Luca,Simone,Nicolò,Stefano,Daniele,Antonio,Mattia,Filippo,Alessio,Emanuele,Christian,Gianluca,Gianluigi,' +
      'Ciro,Salvatore,Vincenzo,Domenico,Pietro,Edoardo,Giacomo,Samuele,Sandro,Fabio,Paolo,Roberto,Manuel,Mario,Michele,' +
      'Sebastiano,Diego,Jacopo,Raffaele,Gennaro,Nicola,Claudio,Massimo,Alberto,Francesco Paolo,Gianmarco,Mattia,Cristiano,' +
      'Brian,Wilfried,Kevin,Nicolò,Destiny,Moise,Fabrizio,Valerio,Luigi,Carmine,Enrico',
    'Ricci,Esposito,Bianchi,Conti,Gallo,Rossi,Russo,Ferrari,Romano,Colombo,Bruno,Marino,Greco,Costa,Fontana,Rizzo,Lombardi,' +
      'Moretti,Barbieri,De Luca,Mancini,Santoro,Rinaldi,Caruso,Ferrara,Galli,Martini,Leone,Longo,Gentile,Martinelli,Vitale,' +
      'Lombardo,Serra,Coppola,De Santis,D\'Angelo,Marchetti,Parisi,Villa,Conte,Ferraro,Fabbri,Bellini,Palumbo,Sanna,Farina,' +
      'Rizzi,Monti,Cattaneo,Morelli,Amato,Silvestri,Mazza,Testa,Grassi,Pellegrini,Carbone,Giuliani,Benedetti,Barone,' +
      'Rossetti,Caputo,Montanari,Guerra,Palmieri,Bernardi,Ferri,Locatelli,Bastoni,Frattesi,Scamacca,Raspadori,Buongiorno'),
    'Alemanha': N('Leon,Jonas,Florian,Luca,Niklas,Lukas,Paul,Felix,Maximilian,Max,Elias,Finn,Noah,Ben,Tim,Jan,Julian,Kai,' +
      'Leroy,Joshua,Moritz,Timo,Marco,Mario,Thomas,Sebastian,Philipp,Kevin,Marcel,Dennis,Jannik,Robin,Nico,Fabian,Jamal,' +
      'Benjamin,David,Erik,Jonathan,Karim,Kerem,Deniz,Emre,Can,Marvin,Nils,Pascal,Christoph,Dominik,Matthias,Alexander,' +
      'Tobias,Linus,Henrik,Lennart,Mats,Aleksandar,Malik,Yann,Maximilian,Lars,Oliver,Toni,Manuel,Jonathan,Tom,Armel,Brajan',
    'Krüger,Becker,Wolf,Hoffmann,Braun,Müller,Schmidt,Schneider,Fischer,Weber,Meyer,Wagner,Schulz,Koch,Richter,Klein,' +
      'Schröder,Neumann,Schwarz,Zimmermann,Schmitt,Hartmann,Lange,Werner,Krause,Meier,Lehmann,Schmid,Schulze,Maier,Köhler,' +
      'Herrmann,König,Walter,Mayer,Huber,Kaiser,Fuchs,Peters,Lang,Scholz,Möller,Weiß,Jung,Hahn,Vogel,Friedrich,Keller,' +
      'Günther,Frank,Berger,Winkler,Roth,Beck,Lorenz,Baumann,Franke,Albrecht,Schuster,Simon,Ludwig,Böhm,Winter,Kraus,' +
      'Schumacher,Krämer,Vogt,Stein,Jäger,Otto,Sommer,Groß,Seidel,Heinrich,Brandt,Haas,Schreiber,Graf,Kühn,Yilmaz,Öztürk'),
    'França': N('Kylian,Hugo,Théo,Rayan,Lucas,Antoine,Ousmane,Aurélien,Jules,Adrien,Benjamin,Mathis,Nathan,Enzo,Maxence,' +
      'Clément,Romain,Thomas,Alexandre,Paul,Louis,Raphaël,Mattéo,Noah,Yanis,Ibrahima,Moussa,Mamadou,Kingsley,Randal,Dayot,' +
      'Wesley,Kévin,Florian,Jordan,Karim,Nabil,Rayane,Bradley,Warren,Steve,Désiré,Malo,Tanguy,Eliot,Axel,Corentin,Quentin,' +
      'Valentin,Baptiste,Arthur,Gabriel,Léo,Sacha,Amine,Youssouf,Khéphren,Loïc,Yann,Benoît,Mathys,Lenny,Bafodé,Wilfried,' +
      'Ilyes,Lilian,Malick,Djibril,Amadou,Mohamed,Enzo,Dylan,Jean-Philippe,Jean-Clair,Pierre,Olivier,Mike',
    'Mendy,Lefèvre,Bernard,Diallo,Moreau,Martin,Thomas,Petit,Robert,Richard,Durand,Dubois,Laurent,Simon,Michel,Leroy,Roux,' +
      'David,Bertrand,Morel,Fournier,Girard,Bonnet,Dupont,Lambert,Fontaine,Rousseau,Vincent,Muller,Lefebvre,Faure,André,' +
      'Mercier,Blanc,Guérin,Boyer,Garnier,Chevalier,François,Legrand,Gauthier,Perrin,Robin,Clément,Morin,Nicolas,Henry,' +
      'Roussel,Mathieu,Gautier,Masson,Marchand,Duval,Denis,Dumont,Traoré,Koné,Camara,Sissoko,Coulibaly,Touré,Konaté,Diarra,' +
      'Fofana,Cissé,Keita,Sylla,Doucouré,Ndiaye,Sarr,Gueye,Ba,Benali,Mansouri,Haddad,Bensaïd,Kamara,Badiashile,Zaïre-Emery'),
    'Holanda': N('Daan,Sem,Milan,Jesse,Lars,Luuk,Bram,Thijs,Stijn,Ruben,Tim,Joey,Kevin,Frenkie,Matthijs,Virgil,Cody,Denzel,' +
      'Jurriën,Teun,Joël,Ryan,Quinten,Tijjani,Xavi,Justin,Wout,Bart,Koen,Niels,Jasper,Sven,Rick,Gijs,Jens,Maarten,Pieter,' +
      'Jeroen,Wesley,Robin,Arjen,Dirk,Mats,Noa,Thom,Levi,Finn,Jordy,Sepp,Calvin,Owen,Jorrel,Micky,Ian,Brian,Steven,Donyell,' +
      'Lutsharel,Jerdy,Mees,Kenneth,Davy,Myron,Jayden,Ruud,Guus,Hidde,Siem',
    'de Vries,Bakker,Visser,Smit,Jansen,de Jong,Janssen,van Dijk,Meijer,de Boer,Mulder,de Groot,Bos,Vos,Peters,Hendriks,' +
      'van Leeuwen,Dekker,Brouwer,de Wit,Dijkstra,Smits,de Graaf,van der Meer,van der Linden,Kok,Jacobs,de Haan,Vermeulen,' +
      'van den Berg,van der Heijden,van der Veen,van den Broek,de Bruijn,de Bruin,van der Wal,Schouten,Willems,van Wijk,' +
      'Hoekstra,Koster,Prins,Huisman,Post,Kuipers,Timmermans,Verbeek,Gerritsen,Klaassen,Veltman,Kramer,Kuiper,Bergwijn,' +
      'Koopmeiners,Gravenberch,Malen,Simons,Weghorst,Frimpong,Reijnders,Schreuders,Wieffer,van Hecke,Hato,Maatsen'),
    'Bélgica': N('Arthur,Lucas,Louis,Noah,Jules,Victor,Thibaut,Axel,Youri,Leandro,Charles,Amadou,Dodi,Jérémy,Timothy,Wout,' +
      'Thomas,Hans,Arne,Maxim,Jan,Dries,Toby,Jason,Lander,Siebe,Senne,Mats,Zeno,Nathan,Johan,Yannick,Brecht,Pieter,Jelle,' +
      'Simon,Maarten,Hugo,Cédric,Loïs,Malick,Orel,Aster,Olivier,Matthias,Ruben,Koen,Alexis,Romeo,Mandela,Julien,Arno,' +
      'Ferre,Kobe,Warre,Lennert,Mathias,Jordan,Anthony,Yari,Hannes,Michel',
    'Peeters,Janssens,Maes,Jacobs,Mertens,Willems,Claes,Goossens,Wouters,De Smet,Dubois,Lambert,Dupont,Martin,Hermans,' +
      'Aerts,Van Damme,Pauwels,De Clercq,Vermeulen,Desmet,Michiels,Leclercq,Simon,Laurent,Lemaire,Vandenberghe,Hendrickx,' +
      'Claessens,Smets,Coppens,Verstraete,De Coster,Verhaegen,Wuyts,Denayer,Castagne,Theate,Faes,Debast,Mangala,Vranckx,' +
      'De Ketelaere,Openda,Doku,Bakayoko,Lukebakio,Vanaken,De Cuyper,Onana,Sels,Casteels,Vermeeren,Verschaeren,Van Hecke,' +
      'Engels,De Wilde,Seys,Van Den Bosch,Heymans,Raskin'),
    'Turquia': N('Arda,Kerem,Hakan,Ferdi,Orkun,Barış,Cengiz,Kenan,Yunus,Emre,Burak,Mert,Ozan,Çağlar,Merih,Abdülkerim,Salih,' +
      'Okay,Uğurcan,Altay,İsmail,Semih,Oğuz,Berkan,Enes,Yusuf,Mehmet,Ahmet,Mustafa,Ali,Hasan,Hüseyin,Murat,Serdar,Selçuk,' +
      'Volkan,Tolga,Umut,Can,Eren,Efe,Emir,Kaan,Onur,Halil,İrfan,Ertuğrul,Batuhan,Doğukan,Bertuğ,Yiğit,Atakan,Arif,Samet,' +
      'Ömer,Tarık,Zeki,Cenk,Sinan,Bora,Göktan,Kaan,Deniz,Taylan,Mücahit,Ahmetcan,Emirhan,Furkan',
    'Yılmaz,Kaya,Demir,Şahin,Çelik,Yıldız,Yıldırım,Öztürk,Aydın,Özdemir,Arslan,Doğan,Kılıç,Aslan,Çetin,Kara,Koç,Kurt,' +
      'Özkan,Şimşek,Polat,Özcan,Korkmaz,Erdoğan,Akın,Çakır,Güler,Aktürkoğlu,Ünal,Bayındır,Kahveci,Söyüncü,Akaydın,Demiral,' +
      'Ayhan,Tosun,Ünder,Karaman,Yazıcı,Tufan,Topal,Turan,Kabak,Bardakcı,Elmalı,Kadıoğlu,Özer,Sarı,Tekin,Aksoy,Avcı,Bulut,' +
      'Güneş,Erdem,Uysal,Taş,Kökçü,Akgün,Yüksek,Müldür,Çalhanoğlu,Kutlu,Özcan,Akbaba,Gül,Ateş,Ekinci,Şen'),
    'Escócia': N('Callum,Ryan,Scott,Andrew,Andy,Stuart,Kenny,Lewis,Craig,Grant,Fraser,Ross,Euan,Lyndon,Kieran,Billy,John,' +
      'Jamie,Liam,Jack,Ewan,Murray,Gregor,Aaron,Calum,Connor,Kyle,Darren,Stephen,Steven,Alan,Gary,Barry,Dougie,Hamish,Angus,' +
      'Finlay,Rory,Struan,Cammy,Ally,Logan,Jordan,Blair,Duncan,Neil,Iain,Ian,Lennon,Ben,Josh,Tommy,Che,Nathan,Kevin,Lawrence',
    'McGregor,Robertson,Christie,Armstrong,Fraser,McKenna,Ferguson,Campbell,Stewart,Murray,Thomson,Anderson,Scott,Reid,' +
      'Ross,Paterson,Morrison,MacDonald,McLean,McKay,McLeod,McIntosh,Kerr,Gordon,Hamilton,Graham,Johnstone,Wallace,Crawford,' +
      'Kennedy,Burns,Hunter,Douglas,Duncan,Henderson,Hendry,Shankland,Dykes,Porteous,Gilmour,Tierney,Hanley,Souttar,Cooper,' +
      'Grant,Mackie,Cameron,Mitchell,Black,Brown,Wilson,Sinclair,Boyd,Muir,Baird,Lennon,McCrorie,McGinn,McLaughlin,Devlin,' +
      'Doak,Ralston,Patterson,Considine,Ferguson,Forrest,Turnbull,Clark,Gauld,Docherty,Quinn'),
    'Grécia': N('Giorgos,Kostas,Dimitris,Nikos,Giannis,Christos,Vangelis,Panagiotis,Thanasis,Sotiris,Anastasios,Tasos,' +
      'Stelios,Manolis,Michalis,Lefteris,Vasilis,Petros,Pavlos,Alexandros,Konstantinos,Fotis,Andreas,Theodoros,Spyros,' +
      'Charalambos,Babis,Kyriakos,Stavros,Ilias,Apostolos,Antonis,Marios,Fanis,Odysseas,Dimos,Lazaros,Savvas,Christoforos,' +
      'Sokratis,Angelos,Aris,Takis,Theofanis,Zisis,Orestis,Leonidas,Achilleas,Periklis,Markos',
    'Papadopoulos,Papadakis,Georgiou,Nikolaidis,Pappas,Oikonomou,Vlachos,Makris,Karagiannis,Konstantinou,Ioannou,Dimitriou,' +
      'Antoniou,Christodoulou,Alexiou,Athanasiou,Papageorgiou,Pavlidis,Ioannidis,Masouras,Siopis,Kourbelis,Retsos,' +
      'Hatzidiakos,Giakoumakis,Kotsiras,Mantalos,Pelkas,Galanopoulos,Douvikas,Triantafyllou,Papanikolaou,Stamatopoulos,' +
      'Petridis,Samaras,Kyriakou,Theodorou,Lambrou,Michailidis,Anagnostou,Kalogeropoulos,Sotiriou,Panagiotou,Raptis,Zisis,' +
      'Kontos,Galanis,Stergiou,Bakasetas,Tzolis,Pavlenka,Vagiannidis,Koulierakis,Karetsas,Konstantelias,Zafeiris'),
    'Suíça': N('Yann,Manuel,Fabian,Remo,Silvan,Ruben,Breel,Noah,Dan,Denis,Nico,Cédric,Ricardo,Michel,Kevin,Jonas,Luca,Leon,' +
      'Levin,Lars,Fabio,Gian,Andrin,Joël,Simon,Marco,Pascal,Renato,Steven,Djibril,Ardon,Zeki,Eray,Yvon,Nils,Elia,Loris,' +
      'Matteo,Timo,Lino,Mattia,Liam,Basil,Jan,Granit,Xherdan,Haris,Valon,Admir,Gregor,Philipp,Christian,Miro',
    'Müller,Meier,Schmid,Keller,Weber,Huber,Schneider,Meyer,Steiner,Fischer,Gerber,Brunner,Baumann,Frei,Zimmermann,Moser,' +
      'Widmer,Wyss,Graf,Roth,Suter,Bühler,Bachmann,Kälin,Kuhn,Lüthi,Hofer,Schärer,Sommer,Hess,Egli,Vogel,Marti,Wüthrich,' +
      'Rochat,Favre,Bonvin,Chappuis,Rossi,Bernasconi,Ferrari,Sutter,Elvedi,Aebischer,Freuler,Itten,Steffen,Zuber,Lang,' +
      'Fassnacht,Kobel,Jashari,Rieder,Ndoye,Amenda,Comert,Mvogo,Zesiger,Stergiou,Monteiro,Sierro,Vargas,Seiler'),
    'Áustria': N('David,Marcel,Marko,Christoph,Konrad,Florian,Stefan,Philipp,Michael,Kevin,Patrick,Maximilian,Alexander,' +
      'Nicolas,Romano,Sasa,Xaver,Andreas,Lukas,Matthias,Daniel,Martin,Thomas,Raphael,Julian,Leopold,Valentin,Tobias,Dominik,' +
      'Moritz,Jakob,Felix,Elias,Paul,Gernot,Muhammed,Karim,Oliver,Manuel,Benjamin,Markus,Sebastian,Junior,Phillipp,Leo,' +
      'Nikolaus,Flavius,Alessandro,Michael,Stefan,Severin,Matthäus,Georg,Ferdinand,Laurenz',
    'Gruber,Huber,Bauer,Wagner,Müller,Pichler,Steiner,Moser,Mayer,Hofer,Leitner,Berger,Fuchs,Eder,Fischer,Schmid,Winkler,' +
      'Weber,Schwarz,Maier,Schneider,Reiter,Mayr,Schmidt,Wimmer,Egger,Brunner,Lang,Baumgartner,Auer,Binder,Lechner,Wolf,' +
      'Wallner,Aigner,Ebner,Koller,Lehner,Haas,Schuster,Laimer,Posch,Wöber,Seiwald,Trimmel,Lienhart,Schlager,Prass,Pentz,' +
      'Kainz,Weimann,Stöger,Sabitzer,Baumgartl,Grillitsch,Arnautović,Gregoritsch,Querfeld,Schmid,Mwene,Entrup,Wurmbrand'),
    'Dinamarca': N('Christian,Kasper,Simon,Joachim,Andreas,Mikkel,Jonas,Rasmus,Jesper,Morten,Thomas,Mathias,Jannik,Victor,' +
      'Mads,Anders,Martin,Frederik,Emil,Oliver,Magnus,Lucas,William,Alfred,Noah,Oscar,Malthe,Aksel,Gustav,Jens,Lasse,' +
      'Kristoffer,Nicolai,Mikael,Jacob,Patrick,Alexander,Daniel,Philip,Søren,Henrik,Carl,Elias,Asger,Villads,Viktor,Albert,' +
      'Conrad,Yussuf,Pierre-Emile,Mohamed,Kevin,Anton,Silas,Tobias,Rasmus',
    'Jensen,Nielsen,Hansen,Pedersen,Andersen,Christensen,Larsen,Sørensen,Rasmussen,Jørgensen,Petersen,Madsen,Kristensen,' +
      'Olsen,Thomsen,Christiansen,Poulsen,Johansen,Møller,Mortensen,Knudsen,Jakobsen,Mikkelsen,Frederiksen,Laursen,Holm,' +
      'Schmidt,Eriksen,Kjær,Lauridsen,Bach,Dalsgaard,Højlund,Damsgaard,Skov,Lindstrøm,Vestergaard,Kristiansen,Bechmann,Mæhle,' +
      'Dreyer,Wind,Lassen,Svendsen,Lund,Berg,Dahl,Clausen,Krogh,Bruun,Hjulmand,Højbjerg,Nørgaard,Isaksen,Bah,Kristensen,' +
      'Andersen,Hermansen,Vindahl,Frendrup,Kvistgaarden'),
    'Chile': N('Alexis,Arturo,Charles,Gary,Eduardo,Mauricio,Claudio,Gonzalo,Matías,Felipe,Benjamín,Vicente,Agustín,Tomás,' +
      'Diego,Ben,Darío,Marcelo,Erick,Guillermo,Paulo,Iván,Luciano,Cristóbal,Bastián,Joaquín,Maximiliano,Rodrigo,Esteban,' +
      'Jean,Francisco,Pablo,Sebastián,Nicolás,Víctor,Igor,Lucas,Gabriel,Marcos,Alexander,Yerko,Brayan,Byron,Jeyson,Williams,' +
      'Clemente,Martín,Marcelino,Dylan,Thomas,Darío,Lucas,Damián,Gabriel,Fernando,Mathías,Javier,Jorge',
    'González,Muñoz,Rojas,Díaz,Pérez,Soto,Contreras,Silva,Martínez,Sepúlveda,Morales,Rodríguez,López,Fuentes,Hernández,' +
      'Torres,Araya,Flores,Espinoza,Valenzuela,Castillo,Tapia,Reyes,Gutiérrez,Castro,Pizarro,Álvarez,Vásquez,Sánchez,' +
      'Fernández,Ramírez,Carrasco,Gómez,Cortés,Herrera,Núñez,Jara,Vergara,Rivera,Figueroa,Riquelme,García,Miranda,Bravo,' +
      'Vera,Molina,Vega,Campos,Sandoval,Orellana,Valdés,Cáceres,Isla,Medel,Aránguiz,Vidal,Pulgar,Palacios,Osorio,Echeverría,' +
      'Galdames,Suazo,Zamorano,Salas,Bolados,Dávila,Loyola,Catalán,Osses'),
    'Paraguai': N('Miguel,Julio,Gustavo,Omar,Antonio,Ángel,Mathías,Diego,Ramón,Alejandro,Óscar,Cristian,Derlis,Richard,' +
      'Héctor,Junior,Fabián,Robert,Blas,Hernán,Carlos,Juan,Rodrigo,Iván,Nelson,Néstor,Roque,Arnaldo,Celso,Salvador,Darío,' +
      'Gastón,Andrés,Alcides,Matías,Ronaldo,Rubén,Santiago,Fernando,Enzo,Gabriel,Adam,Alexis,Braian,Wílder,Hugo,Lorenzo,' +
      'Josué,Damián,Kaku,Jesús,Ángel Ramón,Isidro,Walter,Marcelo,Alan',
    'Almirón,Gómez,Alderete,Sanabria,Enciso,Cáceres,Benítez,Villalba,González,Martínez,Rojas,Giménez,Ortiz,Ayala,Romero,' +
      'Fernández,Duarte,Galeano,Báez,Cardozo,Insfrán,Riveros,Valdez,Acosta,Ramírez,Arce,Cubas,Espínola,Gamarra,Velázquez,' +
      'Benegas,Ocampos,Bobadilla,Paredes,Samudio,Santander,Zárate,Aquino,Vera,Ojeda,Recalde,Caballero,Arzamendia,Torres,' +
      'Morínigo,Ledesma,Amarilla,Escobar,Bareiro,Balbuena,Piris,Villasanti,Sosa,Rivas,Montiel,Cabañas,Santa Cruz,Riquelme'),
    'Equador': N('Moisés,Piero,Pervis,Enner,Gonzalo,Kendry,Jeremy,Félix,Ángelo,Willian,Jhegson,Alan,Carlos,Byron,Jordy,' +
      'Kevin,Michael,Jackson,Leonardo,Ángel,Romario,Joao,Bryan,Erick,José,Luis,Jefferson,Christian,Antonio,Édison,Walter,' +
      'Segundo,Iván,Cristhian,Joel,Jhon,Dixon,Hernán,Junior,Ronie,Óscar,Xavier,Andrés,Robert,Fidel,Allen,Darwin,Nilson,John,' +
      'Patrickson,Yaimar,Willian,Djorkaeff,Janner,Layan,Nilson,Alexander',
    'Caicedo,Hincapié,Estupiñán,Valencia,Plata,Páez,Torres,Preciado,Méndez,Arboleda,Ibarra,Mena,Cifuentes,Rodríguez,' +
      'Porozo,Corozo,Angulo,Castillo,Vite,Sornoza,Minda,Quiñónez,Cortez,Ayoví,Benítez,Reasco,Bolaños,Ordóñez,Chalá,Palacios,' +
      'Montaño,Tenorio,Lastra,Mercado,Cevallos,Guerrero,Medina,Rivas,Ortiz,Moreira,Zambrano,Vera,Bravo,Cabezas,Delgado,' +
      'Pacheco,Erazo,Nazareno,Pacho,Galíndez,Gruezo,Mina,Rentería,Folleco,Caicedo,Pintado,Yeboah,Sarmiento,Campana'),
    'México': N('Santiago,Hirving,Edson,Raúl,Guillermo,Andrés,Jesús,Héctor,Carlos,Luis,Orbelín,Diego,Uriel,Alexis,César,' +
      'Julián,Érick,Roberto,Jorge,José Juan,Javier,Rodolfo,Kevin,Henry,Ulises,Gilberto,Alan,Jonathan,Johan,Marcelo,Emilio,' +
      'Fernando,Gerardo,Israel,Jaime,Juan Pablo,Leonardo,Luis Ángel,Martín,Miguel,Óscar,Rodrigo,Salvador,Sebastián,Víctor,' +
      'Brian,Obed,Cuauhtémoc,Efraín,Alejandro,Armando,Chucho,Memo,Chava,Toño,Pável,Tecatito,Germán,Gael,Ángel,Jordan,Isaac',
    'Hernández,García,Martínez,López,González,Rodríguez,Pérez,Sánchez,Ramírez,Cruz,Flores,Gómez,Morales,Vázquez,Reyes,' +
      'Jiménez,Torres,Díaz,Gutiérrez,Ruiz,Mendoza,Aguilar,Ortiz,Moreno,Castillo,Romero,Álvarez,Méndez,Chávez,Rivera,Juárez,' +
      'Ramos,Domínguez,Herrera,Medina,Castro,Vargas,Guzmán,Velázquez,Muñoz,Rojas,Contreras,Salazar,Luna,Ortega,Guerrero,' +
      'Estrada,Bautista,Cortés,Soto,Alvarado,Espinoza,Lozano,Ochoa,Montes,Gallardo,Orozco,Vega,Corona,Pineda,Arellano,' +
      'Navarro,Zamora,Huerta,Sandoval,Trejo,Quiñones,Valdez,Cervantes,Macías,Antuna,Gallardo,Chávez,Reyes,Araujo'),
    'EUA': N('Christian,Weston,Tyler,Gio,Timothy,Tim,Brenden,Josh,Yunus,Folarin,Ricardo,Matt,Zack,Walker,Chris,Miles,Cameron,' +
      'Jordan,DeAndre,Malik,Jalen,Cade,Caleb,Hunter,Logan,Mason,Ethan,Aidan,Brandon,Kellyn,Paxton,Jesús,Diego,Luca,Owen,Bryce,' +
      'Colton,Landon,Clint,Michael,DaMarcus,Tanner,Wyatt,Gavin,Carter,Jack,Nathan,Austin,Kevin,Dylan,Evan,Garrett,Jaylen,' +
      'Marcus,Darius,Isaiah,Elijah,Noah,Liam,Cole,Brady,Chase,Jake,Ryan,Zach,Justin,Tanner,Diego,Alejandro,Johnny',
    'Smith,Johnson,Williams,Brown,Jones,Miller,Davis,Wilson,Anderson,Taylor,Thomas,Moore,Martin,Jackson,Thompson,White,' +
      'Harris,Clark,Lewis,Robinson,Walker,Young,Allen,King,Wright,Scott,Hill,Green,Adams,Baker,Nelson,Carter,Mitchell,' +
      'Roberts,Turner,Phillips,Campbell,Parker,Evans,Edwards,Collins,Stewart,Morris,Murphy,Cook,Rogers,Reed,Bailey,Bell,' +
      'Cooper,Richardson,Cox,Howard,Ward,Peterson,Gray,Hughes,Price,Sullivan,Russell,Ferguson,Brooks,Bennett,Wood,Barnes,' +
      'Henderson,Coleman,Jenkins,Perry,Powell,Long,Patterson,Ramirez,Morales,Gonzalez,Ortiz,Reyna,Robinson,Zimmerman'),
    'Japão': N('Takumi,Kaoru,Wataru,Daichi,Ritsu,Takefusa,Junya,Ayase,Hidemasa,Ko,Yuki,Kaito,Sota,Haruto,Ren,Yuto,Riku,' +
      'Hiroki,Takehiro,Shogo,Shuto,Koki,Kento,Yuta,Daiki,Keisuke,Shinji,Yasuhito,Makoto,Atsuto,Maya,Genki,Hayao,Kyogo,Daizen,' +
      'Reo,Yukinari,Ao,Kota,Shunsuke,Takuma,Kazuki,Ryota,Naoki,Tsubasa,Hiroshi,Kenta,Yusuke,Taichi,Kohei,Ryo,Sho,Yuma,' +
      'Hayato,Haruki,Soma,Keito,Mao,Zion,Kein,Kotaro,Shion,Yuito,Asahi,Minato,Itsuki,Hinata,Sosuke',
    'Sato,Suzuki,Takahashi,Tanaka,Watanabe,Ito,Yamamoto,Nakamura,Kobayashi,Kato,Yoshida,Yamada,Sasaki,Yamaguchi,Matsumoto,' +
      'Inoue,Kimura,Hayashi,Shimizu,Yamazaki,Mori,Abe,Ikeda,Hashimoto,Yamashita,Ishikawa,Nakajima,Maeda,Fujita,Ogawa,Goto,' +
      'Okada,Hasegawa,Murakami,Kondo,Ishii,Saito,Sakamoto,Endo,Aoki,Fujii,Nishimura,Fukuda,Ota,Miura,Okamoto,Matsuda,' +
      'Nakagawa,Harada,Ono,Tamura,Takeuchi,Kaneko,Wada,Nakano,Ishida,Ueda,Morita,Hara,Shibata,Sakai,Kudo,Yokoyama,Miyazaki,' +
      'Uchida,Takagi,Ando,Taniguchi,Ohashi,Kubo,Mitoma,Minamino,Tomiyasu,Itakura,Machida,Morishita,Hosoya,Suzuki'),
    'Coreia do Sul': N('Min-jae,Heung-min,Hee-chan,Kang-in,Gue-sung,Jae-sung,Seung-ho,Woo-young,In-beom,Young-woo,Jin-su,' +
      'Tae-hwan,Hyun-woo,Seung-gyu,Ji-sung,Chung-yong,Sung-yueng,Min-jun,Seo-jun,Do-yoon,Ye-jun,Si-woo,Ha-jun,Ji-ho,Joon-ho,' +
      'Jun-seo,Yu-jun,Hyun-jun,Dong-hyun,Ji-hoon,Gun-woo,Woo-jin,Sun-woo,Yeon-woo,Jae-won,Sang-ho,Jun-young,Hyeon-gyu,' +
      'Dong-gyeong,Kyung-won,Tae-seok,Jun-ho,Myung-jae,Ji-soo,Min-kyu,Young-gwon,Chang-hoon,Jae-hyun,Seung-woo,Tae-min,' +
      'Do-hyun,Joo-won,Sang-min,Ho-jin,Jin-woo,Eun-sung,Si-hun',
    'Kim,Lee,Park,Choi,Jung,Kang,Cho,Yoon,Jang,Lim,Han,Oh,Seo,Shin,Kwon,Hwang,Ahn,Song,Jeon,Hong,Yoo,Ko,Moon,Yang,Son,Bae,' +
      'Baek,Heo,Nam,Noh,Ha,Kwak,Sung,Cha,Joo,Woo,Min,Ryu,Na,Jin,Uhm,Won,Gu,Seol,Ji,Byun,Pyo,Do',
    { surnameFirst: true }),
    'Arábia Saudita': N('Salem,Mohammed,Abdullah,Fahad,Saud,Saleh,Yasser,Firas,Sultan,Hattan,Ali,Nawaf,Hassan,Turki,Khalid,' +
      'Faisal,Majed,Omar,Abdulrahman,Ayman,Sami,Riyadh,Nasser,Hamad,Bandar,Abdulelah,Mansour,Marwan,Ziyad,Musab,Talal,Rakan,' +
      'Saad,Meshari,Muhannad,Yazeed,Haitham,Waleed,Ibrahim,Ahmed,Hussein,Fawaz,Mukhtar,Osama,Abdulaziz,Mohannad,Nawaf,' +
      'Hamed,Eid,Mutaz,Awn,Ayed,Raghed,Nayef',
    'Al-Dawsari,Al-Shehri,Al-Faraj,Al-Owais,Al-Buraikan,Al-Malki,Al-Ghannam,Al-Bulaihi,Al-Amri,Al-Harbi,Al-Otaibi,' +
      'Al-Qahtani,Al-Ghamdi,Al-Zahrani,Al-Mutairi,Al-Shammari,Al-Anazi,Al-Subaie,Al-Rashidi,Al-Juhani,Al-Shahrani,Al-Hamdan,' +
      'Al-Najei,Al-Aboud,Al-Muwallad,Al-Yami,Al-Tambakti,Al-Obaid,Kanno,Bahebri,Fallatah,Al-Sahlawi,Al-Jassim,Al-Khaibari,' +
      'Al-Breik,Al-Ghanem,Asiri,Hawsawi,Al-Shamrani,Sharahili,Al-Muqren,Al-Saiari,Al-Khaibri,Al-Hassan,Al-Abed,Madu,' +
      'Al-Nemer,Al-Rubaie,Al-Johani,Al-Ruwaili'),
    'Catar': N('Akram,Almoez,Hassan,Abdelkarim,Boualem,Ismaeel,Karim,Bassam,Homam,Tarek,Meshaal,Saad,Assim,Abdulaziz,' +
      'Mohammed,Ahmed,Ali,Khalid,Yusuf,Salem,Hamid,Jassem,Mubarak,Abdullah,Ibrahim,Musab,Ayoub,Naif,Tameem,Fahad,Nasser,' +
      'Hazem,Mostafa,Jaber,Sultan,Rashid,Hamad,Mahdi,Yazan,Lucas,Pedro,Ró-Ró,Edmilson,Bilal',
    'Al-Haydos,Afif,Ali,Al-Rawi,Khoukhi,Ahmed,Al-Sheeb,Al-Hassan,Hatem,Al-Ahrak,Barsham,Al-Hajri,Madibo,Salman,Waad,' +
      'Al-Yazidi,Al-Kuwari,Al-Marri,Al-Naimi,Al-Mohannadi,Al-Sulaiti,Al-Mannai,Al-Hammadi,Al-Mansouri,Al-Obaidly,Al-Emadi,' +
      'Al-Malki,Al-Dosari,Al-Khater,Al-Shammari,Al-Ansari,Al-Jaber,Al-Abdulla,Al-Kaabi,Al-Ali,Fathy,Gaber,Hassan,' +
      'Abdulrahman,Boudiaf,Al-Qahtani,Al-Hitmi,Muntari,Junior,Mendes,Alaaeldin,Al-Bakri,Al-Romaihi'),
    'Peru': N('Paolo,Jefferson,André,Renato,Luis,Gianluca,Christian,Pedro,Yoshimar,Edison,Wilder,Raúl,Alexander,Bryan,Piero,' +
      'Sergio,Marcos,Christofer,Aldo,Miguel,Carlos,Jhilmar,Kevin,Joao,Oliver,Franco,Santiago,Matías,Rodrigo,Alonso,Diego,' +
      'Josepmir,Yordy,Erick,Jorge,Roberto,Ángel,Jhonatan,Hernán,Jesús,Junior,Gonzalo,Percy,Nolberto,Teófilo,Piero,Kenji,' +
      'Andy,Willyan,Catriel,Jairo,César,Ricardo,Hugo',
    'Guerrero,Farfán,Carrillo,Tapia,Advíncula,Cueva,Gallese,Yotún,Flores,Zambrano,Ramos,Callens,Abram,Aquino,Polo,Peña,' +
      'Quispe,Mamani,Huamán,Chávez,Rojas,Torres,García,Sánchez,Ruidíaz,Santamaría,Valera,Grimaldo,Reyna,Castillo,Vásquez,' +
      'Mendoza,Gonzales,Rodríguez,Díaz,Cruz,Gutiérrez,Ramírez,Pérez,Vargas,Cáceres,Condori,Huanca,Paredes,Palacios,Medina,' +
      'Silva,Sotil,Cartagena,Succar,Concha,Soto,Benavente,Céspedes,Lora,Ormeño,Peralta,Hurtado,Loyola,Ccahuantico'),
    'Bolívia': N('Marcelo,Carlos,Juan Carlos,Ramiro,Diego,Luis,José,Erwin,Henry,Miguel,Roberto,Rodrigo,Víctor,Leonel,Gabriel,' +
      'Jhasmani,Moisés,Boris,Fernando,Jairo,Danny,Carmelo,Lucas,Ronald,Pablo,Franz,Óscar,Jorge,Héctor,Alejandro,Gilbert,' +
      'Adalid,Darwin,Raúl,Cristian,Ervin,Walter,Wilson,Edgar,Saúl,Jesús,Juan,Enzo,Mauricio,Iván,Ramiro,Fabricio,Robson,' +
      'Miguelito,Jaime,Joaquín,Sebastián,Boris',
    'Moreno,Arce,Vaca,Saavedra,Castillo,Justiniano,Lampe,Haquín,Fernández,Quiroga,Rocha,Algarañaz,Chumacero,Villarroel,' +
      'Cuéllar,Mamani,Quispe,Condori,Choque,Flores,Vargas,Gutiérrez,Rojas,Torrico,Ribera,Suárez,Paz,Ramallo,Terrazas,' +
      'Sanjinés,Arteaga,Rivero,Medina,Zenteno,Cordero,Gonzales,Pinto,Salinas,Antelo,Ortiz,Rodríguez,Montero,Céspedes,' +
      'Bejarano,Galindo,Aguilar,Melgar,Áñez,Viscarra,Sagredo,Coimbra,Etcheverry,Martins,Ábrego,Menacho,Paniagua'),
    'Venezuela': N('Salomón,Yangel,Yeferson,Darwin,Tomás,Josef,Jhon,Jefferson,Eduard,Rómulo,Wilker,Yordan,Telasco,Cristian,' +
      'Jan Carlos,Jon,Nahuel,Alexander,José,Luis,Juan,Carlos,Ronald,Kervin,Richard,Andrés,Daniel,Miguel,Christian,Oswaldo,' +
      'Juanpi,Arquímedes,Brayan,Eric,Fernando,Gabriel,David,Josué,Alejandro,Ángel,Frank,Junior,Eduardo,Jesús,Wuilker,' +
      'Rafael,Yohan,Jhonder,Kevin,Samuel,Edson,Matías,Saúl,Renné',
    'Rondón,Herrera,Soteldo,Rincón,Machís,Martínez,Osorio,Savarino,Cádiz,Otero,Ferraresi,Faríñez,Romo,Aramburu,Navarro,' +
      'Casseres,Chancellor,Sosa,González,Rodríguez,Pérez,Hernández,García,López,Díaz,Sánchez,Ramírez,Torres,Rojas,Flores,' +
      'Gómez,Medina,Méndez,Mendoza,Guerra,Chacón,Vizcarrondo,Arango,Peña,Blanco,Marín,Moreno,Castillo,Lucena,Villanueva,' +
      'Contreras,Bello,Carrillo,Suárez,Mago,Añor,Seijas,Zambrano,Cumana,Makoun,Bello,Quintero,Hurtado,Benítez'),
    'Croácia': N('Luka,Ivan,Mateo,Joško,Josip,Andrej,Dominik,Marko,Mario,Ante,Nikola,Lovro,Borna,Duje,Domagoj,Dejan,Ivo,Tin,' +
      'Petar,Bruno,Martin,Filip,Antonio,Matej,Karlo,Toni,Šime,Mislav,Kristijan,Igor,Vedran,Darijo,Davor,Zvonimir,Stipe,Jakov,' +
      'Roko,Leon,Gabriel,Fran,Lukas,Niko,Marin,Hrvoje,Tomislav,Robert,Mladen,Martin,Nediljko,Lovro,Petar',
    'Horvat,Kovačević,Babić,Marić,Jurić,Novak,Kovačić,Knežević,Vuković,Marković,Petrović,Matić,Tomić,Pavlović,Božić,' +
      'Blažević,Grgić,Pavić,Radić,Perić,Kovač,Šarić,Lovrić,Vidović,Perković,Popović,Tomljenović,Bašić,Jukić,Barišić,Šimić,' +
      'Galić,Brkić,Mikulić,Pejić,Lukić,Vrdoljak,Sučić,Stanišić,Pašalić,Budimir,Brekalo,Majer,Erlić,Šutalo,Vlašić,Vida,' +
      'Livaković,Ivanušec,Baturina,Juranović,Kramarić,Petković,Orsić,Ćaleta-Car,Pongračić,Sosa,Moro,Jakić'),
    'Sérvia': N('Dušan,Aleksandar,Sergej,Filip,Nemanja,Luka,Strahinja,Nikola,Vanja,Andrija,Saša,Uroš,Lazar,Marko,Miloš,' +
      'Stefan,Veljko,Predrag,Darko,Dejan,Zoran,Ivan,Mihailo,Ognjen,Vladimir,Milan,Petar,Đorđe,Jovan,Bogdan,Srđan,Nenad,' +
      'Goran,Mijat,Mladen,Branislav,Radomir,Dragan,Željko,Vukašin,Momčilo,Ilija,Matija,Pavle,Vasilije,Nemanja,Lazar,' +
      'Veljko,Mateja,Kosta,Aleksa,Dimitrije,Viktor',
    'Jovanović,Petrović,Nikolić,Marković,Đorđević,Stojanović,Ilić,Stanković,Pavlović,Milošević,Popović,Živković,' +
      'Todorović,Kostić,Ristić,Lukić,Simić,Savić,Mladenović,Stefanović,Radovanović,Zdravković,Milovanović,Veljković,' +
      'Pavković,Gudelj,Lazović,Maksimović,Jović,Vujović,Krstić,Babić,Radonjić,Rajković,Milenković,Grujić,Đurić,Kovačević,' +
      'Janković,Matić,Novaković,Obradović,Stamenković,Pešić,Vasić,Spajić,Ivanović,Mitić,Birmančević,Samardžić,Ilić,' +
      'Gaćinović,Mitrović,Vlahović,Tadić,Milinković'),
    'Noruega': N('Martin,Alexander,Sander,Kristian,Fredrik,Morten,Leo,Oscar,Jørgen,Ola,Ørjan,Patrick,Mohamed,Julian,Andreas,' +
      'Jonas,Henrik,Magnus,Markus,Mathias,Sebastian,Tobias,Emil,Johannes,Eirik,Sindre,Håkon,Tore,Ole,Lars,Kjetil,Stian,' +
      'Vegard,Thomas,Tarik,Kasper,Aksel,Isak,Elias,Filip,William,Jakob,Noah,Lukas,Sverre,Even,Birk,Torbjørn,Erling,Antonio,' +
      'Marius,Ola,Jens Petter,Kristoffer,Fredrik,Oscar,Hugo',
    'Hansen,Johansen,Olsen,Larsen,Andersen,Pedersen,Nilsen,Kristiansen,Jensen,Karlsen,Johnsen,Pettersen,Eriksen,Berg,' +
      'Haugen,Hagen,Johannessen,Andreassen,Jacobsen,Dahl,Jørgensen,Halvorsen,Henriksen,Lund,Sørensen,Jakobsen,Moen,' +
      'Gundersen,Iversen,Strand,Solberg,Svendsen,Eide,Knutsen,Martinsen,Paulsen,Bakken,Kristoffersen,Mathisen,Lie,Berge,' +
      'Thorstvedt,Aursnes,Ajer,Østigård,Nyland,Strandberg,Solbakken,Bjørnstad,Ødegaard,Sørloth,Nusa,Bobb,Ryerson,Berg,' +
      'Wolfe,Heggem,Bjørkan,Hauge,Tangvik'),
    'Suécia': N('Viktor,Alexander,Emil,Victor,Jesper,Ludwig,Isak,Robin,Mattias,Filip,Gustav,Hugo,Lucas,Elias,William,Oscar,' +
      'Liam,Noah,Axel,Adam,Leo,Vincent,Albin,Melker,Sebastian,Marcus,Andreas,Pontus,Kristoffer,Jens,Johan,Henrik,Fredrik,' +
      'Olof,Anton,Linus,Joakim,Niklas,Samuel,Erik,Carl,Hampus,Rasmus,Jonathan,Ken,Mikael,Kalle,Dejan,Anthony,Yasin,Hugo,' +
      'Benjamin,Gabriel,Jacob,Sixten,Ture,Loke',
    'Johansson,Andersson,Karlsson,Nilsson,Eriksson,Larsson,Olsson,Persson,Svensson,Gustafsson,Pettersson,Jonsson,Jansson,' +
      'Hansson,Bengtsson,Jönsson,Lindberg,Jakobsson,Magnusson,Lindström,Olofsson,Lindqvist,Lindgren,Berg,Axelsson,' +
      'Bergström,Lundberg,Lind,Lundgren,Lundqvist,Mattsson,Berglund,Fredriksson,Sandberg,Henriksson,Forsberg,Sjöberg,Wallin,' +
      'Engström,Eklund,Danielsson,Lundin,Håkansson,Björk,Bergman,Gunnarsson,Holm,Samuelsson,Fransson,Wikström,Isaksson,' +
      'Claesson,Nyström,Holmberg,Arvidsson,Löfgren,Söderberg,Nyberg,Blomqvist,Gyökeres,Elanga,Kulusevski,Lindelöf,Ayari'),
    'Polônia': N('Robert,Piotr,Jakub,Kamil,Wojciech,Krzysztof,Arkadiusz,Przemysław,Bartosz,Mateusz,Karol,Sebastian,Jan,' +
      'Michał,Łukasz,Tomasz,Paweł,Marcin,Adam,Szymon,Kacper,Filip,Dawid,Damian,Grzegorz,Dominik,Hubert,Igor,Oskar,Antoni,' +
      'Aleksander,Wiktor,Maciej,Patryk,Rafał,Marek,Daniel,Artur,Kuba,Bartłomiej,Konrad,Mikołaj,Tymoteusz,Ignacy,Franciszek,' +
      'Stanisław,Nicola,Jakub,Krystian,Oliwer,Jan,Ksawery',
    'Nowak,Kowalski,Wiśniewski,Wójcik,Kowalczyk,Kamiński,Zieliński,Szymański,Woźniak,Dąbrowski,Kozłowski,Jankowski,Mazur,' +
      'Kwiatkowski,Krawczyk,Piotrowski,Grabowski,Nowakowski,Pawłowski,Michalski,Nowicki,Adamczyk,Dudek,Zając,Wieczorek,' +
      'Jabłoński,Król,Majewski,Olszewski,Jaworski,Wróbel,Malinowski,Pawlak,Witkowski,Walczak,Stępień,Górski,Rutkowski,' +
      'Michalak,Sikora,Ostrowski,Baran,Duda,Szewczyk,Tomaszewski,Pietrzak,Marciniak,Wróblewski,Zalewski,Jakubowski,Piątek,' +
      'Świderski,Bednarek,Kiwior,Frankowski,Bereszyński,Lewandowski,Moder,Skóraś,Urbański,Szczęsny'),
    'República Tcheca': N('Patrik,Tomáš,Vladimír,Adam,Lukáš,Jan,Jakub,Ondřej,David,Petr,Václav,Antonín,Matěj,Michal,Martin,' +
      'Pavel,Jiří,Josef,Filip,Vojtěch,Daniel,Marek,Radek,Ladislav,Aleš,Libor,Roman,Milan,Štěpán,Dominik,Matyáš,Šimon,Tobiáš,' +
      'Vít,Kryštof,Mikuláš,Denis,Robin,Hugo,Alex,Stanislav,Zdeněk,Karel,Jaroslav,Tadeáš,Mojmír,Lukas,Matej,Christophe,' +
      'Václav,Vasil,Pavel',
    'Novák,Svoboda,Novotný,Dvořák,Černý,Procházka,Kučera,Veselý,Horák,Němec,Pokorný,Marek,Pospíšil,Hájek,Jelínek,Král,' +
      'Růžička,Beneš,Fiala,Sedláček,Doležal,Zeman,Kolář,Navrátil,Čermák,Vaněk,Urban,Blažek,Kříž,Kovář,Kratochvíl,Bartoš,' +
      'Vlček,Polák,Musil,Kopecký,Šimek,Konečný,Malý,Holub,Štěpánek,Kadlec,Staněk,Souček,Coufal,Holeš,Barák,Kuchta,Hložek,' +
      'Provod,Krejčí,Zima,Jurásek,Sadílek,Lingr,Chytil,Schick,Černý,Vitík,Hranáč,Doudera,Kovář'),
    'Marrocos': N('Achraf,Hakim,Youssef,Sofyan,Azzedine,Nayef,Noussair,Abdelhamid,Bilal,Selim,Amine,Zakaria,Ilias,Abde,' +
      'Walid,Yassine,Munir,Brahim,Ayoub,Oussama,Soufiane,Hamza,Mehdi,Anass,Adam,Ismael,Karim,Mohamed,Rachid,Nabil,Hicham,' +
      'Jawad,Tarik,Ilyas,Othmane,Reda,Saad,Badr,Imran,Ayman,Marouane,Abdelkarim,Chadi,Khalid,Ismail,Anas,Eliesse,Amir,' +
      'Yahia,Driss,Mounir,Jamal,Houssine,Romain',
    'Benali,El Amrani,Alaoui,Idrissi,Bennani,Tazi,Berrada,Chraibi,El Idrissi,Benjelloun,Fassi,Ouahbi,Lahlou,Zaroury,' +
      'Ezzalzouli,Attiat-Allah,Dari,El Yamiq,Harit,Sabiri,Amallah,Benoun,Jabrane,Rahimi,Bouhaddouz,El Khannouss,Akhomach,' +
      'Chair,Hadraf,Belammari,Benchaouch,El Haddadi,Ben Seghir,Tissoudali,El Ouahdi,Moutaouakil,Zrida,Boussoufa,Taarabt,' +
      'Hajji,Kharja,Chamakh,Bahja,Hakimi,Ziyech,Amrabat,Mazraoui,Aguerd,Saïss,Ounahi,Boufal,Bounou,El Kaabi,En-Nesyri,' +
      'Diop,Brahimi,Belhanda,Saiss'),
    'Egito': N('Mohamed,Ahmed,Mahmoud,Omar,Mostafa,Emam,Marwan,Hamdi,Ramadan,Tarek,Karim,Akram,Hossam,Ali,Amr,Ayman,' +
      'Ibrahim,Hussein,Hany,Mohanad,Abdallah,Yasser,Walid,Hazem,Islam,Khaled,Saad,Sherif,Shady,Taher,Nasser,Rami,Youssef,' +
      'Ziad,Hamza,Adel,Essam,Wael,Ashraf,Emad,Osama,Hassan,Moamen,Seif,Belal,Zizo,Trezeguet,Kahraba,Afsha,Mido,Hamada,' +
      'Shikabala,Gamal,Abdelrahman',
    'Hegazi,Fathy,Hamdy,Ashour,Gaber,Hassan,Abdelmonem,Sobhi,Mostafa,Shobeir,El Shenawy,Kamal,Hany,Attia,Zalaka,Ibrahim,' +
      'Mahmoud,Abdelaziz,Fawzi,Said,Mansour,Ragab,Soliman,Farouk,Nabil,Samir,Ezzat,Fouad,Kandil,Morsi,Hosny,Tawfik,Gomaa,' +
      'Shehata,Abdelghani,Fathi,El Sayed,Abdelrahman,Hamed,Saber,Zaki,Lotfy,Rabia,Hegazy,Metwally,Afifi,Shawky,Salah,' +
      'Elneny,Marmoush,Trezeguet,Ghazal,Fotouh,El Shahat,Galal,Hamdi,Abdelkader'),
    'Austrália': N('Mathew,Jackson,Harry,Riley,Craig,Mitchell,Kye,Nathaniel,Connor,Martin,Jordan,Cameron,Jamie,Brandon,' +
      'Jason,Aaron,Mitch,Joel,Lachlan,Bailey,Liam,Jack,Noah,Oliver,William,Thomas,Cooper,Hayden,Josh,Ryan,Nick,Tom,Ben,Sam,' +
      'Lewis,Kai,Jai,Max,Tim,Tyson,Dylan,Zac,Callum,Angus,Archie,Fletcher,Patrick,Declan,Ajdin,Aziz,Awer,Garang,Nestory,' +
      'Alessandro,Marco,Denis,Keanu,Hamish',
    'Ryan,Irvine,Goodwin,McGree,Leckie,Duke,Souttar,Rowles,Behich,Atkinson,Maclaren,Boyle,Baccus,O\'Neill,Metcalfe,' +
      'Burgess,Circati,Jones,Smith,Williams,Brown,Wilson,Taylor,Johnson,White,Martin,Anderson,Thompson,Nguyen,Walker,Harris,' +
      'Lee,Robinson,Kelly,King,Davis,Wright,Evans,Roberts,Green,Hall,Wood,Jackson,Clarke,Patel,Murphy,Mitchell,Campbell,' +
      'Cooper,Hughes,Stewart,Kennedy,Russell,Sullivan,Kerr,Popovic,Kuol,Mabil,Hrustić,Mooy,Cahill,Kewell,Bos,Yengi,Italiano'),
  };

  const pick = (a, r) => a[Math.floor(r() * a.length)];
  const MAX = 18; // o campo do nome na criação aceita até 18 letras

  // Uma forma de nome brasileiro: mais gente com nome + sobrenome, mas apelido e diminutivo aparecem bastante
  function brazil(r) {
    const x = r();
    if (x < 0.34) return pick(BR.f, r) + ' ' + pick(BR.l, r);
    if (x < 0.44) return pick(BR.comp, r);
    if (x < 0.60) return pick(BR.dim, r);
    if (x < 0.70) return pick(BR.nick, r);
    if (x < 0.80) return pick(BR.short, r) + ' ' + pick(BR.l, r);
    if (x < 0.88) return pick(BR.f, r) + ' ' + pick(BR.tag, r);
    if (x < 0.94) return pick(BR.f, r) + ' ' + pick(BR.suf, r);
    return pick(BR.dim, r) + ' ' + pick(BR.tag, r);
  }

  // Nome sorteado para o país (r: sorteio de 0 a 1; Math.random se faltar). Sempre cabe no campo e não repete `avoid`.
  D.randomName = function (country, r, avoid) {
    r = r || Math.random;
    const n = D.NAMES[country] || BR;
    for (let i = 0; i < 30; i++) {
      const name = n === BR ? brazil(r) : n.surnameFirst ? pick(n.l, r) + ' ' + pick(n.f, r) : pick(n.f, r) + ' ' + pick(n.l, r);
      const w = name.split(' ');
      if (name.length <= MAX && name !== avoid && w[0] !== w[w.length - 1]) return name; // nada de "Hany Hany"
    }
    return pick(n.l, r);
  };
})(typeof window !== 'undefined' ? window : globalThis);
