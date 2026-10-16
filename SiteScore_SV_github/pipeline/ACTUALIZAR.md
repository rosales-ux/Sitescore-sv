# SiteScore SV — cómo actualizar los datos

Estructura de trabajo: data/ (entradas), pipeline/ (scripts), site/ (lo que se publica). Correr todo desde la carpeta raíz.

1. Comercios (mensual): descargar el export HOT de HDX
   https://production-raw-data-api.s3.amazonaws.com/ISO3/SLV/points_of_interest/hotosm_slv_points_of_interest_osm_geojson.zip
   descomprimir en data/hot/ y correr `python3 pipeline/build_pois.py` → site/pois.js
   Después, en la página: Base de datos → «Calibrar objetivos con puntos existentes» en cada giro si cambió mucho la red,
   y copiar los US$/m² resultantes a GIROS en app.js.
2. Población (anual): WorldPop R2025A, SLV 100 m constrained 2020/2025/2030
   (https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/<año>/SLV/v1/100m/constrained/slv_pop_<año>_CN_100m_R2025A_v1.tif)
   → data/slv_pop_<año>.tif
   Límites geoBoundaries gbOpen SLV ADM1 y ADM2 (https://www.geoboundaries.org/api/current/gbOpen/SLV/ALL/; los .geojson se bajan
   de media.githubusercontent.com porque están en Git LFS) → data/gb_adm1.geojson, data/gb_adm2.geojson
   Edad y sexo COD-PS 2024 (HDX cod-ps-slv, slv_admpop_adm3_2024.csv) → data/pop_adm3.csv
   Correr `python3 pipeline/build_data.py` → site/sitedata.js
   IPA: ingreso per cápita por departamento de la EHPM (BCR/ONEC). Al salir una EHPM nueva, actualizar IPC, NAT y HH en build_data.py.
3. Página: `python3 pipeline/build_page.py` (app.src.txt con /*LEAFLET_CSS*/ = leaflet 1.9.4 min.css y /*APP_JS*/ = app.js)
   → site/index.html (artifact de claude.ai) y gh/index.html (página completa para GitHub Pages).
4. Artifact: publicar site/index.html al mismo enlace con files: sitedata.js, pois.js, sat/*, pipeline/*; capacidad downloads (PDF).
   GitHub: subir gh/index.html, sitedata.js, pois.js y sat/ al repositorio (Add file → Upload files) y hacer commit.
5. Vista satelital (opcional, anual): `python3 pipeline/build_sat.py` y luego `python3 pipeline/build_sat_pais.py` → site/sat/*.jpg + index.json
   (Sentinel-2 L2A de Earth Search, época seca nov–abr; 10 m en el AMSS y 20 ciudades, mosaico de 100 m del país).
6. Icono y portada social (solo si cambia el diseño): `python3 pipeline/build_icons.py gh` (fuentes TTF en fonts/).
