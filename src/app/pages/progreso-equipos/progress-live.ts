import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe } from '@angular/common';
import { TeamPage } from '../../shared/team-page';
import { TeamFrame } from '../../shared/team-frame';
import { AssignedProblem, Progress, Registration, positiveId } from '../../core/team-api';
const OTHER_TEAM_PROGRESS = 'El avance recibido pertenece a otro equipo y se ignoró.';
const OTHER_TEAM_ASSIGNMENTS = 'Los problemas recibidos pertenecen a otro equipo y se ignoraron.';
@Component({
  selector: 'app-progress-live',
  imports: [TeamFrame, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: ` <app-team-frame
    [page]="this"
    title="Mi progreso por equipo"
    description="Cada resolución conserva su contexto. El mismo problema en otro equipo tiene un registro independiente."
  >
    @if (progress(); as progress) {
      <section class="rounded-2xl border border-kl-border-strong bg-kl-surface p-5">
        <h2 class="font-display text-xl">Equipo {{ progress.teamId }}</h2>
        <p>Problemas distintos aceptados</p>
        <strong class="font-display text-4xl">{{ progress.acceptedProblems }}</strong>
        @if (progress.acceptedProblems === 0) {
          <p>No hay problemas aceptados en este equipo.</p>
        }
        <p class="text-sm text-kl-muted">
          La API no proporciona porcentaje, total asignado ni historial de actividad.
        </p>
      </section>
      <section class="rounded-2xl border border-kl-border bg-kl-surface p-5">
        <h2 class="font-display text-xl">Registrar resolución manual</h2>
        <p>
          Declaración provisional: no se ejecuta tu código ni se verifica automáticamente la
          evidencia.
        </p>
        @if (!busy() && !error() && !assignments().length) {
          <p role="status">Este equipo no tiene problemas asignados.</p>
        }
        <form [formGroup]="form" (ngSubmit)="register()" class="flex flex-col gap-4">
          <label class="flex min-w-0 flex-col gap-2"
            >Problema asignado
            <select
              aria-label="Problema asignado"
              class="team-select"
              formControlName="competitionProblemId"
              [attr.disabled]="saving() || busy() || !assignments().length ? '' : null"
            >
              <option value="">Selecciona un problema de competencia</option>
              @for (assignment of assignments(); track assignment.competitionProblemId) {
                <option [value]="assignment.competitionProblemId">
                  {{ assignment.eventName }} · {{ assignment.letter }} · {{ assignment.title }}
                </option>
              }
            </select>
          </label>
          <mat-form-field appearance="outline"
            ><mat-label>Lenguaje utilizado</mat-label
            ><input matInput formControlName="language" maxlength="30" /><mat-error
              >Introduce un lenguaje de hasta 30 caracteres.</mat-error
            ></mat-form-field
          >
          <mat-form-field appearance="outline"
            ><mat-label>Evidencia HTTP/HTTPS (opcional)</mat-label
            ><input matInput type="url" formControlName="evidenceUrl" maxlength="500" /><mat-error
              >Introduce una URL HTTP/HTTPS válida.</mat-error
            ></mat-form-field
          >
          <button mat-flat-button [disabled]="form.invalid || saving() || busy()">
            {{ saving() ? 'Registrando…' : 'Registrar como manual provisional' }}
          </button>
        </form>
      </section>
    }
    @if (registration(); as record) {
      <section role="status" class="rounded-xl border border-kl-accent p-4">
        <strong>{{ record.registrationMethod }}</strong>
        <p>
          Resolución {{ record.resolution.resolutionId }} registrada en el equipo
          {{ record.progress.teamId }}. El veredicto ACCEPTED es una declaración manual provisional.
        </p>
      </section>
    }
  </app-team-frame>`,
})
export class ProgressLive extends TeamPage {
  readonly progress = signal<Progress | null>(null);
  readonly assignments = signal<AssignedProblem[]>([]);
  readonly registration = signal<Registration | null>(null);
  readonly form = new FormGroup({
    competitionProblemId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[1-9]\d*$/)],
    }),
    language: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(30)],
    }),
    evidenceUrl: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.maxLength(500),
        Validators.pattern(/^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/),
      ],
    }),
  });
  protected clear() {
    this.assignments.set([]);
    this.progress.set(null);
    this.registration.set(null);
    this.form.reset();
    this.form.controls.competitionProblemId.setValue(
      this.route.snapshot.queryParamMap.get('competitionProblemId') ?? '',
    );
  }
  reload() {
    const id = this.teamId();
    if (!id || this.saving()) return;
    this.progress.set(null);
    this.registration.set(null);
    this.assignments.set([]);
    // Progress and assignments are independent: one failing must not hide the other.
    this.readGroup((part) => {
      part(this.api.assignments(id), (assignments) => {
        const own = assignments.filter((a) => a.teamId === id);
        if (own.length !== assignments.length) this.error.set(OTHER_TEAM_ASSIGNMENTS);
        this.assignments.set(own);
        if (
          !own.some(
            (a) =>
              a.competitionProblemId === positiveId(this.form.controls.competitionProblemId.value),
          )
        ) {
          this.form.controls.competitionProblemId.setValue('');
        }
      });
      part(this.api.progress(id), (progress) => {
        if (progress.teamId !== id) {
          this.error.set(OTHER_TEAM_PROGRESS);
          return;
        }
        this.progress.set(progress);
      });
    });
  }
  register() {
    const team = this.teamId();
    const data = this.form.getRawValue();
    const assignment = positiveId(data.competitionProblemId);
    if (
      !team ||
      !assignment ||
      !this.assignments().some((a) => a.competitionProblemId === assignment && a.teamId === team) ||
      !this.progress() ||
      this.form.invalid ||
      this.saving() ||
      this.busy()
    )
      return;
    this.registration.set(null);
    this.write(
      this.api.register(team, assignment, {
        language: data.language.trim(),
        evidenceUrl: data.evidenceUrl.trim() || null,
      }),
      (record) => {
        this.progress.set(record.progress);
        this.registration.set(record);
        this.message.set(
          'Resolución manual registrada. El progreso corresponde únicamente a este equipo.',
        );
      },
    );
  }
}
