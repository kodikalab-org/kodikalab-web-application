import { Routes } from '@angular/router';
import { AppLayout } from '../../layouts/app-layout/app-layout';
import { ProblemasAsignados } from './problemas-asignados/problemas-asignados';
import { ProblemaElegido } from './problemas-asignados/components/problema-elegido/problema-elegido';

export const PRACTICANTE_ROUTES: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: 'problemas-asignados', component: ProblemasAsignados },
      { path: 'problemas-asignados/detalle', component: ProblemaElegido },
    ],
  },
];
