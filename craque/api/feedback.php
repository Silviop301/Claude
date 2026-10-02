<?php
// Opiniões dos jogadores (src/ui/feedback.js): nota, do que gostou, onde se perdeu, se indicaria e texto livre.
// Banco SQLite FORA do public_html, como o ranking. Sem nome, conta, e-mail ou IP: só as respostas, a versão
// do jogo, de onde veio (fim de carreira ou Configurações), posição, temporadas, nota final e o tipo de navegador.
//   POST ?a=send  {pid, rate, likes[], lost, rec, more, where, pos, seasons, grade, ver, ua}
//   GET  ?a=list  (cabeçalho X-Climbix-Senha)  respostas mais recentes + resumo
// A senha de leitura fica em climbix-data/feedback-senha (gravada pelo deploy a partir do segredo
// CLIMBIX_FEEDBACK_SENHA do GitHub). Sem esse arquivo, ninguém lê as respostas.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Climbix-Senha');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
date_default_timezone_set('America/Sao_Paulo');

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) out(['error' => 'storage'], 500);
try {
  $db = new PDO('sqlite:' . $dir . '/feedback.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, rate INTEGER, likes TEXT, lost TEXT,
    rec TEXT, more TEXT, place TEXT, pos TEXT, seasons INTEGER, grade TEXT, ver TEXT, ua TEXT, created INTEGER)');
  $db->exec('CREATE INDEX IF NOT EXISTS feedback_pid ON feedback(pid, created)');
} catch (Exception $e) { out(['error' => 'db'], 500); }

$a = $_GET['a'] ?? '';
$str = fn($v, $n) => mb_substr(trim(preg_replace('/[ \t]+/u', ' ', str_replace("\r", '', (string)$v))), 0, $n, 'UTF-8');
// O que dá para marcar em "do que mais gostou" (o mesmo que o jogo mostra)
$LIKES = ['decisoes', 'lances', 'rede', 'jornal', 'tacas', 'ranking', 'cartas', 'copa'];

if ($a === 'send') {
  $raw = file_get_contents('php://input');
  if (strlen($raw) > 8000) out(['error' => 'big'], 413);
  $in = json_decode($raw, true);
  if (!is_array($in)) out(['error' => 'bad'], 400);
  $pid = preg_match('/^[a-f0-9]{16,32}$/', $in['pid'] ?? '') ? $in['pid'] : '';
  $rate = (int)($in['rate'] ?? 0);
  if ($rate < 1 || $rate > 5) $rate = null;
  $likes = array_values(array_intersect($LIKES, is_array($in['likes'] ?? null) ? $in['likes'] : []));
  $lost = $str($in['lost'] ?? '', 800);
  $rec = in_array($in['rec'] ?? '', ['sim', 'talvez', 'nao'], true) ? $in['rec'] : null;
  $more = $str($in['more'] ?? '', 1500);
  if ($rate === null && !$likes && $lost === '' && $rec === null && $more === '') out(['error' => 'empty'], 400);
  // Um envio a cada 30 s por aparelho e no máximo 20 por dia
  if ($pid) {
    $q = $db->prepare('SELECT COUNT(*), MAX(created) FROM feedback WHERE pid = ? AND created > ?');
    $q->execute([$pid, time() - 86400]);
    [$n, $last] = $q->fetch(PDO::FETCH_NUM);
    if ($n >= 20 || ($last && time() - $last < 30)) out(['error' => 'slow'], 429);
  }
  $place = in_array($in['where'] ?? '', ['fim', 'config'], true) ? $in['where'] : '';
  $pos = in_array($in['pos'] ?? '', ['ATA', 'MEI', 'ZAG', 'GOL'], true) ? $in['pos'] : '';
  $seasons = max(0, min(40, (int)($in['seasons'] ?? 0)));
  $grade = preg_match('/^[SABCD]$/', $in['grade'] ?? '') ? $in['grade'] : '';
  $ver = preg_match('/^[a-f0-9]{8}$/', $in['ver'] ?? '') ? $in['ver'] : '';
  $ua = $str($in['ua'] ?? '', 60);
  $db->prepare('INSERT INTO feedback (pid, rate, likes, lost, rec, more, place, pos, seasons, grade, ver, ua, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$pid, $rate, implode(',', $likes), $lost, $rec, $more, $place, $pos, $seasons, $grade, $ver, $ua, time()]);
  // Limite: guarda as 20 mil mais recentes
  if (random_int(1, 100) === 1) $db->exec('DELETE FROM feedback WHERE id NOT IN (SELECT id FROM feedback ORDER BY id DESC LIMIT 20000)');
  out(['ok' => true]);
}

if ($a === 'list') {
  $f = $dir . '/feedback-senha';
  $pass = is_file($f) ? trim((string)file_get_contents($f)) : '';
  if (strlen($pass) < 8) out(['error' => 'sem_senha'], 403);
  $got = (string)($_SERVER['HTTP_X_CLIMBIX_SENHA'] ?? '');
  if (!hash_equals($pass, $got)) { usleep(800000); out(['error' => 'senha'], 403); }
  $rows = $db->query('SELECT id, rate, likes, lost, rec, more, place, pos, seasons, grade, ver, ua, created FROM feedback ORDER BY id DESC LIMIT 300')->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as &$r) $r['created'] = date('Y-m-d H:i', $r['created']);
  unset($r);
  $sum = $db->query('SELECT COUNT(*) n, AVG(rate) rate, SUM(rec = \'sim\') sim, SUM(rec = \'talvez\') talvez, SUM(rec = \'nao\') nao FROM feedback')->fetch(PDO::FETCH_ASSOC);
  $likes = array_fill_keys($LIKES, 0);
  foreach ($db->query('SELECT likes FROM feedback WHERE likes != \'\'')->fetchAll(PDO::FETCH_COLUMN) as $l)
    foreach (explode(',', $l) as $k) if (isset($likes[$k])) $likes[$k]++;
  arsort($likes);
  $sum['likes'] = $likes;
  out(['summary' => $sum, 'rows' => $rows]);
}

out(['error' => 'action'], 400);
