#!/usr/bin/env python3
"""Lado e ponta de cada jogador real pelas escalações da ESPN (Silvio 2026-11-18: "não consigo saber se um lateral é
direita ou esquerda"; "a api do fifa não vai trazer os times brasileiros").

O EA FC não tem Brasil (só 12% da Série A tinha lado de verdade). A ESPN (aberta, a mesma dos elencos) mostra em cada
jogo a posição exata de quem começou: LB, RB, LW, RF, AM-L... Aqui contamos, por jogador, quantas vezes ele começou de
cada lado e como ponta, nos últimos jogos de cada clube que tem elenco da ESPN (tools/espn/<clube>.json).

Uso (na raiz):
  python3 tools/craque_espn_lados.py baixar   # calendário + súmulas -> tools/espn/jogos/ (cache, fora do git) e tools/espn/lados.json
  python3 tools/craque_api_elencos.py gerar   # junta com o lado do EA dentro de craque/src/real-squads.js (side e pt)

lados.json: { 'e<id da ESPN>': [esquerda, direita, ponta, centroavante, volante, meia, zagueiro, lateral] } (vezes que começou assim).
"""
import json, os, sys, time, glob, urllib.request, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDIR = os.path.join(ROOT, 'tools', 'espn')
JDIR = os.path.join(EDIR, 'jogos')
OUT = os.path.join(EDIR, 'lados.json')
ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/'
ULT = 40  # últimos jogos de cada clube (a temporada inteira)

# Posição da ESPN -> lado e papel, pela formação do jogo (a ESPN muda o nome conforme a formação: no 4-2-3-1 os dois
# volantes são LM/RM e os pontas AM-L/AM-R; no 4-3-3 os meias são LM/RM e os pontas LF/RF; CF-L/CF-R são pontas por
# dentro com um F no meio, e dupla de ataque sem ele)
def papel(pos, ps):
    """Devolve (lado 'E'/'D'/None, papéis) para uma posição, sabendo as outras posições do mesmo time (ps)."""
    E, D_ = ('E', None), ('D', None)
    if pos in ('LB', 'LWB'):
        return 'E', ()
    if pos in ('RB', 'RWB'):
        return 'D', ()
    if pos in ('F', 'CF', 'ST', 'SS', 'RCF', 'LCF'):
        return None, ('ca',)
    if pos in ('LF', 'RF'):
        return ('E' if pos == 'LF' else 'D'), ('pt',)
    if pos in ('AM-L', 'AM-R'):
        return ('E' if pos == 'AM-L' else 'D'), ('pt', 'mei')
    if pos == 'AM':
        return None, ('mei',)
    if pos in ('DM', 'DM-L', 'DM-R', 'CM'):
        return None, ('vol',)
    if pos in ('CM-L', 'CM-R'):
        return None, (('mei',) if ps & {'DM', 'CM', 'SW'} else ('vol',))
    if pos in ('LM', 'RM'):
        if 'AM-L' in ps:  # 4-2-3-1: são os volantes
            return None, ('vol',)
        if 'LF' in ps:    # 4-3-3: são os meias
            return None, ('mei',)
        return ('E' if pos == 'LM' else 'D'), ('pt', 'mei')
    if pos in ('CF-L', 'CF-R'):
        if 'F' in ps:     # 3-4-2-1, 3-4-3: pontas por dentro
            return ('E' if pos == 'CF-L' else 'D'), ('pt', 'mei')
        return None, ('ca',)
    return None, ()


def get(path):
    for k in range(4):
        try:
            req = urllib.request.Request(ESPN + path, headers={'User-Agent': 'climbix-elencos'})
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:  # rede instável: tenta de novo
            if k == 3:
                print('  falhou %s: %s' % (path, e))
                return None
            time.sleep(2 * (k + 1))


def baixar():
    os.makedirs(JDIR, exist_ok=True)
    jogos = {}  # evento -> liga
    times = []
    for f in sorted(glob.glob(os.path.join(EDIR, '*.json'))):
        if f.endswith('lados.json'):
            continue
        d = json.load(open(f))
        if d.get('lg') and d.get('team'):
            times.append((d['lg'], d['team']))

    def cal(t):
        d = get('%s/teams/%s/schedule' % t) or {}
        ev = [e for e in d.get('events', []) if e['competitions'][0]['status']['type'].get('completed')]
        ev.sort(key=lambda e: e['date'])
        return [(e['id'], t[0]) for e in ev[-ULT:]]
    with cf.ThreadPoolExecutor(6) as ex:
        for L in ex.map(cal, times):
            jogos.update(dict(L))
    print('%d clubes, %d jogos' % (len(times), len(jogos)))

    def sumula(item):
        ev, lg = item
        fn = os.path.join(JDIR, ev + '.json')
        if os.path.exists(fn):
            return
        d = get('%s/summary?event=%s' % (lg, ev))
        if not d:
            return
        ros = [{'f': r.get('formation') or '', 'p': [[a['athlete']['id'], (a.get('position') or {}).get('abbreviation')] for a in r.get('roster', []) if a.get('starter')]}
               for r in d.get('rosters', [])]
        json.dump(ros, open(fn, 'w'), separators=(',', ':'))
    with cf.ThreadPoolExecutor(6) as ex:
        list(ex.map(sumula, jogos.items()))
    contar(set(jogos))


def contar(evs=None):
    n = {}
    for f in glob.glob(os.path.join(JDIR, '*.json')):
        if evs is not None and os.path.basename(f)[:-5] not in evs:
            continue
        for team in json.load(open(f)):
            ps = {p for _, p in team['p']}
            for pid, pos in team['p']:
                c = n.setdefault('e' + pid, [0] * 8)
                sd, pp = papel(pos, ps)
                c[0] += sd == 'E'
                c[1] += sd == 'D'
                c[2] += 'pt' in pp
                c[3] += 'ca' in pp
                c[4] += 'vol' in pp
                c[5] += 'mei' in pp
                c[6] += pos in ('CD', 'CD-L', 'CD-R', 'SW')
                c[7] += pos in ('LB', 'RB', 'LWB', 'RWB')
    n = {k: v for k, v in n.items() if any(v)}
    json.dump(dict(sorted(n.items())), open(OUT, 'w'), separators=(',', ':'))
    print('lados.json: %d jogadores com lado ou papel' % len(n))


if __name__ == '__main__':
    a = sys.argv[1:] or ['baixar']
    baixar() if a[0] == 'baixar' else contar()
