import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe } from '@angular/common';
import { TeamPage } from '../../shared/team-page';
import { TeamFrame } from '../../shared/team-frame';
import { HttpErrorResponse } from '@angular/common/http';
import { Ranking, LastRanking } from '../../core/team-api';
@Component({
  selector: 'app-ranking-live',
  imports: [TeamFrame, DatePipe],
  template: ` <app-team-frame
    [page]="this"
    title="Ranking de mi equipo"
    description="Conoce el avance de los integrantes sin mezclar la actividad de otros equipos."
    [coach]="session.account()?.role === 'COACH'"
  >
    @if (previous(); as snapshot) {
      <section role="status" class="rounded-xl border border-amber-400 p-4">
        <strong>Último ranking válido</strong>
        <p>
          Calculado el {{ snapshot.calculatedAt | date: 'medium' }}. No corresponde a una
          actualización exitosa.
        </p>
      </section>
    }
    @if (ranking(); as ranking) {
      @if (ranking.status === 'NO_ACTIVITY') {
        <p role="status">El equipo no tiene actividad registrada. Todavía no hay posiciones.</p>
      } @else {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-kl-border-strong bg-kl-surface p-5">
            <p class="text-kl-muted">Integrantes incluidos</p>
            <strong class="font-display text-3xl">{{ ranking.members.length }}</strong>
          </div>
          <div class="rounded-2xl border border-kl-border-strong bg-kl-surface p-5">
            <p class="text-kl-muted">Criterio</p>
            @if (ranking.orderingCriterion) {
              <strong>{{ ranking.orderingCriterion }}</strong>
            }
            @if (hasTies(ranking) && ranking.tieCriterion) {
              <p>{{ ranking.tieCriterion }}</p>
            }
          </div>
        </section>
        <section class="overflow-x-auto rounded-2xl border border-kl-border bg-kl-surface">
          <table class="w-full text-left text-sm">
            <caption class="p-4 text-left font-bold">
              Ranking del equipo
              {{
                ranking.teamId
              }}
            </caption>
            <thead>
              <tr class="border-b border-kl-border">
                <th scope="col" class="p-4">Posición</th>
                <th scope="col" class="p-4">Integrante</th>
                <th scope="col" class="p-4">Problemas aceptados</th>
              </tr>
            </thead>
            <tbody>
              @for (member of ranking.members; track member.membershipId) {
                <tr class="border-b border-kl-border">
                  <td class="p-4 font-bold">{{ member.position }}</td>
                  <td class="p-4">{{ member.fullName }}</td>
                  <td class="p-4">{{ member.acceptedProblems }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="p-4">No hay integrantes activos incluidos.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    }
  </app-team-frame>`,
})
export class RankingLive extends TeamPage {
  readonly ranking = signal<Ranking | null>(null);
  readonly previous = signal<LastRanking | null>(null);
  /** True when the service gave two members the same position. */
  protected hasTies(ranking: Ranking) {
    return new Set(ranking.members.map((m) => m.position)).size < ranking.members.length;
  }
  protected clear() {
    this.ranking.set(null);
    this.previous.set(null);
  }
  reload() {
    const id = this.teamId();
    if (!id || this.saving()) return;
    this.clear();
    this.read(
      this.api.ranking(id),
      (value) => this.ranking.set(value),
      (e) => {
        if (e instanceof HttpErrorResponse && [409, 503].includes(e.status)) {
          const snapshot = e.error?.lastValidRanking as LastRanking | undefined;
          if (
            snapshot?.ranking?.teamId === id &&
            Array.isArray(snapshot.ranking.members) &&
            snapshot.calculatedAt
          ) {
            this.previous.set(snapshot);
            this.ranking.set(snapshot.ranking);
          }
        }
      },
    );
  }
}
