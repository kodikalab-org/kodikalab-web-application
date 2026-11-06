import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CodeforcesStatsApi, CodeforcesStats, activityCalendar } from '../../../core/codeforces-stats-api';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import {
  DIAS_HEATMAP,
  ESTADISTICAS_DEMO,
  FILTROS_SOLICITUD_DEMO,
  HEATMAP_ACTIVIDAD_DEMO,
  HEATMAP_RATING_DEMO,
  IDIOMAS_AJUSTES,
  INFO_PERSONAL_DEMO,
  LENGUAJES_FILTRO,
  MESES_HEATMAP,
  PAGINAS_SUBMISSIONS_DEMO,
  PERIODOS_FILTRO,
  PLATAFORMAS_FILTRO,
  PLATAFORMAS_PERFIL_DEMO,
  PROBLEMAS_FILTRO,
  SOLICITUDES_DEMO,
  SUBMISSIONS_DEMO,
  VEREDICTOS_FILTRO,
} from '../../../data/perfil-practicante-demo';
import {
  EstadoPerfil,
  EstadoSolicitud,
  PestanaPerfil,
  TonoEstadistica,
  VeredictoSubmission,
} from '../../../models/perfil-practicante';

/**
 * Demo states reachable on the same route through the `estado` query param
 * (`/perfil?tab=<tab>&estado=<estado>`). Each state only applies to the tab that owns it.
 */
const ESTADOS_POR_PESTANA: Record<PestanaPerfil, readonly EstadoPerfil[]> = {
  info: ['cargando', 'sin-plataformas', 'actualizado'],
  solicitudes: ['vacio'],
  submissions: ['vacio'],
  ajustes: [],
};

const PESTANAS: readonly PestanaPerfil[] = ['info', 'solicitudes', 'submissions', 'ajustes'];

function resolverVista(tab: string | null, estado: string | null) {
  const pestana = PESTANAS.find((id) => id === tab) ?? 'info';
  const valido = ESTADOS_POR_PESTANA[pestana].find((id) => id === estado) ?? null;
  return { pestana, estado: valido };
}

function aCeldas(filas: string[]): number[] {
  return [...filas[0]].flatMap((_, columna) => filas.map((fila) => Number(fila[columna])));
}

@Component({
  selector: 'app-perfil',
  imports: [
    HeaderNavigation,
    UserMenu,
    AsyncPipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatToolbarModule,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  protected readonly session = inject(Session);
  protected readonly profiles = inject(ProfileApi);
  private readonly statsApi = inject(CodeforcesStatsApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly stats = signal<CodeforcesStats | null>(null);
  protected readonly statsLoading = signal(false);
  protected readonly statsError = signal(false);
  constructor() {
    if (!this.session.demo()) {
      this.formAjustes.disable();
      this.loadStats();
    }
  }
  protected loadStats(): void {
    if (this.session.demo() || this.statsLoading()) return;
    this.statsLoading.set(true);
    this.statsError.set(false);
    this.stats.set(null);
    this.statsApi.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: stats => { this.stats.set(stats); this.statsLoading.set(false); },
      error: () => { this.statsError.set(true); this.statsLoading.set(false); },
    });
  }
  protected get activity() { return activityCalendar(this.stats()?.activity ?? []); }
  protected get ratingBuckets() { return [...(this.stats()?.solvedByRating ?? [])].sort((a, b) => a.rating - b.rating); }
  protected salir(): void { this.session.logout(); this.profiles.reset(); }
  private readonly route = inject(ActivatedRoute);

  /** Active tab and demo state, read from `?tab=` and `?estado=`. */
  protected readonly vista$ = this.route.queryParamMap.pipe(
    map((params) => resolverVista(params.get('tab'), this.session.demo() ? params.get('estado') :
      params.get('estado') === 'actualizado' && this.profiles.message() ? 'actualizado' : null)),
  );

  protected readonly pestanas: {
    id: PestanaPerfil;
    etiqueta: string;
    iconoActivo: string;
    iconoInactivo: string;
  }[] = [
    {
      id: 'info',
      etiqueta: 'Información personal',
      iconoActivo: 'images/perfil/tab-user-active-20.svg',
      iconoInactivo: 'images/perfil/tab-user-muted-20.svg',
    },
    {
      id: 'solicitudes',
      etiqueta: 'Solicitudes',
      iconoActivo: 'images/perfil/tab-users-active-20.svg',
      iconoInactivo: 'images/perfil/tab-users-muted-20.svg',
    },
    {
      id: 'submissions',
      etiqueta: 'Submissions',
      iconoActivo: 'images/perfil/tab-file-active-20.svg',
      iconoInactivo: 'images/perfil/tab-file-muted-20.svg',
    },
    {
      id: 'ajustes',
      etiqueta: 'Ajustes generales',
      iconoActivo: 'images/perfil/tab-settings-active-20.svg',
      iconoInactivo: 'images/perfil/tab-settings-muted-20.svg',
    },
  ];

  // ---- Información personal ----
  protected get info() {
    if (this.session.demo()) return INFO_PERSONAL_DEMO;
    const p = this.profiles.profile();
    return { iniciales: 'KL', nombreCompleto: p?.email ?? '', usuario: '', rol: 'Practicante',
      carreraCiclo: p?.role === 'PRACTICANTE' ? `${p.carrera} · ${p.cicloAcademico}.º ciclo` : '',
      universidad: 'Comunidad GPC UPC', ubicacion: p?.role === 'PRACTICANTE' ? p.district || 'Distrito no indicado' : '',
      nivelCodigo: p?.role === 'PRACTICANTE' ? `${p.nivelCompetitivo} · ${p.codigoEstudiante}` : '',
      objetivo: p?.role === 'PRACTICANTE' ? p.goal || 'Objetivo no indicado' : '' };
  }
  protected get plataformas() {
    if (this.session.demo()) return PLATAFORMAS_PERFIL_DEMO;
    const p = this.profiles.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    return PLATAFORMAS_PERFIL_DEMO.map((platform) => ({ ...platform,
      usuario: (platform.nombre === 'Codeforces' ? p.codeforcesHandle : platform.nombre === 'AtCoder' ? p.atcoderHandle : p.vjudgeHandle) ?? '',
    })).filter(platform => platform.usuario);
  }
  protected get estadisticas() {
    if (this.session.demo()) return ESTADISTICAS_DEMO;
    const stats = this.stats();
    if (!stats) return [];
    const values = [String(stats.problemsSolved), `${stats.maxStreakDays} días`,
      String(stats.currentRating), String(stats.acceptedSubmissions)];
    const details = ['Problemas únicos aceptados', 'Mejor marca histórica', 'Codeforces',
      `${stats.acceptanceRate.toFixed(1)} % de aceptación`];
    return ESTADISTICAS_DEMO.map((card, i) => ({ ...card, valor: values[i], detalle: details[i] }));
  }
  protected readonly tonos: Record<TonoEstadistica, { caja: string; detalle: string }> = {
    exito: { caja: 'bg-[#4ade80]/14', detalle: 'text-[#4ade80]' },
    alerta: { caja: 'bg-[#fb923c]/14', detalle: 'text-[#fbbf24]' },
    turquesa: { caja: 'bg-[#5eead4]/14', detalle: 'text-[#a78bfa]' },
    violeta: { caja: 'bg-[#a78bfa]/14', detalle: 'text-[#4ade80]' },
  };
  protected readonly meses = MESES_HEATMAP;
  protected readonly diasHeatmap = DIAS_HEATMAP;
  private readonly heatmapsDemo = [
    {
      titulo: 'Actividad de resolución de problemas',
      celdas: aCeldas(HEATMAP_ACTIVIDAD_DEMO),
      clases: ['bg-[#17163a]', 'bg-[#14532d]', 'bg-[#16a34a]', 'bg-[#4ade80]'],
      form: new FormGroup({
        problemas: new FormControl('todos', { nonNullable: true }),
        periodo: new FormControl('ultimo-anio', { nonNullable: true }),
      }),
    },
    {
      titulo: 'Heatmap por rating',
      celdas: aCeldas(HEATMAP_RATING_DEMO),
      clases: [
        'bg-[#17163a]',
        'bg-[#2a2750]',
        'bg-[#a78bfa]',
        'bg-[#5eead4]',
        'bg-[#d4d4d8]',
        'bg-[#c4b5fd]',
      ],
      form: new FormGroup({
        problemas: new FormControl('todos', { nonNullable: true }),
        periodo: new FormControl('ultimo-anio', { nonNullable: true }),
      }),
    },
  ];
  protected get heatmaps() { return this.session.demo() ? this.heatmapsDemo : []; }
  protected readonly opcionesProblemas = PROBLEMAS_FILTRO;
  protected readonly opcionesPeriodo = PERIODOS_FILTRO;

  // ---- Solicitudes ----
  protected readonly filtrosSolicitud = FILTROS_SOLICITUD_DEMO;
  protected get solicitudes() { return this.session.demo() ? SOLICITUDES_DEMO : []; }
  protected readonly clasesEstadoSolicitud: Record<EstadoSolicitud, string> = {
    Pendiente: 'border-[#fbbf24]/60 bg-[#fbbf24]/10 text-[#fbbf24]',
    Aceptada: 'border-[#4ade80]/60 bg-[#4ade80]/10 text-[#4ade80]',
    Rechazada: 'border-[#f87171]/60 bg-[#f87171]/10 text-[#f87171]',
  };
  protected readonly formSolicitudes = new FormGroup({
    filtro: new FormControl('todas', { nonNullable: true }),
    busqueda: new FormControl('', { nonNullable: true }),
  });

  // ---- Submissions ----
  protected get submissions() { return this.session.demo() ? SUBMISSIONS_DEMO : []; }
  protected readonly paginasSubmissions = PAGINAS_SUBMISSIONS_DEMO;
  protected readonly clasesVeredicto: Record<VeredictoSubmission, string> = {
    Aceptado: 'border-[#4ade80]/60 bg-[#4ade80]/10 text-[#4ade80]',
    'Wrong Answer': 'border-[#f87171]/60 bg-[#f87171]/10 text-[#f87171]',
    'Time Limit': 'border-[#fbbf24]/50 bg-[#fbbf24]/8 text-[#fbbf24]',
  };
  protected readonly filtrosSubmissions = [
    { control: 'veredicto', etiqueta: 'Veredicto', ancho: 'w-[178px]', opciones: VEREDICTOS_FILTRO },
    { control: 'lenguaje', etiqueta: 'Lenguaje', ancho: 'w-[173px]', opciones: LENGUAJES_FILTRO },
    {
      control: 'plataforma',
      etiqueta: 'Plataforma',
      ancho: 'w-[192px]',
      opciones: PLATAFORMAS_FILTRO,
    },
    { control: 'periodo', etiqueta: 'Periodo', ancho: 'w-[122px]', opciones: PERIODOS_FILTRO },
  ] as const;
  protected readonly formSubmissions = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true }),
    veredicto: new FormControl('todos', { nonNullable: true }),
    lenguaje: new FormControl('todos', { nonNullable: true }),
    plataforma: new FormControl('todas', { nonNullable: true }),
    periodo: new FormControl('ultimo-anio', { nonNullable: true }),
  });

  // ---- Ajustes generales ----
  protected readonly idiomas = IDIOMAS_AJUSTES;
  protected readonly filasAjustes = [
    {
      tipo: 'interruptor',
      control: 'notificaciones',
      icono: 'images/perfil/row-bell-22.svg',
      titulo: 'Notificaciones',
      descripcion: 'Recibe avisos de concursos, menciones y actividad importante.',
    },
    {
      tipo: 'interruptor',
      control: 'privacidad',
      icono: 'images/perfil/row-shield-22.svg',
      titulo: 'Privacidad del perfil',
      descripcion: 'Controla quién puede ver tu perfil y tu actividad.',
    },
    {
      tipo: 'idioma',
      control: 'idioma',
      icono: 'images/perfil/row-globe-22.svg',
      titulo: 'Idioma',
      descripcion: 'Elige el idioma de la interfaz (es_419 o en_US).',
    },
    {
      tipo: 'interruptor',
      control: 'temaOscuro',
      icono: 'images/perfil/row-moon-22.svg',
      titulo: 'Tema oscuro',
      descripcion: 'Activa o desactiva el tema oscuro.',
    },
    {
      tipo: 'salir',
      control: null,
      icono: 'images/perfil/row-logout-22.svg',
      titulo: 'Cerrar sesión',
      descripcion: 'Cierra tu sesión en este dispositivo.',
    },
  ] as const;
  protected readonly formAjustes = new FormGroup({
    notificaciones: new FormControl(true, { nonNullable: true }),
    privacidad: new FormControl(true, { nonNullable: true }),
    idioma: new FormControl('es_419', { nonNullable: true }),
    temaOscuro: new FormControl(true, { nonNullable: true }),
  });
}
