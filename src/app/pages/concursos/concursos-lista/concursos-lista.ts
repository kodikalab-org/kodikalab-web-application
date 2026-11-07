import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { TeamApi, TeamCompetition } from '../../../core/team-api';
import { AssignedProblem, TeamsApi } from '../../../core/teams-api';
import {
  ActiveTeam, ContestRow, STATUS_BADGE, STATUS_LABEL, activeTeams, contestProgress, durationMinutes,
  formatCountdown, formatDateTime, formatDuration, injectNow, problemStatus, splitContests,
} from '../concursos-model';

interface TeamContests {
  team: ActiveTeam;
  competitions: TeamCompetition[];
  /** `null` when the assigned problems could not be read: progress is then unknown. */
  assigned: AssignedProblem[] | null;
}

type LoadState = 'loading' | 'ready' | 'error';

/** `/concursos`: Codeforces-style contest list of my active groups, with my progress in each. */
@Component({
  selector: 'app-concursos-lista',
  imports: [RouterLink],
  templateUrl: './concursos-lista.html',
  host: { class: 'block' },
})
export class ConcursosLista {
  private readonly teamsApi = inject(TeamsApi);
  private readonly teamApi = inject(TeamApi);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  protected readonly now = injectNow(30_000);

  protected readonly state = signal<LoadState>('loading');
  protected readonly teams = signal<ActiveTeam[]>([]);
  private readonly data = signal<TeamContests[]>([]);
  protected readonly filter = signal<number | null>(null);

  private readonly visible = computed(() => {
    const only = this.filter();
    return this.data().filter((entry) => only === null || entry.team.groupId === only);
  });

  private readonly rows = computed<ContestRow[]>(() =>
    this.visible().flatMap((entry) =>
      entry.competitions.map((competition) => ({
        competition,
        teamName: entry.team.name,
        progress: entry.assigned
          ? contestProgress(entry.assigned, competition.competitionId, competition.problemsCount)
          : null,
      })),
    ),
  );

  protected readonly contests = computed(() => splitContests(this.rows()));

  protected readonly tables = computed(() => [
    {
      id: 'actuales',
      title: 'Concursos actuales y próximos',
      rows: this.contests().current,
      empty: 'No hay concursos en curso ni programados.',
    },
    {
      id: 'pasados',
      title: 'Concursos pasados',
      rows: this.contests().past,
      empty: 'Aún no hay concursos finalizados.',
    },
  ]);

  protected readonly summary = computed(() => {
    const assigned = this.visible().flatMap((entry) => entry.assigned ?? []);
    return {
      active: this.rows().filter((row) => row.competition.status === 'EN_CURSO').length,
      solved: assigned.filter((item) => problemStatus(item) === 'RESUELTO').length,
      assigned: assigned.length,
      pending: assigned.filter((item) => problemStatus(item) === 'PENDIENTE').length,
    };
  });

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusBadge = STATUS_BADGE;
  protected readonly formatDateTime = formatDateTime;

  constructor() {
    this.reload$
      .pipe(
        tap(() => this.state.set('loading')),
        switchMap(() =>
          this.load().pipe(
            map((data) => ({ data }) as { data: TeamContests[] } | null),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) {
          this.state.set('error');
          return;
        }
        this.data.set(result.data);
        this.teams.set(result.data.map((entry) => entry.team));
        this.state.set('ready');
      });
  }

  protected retry() {
    this.reload$.next();
  }

  protected selectTeam(value: string) {
    this.filter.set(value ? Number(value) : null);
  }

  protected duration(competition: TeamCompetition): string {
    return formatDuration(durationMinutes(competition.startsAt, competition.endsAt));
  }

  /** "Empieza en …" for scheduled contests and "Termina en …" for running ones. */
  protected countdown(competition: TeamCompetition): string {
    const target = Date.parse(competition.status === 'PROGRAMADA' ? competition.startsAt : competition.endsAt);
    if (Number.isNaN(target)) return '';
    if (competition.status === 'PROGRAMADA') return `Empieza en ${formatCountdown(target - this.now())}`;
    if (competition.status === 'EN_CURSO') return `Termina en ${formatCountdown(target - this.now())}`;
    return '';
  }

  protected percent(row: ContestRow): number {
    const progress = row.progress;
    return progress && progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
  }

  private load() {
    return this.teamsApi.loadMine().pipe(
      switchMap((groups) => {
        const teams = activeTeams(groups);
        if (!teams.length) return of([] as TeamContests[]);
        return forkJoin(
          teams.map((team) =>
            forkJoin({
              competitions: this.teamApi.competitions(team.groupId),
              assigned: this.teamsApi.assignedProblems(team.groupId).pipe(
                map((response) => response.items as AssignedProblem[] | null),
                catchError(() => of(null)),
              ),
            }).pipe(map((result) => ({ team, ...result }))),
          ),
        );
      }),
    );
  }
}
