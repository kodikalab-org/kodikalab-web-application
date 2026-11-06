import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import {
  PRACTITIONER_LIMITS,
  RejectedValues,
  SERVER_ERROR,
  cicloValido,
  errorMessage,
  maxText,
  requiredText,
  trimmed,
} from '../../../../models/profile-validation';

/** Backend field -> form control, for errors returned when the last step saves the profile. */
const CONTROL_POR_CAMPO: Record<string, string> = {
  codigoEstudiante: 'codigo', carrera: 'carrera', cicloAcademico: 'ciclo',
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
};

@Component({
  selector: 'app-onboarding-datos-academicos',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
  ],
  templateUrl: './datos-academicos.html',
  styleUrl: './datos-academicos.css',
})
export class OnboardingDatosAcademicos {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  constructor() {
    if (this.session.demo()) return;
    const draft = this.profiles.academic;
    this.form.patchValue(draft);
    // The district does not exist in the backend: it is shown disabled and never sent.
    this.form.controls.distrito.disable();
    // Errors returned when the last step tried to save: show them under their field.
    this.rechazos.reject(this.form, this.profiles.draftErrors, CONTROL_POR_CAMPO);
    this.profiles.draftErrors = {};
  }
  protected continuar(): void {
    const { codigo, carrera, ciclo, distrito } = this.form.getRawValue();
    this.profiles.academic = { codigo: trimmed(codigo), carrera: trimmed(carrera), ciclo, distrito };
  }
  protected mensaje(campo: keyof typeof MENSAJES): string {
    return errorMessage(this.form.controls[campo], MENSAJES[campo]);
  }
  protected readonly limites = PRACTITIONER_LIMITS;
  protected get codigoRechazado(): boolean {
    const codigo = this.form.controls.codigo;
    return codigo.hasError('duplicado') || codigo.hasError(SERVER_ERROR);
  }
  protected readonly carreras = [
    'Ingeniería de Software',
    'Ciencias de la Computación',
    'Ingeniería de Sistemas de Información',
  ];
  protected readonly ciclos = [
    '1.º ciclo',
    '2.º ciclo',
    '3.º ciclo',
    '4.º ciclo',
    '5.º ciclo',
    '6.º ciclo',
    '7.º ciclo',
    '8.º ciclo',
    '9.º ciclo',
    '10.º ciclo',
  ];
  protected readonly distritos = [
    'San Miguel',
    'Miraflores',
    'San Isidro',
    'Santiago de Surco',
    'Barranco',
    'Jesús María',
  ];

  /** Código que la respuesta 409 simulada marca como ya vinculado a otro practicante. */
  private codigoOcupado: string | null = null;

  private readonly rechazos = new RejectedValues();

  protected readonly form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredText,
        maxText(PRACTITIONER_LIMITS.codigo),
        this.rechazos.validator('codigo'),
        (control: AbstractControl): ValidationErrors | null =>
          control.value && control.value === this.codigoOcupado ? { duplicado: true } : null,
      ],
    }),
    carrera: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, maxText(PRACTITIONER_LIMITS.carrera), this.rechazos.validator('carrera')],
    }),
    ciclo: new FormControl('', { nonNullable: true, validators: [cicloValido, this.rechazos.validator('ciclo')] }),
    distrito: new FormControl('', { nonNullable: true }),
  });

  /**
   * Estados de maqueta (`?estado=`): `errores` marca los campos como tocados y
   * `duplicado` precarga los datos y simula la respuesta 409 del código.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    if (!this.session.demo()) return;
    this.codigoOcupado = estado === 'duplicado' ? '20240001' : null;
    this.form.reset();
    if (estado === 'duplicado') {
      this.form.patchValue({
        codigo: '20240001',
        carrera: 'Ingeniería de Software',
        ciclo: '5.º ciclo',
        distrito: 'San Miguel',
      });
    }
    if (estado === 'errores' || estado === 'duplicado') {
      this.form.markAllAsTouched();
    }
  }
}
