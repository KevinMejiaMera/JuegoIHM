// ══════════════════════════════════════════════════════════════
// Efectos de sonido sintetizados (Web Audio API)
// Se comparten en todas las pantallas. El estado "Sonido" se guarda.
// ══════════════════════════════════════════════════════════════
const Sonido = {
    ctx: null,

    get activado() { return Estado.get('sonido', true); },
    set activado(v) { Estado.set('sonido', v); },

    iniciar() {
        if (this.ctx) return;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new Ctx();
        } catch (e) { /* sin audio */ }
    },

    tono({ tipo = 'sine', desde = 440, hasta = null, volumen = 0.1, duracion = 0.15, retraso = 0 }) {
        if (!this.activado || !this.ctx) return;
        try {
            const t = this.ctx.currentTime + retraso;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = tipo;
            osc.frequency.setValueAtTime(desde, t);
            if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
            gain.gain.setValueAtTime(volumen, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duracion);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + duracion);
        } catch (e) { /* ignorar */ }
    },

    pasar()     { this.tono({ desde: 580, hasta: 880, volumen: 0.04, duracion: 0.08 }); },
    clic()      { this.tono({ tipo: 'triangle', desde: 320, hasta: 140, volumen: 0.09, duracion: 0.15 }); },
    pitido(f = 440, d = 0.2) { this.tono({ desde: f, volumen: 0.15, duracion: d }); },
    turbo()     { this.tono({ tipo: 'sawtooth', desde: 120, hasta: 650, volumen: 0.12, duracion: 0.6 }); },
    disparo()   { this.tono({ tipo: 'square', desde: 900, hasta: 150, volumen: 0.08, duracion: 0.12 }); },
    explosion() { this.tono({ tipo: 'sawtooth', desde: 180, hasta: 30, volumen: 0.2, duracion: 0.4 }); },
    dano()      { this.tono({ tipo: 'sawtooth', desde: 280, hasta: 70, volumen: 0.28, duracion: 0.25 }); },
    error()     { this.tono({ tipo: 'square', desde: 220, hasta: 110, volumen: 0.1, duracion: 0.25 }); },
    exito()     { [660, 880].forEach((f, i) => this.tono({ tipo: 'triangle', desde: f, volumen: 0.12, duracion: 0.18, retraso: i * 0.09 })); },
    recoger()   { [700, 1050, 1400].forEach((f, i) => this.tono({ tipo: 'sine', desde: f, volumen: 0.1, duracion: 0.1, retraso: i * 0.05 })); },
    salto()     { this.tono({ tipo: 'triangle', desde: 200, hasta: 600, volumen: 0.12, duracion: 0.3 }); },
    aterrizar() { this.tono({ tipo: 'sawtooth', desde: 120, hasta: 50, volumen: 0.12, duracion: 0.15 }); },
    acelerador(){ this.tono({ tipo: 'sawtooth', desde: 300, hasta: 1400, volumen: 0.1, duracion: 0.5 }); },
    habilidad() { [520, 780, 1040].forEach((f, i) => this.tono({ tipo: 'square', desde: f, volumen: 0.07, duracion: 0.14, retraso: i * 0.07 })); },
    impacto()   { this.tono({ tipo: 'square', desde: 160, hasta: 80, volumen: 0.12, duracion: 0.1 }); },
    victoria()  { [440, 554.37, 659.25, 880].forEach((f, i) => this.tono({ tipo: 'triangle', desde: f, volumen: 0.2, duracion: 0.35, retraso: i * 0.12 })); }
};

// El navegador sólo permite audio tras una interacción del usuario
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => Sonido.iniciar(), { once: true }));
