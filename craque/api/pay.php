<?php
// Compra de moedas com dinheiro real (Mercado Pago, Checkout Pro: Pix e cartão). Fase 5 das moedas (2026-11-09).
// O token fica em climbix-data/mp-token FORA do public_html (o deploy grava a partir do segredo CLIMBIX_MP_TOKEN);
// token que começa com TEST- é o de teste (não cobra). Sem o arquivo, a loja mostra "Compra em breve".
//   POST ?a=status                       {on, test}
//   POST ?a=create {token, pack}         cria a compra e devolve {ref, url} (o jogador vai para o Mercado Pago)
//   GET/POST ?a=hook                     aviso do Mercado Pago (notification_url): confere o pagamento na API deles
//   POST ?a=check  {token}               compras pagas e ainda não entregues desta conta: {list: [{ref, coins}]}
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
if ($a === 'status') out(['on' => $mp !== '', 'test' => strpos($mp, 'TEST-') === 0]);
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
  $ch = curl_init('https://api.mercadopago.com' . $path);
  $h = ['Authorization: Bearer ' . $mp, 'Content-Type: application/json'];
  if ($body !== null) $h[] = 'X-Idempotency-Key: ' . bin2hex(random_bytes(16));
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
  $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  $j = is_string($r) ? json_decode($r, true) : null;
  return [$code, is_array($j) ? $j : []];
}
// Marca como paga a compra de um pagamento aprovado (confere valor e referência)
function settle($db, $pay) {
  $ref = (string)($pay['external_reference'] ?? '');
  if ($ref === '' || ($pay['status'] ?? '') !== 'approved') return false;
  $q = $db->prepare('SELECT price, status FROM purchases WHERE ref = ?'); $q->execute([$ref]);
  $p = $q->fetch(PDO::FETCH_ASSOC);
  if (!$p || $p['status'] !== 'created') return false;
  if (abs((float)($pay['transaction_amount'] ?? 0) - (float)$p['price']) > 0.01) return false;
  $db->prepare("UPDATE purchases SET status = 'approved', mp_id = ?, paid = ? WHERE ref = ? AND status = 'created'")->execute([(string)$pay['id'], time(), $ref]);
  return true;
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
  if ($code < 200 || $code >= 300 || empty($pref['init_point'])) out(['error' => 'mp'], 502);
  $db->prepare("INSERT INTO purchases (ref, user_key, pack, coins, price, status, created) VALUES (?, ?, ?, ?, ?, 'created', ?)")->execute([$ref, $user, $k, $P['coins'], $P['price'], time()]);
  $test = strpos($mp, 'TEST-') === 0;
  out(['ref' => $ref, 'url' => $test && !empty($pref['sandbox_init_point']) ? $pref['sandbox_init_point'] : $pref['init_point']]);
}

if ($a === 'check') {
  // Compras abertas das últimas 48 h: pergunta ao Mercado Pago (o aviso pode ter se perdido)
  $q = $db->prepare("SELECT ref FROM purchases WHERE user_key = ? AND status = 'created' AND created > ? ORDER BY created DESC LIMIT 5"); $q->execute([$user, time() - 172800]);
  foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $ref) {
    [$code, $r] = mpCall($mp, 'GET', '/v1/payments/search?external_reference=' . urlencode($ref));
    if ($code === 200) foreach (($r['results'] ?? []) as $pay) settle($db, $pay);
  }
  $q = $db->prepare("SELECT ref, coins FROM purchases WHERE user_key = ? AND status = 'approved'"); $q->execute([$user]);
  out(['list' => array_map(fn($r) => ['ref' => $r['ref'], 'coins' => (int)$r['coins']], $q->fetchAll(PDO::FETCH_ASSOC))]);
}

if ($a === 'claim') {
  $refs = array_values(array_filter((array)($in['refs'] ?? []), fn($r) => is_string($r) && preg_match('/^[a-f0-9]{24}$/', $r)));
  $u = $db->prepare("UPDATE purchases SET status = 'claimed', claimed = ? WHERE ref = ? AND user_key = ? AND status = 'approved'");
  foreach (array_slice($refs, 0, 20) as $ref) $u->execute([time(), $ref, $user]);
  out(['ok' => true]);
}

out(['error' => 'action'], 400);
