import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
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
    if (!this.session.demo()) {
      this.form.patchValue(this.profiles.academic);
      this.form.controls.distrito.disable();
    }
  }
  protected continuar(): void { this.profiles.academic = this.form.getRawValue(); }
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

  protected readonly form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(20),
        (control: AbstractControl): ValidationErrors | null =>
          control.value && control.value === this.codigoOcupado ? { duplicado: true } : null,
      ],
    }),
    carrera: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ciclo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
