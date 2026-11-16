// ══════════════════════════════════════════════════════════════
// Menú principal: secciones, equipamiento, pintura y vehículo 3D
// ══════════════════════════════════════════════════════════════

// ── Lista de secciones ──
const lista = document.getElementById('lista-secciones');
lista.innerHTML = SECCIONES.map(s => s.principal ? `
    <button class="opcion-menu principal" id="btn-jugar" aria-expanded="false" aria-controls="submenu-jugar">
        <span>${s.icono} ${s.nombre}</span>
        <span class="detalle">${s.detalle} ▾</span>
    </button>
    <div class="submenu-jugar" id="submenu-jugar" role="group" aria-label="Elige el modo de juego">
        <button class="opcion-modo" data-ir="${s.pagina}?modo=1">
            <span class="icono-modo">👤</span>
            <span><b>1 jugador</b><small>Tú contra 3 rivales</small></span>
        </button>
        <button class="opcion-modo" data-ir="${s.pagina}?modo=2">
            <span class="icono-modo">👥</span>
            <span><b>2 jugadores</b><small>Pantalla dividida · WASD y flechas</small></span>
        </button>
    </div>` : `
    <button class="opcion-menu ${s.destacado ? 'destacado' : ''}" data-ir="${s.pagina}">
        <span>${s.icono} ${s.nombre}</span>
        <span class="detalle">${s.detalle}</span>
    </button>`).join('');

// Jugar despliega la elección de modo (1 o 2 jugadores)
const btnJugar = document.getElementById('btn-jugar');
const submenu = document.getElementById('submenu-jugar');
function desplegarJugar(abrir) {
    btnJugar.setAttribute('aria-expanded', abrir);
    submenu.classList.toggle('abierto', abrir);
    if (abrir) submenu.querySelector('.opcion-modo').focus();
}
btnJugar.addEventListener('click', () => {
    Sonido.clic();
    desplegarJugar(btnJugar.getAttribute('aria-expanded') !== 'true');
});
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && submenu.classList.contains('abierto')) { desplegarJugar(false); btnJugar.focus(); }
});

// ── Perfil y equipamiento ──
document.getElementById('perfil-nombre').textContent = Estado.get('piloto');
document.getElementById('perfil-rango').textContent = Estado.get('rango');
document.getElementById('perfil-nivel').textContent = `NV. ${Estado.get('nivel')}`;
document.getElementById('eq-circuito').textContent = buscarPor(CIRCUITOS, Estado.get('circuito')).nombre;
document.getElementById('eq-vehiculo').textContent = buscarPor(VEHICULOS, Estado.get('vehiculo')).nombre;
document.getElementById('eq-arma').textContent = buscarPor(ARMAS, Estado.get('arma')).nombre;
document.getElementById('eq-piloto').textContent = buscarPor(PILOTOS, Estado.get('agente')).nombre;

// ── Paleta de pintura (incluye la Pintura Oro 24K si se compró) ──
const paleta = document.getElementById('paleta');
const nombrePintura = document.getElementById('nombre-pintura');
const pinturaActual = () => Estado.get('pintura');

function pintarPaleta() {
    paleta.innerHTML = PINTURAS.map(p => `
        <div class="muestra" role="radio" tabindex="0" title="${p.nombre}"
             style="background:${p.color}; color:${p.color}"
             data-color="${p.color}" aria-checked="${p.color === pinturaActual()}"></div>`).join('');
    const sel = PINTURAS.find(p => p.color === pinturaActual());
    nombrePintura.textContent = sel ? sel.nombre : 'Personalizada';
}
pintarPaleta();

// ── Escena 3D ──
let vehiculo = null, foco = null;

if (verificarMotor3D()) {
    const { renderer, scene, camera } = crearEscena(document.getElementById('lienzo-3d'));
    camera.position.set(-0.3, 2.3, 7.8);
    camera.lookAt(0.6, 0.6, 0);

    foco = crearLuces(scene, new THREE.Color(pinturaActual()));
    crearEstrellas(scene);

    // Pedestal
    const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(4.5, 4.8, 0.3, 64),
        new THREE.MeshStandardMaterial({ color: 0x0c0918, metalness: 0.9, roughness: 0.3 })
    );
    pedestal.position.y = -0.15;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    const aro = new THREE.Mesh(new THREE.RingGeometry(4.45, 4.6, 64), new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.01;
    scene.add(aro);

    vehiculo = crearVehiculo(Estado.get('vehiculo'), pinturaActual());
    scene.add(vehiculo);

    // Girar con el mouse
    let arrastrando = false, xPrevia = 0, inercia = 0, giroAuto = true, temporizador = null;
    const lienzo = renderer.domElement;
    lienzo.style.cursor = 'grab';
    lienzo.addEventListener('pointerdown', e => {
        arrastrando = true;
        xPrevia = e.clientX;
        giroAuto = false;
        lienzo.style.cursor = 'grabbing';
        clearTimeout(temporizador);
    });
    window.addEventListener('pointermove', e => {
        if (!arrastrando) return;
        const dx = e.clientX - xPrevia;
        vehiculo.rotation.y += dx * 0.008;
        inercia = dx * 0.008;
        xPrevia = e.clientX;
    });
    window.addEventListener('pointerup', () => {
        if (!arrastrando) return;
        arrastrando = false;
        lienzo.style.cursor = 'grab';
        temporizador = setTimeout(() => { giroAuto = true; }, 3000);
    });
    lienzo.addEventListener('wheel', e => {
        camera.position.z = Math.max(4.5, Math.min(10.5, camera.position.z + e.deltaY * 0.005));
    }, { passive: true });

    const reloj = new THREE.Clock();
    let enTurbo = false;
    (function animar() {
        requestAnimationFrame(animar);
        const t = reloj.getElapsedTime();
        vehiculo.position.y = Math.sin(t * 2.5) * 0.04 + (enTurbo ? 0.4 : 0);
        if (giroAuto && !arrastrando) vehiculo.rotation.y += 0.005;
        else if (!arrastrando && Math.abs(inercia) > 0.0001) {
            vehiculo.rotation.y += inercia;
            inercia *= 0.95;
        }
        renderer.render(scene, camera);
    })();

    // Vista previa: Girar 360°
    document.getElementById('btn-girar').addEventListener('click', () => {
        Sonido.clic();
        const inicio = vehiculo.rotation.y, t0 = performance.now();
        (function girar(t) {
            const p = Math.min((t - t0) / 800, 1);
            vehiculo.rotation.y = inicio + Math.PI * 2 * (1 - Math.pow(1 - p, 3));
            if (p < 1) requestAnimationFrame(girar);
        })(t0);
    });

    // Vista previa: Probar turbo
    document.getElementById('btn-turbo').addEventListener('click', () => {
        Sonido.turbo();
        enTurbo = true;
        vehiculo.propulsores.forEach(j => { j.material.opacity = 1; j.scale.set(1.5, 2.5, 1.5); });
        setTimeout(() => {
            enTurbo = false;
            vehiculo.propulsores.forEach(j => { j.material.opacity = 0; j.scale.set(1, 1, 1); });
        }, 600);
    });
}

// Elegir pintura (clic o teclado)
function elegirPintura(el) {
    if (!el) return;
    Estado.set('pintura', el.dataset.color);
    pintarPaleta();
    if (vehiculo) vehiculo.pintar(el.dataset.color, foco);
    Sonido.clic();
}
paleta.addEventListener('click', e => elegirPintura(e.target.closest('.muestra')));
paleta.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirPintura(e.target.closest('.muestra')); }
});
