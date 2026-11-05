# KodikalabApplication

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.4.

## Entrega 1: navegación y API real

El frontend usa el backend Spring Boot de `../../kodikalab`, en `http://localhost:8080/api`.
No se modificó su contrato ni sus secretos.

1. Inicia PostgreSQL y Spring Boot con **Java 21**, según el README del backend. Sus variables de `.env` deben estar cargadas en el proceso; Maven no las importa automáticamente.
2. Ejecuta `npm start` aquí y abre `http://localhost:4200/login`.
3. Registra una cuenta, guarda su código de recuperación e inicia sesión. Una cuenta sin perfil continúa al onboarding de su rol.

| Operación | Contrato utilizado |
| --- | --- |
| Registro, sin sesión automática | `POST /auth/register` |
| Login y rol | `POST /auth/login` |
| Recuperación sin correo; rota el código | `POST /auth/recovery` |
| Consultar código confirmando contraseña | `POST /auth/recovery-code` |
| Leer / guardar perfil del usuario autenticado | `GET /users/me` / `PUT /users/me` |

El JWT se envía solo a esta API. «Recordarme» usa `localStorage`; desmarcado usa `sessionStorage`.
Las contraseñas y los códigos de recuperación no se persisten. La sesión vence según `expiresIn`;
un `401` de un recurso protegido limpia la sesión. Un error de contraseña al consultar el código no la cierra.
Los formularios muestran estados de carga y errores reales, y solo anuncian guardado después del `PUT` exitoso.

### Demo y pendientes

Desde login, «Ver demo practicante» y «Ver demo coach» abren ejemplos sin autenticar ni guardar cambios.
La demo se identifica en una franja visible y no llama al backend durante el recorrido.
El rol real siempre proviene del login, nunca del correo ni de la ruta elegida.

Esta entrega conecta los datos de perfil admitidos por la API. Disponibilidad, distrito, objetivos y experiencia
competitiva del practicante están deshabilitados porque el contrato no los guarda. El nombre completo tampoco
está incluido en `GET /users/me`: se muestra el correo, no un nombre ficticio. El resto de actividad, métricas,
equipos y preferencias permanece pendiente, sin ampliarse a otros endpoints. Los borradores del onboarding
solo viven en memoria: recargar antes de finalizar reinicia el asistente.

### Despliegue y comprobación

La URL es configurable mediante el token `API_URL` de `src/app/core/api.ts`; proporciona su valor en
`app.config.ts` para otro entorno. Autoriza ese origen con `CORS_ALLOWED_ORIGINS` en Spring Boot.
No agregues claves JWT ni credenciales del backend al frontend.

Se conserva prerenderizado/hidratación para las páginas públicas. Las privadas usan `RenderMode.Client`:
el servidor no lee almacenamiento del navegador ni emite perfiles o tokens en HTML compartido.
Para probar el servidor compilado en PowerShell, sin desactivar la protección SSR de hosts:

```powershell
npm run build
$env:PORT = '3000'
$env:NG_ALLOWED_HOSTS = 'localhost,127.0.0.1'
npm run serve:ssr:kodikalab_application
```

Pruebas de esta entrega:

```powershell
npm test -- --watch=false --include="src/app/core/*.spec.ts" --include="src/app/pages/auth/**/*.spec.ts" --include="src/app/pages/inicio-dashboard/*.spec.ts" --include="src/app/pages/practicante/**/*.spec.ts" --include="src/app/pages/coach/perfil*/*.spec.ts" --include="src/app/pages/coach/onboarding/**/*.spec.ts" --include="src/app/app.spec.ts"
```

Las pruebas HTTP unitarias verifican contratos e interceptores con `HttpTestingController`; no sustituyen el
backend real. Verifica también en navegador ambos roles: registro → confirmación → login → onboarding →
inicio → perfil → edición → recarga, además de recuperación, demo y cierre de sesión.

Comprobación de esta entrega: ambos recorridos y la recuperación se probaron contra Spring Boot y PostgreSQL
locales usando cuentas ficticias. No se ejercitó la validación externa de Codeforces. La suite global ejecuta
las pruebas, pero termina con error por el archivo preexistente sin tests
`src/app/pages/coach/asignarproblema/asignarproblema.spec.ts`, fuera del alcance de esta entrega.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
