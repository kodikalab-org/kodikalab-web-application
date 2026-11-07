import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject, Observable, catchError, combineLatest, distinctUntilChanged, forkJoin, map, of,
  switchMap, tap, throwError,
} from 'rxjs';
import { apiError } from '../../../core/api';
import { Standings, StandingsApi, StandingsRow } from '../../../core/standings-api';
import { TeamApi, TeamCompetition, positiveId } from '../../../core/team-api';
import { AssignedProblem, TeamsApi } from '../../../core/teams-api';
import { submitUrl } from '../../../core/problem-links';
import {
  ActiveTeam, PROBLEM_BADGE, PROBLEM_LABEL, ProblemStatus, STATUS_BADGE, STATUS_LABEL, activeTeams,
  balloonColor, durationMinutes, formatCountdown, formatDateTime, formatDuration, formatSolveTime,
  injectNow, penaltyLabel, problemStatus, registrationMessage, standingCellText,
} from '../concursos-model';

export type ContestTab = 'problemas' | 'clasificacion' | 'grupo' | 'progreso';
export const CONTEST_TABS: { id: ContestTab; label: string }[] = [
  { id: 'problemas', label: 'Problemas' },
  { id: 'clasificacion', label: 'Clasificación' },
  { id: 'grupo', label: 'Grupo' },
  { id: 'progreso', label: 'Mi progreso' },
];

type PageState = 'loading' | 'ready' | 'denied' | 'error';
type PageResult =
  | { kind: 'denied' }
  | { kind: 'ready'; team: ActiveTeam; competition: TeamCompetition; items: AssignedProblem[] };

const LANGUAGES = ['C++17', 'Python 3.11', 'Java 17', 'JavaScript (Node 20)', 'Kotlin'];

/** `/concursos/:teamId/:competitionId`: Codeforces-style contest page (problems, standings, group, progress). */
@Component({
  selector: 'app-concurso-detalle',
  imports: [RouterLink, ReactiveFormsModule, CdkTrapFocus],
  templateUrl: './concurso-detalle.html',
  host: { class: 'block' },
})
export class ConcursoDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly teamsApi = inject(TeamsApi);
  private readonly teamApi = inject(TeamApi);
  private readonly standingsApi = inject(StandingsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  protected readonly now = injectNow(1000);

  protected readonly state = signal<PageState>('loading');
  protected readonly team = signal<ActiveTeam | null>(null);
  protected readonly competition = signal<TeamCompetition | null>(null);
  protected readonly items = signal<AssignedProblem[]>([]);

  protected readonly standings = signal<Standings | null>(null);
  protected readonly standingsState = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly myUserId = signal<number | null>(null);

  protected readonly message = signal('');
  protected readonly registering = signal<AssignedProblem | null>(null);
  protected readonly saving = signal(false);
  protected readonly registerError = signal('');
  protected readonly languages = LANGUAGES;
  protected readonly form = new FormGroup({
    language: new FormControl(LANGUAGES[0], { nonNullable: true, validators: [Validators.required] }),
    evidenceUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500), Validators.pattern(/^(https?:\/\/\S+)?$/)],
    }),
  });

  protected readonly tabs = CONTEST_TABS;
  private readonly tabParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('tab'))), {
    initialValue: null,
  });
  protected readonly tab = computed<ContestTab>(
    () => CONTEST_TABS.find((entry) => entry.id === this.tabParam())?.id ?? 'problemas',
  );

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusBadge = STATUS_BADGE;
  protected readonly problemLabel = PROBLEM_LABEL;
  protected readonly problemBadge = PROBLEM_BADGE;
  protected readonly formatDateTime = formatDateTime;
  protected readonly balloonColor = balloonColor;
  protected readonly standingCellText = standingCellText;
  protected readonly formatSolveTime = formatSolveTime;

  protected readonly problems = computed(() =>
    this.items()
      .map((item) => ({
        item,
        status: problemStatus(item),
        submit: submitUrl(item.problem),
      }))
      .sort((a, b) => a.item.letter.localeCompare(b.item.letter, 'es', { numeric: true })),
  );

  protected readonly progress = computed(() => {
    const counts: Record<ProblemStatus, number> = { RESUELTO: 0, PENDIENTE: 0, EN_PROGRESO: 0, SIN_INTENTOS: 0 };
    for (const item of this.items()) counts[problemStatus(item)]++;
    const total = Math.max(this.competition()?.problemsCount ?? 0, this.items().length);
    return { counts, total, percent: total ? Math.round((counts.RESUELTO / total) * 100) : 0 };
  });

  protected readonly duration = computed(() => {
    const competition = this.competition();
    return competition ? formatDuration(durationMinutes(competition.startsAt, competition.endsAt)) : '—';
  });

  /** "Empieza en …" / "Termina en …" while the contest has not ended. */
  protected readonly countdown = computed(() => {
    const competition = this.competition();
    if (!competition || competition.status === 'FINALIZADA') return '';
    const scheduled = competition.status === 'PROGRAMADA';
    const target = Date.parse(scheduled ? competition.startsAt : competition.endsAt);
    if (Number.isNaN(target)) return '';
    return `${scheduled ? 'Empieza en' : 'Termina en'} ${formatCountdown(target - this.now(), true)}`;
  });

  protected readonly penalty = computed(() => penaltyLabel(this.standings()?.penaltyRule));
  protected readonly isIoi = computed(() => this.standings()?.penaltyRule === 'IOI_POINTS');
  protected readonly canRegister = computed(() => this.competition()?.status !== 'PROGRAMADA');

  /** Why "Registrar envío" is unavailable for a problem, or `null` when it can be registered. */
  protected registerBlock(status: ProblemStatus): string | null {
    if (status === 'RESUELTO') return 'Ya resolviste este problema';
    return this.canRegister() ? null : 'Disponible cuando empiece el concurso';
  }

  protected readonly teamId = computed(() => this.team()?.groupId ?? null);

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => ({
          teamId: positiveId(params.get('teamId')),
          competitionId: positiveId(params.get('competitionId')),
        })),
        distinctUntilChanged((a, b) => a.teamId === b.teamId && a.competitionId === b.competitionId),
      ),
      this.reload$,
    ])
      .pipe(
        tap(() => {
          this.state.set('loading');
          this.message.set('');
        }),
        switchMap(([ids]) =>
          this.loadPage(ids.teamId, ids.competitionId).pipe(
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return this.state.set('error');
        if (result.kind === 'denied') return this.state.set('denied');
        this.team.set(result.team);
        this.competition.set(result.competition);
        this.items.set(result.items);
        this.state.set('ready');
        this.loadStandings();
      });
  }

  protected retry() {
    this.reload$.next();
  }

  protected loadStandings() {
    const competition = this.competition();
    const teamId = this.teamId();
    if (!competition || !teamId) return;
    // Keep the table on screen while a refresh is in flight.
    if (!this.standings()) this.standingsState.set('loading');
    forkJoin({
      standings: this.standingsApi.get(competition.competitionId),
      userId: this.teamApi.progress(teamId).pipe(
        map((progress) => progress.userId as number | null),
        catchError(() => of(null)),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ standings, userId }) => {
          this.standings.set(standings);
          this.myUserId.set(userId);
          this.standingsState.set('ready');
        },
        error: () => this.standingsState.set('error'),
      });
  }

  protected isMine(row: StandingsRow): boolean {
    const id = this.myUserId();
    return id !== null && row.userId === id;
  }

  protected openRegister(item: AssignedProblem) {
    this.form.reset({ language: LANGUAGES[0], evidenceUrl: '' });
    this.registerError.set('');
    this.registering.set(item);
  }

  protected closeRegister() {
    if (!this.saving()) this.registering.set(null);
  }

  protected register() {
    const item = this.registering();
    const teamId = this.teamId();
    if (!item || !teamId || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { language, evidenceUrl } = this.form.getRawValue();
    this.saving.set(true);
    this.registerError.set('');
    this.teamApi
      .register(teamId, item.competitionProblemId, { language, evidenceUrl: evidenceUrl.trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.registering.set(null);
          this.refreshStatuses(item);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.registerError.set(
            error instanceof HttpErrorResponse ? apiError(error) : 'No se pudo registrar el envío.',
          );
        },
      });
  }

  /**
   * Re-reads my statuses (and the standings) after registering `registered`; the banner reports the
   * status the problem actually has after the refresh, so it never contradicts the table.
   */
  private refreshStatuses(registered: AssignedProblem) {
    const competition = this.competition();
    const teamId = this.teamId();
    if (!competition || !teamId) return;
    this.teamsApi
      .assignedProblems(teamId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.items.filter((item) => item.competition.id === competition.competitionId);
          this.items.set(items);
          const current = items.find((item) => item.competitionProblemId === registered.competitionProblemId);
          this.message.set(registrationMessage(registered.letter, current ? problemStatus(current) : null));
        },
        error: () => this.message.set('Tu envío se registró, pero no pudimos actualizar tus estados.'),
      });
    this.loadStandings();
  }

  private loadPage(teamId: number | null, competitionId: number | null): Observable<PageResult> {
    const denied: PageResult = { kind: 'denied' };
    if (!teamId || !competitionId) return of(denied);
    return this.teamsApi.loadMine().pipe(
      switchMap((groups) => {
        const team = activeTeams(groups).find((entry) => entry.groupId === teamId);
        if (!team) return of(denied);
        return forkJoin({
          competitions: this.teamApi.competitions(teamId),
          assigned: this.teamsApi.assignedProblems(teamId),
        }).pipe(
          map(({ competitions, assigned }): PageResult => {
            const competition = competitions.find((entry) => entry.competitionId === competitionId);
            if (!competition) return denied;
            return {
              kind: 'ready',
              team,
              competition,
              items: assigned.items.filter((item) => item.competition.id === competitionId),
            };
          }),
          catchError((error: unknown) =>
            error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404)
              ? of(denied)
              : throwError(() => error),
          ),
        );
      }),
    );
  }
}
