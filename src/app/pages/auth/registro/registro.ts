import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../../core/session';
import { Role, apiError, fieldErrors, isConnectionError } from '../../../core/api';
import {
  emailRule,
  fullNameRule,
  isWeakPassword,
  nameRule,
  normalizeEmail,
  normalizeName,
  passwordBytesRule,
  passwordPolicyRule,
  roleRule,
} from '../auth-rules';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

const passwordsMatch: ValidatorFn = (group) =>
  group.get('password')?.value === group.get('confirmPassword')?.value
    ? null
    : { passwordsMismatch: true };

class ConfirmPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!control && control.touched && (control.invalid || !!form?.hasError('passwordsMismatch'));
  }
}

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  protected busy = false;
  // Visible alert text. Empty when the message is attached to a field instead.
  protected error = '';
  // True for network, timeout and 5xx failures: the form keeps its data so the user can retry.
  protected connectionError = false;
  protected readonly isWeakPassword = isWeakPassword;
  protected readonly confirmPasswordMatcher = new ConfirmPasswordMatcher();

  protected readonly form = new FormGroup(
    {
      firstName: new FormControl('', { nonNullable: true, validators: [nameRule] }),
      lastName: new FormControl('', { nonNullable: true, validators: [nameRule] }),
      email: new FormControl('', { nonNullable: true, validators: [emailRule] }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [passwordPolicyRule, passwordBytesRule],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      role: new FormControl<Role>('PRACTICANTE', { nonNullable: true, validators: [roleRule] }),
      terms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [passwordsMatch, fullNameRule] },
  );

  protected async registrar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    this.connectionError = false;
    const { firstName, lastName, email, password, role } = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.session.register({
          firstName: normalizeName(firstName),
          lastName: normalizeName(lastName),
          email: normalizeEmail(email),
          password,
          role,
        }),
      );
      this.form.controls.password.reset();
      this.form.controls.confirmPassword.reset();
      await this.router.navigateByUrl('/registro-exitoso');
    } catch (error) {
      this.showError(error);
    } finally {
      this.busy = false;
    }
  }

  private showError(error: unknown): void {
    this.connectionError = isConnectionError(error);
    if (this.connectionError) {
      this.error = apiError(error);
      return;
    }
    // The server rejected the data: the password is never kept, everything else stays as typed.
    this.form.controls.password.reset();
    this.form.controls.confirmPassword.reset();
    let shownOnField = false;
    for (const [key, message] of Object.entries(fieldErrors(error))) {
      const control = this.serverControl(key);
      if (!control) continue;
      control.setErrors({ server: message });
      control.markAsTouched();
      shownOnField = true;
    }
    this.error = shownOnField ? '' : apiError(error);
  }

  private serverControl(key: string): AbstractControl | null {
    switch (key) {
      case 'firstName': return this.form.controls.firstName;
      case 'lastName': return this.form.controls.lastName;
      case 'email': return this.form.controls.email;
      case 'password': return this.form.controls.password;
      default: return null;
    }
  }
}
