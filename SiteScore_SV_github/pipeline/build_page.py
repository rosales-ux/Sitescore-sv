"""Arma las dos versiones de la página desde app.src.txt + app.js + leaflet.min.css 1.9.4:
  site/index.html  — contenido para el artifact de claude.ai (el visor agrega doctype, head y charset)
  gh/index.html    — página completa para GitHub Pages (doctype, charset, viewport, iconos, Open Graph)
Uso (desde la carpeta raíz): python3 pipeline/build_page.py"""
import os, urllib.request
css_p = 'data/leaflet.min.css'
if not os.path.exists(css_p):
    os.makedirs('data', exist_ok=True)
    urllib.request.urlretrieve('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', css_p)
src = open('pipeline/app.src.txt', encoding='utf-8').read()
body = src.replace('/*LEAFLET_CSS*/', open(css_p, encoding='utf-8').read()).replace('/*APP_JS*/', open('pipeline/app.js', encoding='utf-8').read())
if os.path.isdir('site'):
    open('site/index.html', 'w', encoding='utf-8').write(body); print('site/index.html', len(body.encode()) // 1024, 'KB')
# Página completa: se mueve <title> y los <link>/<style>/<meta> iniciales al head
DESC = 'Selección de sitios comerciales en El Salvador: score 0-100, venta estimada en US$, demografía a 1/2/3/5 km, competencia y reporte PDF.'
head_end = body.index('<div class="app">')
head_part, rest = body[:head_end], body[head_end:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
page = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#101820">
<link rel="icon" type="image/png" href="icono.png">
<link rel="apple-touch-icon" href="icono.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SiteScore SV">
<meta property="og:type" content="website">
<meta property="og:title" content="SiteScore SV">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="social.png">
<meta name="twitter:card" content="summary_large_image">
{head_part.strip()}
<style>html,body{{margin:0}}[hidden]{{display:none!important}}</style>
</head>
<body>
{rest.strip()}
</body>
</html>
'''
os.makedirs('gh', exist_ok=True)
open('gh/index.html', 'w', encoding='utf-8').write(page); print('gh/index.html', len(page.encode()) // 1024, 'KB')
