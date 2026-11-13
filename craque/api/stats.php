<?php
// Contagem anônima (src/stats.js): o jogo manda só eventos sem identidade e aqui se soma por dia. Nada de id de
// aparelho, conta, IP ou navegador: cada linha é dia + evento + modo + faixa, com o total. Banco SQLite FORA do
// public_html, como o ranking. É a linha de base do plano Jogo a Jogo + Treinador (fase 0).
//   POST ?a=hit   {ev, mode, k}     soma +1 em (hoje, ev, mode, k)
//   GET  ?a=list[&days=30]          linhas dos últimos dias (somas anônimas, leitura aberta)
//   GET  ?a=mail                    contador por e-mail para o Silvio: o primeiro de todos sai na hora, depois um por dia
//                                   a partir das 18h (Brasília). O Cron Job do hPanel chama de hora em hora e,
//                                   de reserva, o primeiro hit depois das 18h também dispara. Nunca manda dois no mesmo dia.
// Eventos: first (primeira visita do aparelho), d1 (voltou no dia seguinte), d7 (voltou entre o 7º e o 13º dia),
// session (k = faixa de minutos), first e start (k = canal do link ?de=, vazio = direto), start (carreira começou), season (k = número da temporada), end (carreira terminou).
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
// De onde o aparelho veio (link climbix.app/?de=canal), só no first e no start
$SRCS = ['', 'tiktok', 'insta', 'yt', 'zap', 'tabnews', 'reddit', 'face', 'criador', 'itch', 'x', 'discord', 'imprensa', 'outro'];

// ---------- Contador por e-mail ----------
// Mesmo destino das opiniões: o endereço já mora em feedback.php (FB_EMAIL), sem repetir aqui
function st_email() {
  return preg_match("/const FB_EMAIL = '([^']+)'/", (string)@file_get_contents(__DIR__ . '/feedback.php'), $m) ? $m[1] : '';
}
const ST_FROM = 'Climbix contador <feedback@climbix.app>';
$SRC_TXT = ['' => 'Direto', 'tiktok' => 'TikTok', 'insta' => 'Instagram', 'yt' => 'YouTube', 'zap' => 'WhatsApp', 'tabnews' => 'TabNews',
  'reddit' => 'Reddit', 'face' => 'Facebook', 'criador' => 'Criador', 'itch' => 'itch.io', 'x' => 'X', 'discord' => 'Discord', 'imprensa' => 'Imprensa', 'outro' => 'Outro'];

function st_sum($rows, $from, $to, $f) { $n = 0; foreach ($rows as $r) if ($r['day'] >= $from && $r['day'] <= $to && $f($r)) $n += (int)$r['n']; return $n; }

function st_mail_body($db, $SRC_TXT, $first) {
  $rows = $db->query('SELECT day, ev, mode, k, n FROM counts')->fetchAll(PDO::FETCH_ASSOC);
  $hoje = date('Y-m-d'); $ontem = date('Y-m-d', strtotime('-1 day')); $d7 = date('Y-m-d', strtotime('-6 days'));
  $cols = [[$hoje, $hoje], [$ontem, $ontem], [$d7, $hoje], ['0000', '9999']];
  $lines = [
    ['Aparelhos novos', fn($r) => $r['ev'] === 'first'],
    ['Carreiras (Treinador)', fn($r) => $r['ev'] === 'start' && $r['mode'] === 'treinador'],
    ['Temporadas jogadas', fn($r) => $r['ev'] === 'season'],
    ['Sessões', fn($r) => $r['ev'] === 'session'],
    ['Sessões de 5+ min', fn($r) => $r['ev'] === 'session' && in_array($r['k'], ['5-10', '10-20', '20-40', '40+'], true)],
    ['Voltaram (1 dia)', fn($r) => $r['ev'] === 'd1'],
    ['Voltaram (1 semana)', fn($r) => $r['ev'] === 'd7'],
  ];
  $td = 'padding:7px 6px;border-bottom:1px solid #eef0f2;text-align:right;font-size:14px';
  $th = 'padding:6px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;white-space:nowrap';
  $tab = '<table style="width:100%;border-collapse:collapse"><tr><th style="' . $th . ';text-align:left"></th><th style="' . $th . '">Hoje</th><th style="' . $th . '">Ontem</th><th style="' . $th . '">7 dias</th><th style="' . $th . '">Total</th></tr>';
  $vals = [];
  foreach ($lines as $i => [$lab, $f]) {
    $v = array_map(fn($c) => st_sum($rows, $c[0], $c[1], $f), $cols); $vals[$i] = $v;
    $tab .= '<tr><td style="' . $td . ';text-align:left;color:#374151">' . $lab . '</td><td style="' . $td . ';font-weight:700;color:#0f3d2e">' . $v[0] . '</td>'
      . '<td style="' . $td . ';color:#6b7280">' . $v[1] . '</td><td style="' . $td . ';color:#6b7280">' . $v[2] . '</td><td style="' . $td . ';color:#6b7280">' . $v[3] . '</td></tr>';
  }
  $tab .= '</table>';
  // De onde vieram (link ?de=), hoje e no total
  $src = [];
  foreach ($rows as $r) if ($r['ev'] === 'first') { $k = $r['k']; $src[$k] ??= [0, 0]; $src[$k][1] += (int)$r['n']; if ($r['day'] === $hoje) $src[$k][0] += (int)$r['n']; }
  uasort($src, fn($a, $b) => $b[0] <=> $a[0] ?: $b[1] <=> $a[1]);
  $st = [];
  foreach ($rows as $r) if ($r['ev'] === 'start' && $r['mode'] === 'treinador') { $k = $r['k']; $st[$k] = ($st[$k] ?? 0) + ($r['day'] === $hoje ? (int)$r['n'] : 0); }
  $orig = '';
  if ($src) {
    $orig = '<div style="font-size:13px;font-weight:700;color:#0f3d2e;margin:16px 0 4px">De onde vieram os aparelhos novos</div><table style="width:100%;border-collapse:collapse">'
      . '<tr><th style="' . $th . ';text-align:left"></th><th style="' . $th . '">Hoje</th><th style="' . $th . '">Carreiras</th><th style="' . $th . '">Total</th></tr>';
    foreach ($src as $k => $v) $orig .= '<tr><td style="' . $td . ';text-align:left;color:#374151">' . ($SRC_TXT[$k] ?? $k) . '</td><td style="' . $td . ';font-weight:700;color:#0f3d2e">' . $v[0] . '</td>'
      . '<td style="' . $td . ';color:#6b7280">' . ($st[$k] ?? 0) . '</td><td style="' . $td . ';color:#6b7280">' . $v[1] . '</td></tr>';
    $orig .= '</table>';
  }
  $hora = date('H\hi');
  $subj = 'Climbix ' . date('d/m') . ' · ' . $vals[0][0] . ' aparelhos novos, ' . $vals[1][0] . ' carreiras';
  $body = '<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'
    . '<div style="max-width:560px;margin:0 auto;padding:16px 12px">'
    . '<div style="background:#0f3d2e;color:#fff;border-radius:12px;padding:14px 16px;margin:0 0 12px"><div style="font-size:19px;font-weight:700">⚽ Contador do Climbix</div>'
    . '<div style="margin-top:3px;font-size:13px;color:#b7e4c7">' . date('d/m/Y') . ' · hoje até ' . $hora . ($first ? ' · primeiro envio, depois todo dia às 18h' : '') . '</div></div>'
    . '<div style="background:#fff;border-radius:12px;padding:10px 12px">' . $tab . $orig . '</div>'
    . '<div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px">Contagem anônima do jogo (sem nome, conta ou IP). "Hoje" vai até a hora do envio.</div>'
    . '</div></body></html>';
  return [$subj, $body];
}

// $force: só o primeiro de todos (sem marca de primeiro envio). Depois, um por dia a partir das 18h.
function st_mail_maybe($db, $dir, $SRC_TXT) {
  if (!function_exists('mail') || st_email() === '') return 'sem mail()';
  $firstf = $dir . '/stats-mail-first'; $dayf = $dir . '/stats-mail-day';
  $first = !is_file($firstf);
  $due = (int)date('G') >= 18 && trim((string)@file_get_contents($dayf)) !== date('Y-m-d');
  if (!$first && !$due) return 'cedo';
  $lock = @fopen($dir . '/stats-mail.lock', 'c');
  if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return 'ocupado';
  clearstatcache();
  $first = !is_file($firstf);
  $due = (int)date('G') >= 18 && trim((string)@file_get_contents($dayf)) !== date('Y-m-d');
  $res = 'cedo';
  if ($first || $due) {
    [$subj, $body] = st_mail_body($db, $SRC_TXT, $first);
    $hdr = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\nFrom: " . ST_FROM . "\r\n";
    if (@mail(st_email(), mb_encode_mimeheader($subj, 'UTF-8', 'B'), chunk_split(base64_encode($body)), $hdr, '-ffeedback@climbix.app')) {
      file_put_contents($firstf, date('c'));
      if ($due) file_put_contents($dayf, date('Y-m-d'));
      $res = 'enviado';
    } else $res = 'falhou';
  }
  flock($lock, LOCK_UN);
  return $res;
}

if ($a === 'mail') { try { out(['ok' => true, 'mail' => st_mail_maybe($db, $dir, $SRC_TXT)]); } catch (Throwable $e) { out(['error' => 'mail'], 500); } }

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
  elseif ($ev === 'first' || $ev === 'start') { if (!in_array($k, $SRCS, true)) $k = 'outro'; }
  else $k = '';
  $db->prepare('INSERT INTO counts (day, ev, mode, k, n) VALUES (?,?,?,?,1) ON CONFLICT(day, ev, mode, k) DO UPDATE SET n = counts.n + 1')
    ->execute([date('Y-m-d'), $ev, $mode, $k]);
  // Reserva do cron: depois das 18h, o primeiro hit do dia manda o contador (já respondido ao jogador antes)
  // (a Hostinger roda LiteSpeed: litespeed_finish_request; sem nenhum dos dois, o jogador só espera um pouco nesse hit)
  if ((int)date('G') >= 18 && trim((string)@file_get_contents($dir . '/stats-mail-day')) !== date('Y-m-d')) {
    echo json_encode(['ok' => true]);
    if (function_exists('litespeed_finish_request')) litespeed_finish_request(); elseif (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    try { st_mail_maybe($db, $dir, $SRC_TXT); } catch (Throwable $e) {}
    exit;
  }
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
