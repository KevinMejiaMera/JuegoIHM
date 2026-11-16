// ══════════════════════════════════════════════════════════════
// Plantilla común de las pantallas de catálogo.
// Cada pantalla (circuitos, garaje, armas, pilotos, pase, tienda)
// llama a Catalogo.iniciar({...}) con su propia configuración.
// ══════════════════════════════════════════════════════════════

const Catalogo = {
    cfg: null,
    seleccion: null,

    /**
     * cfg = {
     *   items: [...],
     *   seleccionInicial: 'id',
     *   estadoDe(item)  -> { texto, clase } | null   (chip en la tarjeta)
     *   accionDe(item)  -> { texto, clase, bloqueada, nota, alHacer() }
     *   visualDe(item)  -> html (opcional, por defecto el icono)
     *   extraTarjeta(item) -> html (opcional)
     * }
     */
    iniciar(cfg) {
        this.cfg = cfg;
        this.seleccion = cfg.seleccionInicial || cfg.items[0].id;
        this.rejilla = document.getElementById('rejilla');
        this.detalle = document.getElementById('detalle');

        this.rejilla.addEventListener('click', e => {
            const t = e.target.closest('.tarjeta');
            if (!t) return;
            this.seleccion = t.dataset.id;
            Sonido.clic();
            this.pintar();
        });

        // Navegación con flechas entre tarjetas
        this.rejilla.addEventListener('keydown', e => {
            const ids = cfg.items.map(i => i.id);
            const i = ids.indexOf(this.seleccion);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); this.seleccion = ids[(i + 1) % ids.length]; this.pintar(true); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); this.seleccion = ids[(i - 1 + ids.length) % ids.length]; this.pintar(true); }
        });

        // Esc vuelve al menú principal
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !document.querySelector('.capa-dialogo')) navegar('menu.html');
        });

        this.pintar();
    },

    barras(stats = []) {
        return `<div class="estadisticas">${stats.map(s => `
            <div class="estadistica">
                <div class="fila"><span>${s.nombre}</span><span>${s.valor !== undefined ? s.valor + ' %' : s.texto}</span></div>
                ${s.valor !== undefined ? `<div class="barra"><div style="width:${s.valor}%"></div></div>` : ''}
            </div>`).join('')}</div>`;
    },

    pintar(enfocar = false) {
        const { items, estadoDe, accionDe, visualDe, extraTarjeta } = this.cfg;

        this.rejilla.innerHTML = items.map(it => {
            const est = estadoDe ? estadoDe(it) : null;
            return `
            <button class="tarjeta ${est && est.clase === 'bloqueado' ? 'bloqueada' : ''}" data-id="${it.id}"
                    aria-pressed="${it.id === this.seleccion}">
                <div class="cabecera">
                    ${it.etiqueta ? `<span class="etiqueta">${it.etiqueta}</span>` : '<span></span>'}
                    ${est ? `<span class="chip-estado ${est.clase}">${est.texto}</span>` : ''}
                </div>
                <div class="icono-tarjeta ${this.cfg.iconoDe ? 'mapa' : ''}">${this.cfg.iconoDe ? this.cfg.iconoDe(it) : (ICONOS[it.icono] || ICONOS.plasma)}</div>
                <h3>${it.nombre}</h3>
                <p>${it.descripcion}</p>
                ${extraTarjeta ? extraTarjeta(it) : ''}
                ${this.barras(it.stats)}
            </button>`;
        }).join('');

        if (enfocar) {
            const t = this.rejilla.querySelector(`[data-id="${this.seleccion}"]`);
            if (t) t.focus();
        }

        const it = items.find(i => i.id === this.seleccion);
        const acc = accionDe(it);
        const visual = visualDe ? visualDe(it) : null;
        this.detalle.innerHTML = `
            <span class="titulo-panel">Detalle</span>
            <div class="visual ${visual ? (this.cfg.claseVisual || '') : 'icono'}">${visual || ICONOS[it.icono] || ''}</div>
            <h3>${it.nombre}</h3>
            <p class="descripcion">${it.descripcion}</p>
            ${this.barras(it.stats)}
            ${acc.nota ? `<div class="nota ${acc.bloqueada ? 'bloqueo' : ''}">${acc.nota}</div>` : ''}
            <div class="acciones-detalle">
                <button class="boton ${acc.clase || 'boton-principal'}" id="btn-accion"
                        ${acc.deshabilitada ? 'disabled' : ''} ${acc.bloqueada ? 'aria-disabled="true"' : ''}>${acc.texto}</button>
                ${acc.secundaria ? `<button class="boton" id="btn-accion-2">${acc.secundaria.texto}</button>` : ''}
            </div>`;

        if (this.cfg.alPintar) this.cfg.alPintar(it, this.detalle.querySelector('.visual'));

        const btn = document.getElementById('btn-accion');
        btn.addEventListener('click', async () => {
            await acc.alHacer();
            pintarSaldo();
            this.pintar();
        });
        if (acc.secundaria) document.getElementById('btn-accion-2').addEventListener('click', acc.secundaria.alHacer);
    }
};
