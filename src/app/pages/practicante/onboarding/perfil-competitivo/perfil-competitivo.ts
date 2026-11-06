import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { RejectedValues, errorMessage, nivelValido } from '../../../../models/profile-validation';

const MENSAJES_NIVEL = {
  required: 'Selecciona tu nivel competitivo',
  nivel: 'El nivel debe ser Principiante, Intermedio o Avanzado',
};

@Component({
  selector: 'app-onboarding-perfil-competitivo',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatToolbarModule,
  ],
  templateUrl: './perfil-competitivo.html',
  styleUrl: './perfil-competitivo.css',
})
export class OnboardingPerfilCompetitivo {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  constructor() {
    if (!this.session.demo()) {
      this.form.patchValue(this.profiles.competitive);
      // These fields do not exist in the backend: disabled and never sent.
      for (const control of ['experiencia', 'franja', 'dias', 'objetivo'] as const) this.form.controls[control].disable();
      // Errors returned when the last step tried to save: show them under the level.
      this.rechazos.reject(this.form, this.profiles.draftErrors, { nivelCompetitivo: 'nivel' });
      this.profiles.draftErrors = {};
    }
  }
  protected get mensajeNivel(): string {
    return errorMessage(this.form.controls.nivel, MENSAJES_NIVEL);
  }
  protected continuar(): void { this.profiles.competitive = { nivel: this.form.controls.nivel.value }; }
  protected readonly niveles = [
    {
      value: 'PRINCIPIANTE',
      titulo: 'Principiante',
      descripcion: 'Estoy empezando en programación competitiva',
      icono: 'images/onboarding/level-1-24.svg',
    },
    {
      value: 'INTERMEDIO',
      titulo: 'Intermedio',
      descripcion: 'Resuelvo problemas medios con regularidad',
      icono: 'images/onboarding/level-2-24.svg',
    },
    {
      value: 'AVANZADO',
      titulo: 'Avanzado',
      descripcion: 'Participo en competencias y resuelvo problemas difíciles',
      icono: 'images/onboarding/level-3-24.svg',
    },
  ];
  protected readonly franjas = ['Mañana', 'Tarde', 'Noche'];
  protected readonly dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  protected readonly objetivos = [
    'Clasificar a competencias',
    'Mejorar mi nivel',
    'Prepararme para entrevistas',
    'Aprender por diversión',
  ];

  private readonly rechazos = new RejectedValues();

  protected readonly form = new FormGroup({
    nivel: new FormControl<string | null>(null, [nivelValido, this.rechazos.validator('nivel')]),
    experiencia: new FormControl<number | null>(null),
    franja: new FormControl<string | null>(null),
    dias: new FormControl<string[]>([], { nonNullable: true }),
    objetivo: new FormControl<string | null>(null),
  });

  /**
   * Estados de maqueta (`?estado=`): `completo` precarga todos los valores del
   * Figma y `nivel-sin-seleccionar` los precarga sin nivel y lo marca como tocado.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    if (!this.session.demo()) return;
    this.form.reset();
    if (estado === 'completo' || estado === 'nivel-sin-seleccionar') {
      this.form.patchValue({
        nivel: estado === 'completo' ? 'INTERMEDIO' : null,
        experiencia: 12,
        franja: 'Noche',
        dias: ['Mié', 'Vie'],
        objetivo: 'Clasificar a competencias',
      });
    }
    if (estado === 'nivel-sin-seleccionar') {
      this.form.controls.nivel.markAsTouched();
    }
  }
}
