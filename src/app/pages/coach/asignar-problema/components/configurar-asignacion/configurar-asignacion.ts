import { Component, effect, inject, untracked } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { COMPETITION_STATUS, PLATFORM_LABEL, formatDateTime } from '../../../../../core/problems-api';
import { AssignmentStore } from '../../assignment-store';
import { PasosAsignacion } from '../pasos-asignacion/pasos-asignacion';

/** Step 2 of US-07: team, competition, and letter, score and balloon color of each selected problem. */
@Component({
  selector: 'app-configurar-asignacion',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    PasosAsignacion,
  ],
  templateUrl: './configurar-asignacion.html',
  styleUrl: './configurar-asignacion.css',
  host: { class: 'block' },
})
export class ConfigurarAsignacion {
  protected readonly store = inject(AssignmentStore);
  private readonly router = inject(Router);

  protected readonly estado = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;
  protected readonly fecha = formatDateTime;

  protected readonly form = new FormGroup({
    equipo: new FormControl(this.store.teamId() === null ? '' : String(this.store.teamId()), {
      nonNullable: true,
    }),
    competencia: new FormControl<number | null>(this.store.competitionId(), [Validators.required]),
    problemas: new FormArray(
      this.store.rows().map(
        (fila) =>
          new FormGroup({
            letra: new FormControl(fila.letter, {
              nonNullable: true,
              validators: [Validators.pattern(/^[A-Za-z]{1,5}$/)],
            }),
            puntaje: new FormControl<number | null>(fila.score, [
              Validators.required,
              Validators.min(1),
              Validators.max(2147483647),
              Validators.pattern(/^\d+$/),
            ]),
            color: new FormControl(fila.color, {
              nonNullable: true,
              validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
            }),
          }),
      ),
    ),
  });

  constructor() {
    this.store.loadTeams();
    // Back from creating a contest (or from the confirmation step): the competitions may have changed.
    this.store.refreshCompetitions();

    this.form.controls.equipo.valueChanges.subscribe((valor) => {
      this.form.controls.competencia.setValue(null, { emitEvent: false });
      this.store.selectTeam(valor ? Number(valor) : null);
    });
    this.form.controls.competencia.valueChanges.subscribe((valor) => this.store.competitionId.set(valor));
    this.form.valueChanges.subscribe(() => {
      this.guardar();
      this.store.clearErrors();
    });

    // A coach with a single team does not have to pick it.
    effect(() => {
      const equipos = this.store.teams();
      if (equipos.length === 1 && this.store.teamId() === null) {
        untracked(() => {
          this.form.controls.equipo.setValue(String(equipos[0].groupId), { emitEvent: false });
          this.store.selectTeam(equipos[0].groupId);
        });
      }
    });
  }

  protected reintentarEquipos(): void {
    this.store.loadTeams();
  }

  protected continuar(): void {
    if (this.form.invalid || this.store.selected().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardar();
    this.router.navigate(['/coach/asignar-problema/confirmar']);
  }

  /** Copies the form into the store so the confirmation step (and a trip back here) sees the same values. */
  private guardar(): void {
    const { problemas, competencia } = this.form.getRawValue();
    this.store.competitionId.set(competencia);
    const configuracion = Object.fromEntries(
      this.store.selected().map((problema, i) => [
        problema.id,
        {
          letter: problemas[i]?.letra ?? '',
          score: problemas[i]?.puntaje ?? null,
          color: problemas[i]?.color ?? '',
        },
      ]),
    );
    this.store.setSettings(configuracion);
  }
}
