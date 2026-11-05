import { Component, inject } from '@angular/core';
import {
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
import { apiError } from '../../../core/api';
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
  protected error = '';

  protected async registrar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    const { firstName, lastName, email, password, role } = this.form.getRawValue();
    try {
      await firstValueFrom(this.session.register({ firstName, lastName, email, password, role }));
      this.form.controls.password.reset();
      this.form.controls.confirmPassword.reset();
      await this.router.navigateByUrl('/registro-exitoso');
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected readonly confirmPasswordMatcher = new ConfirmPasswordMatcher();

  protected readonly form = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(100)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      role: new FormControl<'PRACTICANTE' | 'COACH'>('PRACTICANTE', { nonNullable: true }),
      terms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [passwordsMatch] },
  );
}
