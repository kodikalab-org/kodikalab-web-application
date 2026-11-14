# Plan de implementación — cierre de frontend y backend

Fecha: 2026-11-14 · Repos: `kodikalab-web-application` (Angular 22, rama `develop`) y `kodikalab-web-services` (Spring Boot, `develop` = `main`).

Este plan parte de una auditoría del código de los dos repositorios. Línea base: el frontend compila y sus 674 pruebas (73 archivos) pasan; el backend tiene 70 clases de prueba. Lo que sigue son los defectos encontrados, las decisiones que hay que tomar y el trabajo ordenado por fases.

**Límite de la auditoría:** desde el entorno donde se hizo no hay salida a `codeforces.com`, `kenkoooo.com`, `atcoder.jp`, `vjudge.net` ni `cses.fi`. Todo lo que este plan afirma sobre esas plataformas viene de su documentación conocida y debe confirmarse en el spike de la fase 4 antes de comprometer fechas.

---

## 1. Diagnóstico

### 1.1 «Inicio sesión y la sesión se borra»

La sesión no se borra del almacenamiento en la mayoría de los casos: la aplicación **expulsa al login** por cuatro motivos distintos, todos reproducibles en el código.

| # | Causa | Evidencia | Efecto |
| --- | --- | --- | --- |
| A | `/progreso` y `/recursos` se prerenderizan como una redirección a `/login`. No están en la lista `RenderMode.Client` de `src/app/app.routes.server.ts`, y `accessGuard` devuelve `/login` cuando corre en servidor. | Tras `npm run build:vercel`, `dist/.../browser/progreso/index.html` y `recursos/index.html` son un `<meta http-equiv="refresh" content="0; url=/login">`. Vercel sirve el archivo antes de aplicar el rewrite. | Recargar o abrir directamente esas dos páginas lleva siempre al login, con sesión válida. |
| B | `vercel.json` reescribe todo a `/index.html`, que es la **landing prerenderizada** (127 kB, con marcas de hidratación), no el cascarón de la SPA (`index.csr.html`, 22 kB). | Mismo build. | En cualquier recarga de una ruta privada se pinta la landing y Angular hidrata otra ruta encima: parpadeo y estado inconsistente. |
| C | `accessGuard` llama a `GET /users/me` **en cada navegación** y, ante cualquier error que no sea 404 (timeout de 15 s, 5xx, red), redirige a `/login?motivo=conexion`. | `src/app/core/access-guard.ts:52-66`. El backend está en Render plan `free` (`render.yaml`), que duerme el servicio; el arranque en frío supera los 15 s. | Tras un rato de inactividad, el primer clic «cierra la sesión». Es la causa más probable de lo que se ve en producción. |
| D | El interceptor cierra la sesión ante **cualquier** 401 con token (`src/app/core/auth-interceptor.ts:22-26`). | El README ya documenta una excepción manual (`/auth/recovery-code`). | Cualquier endpoint futuro que responda 401 por un motivo de negocio borra la sesión. |

Problemas menores del mismo módulo (`src/app/core/session.ts`):

- `restore()` lee `sessionStorage ?? localStorage`; si la copia de `sessionStorage` venció pero la de `localStorage` es válida, `clearStorage()` borra las dos.
- Sin «Recordarme» la sesión vive en `sessionStorage`: una pestaña nueva no tiene sesión. Conviene sincronizar pestañas con el evento `storage`.
- El perfil del `README` dice que `fullName` no viene en `GET /users/me`; el contrato actual sí lo incluye. El menú de usuario sigue mostrando el correo y las iniciales fijas `KL` (`src/app/shared/user-menu/user-menu.ts`).
- No hay renovación de token: a las 24 h (`JWT_EXPIRATION`) la sesión termina sin aviso.

### 1.2 Cabeceras distintas

Existe un componente común (`src/app/shared/app-header/`), pero **siete pantallas dibujan su propia cabecera** con altura, logo, márgenes y buscador distintos:

| Pantalla | Diferencia |
| --- | --- |
| `pages/inicio-dashboard` | `bg-[#060414]/90`, borde `#2b2760`, sombra, buscador como menú |
| `pages/recursos-academicos` | alto 60 px en móvil, otro logo (`images/recursos/logo*.svg`), `lg:px-14`, sin buscador |
| `pages/practicante/perfil` y `perfil-editar` | buscador de 400 px como `<button>` |
| `pages/coach/perfil` y `perfil-editar` | buscador de 400 px como `<div role="search">` |
| `pages/practicante/plataformas-competitivas` | sin buscador, `mat-toolbar` suelto |
| `shared/team-frame.ts` (ranking, rendimiento, progreso por equipo, competencias) | copia en línea del header, pie propio «KodikaLab · Entrenamiento en equipo» |

Además hay **cuatro marcos de página** (`layouts/app-layout`, `pages/concursos/concursos-shell.ts`, `pages/grupos/grupos-marco`, `shared/team-frame.ts`) con fondos y anchos máximos distintos (1200, 1440 y 1600 px), y el buscador global es un adorno («Búsqueda global pendiente»).

### 1.3 Modo demo y maquetas

- El modo demo atraviesa **51 archivos**: rutas `/demo/*`, `demoGuard`, `Session.demo`, bloqueo en el interceptor, `src/app/data/*-demo.ts` (462 líneas) y ramas `session.demo()` en las pantallas.
- Los formularios de edición de perfil **inicializan sus controles con `USUARIO_DEMO`** (`pages/practicante/perfil-editar/perfil-editar.ts:121`), es decir, datos de ejemplo llegan a pantallas reales.
- Pantallas que siguen siendo maqueta aunque el backend ya tiene el endpoint o los datos:
  - `practicante/plataformas-competitivas`: usuario fijo `camila_rc`, «AtCoder · En mantenimiento», botón «Reintentar vinculación» sin acción. Hoy `accessGuard` la esquiva redirigiendo a `/perfil/editar#plataformas`.
  - `progreso-equipos`: alterna dos frames fijos.
  - `recursos-academicos`: «Maqueta estática».
  - `rendimiento-equipo`: la prioridad de temas no se guarda.
  - `competencias`: textos de maqueta y estados por `?estado=`.
  - `login`: vista estática `?estado=cuenta-deshabilitada` con un correo de ejemplo.
  - `inicio-dashboard`: menús «disponible próximamente».
  - Perfil: pestaña de actividad «pendiente de integración»; estadísticas de AtCoder y LeetCode con «datos de ejemplo».
- Archivo basura: `src/app/pages/practicante/aaaa.md`.

### 1.4 Envíos y veredictos

Hoy no existe envío de soluciones. `POST /competitions/teams/{teamId}/problems/{id}/resolutions` registra un **ACCEPTED autodeclarado** (`MANUAL_PROVISIONAL`): el practicante elige un lenguaje y pega una URL opcional. El veredicto no se comprueba contra ninguna plataforma, y el ranking se calcula sobre eso.

El backend ya consulta Codeforces (`CodeforcesApiClient`: `user.info`, `user.status`, `problemset.problems`, `contest.standings`), pero:

- `Verdict` solo tiene `PENDIENTE, ACCEPTED, WRONG_ANSWER, TLE, MLE, ERROR`.
- `CodeforcesSubmission` descarta el id del envío, el lenguaje, el tiempo y la memoria.
- El cliente serializa **todas** las llamadas con un candado global y 2 s de espera: con varios usuarios consultando a la vez se forma una cola.

### 1.5 Plataformas

`practicante` guarda `codeforces_handle`, `atcoder_handle` y `vjudge_handle`. Solo Codeforces se valida (existencia y rating); ninguno prueba que la cuenta sea del usuario. `SourcePlatform` incluye `CSES`, que no tiene handle. LeetCode aparece en la landing y en estadísticas, pero no está en el ERD.

### 1.6 Otros

- `SPEC.md` describe la fase de maquetas («no HTTP, no signals») y ya contradice el código.
- El presupuesto de `angular.json` avisa a 500 kB y el bundle inicial pesa 937 kB.
- Sin migraciones versionadas: local usa `ddl-auto=update`, producción `validate` y SQL manual en `docs/sdd/assets/`.
- Faltan endpoints para gestionar integrantes (expulsar, readmitir, listar activos): existen ramas `feature/US06-*` sin integrar en `develop`.

---

## 2. Decisiones que necesito de ti

Cada una trae mi recomendación; el plan está escrito asumiéndola.

### D1 — Cómo se envía una solución

Codeforces **no tiene API de envío** y protege el login y el formulario con Cloudflare. AtCoder tampoco tiene API. Hay tres caminos:

| Opción | Cómo funciona | Coste y riesgo |
| --- | --- | --- |
| **A. Archivo + veredicto verificado (recomendada)** | El practicante sube su archivo en KodikaLab; se guarda y se abre la página de envío de la plataforma. KodikaLab consulta la API y enlaza el envío real con su veredicto, tiempo, memoria y lenguaje. | Sin credenciales de terceros. El usuario elige el archivo dos veces (KodikaLab y Codeforces): el navegador no permite rellenar un formulario de otro dominio. |
| B. Juez remoto con cuentas bot (como VJudge) | El backend envía el archivo con cuentas de KodikaLab mediante un navegador sin interfaz. | Experiencia de un solo paso. Requiere un worker con Chromium (no cabe en Render `free`), se rompe cuando la plataforma cambia y puede incumplir sus condiciones de uso. Los envíos quedan a nombre del bot, no del practicante. |
| C. Sesión del usuario (cookies) | El usuario pega su cookie de sesión y el backend envía en su nombre. | KodikaLab custodia credenciales ajenas. Lo desaconsejo. |

Recomendación: **A ahora**, con la interfaz `JudgeGateway` preparada para añadir B después, solo si el spike demuestra que es estable.

### D2 — Qué pasa con el registro manual

Recomendación: eliminar el «marcar como resuelto» para Codeforces (el veredicto viene de la API) y dejarlo solo como respaldo para plataformas sin verificación automática, en estado `PENDIENTE` hasta que el coach lo apruebe.

### D3 — Plataformas a vincular

Recomendación: Codeforces, AtCoder y VJudge con verificación de propiedad; CSES solo como handle informativo; **retirar LeetCode** de la interfaz salvo que se añada al ERD.

### D4 — Backend en Render `free`

Recomendación: pasar a un plan sin suspensión, o aceptar el arranque en frío y que el frontend lo tolere (fase 1). Los sondeos de veredictos de la fase 4 no funcionan bien con un servicio que se duerme.

### D5 — Eliminar SSR

El despliegue real es estático (Vercel). Recomendación: **quitar SSR y prerender** (`server.ts`, `main.server.ts`, `app.routes.server.ts`, hidratación) y prerenderizar como mucho la landing. Elimina de raíz las causas A y B y la regla «no tocar `window`».

---

## 3. Fases

Orden por dependencia. Cada fase es un PR (o varios) contra `develop` en su repo, con pruebas.

### Fase 0 — Preparación (0,5 día)

- Reescribir `SPEC.md` y `README.md`: reglas reales (API, signals, guards), sin la sección «Demo».
- Borrar `src/app/pages/practicante/aaaa.md` y `PR-DESCRIPTION.md`.
- Backend: añadir **Flyway** con una migración base generada del esquema actual de producción; `ddl-auto=validate` en todos los perfiles. Todas las fases siguientes añaden su `V__*.sql`.
- Integrar o cerrar las ramas `feature/US06-*` del backend.

### Fase 1 — Sesión y despliegue (2 días) · **prioridad máxima**

Frontend:

1. **Despliegue.** Según D5: quitar SSR, o como mínimo añadir `progreso`, `progreso/**`, `ranking`, `recursos` a `RenderMode.Client` y cambiar el rewrite de `vercel.json` a `/index.csr.html`. Sustituir la lista manual por una regla: todo lo que no sea `''`, `login`, `registro` es cliente.
2. **`accessGuard`.** No pedir el perfil en cada navegación: usar `ProfileApi.profile()` si ya está cargado y refrescarlo en segundo plano. Ante timeout o 5xx **no redirigir al login**: mostrar una pantalla «Reconectando con el servidor…» con reintento automático (retroceso de 2, 4 y 8 s) y botón manual. Solo 401 lleva al login.
3. **Interceptor.** Cerrar sesión solo si el 401 trae `WWW-Authenticate: Bearer` (el backend ya lo envía para token ausente o inválido; hay que exponerlo en CORS con `Access-Control-Expose-Headers`). Guardar la URL de origen y volver a ella tras iniciar sesión (`?volver=`).
4. **`Session`.** Restaurar eligiendo la copia vigente más reciente; escuchar `storage` para propagar login y logout entre pestañas; quitar `demo`. Temporizador que avise 5 minutos antes del vencimiento.
5. **Login.** Subir el timeout a 60 s con mensaje «El servidor está despertando…» pasados 8 s. Redirigir a inicio si ya hay sesión. Sustituir la vista estática de cuenta deshabilitada por el manejo real del 403 `La cuenta no está habilitada`.
6. **Identidad.** Menú de usuario con `profile.fullName` e iniciales reales.

Backend:

7. `POST /auth/refresh`: con un token válido devuelve uno nuevo. El frontend lo llama cuando queda menos del 20 % de vigencia y hay actividad.
8. `GET /health` público y ligero, para despertar el servicio desde la pantalla de login.
9. CORS: exponer `WWW-Authenticate`.

Aceptación: recargar cualquier ruta privada conserva la sesión y la página; con el backend detenido 30 s no se llega al login; dos pestañas comparten sesión; una prueba e2e (Playwright) cubre login → recarga en `/progreso` → sigue dentro.

### Fase 2 — Retirar el modo demo (1,5 días)

1. Quitar rutas `demo/*`, `demoGuard`, `Session.demo/startDemo`, la rama demo del interceptor, los enlaces del login y del menú, y los avisos «Demostración: datos de ejemplo».
2. Sustituir cada `session.demo()` por el camino real; donde no hay datos, un estado vacío con acción («Aún no tienes equipos · Explorar grupos»).
3. Formularios de perfil: inicializar vacíos y rellenar con `ProfileApi.profile()`; borrar `simularRechazo` y los `?estado=` de maqueta.
4. Mover a `models/` los tipos y catálogos que hoy viven en `data/*-demo.ts` (por ejemplo `PLATAFORMAS_EDICION`) y borrar `src/app/data/`.
5. Actualizar las pruebas que usan demo (`access-guard.spec`, `session.spec`, `header-links.spec`, `interfaces-pendientes.spec`…).

Aceptación: `grep -ri demo src/app` solo devuelve coincidencias legítimas; ninguna pantalla muestra datos que no vengan de la API.

### Fase 3 — Marco único y sistema de diseño (4 días)

1. **Un solo `AppShell`** (cabecera, fondo, `<main>`, pie) como ruta padre de todas las rutas privadas; el rol sale de la sesión, no de `@Input() coach`. Se eliminan `app-layout`, `concursos-shell`, `grupos-marco` (como marco), el header de `team-frame` y los siete headers propios.
2. **Cabecera:** logo, navegación, buscador y menú de usuario idénticos en todas las pantallas; menú móvil único. El buscador se implementa (problemas, concursos y grupos sobre los endpoints existentes) o se quita: nada de controles decorativos.
3. **Tokens:** llevar a `src/styles.css` los colores escritos a mano (`#060414`, `#1b1840`, `#2b2760`, `#2f2b5e`, `#34304a`…), un ancho de contenido (`max-w-[1200px]` para lectura, `1440px` para tablas) y la escala tipográfica de títulos (hoy hay `h1` de 28, 32, 34 y 40 px).
4. **Componentes compartidos** en `shared/ui/`: `page-header` (migas, título, descripción, acciones), `state-block` (cargando, vacío, error con reintento), `status-badge`, `data-table`, `confirm-dialog`. Sustituyen los `<p role="status">Cargando…</p>` y los `<dialog>` nativos sueltos.
5. **Rutas:** agrupar bajo `AppShell` con `canActivateChild`; rol declarado en `data` en lugar de deducirlo del prefijo de la URL (`app.routes.ts:214`); una página 404 real en vez de redirigir `**` a la landing.
6. **Accesibilidad y rendimiento:** pasar `design:accessibility-review` (WCAG 2.1 AA) sobre el marco; cargar `login` y `registro` de forma diferida; bajar el bundle inicial de 937 kB al presupuesto de 500 kB.
7. Capturas de regresión visual (Playwright, 1440 px y 390 px) de cada pantalla, antes y después.

Aceptación: una sola definición de `<header>` en el repo; todas las pantallas privadas comparten cabecera y pie; sin desplazamiento horizontal a 360 px.

### Fase 4 — Plataformas y vinculación de cuentas (5 días)

**Spike (1 día, primero).** Con salida a internet, confirmar y documentar en `docs/sdd/`:

- Codeforces: `contest.status?contestId=&handle=&from=1&count=`, límite real de peticiones, soporte JSONP/CORS, comportamiento con concursos `gym` (requieren clave de API).
- AtCoder: disponibilidad y retraso de la API de **AtCoder Problems** (`kenkoooo.com/atcoder/resources/problems.json`, `problem-models.json`, `atcoder-api/v3/user/submissions?user=&from_second=`). Es la «mejor manera» frente al scraping: la mantiene la comunidad y evita analizar HTML. Comprobar también si `atcoder.jp/users/{handle}` y las páginas de envíos son accesibles sin sesión.
- VJudge: endpoints no oficiales (`/user/solveDetail/{handle}`) y si Cloudflare los bloquea desde el servidor.

Backend — nuevo paquete `integrations`:

```text
integrations/
├── PlatformGateway            # interfaz: findUser, recentSubmissions, problemCatalog, ownershipProof
├── codeforces/                # se mueve aquí el CodeforcesApiClient actual
├── atcoder/                   # cliente de AtCoder Problems + respaldo jsoup
├── vjudge/                    # cliente tolerante a fallos
└── RateLimitedExecutor        # una cola por plataforma, caché y reintentos
```

- Sustituir el candado global de `CodeforcesApiClient` por una cola por plataforma con caché corta (20–30 s por `(concurso, handle)`), de modo que varios usuarios mirando el mismo problema compartan una llamada.
- Tabla `cuenta_plataforma` (`practicante_id`, `plataforma`, `handle`, `estado`, `token_verificacion`, `token_expira`, `verificada_en`, `rating`, `ultima_sincronizacion`), única por `(plataforma, handle)`. Migrar los tres handles actuales con estado `NO_VERIFICADA`. Los campos del perfil se mantienen como lectura para no romper el contrato.
- Endpoints:

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/users/me/platforms` | Estado de cada plataforma |
| `PUT` | `/users/me/platforms/{platform}` | Guardar handle; comprueba que existe |
| `POST` | `/users/me/platforms/{platform}/verification` | Inicia el reto y devuelve instrucciones |
| `POST` | `/users/me/platforms/{platform}/verification/check` | Comprueba el reto |
| `DELETE` | `/users/me/platforms/{platform}` | Desvincular |
| `GET` | `/users/me/platforms/{platform}/stats` | Estadísticas (generaliza `/users/me/codeforces/stats`) |

- Prueba de propiedad, sin pedir contraseñas:
  - **Codeforces:** enviar un error de compilación a un problema indicado dentro de 10 minutos; se detecta con `user.status`.
  - **AtCoder:** poner un código temporal en el campo «Affiliation» del perfil público.
  - **VJudge:** código temporal en un campo público del perfil; si el spike muestra que no es legible, queda como `NO_VERIFICABLE` con aprobación del coach.
- Catálogo: importar problemas de AtCoder desde AtCoder Problems igual que hoy con Codeforces (`/problems/atcoder/search`, `/problems/atcoder/import`), con dificultad estimada y enlace.

Frontend:

- Rehacer `practicante/plataformas-competitivas` con datos reales: una tarjeta por plataforma con estado (sin vincular, pendiente, verificada, error), asistente de verificación paso a paso, rating y última sincronización. Quitar la redirección del guard y la sección duplicada de `perfil-editar`.
- Onboarding (`onboarding/plataformas`): mismo componente, con la verificación como paso opcional.
- Estadísticas del perfil: pestañas solo para plataformas vinculadas; quitar LeetCode (D3).

Aceptación: un practicante vincula y verifica Codeforces de principio a fin; un handle ya verificado por otra cuenta se rechaza con 409; si la plataforma no responde, el perfil se guarda y el estado queda `PENDIENTE` con reintento.

### Fase 5 — Envíos por archivo y veredictos reales (6 días)

Modelo (migración sobre `resolucion_problema`):

- Columnas nuevas: `origen` (`PLATAFORMA`, `MANUAL`), `id_envio_externo`, `nombre_archivo`, `codigo_fuente` (texto, máx. 64 kB), `sha256`, `estado_sincronizacion` (`ESPERANDO_ENVIO`, `EN_COLA`, `VEREDICTO_FINAL`, `CADUCADO`), `pruebas_superadas`.
- `Verdict` añade `COMPILATION_ERROR`, `RUNTIME_ERROR`, `EN_EVALUACION`, `OTRO`; mapa explícito desde los veredictos de Codeforces (`OK`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TESTING`…).
- Único por `(plataforma, id_envio_externo)` para no importar dos veces el mismo envío.

Endpoints:

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/problems/assigned/{id}/submissions` (multipart: `file`, `language`) | Crea el envío en `ESPERANDO_ENVIO`; devuelve `submissionId` y `submitUrl` |
| `GET` | `/problems/assigned/{id}/submissions` | Mis envíos en KodikaLab para ese problema |
| `GET` | `/submissions/{id}` | Estado y veredicto; dispara la sincronización si está pendiente |
| `GET` | `/submissions/{id}/source` | Descarga el archivo (autor y coach del equipo) |
| `GET` | `/problems/assigned/{id}/platform-submissions?scope=me\|all&count=10` | **Últimos 10 envíos del problema en Codeforces** |

Reglas:

- Validar extensión (`.cpp .c .py .java .kt .rs .js .go`), tamaño (64 kB, el límite de Codeforces), UTF-8 y que la competencia esté `EN_CURSO` o `FINALIZADA` según la regla de práctica. Límite de envíos por minuto.
- Exigir cuenta **verificada** de la plataforma del problema (fase 4): es lo que garantiza que el veredicto es del practicante.
- Sincronización: `contest.status?contestId=X&handle=H&from=1&count=10`, filtrado por índice del problema; el envío de KodikaLab se enlaza con el primer envío externo posterior a la subida, del mismo problema. Mientras el veredicto sea `TESTING` se sigue consultando; a los 15 minutos sin envío externo pasa a `CADUCADO`.
- «Últimos 10»: `scope=me` usa la llamada anterior; `scope=all` usa `contest.status` sin handle y filtra por índice. Respuesta: id, autor, lenguaje, veredicto, pruebas superadas, tiempo, memoria, fecha y enlace al envío.
- El ranking y los standings (`CompetitionStandingsServiceImpl`, `RankingService`) pasan a contar solo veredictos verificados; los manuales cuentan cuando el coach los aprueba (D2). Penalización ICPC con los intentos fallidos reales.
- AtCoder: mismo flujo, con AtCoder Problems como fuente. Su rastreo llega con minutos de retraso: la interfaz lo dice («AtCoder puede tardar unos minutos en reflejar el veredicto»). Si el spike muestra que no es viable, AtCoder usa el respaldo manual con aprobación.
- `JudgeGateway.submit()` queda como punto de extensión para la opción B.

Frontend — pantalla del problema (`practicante/problemas-asignados/components/problema-elegido`) y vista de concurso (`concursos/concurso-detalle`):

1. **Panel «Enviar solución»:** zona para soltar o elegir archivo, lenguaje detectado por extensión y editable, vista previa del código, botón «Enviar». Tras subirlo: pasos visibles — «1. Archivo guardado → 2. Envíalo en Codeforces (botón que abre la página de envío) → 3. Esperando veredicto».
2. **Resultado por archivo:** tarjeta del envío con nombre del archivo, lenguaje, veredicto, pruebas superadas, tiempo, memoria y enlaces (envío en la plataforma y descarga del archivo). Sondeo cada 5 s mientras esté pendiente, con retroceso y botón «Comprobar ahora».
3. **Tabla «Últimos 10 envíos»** con pestañas «Míos» y «Recientes en Codeforces», estilo tabla de estado de Codeforces, con actualización manual.
4. **Historial** de mis envíos en KodikaLab con su archivo.
5. Vista del coach: envíos del equipo por problema, con acceso al código y aprobación de los manuales.
6. Retirar `registro-problemas-resueltos` como flujo principal (D2).

Aceptación: subo `a.cpp`, lo envío en Codeforces y en menos de 30 s veo en KodikaLab el veredicto real enlazado a ese archivo; la tabla muestra los últimos 10 envíos del problema; un WA cuenta como intento y penaliza; los standings cambian sin recargar.

### Fase 6 — Conectar lo que falta (4 días)

| Pantalla | Trabajo |
| --- | --- |
| `progreso-equipos` | Conectar a `GET /analytics/teams/{id}/progress/me` y a los problemas asignados |
| `rendimiento-equipo` | Persistir la prioridad de temas: `PUT /analytics/teams/{id}/topic-priorities` (nuevo) |
| `competencias` | Quitar estados por `?estado=`; flujo real de resultados oficiales |
| `recursos-academicos` | `GET /materials` (nuevo; la entidad `Material` ya existe) y alta por el coach |
| `inicio-dashboard` | Sustituir los menús «próximamente» por datos: próximos concursos, problemas pendientes, solicitudes |
| Perfil | Pestaña de actividad con los envíos de la fase 5 |
| Grupos | Listar, expulsar y readmitir integrantes (ramas `US06-*`) |
| Pie y landing | Términos y privacidad reales o quitar los enlaces; retirar testimonios «de ejemplo» |

### Fase 7 — Calidad y salida (3 días)

- **E2E con Playwright** sobre backend real con Testcontainers: registro → onboarding → vincular Codeforces (cliente simulado) → unirse a un grupo → concurso → envío → veredicto → standings; y el recorrido del coach.
- Backend: pruebas de contrato de los endpoints nuevos y de los clientes externos con WireMock, incluidos timeouts, 429 y HTML inesperado.
- **CI en GitHub Actions** en los dos repos (build, pruebas, lint); hoy no hay.
- Seguridad: revisar la subida de archivos (tamaño, tipo, nunca se ejecuta ni se sirve como HTML), límites por usuario, cabeceras CSP en Vercel, y `security-review` sobre el diff.
- Observabilidad: registros estructurados de las integraciones y métrica de fallos por plataforma; `GET /health` con el estado de cada una.
- Actualizar `docs/sdd/03-api-contracts.md`, el ERD y el README de ambos repos.

---

## 4. Estimación y orden

| Fase | Días | Depende de |
| --- | --- | --- |
| 0 Preparación | 0,5 | — |
| 1 Sesión y despliegue | 2 | 0 |
| 2 Retirar demo | 1,5 | 1 |
| 3 Marco y diseño | 4 | 2 |
| 4 Plataformas | 5 | 0 (el spike puede empezar ya) |
| 5 Envíos | 6 | 4 |
| 6 Conectar lo que falta | 4 | 3 |
| 7 Calidad y salida | 3 | todas |

Total: unos **26 días-persona**. Con dos personas —una en las fases 1→2→3→6 (frontend) y otra en 0→4→5 (backend e integraciones)— son unas tres semanas y media.

## 5. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las plataformas cambian o bloquean al servidor (Cloudflare, límites) | Todo pasa por `PlatformGateway` con caché y degradación a estado `PENDIENTE`; el spike decide el alcance de AtCoder y VJudge antes de construir |
| El límite de Codeforces (una petición cada 2 s por IP) no escala con sondeos | Caché compartida por `(concurso, handle)`, sondeo iniciado por el usuario y no por un cron, y como alivio mostrar la tabla de «recientes» desde el navegador si JSONP está disponible |
| Enlazar un envío externo con el archivo equivocado | Se exige cuenta verificada y se enlaza por problema, ventana de tiempo y lenguaje; el coach puede ver el código subido |
| Migrar `resolucion_problema` con datos en producción | Flyway, columnas nuevas anulables, los registros actuales pasan a `origen = MANUAL` |
| Render `free` duerme el backend | D4; la fase 1 hace que el frontend lo tolere |
