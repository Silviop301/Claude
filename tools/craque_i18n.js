// Tradução do Climbix (versão em inglês para portais). O português continua sendo o texto-fonte:
// o código não muda; a versão traduzida troca, no pacote do portal, cada texto do código pela tradução
// guardada em craque/i18n/en.json ({ "texto em português": "English text" }).
//
// Uso (da raiz; precisa do typescript global para ler o JS: NODE_PATH=$(npm root -g)):
//   node tools/craque_i18n.js extract       → acrescenta ao en.json os textos novos (tradução vazia) e mostra quantos faltam
//   node tools/craque_i18n.js missing [n]   → lista n textos sem tradução, com arquivo e trecho
//   node tools/craque_i18n.js apply <pasta> → troca os textos nos .js de <pasta> (cópia do jogo feita pelo craque_portal.py)
//
// Que textos entram: literais com letras que tenham espaço, maiúscula ou acento (frases, nomes de tela), e os dois
// últimos argumentos de D.plural(n, 'gol', 'gols'). Palavras soltas em minúsculas (ids, classes, chaves) ficam de fora.
// A troca vale para todas as ocorrências do mesmo texto, então comparações entre textos continuam batendo.
// Partes ${...} de template ficam como estão; a tradução de um template guarda os mesmos ${} na mesma ordem.
const fs = require('fs'), path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'craque', 'src');
const DICT = process.env.I18N_DICT || path.join(ROOT, 'craque', 'i18n', 'en.json');
// Gerados ou sem texto para jogador
const SKIP = new Set(['kits.js', 'trophy-imgs.js', 'ball3d.js', 'kits-real.js', 'errors.js']);

const jsFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? jsFiles(p) : e.name.endsWith('.js') && !SKIP.has(e.name) ? [p] : [];
});

const textOf = s => s.replace(/<[^>]*>/g, ' ').replace(/\$\{[^}]*\}/g, ' ').replace(/&[a-z]+;/g, ' ');
function isDisplay(s) {
  const t = textOf(s);
  if (!/[A-Za-zÀ-ú]{2}/.test(t)) return false;
  if (/^\s*(https?:|data:|assets\/|badges\/|icons\/|src\/)/.test(s)) return false;
  if (/[À-ú]/.test(t)) return true;
  if (/\s/.test(s) && /[A-Za-z]{2}/.test(t) && !/^[a-z0-9 _-]+$/.test(s.trim()) || /^\s+[a-z]{2,}|[a-z]{2,}\s+$/.test(s)) return true; // pedaços de frase: ' anos', 'S/ GOL'
  if (/[A-Za-z]{2,}\s+[A-Za-z]/.test(t)) return true; // duas palavras
  return /^[^a-z]*[A-Z][a-zà-ú]/.test(t.trim()) && !/^[A-Z][A-Za-z0-9]*$/.test(s.trim()) ? true : /^[A-Z][a-zà-ú]+[!?.:]?$/.test(t.trim());
}

// Percorre um arquivo e devolve [{ start, end, raw, key }]: key é o texto (template com ${…} literais)
function literals(file) {
  const code = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const out = [];
  const pluralArg = n => {
    const p = n.parent;
    return p && ts.isCallExpression(p) && /(^|\.)plural$/.test(p.expression.getText(sf)) && p.arguments.indexOf(n) >= 1;
  };
  const visit = n => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const key = n.text;
      if (key && (isDisplay(key) || (pluralArg(n) && /[a-zà-ú]/.test(key))) && !(n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n)
        && !(n.parent && (ts.isImportDeclaration(n.parent) || ts.isElementAccessExpression(n.parent) && n.parent.argumentExpression === n)))
        out.push({ start: n.getStart(sf), end: n.getEnd(), key, tpl: ts.isNoSubstitutionTemplateLiteral(n) });
    } else if (ts.isTemplateExpression(n)) {
      const raw = code.slice(n.getStart(sf) + 1, n.getEnd() - 1);
      if (isDisplay(raw)) { out.push({ start: n.getStart(sf), end: n.getEnd(), key: raw, tpl: true, expr: true }); return; }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { code, out, sf };
}

const loadDict = () => (fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {});
const saveDict = d => { fs.mkdirSync(path.dirname(DICT), { recursive: true }); fs.writeFileSync(DICT, JSON.stringify(d, null, 1) + '\n'); };

function extract() {
  const d = loadDict(), seen = new Set();
  let added = 0;
  for (const f of jsFiles(SRC)) for (const l of literals(f).out) {
    seen.add(l.key);
    if (!(l.key in d)) { d[l.key] = ''; added++; }
  }
  const stale = Object.keys(d).filter(k => !seen.has(k));
  saveDict(d);
  const miss = Object.values(d).filter(v => !v).length;
  console.log(`${Object.keys(d).length} textos · ${added} novos · ${miss} sem tradução · ${stale.length} não estão mais no código`);
}

function missing(n) {
  const d = loadDict(), where = {};
  for (const f of jsFiles(SRC)) {
    const { code, out } = literals(f);
    for (const l of out) if (!d[l.key] && !where[l.key]) {
      const line = code.slice(0, l.start).split('\n').length;
      where[l.key] = path.relative(ROOT, f) + ':' + line;
    }
  }
  Object.keys(where).slice(0, n).forEach(k => console.log(where[k] + '\t' + JSON.stringify(k)));
}

// Literal JS equivalente ao texto traduzido, no mesmo tipo de aspas do original
function quote(s, tpl, expr, q) {
  if (tpl) return '`' + (expr ? s : s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')) + '`';
  const j = JSON.stringify(s);
  return q === "'" ? "'" + j.slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'") + "'" : j;
}

// Ajustes de código que não são texto: número com ponto, mi/mil → M/k, artigos do português (D.o, D.do...)
const CODE_EN = [[".replace('.', ',')", ''], [".replace(',0', '')", ".replace('.0', '')"], ["' mi'", "'M'"], ["' mil'", "'k'"], ["'pt-BR'", "'en-US'"]];
// Trechos de código que comparam com texto em português (regex) ou recortam artigos: [arquivo, de, para].
// Cada um precisa existir no arquivo (já com os textos traduzidos); se o código mudar, o apply avisa.
const FILE_EN = [
  ['data.js', "D.ATTR_LABEL = { rit: 'RIT', fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', fis: 'PHY' }", "D.ATTR_LABEL = { rit: 'PAC', fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', fis: 'PHY' }"],
  ['data.js', "D.GK_LABEL = { rit: 'VEL', fin: 'REF', pas: 'REP', dri: 'MAN', def: 'POS', fis: 'ELA' }", "D.GK_LABEL = { rit: 'SPD', fin: 'REF', pas: 'DIS', dri: 'HAN', def: 'POS', fis: 'DIV' }"],
  ['ui/offers.js', "'/sem'", "'/wk'"],
  ['card.js', "ctx.fillText(d.pos || 'MEI', 128, 232)", "ctx.fillText({ ATA: 'ST', MEI: 'CAM', ZAG: 'CB', GOL: 'GK' }[d.pos] || 'CAM', 128, 232)"],
  ['engine/stakes.js', '/lesão/.test(o.tag)', '/injury/.test(o.tag)'],
  ['engine/stakes.js', '/^lesão: perde (\\d+%) da temporada$/', '/^injury: misses (\\d+%) of the season$/'],
  ['ui/match.js', '/\\+|sobe|mais forte/', '/\\+|rises|stronger/'],
  ['ui/match.js', '/−|cai|lesão|mais fraco/', '/−|drops|injury|weaker/'],
  ['ui/social.js', '/última rodada|no detalhe/', '/final matchday|final day|finest of margins/'],
  ['ui/worldcup.js', "/^Grupo · (\\d)º jogo$/", "/^Group · Game (\\d)$/"],
  ['engine/season.js', '/é sua|é seu/', '/ is yours| are yours/'],
  ['engine/season.js', "'D' + D.do(club).slice(1)", "'From ' + club"],
  ['engine/season.js', "'D' + D.do(first.name).slice(1)", "'From ' + first.name"],
  ['engine/season.js', 'D.paraA(t).slice(5)', "'the ' + t"],
  ['ui/desktop.js', '/oque/.test(t)', '/[Tt]ap/.test(t)'],
  ['ui/desktop.js', "(cap ? 'Click' : 'clique') : (cap ? 'Tap' : 'toque')", "(cap ? 'Click' : 'click') : (cap ? 'Tap' : 'tap')"],
  ['ui/desktop.js', "[/\\bToque\\b/g, 'Click'],", "[/\\bTap\\b/g, 'Click'],"],
  ['ui/desktop.js', "[/\\btoque(?= (?:para|na tela|quando|numa|à (?:direita|esquerda)|de novo))/g, 'clique'],", "[/\\btap(?= (?:to|the screen|when|again|left|right|on))/g, 'click'],"],
  ['ui/desktop.js', "/\\b(Agora|primeiro|segundo|1º|2º|o) toque\\b(?! seu)/g", "/\\b(first|second|the) tap\\b/g"],
  ['ui/desktop.js', "/\\b([Dd])ois toques\\b/g, (m, d) => (d === 'D' ? 'Two' : 'dois')", "/\\b([Tt])wo taps\\b/g, (m, d) => (d === 'T' ? 'Two' : 'two')"],
];
const DATA_EN = `
;(function (D) { // versão em inglês: sem artigos do português
  D.o = D.O = n => n; D.do = n => 'of ' + n; D.no = n => 'at ' + n; D.pelo = n => 'for ' + n; D.ao = n => 'to ' + n;
  D.fem = () => false; D.da = n => 'of the ' + n; D.na = n => 'in the ' + n; D.paraA = n => 'to the ' + n;
})(typeof window !== 'undefined' ? window.CRAQUE_DATA : globalThis.CRAQUE_DATA);
`;

function apply(dir) {
  const d = loadDict();
  let done = 0, kept = 0;
  for (const f of jsFiles(path.join(dir, 'src'))) {
    const { code, out } = literals(f);
    let res = '', at = 0;
    for (const l of out) {
      const t = d[l.key];
      if (!t) { kept++; continue; }
      if (l.expr && (t.match(/\$\{[^}]*\}/g) || []).join() !== (l.key.match(/\$\{[^}]*\}/g) || []).join()) { kept++; continue; }
      res += code.slice(at, l.start) + quote(t, l.tpl, l.expr, code[l.start]); at = l.end; done++;
    }
    let outCode = res + code.slice(at);
    for (const [a, b] of CODE_EN) outCode = outCode.split(a).join(b);
    const rel = path.relative(path.join(dir, 'src'), f).split(path.sep).join('/');
    for (const [file, a, b] of FILE_EN) if (file === rel) {
      if (!outCode.includes(a)) { console.error('não achei em ' + file + ': ' + a); process.exitCode = 1; }
      outCode = outCode.split(a).join(b);
    }
    if (rel === 'data.js') outCode += DATA_EN;
    fs.writeFileSync(f, outCode);
  }
  console.log(`traduzidos ${done} · em português ${kept}`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'extract') extract();
else if (cmd === 'missing') missing(+arg || 50);
else if (cmd === 'apply' && arg) apply(arg);
else if (cmd !== 'export' && cmd !== 'import') console.log('uso: extract | missing [n] | apply <pasta> | export <pasta> [partes] | import <pasta>');

// export <pasta> <partes>: divide os textos sem tradução em partes com contexto (arquivo:linha e a linha do código),
// para traduzir em paralelo; cada parte vira <pasta>/parte-N.json = [{ k, at, ctx }]
if (cmd === 'export') {
  const [dir, parts] = [arg, +process.argv[4] || 8];
  const d = loadDict(), items = [], seen = new Set();
  for (const f of jsFiles(SRC)) {
    const { code, out } = literals(f), lines = code.split('\n');
    for (const l of out) if (!d[l.key] && !seen.has(l.key)) {
      seen.add(l.key);
      const ln = code.slice(0, l.start).split('\n').length;
      items.push({ k: l.key, at: path.relative(ROOT, f) + ':' + ln, ctx: lines[ln - 1].trim().slice(0, 300) });
    }
  }
  const total = items.reduce((a, i) => a + i.k.length, 0), per = total / parts;
  fs.mkdirSync(dir, { recursive: true });
  let n = 1, acc = 0, cur = [];
  for (const i of items) {
    cur.push(i); acc += i.k.length;
    if (acc >= per * n && n < parts) { fs.writeFileSync(path.join(dir, 'parte-' + n + '.json'), JSON.stringify(cur, null, 1)); n++; cur = []; }
  }
  fs.writeFileSync(path.join(dir, 'parte-' + n + '.json'), JSON.stringify(cur, null, 1));
  console.log(items.length + ' textos em ' + n + ' partes');
}
// import <pasta>: junta <pasta>/traduzido-*.json ({ pt: en }) no en.json
if (cmd === 'import') {
  const d = loadDict(); let n = 0;
  for (const f of fs.readdirSync(arg).filter(x => /^traduzido-.*\.json$/.test(x))) {
    const t = JSON.parse(fs.readFileSync(path.join(arg, f), 'utf8'));
    for (const [k, v] of Object.entries(t)) if (k in d && typeof v === 'string' && v) { d[k] = v; n++; }
  }
  saveDict(d); console.log(n + ' traduções importadas');
}
