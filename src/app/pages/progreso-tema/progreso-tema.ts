import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PractitionerGroup, TeamsApi } from '../../core/teams-api';
import {
  TopicProgress,
  TopicProgressApi,
  TopicProgressErrorKind,
  TopicStatus,
} from '../../core/topic-progress-api';

interface ErrorView {
  chip: string;
  title: string;
  link: boolean;
}

const ERROR_VIEWS: Record<TopicProgressErrorKind, ErrorView> = {
  inconsistent: { chip: 'Datos inconsistentes', title: 'No pudimos calcular tu progreso', link: false },
  unavailable: { chip: 'Información no disponible', title: 'No pudimos obtener tus registros', link: false },
  forbidden: { chip: 'Sin acceso', title: 'No pudimos mostrar este progreso', link: true },
  'not-found': { chip: 'Equipo no encontrado', title: 'No encontramos este equipo', link: true },
  unauthorized: { chip: 'Sesión no válida', title: 'Tu sesión no es válida', link: false },
  invalid: { chip: 'Equipo no válido', title: 'No pudimos identificar el equipo', link: true },
  unknown: { chip: 'Error inesperado', title: 'No pudimos obtener tu progreso', link: false },
};

const STATUS_LABELS: Record<TopicStatus, string> = {
  COMPLETADO: 'Completado',
  EN_PROGRESO: 'En progreso',
  SIN_ACTIVIDAD: 'Sin actividad',
};

@Component({
  selector: 'app-progreso-tema',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatToolbarModule,
  ],
  templateUrl: './progreso-tema.html',
  styleUrl: './progreso-tema.css',
})
export class ProgresoTema implements OnInit {
  private readonly teamsApi = inject(TeamsApi);
  protected readonly api = inject(TopicProgressApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly teamControl = new FormControl<number | null>(null);
  /** State of the team list request: it comes before any progress request. */
  protected readonly teamsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly teams = signal<PractitionerGroup[]>([]);

  protected readonly selectedTeam = computed(() => {
    const id = this.api.teamId();
    return this.teams().find((team) => team.groupId === id) ?? null;
  });
  protected readonly errorView = computed(() => {
    const error = this.api.error();
    return error ? ERROR_VIEWS[error.kind] : null;
  });
  protected readonly globalCoverage = computed(() => {
    const progress = this.api.progress();
    if (!progress || progress.assignedProblems === 0) return 0;
    return (progress.solvedProblems / progress.assignedProblems) * 100;
  });
  protected readonly reinforceTopics = computed(
    () => this.api.progress()?.topics.filter((topic) => topic.needsReinforcement) ?? [],
  );
  protected readonly completedTopics = computed(
    () => this.api.progress()?.topics.filter((topic) => topic.status === 'COMPLETADO') ?? [],
  );
  protected readonly inactiveCount = computed(
    () => this.api.progress()?.topics.filter((topic) => topic.status === 'SIN_ACTIVIDAD').length ?? 0,
  );
  protected readonly allInactive = computed(() => {
    const topics = this.api.progress()?.topics ?? [];
    return topics.length > 0 && topics.every((topic) => topic.status === 'SIN_ACTIVIDAD');
  });
  protected readonly indicators = computed(() => {
    const progress = this.api.progress();
    if (!progress) return [];
    return [
      { label: 'Problemas asignados', value: String(progress.assignedProblems), help: 'de tu equipo' },
      { label: 'Resueltos', value: String(progress.solvedProblems), help: `de ${progress.assignedProblems}` },
      { label: 'Cobertura global', value: `${this.percent(this.globalCoverage())}%`, help: 'problemas distintos' },
      { label: 'Por reforzar', value: String(this.reinforceTopics().length), help: 'temas' },
    ];
  });

  ngOnInit(): void {
    this.teamControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((teamId) => {
        if (teamId !== null) this.api.load(teamId);
      });
    this.loadTeams();
  }

  protected loadTeams(): void {
    this.teamsState.set('loading');
    this.api.reset();
    this.teamsApi
      .loadMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mine) => {
          const active = (mine as PractitionerGroup[]).filter(
            (team) => team.membership?.status === 'ACTIVO',
          );
          this.teams.set(active);
          this.teamsState.set('ready');
          const wanted = Number(this.route.snapshot.queryParamMap.get('equipo'));
          const initial = active.find((team) => team.groupId === wanted) ?? active[0];
          if (initial) this.teamControl.setValue(initial.groupId);
        },
        error: () => this.teamsState.set('error'),
      });
  }

  protected retry(): void {
    const teamId = this.teamControl.value;
    if (teamId !== null) this.api.load(teamId);
  }

  protected percent(value: number): string {
    return value.toFixed(2);
  }

  protected statusLabel(status: TopicStatus): string {
    return STATUS_LABELS[status];
  }

  protected detail(topic: TopicProgress): string {
    const parts = [`${topic.assignedProblems} asignados`, `${topic.solvedProblems} resueltos`];
    if (topic.pendingProblems > 0) parts.push(`${topic.pendingProblems} por verificar`);
    return parts.join(' · ');
  }

  protected barColor(topic: TopicProgress): string {
    if (topic.status === 'COMPLETADO') return '#4ade80';
    return topic.needsReinforcement ? '#fbbf24' : 'var(--kl-accent)';
  }
}
