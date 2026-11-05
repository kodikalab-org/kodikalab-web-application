import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/auth/login/login';
import { Registro } from './pages/auth/registro/registro';
import { accessGuard, demoGuard } from './core/access-guard';

const appRoutes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'registro-exitoso', loadComponent: () => import('./pages/auth/registro-exitoso/registro-exitoso').then(m => m.RegistroExitoso) },
  { path: 'recuperar-acceso', loadComponent: () => import('./pages/auth/recuperar-acceso/recuperar-acceso').then(m => m.RecuperarAcceso) },
  { path: 'demo/practicante', component: Login, canActivate: [demoGuard], data: { role: 'PRACTICANTE' } },
  { path: 'demo/coach', component: Login, canActivate: [demoGuard], data: { role: 'COACH' } },
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

const publicPaths = ['', 'login', 'registro', 'registro-exitoso', 'recuperar-acceso'];
export const routes: Routes = [
  ...appRoutes.map(route => publicPaths.includes(route.path ?? '') || route.path?.startsWith('demo/')
    ? route
    : { ...route, canActivate: [accessGuard], data: { ...route.data,
      role: route.path?.includes('coach/') ? 'COACH' : 'PRACTICANTE',
    } }),
  { path: '**', redirectTo: '' },
];
