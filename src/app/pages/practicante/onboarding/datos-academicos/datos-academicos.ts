import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { CARRERAS_EDICION, CICLOS_EDICION, DISTRITOS_EDICION } from '../../../../models/perfil-catalogos';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-onboarding-datos-academicos',
  imports: [
    SiteFooter,
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
    this.form.patchValue(this.profiles.academic);
  }
  protected continuar(): void { this.profiles.academic = this.form.getRawValue(); }
  protected readonly carreras = CARRERAS_EDICION;
  protected readonly ciclos = CICLOS_EDICION;
  protected readonly distritos = DISTRITOS_EDICION;

  protected readonly form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    carrera: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ciclo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    distrito: new FormControl('', { nonNullable: true }),
  });
}
