import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { PractitionerProfile, apiError } from '../../../core/api';
import {
  CARRERAS_EDICION,
  CICLOS_EDICION,
  DIAS_EDICION,
  DISTRITOS_EDICION,
  FRANJAS_EDICION,
  NIVELES_EDICION,
  OBJETIVOS_EDICION,
  PLATAFORMAS_EDICION,
} from '../../../models/perfil-catalogos';

/** Letters, numbers, dot, hyphen and underscore (optional field, max 50). */
const HANDLE_VALIDO = /^[A-Za-z0-9._-]*$/;
const TIME_VALUES = ['MANANA', 'TARDE', 'NOCHE'] as const;
const DAY_VALUES = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'] as const;

/** Cycle number must be >= 1 (e.g. "5.º ciclo" -> 5). */
function cicloValido(control: AbstractControl) {
  const numero = Number.parseInt(String(control.value), 10);
  return Number.isNaN(numero) || numero >= 1 ? null : { ciclo: true };
}

@Component({
  selector: 'app-perfil-editar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
  ],
  templateUrl: './perfil-editar.html',
  styleUrl: './perfil-editar.css',
})
export class PerfilEditar {
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected busy = false;
  protected error = '';
  constructor() {
    this.form.controls.atcoder.disable();
    this.form.controls.vjudge.disable();
    const p = this.profiles.profile();
    if (p?.role === 'PRACTICANTE') this.form.patchValue({
      codigo: p.codigoEstudiante, carrera: p.carrera, ciclo: `${p.cicloAcademico}.º ciclo`,
      nivel: p.nivelCompetitivo, codeforces: p.codeforcesHandle ?? '',
      atcoder: p.atcoderHandle ?? '', vjudge: p.vjudgeHandle ?? '',
      distrito: p.district ?? '', experiencia: p.experienceMonths ?? null,
      franja: p.preferredTime ? FRANJAS_EDICION[TIME_VALUES.indexOf(p.preferredTime)] : null,
      dias: (p.availableDays ?? []).map(day => DIAS_EDICION[DAY_VALUES.indexOf(day)]),
      objetivo: p.goal ?? null,
    });
  }
  protected async guardar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(this.profiles.save({ codigoEstudiante: v.codigo, carrera: v.carrera,
        cicloAcademico: Number.parseInt(v.ciclo, 10), nivelCompetitivo: v.nivel as PractitionerProfile['nivelCompetitivo'],
        district: v.distrito || null, experienceMonths: v.experiencia,
        preferredTime: TIME_VALUES[FRANJAS_EDICION.indexOf(v.franja ?? '')] ?? null,
        availableDays: v.dias.map(day => DAY_VALUES[DIAS_EDICION.indexOf(day)]), goal: v.objetivo,
        codeforcesHandle: v.codeforces || null, atcoderHandle: v.atcoder || null, vjudgeHandle: v.vjudge || null }));
      await this.router.navigate(['/perfil'], { queryParams: { estado: 'actualizado' } });
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected readonly carreras = CARRERAS_EDICION;
  protected readonly ciclos = CICLOS_EDICION;
  protected readonly distritos = DISTRITOS_EDICION;
  protected readonly niveles = NIVELES_EDICION;
  protected readonly franjas = FRANJAS_EDICION;
  protected readonly dias = DIAS_EDICION;
  protected readonly objetivos = OBJETIVOS_EDICION;
  protected readonly plataformas = PLATAFORMAS_EDICION;

  protected readonly form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    carrera: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    ciclo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, cicloValido],
    }),
    distrito: new FormControl('', { nonNullable: true }),
    nivel: new FormControl<string | null>(null, [Validators.required]),
    experiencia: new FormControl<number | null>(null, [Validators.min(0)]),
    franja: new FormControl<string | null>(null),
    dias: new FormControl<string[]>([], { nonNullable: true }),
    objetivo: new FormControl<string | null>(null),
    codeforces: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50), Validators.pattern(HANDLE_VALIDO)],
    }),
    atcoder: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50), Validators.pattern(HANDLE_VALIDO)],
    }),
    vjudge: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50), Validators.pattern(HANDLE_VALIDO)],
    }),
  });

  protected tieneErrorHandle(control: 'codeforces' | 'atcoder' | 'vjudge'): boolean {
    const campo = this.form.controls[control];
    return campo.invalid && campo.touched;
  }
}
