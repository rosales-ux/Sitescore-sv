"""Comercios y generadores de tráfico de El Salvador desde el export HOT/OSM de HDX (actualización mensual).
Fuente: https://data.humdata.org/dataset/hotosm_slv_points_of_interest
Descarga: https://production-raw-data-api.s3.amazonaws.com/ISO3/SLV/points_of_interest/hotosm_slv_points_of_interest_osm_geojson.zip
Salida: site/pois.js  {giros: {COD: [[lat, lon, marca, nombre], ...]}, gens: [[lat, lon, tipo, nombre], ...], fecha}
"""
import json, re, sys, os
from shapely.geometry import shape

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/hot/points_of_interest.geojson'
d = json.load(open(SRC))

GIRO_TAGS = {
    'SUP': {'shop': ['supermarket', 'wholesale', 'hypermarket'], 'amenity': ['marketplace']},
    'FAR': {'amenity': ['pharmacy'], 'shop': ['chemist']},
    'RAP': {'amenity': ['fast_food']},
    'RES': {'amenity': ['restaurant', 'cafe']},
    'GAS': {'amenity': ['fuel']},
    'FER': {'shop': ['hardware', 'doityourself', 'paint', 'trade']},
    'CON': {'shop': ['convenience']},
    'BAN': {'amenity': ['bank']},
    'ROP': {'shop': ['clothes', 'shoes', 'second_hand']},
    'PAN': {'shop': ['bakery', 'pastry']},
}
GEN_TAGS = {('shop', 'mall'): 'M', ('amenity', 'marketplace'): 'K', ('amenity', 'school'): 'E',
            ('amenity', 'university'): 'E', ('amenity', 'college'): 'E', ('amenity', 'hospital'): 'O',
            ('amenity', 'clinic'): 'O', ('amenity', 'bus_station'): 'U'}
# marcas de El Salvador: (regex sobre el nombre en minúsculas, clave)
BRANDS = {
    'SUP': [(r'walmart', 'WM'), (r'despensa (de )?don juan', 'DDJ'), (r'maxi ?despensa', 'MX'), (r'despensa familiar', 'DF'),
            (r'selectos market', 'SMK'), (r's[uú]per ?selectos|^selectos', 'SS'), (r'pricesmart', 'PS'), (r'econom[aá]s', 'ECM'),
            (r'tengo', 'TEN')],
    'FAR': [(r'san nicol[aá]s', 'SNI'), (r'econ[oó]mica', 'ECO'), (r'virgen de guadalupe|farmacias? guadalupe', 'VDG'), (r'la buena', 'LBU'),
            (r'camila', 'CAM'), (r'san rey', 'SRE'), (r'farmacias? uno\b', 'UNO'), (r'san benito', 'SBE'), (r'san roque', 'SRO'),
            (r'brasil', 'BRA'), (r'cefafa', 'CEF'), (r'farma ?value', 'FVA'), (r'las am[eé]ricas', 'AME')],
    'RAP': [(r'mc ?donald', 'MCD'), (r'campero', 'CAM'), (r'don pollo', 'DPO'), (r'pollo campestre', 'PCA'), (r'burger king', 'BK'),
            (r"wendy", 'WEN'), (r'subway', 'SUB'), (r"papa john", 'PJ'), (r'little caesar', 'LC'), (r'\bkfc\b', 'KFC'),
            (r'china wok', 'CWK'), (r'mister donut', 'MDO'), (r'taco bell', 'TB'), (r'domino', 'DOM'), (r'la never[ií]a', 'NEV'),
            (r'pizza hut', 'PH'), (r'biggest', 'BIG'), (r'quiznos', 'QZ'), (r'pinulito', 'PIN')],
    'RES': [(r'starbucks', 'STB'), (r'the coffee cup', 'TCC'), (r'juan valdez', 'JVA'), (r"shaw'?s", 'SHA'), (r'pizza hut', 'PH'),
            (r"caliche'?s", 'CAL'), (r'los cebollines', 'CEB'), (r'sarita', 'SAR'), (r"denny'?s", 'DEN'), (r'kreef', 'KRE'),
            (r'buffalo wings', 'BWI'), (r'la pampa', 'PAM'), (r'mister donut', 'MDO'), (r'pollo campero|campero', 'CAM'),
            (r'don pollo', 'DPO'), (r'pollo campestre', 'PCA'), (r'san mart[ií]n', 'SMA'), (r'go green', 'GGR')],
    'GAS': [(r'\buno\b', 'UNO'), (r'puma', 'PUM'), (r'texaco', 'TEX'), (r'\bdlc\b', 'DLC'), (r'\balba\b', 'ALB'), (r'shell', 'SHE'),
            (r'esso', 'ESS'), (r'toro', 'TOR')],
    'FER': [(r'\bepa\b', 'EPA'), (r'vidr[ií]', 'VID'), (r'freund', 'FRE'), (r'sherwin', 'SHW'), (r'comex', 'CMX'), (r'galvanissa', 'GAL'),
            (r'lemus', 'LEM'), (r'sumersa', 'SUM'), (r'ferrominera', 'FMI'), (r'didelco', 'DID'), (r'constru ?f[aá]cil', 'CFA'),
            (r'casa de la herramienta', 'CHE')],
    'CON': [(r'texaco|star ?mart|food mart', 'TEX'), (r'\buno\b', 'UNO'), (r'pronto', 'PRO'), (r'puma', 'PUM'), (r'road market', 'RMK'),
            (r'tengo', 'TEN')],
    'BAN': [(r'cajero|atm', 'ATM'), (r'agr[ií]cola', 'AGR'), (r'davivienda', 'DAV'), (r'cuscatl[aá]n|scotiab|citi', 'CUS'),
            (r'\bbac\b|credomatic|am[eé]rica central', 'BAC'), (r'hipotecario', 'HIP'), (r'azteca', 'AZT'), (r'prom[eé]rica', 'PRO'),
            (r'fomento agropecuario|\bbfa\b', 'BFA'), (r'procredit', 'PCR'), (r'industrial', 'BI'), (r'banco azul', 'AZU'),
            (r'atl[aá]ntida', 'ATL'), (r'bancovi', 'BVI'), (r'caja[s]? de cr[eé]dito|fedecr', 'FED'), (r'credicomer', 'CRE'),
            (r'abank', 'ABK'), (r'g ?& ?t|continental', 'GYT')],
    'ROP': [(r'siman', 'SIM'), (r'lee shoe', 'LEE'), (r'pierre cardin', 'PCD'), (r'\bpar ?-? ?2\b|\bpar\b', 'PAR'), (r'\badoc\b', 'ADO'),
            (r'^md\b', 'MD'), (r'payless', 'PAY'), (r'megapaca', 'MPC'), (r'rio do brasil', 'RDB'), (r'prisma ?moda', 'PRI'),
            (r"st\.? jack", 'STJ'), (r'bomba', 'BOM'), (r'ropa americana|paca', '_P')],
    'PAN': [(r'el rosario', 'ROS'), (r'la tecle[ñn]a', 'TEC'), (r'lilian', 'LIL'), (r'lorena', 'LOR'), (r'ban ?ban', 'BAN'),
            (r'g[eé]nesis', 'GEN'), (r'santa eduvi', 'SED'), (r'mister pan', 'MPA'), (r'san mart[ií]n', 'SMA'), (r'pasteler[ií]a francesa', 'PFR')],
}
REV = {}
for g, t in GIRO_TAGS.items():
    for k, vals in t.items():
        for v in vals: REV.setdefault((k, v), []).append(g)

out = {g: [] for g in GIRO_TAGS}; gens = []; seen = set()
for f in d['features']:
    p = f['properties']; geom = f['geometry']
    if geom is None: continue
    if geom['type'] == 'Point': lo, la = geom['coordinates'][:2]
    else:
        c = shape(geom).representative_point(); lo, la = c.x, c.y
    if not (13.0 < la < 14.5 and -90.2 < lo < -87.6): continue
    name = (p.get('name') or '').strip()
    nl = name.lower()
    tags = [(k, p.get(k)) for k in ('amenity', 'shop') if p.get(k)]
    # Walmart Supercenter aparece como tienda por departamentos: se cuenta como supermercado
    if ('shop', 'department_store') in tags:
        # Walmart Supercenter se cuenta como supermercado y Siman como ropa; las demás tiendas por departamentos se omiten
        tags = [('shop', 'supermarket')] if 'walmart' in nl else [('shop', 'clothes')] if 'siman' in nl else [t for t in tags if t != ('shop', 'department_store')]
    for k, v in tags:
        gt = GEN_TAGS.get((k, v))
        if gt:
            key = ('G', gt, round(la, 4), round(lo, 4))
            if key not in seen:
                seen.add(key); gens.append([round(la, 5), round(lo, 5), gt, name[:40]])
        for g in REV.get((k, v), []):
            b = ''
            for rx, code in BRANDS.get(g, []):
                if re.search(rx, nl): b = code; break
            if not b and v in ('wholesale',): b = '_W'
            if not b and v in ('marketplace',): b = '_K'
            if not b and v in ('doityourself',): b = '_D'
            if not b and v in ('second_hand',): b = '_P'
            key = (g, b or nl, round(la, 3), round(lo, 3))
            if key in seen: continue
            seen.add(key)
            out[g].append([round(la, 5), round(lo, 5), b, name[:40]])

fecha = None
rd = os.path.join(os.path.dirname(SRC), 'README.txt')
if os.path.exists(rd):
    m = re.search(r'Snapshot:\s*(\S+)', open(rd).read())
    if m: fecha = m.group(1)
open('site/pois.js', 'w', encoding='utf-8').write('window.SP=' + json.dumps({'giros': out, 'gens': gens, 'fecha': fecha}, ensure_ascii=False, separators=(',', ':')) + ';')
print({g: len(v) for g, v in out.items()}, 'gens', len(gens), 'fecha', fecha)
from collections import Counter
for g in out:
    c = Counter(x[2] for x in out[g]); print(g, c.most_common(14))
