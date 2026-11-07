import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'inicio', renderMode: RenderMode.Client },
  { path: 'grupos/**', renderMode: RenderMode.Client },
  { path: 'coach/**', renderMode: RenderMode.Client },
  { path: 'perfil', renderMode: RenderMode.Client },
  { path: 'perfil/**', renderMode: RenderMode.Client },
  { path: 'onboarding/**', renderMode: RenderMode.Client },
  { path: 'practicante/**', renderMode: RenderMode.Client },
  { path: 'demo/**', renderMode: RenderMode.Client },
  { path: 'recuperar-contrasena/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
