import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { firstValueFrom, map, tap } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { apiError } from '../../../core/api';
import { PERFIL_COACH_DEMO } from '../../../data/perfil-coach-demo';

const MAX_ANIOS = 60;
const MAX_PRESENTACION = 500;

@Component({
  selector: 'app-coach-perfil-editar',
  imports: [
    HeaderNavigation,
    UserMenu,
    AsyncPipe,
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
    if (this.session.demo()) return;
    this.form.reset();
    const p = this.profiles.profile();
    if (p?.role === 'COACH') this.form.patchValue({ especialidad: p.especialidadPrincipal,
      organizacion: p.organizacionClub ?? '', anios: p.aniosExperiencia, presentacion: p.presentacion ?? '' });
  }
  private readonly ruta = inject(ActivatedRoute);

  protected readonly perfil = this.session.demo() ? PERFIL_COACH_DEMO : {
    ...PERFIL_COACH_DEMO, nombre: this.session.account()?.email ?? '', iniciales: 'KL',
  };
  protected readonly maxPresentacion = MAX_PRESENTACION;

  protected readonly form = new FormGroup({
    especialidad: new FormControl(PERFIL_COACH_DEMO.especialidad, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    organizacion: new FormControl(PERFIL_COACH_DEMO.organizacion, {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    anios: new FormControl<number | null>(PERFIL_COACH_DEMO.anios, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_ANIOS),
    ]),
    presentacion: new FormControl(PERFIL_COACH_DEMO.presentacion, {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_PRESENTACION)],
    }),
  });

  /** Aviso "No pudimos guardar tus cambios": se muestra tras un intento fallido de guardar. */
  protected mostrarAviso = false;

  /** `?estado=errores` abre el formulario con la especialidad vacía y 75 años, como en el Figma. */
  protected readonly vista$ = this.ruta.queryParamMap.pipe(
    map((params) => ({ errores: params.get('estado') === 'errores' })),
    tap(({ errores }) => this.aplicarEstado(errores)),
  );

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
    if (this.session.demo()) { this.error = 'Demostración: los cambios no se guardan.'; return; }
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

  private aplicarEstado(errores: boolean): void {
    if (!this.session.demo()) return;
    if (errores) {
      this.form.patchValue({ especialidad: '', anios: 75 });
      this.form.markAllAsTouched();
    }
    this.mostrarAviso = errores;
  }
}
