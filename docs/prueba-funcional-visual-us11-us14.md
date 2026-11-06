# Prueba funcional y visual US-11 a US-14

## Resultado y alcance

Prueba parcial: navegador real sobre Angular, capturas de las cuatro maquetas demo y pruebas de componentes con HTTP simulado. NO se verificó integración con Spring/PostgreSQL ni se registraron datos reales.

## Entorno

Angular iniciado en http://127.0.0.1:4200. PostgreSQL postgresql-x64-18 está Running y escucha en 5432. No hay Java/Spring escuchando en 8080, .env del backend ni variables DB_* cargadas. La configuración existente usa ddl-auto=update, con posibilidad de modificar esquema; por eso no se arrancó con credenciales supuestas ni se cambió configuración. GET /api/analytics/teams/1/standings a través del proxy Angular devolvió HTTP 502. No es una respuesta funcional del backend.

No se instaló otra herramienta: navegador real de Codex con locators Playwright, además de Vitest/HttpTestingController ya instalados. No se alteraron backend, PostgreSQL o Figma.

## Navegador real: modo DEMO

- US-11: pantalla, cinco integrantes, estado de empate (posiciones compartidas) y aviso de datos inconsistentes. Son números fijos, no cálculo del servicio. Se capturaron escritorio, móvil, empate y error.
- US-12: cinco temas, barras y porcentajes del diseño. Cambio de Primer tema a Grafos, estado Igual prioridad (dos mínimos de 25%) y alerta Información insuficiente. No hay guardado real de prioridades. Capturas escritorio, móvil y empate.
- US-13: formulario e historial de ejemplo. Puesto -1 muestra error y deshabilita Guardar resultado. Guardar como pendiente muestra expresamente que no se guardó ni publicó. No se ejecutaron POST/PUT reales ni confirmaciones. Capturas escritorio, móvil y validación.
- US-14: cambio de Equipo Alfa a Grafos y DP, cambio de actividad de ejemplo y estado Contexto no válido. No se registraron soluciones desde el navegador; MANUAL_PROVISIONAL y actualización del conteo están probados con HTTP simulado. Capturas escritorio, móvil y otro equipo.
- Rutas sin sesión: redirección a login. La demo de coach no concede navegación de practicante. Esto valida el guard del frontend, no autorización del servidor.
- Consola del navegador revisada durante las demos: sin errores/advertencias registrados.
- Responsive: escritorio 1440x1000 y móvil 390x844. El contenido total se capturó con fullPage. Sin desbordamiento horizontal en las comprobaciones de las cuatro páginas; no se afirma igualdad pixel a pixel.

## Figma

Se volvieron a consultar por MCP las capturas de 416:6178, 416:6250, 416:9235 y 416:6322. Las demos conservan fondo violeta, tipografías, tarjetas, tablas/columnas y disposición general. Material añade alturas, indicadores de campos requeridos y ayudas de formulario diferentes a las figuras estáticas. Las advertencias de demo y enlaces de estados añaden altura. La vista móvil apila columnas y transforma tablas en tarjetas. La revisión con datos reales de los componentes Live no pudo completarse sin backend/sesión; estas capturas no certifican esa vista.

## Error corregido

/ranking y /progreso/equipos heredaban RenderMode.Prerender. Una recarga podía mostrar login aunque existiera contexto demo del navegador. Se declararon explícitamente RenderMode.Client, manteniendo guards y permisos. Recarga de ranking y progreso demo verificada después de la corrección. Se añadió una prueba de regresión a progreso-ranking.spec.ts.

## Pruebas con HTTP simulado (no servidor real)

La suite comprueba contratos y métodos HTTP, filas del ranking y puestos 1,1,3, NO_ACTIVITY, snapshot sin ocultar error, descarte de respuestas del equipo anterior, temas mínimos, errores 403/409/503, historial, bloqueo de confirmados, valores de confirmación, creación pendiente, registro MANUAL_PROVISIONAL, actualización del conteo y protección contra duplicados/envíos simultáneos. La suite de sesión comprueba cookie y 401. No prueba restricciones SQL ni persistencia.

## Verificación después de corregir

- npm test -- --watch=false --exclude=src/app/pages/coach/asignarproblema/asignarproblema.spec.ts: 249 casos y 27 archivos aprobados, cero fallos. Se excluyó explícitamente solo el archivo vacío preexistente de otra historia.
- TypeScript: tsconfig.app.json y tsconfig.spec.json con --noEmit correctos.
- npm run build: correcto. Ocho rutas prerenderizadas; las dos privadas ya no se prerenderizan. Advertencia inicial 873.34 kB contra umbral de aviso 500 kB, sin ocultarla.
- El archivo vacío de asignación sigue impidiendo una suite global sin exclusión; no se modificó.

## Archivos adicionales de esta revisión

- src/app/app.routes.server.ts: dos rutas Client.
- src/app/pages/progreso-ranking.spec.ts: regresión de renderizado.
- docs/prueba-funcional-visual-us11-us14.md: este informe.

Las imágenes de navegador se entregan fuera del repositorio, en los adjuntos de la conversación; los nombres incluyen demo para no confundirlas con API real. No se hicieron operaciones Git de escritura ni cambios de rama.

## Pendiente para prueba real

Configurar localmente la conexión de Spring sin compartir secretos por chat; acordar un arranque que no ejecute cambios de esquema; disponer de cuentas y contexto de prueba. Antes de crear resultados o resoluciones hace falta autorizar expresamente las escrituras en una base de pruebas identificada. No se requieren push/commit ni cambios al backend para revisar el código frontend.
