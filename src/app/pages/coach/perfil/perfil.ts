import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { profileIdentity } from '../../../core/profile-identity';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { map } from 'rxjs';
import {
  AJUSTES_COACH_DEMO,
  EQUIPOS_COACH_DEMO,
  ESTADISTICAS_COACH_DEMO,
  PERFIL_COACH_DEMO,
  crearSolicitudesDemo,
} from '../../../data/perfil-coach-demo';
import { EstadoSolicitud, SolicitudIngreso } from '../../../models/perfil-coach';

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
    MatChipsModule,
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
  constructor() { if (!this.session.demo()) this.formAjustes.disable(); }
  protected salir(): void { this.session.logout(); this.profiles.reset(); }
  private readonly ruta = inject(ActivatedRoute);

  /** `?tab=info|solicitudes|ajustes` elige la pestaña; `?estado=vacio|actualizado` elige la variante. */
  protected readonly vista$ = this.ruta.queryParamMap.pipe(
    map((params): Vista => {
      const tab = params.get('tab');
      return {
        pestania: PESTANIAS.find((p) => p === tab) ?? 'info',
        estado: this.session.demo() ? params.get('estado') :
          params.get('estado') === 'actualizado' && this.profiles.message() ? 'actualizado' : 'vacio',
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
    if (this.session.demo()) return { ...PERFIL_COACH_DEMO, email: 'coach@example.invalid' };
    const p = this.profiles.profile();
    const identity = profileIdentity(p?.fullName, p?.email ?? '', 'Coach');
    return { iniciales: identity.initials, nombre: identity.name, email: identity.email, usuario: '', rol: 'Coach',
      especialidad: p?.role === 'COACH' ? p.especialidadPrincipal : '',
      organizacion: p?.role === 'COACH' ? p.organizacionClub ?? '' : '',
      anios: p?.role === 'COACH' ? p.aniosExperiencia : 0,
      presentacion: p?.role === 'COACH' ? p.presentacion ?? '' : '' };
  }
  protected get equipos() { return this.session.demo() ? EQUIPOS_COACH_DEMO : []; }
  protected readonly solicitudes: SolicitudIngreso[] = this.session.demo() ? crearSolicitudesDemo() : [];
  protected readonly filtros = ['Pendientes', 'Todas', 'Equipo Alfa', 'Equipo Beta'];

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

  protected readonly formFiltros = new FormGroup({
    filtro: new FormControl('Pendientes', { nonNullable: true }),
  });

  protected readonly formAjustes = new FormGroup({
    notificaciones: new FormControl(AJUSTES_COACH_DEMO.notificaciones, { nonNullable: true }),
    privacidad: new FormControl(AJUSTES_COACH_DEMO.privacidad, { nonNullable: true }),
    idioma: new FormControl<'es' | 'en'>(AJUSTES_COACH_DEMO.idioma, { nonNullable: true }),
    temaOscuro: new FormControl(AJUSTES_COACH_DEMO.temaOscuro, { nonNullable: true }),
  });

  protected pendientes(): number {
    return this.solicitudes.filter((s) => s.estado === 'pendiente').length;
  }

  protected estadisticas() {
    return [
      {
        valor: this.session.demo() ? this.equipos.length : '—',
        etiqueta: 'Equipos a cargo',
        icono: 'images/perfil-coach/stat-teams-24.svg',
        fondo: 'bg-[rgba(167,139,250,0.14)]',
      },
      {
        valor: this.session.demo() ? ESTADISTICAS_COACH_DEMO.integrantesActivos : '—',
        etiqueta: 'Integrantes activos',
        icono: 'images/perfil-coach/stat-members-24.svg',
        fondo: 'bg-[rgba(74,222,128,0.14)]',
      },
      {
        valor: this.session.demo() ? this.pendientes() : '—',
        etiqueta: 'Solicitudes pendientes',
        icono: 'images/perfil-coach/stat-pending-24.svg',
        fondo: 'bg-[rgba(251,191,36,0.14)]',
      },
    ];
  }

  protected resolver(solicitud: SolicitudIngreso, estado: Exclude<EstadoSolicitud, 'pendiente'>) {
    solicitud.estado = estado;
  }
}
