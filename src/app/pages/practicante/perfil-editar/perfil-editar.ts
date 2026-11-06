import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { firstValueFrom, map, tap } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { PractitionerProfile, apiError } from '../../../core/api';
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

/** Letters, numbers, dot, hyphen and underscore (optional field, max 50). */
const HANDLE_VALIDO = /^[A-Za-z0-9._-]*$/;

/** Cycle number must be >= 1 (e.g. "5.º ciclo" -> 5). */
function cicloValido(control: AbstractControl) {
  const numero = Number.parseInt(String(control.value), 10);
  return Number.isNaN(numero) || numero >= 1 ? null : { ciclo: true };
}

@Component({
  selector: 'app-perfil-editar',
  imports: [
    HeaderNavigation,
    MatMenuModule,
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
  ],
  templateUrl: './perfil-editar.html',
  styleUrl: './perfil-editar.css',
})
export class PerfilEditar {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected busy = false;
  protected error = '';
  constructor() {
    if (this.session.demo()) return;
    const p = this.profiles.profile();
    this.form.reset();
    this.form.patchValue({ distrito: '', experiencia: null, franja: null, dias: [], objetivo: null });
    if (p?.role === 'PRACTICANTE') this.form.patchValue({
      codigo: p.codigoEstudiante, carrera: p.carrera, ciclo: `${p.cicloAcademico}.º ciclo`,
      nivel: p.nivelCompetitivo, codeforces: p.codeforcesHandle ?? '',
      atcoder: p.atcoderHandle ?? '', vjudge: p.vjudgeHandle ?? '',
    });
    for (const control of ['distrito', 'experiencia', 'franja', 'dias', 'objetivo'] as const) this.form.controls[control].disable();
  }
  protected async guardar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    if (this.session.demo()) { this.error = 'Demostración: los cambios no se guardan.'; return; }
    this.busy = true;
    this.error = '';
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(this.profiles.save({ codigoEstudiante: v.codigo, carrera: v.carrera,
        cicloAcademico: Number.parseInt(v.ciclo, 10), nivelCompetitivo: v.nivel as PractitionerProfile['nivelCompetitivo'],
        codeforcesHandle: v.codeforces || null, atcoderHandle: v.atcoder || null, vjudgeHandle: v.vjudge || null }));
      await this.router.navigate(['/perfil'], { queryParams: { estado: 'actualizado' } });
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  private readonly route = inject(ActivatedRoute);

  protected readonly iniciales = this.session.demo() ? INFO_PERSONAL_DEMO.iniciales : 'KL';
  protected readonly carreras = CARRERAS_EDICION;
  protected readonly ciclos = CICLOS_EDICION;
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
        Validators.required,
        Validators.maxLength(20),
        (control: AbstractControl) =>
          this.simularRechazo && control.value === USUARIO_DEMO.codigoEstudiante
            ? { duplicado: true }
            : null,
      ],
    }),
    carrera: new FormControl(USUARIO_DEMO.carrera, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    ciclo: new FormControl(USUARIO_DEMO.ciclo, {
      nonNullable: true,
      validators: [Validators.required, cicloValido],
    }),
    distrito: new FormControl(USUARIO_DEMO.distrito ?? '', { nonNullable: true }),
    nivel: new FormControl<string | null>(USUARIO_DEMO.nivel, [Validators.required]),
    experiencia: new FormControl<number | null>(USUARIO_DEMO.experienciaMeses, [
      Validators.min(0),
    ]),
    franja: new FormControl<string | null>(USUARIO_DEMO.franjaHoraria),
    dias: new FormControl<string[]>(USUARIO_DEMO.diasDisponibles, { nonNullable: true }),
    objetivo: new FormControl<string | null>(USUARIO_DEMO.objetivo),
    codeforces: new FormControl(HANDLES_EDICION.codeforces, {
      nonNullable: true,
      validators: [
        Validators.maxLength(50),
        Validators.pattern(HANDLE_VALIDO),
        (control: AbstractControl) =>
          this.simularRechazo && control.value === HANDLES_EDICION.codeforces
            ? { pattern: true }
            : null,
      ],
    }),
    atcoder: new FormControl(HANDLES_EDICION.atcoder, {
      nonNullable: true,
      validators: [Validators.maxLength(50), Validators.pattern(HANDLE_VALIDO)],
    }),
    vjudge: new FormControl(HANDLES_EDICION.vjudge, {
      nonNullable: true,
      validators: [Validators.maxLength(50), Validators.pattern(HANDLE_VALIDO)],
    }),
  });

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

  protected tieneErrorHandle(control: 'codeforces' | 'atcoder' | 'vjudge'): boolean {
    const campo = this.form.controls[control];
    return campo.invalid && campo.touched;
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
