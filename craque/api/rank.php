<?php
// Ranking do Climbix: carreiras enviadas pelo jogo (temporada a temporada e no fim da carreira).
// Banco SQLite FORA do public_html (o deploy apaga o que não está no repositório dentro dele).
//   POST ?a=save  {pid, nick?, career:{...}}   grava/atualiza a carreira
//   POST ?a=nick  {pid, nick}                  escolhe o nome no ranking
//   GET  ?a=top&m=<métrica>&p=day|week|all&pid=  top 30 (melhor carreira de cada jogador) + sua posição
//   GET  ?a=friends&n=apelido1|apelido2…         amigos seguidos: maior legado (Jogo a Jogo), maior pontuação e a carreira mais recente
// Jogo a Jogo (mode 'completa') conta pelo legado (m=legado); a pontuação e a nota S a D ficam só com a Carreira Rápida.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
date_default_timezone_set('America/Sao_Paulo');

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

$dir = getenv('CLIMBIX_DATA') ?: dirname(__DIR__, 2) . '/climbix-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) out(['error' => 'storage'], 500);
try {
  $db = new PDO('sqlite:' . $dir . '/rank.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  $db->exec('CREATE TABLE IF NOT EXISTS players (pid TEXT PRIMARY KEY, nick TEXT, nick_key TEXT UNIQUE, created INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS careers (id TEXT PRIMARY KEY, pid TEXT, name TEXT, pos TEXT, country TEXT, club TEXT, daily TEXT,
    done INTEGER, score INTEGER, grade TEXT, peak INTEGER, goals INTEGER, assists INTEGER, best_goals INTEGER, titles INTEGER, ballon INTEGER,
    seasons INTEGER, created INTEGER, updated INTEGER)');
  $db->exec('CREATE INDEX IF NOT EXISTS careers_upd ON careers(updated)');
  // Jogo a Jogo (plano, fase 6): o modo da carreira e os pontos de legado
  $cols = array_column($db->query('PRAGMA table_info(careers)')->fetchAll(PDO::FETCH_ASSOC), 'name');
  if (!in_array('mode', $cols)) $db->exec('ALTER TABLE careers ADD COLUMN mode TEXT');
  if (!in_array('leg', $cols)) $db->exec('ALTER TABLE careers ADD COLUMN leg INTEGER');
  $db->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
  // Os robôs do ranking (carreiras do simulador, pid "cpu…") saíram: apaga os que ficaram no banco, uma vez só
  if ($db->query("SELECT v FROM meta WHERE k = 'robots'")->fetchColumn() !== 'off') {
    $db->beginTransaction();
    $db->exec("DELETE FROM careers WHERE pid LIKE 'cpu%'");
    $db->exec("DELETE FROM players WHERE pid LIKE 'cpu%'");
    $db->exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('robots', 'off')");
    $db->commit();
  }
} catch (Exception $e) { out(['error' => 'db'], 500); }

$a = $_GET['a'] ?? '';
$okId = fn($s) => is_string($s) && preg_match('/^[a-f0-9]{16,32}$/', $s);
// Nome no ranking: 2 a 16 letras, números, espaço, _ ou -
function cleanNick($s) {
  $s = trim(preg_replace('/\s+/u', ' ', (string)$s));
  if (!preg_match('/^[\p{L}\p{N} _\-.]{2,16}$/u', $s)) return null;
  return $s;
}
$num = function ($v, $min, $max) { $v = (int)$v; return max($min, min($max, $v)); };

if ($a === 'nick' || $a === 'save') {
  $in = json_decode(file_get_contents('php://input'), true);
  if (!is_array($in) || !$okId($in['pid'] ?? null)) out(['error' => 'bad'], 400);
  $pid = $in['pid'];
  $db->prepare('INSERT OR IGNORE INTO players (pid, created) VALUES (?, ?)')->execute([$pid, time()]);
  if (isset($in['nick']) && $in['nick'] !== '') {
    $nick = cleanNick($in['nick']);
    if (!$nick) out(['error' => 'nick_invalid'], 400);
    $key = mb_strtolower($nick, 'UTF-8');
    $q = $db->prepare('SELECT pid FROM players WHERE nick_key = ?'); $q->execute([$key]);
    $owner = $q->fetchColumn();
    if ($owner && $owner !== $pid) out(['error' => 'nick_taken'], 409);
    $db->prepare('UPDATE players SET nick = ?, nick_key = ? WHERE pid = ?')->execute([$nick, $key, $pid]);
  }
  if ($a === 'nick') out(['ok' => true]);
  $c = $in['career'] ?? null;
  if (!is_array($c) || !$okId($c['id'] ?? null)) out(['error' => 'bad'], 400);
  // Não deixa uma carreira trocar de dono
  $q = $db->prepare('SELECT pid FROM careers WHERE id = ?'); $q->execute([$c['id']]);
  $was = $q->fetchColumn();
  if ($was && $was !== $pid) out(['error' => 'owner'], 403);
  $str = fn($v, $n) => mb_substr(trim((string)$v), 0, $n, 'UTF-8');
  $done = !empty($c['done']) ? 1 : 0;
  $jaj = ($c['mode'] ?? '') === 'completa';
  $row = [
    $c['id'], $pid, $str($c['name'] ?? '', 24), in_array($c['pos'] ?? '', ['ATA', 'MEI', 'ZAG', 'GOL']) ? $c['pos'] : '', $str($c['country'] ?? '', 24), $str($c['club'] ?? '', 40),
    preg_match('/^\d{4}-\d{2}-\d{2}$/', $c['daily'] ?? '') ? $c['daily'] : null, $done,
    $done ? $num($c['score'] ?? 0, 0, 20000) : null, $done && !$jaj && preg_match('/^[SABCD]$/', $c['grade'] ?? '') ? $c['grade'] : null,
    $num($c['peak'] ?? 0, 0, 99), $num($c['goals'] ?? 0, 0, 3000), $num($c['assists'] ?? 0, 0, 3000), $num($c['best_goals'] ?? 0, 0, 150),
    $num($c['titles'] ?? 0, 0, 200), $num($c['ballon'] ?? 0, 0, 25), $num($c['seasons'] ?? 0, 0, 40), time(), time(),
    $jaj ? 'completa' : 'rapida', $jaj ? $num($c['leg'] ?? 0, 0, 100000) : null,
  ];
  $db->prepare('INSERT INTO careers (id, pid, name, pos, country, club, daily, done, score, grade, peak, goals, assists, best_goals, titles, ballon, seasons, created, updated, mode, leg)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, pos=excluded.pos, country=excluded.country, club=excluded.club, daily=excluded.daily,
      done=MAX(careers.done, excluded.done), score=COALESCE(excluded.score, careers.score), grade=COALESCE(excluded.grade, careers.grade),
      peak=excluded.peak, goals=excluded.goals, assists=excluded.assists, best_goals=excluded.best_goals, titles=excluded.titles,
      ballon=excluded.ballon, seasons=excluded.seasons, updated=excluded.updated, mode=excluded.mode, leg=excluded.leg')->execute($row);
  out(['ok' => true]);
}

if ($a === 'top') {
  $metrics = ['legado' => 'leg', 'score' => 'score', 'daily' => 'score', 'peak' => 'peak', 'goals' => 'goals', 'best_goals' => 'best_goals', 'assists' => 'assists', 'titles' => 'titles', 'ballon' => 'ballon'];
  $m = $_GET['m'] ?? 'score';
  if (!isset($metrics[$m])) $m = 'score';
  $col = $metrics[$m];
  $p = $_GET['p'] ?? 'all';
  $since = $p === 'day' ? strtotime('today') : ($p === 'week' ? strtotime('monday this week') : 0);
  $where = ['p.nick IS NOT NULL', "c.$col > 0"];
  $args = [];
  if ($m === 'daily') { $where[] = 'c.done = 1'; $where[] = 'c.daily = :day'; $args[':day'] = date('Y-m-d'); }
  else {
    $where[] = 'c.updated >= :since'; $args[':since'] = $since;
    if ($m === 'score') { $where[] = 'c.done = 1'; $where[] = "(c.mode IS NULL OR c.mode != 'completa')"; }
    if ($m === 'legado') $where[] = "c.mode = 'completa'";
  }
  // Melhor carreira de cada jogador na métrica
  $sql = "SELECT * FROM (SELECT p.pid, p.nick, c.name, c.pos, c.club, c.grade, c.peak, c.$col AS v, c.done, c.updated,
      ROW_NUMBER() OVER (PARTITION BY c.pid ORDER BY c.$col DESC, c.updated ASC) AS rn
    FROM careers c JOIN players p ON p.pid = c.pid WHERE " . implode(' AND ', $where) . ") WHERE rn = 1 ORDER BY v DESC, updated ASC";
  $q = $db->prepare($sql); $q->execute($args);
  $all = $q->fetchAll(PDO::FETCH_ASSOC);
  $me = null; $pid = $_GET['pid'] ?? '';
  foreach ($all as $i => $r) if ($r['pid'] === $pid) { $me = ['rank' => $i + 1, 'v' => (int)$r['v'], 'grade' => $r['grade'] ?: '', 'name' => $r['name']]; break; }
  $rows = array_map(fn($r) => ['nick' => $r['nick'], 'name' => $r['name'], 'pos' => $r['pos'], 'club' => $r['club'], 'v' => (int)$r['v'], 'done' => (int)$r['done'], 'grade' => $r['grade'] ?: '', 'peak' => (int)$r['peak'], 'me' => $r['pid'] === $pid], array_slice($all, 0, 30));
  out(['rows' => $rows, 'me' => $me, 'players' => count($all), 'day' => date('Y-m-d')]);
}

if ($a === 'friends') {
  $nicks = array_slice(array_filter(array_map(fn($n) => mb_strtolower(trim($n), 'UTF-8'), explode('|', (string)($_GET['n'] ?? '')))), 0, 30);
  $res = [];
  foreach ($nicks as $key) {
    $q = $db->prepare('SELECT pid, nick FROM players WHERE nick_key = ?'); $q->execute([$key]);
    $pl = $q->fetch(PDO::FETCH_ASSOC);
    if (!$pl) { $res[] = ['key' => $key, 'found' => false]; continue; }
    $one = function ($sql) use ($db, $pl) { $q = $db->prepare($sql); $q->execute([$pl['pid']]); return $q->fetch(PDO::FETCH_ASSOC) ?: null; };
    $leg = $one("SELECT name, pos, club, leg, done, seasons FROM careers WHERE pid = ? AND mode = 'completa' AND leg > 0 ORDER BY leg DESC LIMIT 1");
    $score = $one("SELECT name, pos, club, score, grade FROM careers WHERE pid = ? AND done = 1 AND (mode IS NULL OR mode != 'completa') AND score > 0 ORDER BY score DESC LIMIT 1");
    $last = $one('SELECT name, pos, club, done, seasons, mode, leg, updated FROM careers WHERE pid = ? ORDER BY updated DESC LIMIT 1');
    $res[] = ['key' => $key, 'found' => true, 'nick' => $pl['nick'], 'leg' => $leg, 'score' => $score, 'last' => $last];
  }
  out(['friends' => $res]);
}

if ($a === 'ping') out(['ok' => true, 'php' => PHP_VERSION]);
out(['error' => 'unknown'], 404);
