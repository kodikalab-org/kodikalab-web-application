import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export type PasoRecuperacion = 'correo' | 'codigo' | 'nueva';

/**
 * In-memory state of the password reset screens. This is the basic UI flow only:
 * no email is sent and no API is called yet, so nothing here is persisted or sent anywhere.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetFlow {
  readonly email = signal('');
  readonly codeVerified = signal(false);

  reset(): void {
    this.email.set('');
    this.codeVerified.set(false);
  }
}

/** Keeps the later steps from being opened directly: each one needs the previous step done. */
export const passwordResetStepGuard: CanActivateFn = (route) => {
  const flow = inject(PasswordResetFlow);
  const router = inject(Router);
  const paso = route.data['paso'] as PasoRecuperacion;
  if (paso === 'codigo' && !flow.email()) return router.parseUrl('/recuperar-contrasena');
  if (paso === 'nueva' && !flow.codeVerified()) {
    return router.parseUrl(flow.email() ? '/recuperar-contrasena/codigo' : '/recuperar-contrasena');
  }
  return true;
};
