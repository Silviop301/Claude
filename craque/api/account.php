<?php
// Contas do Climbix: usuário e senha para guardar o jogo na nuvem e continuar em outro aparelho.
// Mesmo banco do ranking (fora do public_html). A senha fica só como hash (password_hash);
// a sessão é um token aleatório que o aparelho guarda (no banco fica só o sha256 dele).
//   POST ?a=register {user, pass, pid}   cria a conta (o usuário vira o nome no ranking)
//   POST ?a=login    {user, pass}        entra; devolve token, pid do ranking e o save da nuvem
//   POST ?a=pull     {token}             save da nuvem
//   POST ?a=push     {token, data}       grava o save da nuvem
//   POST ?a=logout   {token}             encerra a sessão deste aparelho
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) out(['error' => 'storage'], 500);
try {
  $db = new PDO('sqlite:' . $dir . '/rank.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS players (pid TEXT PRIMARY KEY, nick TEXT, nick_key TEXT UNIQUE, created INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS accounts (user_key TEXT PRIMARY KEY, user TEXT, hash TEXT, pid TEXT, created INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_key TEXT, created INTEGER, seen INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS saves (user_key TEXT PRIMARY KEY, data TEXT, updated INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS attempts (k TEXT PRIMARY KEY, n INTEGER, first INTEGER)');
} catch (Exception $e) { out(['error' => 'db'], 500); }

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) out(['error' => 'bad'], 400);
$a = $_GET['a'] ?? '';
$MAX = 2 * 1024 * 1024; // tamanho máximo do save (coleção grande cabe folgado)

function cleanUser($s) {
  $s = trim((string)$s);
  if (!preg_match('/^[\p{L}\p{N}_.\-]{3,16}$/u', $s)) return null;
  return $s;
}
// Limite de tentativas erradas a cada 15 minutos (por usuário e por IP)
function limited($db, $keys) {
  $now = time();
  foreach ($keys as $k) {
    $q = $db->prepare('SELECT n, first FROM attempts WHERE k = ?'); $q->execute([$k]);
    $r = $q->fetch(PDO::FETCH_ASSOC);
    // Por usuário: 10 erros; por IP (casa com vários jogadores no mesmo wi-fi): 40
    if ($r && $now - $r['first'] < 900 && $r['n'] >= (strpos($k, 'ip:') === 0 ? 40 : 10)) return true;
  }
  return false;
}
function failed($db, $keys) {
  $now = time();
  foreach ($keys as $k) {
    $db->prepare('INSERT INTO attempts (k, n, first) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET
      n = CASE WHEN ? - attempts.first >= 900 THEN 1 ELSE attempts.n + 1 END,
      first = CASE WHEN ? - attempts.first >= 900 THEN ? ELSE attempts.first END')->execute([$k, $now, $now, $now, $now]);
  }
}
function newSession($db, $userKey) {
  $token = bin2hex(random_bytes(32));
  $db->prepare('INSERT INTO sessions (token_hash, user_key, created, seen) VALUES (?, ?, ?, ?)')->execute([hash('sha256', $token), $userKey, time(), time()]);
  return $token;
}
function account($db, $userKey) {
  $q = $db->prepare('SELECT a.user, a.pid, p.nick FROM accounts a LEFT JOIN players p ON p.pid = a.pid WHERE a.user_key = ?'); $q->execute([$userKey]);
  return $q->fetch(PDO::FETCH_ASSOC);
}
function saveOf($db, $userKey) {
  $q = $db->prepare('SELECT data, updated FROM saves WHERE user_key = ?'); $q->execute([$userKey]);
  $r = $q->fetch(PDO::FETCH_ASSOC);
  return $r ? ['data' => json_decode($r['data'], true), 'updated' => (int)$r['updated']] : ['data' => null, 'updated' => 0];
}
function bySession($db, $token) {
  if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) out(['error' => 'auth'], 401);
  $q = $db->prepare('SELECT user_key FROM sessions WHERE token_hash = ?'); $q->execute([hash('sha256', $token)]);
  $k = $q->fetchColumn();
  if (!$k) out(['error' => 'auth'], 401);
  $db->prepare('UPDATE sessions SET seen = ? WHERE token_hash = ?')->execute([time(), hash('sha256', $token)]);
  return $k;
}
$ip = 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? '?');

if ($a === 'register') {
  $user = cleanUser($in['user'] ?? '');
  $pass = (string)($in['pass'] ?? '');
  $pid = $in['pid'] ?? '';
  if (!$user) out(['error' => 'user_invalid'], 400);
  if (strlen($pass) < 6 || strlen($pass) > 200) out(['error' => 'pass_short'], 400);
  if (!preg_match('/^[a-f0-9]{16,32}$/', $pid)) out(['error' => 'bad'], 400);
  if (limited($db, [$ip])) out(['error' => 'limit'], 429);
  $key = mb_strtolower($user, 'UTF-8');
  $q = $db->prepare('SELECT 1 FROM accounts WHERE user_key = ?'); $q->execute([$key]);
  if ($q->fetchColumn()) { failed($db, [$ip]); out(['error' => 'user_taken'], 409); }
  // O usuário vira o nome no ranking: não pode ser o nome de outro jogador
  $q = $db->prepare('SELECT pid FROM players WHERE nick_key = ?'); $q->execute([$key]);
  $owner = $q->fetchColumn();
  if ($owner && $owner !== $pid) out(['error' => 'user_taken'], 409);
  // Este aparelho já é de outra conta? Então a conta nova ganha um id de ranking próprio
  $q = $db->prepare('SELECT 1 FROM accounts WHERE pid = ?'); $q->execute([$pid]);
  if ($q->fetchColumn()) $pid = bin2hex(random_bytes(12));
  $db->beginTransaction();
  $db->prepare('INSERT INTO accounts (user_key, user, hash, pid, created) VALUES (?, ?, ?, ?, ?)')->execute([$key, $user, password_hash($pass, PASSWORD_DEFAULT), $pid, time()]);
  $db->prepare('INSERT OR IGNORE INTO players (pid, created) VALUES (?, ?)')->execute([$pid, time()]);
  $db->prepare('UPDATE players SET nick = ?, nick_key = ? WHERE pid = ?')->execute([$user, $key, $pid]);
  $db->commit();
  out(['ok' => true, 'token' => newSession($db, $key), 'user' => $user, 'pid' => $pid, 'nick' => $user, 'save' => null, 'updated' => 0]);
}

if ($a === 'login') {
  $user = cleanUser($in['user'] ?? '');
  $pass = (string)($in['pass'] ?? '');
  if (!$user) out(['error' => 'wrong'], 401);
  $key = mb_strtolower($user, 'UTF-8');
  if (limited($db, ['u:' . $key, $ip])) out(['error' => 'limit'], 429);
  $q = $db->prepare('SELECT hash FROM accounts WHERE user_key = ?'); $q->execute([$key]);
  $hash = $q->fetchColumn();
  if (!$hash || !password_verify($pass, $hash)) { failed($db, ['u:' . $key, $ip]); out(['error' => 'wrong'], 401); }
  if (password_needs_rehash($hash, PASSWORD_DEFAULT)) $db->prepare('UPDATE accounts SET hash = ? WHERE user_key = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $key]);
  $db->prepare('DELETE FROM attempts WHERE k = ?')->execute(['u:' . $key]);
  $acc = account($db, $key); $sv = saveOf($db, $key);
  out(['ok' => true, 'token' => newSession($db, $key), 'user' => $acc['user'], 'pid' => $acc['pid'], 'nick' => $acc['nick'] ?: $acc['user'], 'save' => $sv['data'], 'updated' => $sv['updated']]);
}

if ($a === 'pull') {
  $key = bySession($db, $in['token'] ?? '');
  $acc = account($db, $key); $sv = saveOf($db, $key);
  out(['ok' => true, 'user' => $acc['user'], 'pid' => $acc['pid'], 'nick' => $acc['nick'] ?: $acc['user'], 'save' => $sv['data'], 'updated' => $sv['updated']]);
}

if ($a === 'push') {
  $key = bySession($db, $in['token'] ?? '');
  if (!is_array($in['data'] ?? null)) out(['error' => 'bad'], 400);
  $data = json_encode($in['data'], JSON_UNESCAPED_UNICODE);
  if (strlen($data) > $MAX) out(['error' => 'too_big'], 413);
  $now = time();
  $db->prepare('INSERT INTO saves (user_key, data, updated) VALUES (?, ?, ?) ON CONFLICT(user_key) DO UPDATE SET data = excluded.data, updated = excluded.updated')->execute([$key, $data, $now]);
  out(['ok' => true, 'updated' => $now]);
}

if ($a === 'logout') {
  $t = $in['token'] ?? '';
  if (is_string($t)) $db->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', $t)]);
  out(['ok' => true]);
}

out(['error' => 'unknown'], 404);
