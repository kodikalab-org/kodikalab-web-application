import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { firstValueFrom } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { apiError } from '../../../core/api';

const MAX_ANIOS = 60;
const MAX_PRESENTACION = 500;

@Component({
  selector: 'app-coach-perfil-editar',
  imports: [
    HeaderNavigation,
    UserMenu,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './perfil-editar.html',
  styleUrl: './perfil-editar.css',
})
export class CoachPerfilEditar {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected busy = false;
  protected error = '';
  constructor() {
    const p = this.profiles.profile();
    if (p?.role === 'COACH') this.form.patchValue({ especialidad: p.especialidadPrincipal,
      organizacion: p.organizacionClub ?? '', anios: p.aniosExperiencia, presentacion: p.presentacion ?? '' });
  }

  protected readonly perfil = { nombre: this.session.account()?.email ?? '', iniciales: 'KL' };
  protected readonly maxPresentacion = MAX_PRESENTACION;

  protected readonly form = new FormGroup({
    especialidad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    organizacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    anios: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_ANIOS),
    ]),
    presentacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_PRESENTACION)],
    }),
  });

  /** Aviso "No pudimos guardar tus cambios": se muestra tras un intento fallido de guardar. */
  protected mostrarAviso = false;

  protected cambiarAnios(paso: number): void {
    const anios = this.form.controls.anios;
    anios.setValue(Math.min(MAX_ANIOS, Math.max(0, (anios.value ?? 0) + paso)));
    anios.markAsTouched();
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarAviso = true;
      return;
    }
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(this.profiles.save({ especialidadPrincipal: v.especialidad,
        organizacionClub: v.organizacion || null, aniosExperiencia: v.anios!, presentacion: v.presentacion || null }));
      await this.router.navigate(['/coach/perfil'], { queryParams: { estado: 'actualizado' } });
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
}
