# KodikaLab

Aplicación web responsiva para el entrenamiento en programación competitiva de la comunidad GPC UPC.

> Este documento describe la fase de interfaces del frontend. `AGENTS.md` contiene las instrucciones detalladas y prevalece si hay alguna diferencia.

## Datos

- **Referencia visual:** [Landing web](https://www.figma.com/design/prt67vzvXGvuuIORZvSH3A/kodikalab_design?node-id=50-2) y [landing móvil](https://www.figma.com/design/prt67vzvXGvuuIORZvSH3A/kodikalab_design?node-id=51-2); [pantallas de la aplicación](https://www.figma.com/design/prt67vzvXGvuuIORZvSH3A/kodikalab_design?node-id=61-22).
- **Frontend:** Angular 22, componentes standalone y Tailwind CSS 4.
- **UI:** Angular Material y CDK.
- **Paquetes:** npm; ejecutar los comandos desde esta carpeta, donde está `package.json`.
- **Renderizado:** conservar la configuración existente de SSR e hidratación.
- **Estilos:** reutilizar la paleta, tipografías y tokens de `src/styles.css`.

### Convención de estilos

- Usa utilidades Tailwind en los templates para maquetación, espaciado, tipografía, responsive y estados interactivos. Los colores `kl-*` y las fuentes `font-body` / `font-display` reutilizan los tokens existentes.
- Conserva Angular Material para los controles. Los `.css` de las pantallas solo contienen sus tokens específicos de Material; la integración compartida de formularios está en `src/styles.css`, con clases `auth-*` explícitas y sin `::ng-deep`.
- Tailwind no carga Preflight para no alterar los controles existentes. Las utilidades tienen prioridad sobre los estilos internos de Material. No dupliques las utilidades con reglas CSS de maquetación.
- Tailwind detecta las clases dentro de `src/app/`; no construyas nombres de utilidades concatenando strings. La configuración PostCSS está en `.postcssrc.json`.
- La landing tiene cabecera fija, sección activa sincronizada con el scroll y movimiento reducido según la preferencia del usuario. Incluye planes Free (S/0) y GO (S/20 mensuales), con diseño autorizado siguiendo el estilo existente. Sus botones llevan al registro, sin activar ni cobrar una suscripción. Video, recursos, carrusel y contratación siguen pendientes; no deben simular funciones disponibles.

## Cómo trabajar

Haz solo las pantallas que se soliciten. Antes de programar, revisa el proyecto y los frames correspondientes del Figma, incluida la versión móvil si existe. Si falta una referencia importante o no puedes abrirla, pide una captura o un enlace; no inventes el diseño.

Reutiliza rutas, estilos y layouts existentes sin modificarlos. Si para conectar una pantalla hace falta cambiarlos o alterar el tema global, explica el cambio mínimo y solicita autorización. Al terminar, indica los archivos creados o modificados, las verificaciones y lo pendiente.

## Estructura

La siguiente es una **propuesta de organización**, adaptada al formato de la plantilla para los roles y funcionalidades de KodikaLab. Un grupo reúne pantallas que comparten un layout; los nombres y rutas pendientes deben confirmarse con el Figma y la tarea solicitada.

```text
src/app/
├── app.routes.ts                    # / carga la landing; grupos mediante rutas hijas
├── pages/
│   ├── landing-page/                # Landing actual en /, con cabecera y pie propios
│   │   └── landing-page.ts · landing-page.html · landing-page.css
│   ├── auth/                        # Pantallas de acceso existentes
│   │   ├── login/                   # Inicio de sesión en /login
│   │   └── registro/                # Registro en /registro
│   ├── practicante/                 # Propuesto: pantallas del practicante
│   │   ├── practicante.routes.ts    # Rutas del grupo
│   │   ├── perfil/                  # Perfil y plataformas competitivas
│   │   ├── equipos/                 # Equipos y solicitudes de ingreso
│   │   ├── problemas/               # Problemas asignados y resoluciones
│   │   └── progreso/                # Progreso por tema
│   └── coach/                       # Propuesto: pantallas del coach
│       ├── coach.routes.ts          # Rutas del grupo
│       ├── equipos/                 # Creación y gestión de equipos
│       ├── postulantes/             # Solicitudes de ingreso
│       ├── asignaciones/           # Asignación de problemas
│       └── analitica/               # Ranking y desempeño del equipo
└── layouts/                         # Propuestos, si los grupos los necesitan
    ├── auth-layout/
    ├── practicante-layout/
    └── coach-layout/
```

**Estado actual:** están implementadas `landing-page/`, `auth/login/` y `auth/registro/`, con las rutas `/`, `/login` y `/registro`. El resto del árbol es orientativo, no indica pantallas implementadas ni autoriza crearlas o reorganizar las actuales. La interfaz de registro enlaza a `/registro-exitoso`, pero esa ruta todavía no existe. Los formularios son maquetas sin conexión al backend; las funciones y plataformas mostradas en la landing son contenido visual.

Para trabajo nuevo, sigue la estructura existente y usa `src/app/pages/<nombre-de-pantalla>/`, salvo que se acuerde otra organización. No cambies rutas o layouts existentes sin autorización ni crees abstracciones innecesarias.

## Alcance

Por defecto, esta fase es de **maquetación y navegación**, no de lógica de negocio. Usa los textos y datos de ejemplo del Figma; representa las listas con datos fijos.

- **Sí:** formularios con Reactive Forms y validaciones sencillas, mensajes de error, listas con `@for` y enlaces con `routerLink` entre las pantallas solicitadas.
- **No, salvo solicitud expresa:** autenticación real, pagos, peticiones HTTP, almacenamiento, servicios, modelos, interfaces de datos o funciones de negocio. No agregues `signals`, `computed`, `inject()` ni navegación programática con `Router` para resolver una maqueta.
- Buscadores, filtros y contadores se dibujan sin buscar, filtrar ni calcular resultados. Si una función real queda pendiente, indícalo sin simular que funciona.
- No generes contenido como códigos QR por código: usa un recurso estático del diseño y aclara que es de ejemplo.
- No crees rutas nuevas para estados de error, vacío o rechazo. Por ahora, implementa únicamente los errores de formulario solicitados.

## Reglas

- **Angular:** componentes standalone, un `.ts`, `.html` y `.css` por pantalla; nombres en minúsculas separados por guiones.
- **Control de flujo:** usa `@if`, `@for` con `track` y `@switch`; no uses `*ngIf`, `*ngFor` ni `ngSwitch`.
- **UI:** usa los controles de Angular Material según el diseño, como `mat-toolbar`, `mat-card`, `mat-form-field`, `matInput`, botones, chips, listas y divisores. Revisa `package.json` antes de instalar dependencias y no actualices Angular ni otras dependencias sin autorización.
- **Fechas, listas y gráficos:** utiliza `mat-datepicker` con adaptador e idioma configurados en la ruta correspondiente; usa `mat-paginator` solo para listas largas. Para gráficos no solicitados, deja un bloque con «Aquí irá un gráfico».
- **Formularios:** usa `FormGroup`, `FormControl` y `formControlName`; no uses Signal Forms ni `ngModel`. Todo campo o selección editable, incluidas fechas, cantidades y chips, pertenece a un `FormGroup`.
- **Validaciones:** aplica validaciones simples según el diseño, como `required`, `email` o `minLength`. Cada campo validado lleva un `<mat-error>` en el idioma de la interfaz, visible después de tocarlo; el botón principal usa `[disabled]="form.invalid"`.
- **Navegación:** usa `routerLink` en botones y enlaces de navegación, incluido el botón principal de formulario. Los controles propios de Material, como abrir un calendario, no son enlaces. Si el destino no existe, indícalo sin crear otra pantalla por tu cuenta.
- **Diseño y accesibilidad:** respeta el Figma y las variables de `src/styles.css`; verifica escritorio y móvil sin texto cortado, solapamientos ni desplazamiento horizontal innecesario. Conserva el orden de lectura y las etiquetas accesibles.
- **SSR:** no accedas directamente a `window`, `document` ni `localStorage` desde el código de las pantallas.
- **Si dudas, pregunta:** no implementes pantallas ni cambios fuera del alcance pedido.

## Verificación

Desde esta carpeta:

Si necesitas reinstalar dependencias, usa `npm ci --legacy-peer-deps`: el proyecto conserva un desajuste previo entre versiones de paquetes Angular. La migración a Tailwind no actualiza Angular. Vite está declarado explícitamente para que Vitest pueda resolver su dependencia de ejecución.

```bash
npm run build
npm start
```

Comprueba en el navegador las vistas de escritorio y móvil, los enlaces y las validaciones. Si modificas un comportamiento que ya tiene pruebas, ejecuta las pruebas correspondientes. Una compilación correcta no sustituye la revisión visual ni de navegación.
