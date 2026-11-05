import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api';
import { Session } from './session';
import { ProfileApi } from './profile-api';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const url = inject(API_URL);
  if (!request.url.startsWith(`${url}/`)) return next(request);
  const session = inject(Session);
  const router = inject(Router);
  const profiles = inject(ProfileApi);
  const publicAuth = /\/auth\/(login|register|recovery)$/.test(request.url);
  if (session.demo() && !publicAuth) {
    return throwError(() => new Error('La demostración no realiza operaciones contra la API.'));
  }
  const token = publicAuth ? null : session.token();
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(
    catchError((error: unknown) => {
      // An invalid recovery-code password is NOT an expired session.
      if (error instanceof HttpErrorResponse && error.status === 401 && token &&
          !request.url.endsWith('/auth/recovery-code')) {
        session.logout();
        profiles.reset();
        void router.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
      }
      return throwError(() => error);
    }),
  );
};
