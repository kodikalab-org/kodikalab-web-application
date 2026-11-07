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
import { positiveId } from '../../../core/team-api';
import {
  ASSIGNMENT_STATUS,
  AssignedList,
  AssignedProblemItem,
  AssignedQuery,
  AssignedSort,
  AssignmentStatus,
  COMPETITION_STATUS,
  CompetitionStatus,
  PLATFORM_LABEL,
  ProblemsApi,
  formatDateTime,
  problemsError,
} from '../../../core/problems-api';
import { PractitionerGroup, TeamsApi } from '../../../core/teams-api';

const ESTADOS: AssignmentStatus[] = ['SIN_INTENTOS', 'EN_PROGRESO', 'PENDIENTE', 'RESUELTO'];
const PUNTO_ESTADO: Record<AssignmentStatus, string> = {
  RESUELTO: 'bg-emerald-400',
  PENDIENTE: 'bg-amber-400',
  EN_PROGRESO: 'bg-indigo-300',
  SIN_INTENTOS: 'bg-kl-border-strong',
};
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

/** US-08 (practitioner): problems assigned to the teams the practitioner belongs to, with their own state. */
@Component({
  selector: 'app-problemas-asignados',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './problemas-asignados.html',
  styleUrl: './problemas-asignados.css',
  host: { class: 'block' },
})
export class ProblemasAsignados {
  private readonly api = inject(ProblemsApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estadoAsignacion = ASSIGNMENT_STATUS;
  protected readonly estadoCompetencia = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;
  protected readonly estadosCompetencia = Object.keys(COMPETITION_STATUS) as CompetitionStatus[];
  protected readonly misEstados = ESTADOS;
  protected readonly ordenes: { valor: AssignedSort; etiqueta: string }[] = [
    { valor: 'letter', etiqueta: 'Letra' },
    { valor: 'title', etiqueta: 'Título' },
    { valor: 'difficulty', etiqueta: 'Dificultad' },
    { valor: 'assignedAt', etiqueta: 'Fecha de asignación' },
    { valor: 'status', etiqueta: 'Mi estado' },
  ];
  protected readonly fecha = formatDateTime;

  protected readonly equipos = signal<PractitionerGroup[]>([]);
  protected readonly equiposCargando = signal(true);
  protected readonly equiposError = signal<string | null>(null);

  protected readonly lista = signal<AssignedList | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  // The backend has no endpoint for filter values: they come from the assignments it has returned so far.
  protected readonly competencias = signal<CompetenciaFiltro[]>([]);
  protected readonly dificultades = signal<string[]>([]);
  /** Last answer of the team without filters: the progress and the competitions of the side panel. */
  private readonly base = signal<AssignedProblemItem[]>([]);

  protected readonly form = new FormGroup({
    equipo: new FormControl('', { nonNullable: true }),
    busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    competencia: new FormControl('', { nonNullable: true }),
    estado: new FormControl('', { nonNullable: true }),
    dificultad: new FormControl('', { nonNullable: true }),
    miEstado: new FormControl('', { nonNullable: true }),
    orden: new FormControl('', { nonNullable: true }),
    sentido: new FormControl('asc', { nonNullable: true }),
  });

  protected readonly equipoId = signal<number | null>(null);
  protected readonly nombreEquipo = computed(
    () => this.equipos().find((equipo) => equipo.groupId === this.equipoId())?.name ?? '',
  );

  protected readonly resumen = computed(() => {
    const items = this.base();
    return {
      total: items.length,
      resueltos: items.filter((item) => item.status === 'RESUELTO').length,
      porEstado: ESTADOS.slice()
        .reverse()
        .map((estado) => ({
          estado,
          cantidad: items.filter((item) => (item.status ?? 'SIN_INTENTOS') === estado).length,
        })),
    };
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
    const { competencia, estado, dificultad, miEstado, orden, sentido } = this.form.controls;
    merge(competencia.valueChanges, estado.valueChanges, dificultad.valueChanges, miEstado.valueChanges, orden.valueChanges, sentido.valueChanges)
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
        const activos = mine.filter(
          (grupo): grupo is PractitionerGroup => 'membership' in grupo && grupo.membership.status === 'ACTIVO',
        );
        this.equipos.set(activos);
        this.equiposCargando.set(false);
        const pedido = positiveId(this.route.snapshot.queryParamMap.get('teamId'));
        const inicial = activos.find((grupo) => grupo.groupId === pedido) ?? activos[0];
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
      { busqueda: '', competencia: '', estado: '', dificultad: '', miEstado: '', orden: '', sentido: 'asc' },
      { emitEvent: false },
    );
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected hayFiltros(): boolean {
    const { busqueda, competencia, estado, dificultad, miEstado } = this.form.getRawValue();
    return [busqueda, competencia, estado, dificultad, miEstado].some((valor) => valor.trim() !== '');
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

  protected puntoEstado(estado: AssignmentStatus): string {
    return PUNTO_ESTADO[estado];
  }

  protected estadoDe(item: AssignedProblemItem): AssignmentStatus {
    return item.status ?? 'SIN_INTENTOS';
  }

  private cambiarEquipo(id: number | null): void {
    this.equipoId.set(id);
    this.competencias.set([]);
    this.dificultades.set([]);
    this.base.set([]);
    this.lista.set(null);
    this.form.patchValue(
      { busqueda: '', competencia: '', estado: '', dificultad: '', miEstado: '', orden: '', sentido: 'asc' },
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
      status: valores.miEstado as AssignmentStatus | '',
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
