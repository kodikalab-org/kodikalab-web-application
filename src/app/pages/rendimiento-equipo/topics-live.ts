import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe } from '@angular/common';
import { TeamPage } from '../../shared/team-page';
import { TeamFrame } from '../../shared/team-frame';
import { TopicReport } from '../../core/team-api';
@Component({
  selector: 'app-topics-live',
  imports: [TeamFrame],
  template: ` <app-team-frame
    [page]="this"
    title="Rendimiento de mi equipo"
    description="Identifica los temas que requieren refuerzo a partir de la cobertura colectiva."
    [coach]="true"
  >
    @if (report(); as report) {
      <section class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-kl-border bg-kl-surface p-5">
          <span>Integrantes activos</span
          ><strong class="block text-3xl">{{ report.activeMembers }}</strong>
        </div>
        <div class="rounded-2xl border border-kl-border bg-kl-surface p-5">
          <span>Resoluciones pendientes</span
          ><strong class="block text-3xl">{{ report.pendingResolutions }}</strong>
          <p>No cuentan como aceptaciones.</p>
        </div>
      </section>
      <section class="rounded-xl border border-kl-accent p-4">
        <h2 class="font-display text-xl">Criterio de comparación</h2>
        <p>{{ report.comparisonExplanation }}</p>
        <p>
          Todos los temas con menor cobertura se incluyen. Utiliza problemas sin resolver y
          participación para priorizar.
        </p>
      </section>
      <div class="grid gap-4 md:grid-cols-2">
        @for (topic of report.topics; track topic.topicId) {
          <article class="rounded-2xl border border-kl-border-strong bg-kl-surface p-5">
            <h2 class="font-display text-xl">{{ topic.topicName }}</h2>
            @if (topic.lowestCoverage) {
              <p class="font-bold text-kl-accent-text">
                Menor cobertura compartida entre todos los mínimos
              </p>
            }
            <p>
              {{ topic.solvedProblems }} de {{ topic.assignedProblems }} problemas distintos
              resueltos
            </p>
            <strong>{{ topic.coveragePercentage }} %</strong>
            <div
              role="progressbar"
              [attr.aria-label]="topic.topicName"
              [attr.aria-valuenow]="topic.coveragePercentage"
              aria-valuemin="0"
              aria-valuemax="100"
              class="my-3 h-2 overflow-hidden rounded-full bg-kl-raised"
            >
              <div class="h-full bg-kl-accent" [style.width.%]="topic.coveragePercentage"></div>
            </div>
            <p>
              Sin resolver: {{ topic.unsolvedProblems }} · Integrantes que resolvieron:
              {{ topic.solvingMembers }}
            </p>
            <p>Pendientes de veredicto: {{ topic.pendingResolutions }}</p>
          </article>
        } @empty {
          <p role="status">El servicio no devolvió temas.</p>
        }
      </div>
    }
  </app-team-frame>`,
})
export class TopicsLive extends TeamPage {
  readonly report = signal<TopicReport | null>(null);
  protected clear() {
    this.report.set(null);
  }
  reload() {
    const id = this.teamId();
    if (!id) return;
    this.clear();
    this.read(this.api.topics(id), (value) => this.report.set(value));
  }
}
