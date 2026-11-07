import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { fieldErrors } from '../../../core/api';
import {
  AssignRequest,
  CatalogProblem,
  ProblemsApi,
  problemsError,
} from '../../../core/problems-api';
import { TeamApi, TeamCompetition } from '../../../core/team-api';
import { Session } from '../../../core/session';
import { CoachGroup, TeamsApi } from '../../../core/teams-api';

/** The backend rejects requests with more problems than this. */
export const MAX_PROBLEMS_PER_ASSIGNMENT = 50;
export const DEFAULT_SCORE = 1;
export const DEFAULT_COLOR = '#FF0000';

/** Letter, score and balloon color the coach chose for one selected problem. */
export interface ItemSettings {
  letter: string;
  score: number | null;
  color: string;
}

/**
 * State shared by the three steps of the assignment (catalog, configuration and confirmation). It is
 * provided at the route level, so it lives while the coach moves between the steps and is gone after leaving.
 */
@Injectable()
export class AssignmentStore {
  private readonly problems = inject(ProblemsApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly teamApi = inject(TeamApi);
  private readonly session = inject(Session);

  /** Catalog problems the coach picked, in the order they were picked (that order is the request order). */
  readonly selected = signal<CatalogProblem[]>([]);
  private readonly settings = signal<Record<number, ItemSettings>>({});

  readonly teams = signal<CoachGroup[]>([]);
  readonly teamsLoading = signal(false);
  readonly teamsError = signal<string | null>(null);
  readonly teamId = signal<number | null>(null);
  readonly competitions = signal<TeamCompetition[]>([]);
  readonly competitionsLoading = signal(false);
  readonly competitionsError = signal<string | null>(null);
  readonly competitionId = signal<number | null>(null);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  private readonly errors = signal<Record<string, string>>({});

  readonly canAdd = computed(() => this.selected().length < MAX_PROBLEMS_PER_ASSIGNMENT);
  readonly team = computed(() => this.teams().find((t) => t.groupId === this.teamId()) ?? null);
  /** Only competitions that are still open to new problems. */
  readonly assignableCompetitions = computed(() =>
    this.competitions().filter((c) => c.status === 'PROGRAMADA' || c.status === 'EN_CURSO'),
  );
  readonly competition = computed(
    () => this.assignableCompetitions().find((c) => c.competitionId === this.competitionId()) ?? null,
  );

  readonly rows = computed(() =>
    this.selected().map((problem) => ({ problem, ...this.settingsFor(problem.id) })),
  );
  readonly totalScore = computed(() => this.rows().reduce((sum, row) => sum + (row.score ?? 0), 0));

  /** Body of `POST /problems/assign`; `null` until there is a competition and at least one problem. */
  readonly request = computed<AssignRequest | null>(() => {
    const competitionId = this.competitionId();
    const rows = this.rows();
    if (competitionId === null || rows.length === 0) return null;
    return {
      competitionId,
      problems: rows.map((row) => ({
        problemId: row.problem.id,
        letter: row.letter.trim().toUpperCase() || null,
        score: row.score ?? DEFAULT_SCORE,
        balloonColor: row.color.trim().toUpperCase(),
      })),
    };
  });

  readonly competitionError = computed(() => this.errors()['competitionId'] ?? null);
  readonly generalError = computed(() => this.errors()['problems'] ?? this.errors()['body'] ?? null);
  readonly hasFieldErrors = computed(() => Object.keys(this.errors()).length > 0);

  constructor() {
    // The route-level injector outlives the page, so a different user must not inherit the previous selection.
    let first = true;
    effect(() => {
      this.session.account();
      this.session.demo();
      untracked(() => {
        if (first) first = false;
        else this.resetAll();
      });
    });
  }

  isSelected(problemId: number): boolean {
    return this.selected().some((problem) => problem.id === problemId);
  }

  /** Adds the problem, or removes it when it was already selected. Returns false when the cap blocks the add. */
  toggle(problem: CatalogProblem): boolean {
    if (this.isSelected(problem.id)) {
      this.remove(problem.id);
      return true;
    }
    if (!this.canAdd()) return false;
    this.selected.update((list) => [...list, problem]);
    return true;
  }

  remove(problemId: number): void {
    this.selected.update((list) => list.filter((problem) => problem.id !== problemId));
  }

  clear(): void {
    this.selected.set([]);
  }

  settingsFor(problemId: number): ItemSettings {
    return this.settings()[problemId] ?? { letter: '', score: DEFAULT_SCORE, color: DEFAULT_COLOR };
  }

  setSettings(settings: Record<number, ItemSettings>): void {
    this.settings.set(settings);
  }

  /** Teams the coach manages and can assign to (drafts have no competitions). Always asks again: the list may have changed. */
  loadTeams(): void {
    if (this.teamsLoading()) return;
    this.teamsLoading.set(true);
    this.teamsError.set(null);
    this.teamsApi
      .loadMine()
      .pipe(finalize(() => this.teamsLoading.set(false)))
      .subscribe({
        next: (mine) => {
          const own = mine.filter((group): group is CoachGroup => 'activeMembers' in group);
          this.teams.set(own.filter((group) => group.status !== 'BORRADOR'));
        },
        error: (error) => this.teamsError.set(problemsError(error)),
      });
  }

  /** Contest requested in the URL, applied when the team's competitions arrive. */
  private pendingCompetitionId: number | null = null;

  /** Opens the flow with a team and contest already chosen (links from the contest list). */
  preselect(teamId: number, competitionId: number): void {
    this.selectTeam(teamId);
    this.pendingCompetitionId = competitionId;
  }

  selectTeam(teamId: number | null): void {
    this.pendingCompetitionId = null;
    this.teamId.set(teamId);
    this.competitionId.set(null);
    this.competitions.set([]);
    this.loadCompetitions(teamId);
  }

  /** Asks again for the competitions of the chosen team (for example after the coach created a contest). */
  refreshCompetitions(): void {
    this.loadCompetitions(this.teamId());
  }

  private loadCompetitions(teamId: number | null): void {
    this.competitionsError.set(null);
    if (teamId === null) return;
    this.competitionsLoading.set(true);
    this.teamApi
      .competitions(teamId)
      .pipe(finalize(() => this.competitionsLoading.set(false)))
      .subscribe({
        next: (competitions) => {
          if (this.teamId() !== teamId) return;
          this.competitions.set(competitions);
          const pending = this.pendingCompetitionId;
          this.pendingCompetitionId = null;
          if (pending !== null && competitions.some((c) => c.competitionId === pending)) {
            this.competitionId.set(pending);
          }
        },
        error: (error) => {
          if (this.teamId() === teamId) this.competitionsError.set(problemsError(error));
        },
      });
  }

  /** Messages the backend attached to the fields of problem `index` (`problems[index].letter`, ...). */
  rowErrors(index: number): string[] {
    const prefix = `problems[${index}].`;
    return Object.entries(this.errors())
      .filter(([key]) => key.startsWith(prefix))
      .map(([, message]) => message);
  }

  clearErrors(): void {
    this.errors.set({});
    this.errorMessage.set(null);
  }

  /** Sends the assignment. Success resets the store; an error keeps the selection and maps the field errors. */
  submit() {
    const body = this.request();
    this.clearErrors();
    this.submitting.set(true);
    return this.problems.assign(body as AssignRequest).pipe(
      tap({
        next: () => this.reset(),
        error: (error) => {
          this.errors.set(fieldErrors(error));
          this.errorMessage.set(problemsError(error));
        },
      }),
      finalize(() => this.submitting.set(false)),
    );
  }

  /** Forgets everything, including the teams, as when another user signs in. */
  private resetAll(): void {
    this.reset();
    this.teams.set([]);
    this.teamId.set(null);
    this.competitions.set([]);
  }

  /** Forgets the selection and the configuration; the coach teams stay loaded. */
  reset(): void {
    this.selected.set([]);
    this.settings.set({});
    this.competitionId.set(null);
    this.clearErrors();
  }
}
