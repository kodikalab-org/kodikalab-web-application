import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, tap } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { CoachRequest, apiError } from '../../../core/api';
import { PERFIL_COACH_DEMO } from '../../../data/perfil-coach-demo';
import {
  COACH_LIMITS,
  applyBackendErrors,
  backendFieldErrors,
  blankToNull,
  errorMessage,
  maxText,
  requiredText,
  trimmed,
  wholeNumber,
} from '../../../models/profile-validation';

const MAX_ANIOS = COACH_LIMITS.aniosMax;
const MAX_PRESENTACION = COACH_LIMITS.presentacion;

/** Backend field -> form control, to show 400 errors under the right input. */
const CONTROL_POR_CAMPO: Record<string, string> = {
  especialidadPrincipal: 'especialidad', organizacionClub: 'organizacion',
  aniosExperiencia: 'anios', presentacion: 'presentacion',
};
const MENSAJES = {
  especialidad: {
    required: 'Ingresa tu especialidad principal',
    maxlength: `La especialidad no puede superar los ${COACH_LIMITS.especialidad} caracteres`,
  },
  organizacion: {
    maxlength: `La organización no puede superar los ${COACH_LIMITS.organizacion} caracteres`,
  },
  anios: {
    required: 'Ingresa un valor entre 0 y 60',
    min: 'Ingresa un valor entre 0 y 60',
    max: 'Ingresa un valor entre 0 y 60',
    integer: 'Los años de experiencia deben ser un número entero',
  },
  presentacion: {
    maxlength: `La presentación no puede superar los ${COACH_LIMITS.presentacion} caracteres`,
  },
};

@Component({
  selector: 'app-coach-perfil-editar',
  imports: [
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
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Backend messages for fields that have no control in this form. */
  protected readonly avisos = signal<string[]>([]);
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
  protected readonly enlaces = ['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos'];
  protected readonly maxPresentacion = MAX_PRESENTACION;
  protected readonly maxOrganizacion = COACH_LIMITS.organizacion;

  protected readonly form = new FormGroup({
    especialidad: new FormControl(PERFIL_COACH_DEMO.especialidad, {
      nonNullable: true,
      validators: [requiredText, maxText(COACH_LIMITS.especialidad)],
    }),
    organizacion: new FormControl(PERFIL_COACH_DEMO.organizacion, {
      nonNullable: true,
      validators: [maxText(COACH_LIMITS.organizacion)],
    }),
    anios: new FormControl<number | null>(PERFIL_COACH_DEMO.anios, [
      Validators.required,
      Validators.min(COACH_LIMITS.aniosMin),
      Validators.max(MAX_ANIOS),
      wholeNumber,
    ]),
    presentacion: new FormControl(PERFIL_COACH_DEMO.presentacion, {
      nonNullable: true,
      validators: [maxText(MAX_PRESENTACION)],
    }),
  });

  /** Aviso "No pudimos guardar tus cambios": se muestra tras un intento fallido de guardar. */
  protected readonly mostrarAviso = signal(false);

  /** Message of the first failing rule of a field (or the one returned by the backend). */
  protected mensaje(campo: keyof typeof MENSAJES): string {
    return errorMessage(this.form.controls[campo], MENSAJES[campo]);
  }

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
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarAviso.set(true);
      return;
    }
    if (this.session.demo()) { this.error.set('Demostración: los cambios no se guardan.'); return; }
    this.busy.set(true);
    this.error.set('');
    this.avisos.set([]);
    try {
      // On failure ProfileApi keeps the previous profile and the form keeps what was typed.
      await firstValueFrom(this.profiles.save(this.construirSolicitud()));
      await this.router.navigate(['/coach/perfil'], { queryParams: { estado: 'actualizado' } });
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.busy.set(false);
    }
  }

  /** Trimmed values in the shape of PUT /users/me; empty optional text is sent as null. */
  private construirSolicitud(): CoachRequest {
    const v = this.form.getRawValue();
    return {
      especialidadPrincipal: trimmed(v.especialidad), organizacionClub: blankToNull(v.organizacion),
      aniosExperiencia: v.anios!, presentacion: blankToNull(v.presentacion),
    };
  }

  private mostrarError(error: unknown): void {
    const campos = backendFieldErrors(error);
    if (error instanceof HttpErrorResponse && error.status === 400 && Object.keys(campos).length > 0) {
      this.avisos.set(applyBackendErrors(this.form, campos, CONTROL_POR_CAMPO));
      this.mostrarAviso.set(true);
    } else {
      this.error.set(apiError(error));
    }
  }

  private aplicarEstado(errores: boolean): void {
    if (!this.session.demo()) return;
    if (errores) {
      this.form.patchValue({ especialidad: '', anios: 75 });
      this.form.markAllAsTouched();
    }
    this.mostrarAviso.set(errores);
  }
}
