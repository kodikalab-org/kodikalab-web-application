import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, retry, throwError, timer } from 'rxjs';
import { Session, homeFor, onboardingFor } from './session';
import { ProfileApi } from './profile-api';
import { safeReturnUrl } from './return-url';
import { Role, isConnectionError } from './api';

/** Wait between the attempts to load the profile. Tests shorten it. */
export let RETRY_DELAY = 2500;
export function setRetryDelay(ms: number): void { RETRY_DELAY = ms; }

export const accessGuard: CanActivateFn = (route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  const profiles = inject(ProfileApi);
  // Private pages are rendered only in the browser: no token or personal data in SSR HTML.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return router.parseUrl('/login');
  session.restore();
  const role: Role = route.data['role'] ?? session.account()?.role ?? 'PRACTICANTE';
  if (!session.token()) {
    const volver = safeReturnUrl(state.url);
    return router.createUrlTree(['/login'], volver ? { queryParams: { volver } } : {});
  }
  const actualRole = session.account()!.role;
  if (actualRole !== role) return router.parseUrl(homeFor(actualRole));
  const plataformas = () => route.routeConfig?.path === 'practicante/plataformas'
    ? router.createUrlTree(['/perfil/editar'], { fragment: 'plataformas' }) : true;
  // The profile is loaded once per session: later navigations must not depend on the network.
  const loaded = profiles.profile();
  if (loaded && loaded.role === actualRole && loaded.email === session.account()!.email) return plataformas();
  return profiles.load().pipe(
    // A sleeping or restarting backend is retried before giving up; 401 and 404 are real answers.
    retry({ count: 2, delay: (error) => isConnectionError(error) ? timer(RETRY_DELAY) : throwError(() => error) }),
    map(plataformas),
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
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return of(router.createUrlTree(['/login'], { queryParams: { motivo: 'sesion-expirada' } }));
      }
      // The session is still valid: wait for the server instead of sending the user to the login.
      return of(router.createUrlTree(['/sin-conexion'], { queryParams: { volver: state.url } }));
    }),
  );
};

/** The group detail page is the practitioner view; coaches manage the group from its requests page. */
export const coachGroupDetailGuard: CanActivateFn = (route) => {
  const session = inject(Session);
  session.restore();
  const role = session.account()?.role;
  if (role !== 'COACH') return true;
  return inject(Router).createUrlTree(['/coach/grupos/solicitudes'], {
    queryParams: { grupo: route.paramMap.get('id') },
  });
};
