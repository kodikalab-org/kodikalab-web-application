import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { map } from 'rxjs';
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

/** "ca***@upc.edu.pe": shows enough of the address to recognize it without exposing it. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Basic password reset flow in three steps (email → code → new password). It is a UI-only flow:
 * no email is sent and no password is changed until the backend offers an endpoint for it.
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
  protected readonly flow = inject(PasswordResetFlow);
  protected readonly paso$ = inject(ActivatedRoute).data.pipe(map((data) => data['paso'] as PasoRecuperacion));
  protected readonly codeLength = CODE_LENGTH;
  protected readonly confirmPasswordMatcher = new ConfirmPasswordMatcher();
  protected showPassword = false;
  protected resent = false;

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
    this.flow.email.set(normalizeEmail(this.correoForm.controls.email.value));
    this.flow.codeVerified.set(false);
    this.resent = false;
    void this.router.navigateByUrl('/recuperar-contrasena/codigo');
  }

  protected reenviarCodigo(): void {
    this.resent = true;
  }

  protected verificarCodigo(): void {
    if (this.codigoForm.invalid) return;
    this.flow.codeVerified.set(true);
    void this.router.navigateByUrl('/recuperar-contrasena/nueva');
  }

  protected cambiarContrasena(): void {
    if (this.nuevaForm.invalid) return;
    this.flow.reset();
    void this.router.navigate(['/login'], { queryParams: { motivo: 'contrasena-actualizada' } });
  }
}
