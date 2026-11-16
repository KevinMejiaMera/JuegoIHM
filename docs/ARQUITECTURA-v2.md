# Zero Horizon · Fase 2 (arquitectura de información v2)

## 1. Mapa de pantallas

```
Inicio (index.html)
├── Controles (controles.html?desde=inicio)
└── Menú principal (menu.html)
    ├── Jugar ▾ (se despliega)
    │   ├── 1 jugador  → Elige un circuito (circuitos.html?modo=1) → Carrera (carrera.html?modo=1)
    │   └── 2 jugadores → Elige un circuito (circuitos.html?modo=2)
    │                     → Elegir jugadores (jugadores.html) → Carrera en pantalla dividida (carrera.html?modo=2)
    │          Carrera:
    │              ├── Cuenta regresiva 3·2·1·¡YA!
    │              ├── Aviso: ¡Fuera de pista!
    │              ├── Pausa  → Continuar / Reiniciar carrera / Ver controles / Volver al menú
    │              └── Resultados: Victoria · Derrota · Vehículo destruido
    ├── Garaje (garaje.html)
    ├── Armas (armas.html)
    ├── Pilotos (pilotos.html)
    ├── Pase de batalla (pase.html)
    ├── Tienda (tienda.html)
    └── Controles (controles.html)
```

Todas las pantallas internas tienen la misma barra superior: **← Volver al menú**, la ruta
(`Menú principal / Sección`), el saldo (💎 diamantes, ⚡ créditos) y el botón **Sonido**.
La tecla `Esc` siempre regresa un nivel (o pausa, dentro de la carrera).

## 2. Vocabulario controlado (antes → ahora)

| Fase 1 | Fase 2 | Motivo |
|---|---|---|
| Play | **Jugar** | Todo en español |
| Colección / GARAJE | **Garaje** | Un solo nombre por sección |
| Agentes / PILOTOS | **Pilotos** | Un solo nombre por sección |
| Base de Batalla (abría "pase") | **Pase de batalla** | El botón y la pantalla se llaman igual |
| GAME · Personalización Neón | **Pintura** | Describe lo que hace |
| Actualización · [A] Inspeccionar · [B] Turbo Prueba | **Vista previa** · **Girar 360°** · **Probar turbo** | Las letras A/B no decían nada |
| SFX: ON / OFF | **Sonido: activado / desactivado** | Lenguaje del usuario |
| SALIR AL LOBBY / ✕ | **Volver al menú** | Una sola acción para salir |
| REINICIAR PARTIDA | **Reiniciar carrera** | "Carrera" en todo el juego |
| INICIAR PARTIDA | **Iniciar carrera** | Ídem |
| ¡GO! | **¡YA!** | Español |
| ¡FUERA DE PISTA! RESCATANDO VEHÍCULO… | **¡Fuera de pista! Volviendo a la pista…** | Más claro |
| CP / Créditos (mezclados) | **Créditos ⚡** | Una moneda, un nombre |
| 💎 sin nombre / precios en $ | **Diamantes 💎** | Todo se compra con diamantes |
| Minigun, TIER S, Hacking, Skins | **Metralleta**, **Clase S**, **Interferencia**, **Pinturas** | Sin anglicismos |
| LV.48 | **NV. 48** | Español |

Estados que se repiten en las tarjetas: **En uso** / **Equipada** / **Elegido** (lo que tienes activo),
**Disponible**, **🔒 Bloqueado(a)**, **Comprado**, **Reclamada**.

## 3. Matriz de retroalimentación (mensajes y errores)

| Situación | Qué ve el jugador | Tipo |
|---|---|---|
| Elegir un vehículo, arma o piloto | Aviso verde: "Hyperion GT ahora está en uso." | Éxito |
| Intentar usar **Viper Stealth** | Aviso rojo: "No puedes usar Viper Stealth: alcanza el nivel 50…" | Error |
| Reclamar una recompensa de nivel mayor | Aviso rojo: "Aún no alcanzas el nivel 40. Tu nivel es 32." | Error |
| Comprar sin diamantes (Efecto Supernova) | Nota + aviso rojo: "Diamantes insuficientes: te faltan 💎 5.750…" | Error |
| Comprar con saldo | Diálogo **Confirmar compra** con saldo antes/después | Prevención |
| Reiniciar o abandonar la carrera | Diálogo **¿Reiniciar carrera?** / **¿Volver al menú?** | Prevención |
| Salir de la pista | Banner rojo "¡Fuera de pista!" y regresa solo | Recuperación |
| Chocar con picos | Destello rojo + baja el **Blindaje** (verde → amarillo → rojo) | Estado |
| Cambiar de ventana en plena carrera | Se abre **Pausa** automáticamente | Prevención |
| Se cae el internet | Aviso rojo: "Sin conexión a internet…" / verde al volver | Error |
| No carga el motor 3D (sin internet al abrir) | Pantalla **No se pudo cargar el motor gráfico** + **↻ Reintentar** | Error |
| Fin de carrera | **¡Victoria!** / **Derrota** / **Vehículo destruido** + tiempo + 💎 ganados | Resultado |

## 4. Jugabilidad

**Circuitos (cada uno con forma propia; la miniatura y la pista 3D salen de los mismos puntos):**

| Circuito | Forma | Lo especial |
|---|---|---|
| Neón Metrópolis | Curvas suaves con chicana en zigzag | 1 acelerador, edificios de neón |
| Cañón Cuántico | Hexágono con esquinas cerradas | 3 rampas de salto, rocas |
| Autopista Hiperespacio | Óvalo ancho | 4 aceleradores, rivales más rápidos |
| Hangar Industrial 09 | Forma de L, pista estrecha | Curvas de 90° y cajas de carga |

**Vehículos (modelo 3D y manejo distintos; los rivales usan los mismos modelos):**

| Vehículo | Tipo | Vel. máx. | Particularidad |
|---|---|---|---|
| Apex Phantom X | Deportivo | 172 km/h | Equilibrado |
| Marauder | Blindado | 152 km/h | Recibe 40 % menos daño |
| Hyperion GT | Fórmula | 198 km/h | Muy rápido, frágil |
| Viper Stealth | Sigilo | 185 km/h | Bloqueado (Pase nivel 50) |

**Armas:** Plasma (equilibrada), Láser (rápido y veloz), Misiles EMP (teledirigidos, frenan al rival 3,5 s), Metralleta (ráfaga con dispersión).

**Pilotos (tecla E):** Sobrecarga (turbo gratis y más fuerte), Puntería asistida (disparos teledirigidos), Escudo (inmune 4 s), Reparación (+40 % blindaje).

**En la pista:** turbo con energía limitada, objetos de turbo (+50 %) y reparación (+30 %), picos, rivales que esquivan obstáculos, saltan rampas y **te disparan**, posición en tiempo real (1.º–4.º) y 3 vueltas.

**Modo 2 jugadores (pantalla dividida):**

| | Jugador 1 (izquierda) | Jugador 2 (derecha) |
|---|---|---|
| Conducir | W A S D | Flechas |
| Turbo | Espacio | Shift derecho |
| Disparar | F o clic | Ctrl derecho (o punto) |
| Habilidad | E | Enter |
| Volver a la pista | R | Retroceso |

Cada jugador elige su vehículo, arma, piloto y pintura en **Elegir jugadores** (no se permite la misma pintura).
Los dos corren contra 3 rivales y pueden dispararse entre sí (la mitad del daño). Si un jugador es destruido, reaparece a los 3 s.
Gana quien complete primero las vueltas; la tabla de resultados muestra posición, vueltas, rivales destruidos y premio de cada uno.

## 5. Guion sugerido del video (máx. 2 min)

| Tiempo | Qué mostrar |
|---|---|
| 0:00–0:10 | Inicio → **Comenzar** |
| 0:10–0:30 | Menú principal: girar el auto, cambiar **Pintura**, **Probar turbo** |
| 0:30–0:50 | Garaje (usar vehículo + error de **Viper Stealth**) y Tienda (error de **saldo insuficiente**, compra con confirmación) |
| 0:50–1:30 | **Jugar** → elegir circuito → cuenta regresiva → conducir, disparar, chocar con picos, salir de la pista |
| 1:30–1:45 | **Pausa** (Esc) → Volver al menú → diálogo de confirmación |
| 1:45–2:00 | Pantalla de **Resultados** o error de conexión (desconectar Wi-Fi y recargar → **Reintentar**) |

## 6. Archivos

```
index.html  menu.html  circuitos.html  carrera.html  garaje.html
armas.html  pilotos.html  pase.html  tienda.html  controles.html
css/  base.css · inicio.css · menu.css · catalogo.css · carrera.css
js/   comun.js (estado, avisos, diálogos, errores) · audio.js · datos.js (vocabulario)
      auto3d.js (escena y vehículo) · menu.js · catalogo.js · carrera.js
fase1/index.html  ← versión original de la fase 1, sin cambios
```
