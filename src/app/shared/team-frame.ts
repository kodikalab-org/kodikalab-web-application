import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TeamsApi, CoachGroup, PractitionerGroup } from '../core/teams-api';
import { Session } from '../core/session';
import { DestroyRef, OnInit, inject, signal, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { HeaderNavigation } from './header-navigation/header-navigation';
import { UserMenu } from './user-menu/user-menu';
import { TeamPage } from './team-page';
@Component({
  selector: 'app-team-frame',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatToolbarModule,
    HeaderNavigation,
    UserMenu,
  ],
  styles: [
    `:host {
      --mat-toolbar-container-background-color: transparent;
      --mat-toolbar-container-text-color: var(--kl-text);
    }`,
  ],
  template: ` <div class="relative isolate min-h-dvh overflow-clip bg-kl-bg font-body text-kl-text">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[url('/images/progreso-ranking/fondo.svg')] bg-size-[1440px_900px] bg-position-[right_top] bg-no-repeat"
    ></div>
    <header
      class="sticky top-0 z-40 border-0 border-b border-solid border-[#1b1840] bg-[#060414]/80 backdrop-blur-xl"
    >
      <mat-toolbar class="mx-auto flex h-[68px] max-w-[1600px] gap-4 px-4 lg:px-11">
        <a
          [routerLink]="coach() ? '/coach/inicio' : '/inicio'"
          aria-label="Kodikalab, inicio"
          class="flex items-center gap-2.5 text-xl sm:text-[25px]"
        >
          <img src="/images/dashboard/0-imgIcon1.svg" width="40" height="40" alt="" />Kodikalab
        </a>
        <app-header-navigation [coach]="coach()" />
        <div class="ml-auto flex items-center gap-3">
          <app-user-menu [coach]="coach()" />
        </div>
      </mat-toolbar>
    </header>
    <main class="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 lg:py-8">
      <div>
        <p class="font-mono text-xs text-kl-muted">Inicio / Mi espacio</p>
        <h1 class="m-0 font-display text-2xl font-bold lg:text-[40px]">{{ title() }}</h1>
        <p class="text-kl-muted">{{ description() }}</p>
      </div>
      <form
        [formGroup]="page().context"
        (ngSubmit)="page().selectTeam()"
        class="flex flex-wrap items-start gap-3"
      >
        <label class="flex min-w-0 flex-col gap-2"
          >Equipo
          <select
            aria-label="Equipo"
            class="team-select"
            formControlName="teamId"
            [attr.disabled]="page().saving() || loadingTeams() || !teams().length ? '' : null"
          >
            <option value="">Selecciona tu equipo</option>
            @for (team of teams(); track team.groupId) {
              <option [value]="team.groupId">{{ team.name }}</option>
            }
          </select>
        </label>
        <button
          mat-flat-button
          type="submit"
          [disabled]="page().saving() || loadingTeams() || !teams().length"
        >
          Consultar equipo
        </button>
        <button
          mat-stroked-button
          type="button"
          (click)="page().reload()"
          [disabled]="!page().teamId() || page().busy() || page().saving()"
        >
          Reintentar consulta
        </button>
      </form>
      @if (loadingTeams()) {
        <p role="status">Consultando tus equipos…</p>
      }
      @if (teamsError()) {
        <p role="alert">{{ teamsError() }}</p>
        <button mat-stroked-button type="button" (click)="loadTeams()" [disabled]="loadingTeams()">
          Reintentar equipos
        </button>
      }
      @if (!loadingTeams() && !teamsError() && !teams().length) {
        <p role="status">
          No tienes equipos disponibles. Verifica tu membresía o consulta con tu coach.
        </p>
      }
      @if (!page().teamId()) {
        <p role="status" class="rounded-xl border border-kl-border p-4">
          Selecciona un contexto de equipo válido entre tus equipos disponibles.
        </p>
      }
      @if (page().busy()) {
        <p role="status" aria-live="polite">Consultando información del equipo…</p>
      }
      @if (page().error()) {
        <section role="alert" class="rounded-xl border border-amber-400 bg-kl-surface p-4">
          <strong>{{ page().error() }}</strong>
          <ul>
            @for (field of page().fields(); track field[0]) {
              <li>{{ field[0] }}: {{ field[1] }}</li>
            }
          </ul>
        </section>
      }
      @if (page().message()) {
        <p role="status" aria-live="polite" class="rounded-xl border border-kl-accent p-4">
          {{ page().message() }}
        </p>
      }
      <ng-content />
    </main>
    <footer class="mt-8 border-t border-kl-border p-6 text-center text-sm text-kl-muted">
      KodikaLab · Entrenamiento en equipo
    </footer>
  </div>`,
})
export class TeamFrame implements OnInit {
  private readonly api = inject(TeamsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(Session);
  readonly teams = signal<(CoachGroup | PractitionerGroup)[]>([]);
  readonly loadingTeams = signal(false);
  readonly teamsError = signal('');
  ngOnInit() {
    if (!this.session.token()) return;
    this.loadTeams();
  }
  loadTeams() {
    this.loadingTeams.set(true);
    this.teamsError.set('');
    this.api
      .loadMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          // /teams/me returns every membership status: keep only the active practitioner
          // memberships, or the coach's own published (non-draft) groups.
          const available = groups.filter((group) =>
            this.coach()
              ? 'activeMembers' in group && group.status !== 'BORRADOR'
              : 'membership' in group && group.membership.status === 'ACTIVO',
          );
          this.teams.set(available);
          this.loadingTeams.set(false);
          if (available.length === 1 && !this.page().teamId()) {
            this.page().context.controls.teamId.setValue(String(available[0].groupId));
            this.page().selectTeam();
          }
        },
        error: () => {
          this.loadingTeams.set(false);
          this.teamsError.set('No se pudieron cargar tus equipos. Reintenta la consulta.');
        },
      });
  }
  readonly page = input.required<TeamPage>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly coach = input(false);
}
