<?php
// Entrar com Google, GitHub ou Discord (OAuth 2.0) nas contas do Climbix.
// As chaves de cada serviço ficam FORA do public_html, em climbix-data/oauth.json (o deploy grava a partir
// dos segredos do GitHub). Só aparecem no jogo os serviços configurados:
//   {"google": {"id": "...", "secret": "..."}, "github": {...}, "discord": {...}}
// Endereço de retorno para cadastrar em cada serviço: https://climbix.app/api/oauth.php
//   GET  ?a=providers                          serviços configurados
//   POST ?a=start {provider, back, verifier}   endereço do serviço para o aparelho abrir
//   GET  ?state=&code=  (retorno do serviço)   guarda quem entrou e volta ao jogo com #climbix-oauth=<código>
// O código de volta só vale junto com o "verifier", que fica guardado no aparelho que começou o login
// (account.php?a=oauth): um link de retorno aberto em outro aparelho não entra em conta nenhuma.
header('Cache-Control: no-store');
date_default_timezone_set('America/Sao_Paulo');

function out($data, $code = 200) {
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;
}
// Página simples quando não dá para voltar ao jogo (retorno vencido ou repetido)
function page($msg) {
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Climbix</title>' .
    '<body style="font:18px system-ui,sans-serif;background:#0F3B2A;color:#F4EEDD;padding:24px;text-align:center">' .
    '<p>' . htmlspecialchars($msg) . '</p><p><a style="color:#F4D675" href="https://climbix.app/">Voltar ao Climbix</a></p></body>';
  exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') out(null);

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
$cfg = is_file($dir . '/oauth.json') ? json_decode(file_get_contents($dir . '/oauth.json'), true) : null;
if (!is_array($cfg)) $cfg = [];
$REDIRECT = $cfg['redirect'] ?? 'https://climbix.app/api/oauth.php';

$PROVIDERS = [
  'google' => ['auth' => 'https://accounts.google.com/o/oauth2/v2/auth', 'token' => 'https://oauth2.googleapis.com/token',
    'scope' => 'openid email profile', 'extra' => ['prompt' => 'select_account']],
  'github' => ['auth' => 'https://github.com/login/oauth/authorize', 'token' => 'https://github.com/login/oauth/access_token',
    'user' => 'https://api.github.com/user', 'scope' => '', 'extra' => ['allow_signup' => 'true']],
  'discord' => ['auth' => 'https://discord.com/oauth2/authorize', 'token' => 'https://discord.com/api/oauth2/token',
    'user' => 'https://discord.com/api/users/@me', 'scope' => 'identify', 'extra' => ['prompt' => 'none']],
];
// Serviço configurado: id e segredo no oauth.json (endereços podem ser trocados lá, para testes)
function provider($p) {
  global $PROVIDERS, $cfg;
  $c = $cfg[$p] ?? null;
  if (!isset($PROVIDERS[$p]) || !is_array($c) || empty($c['id']) || empty($c['secret'])) return null;
  return array_merge($PROVIDERS[$p], array_intersect_key($c, ['auth' => 1, 'token' => 1, 'user' => 1]), ['id' => $c['id'], 'secret' => $c['secret']]);
}

$a = $_GET['a'] ?? '';
if ($a === 'providers') out(['providers' => array_values(array_filter(array_keys($PROVIDERS), 'provider'))]);

try {
  $db = new PDO('sqlite:' . $dir . '/rank.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS oauth_flows (state TEXT PRIMARY KEY, provider TEXT, verifier TEXT, back TEXT, code TEXT,
    subject TEXT, label TEXT, name TEXT, created INTEGER, done INTEGER DEFAULT 0)');
  $db->exec('CREATE INDEX IF NOT EXISTS oauth_flows_code ON oauth_flows(code)');
} catch (Exception $e) { out(['error' => 'db'], 500); }

// Para onde voltar: só o próprio jogo (senão um link falso mandaria o código de login para outro site)
function backOk($url) {
  global $cfg;
  $u = parse_url((string)$url);
  if (!$u || empty($u['scheme']) || empty($u['host'])) return null;
  $origin = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
  $allowed = array_merge(['https://climbix.app', 'https://www.climbix.app'], (array)($cfg['origins'] ?? []));
  $local = $u['scheme'] === 'http' && in_array($u['host'], ['localhost', '127.0.0.1'], true);
  if (!$local && !in_array($origin, $allowed, true)) return null;
  $path = $u['path'] ?? '/';
  if (!preg_match('~^/[\w./-]*$~', $path)) return null;
  return $origin . $path;
}

if ($a === 'start') {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'bad'], 405);
  $in = json_decode(file_get_contents('php://input'), true);
  $p = $in['provider'] ?? '';
  $pr = is_string($p) ? provider($p) : null;
  if (!$pr) out(['error' => 'provider'], 400);
  $back = backOk($in['back'] ?? '');
  $v = $in['verifier'] ?? '';
  if (!$back || !is_string($v) || !preg_match('/^[a-f0-9]{32,128}$/', $v)) out(['error' => 'bad'], 400);
  $db->prepare('DELETE FROM oauth_flows WHERE created < ?')->execute([time() - 3600]);
  $state = bin2hex(random_bytes(24));
  $db->prepare('INSERT INTO oauth_flows (state, provider, verifier, back, created) VALUES (?, ?, ?, ?, ?)')
    ->execute([hash('sha256', $state), $p, hash('sha256', $v), $back, time()]);
  $q = ['client_id' => $pr['id'], 'redirect_uri' => $REDIRECT, 'response_type' => 'code', 'state' => $state] + $pr['extra'];
  if ($pr['scope'] !== '') $q['scope'] = $pr['scope'];
  out(['url' => $pr['auth'] . '?' . http_build_query($q, '', '&', PHP_QUERY_RFC3986)]);
}

// ---------- retorno do serviço ----------
function http($url, $post = null, $headers = []) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_HTTPHEADER => array_merge(['User-Agent: Climbix'], $headers ?: ['Accept: application/json'])]);
  if ($post !== null) { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post)); }
  $body = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $j = is_string($body) ? json_decode($body, true) : null;
  if ($code < 200 || $code >= 300 || !is_array($j)) throw new Exception('http ' . $code);
  return $j;
}
// Troca o código pelo acesso e descobre quem entrou: id fixo no serviço, nome para mostrar e sugestão de usuário
function identify($p, $pr, $code) {
  global $REDIRECT;
  $tok = http($pr['token'], ['client_id' => $pr['id'], 'client_secret' => $pr['secret'], 'code' => $code,
    'redirect_uri' => $REDIRECT, 'grant_type' => 'authorization_code']);
  if ($p === 'google') {
    // O id_token veio direto do Google (HTTPS, servidor a servidor): basta conferir para quem ele foi emitido
    $parts = explode('.', (string)($tok['id_token'] ?? ''));
    $c = count($parts) === 3 ? json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true) : null;
    if (!is_array($c) || ($c['aud'] ?? '') !== $pr['id'] || !in_array($c['iss'] ?? '', ['https://accounts.google.com', 'accounts.google.com'], true)
      || empty($c['sub']) || ($c['exp'] ?? 0) < time()) throw new Exception('id_token');
    return [(string)$c['sub'], $c['email'] ?? $c['name'] ?? '', $c['given_name'] ?? $c['name'] ?? ''];
  }
  if (empty($tok['access_token'])) throw new Exception('token');
  $u = http($pr['user'], null, ['Authorization: Bearer ' . $tok['access_token'], $p === 'github' ? 'Accept: application/vnd.github+json' : 'Accept: application/json']);
  if (empty($u['id'])) throw new Exception('user');
  if ($p === 'github') return [(string)$u['id'], '@' . ($u['login'] ?? ''), $u['login'] ?? ''];
  return [(string)$u['id'], $u['global_name'] ?? $u['username'] ?? '', $u['username'] ?? ''];
}

$state = $_GET['state'] ?? '';
if (!is_string($state) || $state === '') page('Endereço inválido.');
$q = $db->prepare('SELECT * FROM oauth_flows WHERE state = ? AND done = 0 AND created > ?');
$q->execute([hash('sha256', $state), time() - 900]);
$f = $q->fetch(PDO::FETCH_ASSOC);
if (!$f) page('Esse login expirou ou já foi usado. Volte ao Climbix e tente de novo.');
// Cada retorno vale uma vez só
$db->prepare('UPDATE oauth_flows SET done = 1 WHERE state = ?')->execute([$f['state']]);
$go = function ($frag) use ($f) { header('Location: ' . $f['back'] . '#' . $frag, true, 302); exit; };
$pr = provider($f['provider']);
$code = $_GET['code'] ?? '';
if (!$pr || isset($_GET['error']) || !is_string($code) || $code === '') $go('climbix-oauth-error=cancel');
try { [$sub, $label, $name] = identify($f['provider'], $pr, $code); }
catch (Exception $e) { $go('climbix-oauth-error=fail'); }
$claim = bin2hex(random_bytes(24));
$db->prepare('UPDATE oauth_flows SET code = ?, subject = ?, label = ?, name = ?, created = ? WHERE state = ?')
  ->execute([hash('sha256', $claim), $sub, mb_substr((string)$label, 0, 80, 'UTF-8'), mb_substr((string)$name, 0, 40, 'UTF-8'), time(), $f['state']]);
$go('climbix-oauth=' . $claim);
