import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

const MAX_ANIOS = 60;

@Component({
  selector: 'app-onboarding-experiencia',
  imports: [
    SiteFooter,
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
  constructor() { this.form.patchValue(this.profiles.coach); }
  protected continuar(): void {
    const { especialidad, organizacion, anios } = this.form.getRawValue();
    this.profiles.coach = { especialidad, organizacion, anios };
  }
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
}
