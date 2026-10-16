"""Construye la base de datos geoespacial para SiteScore SV (El Salvador).
Salida: site/sitedata.js  (correr desde la carpeta raíz: python3 pipeline/build_data.py)  (window.SD = {...})
- Grilla de población WorldPop R2025A 2020/2025/2030 (100 m, restringida) agregada a 500 m
- Distritos (262 ex municipios) de geoBoundaries ADM2 (dominio público), unidos por nombre a las
  proyecciones 2024 de edad y sexo (HDX COD-PS, UNFPA y DIGESTYC/ONEC) y a los 44 municipios de 2024
- Zonas de ingreso alto en San Salvador y Santa Tecla (polígonos aproximados, supuesto editable)
- Índice de poder adquisitivo (IPA): ingreso per cápita mensual por departamento, EHPM 2023 (BCR/ONEC),
  con ajustes para el AMSS, cabeceras y zonas
Entradas en data/: slv_pop_2020/2025/2030.tif, gb_adm2.geojson, gb_adm1.geojson, pop_adm3.csv,
hot/points_of_interest.geojson (solo para etiquetar polígonos sin nombre)
"""
import json, base64, re, csv, unicodedata, difflib
import numpy as np, rasterio
from shapely.geometry import shape, Point, Polygon, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely import contains_xy
from collections import Counter

F = 5  # 100 m x 5 = 500 m
d = rasterio.open('data/slv_pop_2025.tif')
a = d.read(1).astype('float64'); a[a < 0] = 0
H = (a.shape[0] // F) * F; W = (a.shape[1] // F) * F
b = a[:H, :W].reshape(H // F, F, W // F, F).sum(axis=(1, 3))
res = d.res[0] * F
x0, y1 = d.bounds.left, d.bounds.top
rows, cols = np.nonzero(b >= 5)
pops = b[rows, cols]
lon = x0 + (cols + 0.5) * res
lat = y1 - (rows + 0.5) * res
print('celdas', len(pops), 'pob', round(pops.sum()))
def agg(path):
    r = rasterio.open(path); assert r.shape == d.shape and abs(r.bounds.left - d.bounds.left) < 1e-9
    x = r.read(1).astype('float64'); x[x < 0] = 0
    return x[:H, :W].reshape(H // F, F, W // F, F).sum(axis=(1, 3))[rows, cols]
p20 = agg('data/slv_pop_2020.tif'); p30 = agg('data/slv_pop_2030.tif')
print('2020', round(p20.sum()), '2030', round(p30.sum()))

# ---------------- Distritos: geoBoundaries ADM2 + COD-PS ADM3 ----------------
norm = lambda t: re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower())
ALIAS = {'santatecla': 'nuevasansalvador', 'sanfrancisco': 'sanfranciscogotera', 'sanrafael|San Miguel': 'sanrafael',
         'ciudadilobasco': 'ilobasco', 'opico': 'opico', 'ahuachpan': 'ahuachapan', 'chalatenago': 'chalatenango',
         'sanfrancsicochinameca': 'sanfranciscochinameca', 'santodomingo|Sonsonate': 'santodomingo', 'sanantonialosranchos': 'sanantoniolosranchos',
         'sanemigdo': 'sanemigdio', 'saningnacio': 'sanignacio'}
# Correcciones de etiqueta verificadas a mano (índice del polígono en geoBoundaries -> distrito)
OVERRIDE = {45: ('Sonsonate', 'Sonsonate'), 47: ('Sonzacate', 'Sonsonate')}
a2 = json.load(open('data/gb_adm2.geojson'))['features']; a1 = json.load(open('data/gb_adm1.geojson'))['features']
g1 = [(f['properties']['shapeName'].replace('Departamento de ', ''), shape(f['geometry']).buffer(0)) for f in a1]
DEPS = sorted(set(x[0] for x in g1))
cod = [r for r in csv.DictReader(open('data/pop_adm3.csv', encoding='utf-8-sig')) if int(r['T_TL'] or 0) > 0]
# COD-PS 2024 repite el pcode y el departamento en distritos homónimos: la 1.ª fila es del departamento indicado
# y las siguientes de los otros departamentos en orden alfabético. Se reconstruye el departamento real.
grp = {}
for r in cod: grp.setdefault(r['ADM3_PCODE'] + r['ADM3_ES'], []).append(r)
for k, lst in grp.items():
    if len(lst) > 1:
        print('homónimos', lst[0]['ADM3_ES'], [x['T_TL'] for x in lst])
for r in cod: r['dep'] = r['ADM1_ES']; r['key'] = r['ADM3_PCODE'] + '#' + r['ADM3_ES']
HOMO = {'San Lorenzo': ['Ahuachapán', 'San Vicente'], 'San Isidro': ['Cabañas', 'Morazán'], 'San Fernando': ['Chalatenango', 'Morazán'],
        'San Rafael': ['Chalatenango', 'San Miguel'], 'El Carmen': ['Cuscatlán', 'La Unión'], 'El Rosario': ['Cuscatlán', 'La Paz', 'Morazán'],
        'Santo Domingo': ['San Vicente', 'Sonsonate'], 'Chilanga': ['Morazán']}
seen = Counter()
for r in cod:
    if r['ADM3_ES'] in HOMO:
        k = seen[r['ADM3_ES']]; seen[r['ADM3_ES']] += 1
        r['dep'] = HOMO[r['ADM3_ES']][min(k, len(HOMO[r['ADM3_ES']]) - 1)]
        r['key'] = r['ADM3_PCODE'] + '#' + r['ADM3_ES'] + '#' + r['dep']
        if r['dep'] != r['ADM1_ES']: r['ADM2_ES'] = ''  # municipio 2024 desconocido para el homónimo
pois = json.load(open('data/hot/points_of_interest.geojson'))['features']
pp = [((Point(f['geometry']['coordinates'][:2]) if f['geometry']['type'] == 'Point' else shape(f['geometry']).representative_point()), f['properties'].get('adm3_name'))
      for f in pois if f['geometry'] and f['properties'].get('adm3_name')]
ptree = STRtree([p[0] for p in pp])
poly = []  # (geom, row)
nulls = []
for i, f in enumerate(a2):
    g = shape(f['geometry']).buffer(0); n = f['properties']['shapeName']
    dep = max(g1, key=lambda x: x[1].intersection(g).area)[0]
    if i in OVERRIDE:
        nm, dp = OVERRIDE[i]; r = next(x for x in cod if x['ADM3_ES'] == nm and x['dep'] == dp); poly.append([g, r]); continue
    if n == 'Null': nulls.append(g); continue
    c = Counter(pp[k][1] for k in ptree.query(g, predicate='contains')); poi = c.most_common(1)[0][0] if c else None
    k = norm(n); k = ALIAS.get(k + '|' + dep, ALIAS.get(k, k))
    best = None
    for r in cod:
        a_ = norm(r['ADM3_ES']); s = difflib.SequenceMatcher(None, k, a_).ratio()
        if a_.startswith(k) or k.startswith(a_): s = max(s, .9)
        if norm(r['dep']) == norm(dep): s += .25
        if poi and norm(poi) == a_: s += .1
        if not best or s > best[0]: best = (s, r)
    if best[0] < 1.0: print('  baja confianza', i, n, dep, '->', best[1]['ADM3_ES'], best[1]['dep'], round(best[0], 2))
    poly.append([g, best[1]])
# polígonos sin nombre (esteros, islas, bolsones): se unen al distrito vecino con mayor frontera común
for g in nulls:
    nb = max(poly, key=lambda x: x[0].buffer(0.002).intersection(g).area + (1e-9 if x[0].distance(g) < 0.01 else 0))
    nb[0] = unary_union([nb[0], g]).buffer(0)
# unir polígonos del mismo distrito
dist = {}
for g, r in poly: dist.setdefault(r['key'], [r, []])[1].append(g)
D = [(r, unary_union(gs).buffer(0)) for r, gs in dist.values()]
D.sort(key=lambda x: (x[0]['dep'], x[0]['ADM3_ES']))
print('distritos', len(D), 'de', len(cod))

# ---------------- Zonas de ingreso alto (supuesto editable; polígonos aproximados) ----------------
ZONES = [  # referencia: polígonos de colonias de OpenStreetMap (Overture divisions 2026-09) para Escalón, Flor Blanca, Miramonte, San Francisco y Merliot
    ('Nueva San Salvador', 'Santa Tecla · Ciudad Merliot, Jardines de la Sabana', 2.6, [(-89.285, 13.668), (-89.252, 13.668), (-89.252, 13.697), (-89.285, 13.697)]),
    ('San Salvador', 'San Salvador · Escalón, San Benito, Maquilishuat y San Francisco', 3.0,
     [(-89.262, 13.666), (-89.226, 13.666), (-89.226, 13.690), (-89.219, 13.697), (-89.219, 13.716), (-89.262, 13.716)]),
    ('San Salvador', 'San Salvador · Flor Blanca, Miramonte, Centroamérica y Altamira', 2.0,
     [(-89.226, 13.666), (-89.212, 13.666), (-89.203, 13.692), (-89.203, 13.718), (-89.219, 13.718), (-89.219, 13.697), (-89.226, 13.690)]),
]
REST = {'San Salvador': 'San Salvador · Centro y oriente', 'Nueva San Salvador': 'Santa Tecla · Centro y resto'}

# ---------------- IPA ----------------
# EHPM 2023 (BCR/ONEC): ingreso per cápita mensual por departamento (US$); nacional 223.32; AMSS 299.90
IPC = {'Ahuachapán': 164.65, 'Santa Ana': 201.78, 'Sonsonate': 209.39, 'Chalatenango': 195.25, 'La Libertad': 239.55,
       'San Salvador': 284.16, 'Cuscatlán': 182.61, 'La Paz': 206.36, 'Cabañas': 156.56, 'San Vicente': 189.91,
       'Usulután': 172.90, 'San Miguel': 220.38, 'Morazán': 167.93, 'La Unión': 180.38}
NAT = 223.32
# EHPM 2023: personas por hogar por departamento (nacional 3.14; Censo 2024: 6,029,976 hab. / 1,920,668 hogares = 3.14)
HH = {'Ahuachapán': 3.27, 'Santa Ana': 2.96, 'Sonsonate': 3.30, 'Chalatenango': 3.08, 'La Libertad': 3.15, 'San Salvador': 3.14,
      'Cuscatlán': 3.24, 'La Paz': 3.07, 'Cabañas': 3.32, 'San Vicente': 3.01, 'Usulután': 3.00, 'San Miguel': 3.10, 'Morazán': 3.26, 'La Unión': 3.23}
RURAL = 0.85  # distritos no listados: el promedio departamental incluye la cabecera; el resto es más rural
# Ajustes por distrito (índice absoluto, nacional = 1.0). AMSS calibrado para promediar ~1.34 (EHPM 2023 AMSS / nacional)
ADJ = {'San Salvador': 1.30, 'Antiguo Cuscatlán': 2.60, 'Nueva San Salvador': 1.45, 'Nuevo Cuscatlán': 1.70,
       'Mejicanos': 1.20, 'Ayutuxtepeque': 1.25, 'Cuscatancingo': 1.05, 'Delgado': 1.00, 'Soyapango': 1.10, 'Ilopango': 1.15,
       'San Martín': 1.00, 'Apopa': 0.95, 'Tonacatepeque': 0.95, 'Nejapa': 0.85, 'San Marcos': 1.15, 'Santo Tomás': 0.95,
       'Santiago Texacuangos': 0.90, 'Panchimalco': 0.70, 'Rosario de Mora': 0.70, 'Colón': 1.05, 'Zaragoza': 1.00,
       'San José Villanueva': 1.00, 'Opico': 0.90, 'Quezaltepeque': 0.90, 'Ciudad Arce': 0.90, 'La Libertad': 1.00,
       'Santa Ana': 1.15, 'San Miguel': 1.20, 'Sonsonate': 1.15, 'Sonzacate': 1.05, 'Usulután': 1.00, 'Ahuachapán': 0.95,
       'Zacatecoluca': 0.95, 'San Vicente': 0.95, 'Cojutepeque': 1.00, 'Chalatenango': 1.00, 'Sensuntepeque': 0.90,
       'San Francisco Gotera': 0.90, 'La Unión': 0.95, 'Ilobasco': 0.85, 'Metapán': 0.95, 'Chalchuapa': 0.95, 'Acajutla': 0.90,
       'Santa Rosa de Lima': 1.00, 'Aguilares': 0.80, 'Olocuilta': 0.90, 'San Luis Talpa': 0.85}
def dep_idx(dep): return round(IPC[dep] / NAT, 2)

munis = []; geoms = []
for r, g in D:
    nm, dep = r['ADM3_ES'], r['dep']
    base = ADJ[nm] if nm in ADJ and not (nm == 'La Libertad' and dep != 'La Libertad') and not (nm == 'San Vicente' and dep != 'San Vicente') else round(dep_idx(dep) * RURAL, 2)
    zs = [z for z in ZONES if z[0] == nm and dep in ('San Salvador', 'La Libertad')]
    rest = g
    for zn in zs:
        zg = Polygon(zn[3]).intersection(g)
        if zg.is_empty: continue
        rest = rest.difference(zg)
        geoms.append(zg); munis.append({'d': dep, 'm': zn[1], 'u': r['ADM2_ES'], 'i': zn[2], 'z': 1, 'key': r['key'], 'h': HH[dep]})
    geoms.append(rest)
    munis.append({'d': dep, 'm': REST.get(nm, nm) if zs else nm, 'u': r['ADM2_ES'], 'i': base, 'key': r['key'], 'h': HH[dep], **({'z': 1} if zs else {'po': int(r['T_TL'])})})
for k, m in enumerate(munis):
    rp = geoms[k].representative_point(); m['id'] = k; m['la'] = round(rp.y, 4); m['lo'] = round(rp.x, 4)

mid = np.full(len(pops), -1, dtype=np.int32)
for gi, gm in enumerate(geoms):
    m = contains_xy(gm, lon, lat); mid[m & (mid < 0)] = gi
tree = STRtree(geoms)
for k in np.nonzero(mid < 0)[0]: mid[k] = tree.nearest(Point(lon[k], lat[k]))
mp = np.bincount(mid, weights=pops, minlength=len(munis))
for m in munis: m['p'] = int(round(mp[m['id']]))

# Edad y sexo (COD-PS 2024): 15 bandas; 70+ = 70-74 + 75-79 + 80+
BANDS = ['00_04', '05_09', '10_14', '15_19', '20_24', '25_29', '30_34', '35_39', '40_44', '45_49', '50_54', '55_59', '60_64', '65_69']
prof = {}
for r in cod:
    v = [float(r['F_' + x]) for x in BANDS] + [float(r['F_70_74']) + float(r['F_75_79']) + float(r['F_80Plus'])] + \
        [float(r['M_' + x]) for x in BANDS] + [float(r['M_70_74']) + float(r['M_75_79']) + float(r['M_80Plus'])]
    prof[r['key']] = v
AGES = []; akey = {}
for m in munis:
    v = prof[m['key']]; t = sum(v); sh = tuple(round(x / t, 4) for x in v)
    if sh not in akey: akey[sh] = len(AGES); AGES.append(list(sh))
    m['a'] = akey[sh]

# Normalización: promedio nacional ponderado por población = 1.00
w = sum(m['p'] * m['i'] for m in munis) / sum(m['p'] for m in munis)
print('IPA medio antes de normalizar', round(w, 3))
for m in munis: m['i'] = round(m['i'] / w, 2)
amss = ['San Salvador', 'Mejicanos', 'Ayutuxtepeque', 'Cuscatancingo', 'Delgado', 'Soyapango', 'Ilopango', 'San Martín', 'Apopa',
        'Tonacatepeque', 'Nejapa', 'San Marcos', 'Antiguo Cuscatlán', 'Nueva San Salvador']
am = [m for m in munis if any(m['key'].split('#')[1] == a for a in amss) and m['d'] in ('San Salvador', 'La Libertad')]
print('IPA AMSS', round(sum(m['p'] * m['i'] for m in am) / sum(m['p'] for m in am), 3), '(objetivo EHPM 1.34)')
for m in munis: del m['key']

out_f = []
for i, gm in enumerate(geoms):
    s = gm.simplify(0.0012, preserve_topology=True)
    gj = mapping(s)
    def rnd(c):
        if isinstance(c[0], (float, int)): return [round(c[0], 4), round(c[1], 4)]
        return [rnd(x) for x in c]
    if gj['type'] == 'GeometryCollection':
        ps = [x for x in s.geoms if x.geom_type in ('Polygon', 'MultiPolygon')]; gj = mapping(unary_union(ps))
    gj = {'type': gj['type'], 'coordinates': rnd(gj['coordinates'])}
    out_f.append({'type': 'Feature', 'properties': {'id': i}, 'geometry': gj})

b64 = lambda arr: base64.b64encode(arr.tobytes()).decode()
SD = {
  'meta': {'res': res, 'src': 'WorldPop R2025A 2020/2025/2030 (100 m, constrained) agregado a 500 m; geoBoundaries ADM2; EHPM 2023; COD-PS 2024 edad y sexo',
           'n': int(len(pops)), 'pop': int(round(pops.sum())), 'iso': 'SLV'},
  'grid': {'x0': x0, 'y1': y1}, 'r': b64(rows.astype('<u2')), 'c': b64(cols.astype('<u2')),
  'pop': b64(np.minimum(np.round(pops), 65535).astype('<u2')), 'mid': b64(mid.astype('<u2')), 'munis': munis,
  'p20': b64(np.minimum(np.round(p20), 65535).astype('<u2')), 'p30': b64(np.minimum(np.round(p30), 65535).astype('<u2')),
  'ages': AGES, 'bands': ['0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70+'],
  'geo': {'type': 'FeatureCollection', 'features': out_f},
}
s = 'window.SD=' + json.dumps(SD, ensure_ascii=False, separators=(',', ':')) + ';'
open('site/sitedata.js', 'w', encoding='utf-8').write(s)
print('size KB', len(s.encode()) // 1024, 'registros', len(munis))
print([(m['m'], m['p'], m['i']) for m in sorted(munis, key=lambda m: -m['p'])[:16]])
print([(m['m'], m['p'], m['i']) for m in munis if m.get('z')])
