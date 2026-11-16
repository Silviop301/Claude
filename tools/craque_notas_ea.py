#!/usr/bin/env python3
"""Geral dos jogadores reais pela nota pública do EA SPORTS FC (FC 27 desde 16/11; antes FC 26) (Silvio, 2026-11-16: "o geral do Yamal tá baixo, tem uma base?").

Antes o geral do jogador real saía só da força do clube e da ordem no elenco (quem mais começou jogando na ESPN): o Yamal
ficava 76 e o Endrick 81. Agora a nota do EA FC (site público de notas da EA) decide a ORDEM e a DISTÂNCIA entre os
jogadores de cada clube, mas o NÍVEL do clube continua o do jogo: a média dos 14 melhores de cada elenco fica igual à de
antes, então a força dos clubes (Opta) e o equilíbrio não mudam.

Uso (na raiz):
  python3 tools/craque_notas_ea.py baixar     # notas do site da EA (página de notas, o jogo do ano) -> tools/ea/ea.json (fora do git; ~5 min)
  python3 tools/craque_notas_ea.py casar      # casa com os elencos (nome + idade) e grava tools/ea/ref.json
  python3 tools/craque_api_elencos.py gerar   # põe o ref.json dentro de craque/src/real-squads.js (CRAQUE_REAL.ref)

ref.json: { id do jogador ('e123'): geral - força do clube, '#<clube>': teto de quem não está na base }. Só números
nossos (a diferença para a força do clube, já acertada pelo nível do jogo), nunca a nota da EA crua; nada da EA no jogo.
Brasil e México não estão no EA FC: lá segue a conta antiga, e quem está na base com o nome inteiro vai meio a meio.
"""
import json, os, sys, time, re, unicodedata, collections, difflib, subprocess, statistics as st, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EA_DIR = os.path.join(ROOT, 'tools', 'ea')
EA_JSON = os.path.join(EA_DIR, 'ea.json')
REF_JSON = os.path.join(EA_DIR, 'ref.json')
PAGE = 'https://www.ea.com/games/ea-sports-fc/ratings?page=%d'
TOP = 14      # média dos 14 melhores do clube = nível que fica igual
MINM = 8      # clube com menos jogadores na base que isso fica com a conta antiga
MIX = 0.5     # clube fora da base: jogador casado pelo nome inteiro vai meio a meio
REF = (2026, 11, 11)  # dia do download da ESPN (idade)


def pagina(n):
    """Página n do site de notas (100 por página). O site mostra o jogo do ano (EA FC 27 desde set/2026); a API
    drop-api sozinha ainda devolve o FC 26, então as notas saem do __NEXT_DATA__ da página."""
    req = urllib.request.Request(PAGE % n, headers={'User-Agent': 'Mozilla/5.0'})
    h = urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
    d = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S).group(1))
    r = d['props']['pageProps']['ratingDetails']
    return {'items': r['items'], 'totalItems': r['totalItems']}


def baixar():
    os.makedirs(EA_DIR, exist_ok=True)
    out, n, total = [], 1, 1
    while (n - 1) * 100 < total:
        for t in range(5):
            try:
                d = pagina(n)
                break
            except Exception:
                time.sleep(2 + 3 * t)
        else:
            sys.exit('falhou na página %d' % n)
        n += 1
        total = d['totalItems']
        for p in d['items']:
            if (p.get('gender') or {}).get('id') != 0:
                continue
            out.append([p['id'], p['overallRating'], p['firstName'], p['lastName'], p.get('commonName'),
                        (p.get('birthdate') or '').split(' ')[0], (p.get('team') or {}).get('label')])
        time.sleep(0.4)
    json.dump(out, open(EA_JSON, 'w'), ensure_ascii=False)
    print('%s: %d jogadores' % (os.path.relpath(EA_JSON, ROOT), len(out)))


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s).split()


def age_of(bd):
    try:
        m, d, y = map(int, bd.split('/'))
    except Exception:
        return None
    return REF[0] - y - ((REF[1], REF[2]) < (m, d))


DUMP = r"""
process.env.NOTAS = '0';
const D = require('./craque/src/data.js'), S = require('./craque/src/sim.js'), R = require('./craque/src/real-squads.js');
const co = { rf: 0, lv: 0, rv: 0, season: 0, squad: [] }, out = [];
for (const id of Object.keys(R.clubs)) { const c = D.CLUB_BY_ID[id]; if (!c) continue;
  S.coGenSquad(id, 0, co).forEach(p => { if (p.api) out.push([id, c.name, c.strength, p.api, p.n, p.age, p.ovr]); }); }
const sel = new Set(out.map(r => r[3])), rows = [];
for (const id of Object.keys(R.clubs)) { const c = D.CLUB_BY_ID[id]; if (!c) continue;
  R.clubs[id].forEach(x => { if (!sel.has(x[0])) rows.push([id, c.name, c.strength, x[0], x[1], x[2], null]); }); }
process.stdout.write(JSON.stringify(out.concat(rows)));
"""


def casar():
    ea = json.load(open(EA_JSON))
    rows = json.loads(subprocess.run(['node', '-e', DUMP], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    game = [dict(club=r[0], cn=r[1], str=r[2], api=r[3], n=r[4], age=r[5], ovr=r[6]) for r in rows]
    idx = collections.defaultdict(list)
    for eid, ovr, fn, ln, cn, bd, team in ea:
        names = [norm('%s %s' % (fn, ln))] + ([norm(cn)] if cn else [])
        rec = dict(ovr=ovr, age=age_of(bd), names=names, team=team)
        for t in set(t for n in names for t in n):
            idx[t].append(rec)

    def score(g, e):
        gn = norm(g['n'])
        if e['age'] is None or abs(e['age'] - g['age']) > 2 or not gn:
            return 0
        far = abs(e['age'] - g['age']) == 2
        if any(n == gn for n in e['names']):
            return 10 if not far else 3
        best = 0
        for n in e['names']:
            if not n or len(gn) < 2 or gn[-1] not in n:
                continue
            f = gn[0]
            if f in n:
                best = max(best, 3)
            elif far:
                continue
            elif (len(f) == 1 and any(t[0] == f for t in n[:-1] if t)) or (len(f) > 1 and n[0] == f) or (len(f) > 3 and n[0][:4] == f[:4]):
                best = max(best, 2)
            elif len(gn) >= 3 and gn[-2] in n:
                best = max(best, 2)
        return best

    match = {}
    for g in game:
        cands = {id(e): e for t in set(norm(g['n'])) for e in idx.get(t, [])}
        sc = sorted(((score(g, e), e) for e in cands.values()), key=lambda x: -x[0])
        sc = [x for x in sc if x[0] >= 2]
        if not sc:
            continue
        if len(sc) > 1 and sc[1][0] >= sc[0][0]:
            cl = ' '.join(norm(g['cn']))
            sc = [x for x in sc if x[0] >= sc[0][0] and difflib.SequenceMatcher(None, cl, ' '.join(norm(x[1]['team'] or ''))).ratio() > 0.6]
            if len(sc) != 1:
                continue
        match[g['api']] = (sc[0][1]['ovr'], sc[0][0])

    clubs = collections.defaultdict(list)
    for g in game:
        clubs[g['club']].append(g)
    ref, deltas, skipped = {}, [], []
    for cid, ps in clubs.items():
        sel = [p for p in ps if p['ovr'] is not None]
        mt = [p for p in sel if p['api'] in match]
        if len(mt) < MINM:
            skipped.append(cid)
            continue
        s = ps[0]['str']
        now = st.mean(sorted([p['ovr'] for p in sel], reverse=True)[:TOP])
        ms = sorted([match[p['api']][0] for p in mt], reverse=True)
        cap = st.median(ms[:16]) - 2
        d0 = now - st.mean(ms[:TOP])
        val = {p['api']: match[p['api']][0] if p['api'] in match else min(p['ovr'] - d0, cap) for p in sel}
        d = now - st.mean(sorted(val.values(), reverse=True)[:TOP])
        deltas.append(d)
        for p in sel:
            ref[p['api']] = round(val[p['api']] + d - s)
        for p in ps:  # reservas fora do elenco de hoje que estão na base
            if p['ovr'] is None and p['api'] in match:
                ref[p['api']] = round(match[p['api']][0] + d - s)
        ref['#' + cid] = round(cap + d - s)
    dg = st.mean(deltas)
    mix = 0
    for cid in skipped:
        for p in clubs[cid]:
            if p['ovr'] is not None and match.get(p['api'], (0, 0))[1] == 10 and len(norm(p['n'])) >= 2:
                ref[p['api']] = round(MIX * (match[p['api']][0] + dg) + (1 - MIX) * p['ovr'] - p['str'])
                mix += 1
    json.dump(dict(sorted(ref.items())), open(REF_JSON, 'w'), separators=(',', ':'))
    print('casados %d de %d; clubes pela base %d, fora %d (%d meio a meio); EA -> jogo %.1f em média'
          % (len(match), len(game), len(clubs) - len(skipped), len(skipped), mix, dg))


if __name__ == '__main__':
    a = sys.argv[1:] or ['casar']
    {'baixar': baixar, 'casar': casar}[a[0]]()
