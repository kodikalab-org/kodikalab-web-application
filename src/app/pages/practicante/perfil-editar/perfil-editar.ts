import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { firstValueFrom, map, tap } from 'rxjs';
import { LINK_STATE_LABEL, LinkState, PlatformKey, ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { PractitionerProfile, PractitionerRequest, apiError } from '../../../core/api';
import { USUARIO_DEMO } from '../../../data/usuario-demo';
import {
  CARRERAS_EDICION,
  CICLOS_EDICION,
  DIAS_EDICION,
  DISTRITOS_EDICION,
  FRANJAS_EDICION,
  HANDLES_EDICION,
  INFO_PERSONAL_DEMO,
  NIVELES_EDICION,
  OBJETIVOS_EDICION,
  PLATAFORMAS_EDICION,
} from '../../../data/perfil-practicante-demo';
import { EstadoEdicion } from '../../../models/perfil-practicante';
import {
  PRACTITIONER_LIMITS,
  SERVER_ERROR,
  applyBackendErrors,
  backendFieldErrors,
  blankToNull,
  cicloLabel,
  cicloValido,
  errorMessage,
  handleFormat,
  maxText,
  nivelValido,
  parseCiclo,
  requiredText,
  trimmed,
} from '../../../models/profile-validation';
import { VinculacionPendiente } from '../vinculacion-pendiente/vinculacion-pendiente';

/** Backend field -> form control, to show 400/409 errors under the right input. */
const CONTROL_POR_CAMPO: Record<string, string> = {
  codigoEstudiante: 'codigo', carrera: 'carrera', cicloAcademico: 'ciclo', nivelCompetitivo: 'nivel',
  codeforcesHandle: 'codeforces', atcoderHandle: 'atcoder', vjudgeHandle: 'vjudge',
};
const MENSAJE_HANDLE = {
  handlePattern: 'Usa solo letras, números, punto, guion y guion bajo (máx. 50)',
  maxlength: `Máximo ${PRACTITIONER_LIMITS.handle} caracteres`,
};
const MENSAJES = {
  codigo: {
    duplicado: 'Este código de estudiante ya está vinculado a otro practicante',
    required: 'Ingresa tu código de estudiante',
    maxlength: `El código no puede superar los ${PRACTITIONER_LIMITS.codigo} caracteres`,
  },
  carrera: {
    required: 'Selecciona tu carrera',
    maxlength: `La carrera no puede superar los ${PRACTITIONER_LIMITS.carrera} caracteres`,
  },
  ciclo: {
    required: 'Selecciona tu ciclo académico',
    ciclo: 'El ciclo debe ser un número entero mayor o igual a 1',
  },
  nivel: {
    required: 'Selecciona tu nivel competitivo',
    nivel: 'El nivel debe ser Principiante, Intermedio o Avanzado',
  },
  codeforces: MENSAJE_HANDLE,
  atcoder: MENSAJE_HANDLE,
  vjudge: MENSAJE_HANDLE,
};
type CampoConMensaje = keyof typeof MENSAJES;

/** Form fields the backend has no column for: disabled and never sent. */
const CAMPOS_NO_GUARDADOS = ['distrito', 'experiencia', 'franja', 'dias', 'objetivo'] as const;

@Component({
  selector: 'app-perfil-editar',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatToolbarModule,
    VinculacionPendiente,
  ],
  templateUrl: './perfil-editar.html',
  styleUrl: './perfil-editar.css',
})
export class PerfilEditar {
  protected readonly session = inject(Session);
  protected readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Backend messages for fields that have no control in this form. */
  protected readonly avisos = signal<string[]>([]);

  protected readonly enlaces = ['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos'];
  protected readonly iniciales = this.session.demo() ? INFO_PERSONAL_DEMO.iniciales : 'KL';
  protected readonly carreras = [...CARRERAS_EDICION];
  protected readonly ciclos = [...CICLOS_EDICION];
  protected readonly distritos = DISTRITOS_EDICION;
  protected readonly niveles = NIVELES_EDICION;
  protected readonly franjas = FRANJAS_EDICION;
  protected readonly dias = DIAS_EDICION;
  protected readonly objetivos = OBJETIVOS_EDICION;
  protected readonly plataformas = PLATAFORMAS_EDICION;

  /** Demo flag set by `?estado=errores`; the validators below then reject the sample values. */
  private simularRechazo = false;

  protected readonly form = new FormGroup({
    codigo: new FormControl(USUARIO_DEMO.codigoEstudiante, {
      nonNullable: true,
      validators: [
        requiredText,
        maxText(PRACTITIONER_LIMITS.codigo),
        (control: AbstractControl) =>
          this.simularRechazo && control.value === USUARIO_DEMO.codigoEstudiante
            ? { duplicado: true }
            : null,
      ],
    }),
    carrera: new FormControl(USUARIO_DEMO.carrera, {
      nonNullable: true,
      validators: [requiredText, maxText(PRACTITIONER_LIMITS.carrera)],
    }),
    ciclo: new FormControl(USUARIO_DEMO.ciclo, { nonNullable: true, validators: [cicloValido] }),
    distrito: new FormControl(USUARIO_DEMO.distrito ?? '', { nonNullable: true }),
    nivel: new FormControl<string | null>(USUARIO_DEMO.nivel, [nivelValido]),
    experiencia: new FormControl<number | null>(USUARIO_DEMO.experienciaMeses, [
      Validators.min(0),
    ]),
    franja: new FormControl<string | null>(USUARIO_DEMO.franjaHoraria),
    dias: new FormControl<string[]>(USUARIO_DEMO.diasDisponibles, { nonNullable: true }),
    objetivo: new FormControl<string | null>(USUARIO_DEMO.objetivo),
    codeforces: new FormControl(HANDLES_EDICION.codeforces, {
      nonNullable: true,
      validators: [
        maxText(PRACTITIONER_LIMITS.handle),
        handleFormat,
        (control: AbstractControl) =>
          this.simularRechazo && control.value === HANDLES_EDICION.codeforces
            ? { handlePattern: true }
            : null,
      ],
    }),
    atcoder: new FormControl(HANDLES_EDICION.atcoder, {
      nonNullable: true,
      validators: [maxText(PRACTITIONER_LIMITS.handle), handleFormat],
    }),
    vjudge: new FormControl(HANDLES_EDICION.vjudge, {
      nonNullable: true,
      validators: [maxText(PRACTITIONER_LIMITS.handle), handleFormat],
    }),
  });

  constructor() {
    if (this.session.demo()) return;
    const p = this.profiles.profile();
    this.form.reset();
    if (p?.role === 'PRACTICANTE') {
      // The selects must offer the saved value even when it is not one of the listed options.
      if (!this.carreras.includes(p.carrera)) this.carreras.push(p.carrera);
      if (!this.ciclos.includes(cicloLabel(p.cicloAcademico))) this.ciclos.push(cicloLabel(p.cicloAcademico));
      this.form.patchValue({
        codigo: p.codigoEstudiante, carrera: p.carrera, ciclo: cicloLabel(p.cicloAcademico),
        nivel: p.nivelCompetitivo, codeforces: p.codeforcesHandle ?? '',
        atcoder: p.atcoderHandle ?? '', vjudge: p.vjudgeHandle ?? '',
      });
    }
    // These fields do not exist in the backend: they stay disabled and are never sent.
    for (const control of CAMPOS_NO_GUARDADOS) this.form.controls[control].disable();
  }

  /**
   * Demo state read from `?estado=errores`: shows the 409 response (student code already
   * linked to another practicante) and a rejected Codeforces handle, keeping what was typed.
   */
  protected readonly vista$ = this.route.queryParamMap.pipe(
    map((params) => ({ errores: (params.get('estado') as EstadoEdicion | null) === 'errores' })),
    tap(({ errores }) => {
      if (errores && this.session.demo()) {
        this.aplicarErrores();
      }
    }),
  );

  protected readonly etiquetaEstado = LINK_STATE_LABEL;
  protected readonly clasesEstado: Record<LinkState, string> = {
    VINCULADA: 'border-[#4ade80]/60 bg-[#4ade80]/10 text-[#4ade80]',
    PENDIENTE: 'border-[#fbbf24]/60 bg-[#fbbf24]/10 text-[#fbbf24]',
    SIN_VINCULAR: 'border-[#34304a] bg-white/3 text-kl-muted',
  };

  /** Link status of a platform (only for real accounts; the demo has no backend). */
  protected estado(plataforma: PlatformKey) {
    return this.session.demo() ? null : this.profiles.platforms().find((p) => p.key === plataforma) ?? null;
  }

  /** Message of the first failing rule of a field (or the one returned by the backend). */
  protected mensaje(campo: CampoConMensaje): string {
    return errorMessage(this.form.controls[campo], MENSAJES[campo]);
  }

  protected tieneErrorHandle(control: 'codeforces' | 'atcoder' | 'vjudge'): boolean {
    const campo = this.form.controls[control];
    return campo.invalid && campo.touched;
  }

  /** True when the backend rejected the last save and a field still shows its message. */
  protected get hayErroresServidor(): boolean {
    return this.avisos().length > 0
      || Object.values(this.form.controls).some((control) => control.hasError(SERVER_ERROR));
  }

  protected async guardar(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.session.demo()) { this.error.set('Demostración: los cambios no se guardan.'); return; }
    const solicitud = this.construirSolicitud();
    if (!solicitud) return;
    this.busy.set(true);
    this.error.set('');
    this.avisos.set([]);
    try {
      // On failure ProfileApi keeps the previous profile and the form keeps what was typed.
      await firstValueFrom(this.profiles.save(solicitud));
      await this.router.navigate(['/perfil'], { queryParams: { estado: 'actualizado' } });
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.busy.set(false);
    }
  }

  /** Trimmed values in the shape of PUT /users/me; empty handles are sent as null. */
  private construirSolicitud(): PractitionerRequest | null {
    const v = this.form.getRawValue();
    const ciclo = parseCiclo(v.ciclo);
    if (ciclo === null) return null;
    return {
      codigoEstudiante: trimmed(v.codigo), carrera: trimmed(v.carrera), cicloAcademico: ciclo,
      nivelCompetitivo: v.nivel as PractitionerProfile['nivelCompetitivo'],
      codeforcesHandle: blankToNull(v.codeforces), atcoderHandle: blankToNull(v.atcoder),
      vjudgeHandle: blankToNull(v.vjudge),
    };
  }

  private mostrarError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const campos = backendFieldErrors(error);
    if (status === 400 && Object.keys(campos).length > 0) {
      this.avisos.set(applyBackendErrors(this.form, campos, CONTROL_POR_CAMPO));
    } else if (status === 409) {
      const mensaje = (error as HttpErrorResponse).error?.message;
      this.avisos.set(applyBackendErrors(
        this.form,
        { codigoEstudiante: typeof mensaje === 'string' ? mensaje : MENSAJES.codigo.duplicado },
        CONTROL_POR_CAMPO,
      ));
    } else {
      this.error.set(apiError(error));
    }
  }

  private aplicarErrores(): void {
    const { codigo, codeforces } = this.form.controls;
    this.simularRechazo = true;
    for (const campo of [codigo, codeforces]) {
      campo.updateValueAndValidity({ emitEvent: false });
      campo.markAsTouched();
    }
  }
}
