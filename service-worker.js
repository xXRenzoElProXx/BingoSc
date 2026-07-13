/*
 * Service Worker — Bingo · Seguidores de Cristo
 *
 * IMPORTANTE PARA PUBLICAR UNA NUEVA VERSIÓN:
 * Cambia el valor de CACHE_VERSION cada vez que subas cambios (por ejemplo
 * "v1" -> "v2"). Eso hace que este archivo cambie de contenido, el
 * navegador detecta que el service worker es distinto, descarga la nueva
 * versión en segundo plano y la app mostrará automáticamente el aviso
 * "Nueva versión disponible" para que el usuario actualice cuando quiera.
 * Si solo cambias otros archivos (styles.css, script.js, etc.) SIN subir
 * el número de versión aquí, la app seguirá sirviendo la versión cacheada
 * anterior.
 */
const CACHE_VERSION = 'v5';
const CACHE_NAME = `bingo-sdc-${CACHE_VERSION}`;

// Rutas relativas a la raíz del sitio. Deben coincidir exactamente con
// los archivos publicados.
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './favicon.ico',

  './Scripts/script.js',
  './Scripts/confetti.js',
  './Scripts/select-custom.js',
  './Scripts/pwa.js',

  './Datos/figuras.js',
  './Datos/cartillas.js',

  './vendor/fonts/fonts.css',
  './vendor/fonts/fredoka-latin-500-normal.woff2',
  './vendor/fonts/fredoka-latin-600-normal.woff2',
  './vendor/fonts/fredoka-latin-700-normal.woff2',
  './vendor/fonts/sora-latin-400-normal.woff2',
  './vendor/fonts/sora-latin-500-normal.woff2',
  './vendor/fonts/sora-latin-600-normal.woff2',
  './vendor/fonts/sora-latin-700-normal.woff2',
  './vendor/fonts/jetbrains-mono-latin-500-normal.woff2',
  './vendor/fonts/jetbrains-mono-latin-600-normal.woff2',
  './vendor/fonts/jetbrains-mono-latin-700-normal.woff2',

  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/fontawesome/webfonts/fa-v4compatibility.woff2',

  './vendor/sweetalert2/sweetalert2.all.min.js',

  './media/bingo-sound.mp3',
  './media/logo.ico',

  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

// --- Instalación: descarga y guarda en caché todo el "app shell" ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error('[SW] Error precacheando el app shell:', err))
  );
});

// --- Activación: elimina cachés de versiones anteriores ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre.startsWith('bingo-sdc-') && nombre !== CACHE_NAME)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- Fetch: estrategia "cache first, network fallback" para todo,
//     y además actualiza la caché en segundo plano cuando hay red
//     (stale-while-revalidate) para mantener los datos frescos. ---
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar peticiones GET.
  if (request.method !== 'GET') return;

  // Peticiones de navegación (abrir/recargar la app, incluido el acceso
  // directo instalado con "start_url"): siempre servir el index.html
  // cacheado como respaldo, sin importar query strings.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchAndUpdate = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Si está en caché, responde al instante y actualiza en segundo plano.
      // Si no está en caché, espera la red (y si falla, no hay nada más que ofrecer).
      return cachedResponse || fetchAndUpdate;
    })
  );
});

// --- Mensajes desde la página (para activar la actualización manual) ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});