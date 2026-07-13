/*
 * Registro del Service Worker + banners de "Instalar app" y
 * "Nueva versión disponible".
 */

const PWA_STORAGE_KEY = 'bingoSdcInstalarOcultoEnEstaSesion';

function estaEnModoStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

function esIOS() {
    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    // iPadOS 13+ se reporta como "Macintosh", pero tiene pantalla táctil.
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function ocultarBannerPorEstaSesion() {
    try {
        sessionStorage.setItem(PWA_STORAGE_KEY, '1');
    } catch (e) {
        /* almacenamiento no disponible: no pasa nada, solo no se recordará */
    }
}

function bannerDeInstalacionFueOcultado() {
    try {
        return sessionStorage.getItem(PWA_STORAGE_KEY) === '1';
    } catch (e) {
        return false;
    }
}

/* ---------------------------------------------------------
   Registro del Service Worker + banner de actualización
   --------------------------------------------------------- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then((registro) => {
                // ¿Ya hay una versión nueva esperando (por ejemplo, se instaló
                // en una pestaña anterior mientras esta seguía abierta)?
                if (registro.waiting) {
                    mostrarBannerActualizacion(registro);
                }

                // Se detecta una nueva versión mientras la app está abierta.
                registro.addEventListener('updatefound', () => {
                    const nuevoWorker = registro.installing;
                    if (!nuevoWorker) return;

                    nuevoWorker.addEventListener('statechange', () => {
                        if (
                            nuevoWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            mostrarBannerActualizacion(registro);
                        }
                    });
                });
            })
            .catch((err) => console.error('[PWA] No se pudo registrar el service worker:', err));

        // Cuando el nuevo service worker toma control, recargamos una sola vez.
        let recargando = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (recargando) return;
            recargando = true;
            window.location.reload();
        });
    });
}

function mostrarBannerActualizacion(registro) {
    const banner = document.getElementById('pwa-actualizar');
    const btn = document.getElementById('pwa-actualizar-btn');
    if (!banner || !btn) return;

    banner.hidden = false;
    actualizarEspacioParaBanners();

    btn.addEventListener(
        'click',
        () => {
            btn.disabled = true;
            btn.textContent = 'Actualizando…';
            if (registro.waiting) {
                registro.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        },
        { once: true }
    );
}

/* ---------------------------------------------------------
   Banner de instalación (Android / Chrome / Edge / desktop)
   --------------------------------------------------------- */
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    eventoInstalacionDiferido = event;

    if (estaEnModoStandalone() || bannerDeInstalacionFueOcultado()) return;

    mostrarBannerInstalacion({
        detalle: 'Úsalo sin conexión, directo desde tu pantalla de inicio.',
        alHacerClicInstalar: async () => {
            if (!eventoInstalacionDiferido) return;
            eventoInstalacionDiferido.prompt();
            const { outcome } = await eventoInstalacionDiferido.userChoice;
            eventoInstalacionDiferido = null;
            ocultarElementoBanner('pwa-instalar');
            if (outcome !== 'accepted') {
                ocultarBannerPorEstaSesion();
            }
        },
    });
});

window.addEventListener('appinstalled', () => {
    ocultarElementoBanner('pwa-instalar');
    eventoInstalacionDiferido = null;
});

/* ---------------------------------------------------------
   Banner de instalación (iOS Safari: no dispara beforeinstallprompt)
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    if (esIOS() && !estaEnModoStandalone() && !bannerDeInstalacionFueOcultado()) {
        mostrarBannerInstalacion({
            detalle: 'Toca el ícono Compartir y luego "Agregar a inicio".',
            textoBoton: 'Entendido',
            alHacerClicInstalar: () => {
                ocultarElementoBanner('pwa-instalar');
                ocultarBannerPorEstaSesion();
            },
        });
    }
});

function mostrarBannerInstalacion({ detalle, textoBoton, alHacerClicInstalar }) {
    const banner = document.getElementById('pwa-instalar');
    const detalleEl = document.getElementById('pwa-instalar-detalle');
    const btnInstalar = document.getElementById('pwa-instalar-btn');
    const btnCerrar = document.getElementById('pwa-instalar-cerrar');
    if (!banner || !btnInstalar || !btnCerrar) return;

    if (detalle) detalleEl.textContent = detalle;
    btnInstalar.textContent = textoBoton || 'Instalar';
    banner.hidden = false;
    actualizarEspacioParaBanners();

    const manejarInstalar = () => alHacerClicInstalar();
    const manejarCerrar = () => {
        ocultarElementoBanner('pwa-instalar');
        ocultarBannerPorEstaSesion();
    };

    btnInstalar.addEventListener('click', manejarInstalar, { once: true });
    btnCerrar.addEventListener('click', manejarCerrar, { once: true });
}

function ocultarElementoBanner(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
    actualizarEspacioParaBanners();
}

/* Reserva espacio abajo mientras algún banner esté visible, para que
   nunca quede tapando otro elemento de la pantalla. */
function actualizarEspacioParaBanners() {
    const instalar = document.getElementById('pwa-instalar');
    const actualizar = document.getElementById('pwa-actualizar');
    const hayBannerVisible =
        (instalar && !instalar.hidden) || (actualizar && !actualizar.hidden);
    document.body.classList.toggle('tiene-banner-pwa', Boolean(hayBannerVisible));
}