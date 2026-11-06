import { Routes } from '@angular/router';
import { AppLayout } from '../../layouts/app-layout/app-layout';
import { AsignarProblema } from './asignar-problema/asignar-problema';
import { ConfigurarAsignacion } from './asignar-problema/components/configurar-asignacion/configurar-asignacion';
import { ConfirmarAsignacion } from './asignar-problema/components/confirmar-asignacion/confirmar-asignacion';
import { ProblemasAsignadosCoach } from './asignar-problema/components/problemas-asignados-coach/problemas-asignados-coach';

export const COACH_ROUTES: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: 'asignar-problema', component: AsignarProblema },
      { path: 'asignar-problema/configurar', component: ConfigurarAsignacion },
      { path: 'asignar-problema/confirmar', component: ConfirmarAsignacion },
      { path: 'problemas-asignados', component: ProblemasAsignadosCoach },
    ],
  },
];
