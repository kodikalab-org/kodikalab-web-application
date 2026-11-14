import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api';
import { Session } from './session';
import { ProfileApi } from './profile-api';
import { safeReturnUrl } from './return-url';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const url = inject(API_URL);
  if (!request.url.startsWith(`${url}/`)) return next(request);
  const session = inject(Session);
  const router = inject(Router);
  const profiles = inject(ProfileApi);
  const publicAuth = /\/auth\/(login|register|password-reset\/(request|verify|confirm))$/.test(request.url);
  const token = publicAuth ? null : session.token();
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(
    catchError((error: unknown) => {
      // A failed background refresh leaves the current session alone: it is still valid until it expires.
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !request.url.endsWith('/auth/refresh')) {
        session.logout();
        profiles.reset();
        const volver = safeReturnUrl(router.url);
        void router.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada', ...(volver ? { volver } : {}) } });
      }
      return throwError(() => error);
    }),
  );
};
