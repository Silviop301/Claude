// Baixa do Twemoji (github.com/jdecked/twemoji, assets/svg) só os emojis usados no jogo, para craque/assets/tw/.
// Varre craque/src e craque/index.html atrás de emojis; apaga os SVGs que deixaram de ser usados.
// Uso: node tools/craque_twemoji.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', 'craque'), OUT = path.join(ROOT, 'assets', 'tw');
const BASE = 'https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg/';

// Mesma regra do jogo (src/ui/core.js): bandeiras (par de letras regionais), bandeiras com tags (Inglaterra, Escócia…),
// teclas (#️⃣), e emojis coloridos (com ou sem modificador de pele e sequências com ZWJ)
const RE = /(?:\u{1F3F4}[\u{E0020}-\u{E007F}]+|\p{Regional_Indicator}{2}|[#*0-9]️?⃣|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️)\p{Emoji_Modifier}?(?:‍(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️?)\p{Emoji_Modifier}?)*)/gu;
// Nome do arquivo no Twemoji: codepoints em hexa separados por "-", sem o fe0f (exceto em sequências com ZWJ)
const twCode = e => [...(e.includes('‍') ? e : e.replace(/️/g, ''))].map(c => c.codePointAt(0).toString(16)).join('-');

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.js$/.test(f)) files.push(p); } })(path.join(ROOT, 'src'));
files.push(path.join(ROOT, 'index.html'));
const used = new Map();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(RE)) used.set(twCode(m[0]), m[0]);

fs.mkdirSync(OUT, { recursive: true });
const have = new Set(fs.readdirSync(OUT).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)));
let got = 0; const missing = [];
for (const [code, e] of used) {
  if (have.has(code)) continue;
  try { execFileSync('curl', ['-sfL', '-o', path.join(OUT, code + '.svg'), BASE + code + '.svg']); got++; }
  catch (er) { missing.push(e + ' ' + code); try { fs.unlinkSync(path.join(OUT, code + '.svg')); } catch (x) { /* nada */ } }
}
let removed = 0;
for (const code of have) if (!used.has(code)) { fs.unlinkSync(path.join(OUT, code + '.svg')); removed++; }
console.log('emojis usados: ' + used.size + ' · baixados agora: ' + got + ' · removidos: ' + removed + (missing.length ? ' · SEM ARQUIVO NO TWEMOJI: ' + missing.join(', ') : ''));
