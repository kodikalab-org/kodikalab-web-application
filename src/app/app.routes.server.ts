import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'ranking', renderMode: RenderMode.Client },
  { path: 'progreso/equipos', renderMode: RenderMode.Client },
  { path: 'inicio', renderMode: RenderMode.Client },
  { path: 'coach/**', renderMode: RenderMode.Client },
  { path: 'perfil', renderMode: RenderMode.Client },
  { path: 'perfil/**', renderMode: RenderMode.Client },
  { path: 'onboarding/**', renderMode: RenderMode.Client },
  { path: 'practicante/**', renderMode: RenderMode.Client },
  { path: 'demo/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
