<?php
// Contagem anônima (src/stats.js): o jogo manda só eventos sem identidade e aqui se soma por dia. Nada de id de
// aparelho, conta, IP ou navegador: cada linha é dia + evento + modo + faixa, com o total. Banco SQLite FORA do
// public_html, como o ranking. É a linha de base do plano Jogo a Jogo + Treinador (fase 0).
//   POST ?a=hit   {ev, mode, k}     soma +1 em (hoje, ev, mode, k)
//   GET  ?a=list[&days=30]          linhas dos últimos dias (somas anônimas, leitura aberta)
// Eventos: first (primeira visita do aparelho), d1 (voltou no dia seguinte), d7 (voltou entre o 7º e o 13º dia),
// session (k = faixa de minutos), start (carreira começou), season (k = número da temporada), end (carreira terminou).
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
  $db = new PDO('sqlite:' . $dir . '/stats.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS counts (day TEXT, ev TEXT, mode TEXT, k TEXT, n INTEGER, PRIMARY KEY (day, ev, mode, k))');
} catch (Exception $e) { out(['error' => 'db'], 500); }

$a = $_GET['a'] ?? '';
$EVS = ['first', 'd1', 'd7', 'session', 'start', 'season', 'end'];
$MODES = ['', 'inicio', 'rapida', 'jaj', 'relampago', 'treinador'];
$DUR = ['0-1', '1-5', '5-10', '10-20', '20-40', '40+'];

if ($a === 'hit') {
  $raw = file_get_contents('php://input');
  if (strlen($raw) > 300) out(['error' => 'big'], 413);
  $in = json_decode($raw, true);
  if (!is_array($in)) out(['error' => 'bad'], 400);
  $ev = (string)($in['ev'] ?? '');
  $mode = (string)($in['mode'] ?? '');
  $k = (string)($in['k'] ?? '');
  if (!in_array($ev, $EVS, true) || !in_array($mode, $MODES, true)) out(['error' => 'bad'], 400);
  // Só o que cada evento usa: faixa de minutos na sessão, número da temporada (até 40) na temporada
  if ($ev === 'session') { if (!in_array($k, $DUR, true)) out(['error' => 'bad'], 400); }
  elseif ($ev === 'season') { $s = (int)$k; if ($s < 1 || $s > 40) out(['error' => 'bad'], 400); $k = (string)$s; }
  else $k = '';
  $db->prepare('INSERT INTO counts (day, ev, mode, k, n) VALUES (?,?,?,?,1) ON CONFLICT(day, ev, mode, k) DO UPDATE SET n = counts.n + 1')
    ->execute([date('Y-m-d'), $ev, $mode, $k]);
  out(['ok' => true]);
}

if ($a === 'list') {
  $days = max(1, min(400, (int)($_GET['days'] ?? 30)));
  $q = $db->prepare('SELECT day, ev, mode, k, n FROM counts WHERE day >= ? ORDER BY day, ev, mode, k');
  $q->execute([date('Y-m-d', time() - ($days - 1) * 86400)]);
  $rows = $q->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as &$r) $r['n'] = (int)$r['n'];
  unset($r);
  out(['today' => date('Y-m-d'), 'rows' => $rows]);
}

out(['error' => 'action'], 400);
