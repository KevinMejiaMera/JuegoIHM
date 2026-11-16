// ══════════════════════════════════════════════════════════════
// Carrera para 1 o 2 jugadores (pantalla dividida).
// Pista según el circuito, rivales con IA, armas, habilidades de
// piloto, objetos, pausa y resultados.
// ══════════════════════════════════════════════════════════════

if (verificarMotor3D()) iniciarJuego();

function iniciarJuego() {
    const VUELTAS = REGLAS_CARRERA.vueltas;
    const params = new URLSearchParams(location.search);
    const elegido = params.get('circuito');
    if (elegido && CIRCUITOS.some(c => c.id === elegido)) Estado.set('circuito', elegido);
    const MODO = params.get('modo') === '2' ? 2 : 1;
    document.body.classList.add(`modo-${MODO}`);

    const circuito = buscarPor(CIRCUITOS, Estado.get('circuito'));
    const P = circuito.pista;

    const $ = id => document.getElementById(id);
    const mod = (a, n) => ((a % n) + n) % n;
    const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
    const colorCSS = n => '#' + new THREE.Color(n).getHexString();

    // ══════════ Pista en coordenadas del mundo ══════════
    const N = 720;
    const muestra = muestrearPista(circuito, N);
    const E = ESCALA_PISTA;
    const pts = muestra.puntos.map(([x, y]) => new THREE.Vector3((x - 100) * E, 0, (y - 50) * E));
    const tan = pts.map((p, i) => pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize());
    const nor = tan.map(t => new THREE.Vector3(-t.z, 0, t.x));
    const curva = tan.map((t, i) => Math.acos(limitar(t.dot(tan[(i + 14) % N]), -1, 1)));
    const LARGO_MUESTRA = (muestra.longitud * E) / N;
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
    if (MODO === 2) renderer.setPixelRatio(1);
    scene.fog = new THREE.FogExp2(P.colores.niebla, 0.0065);
    scene.add(new THREE.AmbientLight(0x3a3060, 1.6));
    scene.add(new THREE.HemisphereLight(0x9d8cff, 0x0a0614, 0.7));
    const sol = new THREE.DirectionalLight(0xffffff, 1.3);
    sol.position.set(20, 60, 15);
    scene.add(sol);
    crearEstrellas(scene, 260);

    const rejilla = new THREE.GridHelper(700, 70, P.colores.borde1, 0x1e1b3a);
    rejilla.position.y = -40;
    rejilla.material.transparent = true;
    rejilla.material.opacity = 0.35;
    scene.add(rejilla);

    const obstaculos = [];
    const picos = [];
    const objetos = [];
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
        cinta(-MITAD - 0.7, MITAD + 0.7, -0.6, new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1 }));

        const matLinea = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
        for (let i = 0; i < N; i += 10) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, LARGO_MUESTRA * 5), matLinea);
            l.position.copy(pts[i]).setY(0.02);
            orientar(l, i);
            scene.add(l);
        }

        const matRojo = new THREE.MeshBasicMaterial({ color: 0xef4444 }), matBlanco = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        let alterno = 0;
        for (let i = 0; i < N; i += 3) {
            if (curva[i] < 0.35) continue;
            const dentro = tan[i].clone().cross(tan[(i + 10) % N]).y > 0 ? 1 : -1;
            const piano = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, LARGO_MUESTRA * 3), alterno++ % 2 ? matRojo : matBlanco);
            piano.position.copy(pts[i]).addScaledVector(nor[i], dentro * (MITAD - 0.6)).setY(0.04);
            orientar(piano, i);
            scene.add(piano);
        }

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

        // Cajas de carga
        const matCaja = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.6, roughness: 0.5 });
        const matBordeCaja = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        P.cajas.forEach(cfg => {
            const i = idxDe(cfg.f), lado = ladoDe(cfg.lado);
            const { pos } = puntoEn(i, lado);
            const c = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), matCaja);
            c.position.copy(pos).setY(1.2);
            orientar(c, i);
            c.add(new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.25, 2.45), matBordeCaja));
            scene.add(c);
            obstaculos.push({ pos, radio: 2.4, i, lado });
        });

        // Rampas
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

        // Aceleradores
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
            g.add(new THREE.Mesh(new THREE.TorusGeometry(MITAD + 0.5, 0.3, 8, 40, Math.PI), new THREE.MeshBasicMaterial({ color: 0xec4899 })));
            scene.add(g);
        });

        // Objetos: turbo y reparación
        P.objetos.forEach(cfg => {
            const i = idxDe(cfg.f), lado = ladoDe(cfg.lado);
            const { pos } = puntoEn(i, lado);
            let mesh;
            if (cfg.tipo === 'turbo') {
                mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }));
                mesh.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })));
            } else {
                mesh = new THREE.Group();
                const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
                mesh.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), mat));
                mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), mat));
                mesh.add(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })));
            }
            mesh.position.copy(pos).setY(1.4);
            scene.add(mesh);
            objetos.push({ mesh, pos, tipo: cfg.tipo, activo: true, vuelve: 0 });
        });
    }

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
                const alto = 8 + Math.random() * 28, an = 4 + Math.random() * 5, pr = 4 + Math.random() * 5;
                m = new THREE.Mesh(new THREE.BoxGeometry(an, alto, pr),
                    new THREE.MeshStandardMaterial({ color: 0x120e24, emissive: k % 2 ? 0x2a0f4a : 0x0b2540, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.4 }));
                m.position.set(p.x, alto / 2 - 6, p.z);
                const techo = new THREE.Mesh(new THREE.BoxGeometry(an + 0.2, 0.3, pr + 0.2), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xa855f7 : 0x38bdf8 }));
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
                decorGiratorio.push(m);
                m.userData.gira = 0.2 + Math.random() * 0.6;
            } else {
                m = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 7), new THREE.MeshStandardMaterial({ color: [0x14532d, 0x7c2d12, 0x1e3a8a, 0x3f3f46][k % 4], metalness: 0.5, roughness: 0.6 }));
                m.position.set(p.x, 1.5 + (k % 3 === 0 ? 3 : 0), p.z);
                m.rotation.y = Math.random() * Math.PI;
            }
            scene.add(m);
        });
    }

    // ══════════ Jugadores ══════════
    // Teclas de cada jugador (e.code)
    const TECLAS = {
        solo: {
            acelerar: ['KeyW', 'ArrowUp'], frenar: ['KeyS', 'ArrowDown'], izquierda: ['KeyA', 'ArrowLeft'], derecha: ['KeyD', 'ArrowRight'],
            turbo: ['Space', 'ShiftLeft'], disparar: ['KeyF'], habilidad: ['KeyE'], pista: ['KeyR'],
            nombres: { disparar: 'F', habilidad: 'E', resumen: 'WASD / Flechas' }
        },
        j1: {
            acelerar: ['KeyW'], frenar: ['KeyS'], izquierda: ['KeyA'], derecha: ['KeyD'],
            turbo: ['Space', 'ShiftLeft'], disparar: ['KeyF'], habilidad: ['KeyE'], pista: ['KeyR'],
            nombres: { disparar: 'F', habilidad: 'E', resumen: 'WASD' }
        },
        j2: {
            acelerar: ['ArrowUp'], frenar: ['ArrowDown'], izquierda: ['ArrowLeft'], derecha: ['ArrowRight'],
            turbo: ['ShiftRight'], disparar: ['ControlRight', 'Numpad0', 'Period'], habilidad: ['Enter', 'NumpadEnter'], pista: ['Backspace'],
            nombres: { disparar: 'Ctrl der.', habilidad: 'Enter', resumen: 'Flechas' }
        }
    };
    const TECLAS_JUEGO = new Set(Object.values(TECLAS).flatMap(t => Object.entries(t).filter(([k]) => k !== 'nombres').flatMap(([, v]) => v)));

    function equipoDe(n) {
        if (n === 1) return { vehiculo: Estado.get('vehiculo'), arma: Estado.get('arma'), agente: Estado.get('agente'), pintura: Estado.get('pintura') };
        return Object.assign({ vehiculo: 'hyperion', arma: 'laser', agente: 'kaelen', pintura: '#22c55e' }, Estado.get('j2', {}));
    }

    function crearJugador(n) {
        const eq = equipoDe(n);
        let datosVeh = buscarPor(VEHICULOS, eq.vehiculo);
        if (datosVeh.bloqueado) datosVeh = VEHICULOS[0];
        const arma = buscarPor(ARMAS, eq.arma);
        const piloto = buscarPor(PILOTOS, eq.agente);
        const teclas = MODO === 1 ? TECLAS.solo : TECLAS[`j${n}`];

        const auto = crearVehiculo(datosVeh.id, eq.pintura);
        scene.add(auto);
        const escudo = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, depthWrite: false }));
        escudo.position.y = 0.8;
        escudo.visible = false;
        auto.add(escudo);

        const geoBala = {
            esfera: new THREE.SphereGeometry(arma.tam, 10, 10),
            rayo: (() => { const g = new THREE.CylinderGeometry(arma.tam, arma.tam, 2.4, 6); g.rotateX(Math.PI / 2); return g; })(),
            misil: (() => { const g = new THREE.ConeGeometry(arma.tam * 1.3, 1.2, 8); g.rotateX(Math.PI / 2); return g; })()
        }[arma.forma];

        // HUD propio
        const vista = $('tpl-jugador').content.firstElementChild.cloneNode(true);
        vista.classList.add(`j${n}`);
        $('vistas').appendChild(vista);
        const hud = {};
        vista.querySelectorAll('[data-h]').forEach(el => { hud[el.dataset.h] = el; });
        hud.etiqueta.innerHTML = `JUGADOR ${n}<small>${teclas.nombres.resumen} · ${datosVeh.nombre}</small>`;
        hud.etiqueta.style.color = eq.pintura;
        hud.armaNombre.textContent = arma.nombre;
        hud.armaIcono.innerHTML = ICONOS[arma.icono];
        hud.habNombre.textContent = piloto.habilidad.nombre;
        hud.habIcono.innerHTML = ICONOS[piloto.icono];
        hud.teclaArma.textContent = teclas.nombres.disparar;
        hud.teclaHab.textContent = teclas.nombres.habilidad;

        return {
            n, nombre: MODO === 1 ? 'Tú' : `Jugador ${n}`, corto: `J${n}`,
            color: eq.pintura, datosVeh, arma, piloto, HAB: piloto.habilidad, teclas,
            auto, escudo, geoBala, matBala: new THREE.MeshBasicMaterial({ color: arma.color }),
            camara: n === 1 ? camera : new THREE.PerspectiveCamera(46, 1, 0.1, 600),
            hud, radar: hud.radar.getContext('2d')
        };
    }

    const jugadores = (MODO === 1 ? [1] : [1, 2]).map(crearJugador);

    // ══════════ Rivales ══════════
    const RIVALES = [
        { nombre: 'Hyperion cian',  tipo: 'hyperion', color: 0x38bdf8, base: 54,   carril: 0.45 },
        { nombre: 'Marauder rosa',  tipo: 'marauder', color: 0xec4899, base: 49,   carril: -0.45 },
        { nombre: 'Phantom dorado', tipo: 'phantom',  color: 0xeab308, base: 51.5, carril: 0.45 }
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
    const balas = [];          // de los jugadores { mesh, dueño }
    const balasRivales = [];
    const particulas = new THREE.Group();
    scene.add(particulas);
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

    // ══════════ Estado general ══════════
    const teclas = {};
    let carreraActiva = false, pausada = false, terminada = false;
    let tJuego = 0, tiempo = 0, cuentaTimer = null;

    const fmtTiempo = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const rivalesVivos = () => rivales.filter(r => r.vivo).length;
    const TOTAL = rivales.length + jugadores.length;
    const posicion = j => 1 + rivales.filter(r => r.vivo && r.s > j.prog).length + jugadores.filter(o => o !== j && o.prog > j.prog).length;
    const habActiva = (j, id) => j.HAB.id === id && tJuego < j.habActivaHasta;
    const pulsa = (j, accion) => j.teclas[accion].some(c => teclas[c]);
    const avisoDe = (j, msg, tipo, dur) => aviso(MODO === 2 ? `${j.corto}: ${msg}` : msg, tipo, dur);

    // ── HUD ──
    $('hud-circuito').textContent = circuito.nombre.toUpperCase();
    document.title = `Zero Horizon · ${MODO === 2 ? '2 jugadores' : 'Carrera'} · ${circuito.nombre}`;

    function actualizarHUD(j) {
        const h = j.hud;
        h.vuelta.textContent = `${limitar(j.vueltasHechas + 1, 1, VUELTAS)} / ${VUELTAS}`;
        h.blindajeValor.textContent = `${Math.round(j.blindaje)} %`;
        h.blindajeBarra.style.width = `${Math.max(0, j.blindaje)}%`;
        const [c1, c2] = j.blindaje > 60 ? ['#22c55e', '#4ade80'] : j.blindaje > 30 ? ['#eab308', '#facc15'] : ['#ef4444', '#f87171'];
        h.blindajeBarra.style.background = `linear-gradient(90deg, ${c1}, ${c2})`;
        h.blindajeValor.style.color = c2;
        h.blindajeCaja.style.borderColor = c1;
        $('hud-rivales').textContent = rivalesVivos();
    }

    function actualizarHUDcontinuo(j) {
        const h = j.hud;
        h.velocidad.textContent = Math.round(Math.abs(j.velocidad));
        h.posicion.textContent = `${posicion(j)} / ${TOTAL}`;
        const sobre = habActiva(j, 'sobrecarga');
        h.turboValor.textContent = sobre ? '∞' : `${Math.round(j.energia)} %`;
        h.turboBarra.style.width = `${sobre ? 100 : j.energia}%`;
        h.armaBarra.style.width = `${100 - limitar(j.recargaArma / j.arma.cadencia, 0, 1) * 100}%`;
        const faltan = j.habListaEn - tJuego;
        if (habActiva(j, j.HAB.id) && j.HAB.duracion > 0) {
            h.habCaja.className = 'caja-equipo activa';
            h.habEstado.textContent = `Activa · ${Math.ceil(j.habActivaHasta - tJuego)} s`;
            h.habEstado.style.color = 'var(--dorado)';
            h.habBarra.style.width = `${(j.habActivaHasta - tJuego) / j.HAB.duracion * 100}%`;
        } else if (faltan > 0) {
            h.habCaja.className = 'caja-equipo';
            h.habEstado.textContent = `Recargando · ${Math.ceil(faltan)} s`;
            h.habEstado.style.color = 'var(--texto-tenue)';
            h.habBarra.style.width = `${(1 - faltan / j.HAB.recarga) * 100}%`;
        } else {
            h.habCaja.className = 'caja-equipo lista';
            h.habEstado.textContent = `Lista · ${j.teclas.nombres.habilidad}`;
            h.habEstado.style.color = 'var(--verde)';
            h.habBarra.style.width = '100%';
        }
    }

    function mostrarAvisoPista(j, html) {
        j.hud.avisoPista.innerHTML = html;
        j.hud.avisoPista.style.display = html ? 'block' : 'none';
    }

    function destelloDano(j) {
        j.hud.destello.style.opacity = '1';
        setTimeout(() => { j.hud.destello.style.opacity = '0'; }, 180);
    }

    function recibirDano(j, cantidad, motivo) {
        if (j.invulnerable > 0 || habActiva(j, 'escudo') || terminada || j.destruido) return false;
        j.blindaje = Math.max(0, j.blindaje - cantidad * j.datosVeh.resistencia);
        Sonido.dano();
        destelloDano(j);
        chispazo(j.auto.position);
        actualizarHUD(j);
        if (j.blindaje <= 0) destruirJugador(j, motivo);
        return true;
    }

    // Con 1 jugador termina la carrera; con 2, el jugador reaparece a los 3 s
    function destruirJugador(j, motivo) {
        if (MODO === 1) { terminarCarrera({ tipo: 'destruido', motivo }); return; }
        j.destruido = true;
        j.reapareceEn = tJuego + 3;
        j.velocidad = 0;
        j.auto.visible = false;
        explosion(j.auto.position);
        mostrarAvisoPista(j, `💥 ¡Destruido!<br><small>Reapareces en 3 s (${motivo})</small>`);
        avisoDe(j, 'vehículo destruido', 'error', 1500);
    }

    // ══════════ Inicio / reinicio ══════════
    const PARRILLA = [{ s: -10, l: 0.45 }, { s: -10, l: -0.45 }, { s: -21, l: 0.45 }, { s: -21, l: -0.45 }, { s: -32, l: 0 }];
    const SLOTS = MODO === 1 ? { jugadores: [3], rivales: [0, 1, 2] } : { jugadores: [2, 3], rivales: [0, 1, 4] };

    function reiniciarJugador(j, slot) {
        Object.assign(j, {
            velocidad: 0, blindaje: 100, energia: 100, invulnerable: 0,
            y: 0, vy: 0, enAire: false, cayendo: false, volviendo: false, destruido: false, reapareceEn: 0,
            impulsoHasta: 0, empHasta: 0, recargaArma: 0, habListaEn: 0, habActivaHasta: 0,
            rivalesDestruidos: 0, vueltasHechas: 0, disparandoRaton: false
        });
        j.prog = slot.s; j.idx = mod(Math.round(slot.s), N); j.progSeguro = j.prog; j.idxSeguro = j.idx;
        const { pos, tan: t } = puntoEn(slot.s, slot.l * MITAD);
        j.auto.position.copy(pos);
        j.auto.rotation.set(0, rumbo(t), 0);
        j.auto.visible = true;
        j.escudo.visible = false;
        mostrarAvisoPista(j, '');
        colocarCamara(j, true);
        actualizarHUD(j);
        actualizarHUDcontinuo(j);
    }

    function iniciarCarrera() {
        clearInterval(cuentaTimer);
        $('panel-resultados').classList.remove('visible');
        $('panel-pausa').classList.remove('visible');
        if (document.activeElement) document.activeElement.blur();

        carreraActiva = false; pausada = false; terminada = false;
        tJuego = 0; tiempo = 0;
        Object.keys(teclas).forEach(k => teclas[k] = false);

        balas.splice(0).forEach(b => scene.remove(b));
        balasRivales.splice(0).forEach(b => scene.remove(b));
        particulas.clear();
        objetos.forEach(o => { o.activo = true; o.mesh.visible = true; });

        jugadores.forEach((j, k) => reiniciarJugador(j, PARRILLA[SLOTS.jugadores[k]]));

        rivales.forEach((r, k) => {
            const slot = PARRILLA[SLOTS.rivales[k]];
            r.vivo = true; r.salud = 100; r.vel = 0; r.s = slot.s; r.lado = slot.l * MITAD;
            r.carrilBase = r.carril * (MITAD - 2.5);
            r.empHasta = 0; r.ultimoPico = -9; r.proximoDisparo = 4 + Math.random() * 3; r.y = 0; r.vy = 0; r.ultimoChoque = 0;
            r.mesh.visible = true; r.barra.visible = true;
            r.vida.scale.x = 1;
            r.vida.material.color.setHex(0x22c55e);
            colocarRival(r);
        });

        $('hud-tiempo').textContent = '0:00';
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

    function volverAPista(j, mensaje = '⚠️ ¡Fuera de pista!<br><small>Volviendo a la pista…</small>') {
        if (j.volviendo || terminada || j.destruido) return;
        j.volviendo = true;
        mostrarAvisoPista(j, mensaje);
        j.velocidad = 0;
        setTimeout(() => {
            const { pos, tan: t } = puntoEn(j.idxSeguro, 0);
            j.auto.position.copy(pos);
            j.auto.rotation.set(0, rumbo(t), 0);
            j.idx = j.idxSeguro; j.prog = j.progSeguro;
            j.y = 0; j.vy = 0; j.enAire = false; j.cayendo = false;
            j.velocidad = 0;
            j.invulnerable = 1.5;
            mostrarAvisoPista(j, '');
            j.volviendo = false;
        }, 700);
    }

    function reaparecer(j) {
        const { pos, tan: t } = puntoEn(j.idxSeguro, 0);
        j.auto.position.copy(pos);
        j.auto.rotation.set(0, rumbo(t), 0);
        j.idx = j.idxSeguro; j.prog = j.progSeguro;
        j.y = 0; j.vy = 0; j.enAire = false; j.cayendo = false;
        j.blindaje = 100; j.velocidad = 0; j.invulnerable = 2; j.destruido = false;
        j.auto.visible = true;
        mostrarAvisoPista(j, '');
        actualizarHUD(j);
    }

    // ══════════ Armas y habilidades ══════════
    // Blancos posibles para un jugador: rivales vivos y el otro jugador
    function blancosDe(j) {
        const lista = rivales.filter(r => r.vivo).map(r => ({ pos: r.mesh.position, rival: r }));
        jugadores.forEach(o => { if (o !== j && !o.destruido) lista.push({ pos: o.auto.position, jugador: o }); });
        return lista;
    }

    function objetivoMasCercano(j, desde, direccion, rango = 90) {
        let mejor = null, dMejor = rango;
        blancosDe(j).forEach(b => {
            const v = b.pos.clone().sub(desde);
            const d = v.length();
            if (d < dMejor && v.normalize().dot(direccion) > 0.35) { mejor = b; dMejor = d; }
        });
        return mejor;
    }

    function disparar(j) {
        if (!carreraActiva || pausada || terminada || j.volviendo || j.destruido || j.recargaArma > 0) return;
        const a = j.arma;
        j.recargaArma = a.cadencia;
        Sonido.tono(a.sonido);
        const ang = j.auto.rotation.y + (a.dispersion ? (Math.random() - 0.5) * 2 * a.dispersion : 0);
        const frente = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
        const b = new THREE.Mesh(j.geoBala, j.matBala);
        b.position.copy(j.auto.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(frente, 3);
        b.vel = frente.multiplyScalar(a.velocidad + Math.max(0, j.velocidad) * 0.35);
        b.rotation.y = ang;
        b.vida = a.guiado ? 3.0 : 1.6;
        b.guiado = a.guiado || habActiva(j, 'punteria');
        b.dueno = j;
        scene.add(b);
        balas.push(b);
    }

    function usarHabilidad(j) {
        if (!carreraActiva || pausada || terminada || j.destruido) return;
        if (tJuego < j.habListaEn) {
            avisoDe(j, `${j.HAB.nombre} se está recargando: faltan ${Math.ceil(j.habListaEn - tJuego)} s.`, 'error', 1500);
            return;
        }
        j.habListaEn = tJuego + j.HAB.recarga;
        j.habActivaHasta = tJuego + j.HAB.duracion;
        Sonido.habilidad();
        if (j.HAB.id === 'sobrecarga') j.energia = 100;
        if (j.HAB.id === 'reparacion') {
            j.blindaje = Math.min(100, j.blindaje + 40);
            chispazo(j.auto.position, [0x22c55e, 0x86efac]);
            actualizarHUD(j);
        }
        avisoDe(j, `${j.piloto.nombre}: ¡${j.HAB.nombre}!`, 'exito', 1600);
    }

    function danarRival(r, cantidad, emp, autor) {
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
            if (autor) {
                autor.rivalesDestruidos++;
                avisoDe(autor, `¡${r.nombre} destruido! +${REGLAS_CARRERA.premioPorRival} 💎`, 'exito', 1800);
            }
            jugadores.forEach(actualizarHUD);
        }
    }

    // ══════════ Pausa ══════════
    function pausar() {
        if (terminada || pausada) return;
        pausada = true;
        jugadores.forEach(j => { j.disparandoRaton = false; });
        $('pausa-resumen').textContent = `${circuito.nombre} · ${fmtTiempo(tiempo)} · ` +
            jugadores.map(j => `${MODO === 2 ? j.corto + ' ' : ''}Vuelta ${limitar(j.vueltasHechas + 1, 1, VUELTAS)}/${VUELTAS}, posición ${posicion(j)}`).join(' · ');
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
        if (document.activeElement) document.activeElement.blur();
        Sonido.clic();
    }

    $('btn-pausa').addEventListener('click', e => { e.currentTarget.blur(); pausar(); });
    $('btn-continuar').addEventListener('click', continuar);
    $('btn-reiniciar-pausa').addEventListener('click', async () => {
        const ok = await confirmar({ titulo: '¿Reiniciar carrera?', mensaje: 'Empezarán de nuevo desde la vuelta 1. Se perderá el progreso de esta carrera.', aceptar: 'Reiniciar', peligro: true });
        if (ok) iniciarCarrera();
    });
    $('btn-abandonar').addEventListener('click', async () => {
        const ok = await confirmar({ titulo: '¿Volver al menú?', mensaje: 'Abandonarás la carrera y no se ganarán diamantes.', aceptar: 'Volver al menú', cancelar: 'Seguir en la carrera', peligro: true });
        if (ok) navegar('menu.html');
    });

    const filaTeclas = (accion, lista) => `<div class="fila"><span>${accion}</span><span>${lista.map(t => `<kbd>${t}</kbd>`).join(' ')}</span></div>`;
    $('controles-pausa').innerHTML = MODO === 1
        ? CONTROLES.slice(0, 3).flatMap(g => g.filas).map(f => filaTeclas(f.accion, f.teclas)).join('')
        : CONTROLES_2J.map(g => `<h4>${g.grupo}</h4>` + g.filas.map(f => filaTeclas(f.accion, f.teclas)).join('')).join('');
    $('btn-ver-controles').addEventListener('click', () => { Sonido.clic(); $('controles-pausa').classList.toggle('visible'); });
    $('btn-reiniciar').addEventListener('click', () => { Sonido.clic(); iniciarCarrera(); });

    window.addEventListener('blur', () => { if (carreraActiva) pausar(); });

    // ══════════ Fin de la carrera ══════════
    // ganador: un jugador, un rival o nadie (jugador destruido en modo 1)
    function terminarCarrera({ tipo, ganador, motivo }) {
        if (terminada) return;
        terminada = true;
        carreraActiva = false;
        jugadores.forEach(j => { j.velocidad = 0; j.disparandoRaton = false; });

        let premioTotal = 0;
        const premioDe = j => (ganador === j ? REGLAS_CARRERA.premioVictoria : 0) + j.rivalesDestruidos * REGLAS_CARRERA.premioPorRival;

        if (MODO === 1) {
            const j = jugadores[0];
            const pos = posicion(j);
            const textos = {
                victoria:  { emblema: '🏆', titulo: '¡Victoria!',         color: '#22c55e', posicion: '1.º',  sub: `Completaste las ${VUELTAS} vueltas en primer lugar.` },
                derrota:   { emblema: '❌', titulo: 'Derrota',            color: '#ef4444', posicion: `${Math.max(2, pos)}.º`, sub: `${motivo || 'Un rival'} completó las ${VUELTAS} vueltas antes que tú.` },
                destruido: { emblema: '💥', titulo: 'Vehículo destruido', color: '#ef4444', posicion: 'Fuera', sub: `Tu blindaje llegó a 0 % (${motivo || 'impactos'}).` }
            }[tipo];
            premioTotal = premioDe(j);
            $('res-emblema').textContent = textos.emblema;
            $('res-titulo').textContent = textos.titulo;
            $('res-titulo').style.color = textos.color;
            $('res-subtitulo').textContent = textos.sub;
            $('res-tabla').innerHTML = `
                <div class="tabla-resultados">
                    <div class="dato-resultado"><span class="num" style="color:${textos.color}">${textos.posicion}</span><span class="etq">Posición</span></div>
                    <div class="dato-resultado"><span class="num">${tipo === 'victoria' ? VUELTAS : Math.min(VUELTAS, j.vueltasHechas)} / ${VUELTAS}</span><span class="etq">Vueltas</span></div>
                    <div class="dato-resultado"><span class="num">${j.rivalesDestruidos}</span><span class="etq">Rivales destruidos</span></div>
                    <div class="dato-resultado"><span class="num">${fmtTiempo(tiempo)}</span><span class="etq">Tiempo</span></div>
                </div>`;
            if (tipo === 'destruido') { explosion(j.auto.position); j.auto.visible = false; }
            tipo === 'victoria' ? Sonido.victoria() : Sonido.explosion();
        } else {
            const humano = jugadores.includes(ganador);
            $('res-emblema').textContent = humano ? '🏆' : '❌';
            $('res-titulo').textContent = humano ? `¡Gana el ${ganador.nombre}!` : 'Ganó un rival';
            $('res-titulo').style.color = humano ? ganador.color : '#ef4444';
            $('res-subtitulo').textContent = humano
                ? `${ganador.nombre} completó las ${VUELTAS} vueltas primero en ${fmtTiempo(tiempo)}.`
                : `${motivo} completó las ${VUELTAS} vueltas antes que ustedes.`;
            const filas = jugadores.map(j => {
                const premio = premioDe(j);
                premioTotal += premio;
                return `<tr class="${ganador === j ? 'ganador' : ''}">
                    <td><span class="muestra-color" style="background:${j.color}"></span>${j.nombre}</td>
                    <td>${ganador === j ? '1.º' : posicion(j) + '.º'}</td>
                    <td>${ganador === j ? VUELTAS : Math.min(VUELTAS, j.vueltasHechas)} / ${VUELTAS}</td>
                    <td>${j.rivalesDestruidos}</td>
                    <td>+${formato(premio)} 💎</td>
                </tr>`;
            }).join('');
            $('res-tabla').innerHTML = `
                <table class="tabla-2j">
                    <thead><tr><th>Jugador</th><th>Posición</th><th>Vueltas</th><th>Rivales destruidos</th><th>Premio</th></tr></thead>
                    <tbody>${filas}</tbody>
                </table>`;
            humano ? Sonido.victoria() : Sonido.explosion();
        }

        if (premioTotal > 0) Estado.set('diamantes', Estado.get('diamantes') + premioTotal);
        $('res-premio').textContent = premioTotal > 0 ? `+${formato(premioTotal)} 💎 ganados` : 'Sin diamantes esta vez';
        $('panel-resultados').classList.add('visible');
        $('btn-reiniciar').focus();
    }

    // ══════════ Teclado y ratón ══════════
    window.addEventListener('keydown', e => {
        if (document.querySelector('.capa-dialogo')) return;
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (terminada) return;
            pausada ? continuar() : pausar();
            return;
        }
        if (pausada || terminada) return;
        if (TECLAS_JUEGO.has(e.code)) e.preventDefault();
        teclas[e.code] = true;
        jugadores.forEach(j => {
            if (j.teclas.pista.includes(e.code) && carreraActiva) volverAPista(j);
            if (j.teclas.habilidad.includes(e.code) && !e.repeat) usarHabilidad(j);
        });
    });
    window.addEventListener('keyup', e => {
        teclas[e.code] = false;
        if (!pausada && !terminada && TECLAS_JUEGO.has(e.code)) e.preventDefault();
    });
    // El clic dispara solo para el Jugador 1
    renderer.domElement.addEventListener('pointerdown', e => { if (e.button === 0) jugadores[0].disparandoRaton = true; });
    window.addEventListener('pointerup', () => { jugadores[0].disparandoRaton = false; });

    // ══════════ Radar ══════════
    const limites = pts.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), z0: Math.min(b.z0, p.z), z1: Math.max(b.z1, p.z) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
    const escalaRadar = Math.min(146 / (limites.x1 - limites.x0), 96 / (limites.z1 - limites.z0));
    const aRadar = p => [80 + (p.x - (limites.x0 + limites.x1) / 2) * escalaRadar, 55 + (p.z - (limites.z0 + limites.z1) / 2) * escalaRadar];
    const caminoRadar = new Path2D();
    pts.forEach((p, i) => { const [x, z] = aRadar(p); i ? caminoRadar.lineTo(x, z) : caminoRadar.moveTo(x, z); });
    caminoRadar.closePath();

    function dibujarRadar(j) {
        const ctx = j.radar;
        ctx.clearRect(0, 0, 160, 110);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorCSS(P.colores.borde1) + '88';
        ctx.lineWidth = Math.max(5, P.ancho * escalaRadar);
        ctx.stroke(caminoRadar);
        const [mx, mz] = aRadar(pts[0]);
        ctx.fillStyle = '#fff';
        ctx.fillRect(mx - 2, mz - 2, 4, 4);
        const punto = (pos, r, color, borde) => {
            const [x, z] = aRadar(pos);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, z, r, 0, Math.PI * 2); ctx.fill();
            if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1.5; ctx.stroke(); }
        };
        picos.forEach(p => punto(p.pos, 1.8, '#f97316'));
        objetos.forEach(o => o.activo && punto(o.pos, 1.8, o.tipo === 'turbo' ? '#38bdf8' : '#22c55e'));
        rivales.forEach(r => r.vivo && punto(r.mesh.position, 3.2, colorCSS(r.color)));
        jugadores.forEach(o => { if (o !== j) punto(o.auto.position, 3.8, o.color, '#fff'); });
        punto(j.auto.position, 4.4, '#ffffff', '#000');
    }

    // ══════════ Cámara ══════════
    function colocarCamara(j, inmediato) {
        const turboVisible = (pulsa(j, 'turbo') && j.energia > 0) || tJuego < j.impulsoHasta;
        const fx = Math.sin(j.auto.rotation.y), fz = Math.cos(j.auto.rotation.y);
        const alto = j.datosVeh.id === 'marauder' ? 1.3 : 0;   // el blindado es más alto
        const dist = (turboVisible ? 9 : 7.6) + alto;
        const destino = new THREE.Vector3(j.auto.position.x - fx * dist, Math.max(-6, j.auto.position.y) + 3.2 + alto, j.auto.position.z - fz * dist);
        if (inmediato) j.camara.position.copy(destino); else j.camara.position.lerp(destino, 0.14);
        j.camara.lookAt(j.auto.position.x + fx * 6, j.auto.position.y + 0.9, j.auto.position.z + fz * 6);
        j.camara.fov = inmediato ? 46 : THREE.MathUtils.lerp(j.camara.fov, turboVisible ? 60 : (j.velocidad > 110 ? 51 : 46), 0.08);
    }

    const cruza = (a, b, i) => b > a && Math.floor((a - i) / N) < Math.floor((b - i) / N);

    // ══════════ Bucle principal ══════════
    const reloj = new THREE.Clock();

    function animar() {
        requestAnimationFrame(animar);
        const dt = Math.min(reloj.getDelta(), 0.05);
        const tReal = reloj.elapsedTime;

        objetos.forEach(o => { o.mesh.rotation.y += dt * 2; o.mesh.position.y = 1.4 + Math.sin(tReal * 3 + o.pos.x) * 0.25; });
        picos.forEach(p => { p.mesh.baliza.material.color.setHex(Math.sin(tReal * 8) > 0 ? 0xff0033 : 0x550011); });
        decorGiratorio.forEach(m => { m.rotation.y += dt * m.userData.gira; });
        rivales.forEach(r => r.barra.position.copy(r.mesh.position).setY(r.mesh.position.y + 2.9));

        if (!pausada) {
            tJuego += dt;
            jugadores.forEach(j => {
                if (j.destruido) {
                    if (!terminada && tJuego >= j.reapareceEn) reaparecer(j);
                } else if (j.invulnerable > 0) {
                    j.invulnerable -= dt;
                    j.auto.visible = Math.floor(tReal * 20) % 2 === 0;
                } else if (!(terminada && MODO === 1)) j.auto.visible = true;
                j.escudo.visible = habActiva(j, 'escudo');
                if (j.escudo.visible) j.escudo.material.opacity = 0.18 + Math.sin(tReal * 10) * 0.06;
                j.recargaArma = Math.max(0, j.recargaArma - dt);
            });

            if (carreraActiva) {
                tiempo += dt;
                $('hud-tiempo').textContent = fmtTiempo(tiempo);
                jugadores.forEach(j => { if (!j.volviendo && !j.destruido && carreraActiva) actualizarJugador(j, dt); });
                if (carreraActiva) chocarJugadores();
                if (carreraActiva) actualizarRivales(dt);
            }
            actualizarBalas(dt);

            objetos.forEach(o => { if (!o.activo && tJuego > o.vuelve) { o.activo = true; o.mesh.visible = true; } });

            for (let i = particulas.children.length - 1; i >= 0; i--) {
                const pt = particulas.children[i];
                pt.position.addScaledVector(pt.vel, dt);
                pt.vel.y -= 20 * dt;
                pt.vida -= dt;
                pt.scale.multiplyScalar(0.96);
                if (pt.vida <= 0) particulas.remove(pt);
            }

            jugadores.forEach(j => {
                if (!terminada) colocarCamara(j, false);
                dibujarRadar(j);
                actualizarHUDcontinuo(j);
            });
        }

        dibujar();
    }

    // Una vista (1 jugador) o dos mitades (2 jugadores)
    function dibujar() {
        const w = window.innerWidth, h = window.innerHeight;
        const vistas = MODO === 1 ? [[jugadores[0], 0, w]] : [[jugadores[0], 0, w / 2], [jugadores[1], w / 2, w / 2]];
        renderer.setScissorTest(MODO === 2);
        vistas.forEach(([j, x, ancho]) => {
            renderer.setViewport(x, 0, ancho, h);
            renderer.setScissor(x, 0, ancho, h);
            j.camara.aspect = ancho / h;
            j.camara.updateProjectionMatrix();
            rivales.forEach(r => r.barra.quaternion.copy(j.camara.quaternion));
            sol.position.copy(j.auto.position).add(new THREE.Vector3(20, 40, 15));
            sol.target.position.copy(j.auto.position);
            sol.target.updateMatrixWorld();
            renderer.render(scene, j.camara);
        });
    }

    function actualizarJugador(j, dt) {
        const auto = j.auto, V = j.datosVeh;
        const sobrecarga = habActiva(j, 'sobrecarga');
        const quiereTurbo = pulsa(j, 'turbo');
        const turbo = quiereTurbo && (j.energia > 0 || sobrecarga);
        if (turbo && !sobrecarga) j.energia = Math.max(0, j.energia - 26 * dt);
        if (!quiereTurbo) j.energia = Math.min(100, j.energia + 6 * dt);
        const impulso = tJuego < j.impulsoHasta;

        let vmax = V.vmax;
        if (turbo) vmax += sobrecarga ? 140 : 95;
        if (impulso) vmax += 90;
        if (tJuego < j.empHasta) vmax *= 0.55;
        const acel = V.acel * (turbo ? 1.7 : 1) + (impulso ? 220 : 0);

        if (pulsa(j, 'acelerar')) {
            if (j.velocidad < vmax) j.velocidad = Math.min(vmax, j.velocidad + acel * dt);
        } else if (pulsa(j, 'frenar')) {
            j.velocidad = j.velocidad > 0 ? Math.max(0, j.velocidad - 140 * dt) : Math.max(-50, j.velocidad - V.acel * 0.7 * dt);
        } else {
            if (j.velocidad > 0) j.velocidad = Math.max(0, j.velocidad - 22 * dt);
            else if (j.velocidad < 0) j.velocidad = Math.min(0, j.velocidad + 22 * dt);
        }
        if (j.velocidad > vmax) j.velocidad = Math.max(vmax, j.velocidad - 70 * dt);

        let giro = 0;
        if (pulsa(j, 'izquierda')) giro += 1;
        if (pulsa(j, 'derecha')) giro -= 1;
        const agarre = j.enAire ? 0.25 : 1 - limitar((Math.abs(j.velocidad) - 150) / 300, 0, 0.35);
        if (giro !== 0 && Math.abs(j.velocidad) > 0.5) {
            auto.rotation.y += giro * V.giro * agarre * (j.velocidad >= 0 ? 1 : -1) * dt;
            auto.rotation.z = THREE.MathUtils.lerp(auto.rotation.z, -giro * 0.08, 0.15);
        } else auto.rotation.z = THREE.MathUtils.lerp(auto.rotation.z, 0, 0.15);
        auto.delanteras.forEach(r => { r.rotation.y = THREE.MathUtils.lerp(r.rotation.y, giro * 0.4, 0.2); });

        const paso = j.velocidad * 0.35 * dt;
        auto.position.x += Math.sin(auto.rotation.y) * paso;
        auto.position.z += Math.cos(auto.rotation.y) * paso;

        // Posición sobre la pista
        let mejor = j.idx, dMejor = Infinity;
        for (let k = -30; k <= 30; k++) {
            const i = mod(j.idx + k, N);
            const d = (pts[i].x - auto.position.x) ** 2 + (pts[i].z - auto.position.z) ** 2;
            if (d < dMejor) { dMejor = d; mejor = i; }
        }
        let delta = mejor - j.idx;
        if (delta > N / 2) delta -= N;
        if (delta < -N / 2) delta += N;
        const progAnterior = j.prog;
        j.prog += delta;
        j.idx = mejor;
        j.lateral = auto.position.clone().sub(pts[j.idx]).dot(nor[j.idx]);

        // Altura: saltos y caída
        if (j.enAire) {
            j.vy -= 26 * dt;
            j.y += j.vy * dt;
            if (j.y <= 0) {
                j.y = 0; j.vy = 0; j.enAire = false;
                Sonido.aterrizar();
                chispazo(auto.position, [0x94a3b8, 0xfacc15]);
            }
        }
        const fuera = Math.abs(j.lateral) > MITAD + 0.9;
        if (!j.enAire && (fuera || j.cayendo)) {
            j.cayendo = true;
            j.y -= 34 * dt;
            if (j.y < -14) volverAPista(j);
        } else if (!j.enAire && !fuera) {
            j.progSeguro = j.prog; j.idxSeguro = j.idx;
        }
        auto.position.y = j.y;

        if (!j.cayendo) {
            rampas.forEach(i => {
                if (cruza(progAnterior, j.prog, i) && !j.enAire) {
                    j.enAire = true;
                    j.vy = 9 + Math.max(0, j.velocidad) * 0.035;
                    Sonido.salto();
                }
            });
            aceleradores.forEach(i => {
                if (cruza(progAnterior, j.prog, i)) {
                    j.impulsoHasta = tJuego + 1.4;
                    j.velocidad = Math.max(j.velocidad, V.vmax + 40);
                    Sonido.acelerador();
                }
            });

            obstaculos.forEach(o => {
                const d = Math.hypot(auto.position.x - o.pos.x, auto.position.z - o.pos.z);
                if (d < o.radio + 1.2 && j.y < 2) {
                    const fuerte = Math.abs(j.velocidad) > 25;
                    j.velocidad = -j.velocidad * 0.35;
                    Sonido.impacto();
                    const empuje = auto.position.clone().sub(o.pos).setY(0).normalize();
                    auto.position.addScaledVector(empuje, o.radio + 1.25 - d);
                    if (fuerte) recibirDano(j, 6, 'choque con una caja');
                }
            });

            rivales.forEach(r => {
                if (!r.vivo) return;
                const sep = auto.position.clone().sub(r.mesh.position).setY(0);
                const d = sep.length();
                if (d < 3.2) {
                    const n = nor[j.idx];
                    const deLado = sep.dot(n) >= 0 ? 1 : -1;
                    auto.position.addScaledVector(n, deLado * (3.2 - d) * 0.7);
                    auto.position.addScaledVector(sep.normalize(), (3.2 - d) * 0.3);
                    r.lado = limitar(r.lado - deLado * 0.6, -(MITAD - 1.2), MITAD - 1.2);
                    if (!r.ultimoChoque || tJuego - r.ultimoChoque > 0.5) {
                        r.ultimoChoque = tJuego;
                        j.velocidad *= 0.85;
                        r.vel *= 0.85;
                        Sonido.impacto();
                        chispazo(auto.position.clone().lerp(r.mesh.position, 0.5), [0xffffff, 0xfacc15]);
                    }
                }
            });

            if (j.y < 1) {
                const pico = picos.find(p => Math.hypot(auto.position.x - p.pos.x, auto.position.z - p.pos.z) < p.radio);
                if (pico && recibirDano(j, 22, 'picos')) {
                    j.invulnerable = 0.9;
                    j.velocidad *= 0.4;
                }
            }

            objetos.forEach(o => {
                if (!o.activo || j.destruido) return;
                if (Math.hypot(auto.position.x - o.pos.x, auto.position.z - o.pos.z) < 2.6) {
                    o.activo = false;
                    o.mesh.visible = false;
                    o.vuelve = tJuego + 10;
                    Sonido.recoger();
                    if (o.tipo === 'turbo') {
                        j.energia = Math.min(100, j.energia + 50);
                        avisoDe(j, '⚡ Turbo +50 %', 'info', 1000);
                    } else {
                        j.blindaje = Math.min(100, j.blindaje + 30);
                        actualizarHUD(j);
                        avisoDe(j, '🔧 Blindaje +30 %', 'exito', 1000);
                    }
                }
            });
        }

        // Vueltas
        const completas = Math.floor(j.prog / N);
        if (completas > j.vueltasHechas) {
            j.vueltasHechas = completas;
            if (j.vueltasHechas >= VUELTAS) { terminarCarrera({ tipo: 'victoria', ganador: j }); return; }
            actualizarHUD(j);
            avisoDe(j, j.vueltasHechas === VUELTAS - 1 ? '🏁 ¡Última vuelta!' : `Vuelta ${j.vueltasHechas + 1} de ${VUELTAS}`, 'info', 1500);
        }

        if (j.disparandoRaton || pulsa(j, 'disparar')) disparar(j);

        auto.ruedas.forEach(w => { w.rotation.x += j.velocidad * 0.12 * dt; });
        const fuego = turbo || impulso;
        auto.propulsores.forEach(p => {
            p.material.opacity = fuego && j.velocidad > 20 ? 1 : (j.velocidad > 60 ? 0.35 : 0);
            p.material.color.setHex(sobrecarga ? 0xfacc15 : 0x38bdf8);
            p.scale.set(fuego ? 1.6 : 1, fuego ? 1.6 : 1, fuego ? 3.0 : (j.velocidad > 60 ? 1.4 : 1));
        });
    }

    // Choque entre los dos jugadores
    function chocarJugadores() {
        if (jugadores.length < 2) return;
        const [a, b] = jugadores;
        if (a.destruido || b.destruido || a.volviendo || b.volviendo) return;
        const sep = a.auto.position.clone().sub(b.auto.position).setY(0);
        const d = sep.length();
        if (d < 3.2 && d > 0.001) {
            sep.normalize();
            a.auto.position.addScaledVector(sep, (3.2 - d) / 2);
            b.auto.position.addScaledVector(sep, -(3.2 - d) / 2);
            if (!a.ultimoChoqueJ || tJuego - a.ultimoChoqueJ > 0.5) {
                a.ultimoChoqueJ = tJuego;
                const media = (a.velocidad + b.velocidad) / 2;
                a.velocidad = a.velocidad * 0.6 + media * 0.3;
                b.velocidad = b.velocidad * 0.6 + media * 0.3;
                Sonido.impacto();
                chispazo(a.auto.position.clone().lerp(b.auto.position, 0.5), [0xffffff, 0xfacc15]);
            }
        }
    }

    function actualizarRivales(dt) {
        const vivos = jugadores.filter(j => !j.destruido);
        const mejorProg = Math.max(...jugadores.map(j => j.prog));
        rivales.forEach(r => {
            if (!r.vivo) return;
            const i = mod(Math.floor(r.s), N);

            let objetivo = r.base * P.velRivales * (1 - Math.min(0.32, curva[i] * 0.55));
            objetivo *= 1 + limitar(((mejorProg - r.s) / N) * 0.5, -0.14, 0.2);
            if (tJuego < r.empHasta) objetivo *= 0.45;
            r.vel += limitar(objetivo - r.vel, -45 * dt, 14 * dt);
            const sAnterior = r.s;
            r.s += (r.vel * dt) / LARGO_MUESTRA;

            let carrilObjetivo = r.carrilBase;
            [...picos, ...obstaculos].forEach(o => {
                const adelante = mod(o.i - r.s, N);
                if (adelante < 34 && Math.abs(carrilObjetivo - o.lado) < 3.6) {
                    carrilObjetivo = o.lado + (r.lado >= o.lado ? 4.2 : -4.2);
                }
            });
            carrilObjetivo = limitar(carrilObjetivo, -(MITAD - 1.6), MITAD - 1.6);
            r.lado = THREE.MathUtils.lerp(r.lado, carrilObjetivo, Math.min(1, 2.4 * dt));

            rampas.forEach(ri => { if (cruza(sAnterior, r.s, ri) && r.y <= 0) r.vy = 8.5; });
            if (r.y > 0 || r.vy > 0) {
                r.vy -= 26 * dt;
                r.y = Math.max(0, r.y + r.vy * dt);
                if (r.y === 0) r.vy = 0;
            }

            colocarRival(r);
            r.mesh.ruedas.forEach(w => { w.rotation.x += r.vel * 0.35 * dt; });

            if (r.y < 1 && tJuego - r.ultimoPico > 1.0) {
                const p = picos.find(p => r.mesh.position.distanceTo(p.pos) < p.radio);
                if (p) {
                    r.ultimoPico = tJuego;
                    r.vel *= 0.5;
                    chispazo(r.mesh.position);
                    danarRival(r, 25, 0, null);
                }
            }

            if (r.s >= VUELTAS * N && !terminada) { terminarCarrera({ tipo: 'derrota', ganador: r, motivo: r.nombre }); return; }

            // Disparan al jugador más cercano que tengan delante
            if (tJuego > r.proximoDisparo && !terminada) {
                const frente = new THREE.Vector3(Math.sin(r.mesh.rotation.y), 0, Math.cos(r.mesh.rotation.y));
                let blanco = null, dMin = 55;
                vivos.forEach(j => {
                    const hacia = j.auto.position.clone().sub(r.mesh.position);
                    const d = hacia.length();
                    if (d < dMin && hacia.normalize().dot(frente) > 0.88) { blanco = j; dMin = d; }
                });
                if (blanco) {
                    const b = new THREE.Mesh(geoBalaRival, matBalaRival);
                    b.position.copy(r.mesh.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(frente, 2.8);
                    b.vel = blanco.auto.position.clone().sub(r.mesh.position).setY(0).normalize().multiplyScalar(95);
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
            const b = balas[i], j = b.dueno, a = j.arma;
            if (b.guiado) {
                const dir = b.vel.clone().normalize();
                const obj = objetivoMasCercano(j, b.position, dir, 90);
                if (obj) {
                    const deseo = obj.pos.clone().add(new THREE.Vector3(0, 0.6, 0)).sub(b.position).normalize();
                    const rapidez = b.vel.length();
                    b.vel.copy(dir.lerp(deseo, Math.min(1, 5 * dt)).normalize().multiplyScalar(rapidez));
                    b.rotation.y = Math.atan2(b.vel.x, b.vel.z);
                }
                if (a.forma === 'misil' && Math.random() < 0.6) chispas(b.position.clone().add(new THREE.Vector3(0, -0.6, 0)), 1, [0xf97316, 0x9ca3af], 0.15, 0.3, 2);
            }
            b.position.addScaledVector(b.vel, dt);
            b.vida -= dt;

            for (const r of rivales) {
                if (r.vivo && b.vida > 0 && b.position.distanceTo(r.mesh.position) < 2.7) {
                    b.vida = 0;
                    chispazo(b.position, [a.color, 0xffffff]);
                    Sonido.impacto();
                    danarRival(r, a.dano, a.emp || 0, j);
                    break;
                }
            }
            // También se puede dar al otro jugador (la mitad del daño)
            jugadores.forEach(o => {
                if (o === j || o.destruido || b.vida <= 0 || terminada) return;
                if (b.position.distanceTo(o.auto.position) < 2.5) {
                    b.vida = 0;
                    chispazo(b.position, [a.color, 0xffffff]);
                    if (habActiva(o, 'escudo')) return;
                    if (recibirDano(o, a.dano * 0.5, `disparos del ${j.nombre}`) && a.emp) o.empHasta = tJuego + a.emp;
                }
            });

            if (b.vida <= 0) { scene.remove(b); balas.splice(i, 1); }
        }

        for (let i = balasRivales.length - 1; i >= 0; i--) {
            const b = balasRivales[i];
            b.position.addScaledVector(b.vel, dt);
            b.vida -= dt;
            jugadores.forEach(j => {
                if (b.vida > 0 && !terminada && !j.destruido && b.position.distanceTo(j.auto.position) < 2.4) {
                    b.vida = 0;
                    if (habActiva(j, 'escudo')) chispazo(b.position, [0x38bdf8, 0xffffff]);
                    else recibirDano(j, 7, 'disparos de los rivales');
                }
            });
            if (b.vida <= 0) { scene.remove(b); balasRivales.splice(i, 1); }
        }
    }

    animar();
    iniciarCarrera();
}
