import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/auth/login/login';
import { Registro } from './pages/auth/registro/registro';
import { accessGuard, demoGuard } from './core/access-guard';
import { passwordResetStepGuard } from './core/password-reset-flow';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';

const appRoutes: Routes = [
  {
    path: 'recursos',
    data: { shared: true },
    loadComponent: () => import('./pages/recursos-academicos/recursos-academicos').then((m) => m.RecursosAcademicos),
  },
  {
    path: 'coach/competencias',
    providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
    loadComponent: () => import('./pages/competencias/competencias').then((m) => m.Competencias),
  },
  {
    path: 'progreso',
    loadComponent: () => import('./pages/progreso-tema/progreso-tema').then((m) => m.ProgresoTema),
  },
  {
    path: 'ranking',
    loadComponent: () =>
      import('./pages/ranking-equipo/ranking-equipo').then((m) => m.RankingEquipo),
  },
  {
    path: 'coach/rendimiento',
    loadComponent: () =>
      import('./pages/rendimiento-equipo/rendimiento-equipo').then((m) => m.RendimientoEquipo),
  },
  {
    path: 'progreso/equipos',
    loadComponent: () =>
      import('./pages/progreso-equipos/progreso-equipos').then((m) => m.ProgresoEquipos),
  },
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
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
  { path: 'demo/practicante', component: Login, canActivate: [demoGuard], data: { role: 'PRACTICANTE' } },
  { path: 'demo/coach', component: Login, canActivate: [demoGuard], data: { role: 'COACH' } },
  {
    path: 'grupos',
    loadComponent: () =>
      import('./pages/grupos/grupos-marco/grupos-marco').then((m) => m.GruposMarco),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/grupos/explorar-grupos/explorar-grupos').then((m) => m.ExplorarGrupos),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/grupos/grupo-detalle/grupo-detalle').then((m) => m.GrupoDetalle),
      },
    ],
  },
  {
    path: 'coach/grupos',
    data: { coach: true },
    loadComponent: () =>
      import('./pages/grupos/grupos-marco/grupos-marco').then((m) => m.GruposMarco),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'crear' },
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
    path: 'inicio',
    loadComponent: () =>
      import('./pages/inicio-dashboard/inicio-dashboard').then((m) => m.InicioDashboard),
    data: { coach: false },
  },
  {
    path: 'coach/inicio',
    loadComponent: () =>
      import('./pages/inicio-dashboard/inicio-dashboard').then((m) => m.InicioDashboard),
    data: { coach: true },
  },
  {
    path: 'onboarding/practicante/datos-academicos',
    loadComponent: () =>
      import('./pages/practicante/onboarding/datos-academicos/datos-academicos').then(
        (m) => m.OnboardingDatosAcademicos,
      ),
  },
  {
    path: 'onboarding/practicante/perfil-competitivo',
    loadComponent: () =>
      import('./pages/practicante/onboarding/perfil-competitivo/perfil-competitivo').then(
        (m) => m.OnboardingPerfilCompetitivo,
      ),
  },
  {
    path: 'onboarding/practicante/plataformas',
    loadComponent: () =>
      import('./pages/practicante/onboarding/plataformas/plataformas').then(
        (m) => m.OnboardingPlataformas,
      ),
  },
  {
    path: 'onboarding/practicante/completado',
    loadComponent: () =>
      import('./pages/practicante/onboarding/completado/completado').then(
        (m) => m.OnboardingCompletado,
      ),
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/practicante/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'perfil/editar',
    loadComponent: () =>
      import('./pages/practicante/perfil-editar/perfil-editar').then((m) => m.PerfilEditar),
  },
  {
    path: 'coach/perfil',
    loadComponent: () => import('./pages/coach/perfil/perfil').then((m) => m.CoachPerfil),
  },
  {
    path: 'coach/perfil/editar',
    loadComponent: () =>
      import('./pages/coach/perfil-editar/perfil-editar').then((m) => m.CoachPerfilEditar),
  },
  {
    path: 'practicante/plataformas',
    loadComponent: () =>
      import('./pages/practicante/plataformas-competitivas/plataformas-competitivas').then(
        (m) => m.PlataformasCompetitivas,
      ),
  },
  {
    path: 'onboarding/coach/experiencia',
    loadComponent: () =>
      import('./pages/coach/onboarding/experiencia/experiencia').then((m) => m.OnboardingExperiencia),
  },
  {
    path: 'onboarding/coach/presentacion',
    loadComponent: () =>
      import('./pages/coach/onboarding/presentacion/presentacion').then(
        (m) => m.OnboardingPresentacion,
      ),
  },
  {
    path: 'onboarding/coach/completado',
    loadComponent: () =>
      import('./pages/coach/onboarding/completado/completado').then(
        (m) => m.OnboardingCoachCompletado,
      ),
  },
];

const publicPaths = ['', 'login', 'registro', 'recuperar-contrasena', 'recuperar-contrasena/codigo', 'recuperar-contrasena/nueva'];
export const routes: Routes = [
  ...appRoutes.map(route => publicPaths.includes(route.path ?? '') || route.path?.startsWith('demo/')
    ? route
    : { ...route, canActivate: [accessGuard], data: { ...route.data,
      role: route.data?.['shared'] ? null : route.path?.startsWith('coach/') || route.path?.startsWith('onboarding/coach/') ? 'COACH' : 'PRACTICANTE',
    } }),
  { path: '**', redirectTo: '' },
];
