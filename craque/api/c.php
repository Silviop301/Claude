<?php
// Link curto da carta: guarda a carta compartilhada (o mesmo texto que ia no link longo ?c=...) e devolve um id de 7 letras.
// A mesma carta gera sempre o mesmo id. Banco SQLite FORA do public_html, como o ranking e os erros. Nada pessoal: só a carta.
//   POST ?a=put  {d: "<carta codificada>"}   → {id}
//   GET  ?a=get&id=xxxxxxx                    → {d}
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) out(['error' => 'storage'], 500);
try {
  $db = new PDO('sqlite:' . $dir . '/cards.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, d TEXT, at INTEGER, hits INTEGER DEFAULT 0)');
} catch (Exception $e) { out(['error' => 'db'], 500); }

// id de 7 caracteres (letras e números) tirado do hash da carta
function idOf($d, $salt = '') {
  $abc = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  $h = hash('sha256', $d . $salt, true); $id = '';
  for ($i = 0; $i < 7; $i++) $id .= $abc[ord($h[$i]) % strlen($abc)];
  return $id;
}

$a = $_GET['a'] ?? '';

if ($a === 'put') {
  header('Cache-Control: no-store');
  $raw = file_get_contents('php://input');
  if (strlen($raw) > 9000) out(['error' => 'big'], 413);
  $in = json_decode($raw, true);
  $d = is_array($in) ? (string)($in['d'] ?? '') : '';
  if ($d === '' || strlen($d) > 8000 || !preg_match('/^[A-Za-z0-9_-]+$/', $d)) out(['error' => 'bad'], 400);
  // Mesmo id para a mesma carta; se outra carta já usa o id (raríssimo), tenta outro
  for ($k = 0; $k < 5; $k++) {
    $id = idOf($d, $k ? (string)$k : '');
    $q = $db->prepare('SELECT d FROM cards WHERE id = ?'); $q->execute([$id]);
    $have = $q->fetchColumn();
    if ($have === false) { $db->prepare('INSERT INTO cards (id, d, at) VALUES (?,?,?)')->execute([$id, $d, time()]); out(['id' => $id]); }
    if ($have === $d) out(['id' => $id]);
  }
  out(['error' => 'busy'], 500);
}

if ($a === 'get') {
  $id = $_GET['id'] ?? '';
  if (!preg_match('/^[0-9A-Za-z]{7}$/', $id)) out(['error' => 'bad'], 400);
  $q = $db->prepare('SELECT d FROM cards WHERE id = ?'); $q->execute([$id]);
  $d = $q->fetchColumn();
  if ($d === false) out(['error' => 'missing'], 404);
  $db->prepare('UPDATE cards SET hits = hits + 1 WHERE id = ?')->execute([$id]);
  header('Cache-Control: public, max-age=86400');
  out(['d' => $d]);
}

out(['error' => 'action'], 400);
