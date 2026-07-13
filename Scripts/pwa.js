/*
 * Registro del Service Worker + banners de "Instalar app" y
 * "Nueva versión disponible".
 */

const PWA_STORAGE_KEY = 'bingoSdcInstalarOcultoHasta';

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

/* Navegadores "in-app" (WhatsApp, Instagram, Facebook, TikTok...) bloquean
   la instalación de PWAs aunque el resto del sitio funcione normal. */
function esNavegadorEmbebido() {
    const ua = window.navigator.userAgent.toLowerCase();
    return /fban|fbav|instagram|whatsapp|tiktok|line\/|micromessenger/i.test(ua);
}

function ocultarBannerTemporalmente(dias) {
    const hasta = Date.now() + dias * 24 * 60 * 60 * 1000;
    try {
        localStorage.setItem(PWA_STORAGE_KEY, String(hasta));
    } catch (e) {
        /* almacenamiento no disponible: no pasa nada, solo no se recordará */
    }
}

function bannerDeInstalacionFueOcultado() {
    try {
        const hasta = parseInt(localStorage.getItem(PWA_STORAGE_KEY), 10);
        return !isNaN(hasta) && Date.now() < hasta;
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
                ocultarBannerTemporalmente(3);
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
                ocultarBannerTemporalmente(14);
            },
        });
    }

    configurarBotonComoInstalar();
});

/* ---------------------------------------------------------
   Botón permanente "¿Cómo instalar la app?"
   Existe siempre en el pie de página, sin depender del banner
   automático (que en iOS/navegadores in-app puede no aparecer
   o quedar oculto por decisión previa del usuario).
   --------------------------------------------------------- */
function configurarBotonComoInstalar() {
    const btn = document.getElementById('btn-como-instalar');
    if (!btn) return;

    if (estaEnModoStandalone()) return; // ya está instalada, no hace falta
    btn.hidden = false;

    btn.addEventListener('click', async () => {
        // Android / Chrome / Edge: si el navegador ya ofreció instalar, usamos ese prompt nativo.
        if (eventoInstalacionDiferido) {
            eventoInstalacionDiferido.prompt();
            const { outcome } = await eventoInstalacionDiferido.userChoice;
            eventoInstalacionDiferido = null;
            if (outcome === 'accepted') return;
        }

        let texto;
        if (esIOS()) {
            texto = 'Toca el ícono <b>Compartir</b> (el cuadrado con la flecha hacia arriba) en la barra de Safari y luego elige <b>"Agregar a inicio"</b>.';
        } else if (esNavegadorEmbebido()) {
            texto = 'Este enlace se abrió dentro de otra app (WhatsApp, Instagram, etc.), y esos navegadores no permiten instalar apps. Toca el menú (⋮) y elige <b>"Abrir en el navegador"</b>, y desde ahí instala.';
        } else {
            texto = 'Abre el menú de tu navegador (⋮ o ···) y busca la opción <b>"Instalar aplicación"</b> o <b>"Agregar a pantalla de inicio"</b>.';
        }

        if (window.Swal) {
            window.Swal.fire({
                title: 'Instalar Bingo SDC',
                html: texto,
                icon: 'info',
                confirmButtonText: 'Entendido',
            });
        } else {
            alert(texto.replace(/<\/?b>/g, ''));
        }
    });
}

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
        ocultarBannerTemporalmente(7);
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
