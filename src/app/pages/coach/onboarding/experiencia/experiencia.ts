import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import {
  COACH_LIMITS,
  RejectedValues,
  errorMessage,
  maxText,
  requiredText,
  trimmed,
  wholeNumber,
} from '../../../../models/profile-validation';

const MAX_ANIOS = COACH_LIMITS.aniosMax;

/** Backend field -> form control, for errors returned when the last step saves the profile. */
const CONTROL_POR_CAMPO: Record<string, string> = {
  especialidadPrincipal: 'especialidad', organizacionClub: 'organizacion', aniosExperiencia: 'anios',
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
};

@Component({
  selector: 'app-onboarding-experiencia',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './experiencia.html',
  styleUrl: './experiencia.css',
})
export class OnboardingExperiencia {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  constructor() {
    if (this.session.demo()) return;
    this.form.patchValue(this.profiles.coach);
    // Errors returned when the last step tried to save: show them under their field.
    this.rechazos.reject(this.form, this.profiles.draftErrors, CONTROL_POR_CAMPO);
    this.profiles.draftErrors = {};
  }
  protected continuar(): void {
    const { especialidad, organizacion, anios } = this.form.getRawValue();
    this.profiles.coach = { especialidad: trimmed(especialidad), organizacion: trimmed(organizacion), anios };
  }
  protected mensaje(campo: keyof typeof MENSAJES): string {
    return errorMessage(this.form.controls[campo], MENSAJES[campo]);
  }
  protected readonly maxOrganizacion = COACH_LIMITS.organizacion;
  protected readonly sugerencias = [
    'Grafos',
    'Programación dinámica',
    'Teoría de números',
    'Estructuras de datos',
    'Geometría',
  ];

  private readonly rechazos = new RejectedValues();

  protected readonly form = new FormGroup({
    especialidad: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, maxText(COACH_LIMITS.especialidad), this.rechazos.validator('especialidad')],
    }),
    sugerencias: new FormControl<string[]>([], { nonNullable: true }),
    organizacion: new FormControl('', {
      nonNullable: true,
      validators: [maxText(COACH_LIMITS.organizacion), this.rechazos.validator('organizacion')],
    }),
    anios: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(COACH_LIMITS.aniosMin),
      Validators.max(MAX_ANIOS),
      wholeNumber,
      this.rechazos.validator('anios'),
    ]),
  });

  protected aplicarSugerencias(valores: string[]): void {
    if (valores.length > 0) {
      this.form.controls.especialidad.setValue(valores.join(' y '));
    }
  }

  protected cambiarAnios(paso: number): void {
    const anios = this.form.controls.anios;
    anios.setValue(Math.min(MAX_ANIOS, Math.max(0, (anios.value ?? 0) + paso)));
    anios.markAsTouched();
  }

  /**
   * Estados de maqueta (`?estado=`): `errores` marca los campos como tocados y
   * `completa` precarga los valores del Figma.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    if (!this.session.demo()) return;
    this.form.reset();
    if (estado === 'completa') {
      this.form.patchValue({
        especialidad: 'Grafos y Programación Dinámica',
        sugerencias: ['Grafos', 'Programación dinámica'],
        organizacion: 'Club de Programación Competitiva',
        anios: 4,
      });
    }
    if (estado === 'errores') {
      this.form.markAllAsTouched();
    }
  }
}
