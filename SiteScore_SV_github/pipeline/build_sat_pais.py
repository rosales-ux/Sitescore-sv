"""Mosaico nacional ~160 m con mediana por píxel (quita nubes) — parte de build_sat.py"""
import json, os, numpy as np, rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.windows import from_bounds, Window
from rasterio.transform import from_origin
import build_sat as B
def pais(bbox=(-90.15, 13.13, -87.68, 14.47), res=100, K=8, maxcc=50, per_tile=9):
    w, s, e, n = bbox; x0, y0 = B.merc(w, s); x1, y1 = B.merc(e, n)
    W = int((x1 - x0) / res); H = int((y1 - y0) / res); dst_t = from_origin(x0, y1, res, res)
    stack = np.zeros((K, 3, H, W), np.uint8); cnt = np.zeros((H, W), np.uint8)
    feats = B.search(list(bbox), maxcc); by = {}
    for f in feats: by.setdefault(f['properties'].get('grid:code'), []).append(f)
    order = [f for g, l in by.items() for f in l[:per_tile]]
    used = []
    for f in order:
        try:
            with rasterio.open(f['assets']['visual']['href']) as src:
                sb = transform_bounds('EPSG:4326', src.crs, *bbox)
                win = from_bounds(*sb, transform=src.transform).round_offsets().round_lengths().intersection(Window(0, 0, src.width, src.height))
                fac = 9; oh, ow = max(1, int(win.height / fac)), max(1, int(win.width / fac))
                arr = src.read(window=win, out_shape=(3, oh, ow), resampling=Resampling.average)
                st = src.window_transform(win) * rasterio.Affine.scale(win.width / ow, win.height / oh)
                tmp = np.zeros((3, H, W), np.uint8)
                reproject(arr, tmp, src_transform=st, src_crs=src.crs, dst_transform=dst_t, dst_crs='EPSG:3857', resampling=Resampling.bilinear, src_nodata=0, dst_nodata=0)
        except Exception as ex: print('err', f['id'], ex); continue
        valid = (tmp.min(axis=0) > 0) & (cnt < K)
        for k in range(K):
            m = valid & (cnt == k); stack[k][:, m] = tmp[:, m]
        cnt[valid] += 1; used.append(f['id'])
    print('escenas', len(used), 'cobertura', (cnt > 0).mean(), 'media capas', cnt[cnt > 0].mean())
    out = np.zeros((3, H, W), np.uint8)
    kk = np.clip(np.floor(0.3 * (cnt.astype(np.int16) - 1)), 0, K - 1).astype(np.int64)[None]
    inval = np.arange(K)[:, None, None] >= cnt[None]
    for b in range(3):
        a = stack[:, b].copy(); a[inval] = 255; a.sort(axis=0)
        out[b] = np.take_along_axis(a, kk, axis=0)[0]
    lut = (np.clip((np.arange(256) / 255.0) ** 0.85 * 1.08, 0, 1) * 255).astype(np.uint8)
    img = lut[out]; img[:, cnt == 0] = 236
    e_ = B.save(img, (s, w, n, e), 'sv_pais.jpg', 82)
    return used
if __name__ == '__main__':
    used = pais()
    ix = json.load(open('site/sat/index.json')); ix['escenas'] = sorted(set(ix['escenas']) | set(used)); json.dump(ix, open('site/sat/index.json', 'w'))
