let cartillas = [];
const numerosMarcados = new Set();
let figura = {};

// Los datos de cartillas.json y figuras.json vienen embebidos en
// Datos/cartillas.js y Datos/figuras.js (variables CARTILLAS_DATA y
// FIGURAS_DATA), cargados antes de este script. Esto evita el error de
// CORS que ocurre al abrir index.html directamente con doble clic
// (protocolo file://), donde fetch() a archivos locales queda bloqueado.
function cargarCartillasDesdeJSON() {
    if (typeof CARTILLAS_DATA !== 'undefined') {
        cartillas = CARTILLAS_DATA;
    } else {
        console.error('No se encontraron los datos de cartillas (Datos/cartillas.js).');
    }
}

function cargarFigurasDesdeJSON() {
    if (typeof FIGURAS_DATA !== 'undefined') {
        figura = FIGURAS_DATA;
    } else {
        console.error('No se encontraron los datos de figuras (Datos/figuras.js).');
    }
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault();
    }
});

document.getElementById('numero').addEventListener('input', function () {
    const numeroIngresado = parseInt(this.value);

    if (isNaN(numeroIngresado) || numeroIngresado < 1 || numeroIngresado > 75) {
        this.value = '';
    }

    habilitarBotonMarcar();
});

document.addEventListener('DOMContentLoaded', function () {
    cargarFigurasDesdeJSON();
    cargarCartillasDesdeJSON();

    document.getElementById('numero').focus();
    habilitarBotonMarcar();
});

function generarFigura() {
    const figuraSeleccionada = document.getElementById('figura').value.toLowerCase();

    if (figuraSeleccionada === 'ninguna') {
        mostrarAlerta("Por favor, selecciona una figura antes de generar.", "warning");
        return;
    }

    if (!figura[figuraSeleccionada]) {
        mostrarAlerta("Figura desconocida.", "error");
        return;
    }

    document.getElementById('figura-seleccionada-text').textContent = figuraSeleccionada;
    mostrarElemento('figura-seleccionada');

    ocultarElemento('figura-container');
    mostrarElemento('bingo-board-container');
    document.getElementById('numero').focus();
}

function validarNumero(numero) {
    return numero >= 1 && numero <= 75;
}

function habilitarBotonMarcar() {
    const numero = document.getElementById('numero').value;
    const botonMarcar = document.getElementById('btn-marcar');
    botonMarcar.disabled = !validarNumero(parseInt(numero));
}

document.getElementById('numero').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        manejarIngresoNumero();
    }
});

function manejarIngresoNumero() {
    const numeroIngresado = parseInt(document.getElementById('numero').value);

    if (isNaN(numeroIngresado) || !validarNumero(numeroIngresado)) {
        mostrarAlerta("Ingresa un número válido entre 1 y 75.", "error  ");
        document.getElementById('numero').value = '';
        document.getElementById('numero').focus();
        return;
    }

    if (numerosMarcados.has(numeroIngresado)) {
        mostrarAlerta("Este número ya ha sido marcado.", "info");
        document.getElementById('numero').value = '';
        document.getElementById('numero').focus();
        return;
    }

    marcarNumero(numeroIngresado);
    document.getElementById('numero').value = '';
    document.getElementById('numero').focus();
    habilitarBotonMarcar();
}


function marcarNumero(numeroIngresado) {
    const figuraSeleccionada = document.getElementById('figura').value.toLowerCase();
    const figuraActual = figura[figuraSeleccionada];

    if (!figuraActual) {
        mostrarAlerta("Figura desconocida.", "error");
        return;
    }

    let cartillasMarcadas = [];
    let cartillasConFiguraCompleta = [];

    cartillas.forEach(cartilla => {
        const numeroMarcado = marcarEnFigura(numeroIngresado, figuraActual, cartilla);

        if (numeroMarcado) {
            cartillasMarcadas.push(cartilla.nombre);
            numerosMarcados.add(numeroIngresado);

            if (verificarFiguraCompleta(cartilla, figuraActual)) {
                cartillasConFiguraCompleta.push(cartilla.nombre);
            }
        }
    });

    if (cartillasMarcadas.length > 0) {
        const mensaje = cartillasMarcadas.length > 1
            ? `Número ${numeroIngresado} marcado en las cartillas (${cartillasMarcadas.join(", ")}).`
            : `Número ${numeroIngresado} marcado en la ${cartillasMarcadas[0]}.`;
        mostrarAlerta(mensaje, "success");
    } else {
        mostrarAlerta("El número ingresado no forma parte de la figura.", "error");
    }

    if (cartillasConFiguraCompleta.length > 0) {
        ganador(cartillasConFiguraCompleta);
    }
}

function marcarEnFigura(numeroIngresado, figura, cartilla) {
    for (const pos of figura.posiciones) {
        const [row, column] = pos.split("").map(Number);

        if (row < cartilla.numeros.length && column < cartilla.numeros[row].length) {
            if (cartilla.numeros[row][column] === numeroIngresado) {
                return true;
            }
        }
    }

    return false;
}

function verificarFiguraCompleta(cartilla, figura) {
    const marcados = figura.posiciones
        .map(pos => {
            const [row, column] = pos.split("").map(Number);
            return row < cartilla.numeros.length && column < cartilla.numeros[row].length
                ? numerosMarcados.has(cartilla.numeros[row][column])
                : false;
        });

    return marcados.filter(Boolean).length >= figura.limite;
}

function ganador(cartillasConFiguraCompleta) {
    if (cartillasConFiguraCompleta.length > 0) {
        const mensaje = cartillasConFiguraCompleta.length > 1
            ? `Las cartillas (${cartillasConFiguraCompleta.join(", ")}) han completado el BINGO.`
            : `La cartilla ${cartillasConFiguraCompleta[0]} ha completado el BINGO.`;
        Swal.fire({
            title: "BINGO!",
            text: mensaje,
            icon: "success"
        });
    }

    mostrarElemento('ganaste-message');
    document.getElementById('numero').disabled = true;
    document.getElementById('btn-marcar').disabled = true;

    reproducirSonido('media/bingo-sound.mp3');
    lanzarConfetti();
}

function mostrarAlerta(mensaje, tipo) {
    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1300,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
    Toast.fire({
        icon: tipo,
        title: mensaje
    });
}

function ocultarElemento(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.style.display = 'none';
    }
}

function mostrarElemento(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.style.display = 'block';
    }
}

// Caché de audios precargados para evitar el retraso de carga en el momento de reproducir.
const cacheAudio = {};

function precargarSonido(nombreArchivo) {
    let audio = cacheAudio[nombreArchivo];
    if (!audio) {
        audio = new Audio(nombreArchivo);
        audio.preload = 'auto';
        audio.load();
        cacheAudio[nombreArchivo] = audio;
    }
    return audio;
}

function reproducirSonido(nombreArchivo) {
    const audio = precargarSonido(nombreArchivo);
    let reproducido = false;

    const intentarReproducir = () => {
        if (reproducido) return;
        reproducido = true;
        try {
            audio.currentTime = 0;
        } catch {
            // Si el audio aún no tiene metadata cargada, se ignora y se reproduce desde el inicio.
        }
        audio.play().catch((err) => console.error('No se pudo reproducir el sonido:', err));
    };

    // Si el audio ya está listo (por ejemplo, precargado con antelación), se reproduce de inmediato.
    if (audio.readyState >= 3) {
        intentarReproducir();
        return;
    }

    audio.addEventListener('canplaythrough', intentarReproducir, { once: true });
    audio.addEventListener('error', (e) => console.error('Error al cargar el archivo de audio:', e));

    // Respaldo: si el evento canplaythrough tarda o no se dispara, se intenta igual.
    setTimeout(intentarReproducir, 400);
}

// Precarga temprana del sonido de victoria para que esté listo sin demora al ganar.
precargarSonido('media/bingo-sound.mp3');

const elegirOtraFigura = () => {
    mostrarElemento('figura-container');
    ocultarElemento('bingo-board-container');
    ocultarElemento('ganaste-message');

    const numeroInput = document.getElementById('numero');
    numeroInput.disabled = false;
    numeroInput.value = '';

    numerosMarcados.clear();

    document.getElementById('bingo-board').innerHTML = '';
    document.getElementById('figura').value = 'ninguna';
    ocultarElemento('figura-seleccionada');

    if (typeof confetti !== 'undefined' && typeof confetti.remove === 'function') {
        confetti.remove();
    }
};

const lanzarConfetti = () => {
    if (typeof confetti === 'undefined' || typeof confetti.start !== 'function') {
        console.error('No se pudo iniciar el confetti: Scripts/confetti.js no se cargó correctamente.');
        return;
    }
    confetti.start(4000, 60, 100);
};