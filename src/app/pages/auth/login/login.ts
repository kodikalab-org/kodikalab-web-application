import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Session, homeFor, onboardingFor } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { Role, apiError, isConnectionError } from '../../../core/api';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { emailRule, normalizeEmail, passwordBytesRule } from '../auth-rules';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

// What the alert offers: 'credentials' (401) gets retry and recovery, 'connection' gets retry only.
type LoginFailure = 'credentials' | 'connection' | null;

@Component({
  selector: 'app-login',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  // The app runs without zone.js: HTTP results must notify the view explicitly.
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly estado$ = this.route.queryParamMap.pipe(map((params) => params.get('estado')));
  protected busy = false;
  protected error =
    this.route.snapshot.queryParamMap.get('motivo') === 'sesion-expirada'
      ? 'Tu sesión ha expirado. Inicia sesión de nuevo.'
      : this.route.snapshot.queryParamMap.get('motivo') === 'conexion'
        ? 'No pudimos cargar tu perfil. Comprueba la conexión con el servidor.'
        : '';
  protected failure: LoginFailure = null;
  protected showPassword = false;

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [emailRule] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordBytesRule],
    }),
    remember: new FormControl(true, { nonNullable: true }),
  });

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected async ingresar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    this.failure = null;
    const { email, password, remember } = this.form.getRawValue();
    try {
      let role: Role;
      try {
        const response = await firstValueFrom(this.session.login(normalizeEmail(email), password, remember));
        role = response.role;
      } catch (error) {
        this.showLoginError(error);
        return;
      }
      this.form.controls.password.reset();
      this.profiles.reset();
      await this.routeAfterLogin(role);
    } catch (error) {
      // The login succeeded but the profile could not be loaded: not a credentials failure.
      this.error = error instanceof HttpErrorResponse && error.status === 401
        ? 'Tu sesión ha expirado. Inicia sesión de nuevo.'
        : apiError(error);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  /** Retry dismisses a credentials alert, or sends the same data again after a connection failure. */
  protected retry(): void {
    if (this.failure === 'connection') {
      void this.ingresar();
      return;
    }
    this.error = '';
    this.failure = null;
  }

  private showLoginError(error: unknown): void {
    if (isConnectionError(error)) {
      // The password is kept so the user can retry without typing it again.
      this.failure = 'connection';
      this.error = apiError(error);
      return;
    }
    // Any rejected attempt clears the password and keeps the email.
    this.form.controls.password.reset();
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.failure = 'credentials';
      this.error = 'Credenciales inválidas';
      return;
    }
    this.failure = null;
    this.error = apiError(error);
  }

  private async routeAfterLogin(role: Role): Promise<void> {
    let destination = homeFor(role);
    try {
      await firstValueFrom(this.profiles.load());
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 404)) throw error;
      destination = onboardingFor(role);
    }
    await this.router.navigateByUrl(destination);
  }
}
