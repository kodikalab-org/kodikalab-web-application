# Integración de equipos (US-11 a US-14)

Fecha: 6 de noviembre de 2026. Rama conservada: origin/feature/us-luciano. Cambios exclusivamente locales del frontend, sin operaciones Git de publicación o integración.

## Implementado

- TeamFrame reutiliza TeamsApi.loadMine() y GET /teams/me. Presenta nombres de equipos del coach o membresías ACTIVO del practicante. Si existe una sola opción y no hay contexto previo, la selecciona; con varias opciones pide selección. Conserva teamId en las rutas entre ranking, temas, historial y avance. Cancela la carga del catálogo al destruir la pantalla.
- Ante catálogo vacío o error de /teams/me, informa la limitación y permite reintentar. Conserva la entrada de ID como alternativa explícita, sin generar IDs ni sustituir la autorización del servidor.
- Explorar grupos conserva los enlaces anteriores y añade acceso al ranking y al avance de las membresías activas con teamId del grupo real.

## Contratos y autorización revisados

Base `API_URL` de `develop` (JWT con Bearer, sin cookies), guard de rol, consulta de perfil y limpieza ante 401. La identidad no se envía como userId al registrar resoluciones.

| US | Contrato existente |
| --- | --- |
| 11 | GET /analytics/teams/{teamId}/standings; ranking, posiciones y último resultado válido suministrados por la API |
| 12 | GET /analytics/teams/{teamId}/weaknesses; cobertura, pendientes y empates suministrados por la API |
| 13 | GET/POST/PUT /competitions/{competitionId}/official-result; finalPosition, solvedProblems y confirm; GET /competitions/teams/{teamId}/official-results |
| 14 | GET /analytics/teams/{teamId}/progress/me; POST /competitions/teams/{teamId}/problems/{competitionProblemId}/resolutions con language y evidenceUrl |

El backend verifica usuario y membresía activa para ranking/progreso, y relación del coach con el equipo para temas/resultados. La configuración HTTP general permite solicitudes y las comprobaciones de estas historias están en sus servicios. No se cambió esa configuración ni se relajó ninguna validación.

## Limitaciones verificadas

- En esta copia del backend, StudyGroupController es una plantilla sin GetMapping/PostMapping. El frontend de US04 a US06 ya declara /teams/me, pero esta copia de Spring todavía no lo implementa. La selección automática se verificó con HTTP simulado y requiere la versión de backend que exponga ese contrato.
- No se encontraron listados implementados de competencias o problemas asignados para eliminar sus entradas manuales. US13 conserva la apertura por competitionId desde el historial confirmado, cuando existe; para nuevas participaciones y asignaciones manuales siguen siendo necesarios los IDs reales.
- No había servicios escuchando en 8080 ni 5432. GET http://127.0.0.1:4200/api/users/me devolvió 502. No se inició Spring: no había .env de ejecución ni variables DB configuradas y su ddl-auto=update podría escribir el esquema. No se modificó PostgreSQL ni el backend.
- No se verificaron login real, autorización real contra PostgreSQL ni escrituras de resultados/resoluciones. Se necesitan backend compatible, PostgreSQL configurado, cuentas y datos de prueba autorizados. No proporcionar credenciales por el chat; configurar el entorno local de forma privada.
- Se revisaron visualmente las cuatro historias, dashboard y login. La paleta global afecta toda la aplicación, pero no constituye una certificación visual de todas las combinaciones de estados de todas las historias del proyecto.

> Los resultados de pruebas y compilación de esta sección y de las siguientes son los de la rama original de Luciano y no se reproducen tras la integración con `develop`.

## Pruebas ejecutadas

- npm run build: correcto; 7 rutas prerenderizadas; paquete inicial 889.62 kB. Persiste el aviso de presupuesto de 500 kB, dentro del límite de error de 1 MB.
- TypeScript: tsconfig.app.json y tsconfig.spec.json con --noEmit correctos.
- npm test -- --watch=false: 260 casos aprobados y un único archivo fallido sin pruebas, src/app/pages/coach/asignarproblema/asignarproblema.spec.ts, preexistente y sin modificar.
- npm test -- --watch=false --exclude=src/app/pages/coach/asignarproblema/asignarproblema.spec.ts: 260 casos y 29 archivos aprobados, código 0. Se agregaron 11 casos respecto a los 249 anteriores: seis de tema, cuatro de catálogo y uno de enlaces de membresía.
- Los casos HTTP son simulaciones con HttpTestingController; no prueban que Spring/PostgreSQL estén conectados.
- git diff --check: correcto. No se añadieron dependencias.

## Archivos

Creados:
- docs/integracion-equipos-temas.md

Modificados:
- src/app/shared/team-frame.ts
- src/app/pages/grupos/explorar-grupos/explorar-grupos.html
- src/app/pages/grupos/grupos.spec.ts
- src/app/pages/rendimiento-equipo/rendimiento-equipo.html
- src/app/pages/team-live.spec.ts
- src/app/merge-integration.spec.ts


## Actualización: navegación completa con API real

Los bloqueos de listados descritos arriba corresponden al diagnóstico anterior. Esta versión usa GET /api/teams/me (en `develop`) y GET /api/competitions/teams/{teamId} y GET /api/competitions/teams/{teamId}/problems, que solo existen en la rama de backend `feature/US11-12-13-14` y no en `develop` del backend.

- La navegación Mi entrenamiento inicia ranking y avance del practicante, o ranking, rendimiento y resultados del coach, sin escribir URLs ni IDs.
- TeamFrame utiliza nombres de equipos y no ofrece entrada manual. Diferencia carga, fallo con reintento y lista vacía legítima.
- ResultsLive muestra competencias por nombre y estado. Solo consulta una competencia ofrecida para ese equipo; conserva el historial y bloquea edición de confirmados. Una consulta fallida de historial no se presenta como historial vacío.
- ProgressLive muestra competencia, letra y título del problema. Usa el competitionProblemId de la opción seleccionada; mantiene MANUAL_PROVISIONAL y las validaciones de registro existentes.
- Cambiar equipo elimina competitionId/competitionProblemId anteriores, limpia los formularios y cancela lecturas pendientes. Se conservan URLs con contexto para enlaces existentes.
- TeamsApi se reutiliza sin cambiar las operaciones de US04-US06.

Se agregaron regresiones de contratos, selección por nombre, vacíos, fallos de catálogo/historial, asignaciones distintas de un mismo problema y cancelación al cambiar equipo. El archivo vacío ajeno a estas historias sigue sin modificarse.

Las pruebas reales utilizaron exclusivamente kodikalab_us11_14_test y cuentas cuyas credenciales permanecen cifradas fuera de los repositorios. No hay datos ni IDs fijos de prueba en producción. No se hicieron operaciones Git.

Resultados finales de esta actualización: Angular compila (890.43 kB iniciales, aviso de presupuesto preexistente). Pasan 269 pruebas en 29 archivos al excluir únicamente el archivo vacío preexistente de asignarproblema; la ejecución general registra ese mismo fallo sin casos. Backend: 487 pruebas sin fallos, errores ni omitidas, y JAR empaquetado correctamente. Se verificaron 38 comprobaciones HTTP reales adicionales, guardado/confirmación desde el navegador y persistencia SQL: Alfa conserva 2 problemas aceptados y Beta pasa a 3; el duplicado no crea otra resolución. La base original no se utilizó.


## Verificación previa a la publicación del frontend

- Se eliminó el par repetido de enlaces de ranking y progreso en Explorar grupos. La prueba existente exige ahora un único enlace de cada tipo y conserva teamId.
- npm run build: correcto, 890.43 kB iniciales; continúa el aviso de presupuesto de 500 kB.
- npm test -- --watch=false: 269 casos aprobados; persiste únicamente el archivo vacío preexistente de asignarproblema.
- npm test -- --watch=false --exclude=src/app/pages/coach/asignarproblema/asignarproblema.spec.ts: 269 casos y 29 archivos aprobados. No hubo fallos nuevos.
- Navegador: ranking y progreso consultados con sesión real y datos existentes; no se registraron resoluciones ni resultados nuevos. Las vistas de coach se revisaron visualmente en demo; las validaciones y operaciones del cliente están cubiertas por las pruebas HTTP simuladas. Las pruebas reales anteriores permanecen documentadas arriba.
- Explorar grupos conserva un error de carga del listado general contra este backend; no se cambió esa operación ajena a estas historias. La corrección de enlaces tiene cobertura automatizada.
- Esta etapa modifica y publica exclusivamente el frontend. No se modifica el backend, PostgreSQL ni la configuración de autenticación.
