import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Session, homeFor, onboardingFor } from './session';
import { ProfileApi } from './profile-api';
import { Role } from './api';

export const accessGuard: CanActivateFn = (route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  const profiles = inject(ProfileApi);
  // Private pages are rendered only in the browser: no token or personal data in SSR HTML.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return router.parseUrl('/login');
  session.restore();
  const role: Role = route.data['role'] ?? session.demo() ?? session.account()?.role ?? 'PRACTICANTE';
  if (session.demo()) return session.demo() === role ? true : router.parseUrl(homeFor(session.demo()!));
  if (!session.token()) return router.parseUrl('/login');
  const actualRole = session.account()!.role;
  if (actualRole !== role) return router.parseUrl(homeFor(actualRole));
  return profiles.load().pipe(
    map(() => route.routeConfig?.path === 'practicante/plataformas'
      ? router.createUrlTree(['/perfil/editar'], { fragment: 'plataformas' }) : true),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        profiles.profile.set(null);
        const first = onboardingFor(role);
        if (state.url.split('?')[0] === first) return of(true);
        if (state.url.includes('/onboarding/') && !state.url.includes('/completado')) {
          const hasDraft = role === 'COACH' ? profiles.coach.especialidad : profiles.academic.codigo;
          if (hasDraft) return of(true);
        }
        return of(router.parseUrl(first));
      }
      return of(router.createUrlTree(['/login'], { queryParams: {
        motivo: error instanceof HttpErrorResponse && error.status === 401 ? 'sesion-expirada' : 'conexion',
      } }));
    }),
  );
};

/** The group detail page is the practitioner view; coaches manage the group from its requests page. */
export const coachGroupDetailGuard: CanActivateFn = (route) => {
  const session = inject(Session);
  session.restore();
  const role = session.demo() ?? session.account()?.role;
  if (role !== 'COACH') return true;
  return inject(Router).createUrlTree(['/coach/grupos/solicitudes'], {
    queryParams: { grupo: route.paramMap.get('id') },
  });
};

export const demoGuard: CanActivateFn = (route) => {
  const session = inject(Session);
  const profiles = inject(ProfileApi);
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return router.parseUrl('/login');
  const role: Role = route.data['role'];
  profiles.reset();
  session.startDemo(role);
  return router.parseUrl(homeFor(role));
};
