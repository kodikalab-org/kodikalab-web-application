import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/auth/login/login';
import { Registro } from './pages/auth/registro/registro';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  {
    path: 'coach',
    loadChildren: () => import('./pages/coach/coach.routes').then((m) => m.COACH_ROUTES),
  },
  {
    path: 'practicante',
    loadChildren: () =>
      import('./pages/practicante/practicante.routes').then((m) => m.PRACTICANTE_ROUTES),
  },
];
