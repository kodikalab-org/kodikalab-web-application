import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe } from '@angular/common';
import { TeamPage } from '../../shared/team-page';
import { TeamFrame } from '../../shared/team-frame';
import { HttpErrorResponse } from '@angular/common/http';
import { OfficialResult, TeamCompetition, positiveId } from '../../core/team-api';
@Component({
  selector: 'app-results-live',
  imports: [
    TeamFrame,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe,
  ],
  template: ` <app-team-frame
    [page]="this"
    title="Resultados oficiales"
    description="Conserva las participaciones confirmadas de tu equipo y completa los resultados pendientes."
    [coach]="true"
  >
    @if (teamId()) {
      <section class="rounded-2xl border border-kl-border bg-kl-surface p-5">
        <h2 class="font-display text-xl">Participación en una competencia existente</h2>
        <form [formGroup]="lookup" (ngSubmit)="loadResult()" class="flex flex-wrap items-end gap-3">
          <label class="flex min-w-0 flex-1 flex-col gap-2"
            >Competencia
            <select
              aria-label="Competencia"
              class="team-select"
              formControlName="competitionId"
              (change)="loadResult()"
              [attr.disabled]="saving() || busy() || !competitions().length ? '' : null"
            >
              <option value="">Selecciona una competencia</option>
              @for (competition of competitions(); track competition.competitionId) {
                <option [value]="competition.competitionId">
                  {{ competition.eventName }} · {{ competition.status }}
                </option>
              }
            </select>
          </label>
          <button mat-stroked-button [disabled]="busy() || saving() || !parsedCompetition()">
            Consultar resultado
          </button>
        </form>
        @if (!busy() && !error() && !competitions().length) {
          <p role="status">Este equipo no tiene competencias disponibles.</p>
        }
        @if (loadedId() && loadedId() === parsedCompetition()) {
          @if (result(); as result) {
            <p>
              {{ result.eventName }} · Equipo {{ result.teamId }} ·
              <strong>{{ result.status }}</strong>
            </p>
          } @else {
            <p>
              No hay resultado registrado. Puedes crear uno pendiente o confirmarlo si la
              competencia está finalizada.
            </p>
          }
          <form [formGroup]="form" (ngSubmit)="save(false)" class="flex flex-col gap-3">
            <div class="grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline"
                ><mat-label>Posición final</mat-label
                ><input
                  matInput
                  type="number"
                  formControlName="finalPosition"
                  min="1"
                  step="1"
                /><mat-error>Debe ser un entero positivo.</mat-error></mat-form-field
              ><mat-form-field appearance="outline"
                ><mat-label>Problemas resueltos</mat-label
                ><input
                  matInput
                  type="number"
                  formControlName="solvedProblems"
                  min="0"
                  step="1"
                /><mat-error>Debe ser un entero no negativo.</mat-error></mat-form-field
              >
            </div>
            @if (result()?.status !== 'CONFIRMADO') {
              <p>
                El pendiente admite campos vacíos. Confirmar requiere ambos datos y una competencia
                FINALIZADA. PUT reemplaza los dos valores.
              </p>
              <div class="flex flex-wrap gap-3">
                <button
                  mat-stroked-button
                  type="submit"
                  [disabled]="saving() || busy() || form.invalid"
                >
                  Guardar pendiente</button
                ><button
                  mat-flat-button
                  type="button"
                  (click)="save(true)"
                  [disabled]="saving() || busy() || form.invalid"
                >
                  Confirmar resultado
                </button>
              </div>
            } @else {
              <p role="status">El resultado está confirmado y no puede editarse.</p>
            }
          </form>
        }
      </section>
      <section class="rounded-2xl border border-kl-border bg-kl-surface p-5">
        <h2 class="font-display text-xl">Historial confirmado</h2>
        <p>Los pendientes solo se consultan por competencia; no aparecen en este historial.</p>
        @for (item of history(); track item.id) {
          <article class="border-t border-kl-border py-4">
            <h3>{{ item.eventName }}</h3>
            <p>
              {{ item.competitionEndsAt | date: 'mediumDate' }} · Posición
              {{ item.finalPosition }} · {{ item.solvedProblems }} problemas resueltos
            </p>
            <button
              mat-stroked-button
              type="button"
              (click)="open(item.competitionId)"
              [disabled]="saving()"
            >
              Consultar detalle
            </button>
          </article>
        } @empty {
          @if (historyLoaded() && !busy() && !error()) {
            <p>No hay resultados confirmados.</p>
          } @else if (!historyLoaded() && !busy() && !error()) {
            <p role="status">El historial aún no está disponible. Reintenta la consulta del equipo.</p>
          }
        }
      </section>
    }
  </app-team-frame>`,
})
export class ResultsLive extends TeamPage {
  readonly history = signal<OfficialResult[]>([]);
  readonly historyLoaded = signal(false);
  readonly competitions = signal<TeamCompetition[]>([]);
  readonly result = signal<OfficialResult | null>(null);
  readonly loadedId = signal<number | null>(null);
  readonly lookup = new FormGroup({ competitionId: new FormControl('', { nonNullable: true }) });
  readonly form = new FormGroup({
    finalPosition: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(2147483647),
      Validators.pattern(/^\d+$/),
    ]),
    solvedProblems: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(2147483647),
      Validators.pattern(/^\d+$/),
    ]),
  });
  parsedCompetition() {
    return positiveId(this.lookup.controls.competitionId.value);
  }
  protected clear() {
    this.competitions.set([]);
    this.history.set([]);
    this.historyLoaded.set(false);
    this.result.set(null);
    this.loadedId.set(null);
    this.form.enable();
    this.form.reset();
    this.lookup.controls.competitionId.setValue(
      this.route.snapshot.queryParamMap.get('competitionId') ?? '',
    );
  }
  reload() {
    const id = this.teamId();
    if (!id || this.saving()) return;
    this.history.set([]);
    this.historyLoaded.set(false);
    this.competitions.set([]);
    this.result.set(null);
    this.loadedId.set(null);
    this.read(this.api.competitions(id), (competitions) => {
      this.competitions.set(competitions);
      if (!competitions.some((c) => c.competitionId === this.parsedCompetition())) {
        this.lookup.controls.competitionId.setValue('');
      }
      this.read(this.api.history(id), (list) => {
        this.history.set(list);
        this.historyLoaded.set(true);
        if (this.parsedCompetition()) this.loadResult();
      });
    });
  }
  open(id: number) {
    this.lookup.controls.competitionId.setValue(String(id));
    this.loadResult();
  }
  loadResult() {
    const id = this.parsedCompetition();
    if (
      !id ||
      !this.teamId() ||
      this.saving() ||
      !this.competitions().some((c) => c.competitionId === id && c.teamId === this.teamId())
    ) {
      this.result.set(null);
      this.loadedId.set(null);
      this.error.set('Selecciona una competencia de este equipo.');
      return;
    }
    this.result.set(null);
    this.loadedId.set(null);
    this.form.enable();
    this.form.reset();
    this.read(
      this.api.result(id),
      (result) => {
        if (this.parsedCompetition() !== id) return;
        if (result.teamId !== this.teamId()) {
          this.error.set('La competencia pertenece a otro equipo.');
          return;
        }
        this.loadedId.set(id);
        this.result.set(result);
        this.form.patchValue(result);
        if (result.status === 'CONFIRMADO') this.form.disable();
      },
      (e) => {
        if (this.parsedCompetition() === id && e instanceof HttpErrorResponse && e.status === 404) {
          this.loadedId.set(id);
          this.error.set('');
          this.message.set(
            'Sin resultado disponible. La creación comprobará la existencia y autorización de la competencia.',
          );
        }
      },
    );
  }
  save(confirm: boolean) {
    const id = this.loadedId();
    if (
      !id ||
      id !== this.parsedCompetition() ||
      this.saving() ||
      this.busy() ||
      this.form.invalid ||
      this.result()?.status === 'CONFIRMADO'
    )
      return;
    const values = this.form.getRawValue();
    if (confirm && (values.finalPosition === null || values.solvedProblems === null)) {
      this.error.set('La confirmación requiere posición final y problemas resueltos.');
      return;
    }
    const request = this.result()
      ? this.api.update(id, { ...values, confirm })
      : this.api.create(id, { ...values, confirm });
    // Re-query after any failed write before retrying: a timed-out request may have committed.
    this.loadedId.set(null);
    this.write(request, (result) => {
      this.loadedId.set(id);
      this.result.set(result);
      if (result.status === 'CONFIRMADO') this.form.disable();
      this.message.set(
        result.status === 'CONFIRMADO'
          ? 'Resultado confirmado.'
          : 'Resultado guardado como pendiente.',
      );
      this.reload();
    });
  }
}
