// ══════════════════════════════════════════════════════════════
// Utilidades compartidas: estado guardado, avisos, diálogos,
// navegación entre pantallas y pantalla de error.
// ══════════════════════════════════════════════════════════════

// ── Estado del jugador (se guarda en el navegador) ──
const Estado = {
    clave: 'zeroHorizon.v2',
    porDefecto: {
        sonido: true,
        piloto: 'CYBER_PILOT_01',
        nivel: 48,
        rango: 'Maestro Estelar',
        diamantes: 14250,
        creditos: 980,
        pintura: '#a855f7',
        circuito: 'neon',
        vehiculo: 'phantom',
        arma: 'plasma',
        agente: 'nova',
        compras: []
    },
    _datos: null,

    _cargar() {
        if (this._datos) return this._datos;
        let guardado = {};
        try { guardado = JSON.parse(localStorage.getItem(this.clave)) || {}; } catch (e) { guardado = {}; }
        this._datos = Object.assign({}, this.porDefecto, guardado);
        return this._datos;
    },
    get(k, def) {
        const d = this._cargar();
        return d[k] !== undefined ? d[k] : def;
    },
    set(k, v) {
        const d = this._cargar();
        d[k] = v;
        try { localStorage.setItem(this.clave, JSON.stringify(d)); } catch (e) { /* modo privado */ }
    },
    reiniciar() {
        this._datos = Object.assign({}, this.porDefecto);
        try { localStorage.removeItem(this.clave); } catch (e) {}
    }
};

// ── Formato de números (14.250) ──
const formato = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ── Avisos flotantes: tipo = 'info' | 'exito' | 'error' ──
function aviso(mensaje, tipo = 'info', duracion = 2600) {
    let cont = document.getElementById('avisos');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'avisos';
        cont.setAttribute('role', 'status');
        cont.setAttribute('aria-live', 'polite');
        document.body.appendChild(cont);
    }
    const iconos = { info: 'ℹ️', exito: '✅', error: '⛔' };
    const el = document.createElement('div');
    el.className = `aviso ${tipo}`;
    el.innerHTML = `<span>${iconos[tipo] || ''}</span><span>${mensaje}</span>`;
    cont.appendChild(el);
    if (tipo === 'error') Sonido.error();
    else if (tipo === 'exito') Sonido.exito();
    setTimeout(() => {
        el.classList.add('saliendo');
        setTimeout(() => el.remove(), 300);
    }, duracion);
}

// ── Diálogo de confirmación (devuelve una promesa true/false) ──
function confirmar({ titulo, mensaje, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
    return new Promise(resolver => {
        const capa = document.createElement('div');
        capa.className = 'capa-dialogo abierta';
        capa.innerHTML = `
            <div class="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titulo">
                <h2 id="dlg-titulo">${titulo}</h2>
                <p>${mensaje}</p>
                <div class="acciones">
                    <button class="boton" data-r="0">${cancelar}</button>
                    <button class="boton ${peligro ? 'boton-peligro' : 'boton-principal'}" data-r="1">${aceptar}</button>
                </div>
            </div>`;
        document.body.appendChild(capa);
        Sonido.clic();
        const cerrar = r => { capa.remove(); document.removeEventListener('keydown', tecla, true); resolver(r); };
        const tecla = e => {
            if (e.key === 'Escape') { e.stopPropagation(); cerrar(false); }
            if (e.key === 'Enter') { e.stopPropagation(); cerrar(true); }
        };
        document.addEventListener('keydown', tecla, true);
        capa.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (b) { Sonido.clic(); cerrar(b.dataset.r === '1'); }
            else if (e.target === capa) cerrar(false);
        });
        capa.querySelector('[data-r="1"]').focus();
    });
}

// ── Navegar a otra pantalla (deja sonar el clic) ──
function navegar(url) {
    Sonido.clic();
    setTimeout(() => { window.location.href = url; }, 120);
}

// Cualquier elemento con data-ir="pantalla.html" navega al hacer clic
document.addEventListener('click', e => {
    const el = e.target.closest('[data-ir]');
    if (el) { e.preventDefault(); navegar(el.dataset.ir); }
});

// ── Pantalla de error con opción de reintentar ──
function mostrarError({ titulo, mensaje, detalle = '' }) {
    let pe = document.getElementById('pantalla-error');
    if (!pe) {
        pe = document.createElement('div');
        pe.id = 'pantalla-error';
        pe.className = 'pantalla-error';
        document.body.appendChild(pe);
    }
    pe.innerHTML = `
        <div class="dialogo" role="alert">
            <div class="icono-error">⚠️</div>
            <h2>${titulo}</h2>
            <p>${mensaje}</p>
            ${detalle ? `<code>${detalle}</code>` : ''}
            <div class="acciones">
                <button class="boton" data-ir="index.html">Volver al inicio</button>
                <button class="boton boton-principal" onclick="location.reload()">↻ Reintentar</button>
            </div>
        </div>`;
    pe.classList.add('visible');
}

// Verifica que el motor 3D (Three.js) haya cargado y que WebGL funcione
function verificarMotor3D() {
    if (typeof THREE === 'undefined') {
        mostrarError({
            titulo: 'No se pudo cargar el motor gráfico',
            mensaje: 'Revisa tu conexión a internet y vuelve a intentarlo.',
            detalle: 'Error: Three.js no disponible (sin conexión con el servidor CDN)'
        });
        return false;
    }
    try {
        const c = document.createElement('canvas');
        if (!(c.getContext('webgl') || c.getContext('experimental-webgl'))) throw new Error('WebGL no soportado');
    } catch (e) {
        mostrarError({
            titulo: 'Tu navegador no puede mostrar gráficos 3D',
            mensaje: 'Activa la aceleración por hardware o usa otro navegador (Chrome, Edge o Firefox).',
            detalle: e.message
        });
        return false;
    }
    return true;
}

// Aviso cuando se pierde o vuelve la conexión
window.addEventListener('offline', () => aviso('Sin conexión a internet. Algunas funciones pueden fallar.', 'error', 4000));
window.addEventListener('online', () => aviso('Conexión restablecida.', 'exito'));

// ── Barra superior: saldo y botón de sonido ──
function pintarSaldo() {
    document.querySelectorAll('[data-saldo="diamantes"]').forEach(el => el.textContent = formato(Estado.get('diamantes')));
    document.querySelectorAll('[data-saldo="creditos"]').forEach(el => el.textContent = formato(Estado.get('creditos')));
}

function prepararBotonSonido() {
    document.querySelectorAll('[data-accion="sonido"]').forEach(btn => {
        const pintar = () => {
            btn.textContent = Sonido.activado ? '🔊 Sonido: activado' : '🔈 Sonido: desactivado';
            btn.setAttribute('aria-pressed', Sonido.activado);
        };
        pintar();
        btn.addEventListener('click', () => {
            Sonido.iniciar();
            Sonido.activado = !Sonido.activado;
            pintar();
            Sonido.clic();
        });
    });
}

// Sonido al pasar sobre botones
document.addEventListener('mouseover', e => {
    const b = e.target.closest('.boton, .opcion-menu, .tarjeta');
    if (b && !b.contains(e.relatedTarget)) Sonido.pasar();
});

document.addEventListener('DOMContentLoaded', () => {
    pintarSaldo();
    prepararBotonSonido();
});
