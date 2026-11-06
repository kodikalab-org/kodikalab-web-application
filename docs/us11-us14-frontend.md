# Frontend US-11 a US-14

> Nota de integración con `develop` (6 de noviembre de 2026). Este informe lo redactó Luciano sobre una base anterior de `develop`. Al integrarlo se descartó lo que contradice el comportamiento actual: autenticación por cookie (sin token), `API_URL=/api` con `proxy.conf.json`, nuevo `Session.authenticated()`, la recuperación de contraseña por código en el interceptor, el selector de tema claro/oscuro con `theme.css`, la franja global de navegación del componente raíz, el cambio de versiones de `package.json` y el cambio de `pendingRequests` a opcional. Las secciones siguientes que los mencionan describen la rama original y no el estado integrado. En `develop` la sesión sigue usando JWT con cabecera `Authorization: Bearer`, el backend no usa cookies y la URL base de la API es la de `API_URL`.

## Estado de entrega

Código implementado y compilado. Los 248 casos de pruebas ejecutables pasan. La suite global conserva un fallo preexistente por un archivo sin tests. Integración real y comparación visual completa pendientes; no declarar listo para producción. Rama comprobada: origin/feature/us-luciano. Backend exclusivamente leído; git status limpio al finalizar las verificaciones.

## Fases iniciales (antes de corregir las dependencias)

1. Preparación: npm ci --no-audit --no-fund falló antes de instalar por ERESOLVE. El bloqueo fija @angular/core 22.2.4 y @angular/common 22.2.3 que exige core 22.2.3. No se modificaron package.json/package-lock.json, no se usó force/legacy-peer-deps ni se actualizó npm. Compilación inicial bloqueada por la misma falta de dependencias. Se configuró proxy de desarrollo y compatibilidad de cookies.
2. US-11: RankingLive consulta standings; conserva orden y puestos, NO_ACTIVITY, conflictos y lastValidRanking fechado sin ocultar el error. No calcula posiciones ni datos de actualización inventados.
3. US-12: TopicsLive consulta weaknesses, presenta todos los temas y mínimos del servidor, pendientes, participación y explicación exacta. No añade filtros de 30 días, promedio global ni persistencia de prioridades.
4. US-13: ResultsLive consulta detalle e historial, crea pendientes, actualiza pendientes y confirma. Confirmados bloqueados. Tras fallo de escritura requiere consultar antes de reintentar (un timeout puede ocurrir después del commit). El historial incluye solo lo que devuelve la API de confirmados.
5. US-14: ProgressLive consulta avance y registra por competencia_problema. Expone MANUAL_PROVISIONAL; no inventa juez, porcentaje, asignados ni actividad histórica. Protege doble envío y descarta respuestas de contextos anteriores.
6. Verificación: git diff --check correcto. Revisión sintáctica auxiliar con TypeScript 6.0.3 ya disponible globalmente: sin errores de sintaxis. Esto NO es comprobación de tipos/plantillas ni reemplaza al compilador local. npm run build y npm test dirigidos se intentaron: ambos fallaron porque no se encuentra @angular/build, sin ejecutar tests. No se arrancó API/PostgreSQL ni se modificaron datos. No se pudo realizar revisión visual en navegador ni generar capturas de la implementación.

## Contratos conectados

| Historia | Métodos y rutas (base /api) |
| --- | --- |
| US-11 | GET /analytics/teams/{teamId}/standings |
| US-12 | GET /analytics/teams/{teamId}/weaknesses |
| US-13 | POST/PUT/GET /competitions/{competitionId}/official-result; GET /competitions/teams/{teamId}/official-results |
| US-14 | GET /analytics/teams/{teamId}/progress/me; POST /competitions/teams/{teamId}/problems/{competitionProblemId}/resolutions |
| Listados (US-13, US-14) | GET /teams/me; GET /competitions?teamId= (items con id, eventName, status, startsAt, endsAt, problemsCount); GET /problems/assigned?teamId= (items con competitionProblemId, letter, competition.id/name/status, problem.id/title) |

Los endpoints GET /competitions/teams/{teamId} y GET /competitions/teams/{teamId}/problems ya no existen en el backend. TeamApi.competitions y TeamApi.assignments consumen los listados de develop y los aplanan a TeamCompetition (competitionId = item.id) y AssignedProblem (competitionProblemId = item.competitionProblemId, el identificador que exige el registro de resoluciones). GET /teams/me devuelve todos los estados de membresía; la pantalla solo ofrece membresías ACTIVO o, para el coach, sus grupos que no están en BORRADOR.

## Navegación y contexto real

Se conservan /ranking, /coach/rendimiento, /coach/competencias y /progreso/equipos. Se agrega /coach/ranking para el coach autorizado. Ejemplos de forma (los IDs son ilustrativos, deben existir en la API): /ranking?teamId=<id>, /coach/competencias?teamId=<id>&competitionId=<id>, /progreso/equipos?teamId=<id>&competitionProblemId=<id>.

El selector de equipo se llena con GET /teams/me, y las competencias y asignaciones de cada equipo vienen de GET /competitions?teamId= y GET /problems/assigned?teamId=. No se usan IDs por defecto.

Comportamiento por historia: US-11 muestra los criterios orderingCriterion y tieCriterion de la respuesta (el de empate solo cuando hay posiciones compartidas). US-13 explica con un mensaje propio que la competencia ya tiene un resultado registrado cuando el alta devuelve 409. US-14 carga el avance y los problemas asignados de forma independiente (el fallo de uno no oculta al otro) e ignora respuestas cuyo teamId no coincide con el equipo seleccionado. Sin conexión se usa el mensaje habitual de apiError. La API valida autorización; introducir un ID no concede permisos. No se implementaron flujos de otras historias para suplir estos listados.

Las cuatro maquetas existentes permanecen exclusivamente bajo Session.demo() con franja visible de datos de ejemplo; no se llaman endpoints en demo. Los datos estáticos no se presentan como integración real. El guard del coach y las validaciones del backend conservan el límite de acceso. El selector no permite cambiar contexto durante un envío; también se ignoran respuestas tardías al navegar a otro equipo.

## Autenticación y comunicación

Se reutiliza la sesión de `develop`: JWT en `Authorization: Bearer` (solo hacia `API_URL`), 401 protegido limpia la sesión y redirige al login, el modo demo bloquea cualquier llamada a la API. Las pantallas reales de equipo consultan la API solo con sesión real; la demo conserva las maquetas con datos de ejemplo.

## Diferencias frente a Figma

Referencias MCP consultadas (archivo prt67vzvXGvuuIORZvSH3A): 416:6178, 416:6250, 416:9235 y 416:6322; contexto visual y capturas obtenidos en lectura. Se reutilizan tipografías/tokens globales, Angular Material y recursos locales de progreso-ranking. Se mantienen layouts flex/grid adaptables. La fidelidad final de escritorio/móvil queda pendiente de navegador cuando se resuelvan las dependencias.

- El backend no lista nombres de equipo: se identifica el contexto por ID.
- Ranking: no hay fecha actual, usuario propio identificable por ID desde el login ni indicador total equivalente a la maqueta. Se omiten cifras no disponibles. La fecha anterior solo se usa si llega en lastValidRanking.
- Temas: no hay filtro temporal de 30 días, cobertura global ni endpoint Guardar prioridad. Solo se presentan indicadores y mínimos exactos retornados, sin sumarlos entre temas.
- Oficiales: no se envían nombre, fecha, total de equipos, total de problemas ni respaldo. Nombre y fecha se muestran al consultar si vienen del resultado. Solo finalPosition, solvedProblems y confirm son editables.
- Progreso: no hay lista de actividad, porcentaje o total asignado. Se muestra acceptedProblems y registro manual provisional con lenguaje y evidencia opcional.

## Pruebas añadidas (ejecutadas tras corregir dependencias)

team-api.spec.ts verifica ocho operaciones HTTP, cuerpos permitidos, errores y validación de IDs. team-live.spec.ts cubre empate, NO_ACTIVITY, snapshot con error, aislamiento entre equipos, mínimos temáticos, permisos, indisponibilidad, oficiales, confirmación, registro manual y duplicados. session.spec.ts se amplió con login sin JWT, credenciales y 401 de cookies. Los tests previos de maquetas permanecen y siguen usando demo.

Comandos pendientes con dependencias válidas:

    npm run build
    npm test -- --watch=false --include=src/app/core/team-api.spec.ts --include=src/app/pages/team-live.spec.ts --include=src/app/core/session.spec.ts
    npm test -- --watch=false

La suite global además contiene el archivo preexistente vacío src/app/pages/coach/asignarproblema/asignarproblema.spec.ts; no se alteró por ser ajeno a estas historias.

## Archivos creados

- `proxy.conf.json`
- `src/app/core/team-api.spec.ts`
- `src/app/core/team-api.ts`
- `src/app/pages/competencias/results-live.ts`
- `src/app/pages/progreso-equipos/progress-live.ts`
- `src/app/pages/ranking-equipo/ranking-live.ts`
- `src/app/pages/rendimiento-equipo/topics-live.ts`
- `src/app/pages/team-live.spec.ts`
- `src/app/shared/team-frame.ts`
- `src/app/shared/team-page.ts`
- docs/us11-us14-frontend.md (este informe).

## Archivos modificados

- `angular.json`
- `src/app/app.config.ts`
- `src/app/app.routes.ts`
- `src/app/core/access-guard.ts`
- `src/app/core/auth-interceptor.ts`
- `src/app/core/session.spec.ts`
- `src/app/core/session.ts`
- `src/app/pages/competencias/competencias.html`
- `src/app/pages/competencias/competencias.ts`
- `src/app/pages/progreso-equipos/progreso-equipos.html`
- `src/app/pages/progreso-equipos/progreso-equipos.ts`
- `src/app/pages/ranking-equipo/ranking-equipo.html`
- `src/app/pages/ranking-equipo/ranking-equipo.ts`
- `src/app/pages/rendimiento-equipo/rendimiento-equipo.html`
- `src/app/pages/rendimiento-equipo/rendimiento-equipo.ts`

## Verificación posterior a la autorización de dependencias

- Se fijaron framework, compiler-cli, CLI, build y SSR en 22.2.4. CDK/Material conservan 22.2.5, cuyo rango peer admite Angular 22.2.4.
- Solo seis resoluciones cambiaron de versión en el bloqueo: common, compiler, compiler-cli, forms, platform-browser y platform-server; todas de 22.2.3 a 22.2.4. No se actualizaron otras dependencias.
- npm install/update con el bloqueo obsoleto devolvieron ERESOLVE. Se corrigieron las entradas de Angular a partir de los metadatos e integridades del registro npm oficial; npm ci estricto terminó con 366 paquetes instalados. No se usaron force ni legacy-peer-deps.
- npm ls de todos los paquetes Angular directos: correcto, sin dependencias inválidas.
- npm run build: correcto, browser + servidor y 10 rutas prerenderizadas. Advertencia de presupuesto inicial: 873.34 kB frente a 500 kB de aviso; no se elevaron ni ocultaron los presupuestos.
- TypeScript local 6.0.3: tsc --noEmit -p tsconfig.app.json y tsconfig.spec.json correctos.
- Primera suite: dos pruebas de la maqueta de US-13 fallaban porque la franja demo usaba role=status y ocultaba en los selectores el estado de la operación. Se cambió solo la franja a role=note; no se debilitaron las pruebas.
- Suite final completa npm test -- --watch=false: 248 casos aprobados, 27 archivos aprobados y un archivo fallido sin casos: src/app/pages/coach/asignarproblema/asignarproblema.spec.ts. Sigue vacío y sin modificar por pertenecer a otra historia.
- Ejecución explícita excluyendo únicamente ese archivo vacío: 248/248 casos y 27/27 archivos correctos, proceso terminado con código 0.
- git diff --check correcto. Se formatearon únicamente los nuevos archivos TypeScript.
- Frontend arrancado en 127.0.0.1:4200. En navegador se comprobó que /ranking?teamId=1 sin sesión redirige a /login. No se introdujeron credenciales ni se relajaron guards.
- No se verificó SQL, login real ni operaciones contra Spring/PostgreSQL. No se arrancó ni modificó el backend. Sin una sesión y datos reales no se completó la revisión visual de las cuatro pantallas; las capturas previas de Figma son referencias, no capturas de implementación.
- Sigue siendo necesario configurar reverse proxy en producción, disponer de IDs reales y del backend ejecutándose; no hay endpoints de listados ni logout/recovery contratados en esta versión.

## Archivos finales para revisión

Modificados:

- angular.json
- package-lock.json
- package.json
- src/app/app.config.ts
- src/app/app.routes.ts
- src/app/core/access-guard.ts
- src/app/core/auth-interceptor.ts
- src/app/core/session.spec.ts
- src/app/core/session.ts
- src/app/pages/competencias/competencias.html
- src/app/pages/competencias/competencias.ts
- src/app/pages/progreso-equipos/progreso-equipos.html
- src/app/pages/progreso-equipos/progreso-equipos.ts
- src/app/pages/ranking-equipo/ranking-equipo.html
- src/app/pages/ranking-equipo/ranking-equipo.ts
- src/app/pages/rendimiento-equipo/rendimiento-equipo.html
- src/app/pages/rendimiento-equipo/rendimiento-equipo.ts

Creados:

- docs/us11-us14-frontend.md
- proxy.conf.json
- src/app/core/team-api.spec.ts
- src/app/core/team-api.ts
- src/app/pages/competencias/results-live.ts
- src/app/pages/progreso-equipos/progress-live.ts
- src/app/pages/ranking-equipo/ranking-live.ts
- src/app/pages/rendimiento-equipo/topics-live.ts
- src/app/pages/team-live.spec.ts
- src/app/shared/team-frame.ts
- src/app/shared/team-page.ts

Sin commits, push, pull, merges, rebases, cambios de rama ni Pull Requests. Todos los cambios permanecen locales para revisión.
