# Integración de equipos y temas de apariencia

Fecha: 6 de noviembre de 2026. Rama conservada: origin/feature/us-luciano. Cambios exclusivamente locales del frontend, sin operaciones Git de publicación o integración.

## Implementado

- Theme centraliza el tema en data-theme del documento. Respeta prefers-color-scheme inicialmente, escucha cambios del sistema mientras no exista elección explícita y guarda la selección en localStorage con la clave kodikalab.theme. Si el almacenamiento está bloqueado, permite cambiar el tema en memoria. No lee almacenamiento durante SSR.
- Selector accesible en el componente raíz, disponible en páginas públicas y privadas, con aria-label y aria-pressed. El menú de apariencia existente del dashboard usa el mismo servicio. El cambio no recarga la página.
- src/theme.css contiene la paleta clara, ajustes de Angular Material y compatibilidad de colores fijos ya existentes. Los ajustes se limitan a data-theme=light, preservando la paleta oscura. Conserva los recursos SVG existentes y reduce la intensidad de las decoraciones oscuras en claro. Se adapta el color de advertencia de las barras de rendimiento a una variable.
- TeamFrame reutiliza TeamsApi.loadMine() y GET /teams/me. Presenta nombres de equipos del coach o membresías ACTIVO del practicante. Si existe una sola opción y no hay contexto previo, la selecciona; con varias opciones pide selección. Conserva teamId en las rutas entre ranking, temas, historial y avance. Cancela la carga del catálogo al destruir la pantalla.
- Ante catálogo vacío o error de /teams/me, informa la limitación y permite reintentar. Conserva la entrada de ID como alternativa explícita, sin generar IDs ni sustituir la autorización del servidor.
- Explorar grupos conserva los enlaces anteriores y añade acceso al ranking y al avance de las membresías activas con teamId del grupo real.

## Contratos y autorización revisados

Base /api y proxy de desarrollo a localhost:8080. Se conservan cookies con withCredentials y la compatibilidad JWT previa, el guard de rol, consulta de perfil, limpieza ante 401 y tratamiento de 403. La identidad no se envía como userId al registrar resoluciones.

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
- Se consultó Figma en solo lectura, archivo prt67vzvXGvuuIORZvSH3A, referencia oscura 416:6178. La paleta clara es una adaptación de los tokens existentes; no se presenta como un diseño claro aprobado en Figma.
- Se revisaron visualmente las cuatro historias, dashboard y login. La paleta global afecta toda la aplicación, pero no constituye una certificación visual de todas las combinaciones de estados de todas las historias del proyecto.

## Pruebas ejecutadas

- npm run build: correcto; 7 rutas prerenderizadas; paquete inicial 889.62 kB. Persiste el aviso de presupuesto de 500 kB, dentro del límite de error de 1 MB.
- TypeScript: tsconfig.app.json y tsconfig.spec.json con --noEmit correctos.
- npm test -- --watch=false: 260 casos aprobados y un único archivo fallido sin pruebas, src/app/pages/coach/asignarproblema/asignarproblema.spec.ts, preexistente y sin modificar.
- npm test -- --watch=false --exclude=src/app/pages/coach/asignarproblema/asignarproblema.spec.ts: 260 casos y 29 archivos aprobados, código 0. Se agregaron 11 casos respecto a los 249 anteriores: seis de tema, cuatro de catálogo y uno de enlaces de membresía.
- Los casos HTTP son simulaciones con HttpTestingController; no prueban que Spring/PostgreSQL estén conectados.
- Navegador real: cuatro historias demo en escritorio 1440x1000 y móvil 390x844, en claro y oscuro; sin desbordamiento horizontal móvil observado. Capturas completas fuera del repositorio. Se comprobó cambio sin recarga, persistencia al recargar y uso del menú de apariencia del dashboard. Sin errores de consola observados en la consulta final del navegador.
- Contraste de paleta clara calculado: texto secundario/blanco 6.80:1, enlace/blanco 7.87:1, blanco/botón principal 6.45:1, error/blanco 6.48:1 e indicador de advertencia/fondo neutro 4.67:1. No equivale a una auditoría automática exhaustiva de accesibilidad de todas las pantallas.
- git diff --check: correcto. No se añadieron dependencias.

## Archivos

Creados:
- src/app/core/theme.ts
- src/app/core/theme.spec.ts
- src/theme.css
- docs/integracion-equipos-temas.md

Modificados:
- src/app/app.ts
- src/app/app.html
- src/styles.css
- src/app/shared/team-frame.ts
- src/app/pages/inicio-dashboard/inicio-dashboard.ts
- src/app/pages/inicio-dashboard/inicio-dashboard.html
- src/app/pages/grupos/explorar-grupos/explorar-grupos.html
- src/app/pages/grupos/grupos.spec.ts
- src/app/pages/rendimiento-equipo/rendimiento-equipo.html
- src/app/pages/team-live.spec.ts
- src/app/merge-integration.spec.ts


## Actualización: navegación completa con API real

Los bloqueos de listados descritos arriba corresponden al diagnóstico anterior. Ahora están implementados GET /api/teams/me, GET /api/competitions/teams/{teamId} y GET /api/competitions/teams/{teamId}/problems.

- La navegación Mi entrenamiento inicia ranking y avance del practicante, o ranking, rendimiento y resultados del coach, sin escribir URLs ni IDs.
- TeamFrame utiliza nombres de equipos y no ofrece entrada manual. Diferencia carga, fallo con reintento y lista vacía legítima.
- ResultsLive muestra competencias por nombre y estado. Solo consulta una competencia ofrecida para ese equipo; conserva el historial y bloquea edición de confirmados. Una consulta fallida de historial no se presenta como historial vacío.
- ProgressLive muestra competencia, letra y título del problema. Usa el competitionProblemId de la opción seleccionada; mantiene MANUAL_PROVISIONAL y las validaciones de registro existentes.
- Cambiar equipo elimina competitionId/competitionProblemId anteriores, limpia los formularios y cancela lecturas pendientes. Se conservan URLs con contexto para enlaces existentes.
- TeamsApi se reutiliza sin cambiar las operaciones de US04-US06. pendingRequests pasa a opcional porque este modelo de backend no contiene solicitudes; no se fabrica un cero.
- Se conservan los temas y los estilos compartidos del cambio anterior.

Se agregaron regresiones de contratos, selección por nombre, vacíos, fallos de catálogo/historial, asignaciones distintas de un mismo problema y cancelación al cambiar equipo. El archivo vacío ajeno a estas historias sigue sin modificarse.

Las pruebas reales utilizaron exclusivamente kodikalab_us11_14_test y cuentas cuyas credenciales permanecen cifradas fuera de los repositorios. No hay datos ni IDs fijos de prueba en producción. No se hicieron operaciones Git.

Resultados finales de esta actualización: Angular compila (890.43 kB iniciales, aviso de presupuesto preexistente). Pasan 269 pruebas en 29 archivos al excluir únicamente el archivo vacío preexistente de asignarproblema; la ejecución general registra ese mismo fallo sin casos. Backend: 487 pruebas sin fallos, errores ni omitidas, y JAR empaquetado correctamente. Se verificaron 38 comprobaciones HTTP reales adicionales, guardado/confirmación desde el navegador y persistencia SQL: Alfa conserva 2 problemas aceptados y Beta pasa a 3; el duplicado no crea otra resolución. La base original no se utilizó.


## Verificación previa a la publicación del frontend

- Se eliminó el par repetido de enlaces de ranking y progreso en Explorar grupos. La prueba existente exige ahora un único enlace de cada tipo y conserva teamId.
- npm run build: correcto, 890.43 kB iniciales; continúa el aviso de presupuesto de 500 kB.
- npm test -- --watch=false: 269 casos aprobados; persiste únicamente el archivo vacío preexistente de asignarproblema.
- npm test -- --watch=false --exclude=src/app/pages/coach/asignarproblema/asignarproblema.spec.ts: 269 casos y 29 archivos aprobados. No hubo fallos nuevos.
- Navegador: ranking y progreso consultados con sesión real y datos existentes; no se registraron resoluciones ni resultados nuevos. Las vistas de coach se revisaron visualmente en demo; las validaciones y operaciones del cliente están cubiertas por las pruebas HTTP simuladas. Las pruebas reales anteriores permanecen documentadas arriba.
- El selector de tema se comprobó en páginas públicas, inicio, perfiles, formularios y las cuatro historias, conservando la preferencia al navegar y recargar. No representa una auditoría exhaustiva de todos los estados visuales de todas las historias.
- Explorar grupos conserva un error de carga del listado general contra este backend; no se cambió esa operación ajena a estas historias. La corrección de enlaces tiene cobertura automatizada.
- Esta etapa modifica y publica exclusivamente el frontend. No se modifica el backend, PostgreSQL ni la configuración de autenticación.
