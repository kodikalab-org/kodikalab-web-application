import { Routes } from '@angular/router';
import { AssignmentStore } from './asignar-problema/assignment-store';

/**
 * Rutas del coach para asignar problemas (US07 y US08). Las rutas llevan el prefijo `coach/`
 * completo porque app.routes.ts asigna el rol COACH según ese prefijo.
 */
export const COACH_ROUTES: Routes = [
  {
    path: 'coach/asignar-problema',
    data: { coach: true },
    // Selection and configuration shared by the three steps of the assignment.
    providers: [AssignmentStore],
    loadComponent: () => import('../../layouts/app-layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./asignar-problema/asignar-problema').then((m) => m.AsignarProblema),
      },
      {
        path: 'configurar',
        loadComponent: () =>
          import('./asignar-problema/components/configurar-asignacion/configurar-asignacion').then(
            (m) => m.ConfigurarAsignacion,
          ),
      },
      {
        path: 'confirmar',
        loadComponent: () =>
          import('./asignar-problema/components/confirmar-asignacion/confirmar-asignacion').then(
            (m) => m.ConfirmarAsignacion,
          ),
      },
    ],
  },
  {
    path: 'coach/problemas-asignados',
    data: { coach: true },
    loadComponent: () => import('../../layouts/app-layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./asignar-problema/components/problemas-asignados-coach/problemas-asignados-coach').then(
            (m) => m.ProblemasAsignadosCoach,
          ),
      },
    ],
  },
];
