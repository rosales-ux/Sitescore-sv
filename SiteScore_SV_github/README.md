# SiteScore SV

Selección de sitios comerciales en El Salvador con un modelo de gravedad (Huff). Para un punto dado, estima la venta anual en dólares, un score de 0 a 100, el perfil demográfico a 1, 2, 3 y 5 km, la competencia cercana y genera un reporte PDF.

![SiteScore SV](social.png)

## Qué incluye

- **Evaluar sitio:** coordenadas (decimales, grados-minutos-segundos o enlace de Google Maps), clic en el mapa o arrastrar la cruz. Diez giros más «Otro giro»: supermercados, farmacias, comida rápida, restaurantes y cafés, gasolineras, ferretería, conveniencia, bancos, ropa y calzado, panaderías.
- **Resultado:** score y clase A–D, venta y captura, áreas primaria y secundaria, canibalización con cadena propia, mercado por radio, curva de captación, competencia a 3 km, pirámide de población.
- **Comparar:** sitios guardados, CSV para Excel y PDF de todos.
- **Oportunidad:** retícula de puntos sobre la vista actual con los mejores candidatos.
- **Base de datos:** gasto por persona, cobertura del mapa, formatos, tamaños por marca, IPA por distrito y zona, competidores propios por CSV (`lat, lon, nombre, marca, tamaño`).
- **Mapa y satélite:** Sentinel-2 a 10 m en el Área Metropolitana de San Salvador y 20 ciudades; enlace a Google Maps satélite para ver el predio.
- **Reporte PDF** en Formato RV (láminas 16:9).

Las ediciones de cada persona se guardan solo en su navegador.

## Publicar con GitHub Pages

1. En GitHub, crear un repositorio nuevo (por ejemplo `sitescore-sv`), público o privado con plan que permita Pages.
2. Descomprimir el zip. En el repositorio: **Add file → Upload files**, arrastrar **todo el contenido** de la carpeta (no la carpeta misma), incluidos `.nojekyll` y `.gitignore`, y presionar **Commit changes**.
   - Si el navegador no muestra los archivos que empiezan con punto, súbalos aparte o créelos con **Add file → Create new file** (`.nojekyll` puede ir vacío).
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
4. En uno o dos minutos la página queda en `https://<usuario>.github.io/sitescore-sv/`.
5. Opcional: en `index.html`, cambiar `content="social.png"` de `og:image` por la dirección completa (`https://<usuario>.github.io/sitescore-sv/social.png`) para que WhatsApp, LinkedIn y Slack muestren la portada al compartir el enlace.
6. En el teléfono: abrir el enlace y **Agregar a pantalla de inicio**; usa `icono.png`.

El botón «PDF» descarga el archivo directamente en el navegador.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Página completa: interfaz, estilos, Leaflet 1.9.4 (CSS incrustado) y la aplicación |
| `sitedata.js` | Grilla de población a 500 m (2020, 2025, 2030), distritos, zonas, IPA, edad y sexo, límites |
| `pois.js` | Comercios por giro y generadores de tráfico (OpenStreetMap) |
| `sat/` | Imágenes Sentinel-2 y su índice |
| `icono.png`, `manifest.webmanifest` | Icono para pantalla de inicio |
| `social.png` | Portada para redes y repositorio (1280 × 640) |
| `pipeline/` | Scripts para regenerar los datos y la página; ver `pipeline/ACTUALIZAR.md` |

Librerías externas (CDN): Leaflet 1.9.4 y jsPDF 2.5.1 desde cdnjs; fuentes IBM Plex Sans Condensed y Source Serif 4 desde Google Fonts.

## Cómo se actualiza

- **Comercios (mensual):** nuevo export HOT de OpenStreetMap → `python3 pipeline/build_pois.py` → reemplazar `pois.js`.
- **Población (anual):** nuevo WorldPop → `python3 pipeline/build_data.py` → reemplazar `sitedata.js`.
- **Ingreso:** al publicarse una EHPM más reciente con cuadro por departamento, actualizar `IPC`, `NAT` y `HH` en `build_data.py`.
- **Página:** cambios a `pipeline/app.js` o `pipeline/app.src.txt` → `python3 pipeline/build_page.py` → reemplazar `index.html`.

Para subir una actualización: **Add file → Upload files** con los archivos nuevos (mismo nombre) y **Commit changes**. Pages se actualiza solo.

## Modelo

1. **Demanda:** población 2025 por celda × gasto por persona × 12 × IPA × participación capturable.
2. **Gravedad (Huff):** tamaño / distancia^λ frente a todos los competidores a 15 km y una oferta no mapeada.
3. **Venta:** suma dentro del alcance del formato; áreas primaria y secundaria = 70 % y 90 % de la venta.
4. **Objetivo:** US$/m² calibrado para que el punto de cadena típico del AMSS quede al 100 %.
5. **Score:** venta vs objetivo 35 %, demanda núcleo 20 %, ajuste de IPA 15 %, espacio competitivo 20 %, generadores de tráfico 10 %.

Supuestos editables por defecto (US$ por persona al mes): supermercados 62, farmacias 10, comida rápida 14, restaurantes y cafés 18, gasolineras 30, ferretería 8, conveniencia 13, bancos 15, ropa y calzado 11, panaderías 7.

## Fuentes y licencias

| Dato | Fuente | Licencia |
|---|---|---|
| Población 2020/2025/2030 | WorldPop R2025A, SLV 100 m restringida | CC BY 4.0 |
| Límites de distritos | geoBoundaries gbOpen SLV ADM2 (262 distritos) | Dominio público |
| Departamentos (asignación) | geoBoundaries gbOpen SLV ADM1 (OpenStreetMap) | CC BY-SA 2.0 |
| Edad y sexo 2024 | HDX COD-PS El Salvador (UNFPA, DIGESTYC) | CC BY-IGO |
| Ingreso y personas por hogar | EHPM 2023, Banco Central de Reserva / ONEC | Publicación oficial, uso con cita |
| Hogares (promedio nacional) | Censo de Población y Vivienda 2024 | Publicación oficial, uso con cita |
| Comercios y generadores | © colaboradores de OpenStreetMap, export HOT en HDX | ODbL 1.0 |
| Referencia de colonias (zonas) | OpenStreetMap vía Overture Maps | ODbL 1.0 |
| Imagen satelital | Copernicus Sentinel-2 L2A (Earth Search, Element 84) | Uso libre, incluido comercial, con atribución |
| Mapa (librería) | Leaflet 1.9.4 | BSD-2-Clause |
| PDF (librería) | jsPDF 2.5.1 | MIT |

Atribución obligatoria en el mapa y el PDF: WorldPop, geoBoundaries, OpenStreetMap y Copernicus Sentinel-2.

## Límites

- OpenStreetMap no tiene todos los puntos de cada cadena; complete con la importación CSV.
- Distancias en línea recta, no tiempos de manejo.
- Los límites ADM2 de geoBoundaries vienen de un mapa de 2007 de baja precisión; algunos bordes están desplazados (Ilopango y Soyapango, Mejicanos y Cuscatancingo). Afecta el IPA de celdas cerca del borde, no la población por anillo.
- WorldPop reparte población por área construida: zonas comerciales (Escalón, San Benito, centro) pueden mostrar más residentes de los reales.
- Gastos, tamaños por marca, IPA por zona y objetivos son estimaciones de referencia, no datos de las empresas.
