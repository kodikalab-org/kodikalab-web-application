import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CodeforcesStatsApi, CodeforcesStats } from '../../../core/codeforces-stats-api';
import { ProfileStatistics } from './profile-statistics/profile-statistics';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { profileIdentity } from '../../../core/profile-identity';
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
  FILTROS_SOLICITUD_DEMO,
  IDIOMAS_AJUSTES,
  INFO_PERSONAL_DEMO,
  LENGUAJES_FILTRO,
  PAGINAS_SUBMISSIONS_DEMO,
  PERIODOS_FILTRO,
  PLATAFORMAS_FILTRO,
  PLATAFORMAS_PERFIL_DEMO,
  SOLICITUDES_DEMO,
  SUBMISSIONS_DEMO,
  VEREDICTOS_FILTRO,
} from '../../../data/perfil-practicante-demo';
import {
  EstadoPerfil,
  EstadoSolicitud,
  PestanaPerfil,
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

@Component({
  selector: 'app-perfil',
  imports: [
    ProfileStatistics,
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
    if (this.session.demo()) return { ...INFO_PERSONAL_DEMO, email: 'practicante@example.invalid' };
    const p = this.profiles.profile();
    const identity = profileIdentity(p?.fullName, p?.email ?? '', 'Practicante');
    return { iniciales: identity.initials, nombreCompleto: identity.name, email: identity.email, usuario: '', rol: 'Practicante',
      carreraCiclo: p?.role === 'PRACTICANTE' ? `${p.carrera} · ${p.cicloAcademico}.º ciclo` : '',
      universidad: 'Comunidad GPC UPC', ubicacion: p?.role === 'PRACTICANTE' ? p.district || 'Distrito no indicado' : '',
      nivelCodigo: p?.role === 'PRACTICANTE' ? `${p.nivelCompetitivo} · ${p.codigoEstudiante}` : '',
      objetivo: p?.role === 'PRACTICANTE' ? p.goal || 'Objetivo no indicado' : '' };
  }
  protected get plataformas() {
    if (this.session.demo()) return PLATAFORMAS_PERFIL_DEMO.filter(platform => platform.nombre === 'Codeforces');
    const p = this.profiles.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    return PLATAFORMAS_PERFIL_DEMO.filter(platform => platform.nombre === 'Codeforces').map((platform) => ({ ...platform,
      usuario: p.codeforcesHandle ?? '',
    })).filter(platform => platform.usuario);
  }
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
