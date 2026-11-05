import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Session, homeFor, onboardingFor } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { apiError } from '../../../core/api';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-login',
  imports: [
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
  protected busy = false;
  protected error = this.route.snapshot.queryParamMap.get('motivo') === 'sesion-expirada'
    ? 'Tu sesión ha expirado. Inicia sesión de nuevo.'
    : this.route.snapshot.queryParamMap.get('motivo') === 'conexion'
      ? 'No pudimos cargar tu perfil. Comprueba la conexión con el servidor.' : '';
  protected showPassword = false;

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(100)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
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
    const { email, password, remember } = this.form.getRawValue();
    try {
      const response = await firstValueFrom(this.session.login(email, password, remember));
      this.profiles.reset();
      this.form.controls.password.reset();
      let destination = homeFor(response.role);
      try { await firstValueFrom(this.profiles.load()); }
      catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) destination = onboardingFor(response.role);
        else throw error;
      }
      await this.router.navigateByUrl(destination);
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
}
