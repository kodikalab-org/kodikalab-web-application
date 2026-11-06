import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, map } from 'rxjs';
import { authApiError } from '../../../core/api';
import { PasswordResetApi } from '../../../core/password-reset-api';
import { PasoRecuperacion, PasswordResetFlow } from '../../../core/password-reset-flow';
import { emailRule, normalizeEmail, passwordBytesRule, passwordPolicyRule } from '../auth-rules';

const CODE_LENGTH = 6;

/** The reset code is six digits; spaces typed by the user are ignored. */
const codeRule: ValidatorFn = (control): ValidationErrors | null => {
  const code = String(control.value ?? '').replace(/\s+/g, '');
  if (!code) return { required: true };
  return /^\d{6}$/.test(code) ? null : { codeFormat: true };
};

const passwordsMatch: ValidatorFn = (group) =>
  group.get('password')?.value === group.get('confirmPassword')?.value ? null : { passwordsMismatch: true };

class ConfirmPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!control && control.touched && (control.invalid || !!form?.hasError('passwordsMismatch'));
  }
}

/** A 503 means the server cannot send emails: say so without exposing how the server is configured. */
function resetError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 503) {
    return 'No podemos enviar correos en este momento. Inténtalo más tarde.';
  }
  return authApiError(error);
}

/** "ca***@upc.edu.pe": shows enough of the address to recognize it without exposing it. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Password reset in three steps (email → code → new password) against `/auth/password-reset/*`.
 * The email carries a six digit code; the backend checks it again when the new password is set.
 */
@Component({
  selector: 'app-recuperar-contrasena',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.css',
})
export class RecuperarContrasena {
  private readonly router = inject(Router);
  private readonly api = inject(PasswordResetApi);
  protected readonly flow = inject(PasswordResetFlow);
  protected readonly paso$ = inject(ActivatedRoute).data.pipe(map((data) => data['paso'] as PasoRecuperacion));
  protected readonly codeLength = CODE_LENGTH;
  protected readonly confirmPasswordMatcher = new ConfirmPasswordMatcher();
  protected showPassword = false;
  // The app runs without zone.js: state that changes after an HTTP answer lives in signals.
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly resent = signal(false);

  protected readonly correoForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [emailRule] }),
  });
  protected readonly codigoForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [codeRule] }),
  });
  protected readonly nuevaForm = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [passwordPolicyRule, passwordBytesRule] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [passwordsMatch] },
  );

  protected get maskedEmail(): string {
    return maskEmail(this.flow.email());
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected enviarCodigo(): void {
    if (this.correoForm.invalid) return;
    const email = normalizeEmail(this.correoForm.controls.email.value);
    this.run(this.api.request(email), () => {
      this.flow.email.set(email);
      this.flow.code.set('');
      this.flow.codeVerified.set(false);
      this.resent.set(false);
      void this.router.navigateByUrl('/recuperar-contrasena/codigo');
    });
  }

  protected reenviarCodigo(): void {
    this.resent.set(false);
    this.run(this.api.request(this.flow.email()), () => this.resent.set(true));
  }

  protected verificarCodigo(): void {
    if (this.codigoForm.invalid) return;
    const code = this.codigoForm.controls.code.value.replace(/\s+/g, '');
    this.run(this.api.verify(this.flow.email(), code), () => {
      this.flow.code.set(code);
      this.flow.codeVerified.set(true);
      void this.router.navigateByUrl('/recuperar-contrasena/nueva');
    });
  }

  protected cambiarContrasena(): void {
    if (this.nuevaForm.invalid) return;
    const { password } = this.nuevaForm.getRawValue();
    this.run(this.api.confirm(this.flow.email(), this.flow.code(), password), () => {
      this.flow.reset();
      void this.router.navigate(['/login'], { queryParams: { motivo: 'contrasena-actualizada' } });
    });
  }

  /** Sends one request at a time, shows the backend message when it fails and runs `onSuccess` otherwise. */
  private run(request: Observable<unknown>, onSuccess: () => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: onSuccess,
      error: (error: unknown) => this.error.set(resetError(error)),
    });
  }
}
