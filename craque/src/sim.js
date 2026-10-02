// Ponto de entrada do motor para o Node (simulador e testes): carrega todas as partes.
// No navegador, o index.html carrega engine/*.js diretamente, nesta mesma ordem.
const D = require('./data.js');
globalThis.CRAQUE_DATA = globalThis.CRAQUE_DATA || D;
const S = require('./engine/core.js');
['events', 'events2', 'events3', 'moments', 'worldcup', 'season', 'market', 'finish', 'achievements'].forEach(part => require('./engine/' + part + '.js'));
module.exports = S;
