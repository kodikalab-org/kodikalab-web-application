import { Routes } from '@angular/router';

/** Practitioner routes for the assigned problems (US08 and US09), children of the AppShell route. */
export const PRACTICANTE_ROUTES: Routes = [
  {
    path: 'practicante/problemas-asignados',
    data: { role: 'PRACTICANTE' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./problemas-asignados/problemas-asignados').then((m) => m.ProblemasAsignados),
      },
      {
        path: 'detalle/:competitionProblemId',
        loadComponent: () =>
          import('./problemas-asignados/components/problema-elegido/problema-elegido').then(
            (m) => m.ProblemaElegido,
          ),
      },
    ],
  },
];
