import { Routes } from '@angular/router';

/** Rutas del practicante para sus problemas asignados (US09); sin prefijo `coach/` el rol es PRACTICANTE. */
export const PRACTICANTE_ROUTES: Routes = [
  {
    path: 'practicante/problemas-asignados',
    data: { coach: false },
    loadComponent: () => import('../../layouts/app-layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./problemas-asignados/problemas-asignados').then((m) => m.ProblemasAsignados),
      },
      {
        path: 'detalle',
        loadComponent: () =>
          import('./problemas-asignados/components/problema-elegido/problema-elegido').then(
            (m) => m.ProblemaElegido,
          ),
      },
    ],
  },
];
