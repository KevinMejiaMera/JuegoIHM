// ══════════════════════════════════════════════════════════════
// Contenido del juego (vocabulario controlado de la fase 2)
// Todos los nombres, etiquetas y números salen de aquí para que
// sean iguales en todas las pantallas y en la carrera.
// ══════════════════════════════════════════════════════════════

const ICONOS = {
    ciudad:   `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M13 10h4v11M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1"/></svg>`,
    canon:    `<svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M2 20l7-10 4 5 3-3 6 8H2z"/><circle cx="18" cy="6" r="2" fill="#eab308"/></svg>`,
    autopista:`<svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M4 19L9 5M20 19L15 5M12 7v2M12 13v2M12 19v2"/></svg>`,
    hangar:   `<svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M3 20h18V8L12 3 3 8v12zM9 20v-6h6v6"/></svg>`,
    plasma:   `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
    laser:    `<svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    misil:    `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 2v8M8 6l4-4 4 4M10 10v8M14 10v8M9 18l3 4 3-4"/></svg>`,
    metralla: `<svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>`,
    auto:     `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M3 13l2-5h14l2 5v5H3v-5zM3 13h18"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    piloto:   `<svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>`,
    escudo:   `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>`,
    mira:     `<svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></svg>`,
    rayo:     `<svg viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>`,
    llave:    `<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z"/></svg>`,
    gema:     `<svg viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2"><path d="M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M12 21L8 9l4-6 4 6-4 12"/></svg>`
};

// Menú principal: un solo término por sección
const SECCIONES = [
    { id: 'jugar',   nombre: 'Jugar',           icono: '▶',  detalle: '1 o 2 jugadores', pagina: 'circuitos.html', principal: true },
    { id: 'garaje',  nombre: 'Garaje',          icono: '🚗', detalle: 'Vehículos',    pagina: 'garaje.html' },
    { id: 'armas',   nombre: 'Armas',           icono: '🔫', detalle: 'Equipamiento', pagina: 'armas.html' },
    { id: 'pilotos', nombre: 'Pilotos',         icono: '👥', detalle: 'Habilidades',  pagina: 'pilotos.html' },
    { id: 'pase',    nombre: 'Pase de batalla', icono: '🛡️', detalle: 'Temporada 3',  pagina: 'pase.html' },
    { id: 'tienda',  nombre: 'Tienda',          icono: '🛒', detalle: 'Ofertas',      pagina: 'tienda.html', destacado: true }
];

const REGLAS_CARRERA = {
    vueltas: 3,
    premioVictoria: 500,
    premioPorRival: 100
};

// ── Circuitos ──
// Los puntos están en un plano de 200 × 100 (el mismo de la miniatura).
// La carrera los multiplica por ESCALA_PISTA para construir la pista 3D,
// así la miniatura y la pista siempre tienen la misma forma.
// f = posición en la vuelta (0 = meta, 0.5 = media vuelta)
// lado = carril (-1 izquierda, 0 centro, 1 derecha)
const ESCALA_PISTA = 1.4;

const CIRCUITOS = [
    {
        id: 'neon', nombre: 'Neón Metrópolis', icono: 'ciudad', etiqueta: 'Popular',
        descripcion: 'Circuito urbano de curvas suaves y una chicana en zigzag. Ideal para empezar.',
        stats: [{ nombre: 'Dificultad', valor: 55 }, { nombre: 'Velocidad', valor: 85 }],
        pista: {
            puntos: [[30, 50], [34, 30], [55, 19], [85, 16], [120, 20], [150, 24], [172, 38], [172, 60], [160, 78], [138, 86], [118, 78], [98, 87], [74, 84], [46, 76]],
            meta: [100, 17], ancho: 16, velRivales: 1.0,
            colores: { suelo: 0x10101a, borde1: 0xa855f7, borde2: 0x38bdf8, niebla: 0x05050d, decorado: 'edificios' },
            picos: [{ f: 0.16, lado: -0.5 }, { f: 0.3, lado: 0.5 }, { f: 0.46, lado: 0 }, { f: 0.63, lado: -0.55 }, { f: 0.79, lado: 0.55 }, { f: 0.9, lado: 0 }],
            objetos: [{ f: 0.22, lado: 0, tipo: 'turbo' }, { f: 0.55, lado: 0.5, tipo: 'reparacion' }, { f: 0.72, lado: -0.4, tipo: 'turbo' }],
            rampas: [], aceleradores: [0.38], cajas: []
        }
    },
    {
        id: 'canon', nombre: 'Cañón Cuántico', icono: 'canon', etiqueta: 'Todoterreno',
        descripcion: 'Hexágono de tierra con esquinas cerradas y 3 rampas de salto. Frena antes de cada esquina.',
        stats: [{ nombre: 'Dificultad', valor: 80 }, { nombre: 'Saltos', valor: 95 }],
        pista: {
            puntos: [[25, 25], [140, 25], [175, 60], [150, 85], [60, 85], [25, 60]],
            esquinas: 13, meta: [80, 25], ancho: 16, velRivales: 0.92,
            colores: { suelo: 0x1c120a, borde1: 0xeab308, borde2: 0xef4444, niebla: 0x140904, decorado: 'rocas' },
            picos: [{ f: 0.12, lado: 0.5 }, { f: 0.36, lado: -0.5 }, { f: 0.52, lado: 0.4 }, { f: 0.7, lado: -0.4 }, { f: 0.9, lado: 0.5 }],
            objetos: [{ f: 0.42, lado: 0, tipo: 'turbo' }, { f: 0.76, lado: 0.3, tipo: 'reparacion' }],
            rampas: [0.24, 0.6, 0.83], aceleradores: [], cajas: []
        }
    },
    {
        id: 'autopista', nombre: 'Autopista Hiperespacio', icono: 'autopista', etiqueta: 'Velocidad',
        descripcion: 'Óvalo ancho con 4 aceleradores. Pásalos para salir disparado a más de 250 km/h.',
        stats: [{ nombre: 'Dificultad', valor: 45 }, { nombre: 'Velocidad', valor: 100 }],
        pista: {
            puntos: Array.from({ length: 18 }, (_, i) => {
                const a = (i / 18) * Math.PI * 2;
                return [100 + 75 * Math.cos(a), 50 + 30 * Math.sin(a)];
            }),
            meta: [100, 80], ancho: 20, velRivales: 1.15,
            colores: { suelo: 0x0b0b1c, borde1: 0xec4899, borde2: 0x38bdf8, niebla: 0x07041a, decorado: 'anillos' },
            picos: [{ f: 0.2, lado: -0.5 }, { f: 0.45, lado: 0.5 }, { f: 0.7, lado: -0.3 }, { f: 0.95, lado: 0.4 }],
            objetos: [{ f: 0.27, lado: 0.4, tipo: 'turbo' }, { f: 0.52, lado: -0.4, tipo: 'reparacion' }, { f: 0.77, lado: 0.4, tipo: 'turbo' }],
            rampas: [], aceleradores: [0.08, 0.33, 0.58, 0.83], cajas: []
        }
    },
    {
        id: 'hangar', nombre: 'Hangar Industrial 09', icono: 'hangar', etiqueta: 'Técnico',
        descripcion: 'Pista estrecha en forma de L con curvas de 90° y cajas de carga en el camino.',
        stats: [{ nombre: 'Dificultad', valor: 92 }, { nombre: 'Técnica', valor: 95 }],
        pista: {
            puntos: [[30, 30], [100, 30], [100, 60], [160, 60], [160, 80], [30, 80]],
            esquinas: 8, meta: [65, 30], ancho: 13, velRivales: 0.85,
            colores: { suelo: 0x141414, borde1: 0x22c55e, borde2: 0xa855f7, niebla: 0x050a06, decorado: 'contenedores' },
            picos: [{ f: 0.2, lado: 0.4 }, { f: 0.45, lado: -0.4 }, { f: 0.72, lado: 0.4 }],
            objetos: [{ f: 0.35, lado: 0, tipo: 'reparacion' }, { f: 0.6, lado: 0, tipo: 'turbo' }, { f: 0.9, lado: -0.3, tipo: 'turbo' }],
            rampas: [], aceleradores: [],
            cajas: [{ f: 0.1, lado: 0.5 }, { f: 0.28, lado: -0.5 }, { f: 0.53, lado: 0.45 }, { f: 0.82, lado: -0.45 }]
        }
    }
];

// ── Geometría de las pistas (sin Three.js, la usan la miniatura y la carrera) ──
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

// Devuelve n puntos repartidos a igual distancia, empezando en la meta
function muestrearPista(circuito, n = 600) {
    const P = circuito.pista;
    const pts = P.puntos, L = pts.length;
    const densos = [];

    if (P.esquinas) {
        // Polígono con esquinas redondeadas (rectas reales entre esquinas)
        for (let i = 0; i < L; i++) {
            const a = pts[(i - 1 + L) % L], v = pts[i], b = pts[(i + 1) % L];
            const da = Math.hypot(a[0] - v[0], a[1] - v[1]), db = Math.hypot(b[0] - v[0], b[1] - v[1]);
            const ra = Math.min(P.esquinas, da / 2.1), rb = Math.min(P.esquinas, db / 2.1);
            const e1 = [v[0] + (a[0] - v[0]) / da * ra, v[1] + (a[1] - v[1]) / da * ra];
            const e2 = [v[0] + (b[0] - v[0]) / db * rb, v[1] + (b[1] - v[1]) / db * rb];
            for (let k = 0; k <= 14; k++) {
                const t = k / 14, u = 1 - t;
                densos.push([u * u * e1[0] + 2 * u * t * v[0] + t * t * e2[0], u * u * e1[1] + 2 * u * t * v[1] + t * t * e2[1]]);
            }
        }
    } else {
        for (let i = 0; i < L; i++) {
            const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
            for (let k = 0; k < 24; k++) densos.push(catmullRom(p0, p1, p2, p3, k / 24));
        }
    }

    // Longitud acumulada (cerrando el circuito)
    densos.push(densos[0]);
    const acum = [0];
    for (let i = 1; i < densos.length; i++) acum.push(acum[i - 1] + Math.hypot(densos[i][0] - densos[i - 1][0], densos[i][1] - densos[i - 1][1]));
    const total = acum[acum.length - 1];

    const salida = [];
    let s = 1;
    for (let j = 0; j < n; j++) {
        const objetivo = (j / n) * total;
        while (s < acum.length - 1 && acum[s] < objetivo) s++;
        const largo = acum[s] - acum[s - 1] || 1;
        const f = (objetivo - acum[s - 1]) / largo;
        salida.push([densos[s - 1][0] + (densos[s][0] - densos[s - 1][0]) * f, densos[s - 1][1] + (densos[s][1] - densos[s - 1][1]) * f]);
    }

    // Que el punto 0 sea la meta
    let inicio = 0;
    if (P.meta) {
        let mejor = Infinity;
        salida.forEach((p, i) => {
            const d = (p[0] - P.meta[0]) ** 2 + (p[1] - P.meta[1]) ** 2;
            if (d < mejor) { mejor = d; inicio = i; }
        });
    }
    return { puntos: salida.slice(inicio).concat(salida.slice(0, inicio)), longitud: total };
}

// Punto + normal en la miniatura para una posición f y un carril
function puntoMiniatura(m, f, lado, ancho) {
    const n = m.puntos.length, i = Math.floor(((f % 1) + 1) % 1 * n);
    const a = m.puntos[(i - 1 + n) % n], b = m.puntos[(i + 1) % n], p = m.puntos[i];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    const off = lado * (ancho / 2 - 2) / ESCALA_PISTA;
    return [p[0] - ty / l * off, p[1] + tx / l * off];
}

// Miniatura SVG de un circuito: misma forma que la pista 3D
function trazadoSVG(circuito, detallado = false) {
    const P = circuito.pista;
    const m = muestrearPista(circuito, 240);
    const d = 'M ' + m.puntos.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z';
    const anchoSVG = P.ancho / ESCALA_PISTA;
    const c1 = '#' + P.colores.borde1.toString(16).padStart(6, '0');
    const c2 = '#' + P.colores.borde2.toString(16).padStart(6, '0');
    const [mx, my] = m.puntos[0];
    const [nx, ny] = m.puntos[6];
    const ang = Math.atan2(ny - my, nx - mx) * 180 / Math.PI;

    let extra = '';
    if (detallado) {
        P.picos.forEach(o => { const [x, y] = puntoMiniatura(m, o.f, o.lado, P.ancho); extra += `<circle cx="${x}" cy="${y}" r="2.2" fill="#ef4444"/>`; });
        P.objetos.forEach(o => { const [x, y] = puntoMiniatura(m, o.f, o.lado, P.ancho); extra += `<circle cx="${x}" cy="${y}" r="2" fill="${o.tipo === 'turbo' ? '#38bdf8' : '#22c55e'}"/>`; });
        P.cajas.forEach(o => { const [x, y] = puntoMiniatura(m, o.f, o.lado, P.ancho); extra += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="#94a3b8"/>`; });
        P.rampas.forEach(f => { const [x, y] = puntoMiniatura(m, f, 0, P.ancho); extra += `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#facc15" stroke-width="1.5"/>`; });
        P.aceleradores.forEach(f => { const [x, y] = puntoMiniatura(m, f, 0, P.ancho); extra += `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#ec4899" stroke-width="1.5"/>`; });
    }

    return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
        <path d="${d}" fill="none" stroke="${c1}" stroke-opacity="0.35" stroke-width="${anchoSVG + 2}" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#0b0b18" stroke-width="${anchoSVG - 1}" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="${c2}" stroke-width="0.8" stroke-dasharray="3,3"/>
        <g transform="translate(${mx} ${my}) rotate(${ang})">
            <rect x="-1.2" y="${-anchoSVG / 2}" width="2.4" height="${anchoSVG}" fill="#fff"/>
            <path d="M 4 -3 L 9 0 L 4 3 Z" fill="${c2}"/>
        </g>
        ${extra}
    </svg>`;
}

// ── Vehículos (los números se usan en la carrera) ──
// vmax en km/h · acel = aceleración · giro = agilidad · resistencia = daño recibido (menos es mejor)
const VEHICULOS = [
    { id: 'phantom',  nombre: 'Apex Phantom X', icono: 'autopista', tipo: 'Deportivo',
      descripcion: 'Deportivo equilibrado: buena velocidad y buen giro. Recomendado para empezar.',
      vmax: 172, acel: 105, giro: 2.8, resistencia: 1.0 },
    { id: 'marauder', nombre: 'Marauder',       icono: 'hangar',    tipo: 'Blindado',
      descripcion: 'Todoterreno acorazado: recibe 40 % menos daño, pero es más lento y gira menos.',
      vmax: 152, acel: 88, giro: 2.35, resistencia: 0.6 },
    { id: 'hyperion', nombre: 'Hyperion GT',    icono: 'canon',     tipo: 'Fórmula',
      descripcion: 'Monoplaza de fórmula: el más rápido en recta, pero frágil ante los impactos.',
      vmax: 198, acel: 122, giro: 2.6, resistencia: 1.35 },
    { id: 'viper',    nombre: 'Viper Stealth',  icono: 'plasma',    tipo: 'Sigilo',
      descripcion: 'Prototipo con camuflaje óptico y el mejor giro. Se obtiene en el nivel 50 del Pase de batalla.',
      vmax: 185, acel: 112, giro: 3.1, resistencia: 0.9, bloqueado: 'Alcanza el nivel 50 del Pase de batalla para desbloquearlo.' }
];
VEHICULOS.forEach(v => {
    v.etiqueta = v.tipo;
    v.stats = [
        { nombre: 'Velocidad', valor: Math.round(v.vmax / 2) },
        { nombre: 'Aceleración', valor: Math.round(v.acel / 1.25) },
        { nombre: 'Giro', valor: Math.round(v.giro / 3.1 * 100) },
        { nombre: 'Blindaje', valor: Math.min(100, Math.round(60 / v.resistencia)) }
    ];
});

// ── Armas (cadencia = segundos entre disparos) ──
const ARMAS = [
    { id: 'plasma',   nombre: 'Cañón de plasma',    icono: 'plasma',   etiqueta: 'Clase S',
      descripcion: 'Esferas de energía de daño alto. El arma más equilibrada.',
      cadencia: 0.32, dano: 34, velocidad: 135, color: 0x38bdf8, forma: 'esfera', tam: 0.32,
      sonido: { tipo: 'square', desde: 900, hasta: 150, volumen: 0.08, duracion: 0.12 } },
    { id: 'laser',    nombre: 'Láser Hélix',        icono: 'laser',    etiqueta: 'Clase A',
      descripcion: 'Rayos rápidos y muy veloces. Poco daño por disparo, pero casi nunca fallan.',
      cadencia: 0.13, dano: 13, velocidad: 230, color: 0xec4899, forma: 'rayo', tam: 0.12,
      sonido: { tipo: 'sawtooth', desde: 1600, hasta: 600, volumen: 0.05, duracion: 0.08 } },
    { id: 'emp',      nombre: 'Misiles EMP',        icono: 'misil',    etiqueta: 'Teledirigido',
      descripcion: 'Misiles lentos que persiguen al rival más cercano y lo frenan 3,5 s.',
      cadencia: 1.0, dano: 45, velocidad: 85, color: 0xef4444, forma: 'misil', tam: 0.25, guiado: true, emp: 3.5,
      sonido: { tipo: 'sawtooth', desde: 200, hasta: 500, volumen: 0.1, duracion: 0.3 } },
    { id: 'metralla', nombre: 'Metralleta Neutrón', icono: 'metralla', etiqueta: 'Ráfaga',
      descripcion: 'Mantén F para una lluvia de balas. Poco daño y algo de dispersión.',
      cadencia: 0.07, dano: 6, velocidad: 170, color: 0xfacc15, forma: 'esfera', tam: 0.16, dispersion: 0.07,
      sonido: { tipo: 'square', desde: 500, hasta: 200, volumen: 0.04, duracion: 0.05 } }
];
ARMAS.forEach(a => {
    a.stats = [
        { nombre: 'Daño', valor: Math.round(a.dano / 45 * 100) },
        { nombre: 'Cadencia', valor: Math.max(10, Math.round((1 - a.cadencia) * 100)) },
        { nombre: 'Velocidad del disparo', valor: Math.round(a.velocidad / 230 * 100) }
    ];
});

// ── Pilotos: cada uno tiene una habilidad (tecla E) ──
const PILOTOS = [
    { id: 'nova',     nombre: 'Nova Cross',    icono: 'rayo',  etiqueta: 'Sobrecarga',
      descripcion: 'Llena el turbo y durante 4 s lo usa gratis y 40 % más fuerte.',
      habilidad: { id: 'sobrecarga', nombre: 'Sobrecarga', duracion: 4, recarga: 14 } },
    { id: 'kaelen',   nombre: 'Kaelen 7',      icono: 'mira',  etiqueta: 'Puntería',
      descripcion: 'Durante 6 s todos tus disparos persiguen al rival más cercano.',
      habilidad: { id: 'punteria', nombre: 'Puntería asistida', duracion: 6, recarga: 16 } },
    { id: 'valkyrie', nombre: 'Valkyrie Zero', icono: 'escudo', etiqueta: 'Defensa',
      descripcion: 'Escudo de 4 s: ni los picos ni los disparos te hacen daño.',
      habilidad: { id: 'escudo', nombre: 'Escudo', duracion: 4, recarga: 18 } },
    { id: 'thorne',   nombre: 'Dr. Thorne',    icono: 'llave', etiqueta: 'Reparación',
      descripcion: 'Repara al instante 40 % del blindaje del vehículo.',
      habilidad: { id: 'reparacion', nombre: 'Reparación', duracion: 0, recarga: 20 } }
];
PILOTOS.forEach(p => {
    p.stats = [
        { nombre: 'Habilidad', texto: `${p.habilidad.nombre} (tecla E)` },
        { nombre: 'Recarga', texto: `${p.habilidad.recarga} s` }
    ];
});

const PASE = {
    temporada: 'Temporada 3',
    nivelActual: 32,
    recompensas: [
        { id: 'p10', nivel: 10, nombre: 'Pintura Cuásar',  icono: 'laser',     descripcion: 'Pintura cromada iridiscente.',      tipo: 'Gratis' },
        { id: 'p25', nivel: 25, nombre: 'Rines Taquión',   icono: 'autopista', descripcion: 'Rines con estela fluorescente.',     tipo: 'Premium' },
        { id: 'p40', nivel: 40, nombre: 'Propulsor Azul',  icono: 'misil',     descripcion: 'Llamarada azul del turbo.',           tipo: 'Premium' },
        { id: 'p50', nivel: 50, nombre: 'Viper Stealth',   icono: 'plasma',    descripcion: 'Vehículo legendario con camuflaje.', tipo: 'Legendario' }
    ]
};

const TIENDA = [
    { id: 'fundador',  nombre: 'Paquete Fundador', icono: 'gema',     etiqueta: '-50 %',   descripcion: '5 pinturas, 2000 créditos y emblema exclusivo.', precio: 4500,  stats: [{ nombre: 'Contenido', texto: '5 pinturas + 2000 ⚡' }], creditos: 2000 },
    { id: 'creditos',  nombre: '10.000 créditos',  icono: 'laser',    etiqueta: 'Oferta',  descripcion: 'Créditos para el Pase de batalla y vehículos.',    precio: 9000,  stats: [{ nombre: 'Contenido', texto: '10.000 ⚡' }], creditos: 10000 },
    { id: 'supernova', nombre: 'Efecto Supernova', icono: 'misil',    etiqueta: 'Mítico',  descripcion: 'Estallido estelar al destruir a un rival.',        precio: 20000, stats: [{ nombre: 'Rareza', texto: 'Mítica' }] },
    { id: 'oro',       nombre: 'Pintura Oro 24K',  icono: 'metralla', etiqueta: 'Del día', descripcion: 'Acabado reflectante dorado.',                      precio: 1200,  stats: [{ nombre: 'Rareza', texto: 'Épica' }], pintura: '#eab308' }
];

const PINTURAS = [
    { color: '#a855f7', nombre: 'Morado neón' },
    { color: '#38bdf8', nombre: 'Azul cian' },
    { color: '#ec4899', nombre: 'Rosa ciber' },
    { color: '#22c55e', nombre: 'Verde matriz' },
    { color: '#eab308', nombre: 'Oro solar' },
    { color: '#ef4444', nombre: 'Rojo carmesí' }
];

const CONTROLES = [
    { grupo: 'Conducción', filas: [
        { teclas: ['W', '▲'], accion: 'Acelerar' },
        { teclas: ['S', '▼'], accion: 'Frenar / marcha atrás' },
        { teclas: ['A', 'D'], accion: 'Girar a la izquierda / derecha' },
        { teclas: ['Espacio'], accion: 'Turbo (gasta energía)' }
    ]},
    { grupo: 'Combate', filas: [
        { teclas: ['F', 'Clic'], accion: 'Disparar (mantén para ráfaga)' },
        { teclas: ['E'], accion: 'Habilidad del piloto' }
    ]},
    { grupo: 'Carrera', filas: [
        { teclas: ['R'], accion: 'Volver a la pista' },
        { teclas: ['Esc', 'P'], accion: 'Pausa' }
    ]},
    { grupo: 'Menú principal', filas: [
        { teclas: ['Arrastrar'], accion: 'Girar el vehículo 360°' },
        { teclas: ['Rueda'], accion: 'Acercar / alejar' }
    ]}
];

// Teclas en el modo 2 jugadores (pantalla dividida)
const CONTROLES_2J = [
    { grupo: 'Jugador 1 · pantalla izquierda', filas: [
        { teclas: ['W', 'A', 'S', 'D'], accion: 'Conducir' },
        { teclas: ['Espacio'], accion: 'Turbo' },
        { teclas: ['F', 'Clic'], accion: 'Disparar' },
        { teclas: ['E'], accion: 'Habilidad' },
        { teclas: ['R'], accion: 'Volver a la pista' }
    ]},
    { grupo: 'Jugador 2 · pantalla derecha', filas: [
        { teclas: ['▲', '◀', '▼', '▶'], accion: 'Conducir' },
        { teclas: ['Shift der.'], accion: 'Turbo' },
        { teclas: ['Ctrl der.', '.'], accion: 'Disparar' },
        { teclas: ['Enter'], accion: 'Habilidad' },
        { teclas: ['Retroceso'], accion: 'Volver a la pista' }
    ]}
];

const buscarPor =(lista, id) => lista.find(x => x.id === id) || lista[0];
