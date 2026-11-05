# feat(ui): interfaces de progreso y ranking · US-10–12, US-14

Implementa las interfaces responsivas de progreso y ranking según los frames de Figma referenciados en `SPEC.md`. Es una entrega de maquetación con datos fijos: no incorpora backend, autenticación ni persistencia.

## Pantallas

| Historia | Ruta | Interfaz |
| --- | --- | --- |
| US-10 | `/progreso` | Cobertura por tema, indicadores, temas por reforzar, fortalezas y registros por verificar. |
| US-11 | `/ranking` | Clasificación interna de ejemplo, posición del practicante y explicación de empates. |
| US-12 | `/coach/rendimiento` | Resolución grupal por tema y selección de prioridades con Reactive Forms y validación requerida. |
| US-14 | `/progreso/equipos` | Actividad y métricas independientes de Equipo Alfa y Grafos y DP. |

`/progreso/equipos?equipo=grafos-dp` representa el segundo frame de US-14. El enlace «Cambiar a…» alterna ejemplos estáticos mediante `routerLink`; no consulta ni calcula progreso real.

## Cambios e integración

- Componentes standalone en `src/app/pages/progreso-tema/`, `ranking-equipo/`, `rendimiento-equipo/` y `progreso-equipos/`, cada uno con TypeScript, HTML y CSS.
- Recursos SVG locales de Figma en `public/images/progreso-ranking/`, sin URLs temporales en ejecución.
- Angular Material para tarjetas, barra superior, botones y selecciones. Tailwind para maquetación; se conservan las fuentes y tokens globales del sistema.
- Tablas semánticas en escritorio y tarjetas de lectura en móvil; barras con etiquetas y valores accesibles.
- Cinco pruebas en `src/app/pages/progreso-ranking.spec.ts`.
- Único archivo existente modificado: `src/app/app.routes.ts`, con cuatro rutas lazy autorizadas. No se modifican dashboard, perfiles, layouts, tema, dependencias ni configuración SSR.

**Coordinación con `feature/conexion-backend-navegacion`:** conservar los guards, servicios y cambios de navegación de esa rama. Incorporar únicamente estas cuatro entradas al arreglo de rutas vigente; no reemplazar el archivo completo con la versión del worktree. Los enlaces de estas interfaces apuntan a destinos que ya existen en la base y a las nuevas pantallas. Los accesos desde el dashboard quedan para la integración de navegación.

## Verificación

- `npm run build`: compilación y prerender de 21 rutas correctos; advertencia de presupuesto del bundle inicial (aprox. 799 kB frente a 500 kB).
- `npm test -- --watch=false --include=src/app/pages/progreso-ranking.spec.ts`: **5/5 pruebas correctas**.
- `npm test -- --watch=false`: **116 pruebas correctas y 1 fallida**, más una suite vacía. Los fallos están en archivos no modificados: `src/app/app.spec.ts` espera el título de la plantilla Angular y `src/app/pages/coach/asignarproblema/asignarproblema.spec.ts` no contiene pruebas.
- Navegador: cinco vistas (incluido el segundo equipo) a 320, 390, 768, 1024 y 1440 px, sin elementos fuera del ancho disponible, imágenes rotas ni errores JavaScript.
- Revisadas capturas de escritorio y móvil; comprobados el cambio de equipo, la vuelta al ejemplo original y la selección de prioridades.
- Confirmadas dimensiones y archivos no vacíos de los diez SVG utilizados.

Para revisar localmente, ejecutar `npm start -- --port 4302` desde el worktree y abrir las rutas de la tabla.

## Fuera de alcance y pendientes

- Las métricas, ranking y orden de temas son ejemplos fijos del diseño. No hay filtros, cálculos, consultas HTTP ni almacenamiento.
- «Guardar prioridad» es un enlace de maqueta a la misma pantalla; **no guarda** y la interfaz lo indica. El formulario permite seleccionar valores y validar campos obligatorios.
- No se implementan estados de error de servidor, comprobación de pertenencia a equipos ni persistencia de prioridades.
- Recursos y notificaciones no se presentan como funciones operativas. Las menciones legales son texto, no enlaces a destinos inexistentes.
- Los cambios se entregan en `feature/interfaces-progreso-ranking`, sin fusionar con la rama de backend. La publicación del PR es un paso separado del commit y push de la rama.

## Orden de revisión y tamaño

Revisar primero los componentes por historia y después el pequeño cambio de rutas y las pruebas. La entrega supera 400 líneas: antes de publicar, dividir por historia con sus pruebas correspondientes o solicitar una excepción de tamaño (`size:exception`) al mantenedor. No se ha elegido ni creado una cadena de PRs.

Reversión: retirar las cuatro entradas de rutas y los cuatro directorios de pantallas, la prueba `progreso-ranking.spec.ts` y los recursos `public/images/progreso-ranking/`; no requiere cambiar código de backend ni archivos compartidos adicionales.
