(function(){
'use strict';
const SD = window.SD, SP = window.SP;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const nf0 = new Intl.NumberFormat('es-SV', {maximumFractionDigits: 0});
const nf1 = new Intl.NumberFormat('es-SV', {maximumFractionDigits: 1, minimumFractionDigits: 1});
const nf2 = new Intl.NumberFormat('es-SV', {maximumFractionDigits: 2, minimumFractionDigits: 2});
const fN = v => nf0.format(Math.round(v));
const CUR = 'US$';
const fQ = v => Math.abs(v) >= 1e6 ? CUR + ' ' + nf2.format(v / 1e6) + ' M' : Math.abs(v) >= 1e4 ? CUR + ' ' + nf0.format(Math.round(v / 1e3)) + ' mil' : CUR + ' ' + nf0.format(Math.round(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- Giros comerciales: supuestos por defecto (editables) ---------- */
const F = (n, m2, R, core, bench, lo, hi, qm2) => ({n, m2, R, core, bench, lo, hi, qm2});
const GIROS = {
  // Gasto en US$ por persona al mes (promedio nacional; se multiplica por el IPA de cada celda). Base: ingreso per cápita
  // mensual EHPM 2023 de US$ 223.32, repartido por giro (supuesto editable). Objetivos US$/m² calibrados con los puntos de cadena del AMSS (oct-2026, corte OSM 2026-10-07).
  SUP: {n: 'Supermercados', spend: 62, share: .40, lambda: 2.0, u0: 600, cov: 0.8, indep: ['Supermercado independiente', 350],
    brands: {WM: ['Walmart Supercenter', 'Walmart', 9000], DDJ: ['La Despensa de Don Juan', 'Walmart', 3000], MX: ['Maxi Despensa', 'Walmart', 2200], DF: ['Despensa Familiar', 'Walmart', 700],
      SS: ['Súper Selectos', 'Grupo Calleja', 1600], SMK: ['Selectos Market', 'Grupo Calleja', 500], PS: ['PriceSmart', 'PriceSmart', 6500], ECM: ['Economás', 'Economás', 600],
      TEN: ['Tengo! Todo Market', 'Tengo!', 300], _W: ['Mayorista', 'Independiente', 700], _K: ['Mercado municipal', 'Mercados', 2000]},
    formats: {SC: F('Supercenter', 9000, 15, 5, 250000, 1.0, 3.5, 2380), SM: F('Supermercado', 1800, 8, 3, 90000, 1.2, 3.5, 2100),
      BD: F('Bodega de descuento', 900, 5, 2, 40000, .5, 1.4, 1850), EX: F('Express', 300, 2, 1, 15000, .9, 3.5, 1310)}},
  FAR: {n: 'Farmacias', spend: 10, share: .75, lambda: 2.2, u0: 120, cov: 0.35, indep: ['Farmacia independiente', 50],
    brands: {SNI: ['Farmacias San Nicolás', 'San Nicolás', 150], ECO: ['Farmacias Económicas', 'Económicas', 120], VDG: ['Farmacias Virgen de Guadalupe', 'Virgen de Guadalupe', 100],
      LBU: ['Farmacia La Buena', 'La Buena', 100], CAM: ['Farmacias Camila', 'Camila', 80], SRE: ['Farmacia San Rey', 'San Rey', 80], UNO: ['Farmacias UNO', 'Farmacias UNO', 100],
      SBE: ['Farmacias San Benito', 'San Benito', 100], SRO: ['Farmacias San Roque', 'San Roque', 80], BRA: ['Farmacias Brasil', 'Brasil', 100], CEF: ['Farmacias CEFAFA', 'CEFAFA', 80],
      FVA: ['FarmaValue', 'FarmaValue', 120], AME: ['Farmacias Las Américas', 'Las Américas', 100]},
    formats: {FC: F('Farmacia de cadena', 150, 3, 1, 20000, .8, 3.5, 1870), AF: F('Autofarmacia', 300, 5, 2, 45000, 1.0, 3.5, 2080), FB: F('Farmacia de barrio', 60, 2, 1, 10000, .5, 1.5, 1660)}},
  RAP: {n: 'Comida rápida', spend: 14, share: .55, lambda: 1.8, u0: 200, cov: 0.6, indep: ['Comida rápida independiente', 80],
    brands: {MCD: ["McDonald's", "McDonald's", 400], CAM: ['Pollo Campero', 'Pollo Campero', 450], DPO: ['Don Pollo', 'Don Pollo', 150], PCA: ['Pollo Campestre', 'Pollo Campestre', 200],
      BK: ['Burger King', 'Burger King', 300], WEN: ["Wendy's", "Wendy's", 300], SUB: ['Subway', 'Subway', 80], PJ: ["Papa John's", "Papa John's", 80], LC: ['Little Caesars', 'Little Caesars', 80],
      KFC: ['KFC', 'KFC', 250], CWK: ['China Wok', 'China Wok', 120], MDO: ['Mister Donut', 'Mister Donut', 250], TB: ['Taco Bell', 'Taco Bell', 200], DOM: ["Domino's", "Domino's", 80],
      NEV: ['La Nevería', 'La Nevería', 60], PH: ['Pizza Hut', 'Pizza Hut', 250], BIG: ['Biggest', 'Biggest', 200], QZ: ['Quiznos', 'Quiznos', 80], PIN: ['Pollo Pinulito', 'Pinulito', 150]},
    formats: {AU: F('Restaurante con autoservicio', 450, 6, 3, 90000, .9, 3.5, 1980), PL: F('Local en plaza', 150, 3, 2, 45000, .8, 3.5, 1460), DL: F('Express / delivery', 80, 3, 2, 40000, .8, 3.5, 1460)}},
  RES: {n: 'Restaurantes y cafés', spend: 18, share: .45, lambda: 1.6, u0: 400, cov: 0.2, indep: ['Restaurante independiente', 150],
    brands: {STB: ['Starbucks', 'Starbucks', 150], TCC: ['The Coffee Cup', 'The Coffee Cup', 100], JVA: ['Juan Valdez Café', 'Juan Valdez', 100], SHA: ["Shaw's", "Shaw's", 80],
      PH: ['Pizza Hut', 'Pizza Hut', 250], CAL: ["Caliche's", "Caliche's", 150], CEB: ['Los Cebollines', 'Los Cebollines', 300], SAR: ['Sarita', 'Sarita', 100], DEN: ["Denny's", "Denny's", 300],
      KRE: ['Kreef', 'Kreef', 250], BWI: ['Buffalo Wings', 'Buffalo Wings', 200], PAM: ['La Pampa', 'La Pampa', 400], MDO: ['Mister Donut', 'Mister Donut', 250],
      CAM: ['Pollo Campero', 'Pollo Campero', 450], DPO: ['Don Pollo', 'Don Pollo', 150], PCA: ['Pollo Campestre', 'Pollo Campestre', 200], SMA: ['San Martín', 'San Martín', 200], GGR: ['Go Green', 'Go Green', 100]},
    formats: {RC: F('Restaurante casual', 300, 5, 3, 80000, 1.2, 3.5, 240), CF: F('Cafetería', 100, 2, 1, 15000, 1.3, 3.5, 150)}},
  GAS: {n: 'Gasolineras', spend: 30, share: .90, lambda: 2.2, u0: 1200, cov: 0.8, indep: ['Gasolinera independiente', 700],
    brands: {UNO: ['UNO', 'UNO', 1000], PUM: ['Puma', 'Puma', 1000], TEX: ['Texaco', 'Texaco', 1000], SHE: ['Shell', 'Shell', 1000], DLC: ['DLC', 'DLC', 700],
      ALB: ['Alba Petróleos', 'Alba', 700], ESS: ['Esso', 'Esso', 700], TOR: ['Toro Energy', 'Toro', 700]},
    formats: {ES: F('Estación de servicio', 1000, 5, 2, 40000, .7, 3.5, 2730), EX: F('Estación con tienda grande', 1500, 6, 3, 80000, .9, 3.5, 2860)}},
  FER: {n: 'Ferretería y construcción', spend: 8, share: .55, lambda: 1.8, u0: 400, cov: 0.3, indep: ['Ferretería independiente', 200],
    brands: {EPA: ['EPA', 'EPA', 6000], VID: ['Vidrí', 'Vidrí', 2500], FRE: ['Freund', 'Freund', 2000], SHW: ['Sherwin-Williams', 'Sherwin-Williams', 150], CMX: ['Comex', 'Comex', 150],
      GAL: ['Galvanissa', 'Galvanissa', 400], LEM: ['Ferretería Lemus', 'Lemus', 400], SUM: ['Sumersa', 'Sumersa', 300], FMI: ['Ferrominera', 'Ferrominera', 300], DID: ['Didelco', 'Didelco', 300],
      CFA: ['Construfácil', 'Construfácil', 800], CHE: ['Casa de la Herramienta', 'Casa de la Herramienta', 300], _D: ['Home center', 'Independiente', 1500]},
    formats: {HC: F('Home center', 6000, 15, 5, 250000, 1.0, 3.5, 420), FB: F('Ferretería de barrio', 300, 3, 2, 30000, .5, 2.0, 240)}},
  CON: {n: 'Tiendas de conveniencia', spend: 13, share: .45, lambda: 2.5, u0: 80, cov: 0.05, indep: ['Tienda de barrio', 40],
    brands: {TEX: ['Star Mart / Food Mart (Texaco)', 'Texaco', 120], UNO: ['Tienda UNO', 'UNO', 120], PRO: ['Pronto', 'Pronto', 120], PUM: ['Puma', 'Puma', 100],
      RMK: ['Road Market', 'Road Market', 120], TEN: ['Tengo! Todo Market', 'Tengo!', 150]},
    formats: {TC: F('Tienda de conveniencia', 150, 2, 1, 12000, .8, 3.5, 750)}},
  BAN: {n: 'Bancos', spend: 15, share: .60, lambda: 2.0, u0: 200, cov: 0.6, indep: ['Agencia financiera', 100],
    brands: {AGR: ['Banco Agrícola', 'Banco Agrícola', 150], CUS: ['Banco Cuscatlán', 'Banco Cuscatlán', 150], DAV: ['Davivienda', 'Davivienda', 150], BAC: ['BAC', 'BAC', 150],
      HIP: ['Banco Hipotecario', 'Banco Hipotecario', 120], AZT: ['Banco Azteca', 'Banco Azteca', 80], PRO: ['Banco Promerica', 'Promerica', 120], BFA: ['Banco de Fomento Agropecuario', 'BFA', 100],
      PCR: ['Banco ProCredit', 'ProCredit', 100], BI: ['Banco Industrial', 'Banco Industrial', 100], AZU: ['Banco Azul', 'Banco Azul', 100], ATL: ['Banco Atlántida', 'Atlántida', 100],
      BVI: ['Bancovi', 'Bancovi', 80], FED: ['Cajas de crédito (Fedecrédito)', 'Fedecrédito', 80], CRE: ['Credicomer', 'Credicomer', 80], ABK: ['Abank', 'Abank', 80],
      GYT: ['G&T Continental', 'G&T Continental', 100], ATM: ['Cajero automático', 'Cajeros', 30]},
    formats: {AG: F('Agencia bancaria', 150, 4, 2, 50000, .6, 3.5, 3750), AE: F('Agencia express', 60, 2, 1, 15000, .6, 3.5, 2730)}},
  ROP: {n: 'Ropa y calzado', spend: 11, share: .50, lambda: 1.5, u0: 200, cov: 0.15, indep: ['Tienda de ropa independiente', 80],
    brands: {SIM: ['Siman', 'Siman', 8000], LEE: ['Lee Shoes', 'Lee Shoes', 120], PCD: ['Pierre Cardin', 'Pierre Cardin', 120], PAR: ['Par 2', 'Par 2', 150], ADO: ['ADOC', 'ADOC', 120],
      MD: ['MD', 'MD', 150], PAY: ['Payless', 'Payless', 120], MPC: ['Megapaca', 'Megapaca', 600], RDB: ['Rio do Brasil', 'Rio do Brasil', 120], PRI: ['Prisma Moda', 'Prisma Moda', 200],
      STJ: ["St. Jack's", "St. Jack's", 300], BOM: ['Almacenes Bomba', 'Bomba', 400], _P: ['Ropa americana (paca)', 'Pacas', 300]},
    formats: {TR: F('Tienda de ropa', 300, 6, 3, 80000, .8, 3.5, 320), OU: F('Paca / outlet', 800, 6, 3, 80000, .4, 1.3, 320)}},
  PAN: {n: 'Panaderías', spend: 7, share: .60, lambda: 2.3, u0: 80, cov: 0.12, indep: ['Panadería independiente', 40],
    brands: {ROS: ['Panadería El Rosario', 'El Rosario', 80], TEC: ['La Tecleña', 'La Tecleña', 80], LIL: ['Pan Lilian', 'Pan Lilian', 80], LOR: ['Pastelería Lorena', 'Lorena', 80],
      BAN: ['Ban Ban', 'Ban Ban', 80], GEN: ['Pan Génesis', 'Génesis', 60], SED: ['Pan Santa Eduviges', 'Santa Eduviges', 60], MPA: ['Mister Pan', 'Mister Pan', 60],
      SMA: ['San Martín', 'San Martín', 200], PFR: ['Pastelería Francesa', 'Pastelería Francesa', 80]},
    formats: {PN: F('Panadería', 80, 2, 1, 12000, .5, 3.0, 1340)}},
  OTR: {n: 'Otro giro (sus datos)', spend: 13, share: .50, lambda: 2.0, u0: 2000, cov: 1, indep: ['Competidor', 150], brands: {},
    formats: {LC: F('Local comercial', 200, 5, 2, 40000, .5, 3.5, 2580)}}
};
const GEN_W = {M: 1.5, K: 1, E: .15, O: .4, U: 1};
const GEN_N = {M: 'Centro comercial', K: 'Mercado', E: 'Centro educativo', O: 'Hospital o clínica', U: 'Terminal de buses'};
const GEN_P = {M: 'centros comerciales', K: 'mercados', E: 'centros educativos', O: 'hospitales o clínicas', U: 'terminales de buses'};

/* ---------- Estado persistente (solo en este navegador) ---------- */
const KEY = 'sitescore-sv-v1';
function fresh() {
  return {giro: 'SUP', cfg: {}, muni: {}, userComps: [],
    sites: [
      {id: 's1', giro: 'SUP', name: 'Ejemplo · Soyapango, bulevar del Ejército', la: 13.7062, lo: -89.1640, fmt: 'SM', m2: 1800, grp: 'Nuevo entrante', ex: true},
      {id: 's2', giro: 'SUP', name: 'Ejemplo · Lourdes, Colón', la: 13.7245, lo: -89.3655, fmt: 'BD', m2: 900, grp: 'Nuevo entrante', ex: true},
      {id: 's3', giro: 'SUP', name: 'Ejemplo · San Miguel, avenida Roosevelt', la: 13.4795, lo: -88.1625, fmt: 'SM', m2: 1800, grp: 'Nuevo entrante', ex: true},
      {id: 's4', giro: 'FAR', name: 'Ejemplo · Farmacia en Santa Tecla centro', la: 13.6745, lo: -89.2895, fmt: 'FC', m2: 150, grp: 'Nuevo entrante', ex: true}
    ],
    cur: {giro: 'SUP', name: 'Ejemplo · Apopa centro', la: 13.8070, lo: -89.1795, fmt: 'SM', m2: 1800, grp: 'Nuevo entrante'}};
}
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cur && GIROS[s.giro]) return Object.assign(fresh(), s); } catch (e) {} return fresh(); }
let ST = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
function C(g = ST.giro) {
  if (!ST.cfg[g]) { const d = GIROS[g]; ST.cfg[g] = {spend: d.spend, share: d.share, lambda: d.lambda, u0: d.u0, cov: d.cov, formats: clone(d.formats), bsize: {}}; }
  if (ST.cfg[g].cov == null) ST.cfg[g].cov = GIROS[g].cov;
  return ST.cfg[g];
}
const G = () => GIROS[ST.giro];

/* ---------- Grilla de población ---------- */
function dec(s, T) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); }
const RR = dec(SD.r, Uint16Array), CC = dec(SD.c, Uint16Array), POP = dec(SD.pop, Uint16Array), MID = dec(SD.mid, Uint16Array), P20 = dec(SD.p20, Uint16Array), P30 = dec(SD.p30, Uint16Array);
const AGES = SD.ages, ABANDS = SD.bands;
const N = POP.length, RES = SD.meta.res, X0 = SD.grid.x0, Y1 = SD.grid.y1;
const LAT = new Float32Array(N), LON = new Float32Array(N), IPA = new Float32Array(N), ADDR = new Float64Array(N), D = new Float64Array(N);
for (let i = 0; i < N; i++) { LAT[i] = Y1 - (RR[i] + .5) * RES; LON[i] = X0 + (CC[i] + .5) * RES; }
const MUNIS = SD.munis;
// Caja de El Salvador para el índice espacial (celdas de 0.05°)
const BS = 0.05, BLA = 12.9, BLO = -90.3, BW = 56, BH = 34, NB = BW * BH;
// Centro y radio del área metropolitana (AMSS) para saturación y calibración
const MLA = 13.700, MLO = -89.215, MR_SAT = 12, MR_CAL = 15;
const OFF = new Int32Array(NB + 1), IDS = new Int32Array(N);
{
  const cnt = new Int32Array(NB), key = new Int32Array(N);
  for (let i = 0; i < N; i++) { const k = Math.floor((LAT[i] - BLA) / BS) * BW + Math.floor((LON[i] - BLO) / BS); key[i] = k; cnt[k]++; }
  for (let k = 0; k < NB; k++) OFF[k + 1] = OFF[k] + cnt[k];
  const pos = OFF.slice(0, NB);
  for (let i = 0; i < N; i++) IDS[pos[key[i]]++] = i;
}
function within(la, lo, rkm, cb) {
  const kx = 111.32 * Math.cos(la * Math.PI / 180), ky = 110.57, dla = rkm / ky, dlo = rkm / kx, r2 = rkm * rkm;
  const r0 = Math.max(0, Math.floor((la - dla - BLA) / BS)), r1 = Math.min(BH - 1, Math.floor((la + dla - BLA) / BS));
  const c0 = Math.max(0, Math.floor((lo - dlo - BLO) / BS)), c1 = Math.min(BW - 1, Math.floor((lo + dlo - BLO) / BS));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const k = r * BW + c;
    for (let j = OFF[k], e = OFF[k + 1]; j < e; j++) {
      const i = IDS[j], dy = (LAT[i] - la) * ky, dx = (LON[i] - lo) * kx, d2 = dx * dx + dy * dy;
      if (d2 <= r2) cb(i, Math.sqrt(d2));
    }
  }
}
const dist = (a, b, c, d) => { const kx = 111.32 * Math.cos(a * Math.PI / 180), dy = (c - a) * 110.57, dx = (d - b) * kx; return Math.sqrt(dx * dx + dy * dy); };
const pw = (d, l) => l === 2 ? d * d : Math.pow(d, l);

/* ---------- Competencia del giro activo ---------- */
let COMPS = [], GROUP_COL = {}, SATREF = 0.05;
const GENS = SP.gens.map(g => ({la: g[0], lo: g[1], t: g[2], name: g[3]}));
function brandOf(c) { return G().brands[c.b]; }
function csize(c) { if (c.user) return c.size; if (!c.b) return C().bsize._i ?? G().indep[1]; const b = brandOf(c); return C().bsize[c.b] ?? (b ? b[2] : G().indep[1]); }
function buildComps() {
  const g = ST.giro, B = G().brands;
  COMPS = (SP.giros[g] || []).map(p => { const b = B[p[2]]; return {la: p[0], lo: p[1], b: b ? p[2] : '', name: p[3] || (b ? b[0] : G().indep[0]), grp: b ? b[1] : 'Independiente'}; });
  ST.userComps.filter(u => (u.giro || 'SUP') === g).forEach(u => COMPS.push({la: u.la, lo: u.lo, b: u.b || '', name: u.name, grp: u.grp, size: u.size, user: true}));
  COMPS.forEach(c => { if (c.b && !c.user && c.name === '') c.name = B[c.b][0]; });
  const cnt = {}; COMPS.forEach(c => { if (c.grp !== 'Independiente' && c.grp !== 'Mercados') cnt[c.grp] = (cnt[c.grp] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  GROUP_COL = {}; ['--steel', '--brick', '--olive', '--ochre'].forEach((v, k) => { if (top[k]) GROUP_COL[top[k]] = v; });
  GROUP_COL.Independiente = '--muted';
  // saturación de referencia: oferta promedio del área metropolitana
  let sz = 0, pp = 0;
  COMPS.forEach(c => { if (dist(MLA, MLO, c.la, c.lo) <= MR_SAT) sz += csize(c); });
  within(MLA, MLO, MR_SAT, i => { pp += POP[i]; });
  SATREF = pp ? Math.max(sz / pp, 1e-5) : 0.01;
}
function modShare(ipa) { return clamp(C().share * Math.sqrt(ipa), .1, .95); }
function muniIdx(id) { return ST.muni[id] ?? MUNIS[id].i; }
function rebuildDemand() {
  const sp = C().spend * 12, mi = MUNIS.map((m, id) => muniIdx(id));
  for (let i = 0; i < N; i++) { const a = mi[MID[i]]; IPA[i] = a; ADDR[i] = POP[i] * sp * a * modShare(a); }
}
function rebuildCompetition() {
  D.fill(0); const l = C().lambda;
  const k = 1 / clamp(C().cov, .02, 1);
  for (const c of COMPS) { const m = csize(c) * k; if (m <= 0) continue; within(c.la, c.lo, 15, (i, d) => { D[i] += m / pw(Math.max(d, .25), l); }); }
}
const U0 = () => C().u0 / pw(2, C().lambda);

/* ---------- Evaluación ---------- */
const BANDS = [1, 2, 3, 5, 8, 15];
function fmtOf(site) { const fs = C().formats; return fs[site.fmt] || Object.values(fs)[0]; }
function salesFast(la, lo, Fm, m2, ex) {
  const l = C().lambda, u0 = U0(); let s = 0, pop1 = 0;
  within(la, lo, Fm.R, (i, d) => { const U = m2 / pw(Math.max(d, .25), l), Dx = ex ? Math.max(0, D[i] - ex / clamp(C().cov, .02, 1) / pw(Math.max(d, .25), l)) : D[i]; s += ADDR[i] * U / (U + Dx + u0); if (d <= 1) pop1 += POP[i]; });
  return {s, pop1};
}
// Mediana de venta/objetivo de los puntos de cadena existentes en el área metropolitana, con el formato dado
function calibRatio(fk) {
  const Fm = C().formats[fk || Object.keys(C().formats)[0]], rs = [];
  for (const c of COMPS) { if (!c.b || c.user || c.grp === 'Mercados' || c.grp === 'Cajeros') continue; if (dist(MLA, MLO, c.la, c.lo) > MR_CAL) continue;
    const m = csize(c); rs.push(salesFast(c.la, c.lo, Fm, m, m).s / (m * Fm.qm2)); }
  rs.sort((a, b) => a - b); return {n: rs.length, med: rs.length ? rs[Math.floor(rs.length / 2)] : NaN};
}
function evaluate(site) {
  const Fm = fmtOf(site), m2 = +site.m2 || Fm.m2, l = C().lambda, u0 = U0();
  const rings = [1, 2, 3, 5].map(r => ({r, pop: 0, p20: 0, p30: 0, hh: 0, ipaw: 0, addr: 0, cap: 0, n: 0, m2: 0, age: new Float64Array(30)}));
  const bands = BANDS.map(() => 0), ds = [];
  let sales = 0, near = null, nd = 1e9;
  within(site.la, site.lo, Math.max(Fm.R, 5), (i, d) => {
    if (d < nd) { nd = d; near = i; }
    let s = 0;
    if (d <= Fm.R) { const U = m2 / pw(Math.max(d, .25), l); s = ADDR[i] * U / (U + D[i] + u0); sales += s; bands[BANDS.findIndex(b => d <= b)] += s; ds.push([d, s]); }
    for (const g of rings) if (d <= g.r) { const mu = MUNIS[MID[i]], av = AGES[mu.a], p = POP[i]; g.pop += p; g.p20 += P20[i]; g.p30 += P30[i]; g.hh += p / mu.h; g.ipaw += p * IPA[i]; g.addr += ADDR[i]; g.cap += s; for (let k = 0; k < 30; k++) g.age[k] += p * av[k]; }
  });
  ds.sort((a, b) => a[0] - b[0]);
  let acc = 0, r70 = 0, r90 = 0;
  for (const [d, s] of ds) { acc += s; if (!r70 && acc >= .7 * sales) r70 = d; if (!r90 && acc >= .9 * sales) { r90 = d; break; } }
  const list = [];
  for (const c of COMPS) { const d = dist(site.la, site.lo, c.la, c.lo); if (d > 5) continue; for (const g of rings) if (d <= g.r) { g.n++; g.m2 += csize(c); } if (d <= 3) list.push({c, d}); }
  list.sort((a, b) => a.d - b.d);
  let genW = 0; const genC = {};
  for (const g of GENS) { const d = dist(site.la, site.lo, g.la, g.lo); if (d <= 1) { genW += GEN_W[g.t]; genC[g.t] = (genC[g.t] || 0) + 1; } }
  let canib = 0, ownN = 0;
  if (site.grp && site.grp !== 'Nuevo entrante') {
    for (const c of COMPS) {
      if (c.grp !== site.grp) continue;
      const dd = dist(site.la, site.lo, c.la, c.lo); if (dd > Fm.R + 10 || dd < 0.05) continue;
      ownN++; const mj = csize(c);
      within(c.la, c.lo, 10, (i, d) => {
        const ds2 = dist(site.la, site.lo, LAT[i], LON[i]); if (ds2 > Fm.R) return;
        const Uj = mj / pw(Math.max(d, .25), l), Uc = m2 / pw(Math.max(ds2, .25), l), den = D[i] + u0;
        canib += ADDR[i] * (Uj / den - Uj / (den + Uc));
      });
    }
  }
  const core = rings.find(g => g.r === Fm.core) || rings[2];
  const target = m2 * Fm.qm2, ratio = sales / target;
  const ipaC = core.pop ? core.ipaw / core.pop : 0;
  const f1 = clamp((ratio - .4) / .9);
  const f2 = clamp(Math.sqrt(core.pop / (1.5 * Fm.bench)));
  const f3 = ipaC < Fm.lo ? clamp(1 - 1.5 * (Fm.lo - ipaC) / Fm.lo) : ipaC > Fm.hi ? clamp(1 - 1.5 * (ipaC - Fm.hi) / Fm.hi) : 1;
  const sat = core.pop ? core.m2 / core.pop : 0, f4 = clamp(1 / (1 + .67 * sat / SATREF));
  const f5 = clamp(genW / 5);
  const score = Math.round(100 * (.35 * f1 + .20 * f2 + .15 * f3 + .20 * f4 + .10 * f5));
  const grade = score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'D';
  return {site, F: Fm, m2, sales, target, ratio, rings, bands, r70, r90, list, genC, canib, ownN, core, ipaC, sat, score, grade,
    f: [['Venta vs objetivo', f1], ['Demanda núcleo', f2], ['Ajuste de IPA', f3], ['Espacio competitivo', f4], ['Generadores de tráfico', f5]],
    mu: near != null ? MUNIS[MID[near]] : null, nd};
}

/* ---------- Mapa ---------- */
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function rgb(n) { const h = css(n).replace('#', ''); const v = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
const map = L.map('map', {preferCanvas: true, minZoom: 8, maxZoom: 17}).setView([MLA, MLO], 12);
map.attributionControl.setPrefix(false).addAttribution('Población © WorldPop · Límites © geoBoundaries · Comercios © OpenStreetMap (HOT export) · Imagen: Copernicus Sentinel-2 2025–26');
['dens', 'lim', 'opp', 'lbl'].forEach((p, k) => { map.createPane(p); map.getPane(p).style.zIndex = [250, 300, 380, 390][k]; });
map.getPane('dens').style.pointerEvents = 'none'; map.getPane('lbl').style.pointerEvents = 'none';
const rCanvas = L.canvas({pane: 'lim'}), oCanvas = L.canvas({pane: 'opp'});
const DEN_BINS = [250, 1000, 2500, 5000, 10000, 20000], IPA_BINS = [0.6, 0.8, 1.0, 1.3, 1.8, 2.5];
const LY = {ipa: false};
const DensLayer = L.Layer.extend({
  onAdd(m) { this._m = m; this._c = L.DomUtil.create('canvas', ''); m.getPane('dens').appendChild(this._c); m.on('moveend zoomend resize', this.draw, this); m.on('zoomstart', this.hide, this); this.draw(); },
  onRemove(m) { m.off('moveend zoomend resize', this.draw, this); m.off('zoomstart', this.hide, this); this._c.remove(); },
  hide() { this._c.style.visibility = 'hidden'; },
  draw() {
    const m = this._m, c = this._c; if (!m) return; const sz = m.getSize(), dpr = window.devicePixelRatio || 1;
    c.width = sz.x * dpr; c.height = sz.y * dpr; c.style.width = sz.x + 'px'; c.style.height = sz.y + 'px';
    L.DomUtil.setPosition(c, m.containerPointToLayerPoint([0, 0]));
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, sz.x, sz.y);
    const b = m.getBounds().pad(.05), s = b.getSouth(), n = b.getNorth(), w = b.getWest(), e = b.getEast();
    const p0 = m.latLngToContainerPoint([MLA, MLO]), p1 = m.latLngToContainerPoint([MLA - RES, MLO + RES]);
    const cw = Math.max(1, Math.ceil(p1.x - p0.x) + 1), ch = Math.max(1, Math.ceil(p1.y - p0.y) + 1), zf = m.getZoom() >= 14 ? .55 : 1;
    const ipaMode = LY.ipa, base = ipaMode ? rgb('--ochre') : rgb('--steel'), bins = ipaMode ? IPA_BINS : DEN_BINS;
    const styles = [ipaMode ? .08 : 0, .17, .28, .40, .54, .68, .82].map(a => `rgba(${base[0]},${base[1]},${base[2]},${a * zf})`);
    const tl = m.latLngToContainerPoint([n, w]), br = m.latLngToContainerPoint([s, e]);
    const sx = (br.x - tl.x) / (e - w), sy = (br.y - tl.y) / (s - n);
    for (let i = 0; i < N; i++) {
      const la = LAT[i], lo = LON[i]; if (la < s || la > n || lo < w || lo > e) continue;
      const v = ipaMode ? IPA[i] : POP[i] * 4; let k = 0; while (k < bins.length && v >= bins[k]) k++;
      if (!ipaMode && k === 0) continue;
      g.fillStyle = styles[k]; g.fillRect(Math.floor(tl.x + (lo - w) * sx - cw / 2), Math.floor(tl.y + (la - n) * sy - ch / 2), cw, ch);
    }
    c.style.visibility = 'visible';
  }
});
const dens = new DensLayer(); dens.addTo(map);
const limits = L.geoJSON(SD.geo, {renderer: rCanvas, interactive: false, style: () => ({color: css('--slate'), weight: .6, opacity: .45, fill: false})}).addTo(map);
const compLayer = L.layerGroup().addTo(map), genLayer = L.layerGroup(), lblLayer = L.layerGroup().addTo(map), oppLayer = L.layerGroup().addTo(map), siteLayer = L.layerGroup().addTo(map), savedLayer = L.layerGroup().addTo(map);
function compColor(c) { return c.grp === 'Mercados' ? css('--ochre') : css(GROUP_COL[c.grp] || '--slate'); }
function drawComps() {
  compLayer.clearLayers();
  const mx = Math.max(...Object.values(G().brands).map(b => b[2]), G().indep[1], 1);
  for (const c of COMPS) {
    const m = csize(c), col = compColor(c), hollow = c.grp === 'Mercados';
    L.circleMarker([c.la, c.lo], {renderer: rCanvas, radius: 3 + 6 * Math.sqrt(m / mx), color: hollow ? col : css('--paper'), weight: hollow ? 1.6 : .8, fillColor: col, fillOpacity: hollow ? .15 : .9})
      .bindTooltip(`<b>${esc(c.name)}</b><br>${esc(c.grp)} · tamaño ${fN(m)}${c.user ? ' · agregado por usted' : ''}`, {direction: 'top'}).addTo(compLayer);
  }
}
function drawGens() {
  genLayer.clearLayers();
  for (const g of GENS) L.circleMarker([g.la, g.lo], {renderer: rCanvas, radius: g.t === 'M' ? 4.5 : 3, color: css('--muted'), weight: 1.1, fillColor: css('--paper'), fillOpacity: 1})
    .bindTooltip(`<b>${esc(g.name || GEN_N[g.t])}</b><br>${GEN_N[g.t]}`, {direction: 'top'}).addTo(genLayer);
}
function drawLabels() {
  lblLayer.clearLayers(); const z = map.getZoom(); if (z < 10) return; const b = map.getBounds();
  MUNIS.forEach(m => {
    if (!b.contains([m.la, m.lo])) return; const isZ = !!m.z;
    if (z < 12 && isZ) return; if (z < 11 && m.p < 60000) return;
    L.marker([m.la, m.lo], {pane: 'lbl', interactive: false, icon: L.divIcon({className: '', html: `<div class="lbl">${esc(shortName(m))}</div>`, iconSize: [0, 0]})}).addTo(lblLayer);
  });
}
function shortName(m) { if (!m.z) return m.m; const [a, b] = m.m.split(' · '); return /^Centro/.test(b) ? a + ' centro' : b.split(',')[0]; }
map.on('zoomend moveend', drawLabels);
function legend() {
  const b = rgb(LY.ipa ? '--ochre' : '--steel'), al = [.08, .17, .28, .40, .54, .68, .82];
  const labs = LY.ipa ? ['0.6', '1.0', '1.8', '2.5+'] : ['250', '2.5 mil', '10 mil', '20 mil+'];
  const keys = Object.entries(GROUP_COL).filter(([g]) => g !== 'Independiente').map(([g, v]) => `<span><i class="dot" style="background:var(${v})"></i>${esc(g)}</span>`).join('') +
    '<span><i class="dot" style="background:var(--slate)"></i>Otras cadenas</span><span><i class="dot" style="background:var(--muted)"></i>Independiente</span>' +
    (ST.giro === 'SUP' ? '<span><i class="dot" style="border:1.5px solid var(--ochre)"></i>Mercado</span>' : '');
  $('#legend').innerHTML = `<div class="lab">${LY.ipa ? 'Índice de poder adquisitivo' : 'Habitantes por km²'}</div>
    <div class="ramp">${al.map(a => `<i style="background:rgba(${b[0]},${b[1]},${b[2]},${a})"></i>`).join('')}</div>
    <div class="ramp-l">${labs.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="lab" style="margin-top:2px">${esc(G().n)}</div><div class="keys">${keys}</div>`;
}

/* ---------- Sitio candidato ---------- */
const pinIcon = L.divIcon({className: '', html: '<div class="pin"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11]});
const savedIcon = L.divIcon({className: '', html: '<div class="pin saved"><i></i></div>', iconSize: [16, 16], iconAnchor: [8, 8]});
const pin = L.marker([ST.cur.la, ST.cur.lo], {icon: pinIcon, draggable: true, zIndexOffset: 1000, title: 'Sitio candidato'}).addTo(map);
pin.on('dragend', () => { const p = pin.getLatLng(); goTo(p.lat, p.lng); });
let addMode = false;
map.on('click', e => {
  if (addMode) {
    const code = $('#ucBr').value, b = G().brands[code];
    ST.userComps.push({giro: ST.giro, la: +e.latlng.lat.toFixed(5), lo: +e.latlng.lng.toFixed(5), b: b ? code : '', name: b ? b[0] : ($('#ucName').value || 'Competidor agregado'), grp: b ? b[1] : 'Independiente', size: +$('#ucM2').value || 100});
    afterComps(); toast('Competidor agregado'); return;
  }
  goTo(e.latlng.lat, e.latlng.lng);
});
function drawSaved() {
  savedLayer.clearLayers();
  ST.sites.filter(s => s.giro === ST.giro).forEach(s => L.marker([s.la, s.lo], {icon: savedIcon, title: s.name}).bindTooltip(esc(s.name), {direction: 'top'}).on('click', () => openSite(s)).addTo(savedLayer));
}

/* ---------- Render ---------- */
let LAST = null;
function readForm() {
  const c = ST.cur; c.giro = ST.giro; c.name = $('#sName').value; c.fmt = $('#sFmt').value; c.m2 = +$('#sM2').value || fmtOf(c).m2; c.grp = $('#sGrp').value;
}
function run() {
  readForm(); const c = ST.cur, r = evaluate(c); LAST = r; save();
  $('#coords').textContent = `${c.la.toFixed(5)}, ${c.lo.toFixed(5)}`; if (document.activeElement !== $('#sCoord')) $('#sCoord').value = `${c.la.toFixed(6)}, ${c.lo.toFixed(6)}`;
  $('#gmaps').href = `https://www.google.com/maps/search/?api=1&query=${c.la.toFixed(6)},${c.lo.toFixed(6)}&basemap=satellite`;
  $('#sLoc').innerHTML = r.mu && r.nd < 1.5 ? `${esc(r.mu.m)}, ${esc(r.mu.d)}<small>IPA ${nf2.format(muniIdx(r.mu.id))} · ${r.mu.u ? 'municipio ' + esc(r.mu.u) + ' · ' : ''}${r.mu.po ? 'distrito ' + fN(r.mu.po) + ' hab. (proyección 2024)' : 'zona ' + fN(r.mu.p) + ' hab. (WorldPop 2025)'}</small>` : 'Sin población registrada cerca<small>Mueva el sitio a un área poblada</small>';
  const wk = r.f.slice().sort((a, b) => a[1] - b[1])[0], weakest = wk[1] >= .95 ? '' : wk[0].toLowerCase();
  const V = {A: 'Sitio prioritario. La venta estimada alcanza el objetivo del formato y la competencia deja espacio.', B: 'Sitio viable. Conviene validar accesos, visibilidad y costo de renta antes de negociar.',
    C: 'Sitio marginal. Solo funciona con renta baja o con un formato más pequeño.', D: 'No recomendado con este formato.'}[r.grade];
  $('#rScore').innerHTML = `<h2><span>Score del sitio</span><span>${esc(G().n)} · ${esc(r.F.n)} · ${fN(r.m2)} m²</span></h2>
    <div class="score"><div class="big">${r.score}<sup>/100</sup></div>
    <div><span class="grade g-${r.grade}">Clase ${r.grade}</span><p class="verdict">${V} ${weakest ? 'Punto más débil: ' + esc(weakest) + '.' : 'Ningún factor débil.'}</p></div></div>${COMPS.length ? '' : '<p class="note neg">Este giro no tiene competidores cargados. Importe un CSV en Base de datos; mientras tanto la venta está sobrestimada.</p>'}
    <div class="factors">${r.f.map(([n, v]) => `<div class="fac"><b>${n}</b><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div><em>${Math.round(v * 100)}</em></div>`).join('')}</div>`;
  const prim = r.rings.find(g => g.r === r.F.core) || r.rings[2], net = r.sales - r.canib, nue = r.site.grp === 'Nuevo entrante';
  const gtxt = Object.entries(r.genC).map(([t, n]) => `${n} ${n > 1 ? GEN_P[t] : GEN_N[t].toLowerCase()}`).join(', ');
  $('#rKpi').innerHTML = [
    ['Venta anual estimada', fQ(r.sales), `${fQ(r.sales / r.m2)} por m²`],
    ['Frente al objetivo', `<span class="${r.ratio >= 1 ? 'pos' : r.ratio < .7 ? 'neg' : ''}">${fN(r.ratio * 100)} %</span>`, `objetivo ${fQ(r.target)}`],
    ['Captura en radio núcleo', `${nf1.format(prim.addr ? 100 * prim.cap / prim.addr : 0)} %`, `del gasto capturable a ${r.F.core} km`],
    ['Área primaria / secundaria', `${nf1.format(r.r70)} / ${nf1.format(r.r90)} km`, '70 % y 90 % de la venta'],
    ['Canibalización', nue ? '—' : `<span class="${r.canib > 0 ? 'neg' : ''}">${fQ(r.canib)}</span>`, nue ? 'sin tiendas propias' : `${r.ownN} puntos ${esc(r.site.grp)} cercanos`],
    ['Venta neta incremental', fQ(net), r.sales ? `${fN(100 * net / r.sales)} % de la venta bruta` : '']
  ].map(([l, v, s]) => `<div class="kpi"><div class="lab">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('') +
    `<p class="note" style="grid-column:1/-1">Generadores de tráfico a 1 km: ${gtxt || 'ninguno mapeado'}.</p>`;
  const rg = r.rings, hh = 4.0;
  const rowsR = [['Gasto capturable anual', g => fQ(g.addr)], ['Competidores', g => fN(g.n)], ['Tamaño competidor', g => fN(g.m2)],
    ['Tamaño por 1,000 hab.', g => g.pop ? nf1.format(1000 * g.m2 / g.pop) : '—'], ['Captura del sitio', g => g.addr ? nf1.format(100 * g.cap / g.addr) + ' %' : '—']];
  $('#rRings').innerHTML = `<table><thead><tr><th>Radio</th>${rg.map(g => `<th>${g.r} km</th>`).join('')}</tr></thead><tbody>${rowsR.map(([l, f]) => `<tr><td>${l}</td>${rg.map(g => `<td>${f(g)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  bandsChart(r); renderDemo(r);
  $('#rNearN').textContent = `${r.list.length} puntos`;
  $('#rNear').innerHTML = r.list.slice(0, 10).map(({c, d}) => `<li><i class="dot" style="background:${c.grp === 'Mercados' ? 'transparent;border:1.5px solid var(--ochre)' : 'var(' + (GROUP_COL[c.grp] || '--slate') + ')'}"></i><span>${esc(c.name)} <span class="d">· ${fN(csize(c))}</span></span><span class="d">${nf1.format(d)} km</span></li>`).join('') || '<li><span></span><span class="d">Sin competencia mapeada a 3 km</span><span></span></li>';
  drawSite(r);
}
/* ---------- Perfil demográfico ---------- */
let DEMO_R = 3;
function ageStats(g) {
  const a = g.age, t = g.pop || 1, sum = (i0, i1) => { let s = 0; for (let k = i0; k <= i1; k++) s += a[k] + a[k + 15]; return s; };
  const fem = a.slice(0, 15).reduce((x, y) => x + y, 0);
  const groups = [['0–14', sum(0, 2)], ['15–29', sum(3, 5)], ['30–44', sum(6, 8)], ['45–64', sum(9, 12)], ['65+', sum(13, 14)]];
  // edad mediana por interpolación en bandas de 5 años (70+ tratado como 70–80)
  let acc = 0, med = 0; const half = t / 2;
  for (let k = 0; k < 15; k++) { const v = a[k] + a[k + 15]; if (acc + v >= half) { med = k * 5 + (v ? (half - acc) / v : 0) * (k === 14 ? 10 : 5); break; } acc += v; }
  const work = sum(3, 12), dep = sum(0, 2) + sum(13, 14);
  return {fem: fem / t, groups: groups.map(([n, v]) => [n, v / t, v]), med, work, depRatio: work ? dep / work : 0};
}
function cagr(a, b, y) { return a > 0 && b > 0 ? Math.pow(b / a, 1 / y) - 1 : 0; }
function renderDemo(r) {
  const rg = r.rings, g = rg.find(x => x.r === DEMO_R) || rg[2], S = rg.map(ageStats), sg = ageStats(g), area = x => Math.PI * x.r * x.r;
  const pct = v => nf1.format(100 * v) + ' %';
  const rows = [
    ['grp', 'Población'],
    ['Población 2020', x => fN(x.p20)], ['Población 2025', x => fN(x.pop)], ['Proyección 2030', x => fN(x.p30)],
    ['Crecimiento anual 20–25', x => pct(cagr(x.p20, x.pop, 5))], ['Crecimiento anual 25–30', x => pct(cagr(x.pop, x.p30, 5))],
    ['Densidad hab./km²', x => fN(x.pop / area(x))], ['Hogares (estimado)', x => fN(x.hh)],
    ['grp', 'Edad y sexo'],
    ...['0–14', '15–29', '30–44', '45–64', '65+'].map((n, k) => [`${n} años`, (x, i) => pct(S[i].groups[k][1])]),
    ['Edad mediana', (x, i) => nf1.format(S[i].med) + ' años'], ['Mujeres', (x, i) => pct(S[i].fem)],
    ['Población 15–64 (laboral)', (x, i) => fN(S[i].work)], ['Razón de dependencia', (x, i) => nf2.format(S[i].depRatio)],
    ['grp', 'Poder de compra'],
    ['IPA promedio', x => x.pop ? nf2.format(x.ipaw / x.pop) : '—'], ['Gasto del giro, total anual', x => fQ(x.pop * C().spend * 12 * (x.pop ? x.ipaw / x.pop : 0))],
    ['Gasto por hogar al mes', x => x.hh ? CUR + ' ' + fN(x.pop * C().spend * (x.ipaw / x.pop) / x.hh) : '—']
  ];
  const g0 = rg.find(x => x.r === 1);
  $('#rDemo').innerHTML = `<h2><span>Perfil demográfico</span><span>2025 · radios desde el punto</span></h2>
    <div class="demo-top">
      <div><div class="lab">Población a ${DEMO_R} km</div><div class="v">${fN(g.pop)}</div><div class="s">${fN(g.hh)} hogares estimados</div></div>
      <div><div class="lab">Crec. anual 20–25</div><div class="v ${g.pop >= g.p20 ? 'pos' : 'neg'}">${pct(cagr(g.p20, g.pop, 5))}</div><div class="s">anual · ${g.p30 >= g.pop ? '+' : ''}${fN(g.p30 - g.pop)} hab. a 2030</div></div>
      <div><div class="lab">Edad mediana</div><div class="v">${nf1.format(sg.med)}</div><div class="s">${pct(sg.groups[0][1])} menores de 15</div></div>
    </div>
    <div class="tw"><table><thead><tr><th>Indicador</th>${rg.map(x => `<th>${x.r} km</th>`).join('')}</tr></thead><tbody>${rows.map(rw => rw[0] === 'grp'
      ? `<tr class="grp"><td colspan="5">${rw[1]}</td></tr>` : `<tr><td>${rw[0]}</td>${rg.map((x, i) => `<td>${rw[1](x, i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="pyr-wrap"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px"><span class="lab">Pirámide de población a ${DEMO_R} km</span>
      <div class="chips" role="group" aria-label="Radio de la pirámide">${[1, 2, 3, 5].map(k => `<button type="button" data-dr="${k}" aria-pressed="${k === DEMO_R}">${k} km</button>`).join('')}</div></div>
      ${pyramid(g)}</div>
    <p class="note">Edad y sexo: perfil del distrito (proyección 2024, COD-PS) aplicado a cada celda. Hogares con el tamaño promedio de su departamento (EHPM 2023: 3.0 a 3.3 personas; promedio nacional 3.14, igual al Censo 2024).</p>`;
}
function pyramid(g) {
  const W = 380, rowH = 11, top = 6, H = top + 15 * rowH + 18, mid = W / 2, lab = 30, a = g.age;
  const mx = Math.max(...Array.from(a), 1), sc = v => (mid - lab / 2 - 8) * v / mx;
  let s = '';
  for (let k = 0; k < 15; k++) {
    const y = top + (14 - k) * rowH, f = a[k], m = a[k + 15], wf = sc(f), wm = sc(m);
    s += `<rect x="${mid - lab / 2 - wm}" y="${y}" width="${wm}" height="${rowH - 2}" fill="var(--steel2)"></rect>`;
    s += `<rect x="${mid + lab / 2}" y="${y}" width="${wf}" height="${rowH - 2}" fill="var(--ochre)"></rect>`;
    s += `<text x="${mid}" y="${y + rowH - 3}" text-anchor="middle" font-size="8.5" fill="var(--muted)">${ABANDS[k]}</text>`;
  }
  const tm = a.slice(15).reduce((x, y) => x + y, 0), tf = a.slice(0, 15).reduce((x, y) => x + y, 0);
  s += `<text x="${mid - lab / 2 - 4}" y="${H - 4}" text-anchor="end" font-size="10.5" fill="var(--steel2)">Hombres ${fN(tm)}</text>`;
  s += `<text x="${mid + lab / 2 + 4}" y="${H - 4}" font-size="10.5" fill="var(--ochre)">Mujeres ${fN(tf)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Pirámide de población">${s}</svg>`;
}
$('#rDemo').addEventListener('click', e => { const b = e.target.closest('[data-dr]'); if (!b) return; DEMO_R = +b.dataset.dr; if (LAST) renderDemo(LAST); });

/* ---------- Coordenadas ---------- */
function parseCoord(txt) {
  const t = String(txt).trim(); if (!t) return null;
  let m = t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (m) return [+m[1], +m[2]];
  const dms = [...t.matchAll(/(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′’]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|″|”|'')\s*)?([NSEWO])?/gi)];
  if (dms.length >= 2) {
    const v = dms.slice(0, 2).map(x => { let d = +x[1] + (+x[2] || 0) / 60 + (+x[3] || 0) / 3600; if (/[SWO]/i.test(x[4] || '')) d = -d; return d; });
    let [la, lo] = v; if (lo > 0 && la > 0 && !/[EW O]/i.test(dms[1][4] || '')) lo = -lo; return [la, lo];
  }
  const n = t.replace(/[^\d.\-,; ]/g, ' ').split(/[,; ]+/).filter(Boolean).map(Number).filter(x => !isNaN(x));
  if (n.length >= 2) { let [la, lo] = n; if (Math.abs(la) > 50 && Math.abs(lo) < 50) [la, lo] = [lo, la]; if (lo > 0) lo = -lo; return [la, lo]; }
  return null;
}
function goTo(la, lo, zoom) {
  ST.cur.la = +la.toFixed(6); ST.cur.lo = +lo.toFixed(6); pin.setLatLng([la, lo]);
  if (zoom) map.setView([la, lo], Math.max(map.getZoom(), 14));
  $('#sCoord').value = `${ST.cur.la.toFixed(6)}, ${ST.cur.lo.toFixed(6)}`; run();
}
$('#coordForm').addEventListener('submit', e => {
  e.preventDefault(); const c = parseCoord($('#sCoord').value), msg = $('#coordMsg');
  if (!c) { msg.textContent = 'No reconozco ese formato. Ejemplo: 13.7010, -89.2240'; msg.classList.add('neg'); return; }
  const [la, lo] = c;
  if (la < 13.1 || la > 14.5 || lo < -90.2 || lo > -87.6) { msg.textContent = `El punto ${la.toFixed(5)}, ${lo.toFixed(5)} queda fuera de El Salvador. Revise el orden: latitud primero (13.1 a 14.5), longitud negativa (−90.2 a −87.6).`; msg.classList.add('neg'); return; }
  msg.classList.remove('neg'); msg.textContent = `Punto ubicado: ${la.toFixed(6)}, ${lo.toFixed(6)}.`; goTo(la, lo, true);
});

function bandsChart(r) {
  const W = 380, H = 130, pb = 22, pt = 16, labels = ['0–1', '1–2', '2–3', '3–5', '5–8', '8–15'], max = Math.max(...r.bands, 1), bw = (W - 12) / 6;
  const bars = r.bands.map((v, k) => {
    const h = (H - pb - pt) * v / max, x = 6 + k * bw + 6, y = H - pb - h, on = k === 0 || BANDS[k - 1] < r.F.R;
    return `<rect x="${x}" y="${y}" width="${bw - 12}" height="${h}" fill="${on ? 'var(--steel2)' : 'var(--rule)'}"></rect>
      <text x="${x + (bw - 12) / 2}" y="${y - 4}" text-anchor="middle" font-size="10.5" fill="var(--slate)">${v > 0 && r.sales ? fN(100 * v / r.sales) + '%' : ''}</text>
      <text x="${x + (bw - 12) / 2}" y="${H - 7}" text-anchor="middle" font-size="10" fill="var(--muted)">${labels[k]} km</text>`;
  }).join('');
  $('#rBands').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Venta por banda de distancia"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--ink)" stroke-width="1"></line>${bars}</svg>`;
}
function drawSite(r) {
  siteLayer.clearLayers(); const ll = [r.site.la, r.site.lo];
  [1, 3, 5].forEach(k => L.circle(ll, {renderer: rCanvas, radius: k * 1000, color: satOn ? '#ffffff' : css('--ink'), weight: .8, opacity: .5, fill: false, dashArray: '2 4', interactive: false}).addTo(siteLayer));
  const tc = satOn ? '#9cc7ea' : css('--steel2');
  if (r.r90) L.circle(ll, {renderer: rCanvas, radius: r.r90 * 1000, color: tc, weight: 1.4, fill: true, fillOpacity: .04, dashArray: '6 5', interactive: false}).addTo(siteLayer);
  if (r.r70) L.circle(ll, {renderer: rCanvas, radius: r.r70 * 1000, color: tc, weight: 2, fill: true, fillOpacity: .06, interactive: false}).addTo(siteLayer);
}

/* ---------- Cambio de giro ---------- */
function fillGiroForm() {
  const fs = C().formats;
  $('#sFmt').innerHTML = Object.entries(fs).map(([k, f]) => `<option value="${k}">${esc(f.n)}</option>`).join('');
  if (!fs[ST.cur.fmt]) { ST.cur.fmt = Object.keys(fs)[0]; ST.cur.m2 = fs[ST.cur.fmt].m2; }
  const cnt = {}; COMPS.forEach(c => { if (c.grp !== 'Independiente' && c.grp !== 'Mercados' && c.grp !== 'Cajeros') cnt[c.grp] = (cnt[c.grp] || 0) + 1; });
  const grps = ['Nuevo entrante', ...Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(x => x[0])];
  $('#sGrp').innerHTML = grps.map(g => `<option>${esc(g)}</option>`).join('');
  if (!grps.includes(ST.cur.grp)) ST.cur.grp = 'Nuevo entrante';
  $('#sName').value = ST.cur.name; $('#sFmt').value = ST.cur.fmt; $('#sM2').value = ST.cur.m2 || fs[ST.cur.fmt].m2; $('#sGrp').value = ST.cur.grp;
  $('#sSpend').value = C().spend; $('#sGiro').value = ST.giro;
  $('#spendHint').textContent = `Promedio nacional en ${G().n.toLowerCase()}; cada zona lo ajusta por su IPA.`;
  $('#sizeLab').textContent = ST.giro === 'GAS' ? 'Tamaño (equivalente)' : 'Tamaño m²';
}
function setGiro(g, keepCur) {
  ST.giro = g; C();
  if (!keepCur) { ST.cur.giro = g; ST.cur.fmt = Object.keys(C().formats)[0]; ST.cur.m2 = C().formats[ST.cur.fmt].m2; ST.cur.grp = 'Nuevo entrante'; }
  buildComps(); rebuildDemand(); rebuildCompetition(); drawComps(); fillGiroForm(); drawSaved(); legend(); oppLayer.clearLayers(); $('#oT').innerHTML = ''; $('#oInfo').textContent = '';
  run(); if (!$('[data-pane="db"]').hidden) renderDB(); if (!$('[data-pane="cmp"]').hidden) renderCmp();
}

/* ---------- Comparar ---------- */
function openSite(s) {
  ST.cur = {giro: s.giro, name: s.name, la: s.la, lo: s.lo, fmt: s.fmt, m2: s.m2, grp: s.grp};
  if (s.giro !== ST.giro) setGiro(s.giro, true); else fillGiroForm();
  pin.setLatLng([s.la, s.lo]); map.setView([s.la, s.lo], Math.max(map.getZoom(), 13)); tab('eval'); run();
}
function renderCmp() {
  const mine = ST.sites.filter(s => s.giro === ST.giro), other = ST.sites.length - mine.length;
  const rs = mine.map(s => ({s, r: evaluate(s)})).sort((a, b) => b.r.score - a.r.score);
  $('#cmpN').textContent = `${esc(G().n)} · ${rs.length} sitios`;
  $('#cmpT').innerHTML = rs.length ? `<thead><tr><th>Sitio</th><th>Score</th><th>Venta</th><th>vs obj.</th><th>Pob. núcleo</th><th>IPA</th><th></th></tr></thead><tbody>` +
    rs.map(({s, r}) => `<tr data-id="${s.id}"><td>${esc(s.name)}<br><span class="lab">${esc(r.F.n)} · ${esc(s.grp)}</span></td><td><span class="grade g-${r.grade}">${r.score}</span></td><td>${fQ(r.sales)}</td><td>${fN(r.ratio * 100)}%</td><td>${fN(r.core.pop)}</td><td>${nf2.format(r.ipaC)}</td><td><button class="x" data-del="${s.id}" aria-label="Eliminar ${esc(s.name)}">×</button></td></tr>`).join('') + '</tbody>'
    : '<tbody><tr><td>Guarde un sitio desde Evaluar para compararlo aquí.</td></tr></tbody>';
  $('#cmpOther').innerHTML = other ? `${other} sitio${other > 1 ? 's' : ''} guardado${other > 1 ? 's' : ''} en otros giros: ` + Object.entries(ST.sites.filter(s => s.giro !== ST.giro).reduce((a, s) => (a[s.giro] = (a[s.giro] || 0) + 1, a), {})).map(([g, n]) => `<button class="lnk" data-g="${g}">${esc(GIROS[g].n)} (${n})</button>`).join(', ') + '.' : '';
}
$('#cmpOther').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { setGiro(b.dataset.g); tab('cmp'); } });
$('#cmpT').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) { ST.sites = ST.sites.filter(s => s.id !== del.dataset.del); save(); renderCmp(); drawSaved(); return; }
  const tr = e.target.closest('tr[data-id]'); if (tr) openSite(ST.sites.find(s => s.id === tr.dataset.id));
});
$('#bSave').onclick = () => { const c = ST.cur; ST.sites.push({id: 's' + Date.now(), giro: ST.giro, name: c.name || 'Sitio', la: c.la, lo: c.lo, fmt: c.fmt, m2: c.m2, grp: c.grp}); save(); drawSaved(); toast('Sitio guardado en Comparar'); };
function copyText(txt, box) {
  const show = () => { $(box).innerHTML = '<p class="note">Seleccione y copie el texto:</p><textarea class="copy" readonly></textarea>'; const t = $(box + ' textarea'); t.value = txt; t.select(); };
  try { navigator.clipboard.writeText(txt).then(() => toast('Copiado al portapapeles'), show); } catch (e) { show(); }
}
$('#bCopy').onclick = () => {
  const r = LAST; if (!r) return; const g3 = r.rings[2];
  copyText([`${r.site.name} (${r.site.la.toFixed(5)}, ${r.site.lo.toFixed(5)})`, r.mu ? `${r.mu.m}, ${r.mu.d}` : '',
    `Giro: ${G().n} · Formato: ${r.F.n}, ${fN(r.m2)} m² · Cadena: ${r.site.grp}`, `Gasto supuesto: ${CUR} ${fN(C().spend)} por persona al mes`,
    `Score: ${r.score}/100 (Clase ${r.grade})`, `Venta anual estimada: ${fQ(r.sales)} (${fN(r.ratio * 100)}% del objetivo ${fQ(r.target)})`,
    `Área primaria ${nf1.format(r.r70)} km · secundaria ${nf1.format(r.r90)} km`,
    ...r.rings.map(g => { const a = ageStats(g); return `${g.r} km: ${fN(g.pop)} hab. 2025 (2020: ${fN(g.p20)}, 2030: ${fN(g.p30)}) · ${fN(g.hh)} hogares · IPA ${g.pop ? nf2.format(g.ipaw / g.pop) : '—'} · edad mediana ${nf1.format(a.med)} · 0–14 ${fN(100 * a.groups[0][1])}% · 65+ ${fN(100 * a.groups[4][1])}% · competidores ${g.n}`; }),
    `Canibalización: ${fQ(r.canib)} · Venta neta: ${fQ(r.sales - r.canib)}`, `Fuente: SiteScore SV (WorldPop 2025, OSM ${SP.fecha || ''}, geoBoundaries, EHPM 2023)`].join('\n'), '#copyBox');
};
$('#bCsv').onclick = () => {
  const rows = [['giro', 'sitio', 'lat', 'lon', 'formato', 'm2', 'cadena', 'gasto_usd_mes', 'score', 'clase', 'venta_anual_usd', 'pct_objetivo', 'pob_1km', 'pob_3km', 'pob_5km', 'ipa_nucleo', 'competidores_3km', 'canibalizacion_usd', 'radio_primario_km', 'pob2020_3km', 'pob2030_3km', 'hogares_3km', 'edad_mediana_3km']];
  ST.sites.filter(s => s.giro === ST.giro).forEach(s => { const r = evaluate(s); rows.push([G().n, s.name, s.la, s.lo, r.F.n, r.m2, s.grp, C().spend, r.score, r.grade, Math.round(r.sales), Math.round(r.ratio * 100), Math.round(r.rings[0].pop), Math.round(r.rings[2].pop), Math.round(r.rings[3].pop), r.ipaC.toFixed(2), r.rings[2].n, Math.round(r.canib), r.r70.toFixed(1), Math.round(r.rings[2].p20), Math.round(r.rings[2].p30), Math.round(r.rings[2].hh), ageStats(r.rings[2]).med.toFixed(1)]); });
  copyText(rows.map(r => r.map(v => /[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n'), '#csvBox');
};

/* ---------- Oportunidad ---------- */
function opportunity() {
  oppLayer.clearLayers();
  const n = +$('#oN').value, minP = +$('#oMin').value || 0, Fm = fmtOf(ST.cur), m2 = +ST.cur.m2 || Fm.m2, target = m2 * Fm.qm2;
  const b = map.getBounds(), s = b.getSouth(), w = b.getWest(), dla = (b.getNorth() - s) / n, dlo = (b.getEast() - w) / n;
  const pts = [], t0 = performance.now();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const la = s + (i + .5) * dla, lo = w + (j + .5) * dlo, q = salesFast(la, lo, Fm, m2);
    if (q.pop1 < minP) continue; pts.push({la, lo, s: q.s, ratio: q.s / target, pop1: q.pop1});
  }
  const sorted = pts.map(p => p.s).sort((a, b) => b - a), q = f => sorted[Math.floor(f * (sorted.length - 1))] ?? Infinity;
  const q1 = q(.1), q2 = q(.3), q3 = q(.6);
  const col = v => v >= q1 ? css('--olive') : v >= q2 ? css('--steel2') : v >= q3 ? css('--ochre') : null;
  const go = p => { ST.cur.la = +p.la.toFixed(5); ST.cur.lo = +p.lo.toFixed(5); ST.cur.name = 'Punto de oportunidad'; fillGiroForm(); pin.setLatLng([p.la, p.lo]); map.setView([p.la, p.lo], Math.max(map.getZoom(), 13)); tab('eval'); run(); };
  pts.forEach(p => { const c = col(p.s); if (!c) return;
    L.rectangle([[p.la - dla / 2, p.lo - dlo / 2], [p.la + dla / 2, p.lo + dlo / 2]], {pane: 'opp', renderer: oCanvas, stroke: false, fillColor: c, fillOpacity: .42})
      .bindTooltip(`${fQ(p.s)} · ${fN(p.ratio * 100)}% del objetivo`, {direction: 'top'}).on('click', () => go(p)).addTo(oppLayer); });
  pts.sort((a, b) => b.s - a.s);
  const top = []; for (const p of pts) { if (top.every(t => dist(t.la, t.lo, p.la, p.lo) > Math.max(1.5, Fm.core))) top.push(p); if (top.length >= 10) break; }
  $('#oInfo').textContent = `${pts.length} puntos · ${Math.round(performance.now() - t0)} ms`;
  $('#oT').innerHTML = top.length ? `<thead><tr><th>Ubicación</th><th>Venta</th><th>vs obj.</th><th>Pob. 1 km</th></tr></thead><tbody>${top.map((p, k) => {
    let mu = null, nd = 9; within(p.la, p.lo, .8, (i, d) => { if (d < nd) { nd = d; mu = MUNIS[MID[i]]; } });
    return `<tr data-k="${k}"><td>${mu ? esc(mu.m) : '—'}<br><span class="lab">${p.la.toFixed(4)}, ${p.lo.toFixed(4)}</span></td><td>${fQ(p.s)}</td><td>${fN(p.ratio * 100)}%</td><td>${fN(p.pop1)}</td></tr>`; }).join('')}</tbody>` : '<tbody><tr><td>Ningún punto supera la población mínima en esta vista.</td></tr></tbody>';
  $('#oT').onclick = e => { const tr = e.target.closest('tr[data-k]'); if (tr) go(top[+tr.dataset.k]); };
}
$('#bOpp').onclick = opportunity;
$('#bOppClr').onclick = () => { oppLayer.clearLayers(); $('#oT').innerHTML = ''; $('#oInfo').textContent = ''; };

/* ---------- Base de datos ---------- */
const PARAM_META = [['spend', 'Gasto US$/persona/mes', 1], ['share', 'Participación capturable (0–1)', .05], ['lambda', 'Fricción de distancia λ', .1], ['cov', 'Cobertura del mapa (0–1)', .05], ['u0', 'Oferta no mapeada (tamaño)', 10]];
function renderDB() {
  $('#dbGiro').textContent = G().n;
  $('#params').innerHTML = PARAM_META.map(([k, l, st]) => `<div class="fld"><label class="lab" for="p_${k}">${l}</label><input id="p_${k}" type="number" step="${st}" value="${C()[k]}" data-p="${k}"></div>`).join('') +
    `<p class="note" style="grid-column:1/-1">Saturación de referencia calculada con el área metropolitana: <b>${nf2.format(SATREF * 1000)}</b> unidades de tamaño por 1,000 habitantes.</p>`;
  $('#fmtT').innerHTML = `<thead><tr><th>Formato</th><th>Tamaño</th><th>Alcance km</th><th>Núcleo km</th><th>US$/m² año</th></tr></thead><tbody>` +
    Object.entries(C().formats).map(([k, f]) => `<tr><td>${esc(f.n)}</td>${['m2', 'R', 'core', 'qm2'].map(a => `<td><input id="f_${k}_${a}" type="number" value="${f[a]}" data-f="${k}" data-a="${a}"></td>`).join('')}</tr>`).join('') + '</tbody>';
  const cnt = {}; COMPS.forEach(c => { const k = c.b || '_i'; cnt[k] = (cnt[k] || 0) + 1; });
  const B = G().brands;
  $('#brT').innerHTML = `<thead><tr><th>Marca</th><th>Grupo</th><th>Puntos</th><th>Tamaño</th></tr></thead><tbody>` +
    Object.entries(B).map(([k, b]) => `<tr><td>${esc(b[0])}</td><td>${esc(b[1])}</td><td>${cnt[k] || 0}</td><td><input id="b_${k}" type="number" step="10" value="${C().bsize[k] ?? b[2]}" data-b="${k}"></td></tr>`).join('') +
    `<tr><td>${esc(G().indep[0])}</td><td>Independiente</td><td>${cnt._i || 0}</td><td><input id="b__i" type="number" step="10" value="${C().bsize._i ?? G().indep[1]}" data-b="_i"></td></tr></tbody>`;
  renderMunis();
  $('#ucBr').innerHTML = Object.entries(B).map(([k, b]) => `<option value="${k}">${esc(b[0])}</option>`).join('') + '<option value="">Otro (escriba el nombre)</option>';
  const mine = ST.userComps.map((u, k) => ({u, k})).filter(x => (x.u.giro || 'SUP') === ST.giro);
  $('#ucN').textContent = `${mine.length} agregados en ${G().n.toLowerCase()}`;
  $('#ucL').innerHTML = mine.map(({u, k}) => `<li><span>${esc(u.name)} · ${fN(u.size)} <span class="d">${u.la.toFixed(4)}, ${u.lo.toFixed(4)}</span></span><button class="x" data-uc="${k}" aria-label="Eliminar">×</button></li>`).join('');
}
function renderMunis() {
  const q = $('#muQ').value.trim().toLowerCase();
  const rows = MUNIS.filter(m => !q || (m.m + ' ' + m.d).toLowerCase().includes(q)).sort((a, b) => b.p - a.p);
  $('#muN').textContent = `${MUNIS.length} registros`;
  $('#muT').innerHTML = `<thead><tr><th>Distrito / zona</th><th>Departamento</th><th>Población</th><th>IPA</th></tr></thead><tbody>` +
    rows.slice(0, 40).map(m => `<tr><td>${esc(m.m)}${ST.muni[m.id] != null ? '<span class="chip">editado</span>' : ''}</td><td>${esc(m.d)}</td><td>${fN(m.p)}</td><td><input id="m_${m.id}" type="number" step="0.05" value="${muniIdx(m.id)}" data-m="${m.id}"></td></tr>`).join('') +
    (rows.length > 40 ? `<tr><td colspan="4" class="lab">${rows.length - 40} más · refine la búsqueda</td></tr>` : '') + '</tbody>';
}
$('#muQ').addEventListener('input', renderMunis);
$('[data-pane="db"]').addEventListener('change', e => {
  const t = e.target, v = parseFloat(t.value);
  if (!t.dataset.p && !t.dataset.f && !t.dataset.b && !t.dataset.m) return; if (isNaN(v)) return;
  if (t.dataset.p) { C()[t.dataset.p] = v; if (t.dataset.p === 'spend') $('#sSpend').value = v; rebuildDemand(); rebuildCompetition(); }
  else if (t.dataset.f) { C().formats[t.dataset.f][t.dataset.a] = v; if (t.dataset.a === 'm2' && ST.cur.fmt === t.dataset.f) $('#sM2').value = v; }
  else if (t.dataset.b) { C().bsize[t.dataset.b] = v; buildComps(); rebuildCompetition(); drawComps(); }
  else if (t.dataset.m) { ST.muni[t.dataset.m] = v; rebuildDemand(); renderMunis(); if (LY.ipa) dens.draw(); }
  save(); run(); toast('Supuesto actualizado');
});
$('#ucL').addEventListener('click', e => { const b = e.target.closest('[data-uc]'); if (!b) return; ST.userComps.splice(+b.dataset.uc, 1); afterComps(); });
$('#bAddC').onclick = () => { addMode = !addMode; $('#bAddC').classList.toggle('on', addMode); $('#bAddC').textContent = addMode ? 'Terminar de agregar' : 'Agregar en el mapa';
  $('#hint').hidden = !addMode; $('#hint').textContent = 'Clic en el mapa para ubicar cada competidor'; };
$('#ucFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => {
    let n = 0; const B = G().brands;
    String(rd.result).split(/\r?\n/).filter(Boolean).forEach(ln => {
      const p = ln.split(/[,;\t]/).map(x => x.trim().replace(/^"|"$/g, '')); const la = parseFloat(p[0]), lo = parseFloat(p[1]);
      if (isNaN(la) || isNaN(lo) || la < 12.8 || la > 14.7 || lo < -90.5 || lo > -87.4) return;
      const q = (p[3] || '').toLowerCase(), br = Object.entries(B).find(([c, b]) => q && (q === b[0].toLowerCase() || q === b[1].toLowerCase()));
      ST.userComps.push({giro: ST.giro, la, lo, name: p[2] || 'Competidor importado', b: br ? br[0] : '', grp: br ? br[1][1] : (p[3] || 'Independiente'), size: parseFloat(p[4]) || (br ? br[1][2] : G().indep[1])}); n++;
    });
    afterComps(); toast(`${n} competidores importados en ${G().n}`); e.target.value = '';
  };
  rd.readAsText(f);
});
function afterComps() { buildComps(); rebuildCompetition(); drawComps(); legend(); fillGiroForm(); save(); renderDB(); run(); }
$('#bCal').onclick = () => {
  const c = calibRatio(ST.cur.fmt); if (!c.n || !isFinite(c.med)) { toast('No hay puntos de cadena suficientes para calibrar'); return; }
  Object.values(C().formats).forEach(f => { f.qm2 = Math.round(f.qm2 * c.med / 10) * 10; });
  save(); renderDB(); run(); toast(`Objetivos ajustados con ${c.n} puntos de cadena existentes`);
};
let resetArmed = false;
$('#bReset').onclick = () => {
  if (!resetArmed) { resetArmed = true; $('#bReset').textContent = 'Confirmar: borrar ediciones de este giro'; $('#resetBox').innerHTML = '<p class="note">Se restablecen gasto, parámetros, formatos y tamaños del giro activo, más los IPA editados. Los sitios guardados y los competidores agregados se conservan.</p>'; return; }
  delete ST.cfg[ST.giro]; ST.muni = {}; resetArmed = false; $('#bReset').textContent = 'Restablecer supuestos'; $('#resetBox').innerHTML = '';
  setGiro(ST.giro, true); renderDB(); dens.draw(); toast('Supuestos restablecidos');
};

/* ---------- Vista satelital (Sentinel-2) ---------- */
let SAT = null, satOn = false, densWas = true;
map.createPane('sat'); map.getPane('sat').style.zIndex = 200; map.getPane('sat').style.pointerEvents = 'none';
const satLayer = L.layerGroup(), satOv = new Map();
fetch('sat/index.json').then(r => r.json()).then(j => { SAT = j; if (satOn) refreshSat(); }).catch(() => {});
function refreshSat() {
  if (!SAT || !satOn) return;
  const z = map.getZoom(), b = map.getBounds().pad(.25);
  SAT.tiles.forEach(t => {
    const bb = L.latLngBounds(t.b); if (z < (t.z || 0) || !b.intersects(bb)) return;
    if (!satOv.has(t.f)) satOv.set(t.f, L.imageOverlay(t.f, bb, {pane: 'sat', interactive: false}));
    const ov = satOv.get(t.f); if (!satLayer.hasLayer(ov)) satLayer.addLayer(ov);
  });
}
map.on('moveend zoomend', refreshSat);
function setBase(sat) {
  if (sat === satOn) return; satOn = sat;
  $$('[data-base]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.base === 'sat') === sat)));
  $('#map').classList.toggle('sat', sat);
  if (sat) { satLayer.addTo(map); refreshSat(); densWas = $('#lyDen').checked; if (densWas && !LY.ipa) { $('#lyDen').checked = false; map.removeLayer(dens); } limits.setStyle({color: '#ffffff', opacity: .55}); }
  else { map.removeLayer(satLayer); if (densWas && !$('#lyDen').checked) { $('#lyDen').checked = true; dens.addTo(map); } limits.setStyle({color: css('--slate'), opacity: .45}); }
  if (LAST) drawSite(LAST);
  try { localStorage.setItem('sitescore-sv-base', sat ? 'sat' : 'map'); } catch (e) {}
}
$$('[data-base]').forEach(b => b.onclick = () => setBase(b.dataset.base === 'sat'));
// recorte satelital para el PDF
async function satCrop(la, lo, half, wpt, hpt) {
  if (!SAT) { try { SAT = await (await fetch('sat/index.json')).json(); } catch (e) { return null; } }
  const kx = 111.32 * Math.cos(la * Math.PI / 180), dlo = half / kx, dla = half * (hpt / wpt) / 110.57;
  const w = lo - dlo, e = lo + dlo, s = la - dla, n = la + dla;
  const hit = SAT.tiles.filter(t => t.z >= 11 && t.b[0][0] < n && t.b[1][0] > s && t.b[0][1] < e && t.b[1][1] > w);
  if (!hit.length) return null;
  const mx = x => x * 20037508.34 / 180, my = y => Math.log(Math.tan((90 + y) * Math.PI / 360)) * 6378137;
  const cv = document.createElement('canvas'); cv.width = 1100; cv.height = Math.round(1100 * hpt / wpt);
  const g = cv.getContext('2d'); g.fillStyle = '#d9dcd6'; g.fillRect(0, 0, cv.width, cv.height);
  const X0 = mx(w), X1 = mx(e), Y0 = my(s), Y1 = my(n), fx = v => (mx(v) - X0) / (X1 - X0) * cv.width, fy = v => (Y1 - my(v)) / (Y1 - Y0) * cv.height;
  const base = SAT.tiles.filter(t => !t.z), list = base.concat(hit);
  for (const t of list) {
    const img = new Image(); img.src = t.f; try { await img.decode(); } catch (er) { continue; }
    const dx = fx(t.b[0][1]), dy = fy(t.b[1][0]); g.drawImage(img, dx, dy, fx(t.b[1][1]) - dx, fy(t.b[0][0]) - dy);
  }
  try { return cv.toDataURL('image/jpeg', .82); } catch (er) { return null; }
}
const halfFor = r => Math.max(3, Math.min(8, (r.r90 || 3) * 1.15));

/* ---------- Reporte PDF (Formato RV, lámina 16:9) ---------- */
const RV = {ink: [16, 24, 32], slate: [67, 83, 94], muted: [124, 138, 147], rule: [220, 225, 228], rule2: [237, 240, 241], panel: [243, 242, 238],
  steel: [27, 58, 92], steel2: [62, 107, 140], brick: [142, 59, 43], ochre: [160, 118, 30], olive: [76, 107, 61], white: [255, 255, 255]};
const RV_TOKEN = {'--steel': 'steel', '--brick': 'brick', '--olive': 'olive', '--ochre': 'ochre', '--muted': 'muted', '--slate': 'slate'};
const PW = 960, PH = 540, ML = 58, MR = 920;
const san = s => String(s ?? '').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/²/g, '2').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
const mix = (c, a, bg = RV.white) => c.map((v, k) => Math.round(bg[k] + (v - bg[k]) * a));
function grpRGB(c) { if (c.grp === 'Mercados') return RV.ochre; return RV[RV_TOKEN[GROUP_COL[c.grp]] || 'slate']; }
function T(doc, s, x, y, o = {}) {
  doc.setFont('helvetica', o.b ? 'bold' : (o.i ? 'italic' : 'normal')); doc.setFontSize(o.size || 9); doc.setTextColor(...(o.c || RV.ink));
  const opt = {}; if (o.align) opt.align = o.align; if (o.cs) opt.charSpace = o.cs; if (o.angle) opt.angle = o.angle; if (o.w) opt.maxWidth = o.w;
  doc.text(san(s), x, y, opt);
}
const LAB = (doc, s, x, y, o = {}) => T(doc, san(s).toUpperCase(), x, y, {size: 6.5, c: RV.muted, b: true, cs: 1.1, ...o});
function hline(doc, x1, x2, y, w = .5, c = RV.rule) { doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x1, y, x2, y); }
function frame(doc, sec, secName, title, sub, page, foot) {
  doc.setFillColor(...RV.white); doc.rect(0, 0, PW, PH, 'F');
  hline(doc, 34, 34, 0, .5); doc.line(34, 0, 34, PH);
  T(doc, String(sec).padStart(2, '0'), 17, 44, {size: 9, b: true, align: 'center', c: RV.steel2});
  T(doc, san(secName).toUpperCase(), 21, 300, {size: 6.5, b: true, c: RV.muted, cs: 1.4, angle: 90});
  T(doc, title, ML, 58, {size: 21, b: true});
  T(doc, sub, ML, 75, {size: 8.5, c: RV.slate});
  hline(doc, ML, MR, 85, 1.6, RV.ink);
  hline(doc, ML, MR, 513, .5);
  T(doc, foot || `SiteScore SV · Reporte de sitio · ${G().n}`, ML, 526, {size: 7, c: RV.muted});
  T(doc, `Confidencial · ${String(page).padStart(2, '0')}`, MR, 526, {size: 7, c: RV.muted, align: 'right'});
}
function tablePDF(doc, x, y, cols, rows, o = {}) {
  // cols: [{t, w, align}] ; rows: arrays of strings or {grp}
  const rh = o.rh || 13.5, fs = o.fs || 8;
  let cx = x; cols.forEach(c => { LAB(doc, c.t, c.align === 'left' ? cx : cx + c.w, y, {align: c.align === 'left' ? 'left' : 'right', size: 6}); cx += c.w; });
  const W = cols.reduce((a, c) => a + c.w, 0); hline(doc, x, x + W, y + 4, .8, RV.ink); y += 4;
  rows.forEach(r => {
    if (r.grp) { y += rh; LAB(doc, r.grp, x, y - 3, {size: 6, c: RV.steel2}); hline(doc, x, x + W, y + 1, .5, RV.rule); return; }
    y += rh; cx = x;
    r.forEach((v, k) => { const c = cols[k]; T(doc, v, c.align === 'left' ? cx : cx + c.w, y - 3.5, {size: fs, align: c.align === 'left' ? 'left' : 'right', c: k ? RV.ink : RV.slate, b: r.bold}); cx += c.w; });
    hline(doc, x, x + W, y + 1, .4, RV.rule2);
  });
  return y;
}
function mapPDF(doc, r, x, y, w, h, half, satImg) {
  const la0 = r.site.la, lo0 = r.site.lo, kx = 111.32 * Math.cos(la0 * Math.PI / 180), s = w / (2 * half);
  const P = (la, lo) => [x + w / 2 + (lo - lo0) * kx * s, y + h / 2 - (la - la0) * 110.57 * s];
  doc.setFillColor(...RV.panel); doc.rect(x, y, w, h, 'F');
  doc.saveGraphicsState(); doc.rect(x, y, w, h, null); doc.clip(); doc.discardPath();
  if (satImg) { doc.addImage(satImg, 'JPEG', x, y, w, h); doc.setGState(new doc.GState({opacity: .3})); }
  const cw = RES * kx * s + .4, ch = RES * 110.57 * s + .4, al = [0, .14, .24, .36, .5, .64, .78];
  within(la0, lo0, half * 1.5, i => {
    const v = POP[i] * 4; let k = 0; while (k < DEN_BINS.length && v >= DEN_BINS[k]) k++; if (!k) return;
    const [px, py] = P(LAT[i], LON[i]); doc.setFillColor(...(satImg ? RV.steel : mix(RV.steel, al[k], RV.panel))); if (satImg && k < 3) return; doc.rect(px - cw / 2, py - ch / 2, cw, ch, 'F');
  });
  if (satImg) doc.setGState(new doc.GState({opacity: 1}));
  // límites municipales y zonas
  doc.setDrawColor(...(satImg ? [235, 235, 235] : mix(RV.slate, .45, RV.panel))); doc.setLineWidth(.4);
  const dla = half * 1.5 / 110.57, dlo = half * 1.5 / kx;
  const ring = cs => { for (let k = 1; k < cs.length; k++) { const a = cs[k - 1], b = cs[k]; if (Math.abs(a[1] - la0) > dla && Math.abs(b[1] - la0) > dla) continue; if (Math.abs(a[0] - lo0) > dlo && Math.abs(b[0] - lo0) > dlo) continue; const p = P(a[1], a[0]), q = P(b[1], b[0]); doc.line(p[0], p[1], q[0], q[1]); } };
  SD.geo.features.forEach(f => { const g = f.geometry; if (!g) return; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; polys.forEach(pl => pl.forEach(ring)); });
  // anillos y área de influencia
  const [cx, cy] = P(la0, lo0);
  doc.setDrawColor(...(satImg ? RV.white : RV.ink)); doc.setLineWidth(.5); doc.setLineDashPattern([1.5, 2.5], 0);
  [1, 3, 5].forEach(k => { if (k <= half * 1.4) doc.circle(cx, cy, k * s, 'S'); });
  const tc = satImg ? [156, 199, 234] : RV.steel2; doc.setDrawColor(...tc); doc.setLineWidth(1); doc.setLineDashPattern([5, 4], 0); if (r.r90) doc.circle(cx, cy, r.r90 * s, 'S');
  doc.setLineDashPattern([], 0); doc.setLineWidth(1.6); if (r.r70) doc.circle(cx, cy, r.r70 * s, 'S');
  // competidores
  const mx = Math.max(...Object.values(G().brands).map(b => b[2]), G().indep[1], 1);
  COMPS.filter(c => dist(la0, lo0, c.la, c.lo) <= half * 1.45).sort((a, b) => csize(b) - csize(a)).forEach(c => {
    const [px, py] = P(c.la, c.lo), rr = 1.8 + 4 * Math.sqrt(csize(c) / mx), col = grpRGB(c);
    if (c.grp === 'Mercados') { doc.setDrawColor(...col); doc.setLineWidth(1); doc.circle(px, py, rr, 'S'); }
    else { doc.setFillColor(...col); doc.setDrawColor(...RV.white); doc.setLineWidth(.5); doc.circle(px, py, rr, 'FD'); }
  });
  // etiquetas
  MUNIS.forEach(m => { const d = dist(la0, lo0, m.la, m.lo); if (d > half * 1.1) return; const [px, py] = P(m.la, m.lo); T(doc, shortName(m).toUpperCase(), px, py, {size: 5.5, b: true, c: satImg ? RV.white : RV.slate, cs: .6, align: 'center'}); });
  // sitio
  doc.setDrawColor(...(satImg ? RV.white : RV.ink)); doc.setLineWidth(1.2); doc.line(cx - 9, cy, cx + 9, cy); doc.line(cx, cy - 9, cx, cy + 9);
  doc.setFillColor(...RV.white); doc.circle(cx, cy, 3.6, 'FD');
  doc.restoreGraphicsState();
  doc.setDrawColor(...RV.rule); doc.setLineWidth(.6); doc.rect(x, y, w, h, 'S');
  // escala y norte
  const sb = s; doc.setFillColor(...RV.white); doc.rect(x + 8, y + h - 22, sb + 30, 15, 'F');
  doc.setDrawColor(...RV.ink); doc.setLineWidth(1.2); doc.line(x + 12, y + h - 12, x + 12 + sb, y + h - 12);
  T(doc, '1 km', x + 16 + sb, y + h - 10, {size: 6.5, c: RV.ink});
  T(doc, 'N', x + w - 12, y + 16, {size: 9, b: true, align: 'center'}); doc.setFillColor(...RV.ink); doc.triangle(x + w - 12, y + 19, x + w - 15.5, y + 27, x + w - 8.5, y + 27, 'F');
}
function legendPDF(doc, x, y) {
  LAB(doc, 'Habitantes por km²', x, y);
  const al = [.14, .24, .36, .5, .64, .78];
  al.forEach((a, k) => { doc.setFillColor(...mix(RV.steel, a, RV.panel)); doc.rect(x + k * 16, y + 4, 16, 6, 'F'); });
  T(doc, '250', x, y + 18, {size: 6, c: RV.muted}); T(doc, '20 mil+', x + 96, y + 18, {size: 6, c: RV.muted, align: 'right'});
  let cx = x + 118, ly = y;
  const keys = Object.entries(GROUP_COL).filter(([g]) => g !== 'Independiente').map(([g, v]) => [g, RV[RV_TOKEN[v]]]).concat([['Otras cadenas', RV.slate], ['Independiente', RV.muted]]);
  keys.forEach(([g, c]) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); const tw = doc.getTextWidth(san(g)); if (cx + 12 + tw > x + 372) { cx = x + 118; ly += 11; } doc.setFillColor(...c); doc.circle(cx + 3, ly + 7, 2.6, 'F'); T(doc, g, cx + 8, ly + 9.5, {size: 6.5, c: RV.slate}); cx += 14 + tw; });
  doc.setDrawColor(...RV.steel2); doc.setLineWidth(1.6); doc.line(x, y + 30, x + 14, y + 30); T(doc, 'Área primaria (70 % de la venta)', x + 18, y + 32.5, {size: 6.5, c: RV.slate});
  doc.setLineWidth(1); doc.setLineDashPattern([4, 3], 0); doc.line(x + 150, y + 30, x + 164, y + 30); doc.setLineDashPattern([], 0);
  T(doc, 'Secundaria (90 %)', x + 168, y + 32.5, {size: 6.5, c: RV.slate});
  doc.setDrawColor(...RV.ink); doc.setLineWidth(.5); doc.setLineDashPattern([1.5, 2.5], 0); doc.line(x + 240, y + 30, x + 254, y + 30); doc.setLineDashPattern([], 0);
  T(doc, 'Anillos 1, 3 y 5 km', x + 258, y + 32.5, {size: 6.5, c: RV.slate});
}
const VERD = {A: 'Sitio prioritario. La venta estimada alcanza el objetivo del formato y la competencia deja espacio.', B: 'Sitio viable. Conviene validar accesos, visibilidad y costo de renta antes de negociar.',
  C: 'Sitio marginal. Solo funciona con renta baja o con un formato más pequeño.', D: 'No recomendado con este formato.'};
const GCOL = {A: RV.olive, B: RV.steel2, C: RV.ochre, D: RV.brick};
function sitePages(doc, r, secNo, pageNo) {
  const s = r.site, loc = r.mu ? `${r.mu.m}, ${r.mu.d}` : 'Sin población registrada cerca';
  const sub = `${loc}  ·  ${s.la.toFixed(6)}, ${s.lo.toFixed(6)}  ·  ${G().n} · ${r.F.n} · ${fN(r.m2)} m²  ·  Cadena: ${s.grp}`;
  // ---- Página 1: ubicación y desempeño
  frame(doc, secNo, 'Ubicación y desempeño', s.name, sub, pageNo);
  mapPDF(doc, r, ML, 100, 372, 330, halfFor(r), r.satImg);
  legendPDF(doc, ML, 446);
  const X = 456;
  LAB(doc, 'Score del sitio', X, 108);
  T(doc, String(r.score), X, 160, {size: 50, b: true});
  T(doc, '/100', X + doc.getTextWidth(String(r.score)) * 50 / doc.getFontSize() + 4, 128, {size: 9, c: RV.muted});
  const gc = GCOL[r.grade]; doc.setDrawColor(...gc); doc.setLineWidth(1.2); doc.rect(X + 112, 104, 52, 15, 'S'); T(doc, `CLASE ${r.grade}`, X + 138, 114.5, {size: 7, b: true, c: gc, align: 'center', cs: 1});
  const wk = r.f.slice().sort((a, b) => a[1] - b[1])[0];
  T(doc, `${VERD[r.grade]} ${wk[1] >= .95 ? 'Ningún factor débil.' : 'Punto más débil: ' + wk[0].toLowerCase() + '.'}`, X + 112, 134, {size: 8.5, c: RV.ink, w: 170, i: true});
  let fy = 184;
  r.f.forEach(([n, v]) => { T(doc, n, X, fy, {size: 7.5, c: RV.slate}); doc.setFillColor(...RV.rule2); doc.rect(X + 100, fy - 5.5, 160, 5, 'F'); doc.setFillColor(...RV.steel2); doc.rect(X + 100, fy - 5.5, 160 * v, 5, 'F'); T(doc, fN(v * 100), X + 282, fy, {size: 7.5, align: 'right', c: RV.slate}); fy += 13; });
  // KPI 3x2 a la derecha
  const prim = r.rings.find(g => g.r === r.F.core) || r.rings[2], net = r.sales - r.canib, nue = s.grp === 'Nuevo entrante';
  const K = [['Venta anual estimada', fQ(r.sales), `${fQ(r.sales / r.m2)} por m²`], ['Frente al objetivo', `${fN(r.ratio * 100)} %`, `objetivo ${fQ(r.target)}`],
    ['Captura en radio núcleo', `${nf1.format(prim.addr ? 100 * prim.cap / prim.addr : 0)} %`, `del gasto capturable a ${r.F.core} km`],
    ['Área primaria / secundaria', `${nf1.format(r.r70)} / ${nf1.format(r.r90)} km`, '70 % y 90 % de la venta'],
    ['Canibalización', nue ? '-' : fQ(r.canib), nue ? 'sin tiendas propias' : `${r.ownN} puntos ${s.grp}`], ['Venta neta incremental', fQ(net), r.sales ? `${fN(100 * net / r.sales)} % de la venta bruta` : '']];
  const KX = 760, KW = 160;
  LAB(doc, 'Venta y captura · anual', KX, 108);
  K.forEach(([l, v, sb], k) => { const ky = 112 + k * 33; hline(doc, KX, KX + KW, ky, .4, RV.rule2); LAB(doc, l, KX, ky + 9, {size: 5.8}); T(doc, v, KX, ky + 22, {size: 12.5, b: true, c: k === 1 ? (r.ratio >= 1 ? RV.olive : r.ratio < .7 ? RV.brick : RV.ink) : RV.ink}); T(doc, sb, KX + KW, ky + 22, {size: 6.3, c: RV.muted, align: 'right'}); });
  // tabla mercado por radio
  const rg = r.rings, cw = 58;
  LAB(doc, 'Mercado por radio · línea recta', X, 318);
  tablePDF(doc, X, 332, [{t: 'Indicador', w: 150, align: 'left'}, ...rg.map(g => ({t: `${g.r} km`, w: cw}))], [
    ['Gasto capturable anual', ...rg.map(g => fQ(g.addr))], ['Competidores', ...rg.map(g => fN(g.n))], ['Tamaño competidor', ...rg.map(g => fN(g.m2))],
    ['Tamaño por 1,000 hab.', ...rg.map(g => g.pop ? nf1.format(1000 * g.m2 / g.pop) : '-')], ['Captura del sitio', ...rg.map(g => g.addr ? nf1.format(100 * g.cap / g.addr) + ' %' : '-')]], {rh: 13});
  const gt = Object.entries(r.genC).map(([t, n]) => `${n} ${n > 1 ? GEN_P[t] : GEN_N[t].toLowerCase()}`).join(', ');
  T(doc, `Generadores de tráfico a 1 km: ${gt || 'ninguno mapeado'}.`, X, 412, {size: 7.2, c: RV.slate, w: 455});
  // curva de captación
  LAB(doc, 'Curva de captación · % de la venta por distancia', X, 434);
  const labs = ['0-1', '1-2', '2-3', '3-5', '5-8', '8-15'], mxb = Math.max(...r.bands, 1), bw = 70;
  r.bands.forEach((v, k) => { const bh = 44 * v / mxb, bx = X + k * (bw + 6), by = 500 - bh; doc.setFillColor(...(k === 0 || BANDS[k - 1] < r.F.R ? RV.steel2 : RV.rule)); doc.rect(bx, by, bw, bh, 'F');
    if (v > 0 && r.sales) T(doc, `${fN(100 * v / r.sales)} %`, bx + bw / 2, by - 3, {size: 6.5, c: RV.slate, align: 'center'}); T(doc, `${labs[k]} km`, bx + bw / 2, 509, {size: 6, c: RV.muted, align: 'center'}); });
  hline(doc, X, X + 6 * (bw + 6) - 6, 500, .8, RV.ink);
  // ---- Página 2: demografía y competencia
  doc.addPage([PW, PH], 'landscape');
  frame(doc, secNo, 'Demografía y competencia', s.name, sub, pageNo + 1);
  const S = rg.map(ageStats), pct = v => nf1.format(100 * v) + ' %', area = g => Math.PI * g.r * g.r;
  LAB(doc, 'Perfil demográfico · radios desde el punto', ML, 104);
  tablePDF(doc, ML, 118, [{t: 'Indicador', w: 170, align: 'left'}, ...rg.map(g => ({t: `${g.r} km`, w: 62}))], [
    {grp: 'Población'}, ['Población 2020', ...rg.map(g => fN(g.p20))], ['Población 2025', ...rg.map(g => fN(g.pop))], ['Proyección 2030', ...rg.map(g => fN(g.p30))],
    ['Crecimiento anual 2020-25', ...rg.map(g => pct(cagr(g.p20, g.pop, 5)))], ['Crecimiento anual 2025-30', ...rg.map(g => pct(cagr(g.pop, g.p30, 5)))],
    ['Densidad hab./km²', ...rg.map(g => fN(g.pop / area(g)))], ['Hogares (estimado)', ...rg.map(g => fN(g.hh))],
    {grp: 'Edad y sexo'}, ...['0-14', '15-29', '30-44', '45-64', '65+'].map((n, k) => [`${n} años`, ...S.map(x => pct(x.groups[k][1]))]),
    ['Edad mediana', ...S.map(x => nf1.format(x.med) + ' años')], ['Mujeres', ...S.map(x => pct(x.fem))], ['Población 15-64', ...S.map(x => fN(x.work))], ['Razón de dependencia', ...S.map(x => nf2.format(x.depRatio))],
    {grp: 'Poder de compra'}, ['IPA promedio', ...rg.map(g => g.pop ? nf2.format(g.ipaw / g.pop) : '-')],
    ['Gasto del giro, total anual', ...rg.map(g => fQ(g.pop * C().spend * 12 * (g.pop ? g.ipaw / g.pop : 0)))], ['Gasto del giro por hogar al mes', ...rg.map(g => g.hh ? CUR + ' ' + fN(g.pop * C().spend * (g.ipaw / g.pop) / g.hh) : '-')]
  ], {rh: 13.2, fs: 7.8});
  // pirámide 3 km
  const g3 = rg[2], a = g3.age, PX = 520, PY = 112, rowH = 10.5, mid = PX + 200, lab = 32, mxa = Math.max(...Array.from(a), 1), sc = v => (200 - lab / 2 - 8) * v / mxa;
  LAB(doc, 'Pirámide de población a 3 km', PX, 104);
  for (let k = 0; k < 15; k++) { const yy = PY + (14 - k) * rowH; doc.setFillColor(...RV.steel2); doc.rect(mid - lab / 2 - sc(a[k + 15]), yy, sc(a[k + 15]), rowH - 2, 'F'); doc.setFillColor(...RV.ochre); doc.rect(mid + lab / 2, yy, sc(a[k]), rowH - 2, 'F'); T(doc, ABANDS[k], mid, yy + rowH - 3.2, {size: 6, c: RV.muted, align: 'center'}); }
  const tm = a.slice(15).reduce((p, q) => p + q, 0), tf = a.slice(0, 15).reduce((p, q) => p + q, 0);
  T(doc, `Hombres ${fN(tm)}`, mid - lab / 2 - 4, PY + 15 * rowH + 9, {size: 7, c: RV.steel2, align: 'right'}); T(doc, `Mujeres ${fN(tf)}`, mid + lab / 2 + 4, PY + 15 * rowH + 9, {size: 7, c: RV.ochre});
  // competencia
  LAB(doc, `Competencia a 3 km · ${r.list.length} puntos`, PX, 302);
  const lst = r.list.slice(0, 13);
  tablePDF(doc, PX, 316, [{t: 'Punto', w: 196, align: 'left'}, {t: 'Grupo', w: 100, align: 'left'}, {t: 'Tamaño', w: 52}, {t: 'Distancia', w: 52}],
    lst.length ? lst.map(({c, d}) => [san(c.name).slice(0, 38), san(c.grp).slice(0, 20), fN(csize(c)), nf1.format(d) + ' km']) : [['Sin competencia mapeada a 3 km', '', '', '']], {rh: 13, fs: 7.5});
  T(doc, `Supuestos: gasto ${CUR} ${fN(C().spend)} por persona al mes en ${G().n.toLowerCase()}; participación capturable ${nf2.format(C().share)}; fricción de distancia ${nf1.format(C().lambda)}; cobertura del mapa ${nf2.format(C().cov)}. ` +
    `Fuentes: WorldPop 2020-2030, COD-PS 2024 (edad y sexo; UNFPA y DIGESTYC), geoBoundaries ADM2 (distritos), OpenStreetMap ${SP.fecha || ''} (HOT export), EHPM 2023 (BCR/ONEC: ingreso y personas por hogar), imagen Copernicus Sentinel-2 2025-26. Hogares con el tamaño promedio del departamento (3.0 a 3.3). Cifras en dólares. Distancias en línea recta.`,
    ML, 470, {size: 6.5, c: RV.muted, w: 420});
  return pageNo + 2;
}
function coverPDF(doc, rs) {
  doc.setFillColor(...RV.ink); doc.rect(0, 0, PW, PH, 'F');
  doc.setDrawColor(...mix(RV.white, .07, RV.ink)); doc.setLineWidth(.4);
  for (let x = 0; x <= PW; x += 40) doc.line(x, 0, x, PH); for (let y = 0; y <= PH; y += 40) doc.line(0, y, PW, y);
  // dibujo esquemático: anillos y sitios
  doc.setDrawColor(...mix(RV.steel2, .9, RV.ink)); doc.setLineWidth(.8);
  [40, 90, 150, 220].forEach((rr, k) => { doc.setLineDashPattern(k % 2 ? [3, 4] : [], 0); doc.circle(700, 270, rr, 'S'); }); doc.setLineDashPattern([], 0);
  doc.setDrawColor(...RV.white); doc.setLineWidth(1.2); doc.line(688, 270, 712, 270); doc.line(700, 258, 700, 282);
  [[640, 210], [790, 330], [610, 360], [760, 170], [830, 250]].forEach(([x, y]) => { doc.setFillColor(...mix(RV.steel2, .8, RV.ink)); doc.circle(x, y, 4, 'F'); });
  T(doc, 'SITESCORE SV', 70, 92, {size: 8, b: true, c: mix(RV.white, .6, RV.ink), cs: 2});
  T(doc, rs.length > 1 ? 'Reporte de sitios' : 'Reporte de sitio', 70, 250, {size: 36, b: true, c: RV.white});
  T(doc, `${G().n} · ${rs.length} ${rs.length > 1 ? 'ubicaciones evaluadas' : 'ubicación evaluada'}`, 70, 278, {size: 13, c: mix(RV.white, .8, RV.ink)});
  const d = new Date(); T(doc, `El Salvador · ${d.toLocaleDateString('es-SV', {day: 'numeric', month: 'long', year: 'numeric'})}`, 70, 298, {size: 9.5, c: mix(RV.white, .6, RV.ink)});
  hline(doc, 70, 460, 470, .5, mix(RV.white, .3, RV.ink));
  T(doc, 'Modelo de gravedad (Huff) sobre población 2025 en celdas de 500 m, poder adquisitivo por distrito y zona, y competencia de OpenStreetMap. Cifras en dólares (US$).', 70, 486, {size: 7.5, c: mix(RV.white, .55, RV.ink), w: 390});
}
function comparePDF(doc, rs, pageNo) {
  frame(doc, 1, 'Comparación', 'Comparación de sitios', `${G().n} · ordenados por score · venta anual en dólares (US$)`, pageNo);
  const cols = [{t: '#', w: 16, align: 'left'}, {t: 'Sitio', w: 190, align: 'left'}, {t: 'Distrito', w: 100, align: 'left'}, {t: 'Formato', w: 120, align: 'left'},
    {t: 'Score', w: 34}, {t: 'Venta', w: 62}, {t: 'vs obj.', w: 42}, {t: 'Pob. 3 km', w: 58}, {t: 'Crec. 20-25', w: 52}, {t: 'IPA', w: 36}, {t: 'Comp. 3 km', w: 50}, {t: 'Canib.', w: 52}, {t: 'Á. prim.', w: 40}];
  const rows = rs.map(({s, r}, k) => [String(k + 1), san(s.name).slice(0, 38), san(r.mu ? shortName(r.mu) : '-').slice(0, 20), san(r.F.n).slice(0, 26), `${r.score} ${r.grade}`, fQ(r.sales), `${fN(r.ratio * 100)} %`,
    fN(r.rings[2].pop), nf1.format(100 * cagr(r.rings[2].p20, r.rings[2].pop, 5)) + ' %', nf2.format(r.ipaC), fN(r.rings[2].n), s.grp === 'Nuevo entrante' ? '-' : fQ(r.canib), nf1.format(r.r70) + ' km']);
  const ty = tablePDF(doc, ML, 110, cols, rows.slice(0, 14), {rh: 15, fs: 7.6});
  const bx = ML, by0 = ty + 34, n = Math.min(rs.length, 14), bh = Math.min(14, (470 - by0) / Math.max(n, 1) - 4);
  if (n && bh > 5) {
    LAB(doc, 'Score (barra) y venta frente al objetivo (marca)', bx, by0 - 10);
    rs.slice(0, n).forEach(({s, r}, k) => { const y = by0 + k * (bh + 4);
      T(doc, `${k + 1}. ${san(s.name).slice(0, 34)}`, bx, y + bh - 3, {size: 7, c: RV.slate});
      doc.setFillColor(...RV.rule2); doc.rect(bx + 190, y, 400, bh, 'F'); doc.setFillColor(...GCOL[r.grade]); doc.rect(bx + 190, y, 4 * r.score, bh, 'F');
      const mx = bx + 190 + 400 * Math.min(r.ratio, 1.5) / 1.5; doc.setDrawColor(...RV.ink); doc.setLineWidth(1.4); doc.line(mx, y - 2, mx, y + bh + 2);
      T(doc, `${r.score} · ${fN(r.ratio * 100)} %`, bx + 600, y + bh - 3, {size: 7, c: RV.ink}); });
    T(doc, 'Escala de la marca: 0 a 150 % del objetivo.', bx + 190, by0 + n * (bh + 4) + 8, {size: 6.3, c: RV.muted});
  }
  const best = rs[0];
  if (best) T(doc, `Mejor ubicación: ${best.s.name} (${best.r.score}/100, clase ${best.r.grade}), con venta estimada de ${fQ(best.r.sales)} al año, ${fN(best.r.ratio * 100)} % del objetivo del formato.`, ML, 490, {size: 8.5, i: true, c: RV.ink, w: 860});
  return pageNo + 1;
}
async function makePDF(sites) {
  if (!window.jspdf) { toast('No se pudo cargar el generador de PDF'); return; }
  const doc = new window.jspdf.jsPDF({orientation: 'landscape', unit: 'pt', format: [PW, PH], compress: true});
  doc.setProperties({title: 'SiteScore SV - Reporte de sitios', creator: 'SiteScore SV'});
  const rs = sites.map(s => ({s, r: evaluate(s)}));
  for (const x of rs) x.r.satImg = await satCrop(x.r.site.la, x.r.site.lo, halfFor(x.r), 372, 330);
  let page = 1;
  if (rs.length > 1) { rs.sort((a, b) => b.r.score - a.r.score); coverPDF(doc, rs); doc.addPage([PW, PH], 'landscape'); page = comparePDF(doc, rs, 2); }
  rs.forEach(({r}, k) => { if (rs.length > 1 || k > 0) doc.addPage([PW, PH], 'landscape'); page = sitePages(doc, r, rs.length > 1 ? k + 2 : 1, page); });
  return doc;
}
let DL = null; claudeUse('downloads').then(d => { DL = d; });
function claudeUse(n) { try { return window.claude && window.claude.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null); } catch (e) { return Promise.resolve(null); } }
async function savePDF(sites, name) {
  const btns = $$('.pdfbtn'); btns.forEach(b => b.disabled = true);
  try {
    const doc = await makePDF(sites); if (!doc) return;
    const blob = doc.output('blob'), fname = `SiteScore_${san(name).replace(/[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ_-]+/g, '_').slice(0, 60)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    if (!DL) DL = await claudeUse('downloads');
    if (!DL) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast('PDF descargado'); return; }
    await DL.save({filename: fname, data: blob}); toast('PDF guardado');
  } catch (e) {
    const c = e && e.code; toast(c === 'declined' ? 'Descarga cancelada' : c === 'rate_limited' ? 'Ya hay una descarga pendiente' : 'No se pudo generar el PDF');
  } finally { btns.forEach(b => b.disabled = false); }
}
$('#bPdf').onclick = () => { readForm(); savePDF([{...ST.cur}], ST.cur.name || 'sitio'); };
$('#bPdfAll').onclick = () => { const mine = ST.sites.filter(s => s.giro === ST.giro); if (!mine.length) { toast('No hay sitios guardados en este giro'); return; } savePDF(mine, `${G().n}_${mine.length}_sitios`); };
window.__PDF = {makePDF};

/* ---------- UI general ---------- */
$('#sGiro').innerHTML = Object.entries(GIROS).map(([k, g]) => `<option value="${k}">${esc(g.n)} (${fN((SP.giros[k] || []).length)})</option>`).join('').replace('(0)', '(sus datos)');
$('#sGiro').addEventListener('change', e => setGiro(e.target.value));
$('#sFmt').addEventListener('change', () => { $('#sM2').value = C().formats[$('#sFmt').value].m2; run(); });
['#sM2', '#sGrp'].forEach(s => $(s).addEventListener('change', run));
$('#sSpend').addEventListener('change', e => { const v = parseFloat(e.target.value); if (isNaN(v) || v < 0) return; C().spend = v; rebuildDemand(); run(); toast(`Gasto: ${CUR} ${fN(v)} por persona al mes`); });
$('#sName').addEventListener('input', () => { ST.cur.name = $('#sName').value; save(); });
function tab(t) {
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== t);
  if (t === 'cmp') renderCmp(); if (t === 'db') renderDB();
  try { localStorage.setItem('sitescore-sv-tab', t); } catch (e) {}
  $('#panel').scrollTop = 0;
}
$$('.tabs button').forEach(b => b.onclick = () => tab(b.dataset.tab));
$('#lyDen').onchange = e => { if (e.target.checked || LY.ipa) { if (!map.hasLayer(dens)) dens.addTo(map); } else map.removeLayer(dens); };
$('#lyIpa').onchange = e => { LY.ipa = e.target.checked; if (LY.ipa && !map.hasLayer(dens)) dens.addTo(map); if (!LY.ipa && !$('#lyDen').checked) map.removeLayer(dens); else dens.draw(); legend(); };
$('#lyLim').onchange = e => e.target.checked ? limits.addTo(map) : map.removeLayer(limits);
$('#lyCom').onchange = e => e.target.checked ? compLayer.addTo(map) : map.removeLayer(compLayer);
$('#lyGen').onchange = e => { if (e.target.checked) { if (!genLayer.getLayers().length) drawGens(); genLayer.addTo(map); } else map.removeLayer(genLayer); };
let tt; function toast(m) { let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 1800); }
const retheme = () => { drawComps(); if (genLayer.getLayers().length) drawGens(); dens.draw(); limits.setStyle({color: css('--slate')}); if (LAST) drawSite(LAST); legend(); };
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
new MutationObserver(retheme).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
$('#dataDate').textContent = SP.fecha || '';

/* ---------- Arranque ---------- */
drawLabels(); setGiro(ST.giro, true); pin.setLatLng([ST.cur.la, ST.cur.lo]);
try { const t = localStorage.getItem('sitescore-sv-tab'); if (t && t !== 'eval') tab(t); if (localStorage.getItem('sitescore-sv-base') === 'sat') setBase(true); } catch (e) {}
window.__SS = {calibRatio, C, U0, rebuildCompetition, evaluate, ST, setGiro, N, COMPS: () => COMPS, SATREF: () => SATREF, GIROS, MUNIS, goTo, run, LAST: () => LAST};
})();
