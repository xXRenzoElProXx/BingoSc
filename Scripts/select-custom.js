// Dropdown de vidrio (glass) que reemplaza visualmente al <select> nativo,
// pero mantiene sincronizado el <select id="figura"> real para no tocar
// la lógica de juego en script.js.

document.addEventListener('DOMContentLoaded', function () {
    const selectOriginal = document.getElementById('figura');
    const trigger = document.getElementById('select-trigger');
    const triggerTexto = document.getElementById('select-trigger-texto');
    const lista = document.getElementById('select-opciones');
    const wrapper = document.getElementById('select-custom');

    if (!selectOriginal || !trigger || !lista) return;

    // Construir opciones a partir del select original
    Array.from(selectOriginal.options).forEach((opt) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', opt.value);
        li.textContent = opt.textContent;
        if (opt.value === selectOriginal.value) {
            li.classList.add('is-selected');
        }
        li.addEventListener('click', () => seleccionar(opt.value, opt.textContent));
        lista.appendChild(li);
    });

    function seleccionar(valor, texto) {
        selectOriginal.value = valor;
        selectOriginal.dispatchEvent(new Event('change'));
        triggerTexto.textContent = texto;

        lista.querySelectorAll('li').forEach((li) => {
            li.classList.toggle('is-selected', li.getAttribute('data-value') === valor);
        });

        cerrar();
    }

    function abrir() {
        wrapper.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
    }

    function cerrar() {
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', () => {
        wrapper.classList.contains('is-open') ? cerrar() : abrir();
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) cerrar();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrar();
    });

    // Si algo externo cambia el select original (p.ej. elegirOtraFigura resetea a "ninguna")
    function sincronizarTexto() {
        const opt = selectOriginal.options[selectOriginal.selectedIndex];
        if (opt) {
            triggerTexto.textContent = opt.textContent;
            lista.querySelectorAll('li').forEach((li) => {
                li.classList.toggle('is-selected', li.getAttribute('data-value') === opt.value);
            });
        }
    }

    // elegirOtraFigura() en script.js hace: document.getElementById('figura').value = 'ninguna'
    // Como eso no dispara 'change', revisamos periódicamente en foco del botón "Cambiar Figura".
    document.querySelectorAll('.boton-secundario').forEach((btn) => {
        btn.addEventListener('click', () => setTimeout(sincronizarTexto, 0));
    });
});
