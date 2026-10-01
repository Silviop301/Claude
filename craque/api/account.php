<?php
// Contas do Climbix: usuário e senha para guardar o jogo na nuvem e continuar em outro aparelho.
// Mesmo banco do ranking (fora do public_html). A senha fica só como hash (password_hash);
// a sessão é um token aleatório que o aparelho guarda (no banco fica só o sha256 dele).
//   POST ?a=register {user, pass, pid}   cria a conta (o usuário vira o nome no ranking)
//   POST ?a=login    {user, pass}        entra; devolve token, pid do ranking e o save da nuvem
//   POST ?a=pull     {token}             save da nuvem
//   POST ?a=push     {token, data}       grava o save da nuvem
//   POST ?a=logout   {token}             encerra a sessão deste aparelho
// Google, GitHub e Discord (o login começa em oauth.php e volta ao jogo com um código):
//   POST ?a=oauth    {code, verifier, token?}  entra (ou, com token, liga o serviço à conta já aberta).
//                                              Serviço ainda sem conta: {pending}, e o aparelho escolhe entre
//   POST ?a=register {user, pid, link, verifier}        criar conta nova (sem senha) ligada ao serviço, ou
//   POST ?a=login    {user, pass, link, verifier}       entrar na conta que já existe e ligar o serviço a ela
//   POST ?a=unlink   {token, provider}                  desliga um serviço da conta
//   POST ?a=setpass  {token, pass, old?}                cria/troca a senha. Sem a atual só quando a sessão
//                                                       entrou por um serviço ligado à conta (recuperação de senha)
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
  // Google/GitHub/Discord ligados a cada conta (um de cada serviço por conta)
  $db->exec('CREATE TABLE IF NOT EXISTS identities (provider TEXT, subject TEXT, user_key TEXT, label TEXT, created INTEGER, PRIMARY KEY (provider, subject))');
  $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS identities_user ON identities(user_key, provider)');
  $db->exec('CREATE TABLE IF NOT EXISTS oauth_flows (state TEXT PRIMARY KEY, provider TEXT, verifier TEXT, back TEXT, code TEXT,
    subject TEXT, label TEXT, name TEXT, created INTEGER, done INTEGER DEFAULT 0)');
  // Por onde a sessão entrou (null = senha): quem entrou pelo Google pode criar senha nova sem a antiga
  if (!in_array('via', $db->query('PRAGMA table_info(sessions)')->fetchAll(PDO::FETCH_COLUMN, 1), true)) $db->exec('ALTER TABLE sessions ADD COLUMN via TEXT');
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
function newSession($db, $userKey, $via = null) {
  $token = bin2hex(random_bytes(32));
  $db->prepare('INSERT INTO sessions (token_hash, user_key, created, seen, via) VALUES (?, ?, ?, ?, ?)')->execute([hash('sha256', $token), $userKey, time(), time(), $via]);
  return $token;
}
function account($db, $userKey) {
  $q = $db->prepare('SELECT a.user, a.pid, a.hash, p.nick FROM accounts a LEFT JOIN players p ON p.pid = a.pid WHERE a.user_key = ?'); $q->execute([$userKey]);
  return $q->fetch(PDO::FETCH_ASSOC);
}
function links($db, $userKey) {
  $q = $db->prepare('SELECT provider AS p, label FROM identities WHERE user_key = ? ORDER BY created, rowid'); $q->execute([$userKey]);
  return $q->fetchAll(PDO::FETCH_ASSOC);
}
// A sessão entrou por um serviço que continua ligado à conta?
function viaLinked($links, $via) { return $via !== null && in_array($via, array_column($links, 'p'), true); }
// O que o aparelho sabe da conta: nome, formas de entrar e se trocar a senha pede a atual
function info($db, $userKey, $via = null) {
  $acc = account($db, $userKey); $ln = links($db, $userKey);
  return ['user' => $acc['user'], 'pid' => $acc['pid'], 'nick' => $acc['nick'] ?: $acc['user'], 'links' => $ln,
    'pass' => !empty($acc['hash']), 'needold' => !empty($acc['hash']) && !viaLinked($ln, $via)];
}
// Resposta de entrar/sincronizar: conta + save da nuvem
function accountOut($db, $userKey, $extra = [], $via = null) {
  $sv = saveOf($db, $userKey);
  out(['ok' => true] + $extra + info($db, $userKey, $via) + ['save' => $sv['data'], 'updated' => $sv['updated']]);
}
function saveOf($db, $userKey) {
  $q = $db->prepare('SELECT data, updated FROM saves WHERE user_key = ?'); $q->execute([$userKey]);
  $r = $q->fetch(PDO::FETCH_ASSOC);
  return $r ? ['data' => json_decode($r['data'], true), 'updated' => (int)$r['updated']] : ['data' => null, 'updated' => 0];
}
// [conta, por onde entrou] da sessão
function session($db, $token) {
  if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) out(['error' => 'auth'], 401);
  $q = $db->prepare('SELECT user_key, via FROM sessions WHERE token_hash = ?'); $q->execute([hash('sha256', $token)]);
  $r = $q->fetch(PDO::FETCH_ASSOC);
  if (!$r) out(['error' => 'auth'], 401);
  $db->prepare('UPDATE sessions SET seen = ? WHERE token_hash = ?')->execute([time(), hash('sha256', $token)]);
  return [$r['user_key'], $r['via']];
}
function bySession($db, $token) { return session($db, $token)[0]; }

// ---------- Google, GitHub e Discord ----------
// Login que voltou a este aparelho: o código da URL só vale com o verifier que ficou guardado nele
function flow($db, $in, $field = 'code') {
  $c = $in[$field] ?? ''; $v = $in['verifier'] ?? '';
  if (!is_string($c) || !preg_match('/^[a-f0-9]{48}$/', $c) || !is_string($v) || $v === '') out(['error' => 'oauth_expired'], 410);
  $q = $db->prepare('SELECT * FROM oauth_flows WHERE code = ? AND created > ?'); $q->execute([hash('sha256', $c), time() - 900]);
  $f = $q->fetch(PDO::FETCH_ASSOC);
  if (!$f || !hash_equals($f['verifier'], hash('sha256', $v))) out(['error' => 'oauth_expired'], 410);
  return $f;
}
function identityOwner($db, $f) {
  $q = $db->prepare('SELECT user_key FROM identities WHERE provider = ? AND subject = ?'); $q->execute([$f['provider'], $f['subject']]);
  return $q->fetchColumn();
}
// Liga o serviço à conta e gasta o código
function linkIdentity($db, $f, $userKey) {
  $owner = identityOwner($db, $f);
  if ($owner && $owner !== $userKey) out(['error' => 'oauth_taken'], 409);
  if (!$owner) {
    $q = $db->prepare('SELECT 1 FROM identities WHERE user_key = ? AND provider = ?'); $q->execute([$userKey, $f['provider']]);
    if ($q->fetchColumn()) out(['error' => 'oauth_other'], 409);
    $db->prepare('INSERT INTO identities (provider, subject, user_key, label, created) VALUES (?, ?, ?, ?, ?)')->execute([$f['provider'], $f['subject'], $userKey, $f['label'], time()]);
  }
  $db->prepare('UPDATE oauth_flows SET code = NULL WHERE state = ?')->execute([$f['state']]);
}
// Sugestão de usuário a partir do nome no serviço (livre como usuário e como nome no ranking)
function suggest($db, $name) {
  $s = mb_substr(preg_replace('/[^\p{L}\p{N}_.\-]/u', '', (string)$name), 0, 16, 'UTF-8');
  if (mb_strlen($s, 'UTF-8') < 3) return '';
  for ($i = 0; $i < 12; $i++) {
    $try = $i ? mb_substr($s, 0, 14, 'UTF-8') . random_int(10, 99) : $s;
    $k = mb_strtolower($try, 'UTF-8');
    $q = $db->prepare('SELECT (SELECT 1 FROM accounts WHERE user_key = ?) OR (SELECT 1 FROM players WHERE nick_key = ?)'); $q->execute([$k, $k]);
    if (!$q->fetchColumn()) return $try;
  }
  return '';
}
$ip = 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? '?');

if ($a === 'register') {
  $user = cleanUser($in['user'] ?? '');
  $pass = (string)($in['pass'] ?? '');
  $pid = $in['pid'] ?? '';
  // Conta criada com Google/GitHub/Discord: a senha é opcional
  $f = isset($in['link']) ? flow($db, $in, 'link') : null;
  if (!$user) out(['error' => 'user_invalid'], 400);
  if ((!$f || $pass !== '') && (strlen($pass) < 6 || strlen($pass) > 200)) out(['error' => 'pass_short'], 400);
  if (!preg_match('/^[a-f0-9]{16,32}$/', $pid)) out(['error' => 'bad'], 400);
  if (limited($db, [$ip])) out(['error' => 'limit'], 429);
  if ($f && identityOwner($db, $f)) out(['error' => 'oauth_taken'], 409);
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
  $db->prepare('INSERT INTO accounts (user_key, user, hash, pid, created) VALUES (?, ?, ?, ?, ?)')->execute([$key, $user, $pass !== '' ? password_hash($pass, PASSWORD_DEFAULT) : null, $pid, time()]);
  $db->prepare('INSERT OR IGNORE INTO players (pid, created) VALUES (?, ?)')->execute([$pid, time()]);
  $db->prepare('UPDATE players SET nick = ?, nick_key = ? WHERE pid = ?')->execute([$user, $key, $pid]);
  if ($f) linkIdentity($db, $f, $key);
  $db->commit();
  $via = $f ? $f['provider'] : null;
  accountOut($db, $key, ['token' => newSession($db, $key, $via)], $via);
}

if ($a === 'login') {
  $user = cleanUser($in['user'] ?? '');
  $pass = (string)($in['pass'] ?? '');
  // Entrar e já ligar o Google/GitHub/Discord que acabou de voltar sem conta
  $f = isset($in['link']) ? flow($db, $in, 'link') : null;
  if (!$user) out(['error' => 'wrong'], 401);
  $key = mb_strtolower($user, 'UTF-8');
  if (limited($db, ['u:' . $key, $ip])) out(['error' => 'limit'], 429);
  $q = $db->prepare('SELECT hash FROM accounts WHERE user_key = ?'); $q->execute([$key]);
  $hash = $q->fetchColumn();
  if (!$hash || !password_verify($pass, $hash)) { failed($db, ['u:' . $key, $ip]); out(['error' => 'wrong'], 401); }
  if (password_needs_rehash($hash, PASSWORD_DEFAULT)) $db->prepare('UPDATE accounts SET hash = ? WHERE user_key = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $key]);
  $db->prepare('DELETE FROM attempts WHERE k = ?')->execute(['u:' . $key]);
  if ($f) linkIdentity($db, $f, $key);
  accountOut($db, $key, ['token' => newSession($db, $key)]);
}

if ($a === 'pull') {
  [$key, $via] = session($db, $in['token'] ?? '');
  accountOut($db, $key, [], $via);
}

if ($a === 'oauth') {
  $f = flow($db, $in);
  // Já está numa conta neste aparelho: liga o serviço a ela
  if (isset($in['token'])) {
    [$key, $via] = session($db, $in['token']);
    linkIdentity($db, $f, $key);
    out(['ok' => true, 'linked' => $f['provider']] + info($db, $key, $via));
  }
  $owner = identityOwner($db, $f);
  if ($owner) {
    $db->prepare('UPDATE oauth_flows SET code = NULL WHERE state = ?')->execute([$f['state']]);
    accountOut($db, $owner, ['token' => newSession($db, $owner, $f['provider'])], $f['provider']);
  }
  // Primeira vez com esse serviço: o aparelho pergunta se cria conta nova ou liga a uma que já existe
  out(['pending' => true, 'provider' => $f['provider'], 'label' => $f['label'], 'suggest' => suggest($db, $f['name'])]);
}

if ($a === 'unlink') {
  [$key, $via] = session($db, $in['token'] ?? '');
  $acc = account($db, $key);
  // Sem senha, a última forma de entrar não pode sair (a conta ficaria trancada)
  if (empty($acc['hash']) && count(links($db, $key)) <= 1) out(['error' => 'last_login'], 409);
  $db->prepare('DELETE FROM identities WHERE user_key = ? AND provider = ?')->execute([$key, (string)($in['provider'] ?? '')]);
  out(['ok' => true] + info($db, $key, $via));
}

if ($a === 'setpass') {
  [$key, $via] = session($db, $in['token'] ?? '');
  $pass = (string)($in['pass'] ?? '');
  if (strlen($pass) < 6 || strlen($pass) > 200) out(['error' => 'pass_short'], 400);
  $acc = account($db, $key);
  if (!empty($acc['hash'])) {
    if (!viaLinked(links($db, $key), $via)) {
      if (limited($db, ['u:' . $key, $ip])) out(['error' => 'limit'], 429);
      if (!password_verify((string)($in['old'] ?? ''), $acc['hash'])) { failed($db, ['u:' . $key, $ip]); out(['error' => 'wrong'], 401); }
    }
    // Senha trocada: os outros aparelhos precisam entrar de novo
    $db->prepare('DELETE FROM sessions WHERE user_key = ? AND token_hash != ?')->execute([$key, hash('sha256', $in['token'])]);
  }
  $db->prepare('UPDATE accounts SET hash = ? WHERE user_key = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $key]);
  out(['ok' => true] + info($db, $key, $via));
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
