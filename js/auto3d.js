// ══════════════════════════════════════════════════════════════
// Escena 3D compartida y modelos de los 4 vehículos.
// La usan el Menú principal, el Garaje (vista previa) y la Carrera.
// ══════════════════════════════════════════════════════════════

function crearEscena(lienzo) {
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050d, 0.018);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { renderer, scene, camera };
}

function crearLuces(scene, color) {
    scene.add(new THREE.AmbientLight(0x2a2250, 1.8));
    scene.add(new THREE.HemisphereLight(0x8b7cff, 0x0a0614, 0.6));
    const foco = new THREE.SpotLight(color, 4.5, 55, Math.PI / 3, 0.4, 1.2);
    foco.position.set(5, 12, 6);
    foco.castShadow = true;
    scene.add(foco);
    const contraluz = new THREE.DirectionalLight(0x38bdf8, 2.2);
    contraluz.position.set(-8, 6, -6);
    scene.add(contraluz);
    const frontal = new THREE.DirectionalLight(0xffffff, 0.8);
    frontal.position.set(4, 5, 10);
    scene.add(frontal);
    return foco;
}

function crearEstrellas(scene, extension = 180) {
    const geo = new THREE.BufferGeometry();
    const coords = [];
    for (let i = 0; i < 2000; i++) {
        coords.push((Math.random() - 0.5) * extension * 2, Math.random() * 60 - 10, (Math.random() - 0.5) * extension * 2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.18, color: 0xa855f7, transparent: true, opacity: 0.85 })));
}

// ── Piezas ──

// Extruye un perfil lateral [z, y] con el ancho indicado (centrado en x = 0)
function extruirPerfil(puntos, ancho, material, bisel = 0.06) {
    const forma = new THREE.Shape();
    forma.moveTo(puntos[0][0], puntos[0][1]);
    for (let i = 1; i < puntos.length; i++) forma.lineTo(puntos[i][0], puntos[i][1]);
    forma.closePath();
    const prof = Math.max(0.01, ancho - 2 * bisel);
    const geo = new THREE.ExtrudeGeometry(forma, {
        depth: prof, steps: 1,
        bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 2
    });
    geo.rotateY(-Math.PI / 2);      // el perfil queda a lo largo del eje z (frente = +z)
    geo.translate(prof / 2, 0, 0);  // centrar en x
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

function caja(ancho, alto, largo, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, largo), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
}

function cilindro(radio, largo, material, x, y, z, eje = 'z') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 16), material);
    if (eje === 'z') m.rotation.x = Math.PI / 2;
    if (eje === 'x') m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    return m;
}

// Rueda: pivote (gira para dirigir) → giro (rueda sobre su eje)
function crearRueda(radio, ancho, mats) {
    const pivote = new THREE.Group();
    const giro = new THREE.Group();
    pivote.add(giro);

    const llanta = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, ancho, 28), mats.llanta);
    llanta.rotation.z = Math.PI / 2;
    llanta.castShadow = true;
    giro.add(llanta);

    const rin = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.62, radio * 0.62, ancho + 0.02, 20), mats.cromo);
    rin.rotation.z = Math.PI / 2;
    giro.add(rin);

    [-1, 1].forEach(lado => {
        for (let i = 0; i < 5; i++) {
            const rayo = new THREE.Mesh(new THREE.BoxGeometry(0.03, radio * 1.1, 0.07), mats.negro);
            rayo.position.x = lado * (ancho / 2 + 0.015);
            rayo.rotation.x = (i / 5) * Math.PI;
            giro.add(rayo);
        }
        const aro = new THREE.Mesh(new THREE.TorusGeometry(radio * 0.8, 0.03, 8, 28), mats.neon);
        aro.rotation.y = Math.PI / 2;
        aro.position.x = lado * (ancho / 2 + 0.02);
        giro.add(aro);
    });

    pivote.giro = giro;
    return pivote;
}

function crearPropulsor(x, y, z) {
    const geo = new THREE.ConeGeometry(0.16, 0.7, 16);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -0.35);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 }));
    m.position.set(x, y, z);
    return m;
}

// ── Modelos de cada vehículo ──
const MODELOS = {
    // Deportivo de techo bajo con alerón
    phantom(g, m, ruedas) {
        g.add(extruirPerfil([[-2.25, 0.32], [2.15, 0.32], [2.38, 0.42], [2.3, 0.58], [1.2, 0.78], [-1.4, 0.87], [-2.2, 0.92], [-2.32, 0.6]], 2.0, m.pintura));
        g.add(extruirPerfil([[1.05, 0.74], [0.15, 1.22], [-0.85, 1.27], [-1.65, 0.86]], 1.5, m.vidrio, 0.04));
        // franja sobre el capó y techo
        const franja = caja(0.32, 0.03, 1.3, m.negro, 0, 0.7, 1.7); franja.rotation.x = 0.18; g.add(franja);
        g.add(caja(0.3, 0.03, 0.9, m.negro, 0, 1.28, -0.35));
        // tomas de aire y faldones
        [-1, 1].forEach(l => {
            g.add(caja(0.04, 0.06, 3.4, m.neon, l * 1.03, 0.4, 0));
            g.add(caja(0.08, 0.2, 0.6, m.negro, l * 1.0, 0.62, -0.7));
            g.add(caja(0.18, 0.1, 0.12, m.pintura, l * 0.88, 0.98, 0.65)); // espejos
        });
        g.add(caja(2.15, 0.05, 0.35, m.negro, 0, 0.3, 2.28));    // splitter
        g.add(caja(1.8, 0.22, 0.25, m.negro, 0, 0.42, -2.3));    // difusor
        g.add(caja(1.9, 0.06, 0.06, m.tras, 0, 0.8, -2.36));     // luz trasera
        [-1, 1].forEach(l => g.add(caja(0.55, 0.06, 0.1, m.faros, l * 0.68, 0.56, 2.3)));
        // alerón
        g.add(caja(2.15, 0.06, 0.45, m.negro, 0, 1.24, -2.0));
        [-1, 1].forEach(l => {
            g.add(caja(0.05, 0.28, 0.52, m.pintura, l * 1.08, 1.16, -2.0));
            g.add(caja(0.07, 0.3, 0.12, m.negro, l * 0.6, 1.05, -2.0));
            g.add(cilindro(0.09, 0.2, m.cromo, l * 0.42, 0.45, -2.42));
        });
        ruedas(0.44, 0.34, 1.12, 1.45, -1.45);
        return [crearPropulsor(-0.42, 0.45, -2.52), crearPropulsor(0.42, 0.45, -2.52)];
    },

    // Todoterreno blindado alto con defensa, barra de luces y llantas grandes
    marauder(g, m, ruedas) {
        g.add(extruirPerfil([[-2.35, 0.6], [2.3, 0.6], [2.5, 0.88], [2.42, 1.18], [1.1, 1.26], [0.78, 1.95], [-1.7, 2.0], [-2.35, 1.75]], 2.3, m.pintura));
        g.add(extruirPerfil([[1.16, 1.28], [0.82, 1.97], [-0.95, 2.0], [-0.95, 1.32]], 2.36, m.vidrio, 0.02));
        g.add(extruirPerfil([[-1.15, 1.35], [-1.15, 1.95], [-1.65, 1.95], [-1.65, 1.4]], 2.36, m.vidrio, 0.02));
        g.add(caja(2.3, 0.08, 2.0, m.negro, 0, 2.06, -0.5)); // techo
        // defensa delantera
        g.add(caja(2.3, 0.12, 0.12, m.cromo, 0, 0.78, 2.6));
        g.add(caja(2.0, 0.1, 0.1, m.cromo, 0, 1.05, 2.56));
        [-1, 1].forEach(l => g.add(caja(0.1, 0.5, 0.1, m.cromo, l * 0.7, 0.88, 2.58)));
        // barra de luces
        g.add(caja(1.7, 0.12, 0.22, m.negro, 0, 2.18, 0.25));
        for (let i = 0; i < 4; i++) g.add(caja(0.3, 0.08, 0.04, m.ambar, -0.6 + i * 0.4, 2.18, 0.37));
        // placas de blindaje, escapes y luces
        [-1, 1].forEach(l => {
            g.add(caja(0.08, 0.42, 2.8, m.negro, l * 1.19, 1.0, -0.2));
            g.add(caja(0.05, 0.05, 2.8, m.neon, l * 1.22, 0.75, -0.2));
            g.add(cilindro(0.08, 0.9, m.cromo, l * 0.85, 2.25, -1.95, 'y'));
            g.add(cilindro(0.15, 0.06, m.faros, l * 0.78, 1.0, 2.5));
            g.add(caja(0.25, 0.25, 0.05, m.tras, l * 0.92, 1.45, -2.38));
        });
        const repuesto = cilindro(0.48, 0.25, m.llanta, 0, 1.3, -2.52);
        g.add(repuesto);
        ruedas(0.62, 0.48, 1.25, 1.55, -1.55);
        return [crearPropulsor(-0.5, 0.8, -2.55), crearPropulsor(0.5, 0.8, -2.55)];
    },

    // Monoplaza de fórmula: ruedas al aire, alerones y casco del piloto
    hyperion(g, m, ruedas) {
        g.add(extruirPerfil([[-2.1, 0.3], [2.6, 0.3], [2.78, 0.38], [1.4, 0.6], [0.4, 0.72], [0.1, 0.95], [-1.2, 1.0], [-1.9, 0.85], [-2.1, 0.6]], 0.9, m.pintura));
        [-1, 1].forEach(l => {
            const pontón = extruirPerfil([[-1.35, 0.3], [0.6, 0.3], [0.62, 0.7], [0.3, 0.78], [-1.35, 0.62]], 0.45, m.pintura, 0.04);
            pontón.position.x = l * 0.64;
            g.add(pontón);
            g.add(caja(0.05, 0.05, 1.9, m.neon, l * 0.88, 0.55, -0.35));
        });
        // alerón delantero
        g.add(caja(2.55, 0.05, 0.5, m.negro, 0, 0.3, 2.55));
        g.add(caja(2.3, 0.04, 0.25, m.pintura, 0, 0.4, 2.45));
        [-1, 1].forEach(l => g.add(caja(0.05, 0.25, 0.6, m.pintura, l * 1.27, 0.38, 2.5)));
        // alerón trasero
        g.add(caja(1.9, 0.06, 0.5, m.pintura, 0, 1.38, -2.15));
        g.add(caja(1.9, 0.05, 0.3, m.negro, 0, 1.2, -2.28));
        [-1, 1].forEach(l => g.add(caja(0.05, 0.6, 0.8, m.negro, l * 0.96, 1.15, -2.15)));
        g.add(caja(0.08, 0.5, 0.15, m.negro, 0, 1.0, -2.0));
        // toma de aire, casco y halo
        g.add(caja(0.32, 0.28, 0.5, m.pintura, 0, 1.12, -0.6));
        const casco = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), m.blanco);
        casco.position.set(0, 1.05, -0.1);
        g.add(casco);
        g.add(caja(0.3, 0.07, 0.1, m.vidrio, 0, 1.08, 0.08));
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 20, Math.PI), m.negro);
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(0, 1.18, -0.1);
        g.add(halo);
        g.add(caja(0.05, 0.22, 0.05, m.negro, 0, 1.07, 0.24));
        // suspensión
        [1.6, -1.5].forEach(z => [-1, 1].forEach(l => g.add(caja(0.7, 0.04, 0.06, m.negro, l * 0.75, 0.5, z))));
        g.add(caja(0.3, 0.05, 0.05, m.faros, 0, 0.42, 2.7));
        g.add(caja(0.22, 0.1, 0.04, m.tras, 0, 0.62, -2.15));
        ruedas(0.48, 0.44, 1.15, 1.6, -1.5);
        return [crearPropulsor(-0.22, 0.6, -2.15), crearPropulsor(0.22, 0.6, -2.15)];
    },

    // Prototipo de sigilo: cuña plana negra con líneas de neón y aletas
    viper(g, m, ruedas) {
        g.add(extruirPerfil([[-2.35, 0.3], [2.35, 0.3], [2.52, 0.36], [0.7, 0.8], [-0.4, 0.92], [-1.7, 0.86], [-2.35, 0.7]], 2.15, m.oscuro));
        g.add(extruirPerfil([[0.75, 0.79], [0.0, 1.07], [-0.85, 1.03], [-1.3, 0.88]], 1.25, m.vidrio, 0.04));
        [-1, 1].forEach(l => {
            g.add(caja(0.04, 0.04, 4.4, m.neon, l * 1.09, 0.48, 0));
            const linea = caja(0.04, 0.03, 2.0, m.neon, l * 0.55, 0.6, 1.4);
            linea.rotation.x = 0.24;
            linea.rotation.y = -l * 0.2;
            g.add(linea);
            const aleta = extruirPerfil([[-2.3, 0.82], [-1.5, 0.84], [-2.42, 1.5]], 0.06, m.oscuro, 0.01);
            aleta.position.x = l * 0.72;
            g.add(aleta);
            g.add(caja(0.04, 0.04, 0.9, m.neon, l * 0.72, 1.15, -2.0));
            g.add(caja(0.7, 0.03, 0.05, m.faros, l * 0.6, 0.42, 2.42));
        });
        g.add(caja(2.0, 0.04, 0.05, m.tras, 0, 0.68, -2.38));
        ruedas(0.42, 0.34, 1.12, 1.5, -1.5);
        return [crearPropulsor(-0.5, 0.5, -2.4), crearPropulsor(0.5, 0.5, -2.4)];
    }
};

// Crea un vehículo: tipo = 'phantom' | 'marauder' | 'hyperion' | 'viper'
function crearVehiculo(tipo, colorHex) {
    const color = new THREE.Color(colorHex);
    const g = new THREE.Group();

    const m = {
        pintura: new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.22 }),
        oscuro:  new THREE.MeshStandardMaterial({ color: 0x15151f, metalness: 0.85, roughness: 0.3 }),
        negro:   new THREE.MeshStandardMaterial({ color: 0x0e0e14, metalness: 0.6, roughness: 0.5 }),
        cromo:   new THREE.MeshStandardMaterial({ color: 0xc7cbd4, metalness: 1.0, roughness: 0.2 }),
        llanta:  new THREE.MeshStandardMaterial({ color: 0x18181d, metalness: 0.1, roughness: 0.9 }),
        blanco:  new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.3, roughness: 0.3 }),
        vidrio:  new THREE.MeshStandardMaterial({ color: 0x0a1428, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.88 }),
        neon:    new THREE.MeshBasicMaterial({ color }),
        faros:   new THREE.MeshBasicMaterial({ color: 0xe0f2fe }),
        tras:    new THREE.MeshBasicMaterial({ color: 0xff2d55 }),
        ambar:   new THREE.MeshBasicMaterial({ color: 0xfde047 })
    };

    g.ruedas = [];
    g.delanteras = [];
    const ruedas = (radio, ancho, x, zDel, zTras) => {
        [[zDel, true], [zTras, false]].forEach(([z, del]) => [-1, 1].forEach(l => {
            const r = crearRueda(radio, ancho, m);
            r.position.set(l * x, radio, z);
            g.add(r);
            g.ruedas.push(r.giro);
            if (del) g.delanteras.push(r);
        }));
    };

    const constructor = MODELOS[tipo] || MODELOS.phantom;
    g.propulsores = constructor(g, m, ruedas);
    g.propulsores.forEach(p => g.add(p));

    const neonInferior = new THREE.PointLight(color, 3.0, 6.5);
    neonInferior.position.set(0, 0.15, 0);
    g.add(neonInferior);

    g.pintar = (hex, foco) => {
        const c = new THREE.Color(hex);
        m.pintura.color = c;
        m.neon.color = c;
        neonInferior.color = c;
        if (foco) foco.color = c;
    };

    return g;
}

// ── Vista previa 3D pequeña (Garaje) ──
function crearVistaPrevia() {
    const lienzo = document.createElement('canvas');
    lienzo.style.width = '100%';
    lienzo.style.height = '100%';
    lienzo.style.display = 'block';
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1.6, 0.1, 100);
    camera.position.set(6.2, 3.2, 7.4);
    camera.lookAt(0, 0.7, 0);
    crearLuces(scene, 0xa855f7);
    const aro = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.35, 64), new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2;
    scene.add(aro);
    const base = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: 0x0c0918, metalness: 0.9, roughness: 0.35 }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.01;
    scene.add(base);

    let actual = null;
    const vista = {
        lienzo,
        mostrar(tipo, color, apagado = false) {
            const angulo = actual ? actual.rotation.y : 0.6;
            if (actual) scene.remove(actual);
            actual = crearVehiculo(tipo, apagado ? '#475569' : color);
            actual.rotation.y = angulo;
            scene.add(actual);
        },
        ajustar() {
            const p = lienzo.parentElement;
            if (!p) return;
            const w = p.clientWidth || 320, h = p.clientHeight || 200;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    };
    (function bucle() {
        requestAnimationFrame(bucle);
        if (actual) actual.rotation.y += 0.008;
        renderer.render(scene, camera);
    })();
    window.addEventListener('resize', () => vista.ajustar());
    return vista;
}
