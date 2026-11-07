import { Routes } from '@angular/router';

/** Practitioner contests (Codeforces-style list and contest detail). Paths must start with 'concursos'. */
export const CONCURSOS_ROUTES: Routes = [
  {
    path: 'concursos',
    loadComponent: () => import('./concursos-shell').then((m) => m.ConcursosShell),
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
