import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Clipboard } from '@angular/cdk/clipboard';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { apiError, fieldErrors, isConnectionError } from '../../../core/api';
import {
  emailRule,
  formatRecoveryCode,
  isWeakPassword,
  normalizeEmail,
  normalizeRecoveryCode,
  passwordBytesRule,
  passwordPolicyRule,
  recoveryCodeRule,
  RECOVERY_CODE_EXAMPLE,
} from '../auth-rules';

@Component({
  selector: 'app-recuperar-acceso',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatToolbarModule],
  templateUrl: './recuperar-acceso.html', styleUrl: './recuperar-acceso.css',
})
export class RecuperarAcceso {
  private readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly clipboard = inject(Clipboard);
  // The app runs without zone.js: HTTP results must notify the view explicitly.
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly recoveryCodeExample = RECOVERY_CODE_EXAMPLE;
  protected readonly isWeakPassword = isWeakPassword;
  protected busy = false;
  // Visible alert text. Empty when the message is attached to a field instead.
  protected error = '';
  // True for network, timeout and 5xx failures: the form keeps its data so the user can retry.
  protected connectionError = false;
  protected code = '';
  protected showPassword = false;
  protected copyStatus = '';
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [emailRule] }),
    recoveryCode: new FormControl('', { nonNullable: true, validators: [recoveryCodeRule] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [passwordPolicyRule, passwordBytesRule],
    }),
  });

  protected async recuperar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    this.connectionError = false;
    const { email, recoveryCode, newPassword } = this.form.getRawValue();
    try {
      const canonicalCode = formatRecoveryCode(normalizeRecoveryCode(recoveryCode));
      const result = await firstValueFrom(
        this.session.recover(normalizeEmail(email), canonicalCode, newPassword),
      );
      this.profiles.reset();
      this.code = result.recoveryCode;
      this.copyStatus = '';
      this.form.reset();
    } catch (error) {
      this.showError(error);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  protected copiar(): void {
    this.copyStatus = this.clipboard.copy(this.code) ? 'Código copiado' : 'No se pudo copiar. Cópialo manualmente.';
  }

  private showError(error: unknown): void {
    this.connectionError = isConnectionError(error);
    if (this.connectionError) {
      this.error = apiError(error);
      return;
    }
    // A rejected attempt clears the new password; the email and the code stay as typed.
    this.form.controls.newPassword.reset();
    let shownOnField = false;
    for (const [key, message] of Object.entries(fieldErrors(error))) {
      const control = this.serverControl(key);
      if (!control) continue;
      control.setErrors({ server: message });
      control.markAsTouched();
      shownOnField = true;
    }
    if (shownOnField) {
      this.error = '';
    } else if (error instanceof HttpErrorResponse && error.status === 401) {
      this.error = 'Datos de recuperación inválidos';
    } else {
      this.error = apiError(error);
    }
  }

  private serverControl(key: string): AbstractControl | null {
    switch (key) {
      case 'email': return this.form.controls.email;
      case 'recoveryCode': return this.form.controls.recoveryCode;
      case 'newPassword': return this.form.controls.newPassword;
      default: return null;
    }
  }
}
