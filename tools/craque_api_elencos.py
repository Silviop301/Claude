#!/usr/bin/env python3
"""Elencos reais da API-Football (api-sports.io) para o Modo Treinador.

O plano grátis dá 100 chamadas por dia e libera o ELENCO ATUAL de cada clube (/players/squads: nome, idade,
número, posição, foto). Estatísticas de 2025/2026 não vêm no grátis, então a força continua calculada pelo jogo.

Passos (da raiz do repositório; a chave fica na variável de ambiente APIFOOTBALL_KEY, nunca no código):
  python3 tools/craque_api_elencos.py status                 # quantas chamadas ainda restam hoje (não gasta)
  python3 tools/craque_api_elencos.py ids                    # liga cada clube do jogo ao id do time na API (1 chamada, uma vez)
  python3 tools/craque_api_elencos.py baixar [--max 80] [--ligas bra-a,bra-b] [--dias 30]
                                                             # baixa elencos aos poucos: primeiro quem nunca veio, depois os
                                                             # mais antigos que --dias; para em --max ou quando a cota do dia acaba
  python3 tools/craque_api_elencos.py espn [--ligas bra.1,bra.2]   # elencos da ESPN (sem chave, sem cota): Série A e B,
                                                             # com jogos como titular na temporada (ordena quem joga)
  python3 tools/craque_api_elencos.py gerar                  # escreve craque/src/real-squads.js com o que já foi baixado

Tudo que vem da API fica em tools/api-football/ (teams_<país>.json, ids.json, squads/<id>.json), para nunca
gastar duas vezes a mesma chamada; os da ESPN em tools/espn/. No gerar, a ESPN vale antes da API-Football.
Clube sem elenco baixado continua com o elenco sorteado.
"""
import json, os, sys, time, unicodedata, re, subprocess, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'tools', 'api-football')
SQ = os.path.join(DIR, 'squads')
OUT = os.path.join(ROOT, 'craque', 'src', 'real-squads.js')
BASE = 'https://v3.football.api-sports.io'
COUNTRY = {'Brasil': 'Brazil'}  # países já ligados (nome no jogo -> nome na API)

# Quando o nome sozinho engana (vários "Botafogo", "América", "Operário"...), o id certo vai aqui.
# Conferido à mão em 2026-11-09 com a lista /teams?country=Brazil.
MANUAL = {
    'bra-c-18': 13975,  # Athletic-MG (São João del-Rei)
    'bra-b-9': 125,     # América-MG
    'bra-b-15': 144,    # Atlético-GO
    'bra-a-14': 134,    # Athletico-PR
    'bra-a-15': 794,    # Red Bull Bragantino
    'bra-d-11': 2217,   # Operário-MS (Operário Ferroviário de Campo Grande)
}


def key():
    k = os.environ.get('APIFOOTBALL_KEY', '').strip()
    if not k:
        sys.exit('Falta a variável APIFOOTBALL_KEY (Configurações do projeto > ambiente > Variáveis de ambiente).')
    return k


def call(path, **q):
    url = BASE + path + ('?' + urllib.parse.urlencode(q) if q else '')
    req = urllib.request.Request(url, headers={'x-apisports-key': key()})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if d.get('errors'):
        raise RuntimeError('API: %s' % d['errors'])
    return d


def status():
    r = call('/status')['response']
    q = r['requests']
    return r['subscription']['plan'], q['current'], q['limit_day']


def clubs(todos=False):
    """Clubes do jogo nos países ligados (todos=True: de todos os países): [id, nome, liga, força, país]."""
    js = ("const D=require('./craque/src/data.js');console.log(JSON.stringify(D.CLUBS.map(c=>"
          "[c.id,c.name,c.league,c.strength,D.LEAGUE_BY_ID[c.league].country])))")
    out = subprocess.check_output(['node', '-e', js], cwd=ROOT)
    return [c for c in json.loads(out) if todos or c[4] in COUNTRY]


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def load(p, dflt=None):
    try:
        with open(p) as f:
            return json.load(f)
    except FileNotFoundError:
        return dflt


def save(p, d):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))


def cmd_ids():
    ids = load(os.path.join(DIR, 'ids.json'), {})
    for cty, api in COUNTRY.items():
        p = os.path.join(DIR, 'teams_%s.json' % norm(api).replace(' ', '_'))
        teams = load(p)
        if teams is None:
            teams = [{'id': t['team']['id'], 'name': t['team']['name'], 'code': t['team']['code'], 'national': t['team']['national'],
                      'city': (t.get('venue') or {}).get('city'), 'founded': t['team']['founded']}
                     for t in call('/teams', country=api)['response']]
            save(p, teams)
        teams = [t for t in teams if not t['national']]
        for cid, name, lg, st, c in clubs():
            if c != cty:
                continue
            if cid in MANUAL:
                ids[cid] = MANUAL[cid]; continue
            n = norm(name)
            hit = [t for t in teams if norm(t['name']) == n] or [t for t in teams if norm(t['name']).startswith(n + ' ')]
            # O de id menor é o time principal (os femininos, sub-20 e B vêm depois)
            hit = [t for t in hit if not re.search(r'\b(w|u\d\d|ii|b|women|fem)\b', norm(t['name']))]
            hit.sort(key=lambda t: t['id'])
            if hit:
                ids.setdefault(cid, hit[0]['id'])
                if len(hit) > 1:
                    print('confira  %-22s -> %s' % (name, ', '.join('%d %s (%s)' % (t['id'], t['name'], t['city']) for t in hit[:4])))
            else:
                print('SEM ID   %-22s (ponha em MANUAL)' % name)
    save(os.path.join(DIR, 'ids.json'), ids)
    print('%d clubes com id em tools/api-football/ids.json' % len(ids))


def cmd_baixar(mx, ligas, dias):
    ids = load(os.path.join(DIR, 'ids.json'), {})
    plan, used, lim = status()
    left = lim - used - 1
    print('plano %s: %d de %d chamadas usadas hoje' % (plan, used, lim))
    now = time.time()
    todo = []
    for cid, name, lg, st, c in clubs():
        if cid not in ids or (ligas and lg not in ligas):
            continue
        d = load(os.path.join(SQ, '%d.json' % ids[cid]))
        age = now - d['t'] if d else 1e12
        if age > dias * 86400:
            todo.append((age, -st, cid, name))
    todo.sort(reverse=True)  # nunca baixados primeiro; entre eles, os mais fortes
    n = min(mx, left, len(todo))
    print('%d elencos para baixar, %d agora' % (len(todo), n))
    for age, st, cid, name in todo[:n]:
        tid = ids[cid]
        r = call('/players/squads', team=tid)['response']
        pl = r[0]['players'] if r else []
        save(os.path.join(SQ, '%d.json' % tid), {'t': int(time.time()), 'team': tid, 'players': pl})
        print('  %-22s %2d jogadores' % (name, len(pl)))
        time.sleep(6.5)  # o grátis aceita 10 por minuto
    print('faltam %d; rode de novo amanhã para continuar' % (len(todo) - n) if len(todo) > n else 'tudo em dia')


# ---------- gerar o arquivo do jogo ----------
POS = {'Goalkeeper': 'GOL', 'Defender': 'DEF', 'Midfielder': 'MEI', 'Attacker': 'ATA'}
LAT_NUM = {2, 6, 12, 13, 16, 22, 26, 36, 46, 66}  # a API não separa zagueiro de lateral: no Brasil o número costuma dizer


def short(n):
    """'A. Rossi' fica assim; nomes de uma palavra (Pedro, Arrascaeta) também."""
    return re.sub(r'\s+', ' ', n).strip()


# ---------- ESPN (site.api.espn.com, aberta): times da liga e elenco com números da temporada ----------
EDIR = os.path.join(ROOT, 'tools', 'espn')
ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/'
# Nome na ESPN que não bate sozinho com o do jogo
ESPN_NAME = {'Vasco da Gama': 'Vasco', 'Athletic': 'Athletic-MG', 'Atlético Goianiense': 'Atlético-GO', 'Operário PR': 'Operário-PR',
             'América Mineiro': 'América-MG', 'Internazionale': 'Inter de Milão', 'FC Cologne': 'Köln', 'Hamburg SV': 'Hamburgo',
             'Paris Saint-Germain': 'PSG', 'Stade Rennais': 'Rennes',
             'Kasimpasa': 'Kasımpaşa', 'Erzurum BB': 'Erzurumspor', 'Amed SFK': 'Amedspor', 'Guadalajara': 'Chivas'}


def espn_get(path):
    req = urllib.request.Request(ESPN + path, headers={'User-Agent': 'climbix-elencos'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


# Liga da ESPN -> liga do jogo (as de fora do Brasil entraram em 2026-11-11: antes só Série A e B tinham nomes reais)
ESPN_LG = {'bra.1': 'bra-a', 'bra.2': 'bra-b', 'esp.1': 'esp', 'eng.1': 'ing', 'ita.1': 'ita', 'ger.1': 'ale', 'fra.1': 'fra',
           'por.1': 'por', 'ned.1': 'ned', 'arg.1': 'arg', 'usa.1': 'usa', 'ksa.1': 'ara', 'tur.1': 'tur', 'mex.1': 'mex'}
FORA = [k for k in ESPN_LG if not k.startswith('bra.')]
STOP = {'fc', 'cf', 'ac', 'as', 'sc', 'afc', 'club', 'de', 'da', 'do', 'la', 'cd', 'sv', 'tsg', 'vfb', 'rc', '1', 'aj', 'sl', 'cp', 'and', 'hove', 'albion'}


def toks(s):
    return {w for w in norm(s).split() if w not in STOP}


def match(nm, cands):
    """Clube do jogo com o nome da ESPN: primeiro o nome igual, depois o que mais divide palavras (Atlético de Madrid,
    Atlético Madrid; Bayern de Munique, Bayern Munich). Só nomes de clubes do jogo ainda sem par (cands: [id, nome])."""
    n = norm(nm)
    for cid, name in cands:
        if norm(name) == n:
            return cid
    best, bs = None, 0
    for cid, name in cands:
        a, b = toks(nm), toks(name)
        sc = len(a & b) + 0.5 * sum(1 for x in a for y in b if x != y and len(x) >= 4 and (x.startswith(y[:5]) or y.startswith(x[:5])))
        if sc > bs:
            best, bs = cid, sc
    return best if bs >= 1 else None


def cmd_espn(ligas):
    allc = clubs(True)
    byname = {norm(c[1]): c[0] for c in allc}
    for lg in ligas:
        teams = espn_get(lg + '/teams')['sports'][0]['leagues'][0]['teams']
        livres = [[c[0], c[1]] for c in allc if c[2] == ESPN_LG.get(lg)]
        teams = [t['team'] for t in teams]
        par = {}
        # Primeiro os nomes iguais (Gimnasia La Plata não pode ir para o Gimnasia de Mendoza), depois os parecidos
        for fuzzy in (False, True):
            for t in teams:
                nm = ESPN_NAME.get(t['displayName'], t['displayName'])
                if t['id'] in par:
                    continue
                if lg.startswith('bra.'):
                    cid = byname.get(norm(nm))
                else:
                    cid = match(nm, livres) if fuzzy else next((c[0] for c in livres if norm(c[1]) == norm(nm)), None)
                if cid:
                    par[t['id']] = cid
                    livres = [c for c in livres if c[0] != cid]
        for c in livres:
            print('clube do jogo sem par na ESPN: %s' % c[1])
        for t in teams:
            nm = ESPN_NAME.get(t['displayName'], t['displayName'])
            cid = par.get(t['id'])
            if not cid:
                if 'TBD' not in nm:
                    print('sem clube no jogo: %s (%s)' % (t['displayName'], t['id']))
                continue
            if not lg.startswith('bra.') and norm(nm) != norm(dict((c[0], c[1]) for c in allc)[cid]):
                print('  %s = %s' % (nm, dict((c[0], c[1]) for c in allc)[cid]))
            r = espn_get('%s/teams/%s/roster' % (lg, t['id']))
            pl = []
            for a in r.get('athletes', []):
                st = {}
                for cat in ((a.get('statistics') or {}).get('splits') or {}).get('categories', []):
                    for x in cat.get('stats', []):
                        if x['name'] in ('appearances', 'subIns', 'totalGoals', 'goalAssists', 'totalShots', 'foulsSuffered', 'saves', 'goalsConceded'):
                            st[x['name']] = int(x.get('value') or 0)
                pl.append({'id': a['id'], 'name': a.get('displayName'), 'short': a.get('shortName'), 'age': a.get('age'),
                           'num': int(a['jersey']) if str(a.get('jersey') or '').isdigit() else 0,
                           'pos': (a.get('position') or {}).get('abbreviation'), 'cty': a.get('citizenship'),
                           'app': st.get('appearances', 0), 'sub': st.get('subIns', 0), 'g': st.get('totalGoals', 0), 'a': st.get('goalAssists', 0),
                           # para os atributos (coach.js, mkAttrs): chutes, faltas sofridas, altura (polegadas), peso (libras), defesas e gols sofridos
                           'sh': st.get('totalShots', 0), 'fs': st.get('foulsSuffered', 0), 'h': int(a.get('height') or 0), 'w': int(a.get('weight') or 0),
                           'sv': st.get('saves', 0), 'gc': st.get('goalsConceded', 0)})
            save(os.path.join(EDIR, '%s.json' % cid), {'t': int(time.time()), 'lg': lg, 'team': t['id'], 'players': pl})
            print('  %-22s %2d jogadores' % (nm, len(pl)))
            time.sleep(0.5)


# ---------- gerar o arquivo do jogo ----------
POS = {'Goalkeeper': 'GOL', 'Defender': 'DEF', 'Midfielder': 'MEI', 'Attacker': 'ATA', 'G': 'GOL', 'D': 'DEF', 'M': 'MEI', 'F': 'ATA'}
LAT_NUM = {2, 6, 12, 13, 16, 22, 26, 36, 46, 66}  # as fontes não separam zagueiro de lateral: no Brasil o número costuma dizer


def short(n):
    return re.sub(r'\s+', ' ', n or '').strip()


def squads():
    """Por clube: lista de [id com fonte, nome, idade, posição, número, titular, entrou, e da ESPN gols, assistências, chutes,
    faltas sofridas, altura, peso, defesas, gols sofridos] (titular/entrou -1 sem números)."""
    ids = load(os.path.join(DIR, 'ids.json'), {})
    data = {}
    for cid, name, lg, st, c in clubs(True):
        e = load(os.path.join(EDIR, '%s.json' % cid))
        if e and len(e['players']) >= 16:
            data[cid] = (e['t'], [['e%s' % p['id'], short(p['name'] if len(p['name'] or '') <= 18 else p['short']), p['age'] or 25,
                                   POS.get(p['pos']), p['num'], p['app'] - p['sub'], p['sub']] +
                                  ([p['g'], p['a'], p['sh'], p['fs'], p['h'], p['w'], p['sv'], p['gc']] if 'sh' in p else [])
                                  for p in e['players']])
            continue
        d = cid in ids and load(os.path.join(SQ, '%d.json' % ids[cid]))
        if d and len(d['players']) >= 16:
            data[cid] = (d['t'], [['a%s' % p['id'], short(p.get('name')), p.get('age') or 25, POS.get(p.get('position')),
                                   p.get('number') or 0, -1, -1] for p in d['players'] if p.get('id')])
    # Mesmo jogador em dois clubes (trocou entre um download e outro): fica no baixado por último
    last = {}
    for cid, (t, rows) in data.items():
        for r in rows:
            if t >= last.get(r[0], (0, ''))[0]:
                last[r[0]] = (t, cid)
    return {cid: [r for r in rows if r[3] and r[1] and last[r[0]][1] == cid] for cid, (t, rows) in data.items()}


def cmd_gerar():
    out, tot = {}, 0
    for cid, rows in squads().items():
        defs = [r for r in rows if r[3] == 'DEF']
        # Defensores: os de número de lateral viram LAT; completa até ~40% laterais pelos mais novos sem número de zagueiro
        for r in defs:
            r[3] = 'LAT' if r[4] in LAT_NUM else 'ZAG'
        want = round(len(defs) * 0.42)
        lat = [r for r in defs if r[3] == 'LAT']
        for r in sorted([r for r in defs if r[3] == 'ZAG' and r[4] not in (3, 4, 14, 15, 33, 44)], key=lambda r: r[2]):
            if len(lat) >= want:
                break
            r[3] = 'LAT'; lat.append(r)
        # Arquivo leve (com 280 clubes passava de 500 KB): por posição, só quem pode entrar no elenco do jogo (coach.js
        # CO.squad) e mais 3, pelos mais usados na temporada real e pelo número de titular
        cap = {'GOL': 3, 'ZAG': 5, 'LAT': 4, 'MEI': 8, 'ATA': 5}
        use = lambda r: (r[5] + 0.4 * r[6] if r[5] >= 0 else 0) + (3 if 1 <= r[4] <= 23 else 0)
        keep = set()
        for pos, n in cap.items():
            keep |= {r[0] for r in sorted([r for r in rows if r[3] == pos], key=use, reverse=True)[:n + 3]}
        rows = [r for r in rows if r[0] in keep]
        out[cid] = [r[:5] + (r[5:] if r[5] >= 0 else []) for r in rows]
        tot += len(out[cid])
    js = ('// Gerado por tools/craque_api_elencos.py (ESPN e API-Football, elenco atual de cada clube). Não edite à mão.\n'
          '// Por clube do jogo: [id com a fonte (e ESPN, a API-Football), nome, idade, posição, número, jogos como titular, entradas,\n'
          '// e da ESPN, para os atributos: gols, assistências, chutes, faltas sofridas, altura (pol), peso (lb), defesas, gols sofridos].\n'
          '// A força é calculada pelo jogo (coach.js): quem mais começa jogando fica com a maior.\n'
          '(function (root) {\n  root.CRAQUE_REAL = { t: %d, clubs: %s };\n'
          "  if (typeof module !== 'undefined') module.exports = root.CRAQUE_REAL;\n"
          "})(typeof window !== 'undefined' ? window : globalThis);\n") % (int(time.time()), json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    with open(OUT, 'w') as f:
        f.write(js)
    print('%s: %d clubes, %d jogadores, %.1f KB' % (os.path.relpath(OUT, ROOT), len(out), tot, len(js) / 1024))


def main():
    a = sys.argv[1:] or ['status']
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    if a[0] == 'status':
        print('plano %s: %d de %d chamadas usadas hoje' % status())
    elif a[0] == 'ids':
        cmd_ids()
    elif a[0] == 'baixar':
        l = opt('--ligas', '')
        cmd_baixar(int(opt('--max', 80)), set(l.split(',')) if l else None, float(opt('--dias', 30)))
    elif a[0] == 'espn':
        l = opt('--ligas', 'bra.1,bra.2')
        cmd_espn(FORA if l == 'fora' else ESPN_LG.keys() if l == 'todas' else l.split(','))
    elif a[0] == 'gerar':
        cmd_gerar()
    else:
        print(__doc__)


if __name__ == '__main__':
    main()
