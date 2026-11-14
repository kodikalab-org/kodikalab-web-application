import { Routes } from '@angular/router';
import { AssignmentStore } from './asignar-problema/assignment-store';

/** Coach routes to assign problems (US07 and US08). They are children of the AppShell route in app.routes.ts. */
export const COACH_ROUTES: Routes = [
  {
    path: 'coach/asignar-problema',
    data: { role: 'COACH' },
    // Selection and configuration shared by the three steps of the assignment.
    providers: [AssignmentStore],
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
    data: { role: 'COACH' },
    loadComponent: () =>
      import('./asignar-problema/components/problemas-asignados-coach/problemas-asignados-coach').then(
        (m) => m.ProblemasAsignadosCoach,
      ),
  },
];
