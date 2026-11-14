import { Route, Routes } from '@angular/router';
import { Role } from './core/api';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/auth/login/login';
import { Registro } from './pages/auth/registro/registro';
import { accessGuard, coachGroupDetailGuard } from './core/access-guard';
import { passwordResetStepGuard } from './core/password-reset-flow';
import { AppShell } from './layouts/app-shell/app-shell';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { COACH_ROUTES } from './pages/coach/coach.routes';
import { PRACTICANTE_ROUTES } from './pages/practicante/practicante.routes';
import { CONCURSOS_ROUTES } from './pages/concursos/concursos.routes';
import { COACH_CONCURSOS_ROUTES } from './pages/coach/concursos/coach-concursos.routes';

/**
 * Every signed-in page is a child of one route that renders the AppShell (header, page, footer). Each route
 * states its role in `data.role` (`null` = both roles); `accessGuard` reads it for the route and its children.
 */
export const privateRoutes: Routes = [
  {
    path: 'inicio',
    data: { role: 'PRACTICANTE' },
    loadComponent: () =>
      import('./pages/inicio-dashboard/inicio-dashboard').then((m) => m.InicioDashboard),
  },
  {
    path: 'coach/inicio',
    data: { role: 'COACH' },
    loadComponent: () =>
      import('./pages/inicio-dashboard/inicio-dashboard').then((m) => m.InicioDashboard),
  },
  {
    path: 'recursos',
    data: { role: null },
    loadComponent: () => import('./pages/recursos-academicos/recursos-academicos').then((m) => m.RecursosAcademicos),
  },
  {
    path: 'progreso',
    data: { role: 'PRACTICANTE' },
    loadComponent: () => import('./pages/progreso-tema/progreso-tema').then((m) => m.ProgresoTema),
  },
  {
    path: 'progreso/equipos',
    data: { role: 'PRACTICANTE' },
    loadComponent: () =>
      import('./pages/progreso-equipos/progreso-equipos').then((m) => m.ProgresoEquipos),
  },
  {
    path: 'ranking',
    data: { role: 'PRACTICANTE' },
    loadComponent: () =>
      import('./pages/ranking-equipo/ranking-equipo').then((m) => m.RankingEquipo),
  },
  {
    path: 'coach/ranking',
    data: { role: 'COACH' },
    loadComponent: () => import('./pages/ranking-equipo/ranking-equipo').then(m => m.RankingEquipo),
  },
  {
    path: 'coach/rendimiento',
    data: { role: 'COACH' },
    loadComponent: () =>
      import('./pages/rendimiento-equipo/rendimiento-equipo').then((m) => m.RendimientoEquipo),
  },
  {
    path: 'coach/competencias',
    data: { role: 'COACH' },
    providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
    loadComponent: () => import('./pages/competencias/competencias').then((m) => m.Competencias),
  },
  ...COACH_ROUTES,
  ...PRACTICANTE_ROUTES,
  ...CONCURSOS_ROUTES,
  ...COACH_CONCURSOS_ROUTES,
  {
    path: 'grupos',
    // Shared: coaches and practitioners both land here (tabs «Explorar» and «Mis grupos»).
    data: { role: null },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/grupos/mis-grupos/grupos-hub').then((m) => m.GruposHub),
      },
      {
        path: ':id',
        canActivate: [coachGroupDetailGuard],
        loadComponent: () =>
          import('./pages/grupos/grupo-detalle/grupo-detalle').then((m) => m.GrupoDetalle),
      },
    ],
  },
  {
    path: 'coach/grupos',
    data: { role: 'COACH' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: '/grupos' },
      {
        path: 'solicitudes',
        loadComponent: () =>
          import('./pages/grupos/solicitudes-grupo/solicitudes-grupo').then(
            (m) => m.SolicitudesGrupo,
          ),
      },
      {
        path: 'crear',
        loadComponent: () =>
          import('./pages/grupos/crear-grupo/crear-grupo').then((m) => m.CrearGrupo),
      },
      {
        path: 'creado',
        loadComponent: () =>
          import('./pages/grupos/grupo-creado/grupo-creado').then((m) => m.GrupoCreado),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./pages/grupos/seguimiento-grupo/seguimiento-grupo').then(
            (m) => m.SeguimientoGrupo,
          ),
      },
    ],
  },
  {
    path: 'perfil',
    data: { role: 'PRACTICANTE' },
    loadComponent: () => import('./pages/practicante/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'perfil/editar',
    data: { role: 'PRACTICANTE' },
    loadComponent: () =>
      import('./pages/practicante/perfil-editar/perfil-editar').then((m) => m.PerfilEditar),
  },
  {
    path: 'coach/perfil',
    data: { role: 'COACH' },
    loadComponent: () => import('./pages/coach/perfil/perfil').then((m) => m.CoachPerfil),
  },
  {
    path: 'coach/perfil/editar',
    data: { role: 'COACH' },
    loadComponent: () =>
      import('./pages/coach/perfil-editar/perfil-editar').then((m) => m.CoachPerfilEditar),
  },
];

/** Onboarding wizards are full-screen: guarded like private pages but outside the shell. */
const onboarding = (role: Role, path: string, loadComponent: Route['loadComponent']): Route => ({
  path: `onboarding/${path}`, canActivate: [accessGuard], data: { role }, loadComponent,
});
export const onboardingRoutes: Routes = [
  onboarding('PRACTICANTE', 'practicante/datos-academicos', () =>
    import('./pages/practicante/onboarding/datos-academicos/datos-academicos').then((m) => m.OnboardingDatosAcademicos)),
  onboarding('PRACTICANTE', 'practicante/perfil-competitivo', () =>
    import('./pages/practicante/onboarding/perfil-competitivo/perfil-competitivo').then((m) => m.OnboardingPerfilCompetitivo)),
  onboarding('PRACTICANTE', 'practicante/plataformas', () =>
    import('./pages/practicante/onboarding/plataformas/plataformas').then((m) => m.OnboardingPlataformas)),
  onboarding('PRACTICANTE', 'practicante/completado', () =>
    import('./pages/practicante/onboarding/completado/completado').then((m) => m.OnboardingCompletado)),
  onboarding('COACH', 'coach/experiencia', () =>
    import('./pages/coach/onboarding/experiencia/experiencia').then((m) => m.OnboardingExperiencia)),
  onboarding('COACH', 'coach/presentacion', () =>
    import('./pages/coach/onboarding/presentacion/presentacion').then((m) => m.OnboardingPresentacion)),
  onboarding('COACH', 'coach/completado', () =>
    import('./pages/coach/onboarding/completado/completado').then((m) => m.OnboardingCoachCompletado)),
];

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  {
    path: 'sin-conexion',
    loadComponent: () => import('./pages/sin-conexion/sin-conexion').then((m) => m.SinConexion),
  },
  {
    path: 'recuperar-contrasena',
    data: { paso: 'correo' },
    loadComponent: () => import('./pages/auth/recuperar-contrasena/recuperar-contrasena').then((m) => m.RecuperarContrasena),
  },
  {
    path: 'recuperar-contrasena/codigo',
    data: { paso: 'codigo' },
    canActivate: [passwordResetStepGuard],
    loadComponent: () => import('./pages/auth/recuperar-contrasena/recuperar-contrasena').then((m) => m.RecuperarContrasena),
  },
  {
    path: 'recuperar-contrasena/nueva',
    data: { paso: 'nueva' },
    canActivate: [passwordResetStepGuard],
    loadComponent: () => import('./pages/auth/recuperar-contrasena/recuperar-contrasena').then((m) => m.RecuperarContrasena),
  },
  ...onboardingRoutes,
  { path: '', component: AppShell, canActivateChild: [accessGuard], children: privateRoutes },
  // Unknown addresses: a plain 404 page inside the same frame, with or without a session.
  {
    path: '**',
    component: AppShell,
    children: [
      { path: '', loadComponent: () => import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada) },
    ],
  },
];
