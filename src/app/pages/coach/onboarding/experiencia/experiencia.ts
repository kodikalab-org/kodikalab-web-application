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

const MAX_ANIOS = 60;

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
  protected readonly sugerencias = [
    'Grafos',
    'Programación dinámica',
    'Teoría de números',
    'Estructuras de datos',
    'Geometría',
  ];

  protected readonly form = new FormGroup({
    especialidad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    sugerencias: new FormControl<string[]>([], { nonNullable: true }),
    organizacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    anios: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_ANIOS),
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
