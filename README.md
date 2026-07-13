# Bingo · Seguidores de Cristo — PWA

App 100% estática (sin build), lista para desplegar en Vercel.

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio (GitHub/GitLab/Bitbucket) o arrástrala
   directamente en vercel.com → "Add New Project" → "Deploy" (framework:
   "Other" / sin build command, directorio raíz).
2. Vercel servirá `index.html` como página principal y respetará las
   cabeceras de `vercel.json` (importantes para que las actualizaciones
   se detecten bien).
3. Abre la URL en Chrome/Edge (PC o Android) o Safari (iPhone/iPad):
   aparecerá el banner "Instala Bingo SDC".

## Cómo funciona sin internet

- `service-worker.js` descarga y guarda en caché todos los archivos de la
  app (HTML, CSS, JS, fuentes, íconos, sonido) la primera vez que se
  visita con conexión.
- Todas las fuentes (Fredoka, Sora, JetBrains Mono), los íconos
  (Font Awesome) y las alertas (SweetAlert2) están alojados dentro del
  propio proyecto (carpeta `vendor/`), NO se descargan de internet en
  cada visita. Por eso la app funciona completamente offline después de
  la primera carga.

## Cómo publicar una actualización

1. Haz tus cambios normalmente (HTML/CSS/JS/datos/imágenes).
2. Abre `service-worker.js` y sube el número de `CACHE_VERSION`
   (por ejemplo de `'v1'` a `'v2'`). **Este paso es obligatorio**: es lo
   que le indica al navegador de tus usuarios que hay una versión nueva.
3. Sube los cambios a Vercel (nuevo deploy).
4. Los usuarios que ya tengan la app instalada verán automáticamente el
   banner "Nueva versión disponible" la próxima vez que abran la app con
   conexión. Al tocar "Actualizar", se recarga con la versión nueva.

Si olvidas subir `CACHE_VERSION`, los archivos nuevos se subirán a
Vercel igual, pero los usuarios que ya instalaron la app seguirán viendo
la versión anterior desde su caché hasta que cambies ese número.

## Estructura

```
index.html              Página principal
styles.css               Estilos
manifest.json            Manifest de la PWA (íconos, nombre, colores)
service-worker.js        Cacheo offline + lógica de actualización
vercel.json               Cabeceras HTTP para Vercel
favicon.ico / icons/      Íconos en todos los tamaños (incluye maskable)
Scripts/                 Lógica del juego, confetti, select y registro PWA
Datos/                   Cartillas y figuras del bingo
media/                    Sonido de victoria y logo original
vendor/                  Font Awesome, fuentes y SweetAlert2 alojados localmente
```
