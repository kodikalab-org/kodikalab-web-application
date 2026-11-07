import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EMPTY, Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { apiError } from '../../../../core/api';
import {
  CompetitionStatus,
  CompetitionsApi,
  nextStatus,
  splitCompetitions,
} from '../../../../core/competitions-api';
import { positiveId, TeamApi, TeamCompetition } from '../../../../core/team-api';
import { CoachGroup, TeamsApi } from '../../../../core/teams-api';
import { AppHeader } from '../../../../shared/app-header/app-header';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';
import { ConfirmarEstadoDialog } from '../confirmar-estado-dialog/confirmar-estado-dialog';

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  PROGRAMADA: 'Programada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
};

const STATUS_CLASS: Record<CompetitionStatus, string> = {
  PROGRAMADA: 'border-amber-400/50 bg-amber-400/10 text-amber-300',
  EN_CURSO: 'border-green-400/50 bg-green-400/10 text-green-300',
  FINALIZADA: 'border-kl-border-strong bg-white/4 text-kl-muted',
};

const ACTION_LABEL: Partial<Record<CompetitionStatus, string>> = {
  EN_CURSO: 'Iniciar',
  FINALIZADA: 'Finalizar',
};

/** `4 h`, `2 h 30 min` or `45 min` from the contest window. */
export function formatDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest || !hours ? `${rest} min` : ''].filter(Boolean).join(' ');
}

@Component({
  selector: 'app-concursos-lista',
  imports: [
    AppHeader,
    SiteFooter,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './concursos-lista.html',
  styleUrl: './concursos-lista.css',
})
export class ConcursosLista implements OnInit {
  private readonly teamsApi = inject(TeamsApi);
  private readonly teamApi = inject(TeamApi);
  private readonly api = inject(CompetitionsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly load$ = new Subject<number | null>();

  protected readonly context = new FormControl('', { nonNullable: true });
  protected readonly teams = signal<CoachGroup[]>([]);
  protected readonly loadingTeams = signal(false);
  protected readonly teamsError = signal('');
  protected readonly teamId = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  /** Contest whose status change is in flight. */
  protected readonly changing = signal<number | null>(null);
  protected readonly notice = signal('');
  /** Contest the coach just created (navigation state of the form), to offer assigning problems. */
  protected readonly created = signal<{ id: number; name: string } | null>(null);
  /** The contest was created but assigning its problems failed (message from the create form). */
  protected readonly assignmentError = signal('');
  private readonly items = signal<TeamCompetition[]>([]);
  protected readonly groups = computed(() => splitCompetitions(this.items()));

  protected readonly sections = computed(() => [
    {
      title: 'Actuales y próximos',
      label: 'Concursos actuales y próximos',
      rows: this.groups().current,
      empty: 'Este grupo no tiene concursos en curso ni programados.',
    },
    {
      title: 'Pasados',
      label: 'Concursos pasados',
      rows: this.groups().past,
      empty: 'Este grupo todavía no tiene concursos finalizados.',
    },
  ]);

  protected readonly label = STATUS_LABEL;
  protected readonly badge = STATUS_CLASS;
  protected readonly actionLabel = ACTION_LABEL;
  protected readonly nextStatus = nextStatus;
  protected readonly formatDuration = formatDuration;
  private readonly dateFormat = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  constructor() {
    const state = this.router.currentNavigation()?.extras.state?.['created'];
    if (state && typeof state.id === 'number' && typeof state.name === 'string') {
      this.created.set({ id: state.id, name: state.name });
      const assignmentError = this.router.currentNavigation()?.extras.state?.['assignmentError'];
      if (typeof assignmentError === 'string') this.assignmentError.set(assignmentError);
    }
    this.load$
      .pipe(
        tap(() => {
          this.error.set('');
        }),
        switchMap((id) => {
          if (!id) {
            this.items.set([]);
            this.loading.set(false);
            return EMPTY;
          }
          this.loading.set(true);
          return this.teamApi.competitions(id).pipe(
            tap((items) => {
              this.items.set(items);
              this.loading.set(false);
            }),
            catchError((e: unknown) => {
              this.items.set([]);
              this.loading.set(false);
              this.error.set(apiError(e));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
    this.route.queryParamMap
      .pipe(
        map((params) => positiveId(params.get('teamId'))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.teamId.set(id);
        this.context.setValue(id ? String(id) : '');
        this.items.set([]);
        this.load$.next(id);
      });
  }

  ngOnInit() {
    this.loadTeams();
  }

  protected loadTeams() {
    this.loadingTeams.set(true);
    this.teamsError.set('');
    this.teamsApi
      .loadMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          // The coach's own published groups: drafts cannot hold contests.
          const available = groups.filter(
            (group): group is CoachGroup => 'activeMembers' in group && group.status !== 'BORRADOR',
          );
          this.teams.set(available);
          this.loadingTeams.set(false);
          this.context.setValue(this.teamId() ? String(this.teamId()) : '');
          if (!this.teamId() && available.length === 1) {
            this.navigateToTeam(available[0].groupId, true);
          }
        },
        error: () => {
          this.loadingTeams.set(false);
          this.teamsError.set('No se pudieron cargar tus grupos. Reintenta la consulta.');
        },
      });
  }

  protected selectTeam() {
    this.notice.set('');
    this.created.set(null);
    this.navigateToTeam(positiveId(this.context.value), false);
  }

  private navigateToTeam(id: number | null, replaceUrl: boolean) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { teamId: id },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected reload() {
    this.load$.next(this.teamId());
  }

  protected formatStart(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : this.dateFormat.format(date);
  }

  protected changeStatus(competition: TeamCompetition) {
    const target = nextStatus(competition.status);
    if (!target || this.changing() !== null) return;
    this.dialog
      .open(ConfirmarEstadoDialog, { data: { name: competition.eventName, target } })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed === true) this.apply(competition, target);
      });
  }

  private apply(competition: TeamCompetition, target: CompetitionStatus) {
    this.changing.set(competition.competitionId);
    this.error.set('');
    this.notice.set('');
    this.created.set(null);
    this.api
      .changeStatus(competition.competitionId, target)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changing.set(null);
          this.notice.set(
            target === 'EN_CURSO'
              ? `El concurso «${competition.eventName}» ya está en curso.`
              : `El concurso «${competition.eventName}» finalizó.`,
          );
          this.reload();
        },
        error: (e: unknown) => {
          this.changing.set(null);
          this.error.set(apiError(e));
        },
      });
  }
}
