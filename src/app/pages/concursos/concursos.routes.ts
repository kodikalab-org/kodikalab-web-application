import { Routes } from '@angular/router';

/** Practitioner contests (Codeforces-style list and contest detail). Children of the AppShell route. */
export const CONCURSOS_ROUTES: Routes = [
  {
    path: 'concursos',
    data: { role: 'PRACTICANTE' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./concursos-lista/concursos-lista').then((m) => m.ConcursosLista),
      },
      {
        path: ':teamId/:competitionId',
        loadComponent: () =>
          import('./concurso-detalle/concurso-detalle').then((m) => m.ConcursoDetalle),
      },
    ],
  },
];
