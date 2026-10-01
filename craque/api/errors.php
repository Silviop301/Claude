<?php
// Erros do jogo nos aparelhos dos jogadores (src/errors.js), agrupados por mensagem + arquivo + linha.
// Banco SQLite FORA do public_html, como o ranking. Nada pessoal: mensagem, arquivo, linha, versão do jogo,
// tela em que estava e o tipo de navegador (sem nome, conta ou IP).
//   POST ?a=log  {msg, src, line, col, stack, ver, step, ua}   registra (ou soma +1 no mesmo erro)
//   GET  ?a=list[&ver=xxxxxxxx]                               erros mais recentes, com contagem
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
date_default_timezone_set('America/Sao_Paulo');

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) out(['error' => 'storage'], 500);
try {
  $db = new PDO('sqlite:' . $dir . '/errors.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS errors (id TEXT PRIMARY KEY, msg TEXT, src TEXT, line INTEGER, col INTEGER, stack TEXT,
    ver TEXT, step TEXT, ua TEXT, n INTEGER, first INTEGER, last INTEGER)');
  $db->exec('CREATE INDEX IF NOT EXISTS errors_last ON errors(last)');
} catch (Exception $e) { out(['error' => 'db'], 500); }

$a = $_GET['a'] ?? '';
$str = fn($v, $n) => mb_substr(trim(preg_replace('/\s+/u', ' ', (string)$v)), 0, $n, 'UTF-8');

if ($a === 'log') {
  $raw = file_get_contents('php://input');
  if (strlen($raw) > 8000) out(['error' => 'big'], 413);
  $in = json_decode($raw, true);
  if (!is_array($in) || empty($in['msg'])) out(['error' => 'bad'], 400);
  $msg = $str($in['msg'], 300);
  // Só o caminho do arquivo do jogo (sem domínio nem ?v=)
  $src = $str(preg_replace('/^https?:\/\/[^\/]+\/|\?.*$/', '', (string)($in['src'] ?? '')), 120);
  $line = max(0, min(1000000, (int)($in['line'] ?? 0)));
  $col = max(0, min(1000000, (int)($in['col'] ?? 0)));
  $stack = mb_substr(preg_replace('/https?:\/\/[^\/\s]+\//', '', (string)($in['stack'] ?? '')), 0, 1500, 'UTF-8');
  $ver = preg_match('/^[a-f0-9]{8}$/', $in['ver'] ?? '') ? $in['ver'] : '';
  $step = $str($in['step'] ?? '', 30);
  $ua = $str($in['ua'] ?? '', 60);
  $id = substr(sha1($msg . '|' . $src . '|' . $line), 0, 16);
  // Limite: no máximo 2000 erros diferentes guardados (os mais antigos saem)
  $db->prepare('INSERT INTO errors (id, msg, src, line, col, stack, ver, step, ua, n, first, last) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET n = errors.n + 1, last = excluded.last, ver = excluded.ver, step = excluded.step, ua = excluded.ua,
      stack = CASE WHEN length(excluded.stack) > 0 THEN excluded.stack ELSE errors.stack END')
    ->execute([$id, $msg, $src, $line, $col, $stack, $ver, $step, $ua, time(), time()]);
  if (random_int(1, 50) === 1) $db->exec('DELETE FROM errors WHERE id NOT IN (SELECT id FROM errors ORDER BY last DESC LIMIT 2000)');
  out(['ok' => true]);
}

if ($a === 'list') {
  $ver = preg_match('/^[a-f0-9]{8}$/', $_GET['ver'] ?? '') ? $_GET['ver'] : null;
  $q = $db->prepare('SELECT msg, src, line, col, stack, ver, step, ua, n, first, last FROM errors' . ($ver ? ' WHERE ver = ?' : '') . ' ORDER BY last DESC LIMIT 200');
  $q->execute($ver ? [$ver] : []);
  $rows = $q->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as &$r) { $r['first'] = date('Y-m-d H:i', $r['first']); $r['last'] = date('Y-m-d H:i', $r['last']); }
  out(['errors' => $rows]);
}

out(['error' => 'action'], 400);
