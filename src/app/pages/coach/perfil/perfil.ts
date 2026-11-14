import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { profileIdentity } from '../../../core/profile-identity';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { map } from 'rxjs';
import { CoachGroup, TeamsApi } from '../../../core/teams-api';

type Pestania = 'info' | 'solicitudes' | 'ajustes';

interface Vista {
  readonly pestania: Pestania;
  readonly estado: string | null;
}

interface FilaPestania {
  readonly id: Pestania;
  readonly etiqueta: string;
  readonly iconoActivo: string;
  readonly iconoInactivo: string;
}

interface FilaAjuste {
  readonly tipo: 'interruptor' | 'idioma' | 'salir';
  readonly campo: 'notificaciones' | 'privacidad' | 'idioma' | 'temaOscuro' | null;
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
}

const PESTANIAS: readonly Pestania[] = ['info', 'solicitudes', 'ajustes'];

@Component({
  selector: 'app-coach-perfil',
  imports: [
    HeaderNavigation,
    UserMenu,
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatToolbarModule,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class CoachPerfil {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly teams = inject(TeamsApi);
  constructor() {
    this.formAjustes.disable();
    this.teams.loadMine().subscribe({ error: () => undefined });
  }
  protected salir(): void { this.session.logout(); this.profiles.reset(); }
  private readonly ruta = inject(ActivatedRoute);

  /** `?tab=info|solicitudes|ajustes` elige la pestaña; `?estado=actualizado` avisa tras guardar el perfil. */
  protected readonly vista$ = this.ruta.queryParamMap.pipe(
    map((params): Vista => {
      const tab = params.get('tab');
      return {
        pestania: PESTANIAS.find((p) => p === tab) ?? 'info',
        estado: params.get('estado') === 'actualizado' && this.profiles.message() ? 'actualizado' : null,
      };
    }),
  );

  protected readonly pestanias: readonly FilaPestania[] = [
    {
      id: 'info',
      etiqueta: 'Información personal',
      iconoActivo: 'images/perfil-coach/user-20-active.svg',
      iconoInactivo: 'images/perfil-coach/user-20-muted.svg',
    },
    {
      id: 'solicitudes',
      etiqueta: 'Solicitudes',
      iconoActivo: 'images/perfil-coach/users-20-active.svg',
      iconoInactivo: 'images/perfil-coach/users-20-muted.svg',
    },
    {
      id: 'ajustes',
      etiqueta: 'Ajustes generales',
      iconoActivo: 'images/perfil-coach/settings-20-active.svg',
      iconoInactivo: 'images/perfil-coach/settings-20-muted.svg',
    },
  ];


  protected get perfil() {
    const p = this.profiles.profile();
    const identity = profileIdentity(p?.fullName, p?.email ?? '', 'Coach');
    return { iniciales: identity.initials, nombre: identity.name, email: identity.email, usuario: '', rol: 'Coach',
      especialidad: p?.role === 'COACH' ? p.especialidadPrincipal : '',
      organizacion: p?.role === 'COACH' ? p.organizacionClub ?? '' : '',
      anios: p?.role === 'COACH' ? p.aniosExperiencia : 0,
      presentacion: p?.role === 'COACH' ? p.presentacion ?? '' : '' };
  }
  /** Grupos reales del coach, tomados de `GET /teams/me`. */
  protected readonly equipos = computed(() =>
    this.teams.mine().filter((g): g is CoachGroup => 'activeMembers' in g).map((g) => ({
      id: g.groupId,
      iniciales: g.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join(''),
      nombre: g.name,
      activos: g.activeMembers,
      pendientes: g.pendingRequests,
      detalle: `${g.activeMembers}/${g.maxCapacity ?? '—'} integrantes · ${g.sessionSchedule ?? 'horario por definir'}`,
    })),
  );

  protected get datosPerfil() { return [
    {
      icono: 'images/perfil-coach/chart-18.svg',
      texto: `Especialidad: ${this.perfil.especialidad}`,
    },
    { icono: 'images/perfil-coach/building-18.svg', texto: this.perfil.organizacion },
    {
      icono: 'images/perfil-coach/trophy-18.svg',
      texto: `${this.perfil.anios} años de experiencia entrenando`,
    },
  ]; }

  protected readonly filas: readonly FilaAjuste[] = [
    {
      tipo: 'interruptor',
      campo: 'privacidad',
      icono: 'images/perfil-coach/shield-22.svg',
      titulo: 'Privacidad del perfil',
      descripcion: 'Controla quién puede ver tu perfil y tu actividad.',
    },
    {
      tipo: 'idioma',
      campo: 'idioma',
      icono: 'images/perfil-coach/globe-22.svg',
      titulo: 'Idioma',
      descripcion: 'Elige el idioma de la interfaz (es_419 o en_US).',
    },
    {
      tipo: 'salir',
      campo: null,
      icono: 'images/perfil-coach/logout-22.svg',
      titulo: 'Cerrar sesión',
      descripcion: 'Cierra tu sesión en este dispositivo.',
    },
  ];

  protected readonly formAjustes = new FormGroup({
    notificaciones: new FormControl(true, { nonNullable: true }),
    privacidad: new FormControl(false, { nonNullable: true }),
    idioma: new FormControl<'es' | 'en'>('es', { nonNullable: true }),
    temaOscuro: new FormControl(true, { nonNullable: true }),
  });

  protected estadisticas() {
    const equipos = this.equipos();
    const total = (campo: 'activos' | 'pendientes') =>
      equipos.reduce((suma, equipo) => suma + equipo[campo], 0);
    return [
      {
        valor: equipos.length,
        etiqueta: 'Equipos a cargo',
        icono: 'images/perfil-coach/stat-teams-24.svg',
        fondo: 'bg-[rgba(167,139,250,0.14)]',
      },
      {
        valor: total('activos'),
        etiqueta: 'Integrantes activos',
        icono: 'images/perfil-coach/stat-members-24.svg',
        fondo: 'bg-[rgba(74,222,128,0.14)]',
      },
      {
        valor: total('pendientes'),
        etiqueta: 'Solicitudes pendientes',
        icono: 'images/perfil-coach/stat-pending-24.svg',
        fondo: 'bg-[rgba(251,191,36,0.14)]',
      },
    ];
  }
}
