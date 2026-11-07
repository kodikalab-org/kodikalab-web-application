import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export type PasoRecuperacion = 'correo' | 'codigo' | 'nueva';

/**
 * In-memory state shared by the three password reset screens. The code is kept only until the last step
 * because the backend asks for it again when the new password is set; it is never stored or put in a URL.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetFlow {
  readonly email = signal('');
  readonly code = signal('');
  readonly codeVerified = signal(false);

  reset(): void {
    this.email.set('');
    this.code.set('');
    this.codeVerified.set(false);
  }
}

/** Keeps the later steps from being opened directly: each one needs the previous step done. */
export const passwordResetStepGuard: CanActivateFn = (route) => {
  const flow = inject(PasswordResetFlow);
  const router = inject(Router);
  const paso = route.data['paso'] as PasoRecuperacion;
  if (paso === 'codigo' && !flow.email()) return router.parseUrl('/recuperar-contrasena');
  if (paso === 'nueva' && !(flow.codeVerified() && flow.code())) {
    return router.parseUrl(flow.email() ? '/recuperar-contrasena/codigo' : '/recuperar-contrasena');
  }
  return true;
};
