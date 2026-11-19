// Ponto de entrada do motor para o Node (simulador e testes): carrega todas as partes.
// No navegador, o index.html carrega engine/*.js diretamente, nesta mesma ordem.
const D = require('./data.js');
globalThis.CRAQUE_DATA = globalThis.CRAQUE_DATA || D;
require('./names.js'); // nomes sorteados (as pessoas do celular no Jogo a Jogo)
const S = require('./engine/core.js');
['liga', 'coach', 'coachfin', 'coachmkt', 'coachworld', 'coachest', 'coachpress', 'coachcup', 'coachcont'].forEach(part => require('./engine/' + part + '.js'));
module.exports = S;
