import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Registro } from './pages/registro/registro';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'registro', component: Registro },
];
