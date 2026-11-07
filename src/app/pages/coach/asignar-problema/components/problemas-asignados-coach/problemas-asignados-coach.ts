import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { merge } from 'rxjs';
import { positiveId } from '../../../../../core/team-api';
import {
  AssignedList,
  AssignedProblemItem,
  AssignedQuery,
  AssignedSort,
  COMPETITION_STATUS,
  CompetitionStatus,
  PLATFORM_LABEL,
  ProblemsApi,
  formatDateTime,
  problemsError,
} from '../../../../../core/problems-api';
import { CoachGroup, TeamsApi } from '../../../../../core/teams-api';

const COLOR_EQUIPO = [
  'from-[#8a6cff] to-[#6e52f2]',
  'from-teal-400 to-teal-600',
  'from-pink-500 to-rose-600',
];

interface CompetenciaFiltro {
  id: number;
  name: string;
  status: CompetitionStatus;
  startsAt: string | null;
  endsAt: string | null;
}

/** US-08 (coach): problems assigned to one of the coach's teams, by competition. */
@Component({
  selector: 'app-problemas-asignados-coach',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './problemas-asignados-coach.html',
  styleUrl: './problemas-asignados-coach.css',
  host: { class: 'block' },
})
export class ProblemasAsignadosCoach {
  private readonly api = inject(ProblemsApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estadoCompetencia = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;
  protected readonly estadosCompetencia = Object.keys(COMPETITION_STATUS) as CompetitionStatus[];
  protected readonly ordenes: { valor: AssignedSort; etiqueta: string }[] = [
    { valor: 'letter', etiqueta: 'Letra' },
    { valor: 'title', etiqueta: 'Título' },
    { valor: 'difficulty', etiqueta: 'Dificultad' },
    { valor: 'assignedAt', etiqueta: 'Fecha de asignación' },
  ];
  protected readonly fecha = formatDateTime;

  /** Message after a successful assignment, read from the redirect of the confirmation step. */
  protected readonly exito = (() => {
    const query = this.route.snapshot.queryParamMap;
    const cantidad = Number(query.get('asignados'));
    if (!Number.isInteger(cantidad) || cantidad < 1) return null;
    const competencia = query.get('competencia')?.trim();
    return `Asignaste ${cantidad} ${cantidad === 1 ? 'problema' : 'problemas'}${competencia ? ` a ${competencia}` : ''}. Todo el equipo ya los ve.`;
  })();

  protected readonly equipos = signal<CoachGroup[]>([]);
  protected readonly equiposCargando = signal(true);
  protected readonly equiposError = signal<string | null>(null);
  protected readonly equipoId = signal<number | null>(null);
  protected readonly equipo = computed(
    () => this.equipos().find((grupo) => grupo.groupId === this.equipoId()) ?? null,
  );

  protected readonly lista = signal<AssignedList | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  // The backend has no endpoint for filter values: they come from the assignments it has returned so far.
  protected readonly competencias = signal<CompetenciaFiltro[]>([]);
  protected readonly dificultades = signal<string[]>([]);
  /** Last answer of the team without filters: the summary and the competitions of the side panel. */
  private readonly base = signal<AssignedProblemItem[]>([]);

  protected readonly form = new FormGroup({
    equipo: new FormControl('', { nonNullable: true }),
    busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    competencia: new FormControl('', { nonNullable: true }),
    estado: new FormControl('', { nonNullable: true }),
    dificultad: new FormControl('', { nonNullable: true }),
    orden: new FormControl('', { nonNullable: true }),
    sentido: new FormControl('asc', { nonNullable: true }),
  });

  protected readonly resumen = computed(() => {
    const items = this.base();
    const ultima = items.map((item) => item.assignedAt).sort().at(-1) ?? null;
    return [
      { etiqueta: 'Problemas asignados', valor: String(items.length) },
      { etiqueta: 'Competencias', valor: String(new Set(items.map((item) => item.competition.id)).size) },
      { etiqueta: 'Integrantes activos', valor: String(this.equipo()?.activeMembers ?? '—') },
      { etiqueta: 'Última asignación', valor: ultima ? formatDateTime(ultima) : '—' },
    ];
  });
  protected readonly competenciasEquipo = computed(() => {
    const vistas = new Map<number, CompetenciaFiltro>();
    for (const item of this.base()) {
      vistas.set(item.competition.id, {
        id: item.competition.id,
        name: item.competition.name,
        status: item.competition.status,
        startsAt: item.competition.startsAt,
        endsAt: item.competition.endsAt,
      });
    }
    return [...vistas.values()];
  });

  private request = 0;

  constructor() {
    const { competencia, estado, dificultad, orden, sentido } = this.form.controls;
    merge(competencia.valueChanges, estado.valueChanges, dificultad.valueChanges, orden.valueChanges, sentido.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicar());
    this.form.controls.equipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => this.cambiarEquipo(positiveId(valor)));
    this.cargarEquipos();
  }

  protected cargarEquipos(): void {
    this.equiposCargando.set(true);
    this.equiposError.set(null);
    this.teamsApi.loadMine().subscribe({
      next: (mine) => {
        const propios = mine
          .filter((grupo): grupo is CoachGroup => 'activeMembers' in grupo)
          .filter((grupo) => grupo.status !== 'BORRADOR');
        this.equipos.set(propios);
        this.equiposCargando.set(false);
        const pedido = positiveId(this.route.snapshot.queryParamMap.get('teamId'));
        const inicial = propios.find((grupo) => grupo.groupId === pedido) ?? propios[0];
        if (inicial) {
          this.form.controls.equipo.setValue(String(inicial.groupId), { emitEvent: false });
          this.cambiarEquipo(inicial.groupId);
        }
      },
      error: (error) => {
        this.equiposError.set(problemsError(error));
        this.equiposCargando.set(false);
      },
    });
  }

  /** Applies the search box and the filters. */
  protected aplicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargar();
  }

  protected limpiar(): void {
    this.form.patchValue(
      { busqueda: '', competencia: '', estado: '', dificultad: '', orden: '', sentido: 'asc' },
      { emitEvent: false },
    );
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected hayFiltros(): boolean {
    const { busqueda, competencia, estado, dificultad } = this.form.getRawValue();
    return [busqueda, competencia, estado, dificultad].some((valor) => valor.trim() !== '');
  }

  protected colorEquipo(indice: number): string {
    return COLOR_EQUIPO[indice % COLOR_EQUIPO.length];
  }

  protected iniciales(nombre: string): string {
    return (
      nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((palabra) => palabra[0].toUpperCase())
        .join('') || '?'
    );
  }

  private cambiarEquipo(id: number | null): void {
    this.equipoId.set(id);
    this.competencias.set([]);
    this.dificultades.set([]);
    this.base.set([]);
    this.lista.set(null);
    this.form.patchValue(
      { busqueda: '', competencia: '', estado: '', dificultad: '', orden: '', sentido: 'asc' },
      { emitEvent: false },
    );
    if (id !== null) this.cargar();
  }

  private cargar(): void {
    const teamId = this.equipoId();
    if (teamId === null) return;
    const valores = this.form.getRawValue();
    const consulta: AssignedQuery = {
      teamId,
      competitionId: positiveId(valores.competencia),
      competitionStatus: valores.estado as CompetitionStatus | '',
      q: valores.busqueda,
      difficulty: valores.dificultad,
      sort: valores.orden as AssignedSort | '',
      order: valores.orden ? (valores.sentido as 'asc' | 'desc') : '',
    };
    const sinFiltros = !this.hayFiltros();
    const actual = ++this.request;
    this.cargando.set(true);
    this.error.set(null);
    this.api.assigned(consulta).subscribe({
      next: (lista) => {
        if (actual !== this.request) return;
        this.lista.set(lista);
        if (sinFiltros) this.base.set(lista.items);
        this.recordarFiltros(lista.items);
        this.cargando.set(false);
      },
      error: (error) => {
        if (actual !== this.request) return;
        this.error.set(problemsError(error));
        this.cargando.set(false);
      },
    });
  }

  private recordarFiltros(items: AssignedProblemItem[]): void {
    this.competencias.update((lista) => {
      const nuevas = items
        .map((item) => item.competition)
        .filter((c, i, todas) => todas.findIndex((o) => o.id === c.id) === i && !lista.some((o) => o.id === c.id));
      return nuevas.length === 0
        ? lista
        : [...lista, ...nuevas.map((c) => ({ id: c.id, name: c.name, status: c.status, startsAt: c.startsAt, endsAt: c.endsAt }))];
    });
    this.dificultades.update((lista) => {
      const nuevas = [...new Set(items.map((item) => item.problem.difficultyRating).filter((d): d is string => !!d))].filter(
        (d) => !lista.includes(d),
      );
      return nuevas.length === 0 ? lista : [...lista, ...nuevas];
    });
  }
}
