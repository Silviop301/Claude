<?php
// Opiniões dos jogadores (src/ui/feedback.js): nota, do que gostou, onde se perdeu, se indicaria e texto livre.
// Banco SQLite FORA do public_html, como o ranking. Sem nome, conta, e-mail ou IP: só as respostas, a versão
// do jogo, de onde veio (fim de carreira ou Configurações), posição, temporadas, nota final e o tipo de navegador.
//   POST ?a=send  {pid, rate, likes[], lost, rec, more, where, pos, seasons, grade, ver, ua}
//   GET  ?a=list  (cabeçalho X-Climbix-Senha)  respostas mais recentes + resumo
//   POST ?a=mail  manda por e-mail (HTML) as opiniões que ainda não foram mandadas (o deploy chama no fim)
// E-mail: cada opinião nova vai para FB_EMAIL pelo mail() da Hostinger. climbix-data/feedback-mail-id guarda o
// último id mandado; sem esse arquivo (primeira vez) manda tudo o que já existe numa leva só.
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

const FB_EMAIL = 'silviop301@gmail.com';
const FB_FROM = 'Climbix <feedback@climbix.app>';

$a = $_GET['a'] ?? '';
$LIKE_TXT = ['decisoes' => 'Decisões', 'lances' => 'Lances', 'rede' => 'Rede social', 'jornal' => 'Jornal',
  'tacas' => 'Taças', 'ranking' => 'Ranking', 'cartas' => 'Cartas', 'copa' => 'Copa do Mundo',
  // Treinador (Sua opinião deitada, 2026-11-10)
  'aovivo' => 'Jogo ao vivo', 'tatica' => 'Tática', 'mercado' => 'Mercado', 'treino' => 'Treino', 'financas' => 'Finanças', 'olheiro' => 'Olheiro'];

// Uma opinião como cartão HTML (estilos inline: o Gmail ignora <style>)
function fb_card($r, $LIKE_TXT) {
  $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
  $face = [1 => '😞', 2 => '😕', 3 => '😐', 4 => '🙂', 5 => '😍'];
  $rec = ['sim' => '👍 indicaria', 'talvez' => '🤔 talvez indicaria', 'nao' => '👎 não indicaria'];
  $place = ['fim' => 'fim de carreira', 'config' => 'configurações', 'inicio' => 'tela inicial'];
  $top = [];
  if ($r['rate']) $top[] = '<span style="font-size:20px">' . $face[(int)$r['rate']] . '</span> <b style="font-size:18px">' . (int)$r['rate'] . '/5</b>';
  if ($r['rec']) $top[] = $rec[$r['rec']] ?? $h($r['rec']);
  $likes = $r['likes'] ? implode('', array_map(fn($k) => '<span style="display:inline-block;background:#e6f4ea;color:#1e6b34;border-radius:12px;padding:2px 10px;margin:2px 4px 2px 0;font-size:13px">' . $h($LIKE_TXT[$k] ?? $k) . '</span>', explode(',', $r['likes']))) : '';
  $txt = function ($t, $v) use ($h) {
    return $v === '' || $v === null ? '' : '<div style="margin-top:10px"><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">' . $t . '</div>'
      . '<div style="margin-top:3px;font-size:15px;line-height:1.45;color:#111827">' . nl2br($h($v)) . '</div></div>';
  };
  $meta = [date('d/m/Y H:i', (int)$r['created']), $place[$r['place']] ?? ($r['place'] ?: '?')];
  if ($r['pos']) $meta[] = $h($r['pos']);
  if ((int)$r['seasons']) $meta[] = (int)$r['seasons'] . ' temporadas';
  if ($r['grade']) $meta[] = 'nota ' . $h($r['grade']);
  if ($r['ua']) $meta[] = $h($r['ua']);
  if ($r['ver']) $meta[] = 'v ' . $h($r['ver']);
  return '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:0 0 14px">'
    . ($top ? '<div style="font-size:15px;color:#111827">' . implode(' &nbsp;·&nbsp; ', $top) . '</div>' : '')
    . ($likes ? '<div style="margin-top:8px"><span style="font-size:12px;color:#6b7280">Gostou de: </span>' . $likes . '</div>' : '')
    . $txt('Confuso ou chato', $r['lost']) . $txt('Mais alguma coisa', $r['more'])
    . '<div style="margin-top:12px;font-size:12px;color:#9ca3af">#' . (int)$r['id'] . ' · ' . implode(' · ', $meta) . '</div></div>';
}

// Manda as opiniões ainda não mandadas (id > último mandado). Trava com flock para não mandar duas vezes.
function fb_mail_pending($db, $dir, $LIKE_TXT) {
  if (!function_exists('mail')) return 0;
  $lock = @fopen($dir . '/feedback-mail.lock', 'c');
  if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return 0;
  $idf = $dir . '/feedback-mail-id';
  $last = is_file($idf) ? (int)trim((string)file_get_contents($idf)) : 0;
  $sent = 0;
  while (true) {
    $q = $db->prepare('SELECT * FROM feedback WHERE id > ? ORDER BY id LIMIT 150');
    $q->execute([$last]);
    $rows = $q->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) break;
    $n = count($rows);
    $rates = array_filter(array_map(fn($r) => (int)$r['rate'], $rows));
    if ($n === 1) {
      $r = $rows[0];
      $bit = trim($r['more'] !== '' ? $r['more'] : $r['lost']);
      $subj = 'Climbix · opinião nova' . ($r['rate'] ? ' ' . (int)$r['rate'] . '/5' : '') . ($bit !== '' ? ': ' . mb_strimwidth(preg_replace('/\s+/u', ' ', $bit), 0, 60, '…', 'UTF-8') : '');
      $head = 'Opinião nova no Climbix';
    } else {
      $subj = 'Climbix · ' . $n . ' opiniões' . ($last === 0 ? ' (tudo até agora)' : '');
      $head = $n . ' opiniões' . ($last === 0 ? ' recebidas até agora' : ' novas');
    }
    $sub = $n > 1 ? date('d/m/Y', (int)$rows[0]['created']) . ' a ' . date('d/m/Y', (int)$rows[$n - 1]['created'])
      . ($rates ? ' · média ' . number_format(array_sum($rates) / count($rates), 1, ',', '') . '/5' : '') : '';
    $body = '<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'
      . '<div style="max-width:620px;margin:0 auto;padding:20px 14px">'
      . '<div style="background:#0f3d2e;color:#ffffff;border-radius:12px;padding:16px 18px;margin:0 0 14px"><div style="font-size:20px;font-weight:700">⚽ ' . $head . '</div>'
      . ($sub ? '<div style="margin-top:4px;font-size:13px;color:#b7e4c7">' . $sub . '</div>' : '') . '</div>'
      . implode('', array_map(fn($r) => fb_card($r, $LIKE_TXT), array_reverse($rows)))
      . '<div style="font-size:12px;color:#9ca3af;text-align:center;margin-top:6px">Todas as respostas: <a href="https://climbix.app/respostas.html" style="color:#2563eb">climbix.app/respostas.html</a></div>'
      . '</div></body></html>';
    $hdr = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\nFrom: " . FB_FROM . "\r\n";
    $ok = @mail(FB_EMAIL, mb_encode_mimeheader($subj, 'UTF-8', 'B'), chunk_split(base64_encode($body)), $hdr, '-ffeedback@climbix.app');
    if (!$ok) break;
    $last = (int)$rows[$n - 1]['id'];
    file_put_contents($idf, (string)$last);
    $sent += $n;
  }
  flock($lock, LOCK_UN);
  return $sent;
}
$str = fn($v, $n) => mb_substr(trim(preg_replace('/[ \t]+/u', ' ', str_replace("\r", '', (string)$v))), 0, $n, 'UTF-8');
// O que dá para marcar em "do que mais gostou" (o mesmo que o jogo mostra)
$LIKES = ['decisoes', 'lances', 'rede', 'jornal', 'tacas', 'ranking', 'cartas', 'copa', 'aovivo', 'tatica', 'mercado', 'treino', 'financas', 'olheiro'];

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
  $place = in_array($in['where'] ?? '', ['fim', 'config', 'inicio'], true) ? $in['where'] : '';
  $pos = in_array($in['pos'] ?? '', ['ATA', 'MEI', 'ZAG', 'GOL'], true) ? $in['pos'] : '';
  $seasons = max(0, min(40, (int)($in['seasons'] ?? 0)));
  $grade = preg_match('/^[SABCD]$/', $in['grade'] ?? '') ? $in['grade'] : '';
  $ver = preg_match('/^[a-f0-9]{8}$/', $in['ver'] ?? '') ? $in['ver'] : '';
  $ua = $str($in['ua'] ?? '', 60);
  $db->prepare('INSERT INTO feedback (pid, rate, likes, lost, rec, more, place, pos, seasons, grade, ver, ua, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$pid, $rate, implode(',', $likes), $lost, $rec, $more, $place, $pos, $seasons, $grade, $ver, $ua, time()]);
  // Limite: guarda as 20 mil mais recentes
  if (random_int(1, 100) === 1) $db->exec('DELETE FROM feedback WHERE id NOT IN (SELECT id FROM feedback ORDER BY id DESC LIMIT 20000)');
  // Responde ao jogador primeiro e só depois manda o e-mail (o jogador não espera o servidor de e-mail)
  echo json_encode(['ok' => true]);
  if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
  try { fb_mail_pending($db, $dir, $LIKE_TXT); } catch (Throwable $e) {}
  exit;
}

if ($a === 'mail') {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'post'], 405);
  try { out(['ok' => true, 'sent' => fb_mail_pending($db, $dir, $LIKE_TXT)]); } catch (Throwable $e) { out(['error' => 'mail'], 500); }
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
