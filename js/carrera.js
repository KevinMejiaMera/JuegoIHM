// ══════════════════════════════════════════════════════════════
// Carrera: pista según el circuito, rivales con IA, armas,
// habilidades de piloto, objetos, pausa y resultados.
// ══════════════════════════════════════════════════════════════

if (verificarMotor3D()) iniciarJuego();

function iniciarJuego() {
    const VUELTAS = REGLAS_CARRERA.vueltas;
    const elegido = new URLSearchParams(location.search).get('circuito');
    if (elegido && CIRCUITOS.some(c => c.id === elegido)) Estado.set('circuito', elegido);
    const circuito = buscarPor(CIRCUITOS, Estado.get('circuito'));
    const P = circuito.pista;
    let datosVeh = buscarPor(VEHICULOS, Estado.get('vehiculo'));
    if (datosVeh.bloqueado) datosVeh = VEHICULOS[0];
    const arma = buscarPor(ARMAS, Estado.get('arma'));
    const piloto = buscarPor(PILOTOS, Estado.get('agente'));
    const HAB = piloto.habilidad;

    const $ = id => document.getElementById(id);
    const mod = (a, n) => ((a % n) + n) % n;
    const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

    // ══════════ Pista en coordenadas del mundo ══════════
    const N = 720;
    const muestra = muestrearPista(circuito, N);
    const E = ESCALA_PISTA;
    const pts = muestra.puntos.map(([x, y]) => new THREE.Vector3((x - 100) * E, 0, (y - 50) * E));
    const tan = pts.map((p, i) => pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize());
    const nor = tan.map(t => new THREE.Vector3(-t.z, 0, t.x));
    const curva = tan.map((t, i) => Math.acos(limitar(t.dot(tan[(i + 14) % N]), -1, 1)));
    const LARGO_MUESTRA = (muestra.longitud * E) / N;   // metros entre muestras
    const MITAD = P.ancho / 2;
    const idxDe = f => Math.round(mod(f, 1) * N) % N;
    const ladoDe = l => l * (MITAD - 2.2);

    function puntoEn(s, lado = 0) {
        const i0 = Math.floor(mod(s, N)), i1 = (i0 + 1) % N, f = mod(s, N) - i0;
        const p = pts[i0].clone().lerp(pts[i1], f);
        const n = nor[i0].clone().lerp(nor[i1], f).normalize();
        const t = tan[i0].clone().lerp(tan[i1], f).normalize();
        return { pos: p.addScaledVector(n, lado), tan: t };
    }
    const rumbo = t => Math.atan2(t.x, t.z);
    const orientar = (obj, i) => { obj.rotation.y = rumbo(tan[i]); };

    // ══════════ Escena ══════════
    const { renderer, scene, camera } = crearEscena($('lienzo-3d'));
    scene.fog = new THREE.FogExp2(P.colores.niebla, 0.0065);
    scene.add(new THREE.AmbientLight(0x3a3060, 1.6));
    scene.add(new THREE.HemisphereLight(0x9d8cff, 0x0a0614, 0.7));
    const sol = new THREE.DirectionalLight(0xffffff, 1.3);
    scene.add(sol, sol.target);
    crearEstrellas(scene, 260);

    const rejilla = new THREE.GridHelper(700, 70, P.colores.borde1, 0x1e1b3a);
    rejilla.position.y = -40;
    rejilla.material.transparent = true;
    rejilla.material.opacity = 0.35;
    scene.add(rejilla);

    const obstaculos = [];   // { pos, radio }          → rebote
    const picos = [];        // { pos, radio, i, lado } → daño
    const objetos = [];      // { mesh, pos, tipo, activo, vuelve }
    const rampas = P.rampas.map(idxDe);
    const aceleradores = P.aceleradores.map(idxDe);
    const decorGiratorio = [];

    construirPista();
    decorar();

    function cinta(latA, latB, y, material) {
        const pos = [], ind = [];
        for (let i = 0; i <= N; i++) {
            const k = i % N;
            const a = pts[k].clone().addScaledVector(nor[k], latA);
            const b = pts[k].clone().addScaledVector(nor[k], latB);
            pos.push(a.x, y, a.z, b.x, y, b.z);
            if (i < N) {
                const v = i * 2;
                ind.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(ind);
        geo.computeVertexNormals();
        material.side = THREE.DoubleSide;
        const m = new THREE.Mesh(geo, material);
        m.receiveShadow = true;
        scene.add(m);
        return m;
    }

    function texturaCuadros(cols, filas) {
        const c = document.createElement('canvas');
        c.width = cols * 16; c.height = filas * 16;
        const x = c.getContext('2d');
        for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
            x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
            x.fillRect(i * 16, j * 16, 16, 16);
        }
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter;
        return t;
    }

    function texturaFlechas(color) {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 128;
        const x = c.getContext('2d');
        x.fillStyle = 'rgba(0,0,0,0)';
        x.fillRect(0, 0, 64, 128);
        x.strokeStyle = color;
        x.lineWidth = 9;
        [20, 60, 100].forEach(y => { x.beginPath(); x.moveTo(8, y + 18); x.lineTo(32, y - 6); x.lineTo(56, y + 18); x.stroke(); });
        return new THREE.CanvasTexture(c);
    }

    function construirPista() {
        const col = P.colores;
        cinta(-MITAD, MITAD, 0, new THREE.MeshStandardMaterial({ color: col.suelo, roughness: 0.85, metalness: 0.15 }));
        cinta(MITAD, MITAD + 0.7, 0.02, new THREE.MeshBasicMaterial({ color: col.borde2 }));
        cinta(-MITAD - 0.7, -MITAD, 0.02, new THREE.MeshBasicMaterial({ color: col.borde1 }));
        // Base inferior (grosor de la pista)
        cinta(-MITAD - 0.7, MITAD + 0.7, -0.6, new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1 }));

        // Línea central discontinua
        const matLinea = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
        for (let i = 0; i < N; i += 10) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, LARGO_MUESTRA * 5), matLinea);
            l.position.copy(pts[i]).setY(0.02);
            orientar(l, i);
            scene.add(l);
        }

        // Pianos rojo/blanco en las curvas
        const matRojo = new THREE.MeshBasicMaterial({ color: 0xef4444 }), matBlanco = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        let alterno = 0;
        for (let i = 0; i < N; i += 3) {
            if (curva[i] < 0.35) continue;
            const dentro = tan[i].clone().cross(tan[(i + 10) % N]).y > 0 ? 1 : -1;
            [dentro * (MITAD - 0.6)].forEach(lat => {
                const piano = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, LARGO_MUESTRA * 3), alterno++ % 2 ? matRojo : matBlanco);
                piano.position.copy(pts[i]).addScaledVector(nor[i], lat).setY(0.04);
                orientar(piano, i);
                scene.add(piano);
            });
        }

        // Postes luminosos en los bordes
        const geoPoste = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
        const matPoste = new THREE.MeshStandardMaterial({ color: 0x1f1938, metalness: 0.8, roughness: 0.3 });
        const matLuz1 = new THREE.MeshBasicMaterial({ color: col.borde1 }), matLuz2 = new THREE.MeshBasicMaterial({ color: col.borde2 });
        const geoLuz = new THREE.SphereGeometry(0.22, 8, 8);
        for (let i = 0; i < N; i += 16) {
            [[-1, matLuz1], [1, matLuz2]].forEach(([l, mat]) => {
                const base = pts[i].clone().addScaledVector(nor[i], l * (MITAD + 1.3));
                const poste = new THREE.Mesh(geoPoste, matPoste);
                poste.position.copy(base).setY(0.7);
                scene.add(poste);
                const luz = new THREE.Mesh(geoLuz, mat);
                luz.position.copy(base).setY(1.5);
                scene.add(luz);
            });
        }

        // Arco de meta
        const arco = new THREE.Group();
        arco.position.copy(pts[0]);
        orientar(arco, 0);
        const matArco = new THREE.MeshStandardMaterial({ color: 0x1f1938, metalness: 0.8, roughness: 0.3 });
        [-1, 1].forEach(l => {
            const pilar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10, 1.4), matArco);
            pilar.position.set(l * (MITAD + 1.6), 5, 0);
            arco.add(pilar);
            const neon = new THREE.Mesh(new THREE.BoxGeometry(0.15, 10, 0.15), new THREE.MeshBasicMaterial({ color: col.borde2 }));
            neon.position.set(l * (MITAD + 0.85), 5, 0.72);
            arco.add(neon);
        });
        const viga = new THREE.Mesh(new THREE.BoxGeometry(P.ancho + 4.6, 1.6, 1.4), new THREE.MeshBasicMaterial({ map: texturaCuadros(Math.round(P.ancho), 2) }));
        viga.position.y = 9.6;
        arco.add(viga);
        const meta = new THREE.Mesh(new THREE.PlaneGeometry(P.ancho, 2.6), new THREE.MeshBasicMaterial({ map: texturaCuadros(Math.round(P.ancho / 1.3), 2) }));
        meta.rotation.x = -Math.PI / 2;
        meta.position.y = 0.03;
        arco.add(meta);
        scene.add(arco);

        // Picos
        const geoPico = new THREE.ConeGeometry(0.32, 1.35, 6);
        const matPico = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2, emissive: 0x991b1b, emissiveIntensity: 0.6 });
        P.picos.forEach(cfg => {
            const i = idxDe(cfg.f), lado = ladoDe(cfg.lado);
            const { pos } = puntoEn(i, lado);
            const g = new THREE.Group();
            g.position.copy(pos);
            const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x17122b, metalness: 0.8, roughness: 0.3 }));
            base.position.y = 0.07;
            g.add(base);
            const aro = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.95, 24), new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
            aro.rotation.x = -Math.PI / 2;
            aro.position.y = 0.15;
            g.add(aro);
            [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55], [0, 0]].forEach(([px, pz]) => {
                const p = new THREE.Mesh(geoPico, matPico);
                p.position.set(px, 0.68, pz);
                g.add(p);
            });
            const baliza = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
            baliza.position.y = 1.45;
            g.add(baliza);
            g.baliza = baliza;
            scene.add(g);
            picos.push({ pos, radio: 2.1, i, lado, mesh: g });
        });

        // Cajas de carga (obstáculos sólidos)
        const matCaja = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.6, roughness: 0.5 });
        const matBordeCaja = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        P.cajas.forEach(cfg => {
            const i = idxDe(cfg.f), lado = ladoDe(cfg.lado);
            const { pos } = puntoEn(i, lado);
            const c = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), matCaja);
            c.position.copy(pos).setY(1.2);
            orientar(c, i);
            c.castShadow = true;
            const franja = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.25, 2.45), matBordeCaja);
            c.add(franja);
            scene.add(c);
            obstaculos.push({ pos, radio: 2.4, i, lado });
        });

        // Rampas de salto
        const matRampa = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.3, roughness: 0.7, emissive: 0x3b1d05 });
        rampas.forEach(i => {
            const g = new THREE.Group();
            g.position.copy(pts[i]);
            orientar(g, i);
            const forma = new THREE.Shape();
            forma.moveTo(-2.2, 0); forma.lineTo(2.2, 0); forma.lineTo(2.2, 0.75); forma.closePath();
            const geo = new THREE.ExtrudeGeometry(forma, { depth: P.ancho - 1, bevelEnabled: false });
            geo.rotateY(-Math.PI / 2);
            geo.translate((P.ancho - 1) / 2, 0, 0);
            g.add(new THREE.Mesh(geo, matRampa));
            const franja = new THREE.Mesh(new THREE.BoxGeometry(P.ancho - 1, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            franja.position.set(0, 0.78, 2.1);
            g.add(franja);
            scene.add(g);
        });

        // Aceleradores: suelo con flechas y anillo
        const texFlechas = texturaFlechas('#ec4899');
        texFlechas.wrapS = texFlechas.wrapT = THREE.RepeatWrapping;
        texFlechas.repeat.set(4, 1);
        aceleradores.forEach(i => {
            const g = new THREE.Group();
            g.position.copy(pts[i]);
            orientar(g, i);
            const suelo = new THREE.Mesh(new THREE.PlaneGeometry(P.ancho - 2, 6), new THREE.MeshBasicMaterial({ map: texFlechas, transparent: true }));
            suelo.rotation.x = -Math.PI / 2;
            suelo.position.y = 0.05;
            g.add(suelo);
            const anillo = new THREE.Mesh(new THREE.TorusGeometry(MITAD + 0.5, 0.3, 8, 40, Math.PI), new THREE.MeshBasicMaterial({ color: 0xec4899 }));
            g.add(anillo);
            scene.add(g);
            g.anillo = anillo;
            g.suelo = suelo;
        });

        // Objetos: turbo y reparación
        P.objetos.forEach(cfg => {
            const i = idxDe(cfg.f), lado = ladoDe(cfg.lado);
            const { pos } = puntoEn(i, lado);
            let mesh;
            if (cfg.tipo === 'turbo') {
                mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: false, transparent: true, opacity: 0.9 }));
                const borde = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
                mesh.add(borde);
            } else {
                mesh = new THREE.Group();
                const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
                mesh.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), mat));
                mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), mat));
                const halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                mesh.add(halo);
            }
            mesh.position.copy(pos).setY(1.4);
            scene.add(mesh);
            objetos.push({ mesh, pos, tipo: cfg.tipo, activo: true, vuelve: 0 });
        });
    }

    // Decorado alrededor de la pista según el circuito
    function decorar() {
        const tipo = P.colores.decorado;
        const lejos = (x, z, margen) => {
            for (let i = 0; i < N; i += 6) {
                const dx = pts[i].x - x, dz = pts[i].z - z;
                if (dx * dx + dz * dz < (MITAD + margen) ** 2) return false;
            }
            return true;
        };
        const sitios = [];
        for (let k = 0; k < 140 && sitios.length < 70; k++) {
            const i = Math.floor(Math.random() * N);
            const l = (Math.random() < 0.5 ? -1 : 1) * (MITAD + 7 + Math.random() * 30);
            const p = pts[i].clone().addScaledVector(nor[i], l);
            if (lejos(p.x, p.z, 5)) sitios.push(p);
        }
        sitios.forEach((p, k) => {
            let m;
            if (tipo === 'edificios') {
                const alto = 8 + Math.random() * 28;
                m = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 5, alto, 4 + Math.random() * 5),
                    new THREE.MeshStandardMaterial({ color: 0x120e24, emissive: k % 2 ? 0x2a0f4a : 0x0b2540, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.4 }));
                m.position.set(p.x, alto / 2 - 6, p.z);
                const techo = new THREE.Mesh(new THREE.BoxGeometry(m.geometry.parameters.width + 0.2, 0.3, m.geometry.parameters.depth + 0.2), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xa855f7 : 0x38bdf8 }));
                techo.position.y = alto / 2;
                m.add(techo);
            } else if (tipo === 'rocas') {
                const r = 2 + Math.random() * 5;
                m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color: 0x5b3714, roughness: 1, flatShading: true }));
                m.position.set(p.x, r * 0.4 - 1, p.z);
                m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
            } else if (tipo === 'anillos') {
                m = new THREE.Mesh(new THREE.TorusGeometry(3 + Math.random() * 4, 0.25, 8, 32), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xec4899 : 0x38bdf8, transparent: true, opacity: 0.6 }));
                m.position.set(p.x, 4 + Math.random() * 14, p.z);
                m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
                m.userData.gira = 0.2 + Math.random() * 0.6;
            } else {
                m = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 7), new THREE.MeshStandardMaterial({ color: [0x14532d, 0x7c2d12, 0x1e3a8a, 0x3f3f46][k % 4], metalness: 0.5, roughness: 0.6 }));
                m.position.set(p.x, 1.5 + (k % 3 === 0 ? 3 : 0), p.z);
                m.rotation.y = Math.random() * Math.PI;
            }
            scene.add(m);
            if (m.userData.gira) decorGiratorio.push(m);
        });
    }

    // ══════════ Vehículos ══════════
    const auto = crearVehiculo(datosVeh.id, Estado.get('pintura'));
    scene.add(auto);
    const escudo = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, depthWrite: false }));
    escudo.position.y = 0.8;
    escudo.visible = false;
    auto.add(escudo);

    const RIVALES = [
        { nombre: 'Hyperion cian',    tipo: 'hyperion', color: 0x38bdf8, base: 54, carril: 0.45 },
        { nombre: 'Marauder rosa',    tipo: 'marauder', color: 0xec4899, base: 49, carril: -0.45 },
        { nombre: 'Phantom dorado',   tipo: 'phantom',  color: 0xeab308, base: 51.5, carril: 0.45 }
    ];
    const rivales = RIVALES.map(cfg => {
        const mesh = crearVehiculo(cfg.tipo, cfg.color);
        scene.add(mesh);
        const barra = new THREE.Group();
        const fondo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.24), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 }));
        const vida = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.16), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        vida.position.z = 0.01;
        barra.add(fondo, vida);
        scene.add(barra);
        return { ...cfg, mesh, barra, vida, s: 0, lado: 0, vel: 0, salud: 100, vivo: true };
    });

    // ══════════ Proyectiles y partículas ══════════
    const balas = [];          // del jugador
    const balasRivales = [];   // de los rivales
    const particulas = new THREE.Group();
    scene.add(particulas);

    const geoBala = {
        esfera: new THREE.SphereGeometry(arma.tam, 10, 10),
        rayo: (() => { const g = new THREE.CylinderGeometry(arma.tam, arma.tam, 2.4, 6); g.rotateX(Math.PI / 2); return g; })(),
        misil: (() => { const g = new THREE.ConeGeometry(arma.tam * 1.3, 1.2, 8); g.rotateX(Math.PI / 2); return g; })()
    }[arma.forma];
    const matBala = new THREE.MeshBasicMaterial({ color: arma.color });
    const geoBalaRival = new THREE.SphereGeometry(0.28, 8, 8);
    const matBalaRival = new THREE.MeshBasicMaterial({ color: 0xff3355 });

    function chispas(pos, cantidad, colores, tam, vida, fuerza) {
        for (let i = 0; i < cantidad; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(tam, tam, tam), new THREE.MeshBasicMaterial({ color: colores[Math.floor(Math.random() * colores.length)] }));
            p.position.copy(pos).add(new THREE.Vector3(0, 0.6, 0));
            p.vel = new THREE.Vector3((Math.random() - 0.5) * fuerza, Math.random() * fuerza * 0.8 + 2, (Math.random() - 0.5) * fuerza);
            p.vida = vida;
            particulas.add(p);
        }
    }
    const explosion = pos => { Sonido.explosion(); chispas(pos, 34, [0xf97316, 0xfacc15, 0xef4444], 0.35, 1.1, 20); };
    const chispazo = (pos, color = [0xef4444, 0xfacc15]) => chispas(pos, 12, color, 0.18, 0.45, 12);

    // ══════════ Estado de la carrera ══════════
    const teclas = {};
    let carreraActiva = false, pausada = false, terminada = false, volviendo = false, disparando = false;
    let tJuego = 0, tiempo = 0;
    let velocidad = 0, blindaje = 100, energia = 100, invulnerable = 0;
    let idx = 0, prog = 0, idxSeguro = 0, progSeguro = 0, vueltasHechas = 0;
    let y = 0, vy = 0, enAire = false, cayendo = false;
    let impulsoHasta = 0, recargaArma = 0, habListaEn = 0, habActivaHasta = 0;
    let rivalesDestruidos = 0, cuentaTimer = null;

    const fmtTiempo = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const rivalesVivos = () => rivales.filter(r => r.vivo).length;
    const posicion = () => 1 + rivales.filter(r => r.vivo && r.s > prog).length;
    const habActiva = id => HAB.id === id && tJuego < habActivaHasta;

    // ── HUD ──
    const hud = {
        velocidad: $('hud-velocidad'), vuelta: $('hud-vuelta'), rivales: $('hud-rivales'),
        posicion: $('hud-posicion'), tiempo: $('hud-tiempo'),
        blindajeValor: $('hud-blindaje-valor'), blindajeBarra: $('hud-blindaje-barra'), blindajeCaja: $('hud-blindaje'),
        turboValor: $('hud-turbo-valor'), turboBarra: $('hud-turbo-barra'),
        armaBarra: $('hud-arma-barra'), habBarra: $('hud-hab-barra'), habEstado: $('hud-hab-estado'), habCaja: $('hud-habilidad'), armaCaja: $('hud-arma')
    };
    $('hud-circuito').textContent = circuito.nombre.toUpperCase();
    $('hud-arma-nombre').textContent = arma.nombre;
    $('hud-arma-icono').innerHTML = ICONOS[arma.icono];
    $('hud-hab-nombre').textContent = HAB.nombre;
    $('hud-hab-icono').innerHTML = ICONOS[piloto.icono];
    document.title = `Zero Horizon · Carrera · ${circuito.nombre}`;

    function actualizarHUD() {
        hud.vuelta.textContent = `${limitar(vueltasHechas + 1, 1, VUELTAS)} / ${VUELTAS}`;
        hud.rivales.textContent = rivalesVivos();
        hud.posicion.textContent = `${posicion()} / ${rivales.length + 1}`;
        hud.blindajeValor.textContent = `${Math.round(blindaje)} %`;
        hud.blindajeBarra.style.width = `${Math.max(0, blindaje)}%`;
        const [c1, c2] = blindaje > 60 ? ['#22c55e', '#4ade80'] : blindaje > 30 ? ['#eab308', '#facc15'] : ['#ef4444', '#f87171'];
        hud.blindajeBarra.style.background = `linear-gradient(90deg, ${c1}, ${c2})`;
        hud.blindajeValor.style.color = c2;
        hud.blindajeCaja.style.borderColor = c1;
    }

    function actualizarHUDcontinuo() {
        hud.tiempo.textContent = fmtTiempo(tiempo);
        hud.velocidad.textContent = Math.round(Math.abs(velocidad));
        hud.posicion.textContent = `${posicion()} / ${rivales.length + 1}`;
        hud.turboValor.textContent = habActiva('sobrecarga') ? '∞' : `${Math.round(energia)} %`;
        hud.turboBarra.style.width = `${habActiva('sobrecarga') ? 100 : energia}%`;
        hud.armaBarra.style.width = `${100 - limitar(recargaArma / arma.cadencia, 0, 1) * 100}%`;
        const faltan = habListaEn - tJuego;
        if (habActiva(HAB.id) && HAB.duracion > 0) {
            hud.habCaja.className = 'caja-equipo activa';
            hud.habEstado.textContent = `Activa · ${Math.ceil(habActivaHasta - tJuego)} s`;
            hud.habEstado.style.color = 'var(--dorado)';
            hud.habBarra.style.width = `${(habActivaHasta - tJuego) / HAB.duracion * 100}%`;
        } else if (faltan > 0) {
            hud.habCaja.className = 'caja-equipo';
            hud.habEstado.textContent = `Recargando · ${Math.ceil(faltan)} s`;
            hud.habEstado.style.color = 'var(--texto-tenue)';
            hud.habBarra.style.width = `${(1 - faltan / HAB.recarga) * 100}%`;
        } else {
            hud.habCaja.className = 'caja-equipo lista';
            hud.habEstado.textContent = 'Lista · pulsa E';
            hud.habEstado.style.color = 'var(--verde)';
            hud.habBarra.style.width = '100%';
        }
    }

    function destelloDano() {
        const d = $('destello-dano');
        d.style.opacity = '1';
        setTimeout(() => { d.style.opacity = '0'; }, 180);
    }

    function recibirDano(cantidad, motivo) {
        if (invulnerable > 0 || habActiva('escudo') || terminada) return false;
        blindaje = Math.max(0, blindaje - cantidad * datosVeh.resistencia);
        Sonido.dano();
        destelloDano();
        chispazo(auto.position);
        actualizarHUD();
        if (blindaje <= 0) terminarCarrera('destruido', motivo);
        return true;
    }

    // ══════════ Inicio / reinicio ══════════
    // Parrilla: dos filas detrás de la meta
    const PARRILLA = [{ s: -10, l: 0.45 }, { s: -10, l: -0.45 }, { s: -21, l: 0.45 }, { s: -21, l: -0.45 }];

    function iniciarCarrera() {
        clearInterval(cuentaTimer);
        $('panel-resultados').classList.remove('visible');
        $('panel-pausa').classList.remove('visible');
        $('aviso-pista').style.display = 'none';

        carreraActiva = false; pausada = false; terminada = false; volviendo = false; disparando = false;
        tJuego = 0; tiempo = 0;
        velocidad = 0; blindaje = 100; energia = 100; invulnerable = 0;
        y = 0; vy = 0; enAire = false; cayendo = false;
        impulsoHasta = 0; recargaArma = 0; habListaEn = 0; habActivaHasta = 0;
        rivalesDestruidos = 0; vueltasHechas = 0;

        balas.splice(0).forEach(b => scene.remove(b));
        balasRivales.splice(0).forEach(b => scene.remove(b));
        particulas.clear();
        objetos.forEach(o => { o.activo = true; o.mesh.visible = true; });

        // Jugador en la segunda fila
        const sJ = PARRILLA[3].s;
        prog = sJ; idx = mod(Math.round(sJ), N); progSeguro = prog; idxSeguro = idx;
        const { pos, tan: t } = puntoEn(sJ, PARRILLA[3].l * MITAD);
        auto.position.copy(pos);
        auto.rotation.set(0, rumbo(t), 0);
        auto.visible = true;
        escudo.visible = false;

        rivales.forEach((r, k) => {
            const slot = PARRILLA[k];
            r.vivo = true; r.salud = 100; r.vel = 0; r.s = slot.s; r.lado = slot.l * MITAD;
            r.carrilBase = r.carril * (MITAD - 2.5);
            r.empHasta = 0; r.ultimoPico = -9; r.proximoDisparo = 4 + Math.random() * 3; r.y = 0; r.vy = 0;
            r.mesh.visible = true; r.barra.visible = true;
            r.vida.scale.x = 1;
            r.vida.material.color.setHex(0x22c55e);
            colocarRival(r);
        });

        colocarCamara(true);
        actualizarHUD();
        actualizarHUDcontinuo();
        cuentaRegresiva();
    }

    function colocarRival(r) {
        const { pos, tan: t } = puntoEn(r.s, r.lado);
        r.mesh.position.copy(pos).setY(r.y);
        r.mesh.rotation.set(0, rumbo(t), 0);
    }

    function cuentaRegresiva() {
        let n = 3;
        const capa = $('cuenta-regresiva'), num = $('cuenta-numero');
        capa.classList.add('visible');
        num.textContent = '3';
        num.style.color = 'var(--cian)';
        Sonido.pitido(440);
        cuentaTimer = setInterval(() => {
            if (pausada) return;
            n--;
            if (n > 0) { num.textContent = n; Sonido.pitido(440); }
            else if (n === 0) {
                num.textContent = '¡YA!';
                num.style.color = '#22c55e';
                Sonido.pitido(880, 0.4);
                carreraActiva = true;
            } else {
                clearInterval(cuentaTimer);
                capa.classList.remove('visible');
            }
        }, 1000);
    }

    function volverAPista() {
        if (volviendo || terminada) return;
        volviendo = true;
        $('aviso-pista').style.display = 'block';
        velocidad = 0;
        setTimeout(() => {
            const { pos, tan: t } = puntoEn(idxSeguro, 0);
            auto.position.copy(pos);
            auto.rotation.set(0, rumbo(t), 0);
            idx = idxSeguro; prog = progSeguro;
            y = 0; vy = 0; enAire = false; cayendo = false;
            velocidad = 0;
            invulnerable = 1.5;
            $('aviso-pista').style.display = 'none';
            volviendo = false;
        }, 700);
    }

    // ══════════ Armas y habilidades ══════════
    function objetivoMasCercano(desde, direccion, rango = 90) {
        let mejor = null, dMejor = rango;
        rivales.forEach(r => {
            if (!r.vivo) return;
            const v = r.mesh.position.clone().sub(desde);
            const d = v.length();
            if (d < dMejor && v.normalize().dot(direccion) > 0.35) { mejor = r; dMejor = d; }
        });
        return mejor;
    }

    function disparar() {
        if (!carreraActiva || pausada || terminada || volviendo || recargaArma > 0) return;
        recargaArma = arma.cadencia;
        Sonido.tono(arma.sonido);
        let ang = auto.rotation.y + (arma.dispersion ? (Math.random() - 0.5) * 2 * arma.dispersion : 0);
        const frente = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
        const b = new THREE.Mesh(geoBala, matBala);
        b.position.copy(auto.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(frente, 3);
        b.vel = frente.multiplyScalar(arma.velocidad + Math.max(0, velocidad) * 0.35);
        b.rotation.y = ang;
        b.vida = arma.guiado ? 3.0 : 1.6;
        b.guiado = arma.guiado || habActiva('punteria');
        scene.add(b);
        balas.push(b);
    }

    function usarHabilidad() {
        if (!carreraActiva || pausada || terminada) return;
        if (tJuego < habListaEn) {
            aviso(`${HAB.nombre} se está recargando: faltan ${Math.ceil(habListaEn - tJuego)} s.`, 'error', 1500);
            return;
        }
        habListaEn = tJuego + HAB.recarga;
        habActivaHasta = tJuego + HAB.duracion;
        Sonido.habilidad();
        if (HAB.id === 'sobrecarga') energia = 100;
        if (HAB.id === 'reparacion') {
            blindaje = Math.min(100, blindaje + 40);
            chispazo(auto.position, [0x22c55e, 0x86efac]);
            actualizarHUD();
        }
        aviso(`${piloto.nombre}: ¡${HAB.nombre}!`, 'exito', 1600);
    }

    function danarRival(r, cantidad, emp = 0) {
        if (!r.vivo) return;
        r.salud = Math.max(0, r.salud - cantidad);
        r.vida.scale.x = Math.max(0.001, r.salud / 100);
        if (r.salud < 40) r.vida.material.color.setHex(0xef4444);
        else if (r.salud < 70) r.vida.material.color.setHex(0xeab308);
        if (emp) { r.empHasta = tJuego + emp; chispazo(r.mesh.position, [0x38bdf8, 0xffffff]); }
        if (r.salud <= 0) {
            r.vivo = false;
            r.mesh.visible = false;
            r.barra.visible = false;
            explosion(r.mesh.position);
            rivalesDestruidos++;
            aviso(`¡${r.nombre} destruido! +${REGLAS_CARRERA.premioPorRival} 💎 al terminar`, 'exito', 1800);
            actualizarHUD();
        }
    }

    // ══════════ Pausa ══════════
    function pausar() {
        if (terminada || pausada) return;
        pausada = true;
        disparando = false;
        $('pausa-resumen').textContent = `${circuito.nombre} · Vuelta ${limitar(vueltasHechas + 1, 1, VUELTAS)} de ${VUELTAS} · Posición ${posicion()} · ${fmtTiempo(tiempo)}`;
        $('controles-pausa').classList.remove('visible');
        $('panel-pausa').classList.add('visible');
        $('btn-continuar').focus();
        Sonido.clic();
    }
    function continuar() {
        if (!pausada) return;
        pausada = false;
        $('panel-pausa').classList.remove('visible');
        Object.keys(teclas).forEach(k => teclas[k] = false);
        Sonido.clic();
    }

    $('btn-pausa').addEventListener('click', pausar);
    $('btn-continuar').addEventListener('click', continuar);
    $('btn-reiniciar-pausa').addEventListener('click', async () => {
        const ok = await confirmar({ titulo: '¿Reiniciar carrera?', mensaje: 'Empezarás de nuevo desde la vuelta 1. Se perderá el progreso de esta carrera.', aceptar: 'Reiniciar', peligro: true });
        if (ok) iniciarCarrera();
    });
    $('btn-abandonar').addEventListener('click', async () => {
        const ok = await confirmar({ titulo: '¿Volver al menú?', mensaje: 'Abandonarás la carrera y no recibirás diamantes.', aceptar: 'Volver al menú', cancelar: 'Seguir en la carrera', peligro: true });
        if (ok) navegar('menu.html');
    });
    $('controles-pausa').innerHTML = CONTROLES.slice(0, 3).flatMap(g => g.filas).map(f =>
        `<div class="fila"><span>${f.accion}</span><span>${f.teclas.map(t => `<kbd>${t}</kbd>`).join(' ')}</span></div>`).join('');
    $('btn-ver-controles').addEventListener('click', () => { Sonido.clic(); $('controles-pausa').classList.toggle('visible'); });
    $('btn-reiniciar').addEventListener('click', () => { Sonido.clic(); iniciarCarrera(); });

    window.addEventListener('blur', () => { if (carreraActiva) pausar(); });

    // ══════════ Fin de la carrera ══════════
    function terminarCarrera(tipo, motivo) {
        if (terminada) return;
        terminada = true;
        carreraActiva = false;
        disparando = false;
        velocidad = 0;
        const pos = posicion();

        const textos = {
            victoria:  { emblema: '🏆', titulo: '¡Victoria!',         color: '#22c55e', posicion: '1.º',        sub: `Completaste las ${VUELTAS} vueltas en primer lugar.` },
            derrota:   { emblema: '❌', titulo: 'Derrota',            color: '#ef4444', posicion: `${Math.max(2, pos)}.º`, sub: `${motivo || 'Un rival'} completó las ${VUELTAS} vueltas antes que tú.` },
            destruido: { emblema: '💥', titulo: 'Vehículo destruido', color: '#ef4444', posicion: 'Fuera',      sub: `Tu blindaje llegó a 0 % (${motivo || 'impactos'}).` }
        }[tipo];

        const premio = (tipo === 'victoria' ? REGLAS_CARRERA.premioVictoria : 0) + rivalesDestruidos * REGLAS_CARRERA.premioPorRival;
        if (premio > 0) Estado.set('diamantes', Estado.get('diamantes') + premio);

        $('res-emblema').textContent = textos.emblema;
        $('res-titulo').textContent = textos.titulo;
        $('res-titulo').style.color = textos.color;
        $('res-subtitulo').textContent = textos.sub;
        $('res-posicion').textContent = textos.posicion;
        $('res-posicion').style.color = textos.color;
        $('res-vueltas').textContent = `${tipo === 'victoria' ? VUELTAS : Math.min(VUELTAS, vueltasHechas)} / ${VUELTAS}`;
        $('res-rivales').textContent = rivalesDestruidos;
        $('res-tiempo').textContent = fmtTiempo(tiempo);
        $('res-premio').textContent = premio > 0 ? `+${formato(premio)} 💎 ganados` : 'Sin diamantes esta vez';

        $('panel-resultados').classList.add('visible');
        $('btn-reiniciar').focus();
        tipo === 'victoria' ? Sonido.victoria() : Sonido.explosion();
        if (tipo === 'destruido') { explosion(auto.position); auto.visible = false; }
    }

    // ══════════ Teclado y ratón ══════════
    window.addEventListener('keydown', e => {
        if (document.querySelector('.capa-dialogo')) return;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (terminada) return;
            pausada ? continuar() : pausar();
            return;
        }
        if (pausada) return;
        teclas[e.code] = true;
        if (e.code === 'KeyR' && carreraActiva) volverAPista();
        if (e.code === 'KeyE' && !e.repeat) usarHabilidad();
    });
    window.addEventListener('keyup', e => { teclas[e.code] = false; });
    renderer.domElement.addEventListener('pointerdown', e => { if (e.button === 0) disparando = true; });
    window.addEventListener('pointerup', () => { disparando = false; });

    // ══════════ Radar ══════════
    const radar = $('radar').getContext('2d');
    const limites = pts.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), z0: Math.min(b.z0, p.z), z1: Math.max(b.z1, p.z) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
    const escalaRadar = Math.min(146 / (limites.x1 - limites.x0), 96 / (limites.z1 - limites.z0));
    const aRadar = p => [80 + (p.x - (limites.x0 + limites.x1) / 2) * escalaRadar, 55 + (p.z - (limites.z0 + limites.z1) / 2) * escalaRadar];
    const colorCSS = n => '#' + n.toString(16).padStart(6, '0');

    function dibujarRadar() {
        radar.clearRect(0, 0, 160, 110);
        radar.lineJoin = 'round';
        radar.beginPath();
        pts.forEach((p, i) => { const [x, z] = aRadar(p); i ? radar.lineTo(x, z) : radar.moveTo(x, z); });
        radar.closePath();
        radar.strokeStyle = colorCSS(P.colores.borde1) + '88';
        radar.lineWidth = Math.max(5, P.ancho * escalaRadar);
        radar.stroke();
        const [mx, mz] = aRadar(pts[0]);
        radar.fillStyle = '#fff';
        radar.fillRect(mx - 2, mz - 2, 4, 4);
        const punto = (pos, r, color) => {
            const [x, z] = aRadar(pos);
            radar.fillStyle = color;
            radar.beginPath(); radar.arc(x, z, r, 0, Math.PI * 2); radar.fill();
        };
        picos.forEach(p => punto(p.pos, 1.8, '#f97316'));
        objetos.forEach(o => o.activo && punto(o.pos, 1.8, o.tipo === 'turbo' ? '#38bdf8' : '#22c55e'));
        rivales.forEach(r => r.vivo && punto(r.mesh.position, 3.2, colorCSS(r.color)));
        punto(auto.position, 4.2, '#ffffff');
        radar.strokeStyle = '#000';
        radar.lineWidth = 1.2;
        radar.stroke();
    }

    // ══════════ Cámara ══════════
    function colocarCamara(inmediato) {
        const turboVisible = (teclas['Space'] && energia > 0) || tJuego < impulsoHasta;
        const fx = Math.sin(auto.rotation.y), fz = Math.cos(auto.rotation.y);
        const dist = turboVisible ? 9 : 7.6;
        const destino = new THREE.Vector3(auto.position.x - fx * dist, auto.position.y + 3.2, auto.position.z - fz * dist);
        if (inmediato) camera.position.copy(destino); else camera.position.lerp(destino, 0.14);
        camera.lookAt(auto.position.x + fx * 6, auto.position.y + 0.9, auto.position.z + fz * 6);
        camera.fov = THREE.MathUtils.lerp(camera.fov, turboVisible ? 60 : (velocidad > 110 ? 51 : 46), inmediato ? 1 : 0.08);
        camera.updateProjectionMatrix();
        sol.position.copy(auto.position).add(new THREE.Vector3(20, 40, 15));
        sol.target.position.copy(auto.position);
    }

    // Cruce de una marca de la pista (rampa, acelerador) al avanzar de a → b
    const cruza = (a, b, i) => b > a && Math.floor((a - i) / N) < Math.floor((b - i) / N);

    // ══════════ Bucle principal ══════════
    const reloj = new THREE.Clock();

    function animar() {
        requestAnimationFrame(animar);
        const dt = Math.min(reloj.getDelta(), 0.05);
        const tReal = reloj.elapsedTime;

        // Animaciones del escenario (siempre)
        objetos.forEach(o => { o.mesh.rotation.y += dt * 2; o.mesh.position.y = 1.4 + Math.sin(tReal * 3 + o.pos.x) * 0.25; });
        picos.forEach(p => { p.mesh.baliza.material.color.setHex(Math.sin(tReal * 8) > 0 ? 0xff0033 : 0x550011); });
        decorGiratorio.forEach(m => { m.rotation.y += dt * m.userData.gira; });
        rivales.forEach(r => { r.barra.position.copy(r.mesh.position).setY(r.mesh.position.y + 2.9); r.barra.quaternion.copy(camera.quaternion); });

        if (!pausada) {
            tJuego += dt;
            if (invulnerable > 0) {
                invulnerable -= dt;
                auto.visible = terminada ? auto.visible : Math.floor(tReal * 20) % 2 === 0;
            } else if (!terminada) auto.visible = true;
            escudo.visible = habActiva('escudo');
            if (escudo.visible) escudo.material.opacity = 0.18 + Math.sin(tReal * 10) * 0.06;
            recargaArma = Math.max(0, recargaArma - dt);

            if (carreraActiva && !volviendo) actualizarJugador(dt);
            if (carreraActiva) actualizarRivales(dt);
            actualizarBalas(dt);

            // Objetos reaparecen
            objetos.forEach(o => { if (!o.activo && tJuego > o.vuelve) { o.activo = true; o.mesh.visible = true; } });

            // Partículas
            for (let i = particulas.children.length - 1; i >= 0; i--) {
                const pt = particulas.children[i];
                pt.position.addScaledVector(pt.vel, dt);
                pt.vel.y -= 20 * dt;
                pt.vida -= dt;
                pt.scale.multiplyScalar(0.96);
                if (pt.vida <= 0) particulas.remove(pt);
            }

            if (!terminada) colocarCamara(false);
            dibujarRadar();
            actualizarHUDcontinuo();
        }

        renderer.render(scene, camera);
    }

    function actualizarJugador(dt) {
        tiempo += dt;
        const sobrecarga = habActiva('sobrecarga');
        const quiereTurbo = teclas['Space'] === true;
        const turbo = quiereTurbo && (energia > 0 || sobrecarga);
        if (turbo && !sobrecarga) energia = Math.max(0, energia - 26 * dt);
        if (!quiereTurbo) energia = Math.min(100, energia + 6 * dt);
        const impulso = tJuego < impulsoHasta;

        let vmax = datosVeh.vmax;
        if (turbo) vmax += sobrecarga ? 140 : 95;
        if (impulso) vmax += 90;
        const acel = datosVeh.acel * (turbo ? 1.7 : 1) + (impulso ? 220 : 0);

        if (teclas['KeyW'] || teclas['ArrowUp']) {
            if (velocidad < vmax) velocidad = Math.min(vmax, velocidad + acel * dt);
        } else if (teclas['KeyS'] || teclas['ArrowDown']) {
            velocidad = velocidad > 0 ? Math.max(0, velocidad - 140 * dt) : Math.max(-50, velocidad - datosVeh.acel * 0.7 * dt);
        } else {
            if (velocidad > 0) velocidad = Math.max(0, velocidad - 22 * dt);
            else if (velocidad < 0) velocidad = Math.min(0, velocidad + 22 * dt);
        }
        if (velocidad > vmax) velocidad = Math.max(vmax, velocidad - 70 * dt);

        // Dirección: gira menos a mucha velocidad y casi nada en el aire
        let giro = 0;
        if (teclas['KeyA'] || teclas['ArrowLeft']) giro += 1;
        if (teclas['KeyD'] || teclas['ArrowRight']) giro -= 1;
        const agarre = enAire ? 0.25 : 1 - limitar((Math.abs(velocidad) - 150) / 300, 0, 0.35);
        if (giro !== 0 && Math.abs(velocidad) > 0.5) {
            auto.rotation.y += giro * datosVeh.giro * agarre * (velocidad >= 0 ? 1 : -1) * dt;
            auto.rotation.z = THREE.MathUtils.lerp(auto.rotation.z, -giro * 0.08, 0.15);
        } else auto.rotation.z = THREE.MathUtils.lerp(auto.rotation.z, 0, 0.15);
        auto.delanteras.forEach(r => { r.rotation.y = THREE.MathUtils.lerp(r.rotation.y, giro * 0.4, 0.2); });

        const paso = velocidad * 0.35 * dt;
        auto.position.x += Math.sin(auto.rotation.y) * paso;
        auto.position.z += Math.cos(auto.rotation.y) * paso;

        // Posición sobre la pista (búsqueda local alrededor del último punto)
        let mejor = idx, dMejor = Infinity;
        for (let k = -30; k <= 30; k++) {
            const i = mod(idx + k, N);
            const d = (pts[i].x - auto.position.x) ** 2 + (pts[i].z - auto.position.z) ** 2;
            if (d < dMejor) { dMejor = d; mejor = i; }
        }
        let delta = mejor - idx;
        if (delta > N / 2) delta -= N;
        if (delta < -N / 2) delta += N;
        const progAnterior = prog;
        prog += delta;
        idx = mejor;
        const lateral = auto.position.clone().sub(pts[idx]).dot(nor[idx]);

        // Altura: saltos y caída fuera de la pista
        if (enAire) {
            vy -= 26 * dt;
            y += vy * dt;
            if (y <= 0) {
                y = 0; vy = 0; enAire = false;
                Sonido.aterrizar();
                chispazo(auto.position, [0x94a3b8, 0xfacc15]);
            }
        }
        const fuera = Math.abs(lateral) > MITAD + 0.9;
        if (!enAire && (fuera || cayendo)) {
            cayendo = true;
            y -= 34 * dt;
            if (y < -14) volverAPista();
        } else if (!enAire && !fuera) {
            progSeguro = prog; idxSeguro = idx;
        }
        auto.position.y = y;

        if (!cayendo) {
            // Rampas y aceleradores
            rampas.forEach(i => {
                if (cruza(progAnterior, prog, i) && !enAire) {
                    enAire = true;
                    vy = 9 + Math.max(0, velocidad) * 0.035;
                    Sonido.salto();
                }
            });
            aceleradores.forEach(i => {
                if (cruza(progAnterior, prog, i)) {
                    impulsoHasta = tJuego + 1.4;
                    velocidad = Math.max(velocidad, datosVeh.vmax + 40);
                    Sonido.acelerador();
                }
            });

            // Choques con cajas
            obstaculos.forEach(o => {
                const d = Math.hypot(auto.position.x - o.pos.x, auto.position.z - o.pos.z);
                if (d < o.radio + 1.2 && y < 2) {
                    velocidad = -velocidad * 0.35;
                    Sonido.impacto();
                    const empuje = auto.position.clone().sub(o.pos).setY(0).normalize();
                    auto.position.addScaledVector(empuje, o.radio + 1.25 - d);
                    if (Math.abs(velocidad) > 25) recibirDano(6, 'choque con una caja');
                }
            });

            // Choques con rivales
            rivales.forEach(r => {
                if (!r.vivo) return;
                const sep = auto.position.clone().sub(r.mesh.position).setY(0);
                const d = sep.length();
                if (d < 3.2) {
                    // Separar sobre todo de lado para que nadie quede atascado
                    const n = nor[idx];
                    const deLado = sep.dot(n) >= 0 ? 1 : -1;
                    auto.position.addScaledVector(n, deLado * (3.2 - d) * 0.7);
                    auto.position.addScaledVector(sep.normalize(), (3.2 - d) * 0.3);
                    r.lado = limitar(r.lado - deLado * 0.6, -(MITAD - 1.2), MITAD - 1.2);
                    if (!r.ultimoChoque || tJuego - r.ultimoChoque > 0.5) {
                        r.ultimoChoque = tJuego;
                        velocidad *= 0.85;
                        r.vel *= 0.85;
                        Sonido.impacto();
                        chispazo(auto.position.clone().lerp(r.mesh.position, 0.5), [0xffffff, 0xfacc15]);
                    }
                }
            });

            // Picos
            if (y < 1) {
                const pico = picos.find(p => Math.hypot(auto.position.x - p.pos.x, auto.position.z - p.pos.z) < p.radio);
                if (pico && recibirDano(22, 'picos')) {
                    invulnerable = 0.9;
                    velocidad *= 0.4;
                }
            }

            // Objetos
            objetos.forEach(o => {
                if (!o.activo) return;
                if (Math.hypot(auto.position.x - o.pos.x, auto.position.z - o.pos.z) < 2.6) {
                    o.activo = false;
                    o.mesh.visible = false;
                    o.vuelve = tJuego + 10;
                    Sonido.recoger();
                    if (o.tipo === 'turbo') {
                        energia = Math.min(100, energia + 50);
                        aviso('⚡ Turbo +50 %', 'info', 1000);
                    } else {
                        blindaje = Math.min(100, blindaje + 30);
                        actualizarHUD();
                        aviso('🔧 Blindaje +30 %', 'exito', 1000);
                    }
                }
            });
        }

        // Vueltas
        const completas = Math.floor(prog / N);
        if (completas > vueltasHechas) {
            vueltasHechas = completas;
            if (vueltasHechas >= VUELTAS) { terminarCarrera('victoria'); return; }
            actualizarHUD();
            aviso(vueltasHechas === VUELTAS - 1 ? '🏁 ¡Última vuelta!' : `Vuelta ${vueltasHechas + 1} de ${VUELTAS}`, 'info', 1500);
        }

        // Disparo continuo
        if (disparando || teclas['KeyF']) disparar();

        // Ruedas y propulsores
        auto.ruedas.forEach(w => { w.rotation.x += velocidad * 0.12 * dt; });
        const fuego = turbo || impulso;
        auto.propulsores.forEach(j => {
            j.material.opacity = fuego && velocidad > 20 ? 1 : (velocidad > 60 ? 0.35 : 0);
            j.material.color.setHex(sobrecarga ? 0xfacc15 : 0x38bdf8);
            j.scale.set(fuego ? 1.6 : 1, fuego ? 1.6 : 1, fuego ? 3.0 : (velocidad > 60 ? 1.4 : 1));
        });
    }

    function actualizarRivales(dt) {
        rivales.forEach(r => {
            if (!r.vivo) return;
            const i = mod(Math.floor(r.s), N);

            // Velocidad: más lenta en curvas, ajuste según la distancia con el jugador, EMP
            let objetivo = r.base * P.velRivales * (1 - Math.min(0.32, curva[i] * 0.55));
            const diferencia = (prog - r.s) / N;
            objetivo *= 1 + limitar(diferencia * 0.5, -0.14, 0.2);
            if (tJuego < r.empHasta) objetivo *= 0.45;
            r.vel += limitar(objetivo - r.vel, -45 * dt, 14 * dt);
            const sAnterior = r.s;
            r.s += (r.vel * dt) / LARGO_MUESTRA;

            // Carril: esquiva picos y cajas que vienen adelante
            let carrilObjetivo = r.carrilBase;
            [...picos, ...obstaculos].forEach(o => {
                const adelante = mod(o.i - r.s, N);
                if (adelante < 34 && Math.abs(carrilObjetivo - o.lado) < 3.6) {
                    carrilObjetivo = o.lado + (r.lado >= o.lado ? 4.2 : -4.2);
                }
            });
            carrilObjetivo = limitar(carrilObjetivo, -(MITAD - 1.6), MITAD - 1.6);
            r.lado = THREE.MathUtils.lerp(r.lado, carrilObjetivo, Math.min(1, 2.4 * dt));

            // Saltos
            rampas.forEach(ri => { if (cruza(sAnterior, r.s, ri) && r.y <= 0) r.vy = 8.5; });
            if (r.y > 0 || r.vy > 0) {
                r.vy -= 26 * dt;
                r.y = Math.max(0, r.y + r.vy * dt);
                if (r.y === 0) r.vy = 0;
            }

            colocarRival(r);
            r.mesh.ruedas.forEach(w => { w.rotation.x += r.vel * 0.35 * dt; });

            // Picos
            if (r.y < 1 && tJuego - r.ultimoPico > 1.0) {
                const p = picos.find(p => r.mesh.position.distanceTo(p.pos) < p.radio);
                if (p) {
                    r.ultimoPico = tJuego;
                    r.vel *= 0.5;
                    chispazo(r.mesh.position);
                    danarRival(r, 25);
                }
            }

            // ¿Ganó el rival?
            if (r.s >= VUELTAS * N && !terminada) terminarCarrera('derrota', r.nombre);

            // Disparan si te tienen delante
            if (tJuego > r.proximoDisparo && !terminada) {
                const hacia = auto.position.clone().sub(r.mesh.position);
                const d = hacia.length();
                const frente = new THREE.Vector3(Math.sin(r.mesh.rotation.y), 0, Math.cos(r.mesh.rotation.y));
                if (d < 55 && hacia.clone().normalize().dot(frente) > 0.88) {
                    const b = new THREE.Mesh(geoBalaRival, matBalaRival);
                    b.position.copy(r.mesh.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(frente, 2.8);
                    b.vel = hacia.setY(0).normalize().multiplyScalar(95);
                    b.vida = 1.4;
                    scene.add(b);
                    balasRivales.push(b);
                    Sonido.tono({ tipo: 'square', desde: 400, hasta: 120, volumen: 0.04, duracion: 0.1 });
                    r.proximoDisparo = tJuego + 2.2 + Math.random() * 2.5;
                } else r.proximoDisparo = tJuego + 0.3;
            }
        });
    }

    function actualizarBalas(dt) {
        for (let i = balas.length - 1; i >= 0; i--) {
            const b = balas[i];
            if (b.guiado) {
                const dir = b.vel.clone().normalize();
                const obj = objetivoMasCercano(b.position, dir, 90);
                if (obj) {
                    const deseo = obj.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)).sub(b.position).normalize();
                    const rapidez = b.vel.length();
                    b.vel.copy(dir.lerp(deseo, Math.min(1, 5 * dt)).normalize().multiplyScalar(rapidez));
                    b.rotation.y = Math.atan2(b.vel.x, b.vel.z);
                }
                if (arma.forma === 'misil' && Math.random() < 0.6) chispas(b.position.clone().add(new THREE.Vector3(0, -0.6, 0)), 1, [0xf97316, 0x9ca3af], 0.15, 0.3, 2);
            }
            b.position.addScaledVector(b.vel, dt);
            b.vida -= dt;
            for (const r of rivales) {
                if (r.vivo && b.vida > 0 && b.position.distanceTo(r.mesh.position) < 2.7) {
                    b.vida = 0;
                    chispazo(b.position, [arma.color, 0xffffff]);
                    Sonido.impacto();
                    danarRival(r, arma.dano, arma.emp || 0);
                    break;
                }
            }
            if (b.vida <= 0) { scene.remove(b); balas.splice(i, 1); }
        }

        for (let i = balasRivales.length - 1; i >= 0; i--) {
            const b = balasRivales[i];
            b.position.addScaledVector(b.vel, dt);
            b.vida -= dt;
            if (b.vida > 0 && !terminada && b.position.distanceTo(auto.position) < 2.4) {
                b.vida = 0;
                if (habActiva('escudo')) chispazo(b.position, [0x38bdf8, 0xffffff]);
                else recibirDano(7, 'disparos de los rivales');
            }
            if (b.vida <= 0) { scene.remove(b); balasRivales.splice(i, 1); }
        }
    }

    animar();
    iniciarCarrera();
}
