<?php
// Compra de moedas com dinheiro real (Mercado Pago, Checkout Pro: Pix e cartão). Fase 5 das moedas (2026-11-09).
// O token fica em climbix-data/mp-token FORA do public_html (o deploy grava a partir do segredo CLIMBIX_MP_TOKEN);
// Token de teste: o antigo começa com TEST-; no painel novo começa com APP_USR- como o real, e o que diz que é teste é
// a conta dona do token (tag test_user em /users/me, guardado em climbix-data/mp-mode). Sem o arquivo, "Compra em breve".
//   POST ?a=status                       {on, test}
//   POST ?a=create {token, pack}         cria a compra e devolve {ref, url} (o jogador vai para o Mercado Pago)
//   GET/POST ?a=hook                     aviso do Mercado Pago (notification_url): confere o pagamento na API deles
//   POST ?a=check  {token}               compras pagas e ainda não entregues desta conta: {list: [{ref, coins}]}; as já entregues em {paid}; {wait} = pagamentos esperando
//   POST ?a=claim  {token, refs}         o aparelho já somou essas moedas (cada ref só entrega uma vez)
// Nada aqui confia no que o aparelho diz sobre o pagamento: o status vem sempre da API do Mercado Pago.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// Pacotes: o preço vale daqui, nunca do aparelho (os mesmos de PACKS em ui/coachland.js)
const PACKS = [
  'p1' => ['coins' => 120, 'price' => 4.90, 'name' => 'Punhado'],
  'p2' => ['coins' => 350, 'price' => 12.90, 'name' => 'Saco'],
  'p3' => ['coins' => 800, 'price' => 24.90, 'name' => 'Baú'],
  'p4' => ['coins' => 2000, 'price' => 49.90, 'name' => 'Cofre'],
];
const SITE = 'https://climbix.app';

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
$mp = is_file($dir . '/mp-token') ? trim((string)file_get_contents($dir . '/mp-token')) : '';
$a = $_GET['a'] ?? '';
// Diagnóstico da conta do token (sem nada secreto): código do /users/me, país, se é conta de teste e o prefixo do token
if ($a === 'diag' && $mp !== '') { [$c, $me] = mpCall($mp, 'GET', '/users/me'); out(['me' => $c, 'site' => $me['site_id'] ?? '', 'test_user' => in_array('test_user', (array)($me['tags'] ?? []), true), 'prefix' => substr($mp, 0, 8), 'msg' => substr((string)($me['message'] ?? ''), 0, 120)]); }
if ($a === 'status') out(['on' => $mp !== '', 'test' => $mp !== '' && mpTest($mp, $dir)]);
if ($mp === '') out(['error' => 'off'], 503);

try {
  $db = new PDO('sqlite:' . $dir . '/rank.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  // status: created → approved (pago) → claimed (o aparelho somou); mp_id = id do pagamento no Mercado Pago
  $db->exec('CREATE TABLE IF NOT EXISTS purchases (ref TEXT PRIMARY KEY, user_key TEXT, pack TEXT, coins INTEGER, price REAL, status TEXT, mp_id TEXT, created INTEGER, paid INTEGER, claimed INTEGER)');
  $db->exec('CREATE INDEX IF NOT EXISTS purchases_user ON purchases (user_key, status)');
} catch (Exception $e) { out(['error' => 'storage'], 500); }

function mpCall($mp, $method, $path, $body = null) {
  $ch = curl_init((getenv('CLIMBIX_MP_API') ?: 'https://api.mercadopago.com') . $path);   // CLIMBIX_MP_API só nos testes (Mercado Pago de mentira)
  $h = ['Authorization: Bearer ' . $mp, 'Content-Type: application/json'];
  if ($body !== null) $h[] = 'X-Idempotency-Key: ' . bin2hex(random_bytes(16));
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
  $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  $j = is_string($r) ? json_decode($r, true) : null;
  return [$code, is_array($j) ? $j : []];
}
// O token é de teste? TEST- (antigo) ou conta de teste (tag test_user); guardado por token para não perguntar sempre
function mpTest($mp, $dir) {
  if (strpos($mp, 'TEST-') === 0) return true;
  $h = substr(hash('sha256', $mp), 0, 16); $f = $dir . '/mp-mode';
  $c = is_file($f) ? explode(':', trim((string)file_get_contents($f))) : [];
  if (count($c) === 2 && $c[0] === $h) return $c[1] === '1';
  [$code, $me] = mpCall($mp, 'GET', '/users/me');
  if ($code !== 200) return false;
  $t = in_array('test_user', (array)($me['tags'] ?? []), true);
  @file_put_contents($f, $h . ':' . ($t ? '1' : '0'));
  return $t;
}
// Marca como paga a compra de um pagamento aprovado (confere valor e referência). Cada pagamento do Mercado Pago entrega
// uma vez só. Pagou duas vezes a mesma compra (voltou ao link e pagou de novo)? O 2º pagamento vira outra compra paga do
// mesmo pacote, entregue como a 1ª: ninguém paga sem receber.
function settle($db, $pay) {
  $ref = (string)($pay['external_reference'] ?? ''); $id = (string)($pay['id'] ?? '');
  if ($ref === '' || $id === '' || ($pay['status'] ?? '') !== 'approved') return false;
  $ok = false;
  try {
    $db->exec('BEGIN IMMEDIATE');
    $q = $db->prepare('SELECT user_key, pack, coins, price, status, mp_id FROM purchases WHERE ref = ?'); $q->execute([$ref]);
    $p = $q->fetch(PDO::FETCH_ASSOC);
    if ($p && abs((float)($pay['transaction_amount'] ?? 0) - (float)$p['price']) <= 0.01) {
      if ($p['status'] === 'created') {
        $db->prepare("UPDATE purchases SET status = 'approved', mp_id = ?, paid = ? WHERE ref = ? AND status = 'created'")->execute([$id, time(), $ref]);
        $ok = true;
      } elseif ((string)$p['mp_id'] !== '' && (string)$p['mp_id'] !== $id) {
        $q = $db->prepare('SELECT COUNT(*) FROM purchases WHERE mp_id = ?'); $q->execute([$id]);
        if (!(int)$q->fetchColumn()) {
          $db->prepare("INSERT INTO purchases (ref, user_key, pack, coins, price, status, mp_id, created, paid) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)")
            ->execute([bin2hex(random_bytes(12)), $p['user_key'], $p['pack'], $p['coins'], $p['price'], $id, time(), time()]);
          $ok = true;
        }
      }
    }
    $db->exec('COMMIT');
  } catch (Exception $e) { try { $db->exec('ROLLBACK'); } catch (Exception $e2) {} return false; }
  return $ok;
}

if ($a === 'hook') {
  // Aviso do Mercado Pago: ?type=payment&data.id=123 (ou o mesmo no corpo JSON). Sempre responde 200.
  $in = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
  $type = $_GET['type'] ?? $_GET['topic'] ?? ($in['type'] ?? '');
  $id = $_GET['data_id'] ?? $_GET['data.id'] ?? $_GET['id'] ?? ($in['data']['id'] ?? '');
  if ($type === 'payment' && preg_match('/^\d{1,20}$/', (string)$id)) {
    [$code, $pay] = mpCall($mp, 'GET', '/v1/payments/' . $id);
    if ($code === 200) settle($db, $pay);
  }
  out(['ok' => true]);
}

// Presente de moedas (2026-11-12, para o Silvio testar sem pagar): só com a chave de climbix-data/admin-key, que o deploy
// grava do segredo CLIMBIX_ADMIN_KEY e nunca está no código nem no jogo. Sem o arquivo (ou chave curta) a rota não existe.
// Entra como compra paga de R$ 0 (pack 'gift') da conta e chega ao aparelho pelo check/claim de sempre.
//   POST ?a=gift {key, user (usuário ou e-mail do login), coins (1 a 5000)}
if ($a === 'gift') {
  $ak = is_file($dir . '/admin-key') ? trim((string)file_get_contents($dir . '/admin-key')) : '';
  $in = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
  if (strlen($ak) < 12 || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !is_string($in['key'] ?? null) || !hash_equals($ak, $in['key'])) out(['error' => 'action'], 400);
  $n = (int)($in['coins'] ?? 0); $who = mb_strtolower(trim((string)($in['user'] ?? '')), 'UTF-8');
  if ($n < 1 || $n > 5000 || $who === '') out(['error' => 'bad'], 400);
  $q = $db->prepare('SELECT user_key FROM accounts WHERE user_key = ? UNION SELECT user_key FROM identities WHERE lower(label) = ?'); $q->execute([$who, $who]);
  $keys = $q->fetchAll(PDO::FETCH_COLUMN);
  if (count($keys) !== 1) out(['error' => 'user', 'found' => count($keys)], 404);
  $db->prepare("INSERT INTO purchases (ref, user_key, pack, coins, price, status, mp_id, created, paid) VALUES (?, ?, 'gift', ?, 0, 'approved', '', ?, ?)")->execute([bin2hex(random_bytes(12)), $keys[0], $n, time(), time()]);
  out(['ok' => true, 'coins' => $n]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'method'], 405);
$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) out(['error' => 'json'], 400);
// Sessão da conta (a mesma do account.php)
$t = $in['token'] ?? '';
if (!is_string($t) || !preg_match('/^[a-f0-9]{64}$/', $t)) out(['error' => 'auth'], 401);
$q = $db->prepare('SELECT user_key FROM sessions WHERE token_hash = ?'); $q->execute([hash('sha256', $t)]);
$user = $q->fetchColumn();
if (!$user) out(['error' => 'auth'], 401);

if ($a === 'create') {
  $k = $in['pack'] ?? '';
  if (!isset(PACKS[$k])) out(['error' => 'pack'], 400);
  // Freio contra clique repetido: no máximo 10 compras abertas por conta na última hora
  $q = $db->prepare("SELECT COUNT(*) FROM purchases WHERE user_key = ? AND status = 'created' AND created > ?"); $q->execute([$user, time() - 3600]);
  if ((int)$q->fetchColumn() >= 10) out(['error' => 'limit'], 429);
  $P = PACKS[$k]; $ref = bin2hex(random_bytes(12));
  [$code, $pref] = mpCall($mp, 'POST', '/checkout/preferences', [
    'items' => [['id' => $k, 'title' => 'Climbix · ' . $P['coins'] . ' moedas', 'description' => 'Pacote ' . $P['name'] . ' de moedas do Climbix', 'quantity' => 1, 'currency_id' => 'BRL', 'unit_price' => $P['price']]],
    'external_reference' => $ref,
    'notification_url' => SITE . '/api/pay.php?a=hook',
    'back_urls' => ['success' => SITE . '/?pago=' . $ref, 'pending' => SITE . '/?pago=' . $ref, 'failure' => SITE . '/?pago=' . $ref . '&falhou=1'],
    'auto_return' => 'approved',
    'statement_descriptor' => 'CLIMBIX',
  ]);
  // Erro do Mercado Pago: devolve o código e a mensagem deles (sem nada do token) para dar para entender
  if ($code < 200 || $code >= 300 || empty($pref['init_point'])) out(['error' => 'mp', 'mp' => $code, 'msg' => substr((string)($pref['message'] ?? $pref['error'] ?? ''), 0, 200)], 502);
  $db->prepare("INSERT INTO purchases (ref, user_key, pack, coins, price, status, created) VALUES (?, ?, ?, ?, ?, 'created', ?)")->execute([$ref, $user, $k, $P['coins'], $P['price'], time()]);
  // sandbox_init_point só no token antigo TEST-; com o APP_USR- de teste o init_point já é o ambiente de teste
  out(['ref' => $ref, 'url' => strpos($mp, 'TEST-') === 0 && !empty($pref['sandbox_init_point']) ? $pref['sandbox_init_point'] : $pref['init_point']]);
}

if ($a === 'check') {
  // Compras abertas das últimas 48 h: pergunta ao Mercado Pago (o aviso pode ter se perdido); wait = pagamentos que ainda esperam (Pix gerado, cartão em análise)
  $q = $db->prepare("SELECT ref FROM purchases WHERE user_key = ? AND status = 'created' AND created > ? ORDER BY created DESC LIMIT 5"); $q->execute([$user, time() - 172800]);
  $wait = 0;
  foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $ref) {
    [$code, $r] = mpCall($mp, 'GET', '/v1/payments/search?external_reference=' . urlencode($ref));
    $w = false;
    if ($code === 200) foreach (($r['results'] ?? []) as $pay) { if (in_array($pay['status'] ?? '', ['pending', 'in_process', 'authorized'], true)) $w = true; if (settle($db, $pay)) $w = false; }
    if ($w) $wait++;
  }
  $q = $db->prepare("SELECT ref, coins, pack FROM purchases WHERE user_key = ? AND status = 'approved'"); $q->execute([$user]);
  $list = array_map(fn($r) => ['ref' => $r['ref'], 'coins' => (int)$r['coins'], 'pack' => (string)$r['pack']], $q->fetchAll(PDO::FETCH_ASSOC));
  // paid: as já entregues (sem o presente de boas-vindas, que vale uma vez por aparelho e não é recuperado) (o aparelho confere se alguma sumiu do saldo e devolve; cada ref continua valendo uma vez só)
  $q = $db->prepare("SELECT ref, coins FROM purchases WHERE user_key = ? AND status = 'claimed' AND IFNULL(pack, '') != 'welcome' ORDER BY claimed DESC LIMIT 100"); $q->execute([$user]);
  out(['list' => $list, 'wait' => $wait, 'paid' => array_map(fn($r) => ['ref' => $r['ref'], 'coins' => (int)$r['coins']], $q->fetchAll(PDO::FETCH_ASSOC))]);
}

if ($a === 'claim') {
  $refs = array_values(array_filter((array)($in['refs'] ?? []), fn($r) => is_string($r) && preg_match('/^[a-f0-9]{24}$/', $r)));
  $u = $db->prepare("UPDATE purchases SET status = 'claimed', claimed = ? WHERE ref = ? AND user_key = ? AND status = 'approved'");
  foreach (array_slice($refs, 0, 20) as $ref) $u->execute([time(), $ref, $user]);
  out(['ok' => true]);
}

out(['error' => 'action'], 400);
