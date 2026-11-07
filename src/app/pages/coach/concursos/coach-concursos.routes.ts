import { Routes } from '@angular/router';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';

/** Coach contest management (create contests and change their status). Paths must start with 'coach/concursos'. */
export const COACH_CONCURSOS_ROUTES: Routes = [
  {
    path: 'coach/concursos',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./concursos-lista/concursos-lista').then((m) => m.ConcursosLista),
      },
      {
        path: 'nuevo',
        providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
        loadComponent: () =>
          import('./concurso-nuevo/concurso-nuevo').then((m) => m.ConcursoNuevo),
      },
    ],
  },
];
