import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Session } from '../../core/session';
import { CoachGroup, PractitionerGroup, TeamsApi } from '../../core/teams-api';
import { navigationFor } from '../../core/navigation';
import { HeaderNavigation } from '../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../shared/user-menu/user-menu';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  selector: 'app-inicio-dashboard',
  imports: [
    SiteFooter,
    HeaderNavigation,
    UserMenu,
    NgTemplateOutlet,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './inicio-dashboard.html',
  styleUrl: './inicio-dashboard.css',
})
export class InicioDashboard {
  protected readonly session = inject(Session);
  private readonly api = inject(TeamsApi);
  protected get nombre(): string { return this.session.account()?.email ?? 'Usuario'; }
  protected get iniciales(): string { return 'KL'; }
  protected readonly coach: boolean;
  protected readonly ruta: string;
  // Material renders menus in the CDK overlay, outside this component's host.
  protected readonly clasesMenu =
    'bg-kl-surface text-kl-text rounded-2xl border border-solid border-kl-border-strong shadow-[0_16px_48px_#00000099] max-w-[calc(100vw-24px)] [--mat-menu-container-color:var(--kl-surface)] [--mat-menu-item-label-text-size:14px] [--mat-menu-item-label-text-weight:400] [--mat-menu-item-hover-state-layer-color:var(--kl-accent)] [--mat-menu-item-focus-state-layer-color:var(--kl-accent)] [&_.mat-mdc-menu-item]:min-h-11 [&_.mat-mdc-menu-item]:text-kl-text [&_.mat-mdc-menu-item:hover]:bg-kl-accent/15 [&_.mat-mdc-menu-item:focus-visible]:bg-kl-accent/20';
  protected get enlaces() {
    return [
      ...navigationFor(this.coach).slice(1, 5).map((link, index) => ({
        ...link, id: ['problemas', 'competencias', 'grupos', 'recursos'][index], nombre: link.label,
      })),
      { id: 'progreso', nombre: 'Progreso', path: this.coach ? '/coach/rendimiento' : '/progreso', fragment: undefined },
    ];
  }

  protected destino(nombre: string): string | null {
    if (nombre.includes('grupo') || nombre.includes('equipo')) return nombre === 'Crear grupo' ? '/coach/grupos/crear' : this.coach ? '/coach/grupos/solicitudes' : '/grupos';
    if (nombre.includes('Solicitudes')) return '/coach/grupos/solicitudes';
    if (nombre.includes('progreso') || nombre.includes('reforzar')) return this.coach ? '/coach/rendimiento' : '/progreso';
    if (nombre.includes('competencias') && this.coach) return '/coach/competencias';
    return null;
  }

  protected irASeccion(seccion: HTMLElement): void {
    seccion.scrollIntoView({ block: 'start' });
  }
  /** Grupos reales del coach; `null` mientras la petición está en curso. */
  protected readonly misGrupos = signal<CoachGroup[] | null>(null);
  /** Membresías reales del practicante. */
  protected readonly misMembresias = signal<PractitionerGroup[] | null>(null);
  protected readonly resueltos = signal<number | null>(null);
  protected readonly pendientesProblemas = signal<number | null>(null);

  /** Pasos completados: cuenta y perfil siempre; grupo e integrantes según datos reales. */
  protected readonly pasosCompletados = computed(() => {
    if (this.coach) {
      const grupos = this.misGrupos() ?? [];
      const conGrupo = grupos.length > 0;
      const conIntegrantes = grupos.some((grupo) => grupo.activeMembers > 0);
      return 2 + (conGrupo ? 1 : 0) + (conIntegrantes ? 1 : 0);
    }

    const membresias = this.misMembresias() ?? [];
    const enGrupo = membresias.length > 0;
    const resolvio = (this.resueltos() ?? 0) > 0;
    return 2 + (enGrupo ? 1 : 0) + (resolvio ? 1 : 0);
  });

  protected readonly estadisticas = computed(() => {
    if (this.coach) {
      const grupos = this.misGrupos();
      if (grupos === null) {
        return [
          { valor: '—', etiqueta: 'Equipos a cargo', detalle: 'Cargando…', vacio: '', icono: '2-imgIcon7', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Integrantes activos', detalle: 'Cargando…', vacio: '', icono: '2-imgIcon8', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Solicitudes pendientes', detalle: 'Cargando…', vacio: '', icono: '2-imgIcon9', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Competencias', detalle: 'Cargando…', vacio: '', icono: '2-imgIcon10', tono: 'text-kl-muted' },
        ];
      }
      const integrantes = grupos.reduce((total, grupo) => total + grupo.activeMembers, 0);
      const pendientes = grupos.reduce((total, grupo) => total + grupo.pendingRequests, 0);
      return [
        {
          valor: String(grupos.length),
          etiqueta: 'Equipos a cargo',
          detalle: grupos.length ? 'Tus grupos de entrenamiento' : 'Crea tu primer grupo',
          vacio: 'Crea tu primer grupo',
          icono: '2-imgIcon7',
          tono: 'text-kl-muted',
        },
        {
          valor: String(integrantes),
          etiqueta: 'Integrantes activos',
          detalle: integrantes ? 'En todos tus grupos' : 'Aún no hay integrantes',
          vacio: 'Aún no hay integrantes',
          icono: '2-imgIcon8',
          tono: integrantes ? 'text-green-400' : 'text-kl-muted',
        },
        {
          valor: String(pendientes),
          etiqueta: 'Solicitudes pendientes',
          detalle: pendientes ? 'Requieren tu respuesta' : 'Todo al día',
          vacio: 'Todo al día',
          icono: '2-imgIcon9',
          tono: pendientes ? 'text-amber-300' : 'text-kl-muted',
        },
        {
          valor: '—',
          etiqueta: 'Competencias',
          detalle: 'Pendiente de integración',
          vacio: '',
          icono: '2-imgIcon10',
          tono: 'text-kl-muted',
        },
      ];
    }

    const membresias = this.misMembresias();
    const activos = (membresias ?? []).filter(
      (item) => item.membership.status === 'ACTIVO',
    ).length;
    const resueltos = this.resueltos();
    const pendientes = this.pendientesProblemas();
    return [
      {
        valor: resueltos === null ? '—' : String(resueltos),
        etiqueta: 'Problemas resueltos',
        detalle: resueltos === null ? 'Cargando…' : 'En tus grupos',
        vacio: '',
        icono: '0-imgIcon6',
        tono: resueltos ? 'text-green-400' : 'text-kl-muted',
      },
      {
        valor: '—',
        etiqueta: 'Rating Codeforces',
        detalle: 'Pendiente de integración',
        vacio: '',
        icono: '0-imgIcon7',
        tono: 'text-kl-muted',
      },
      {
        valor: membresias === null ? '—' : String(membresias.length),
        etiqueta: 'Mis grupos',
        detalle:
          membresias === null
            ? 'Cargando…'
            : `${activos} activo${activos === 1 ? '' : 's'} · ${membresias.length - activos} pendiente${membresias.length - activos === 1 ? '' : 's'}`,
        vacio: '',
        icono: '0-imgIcon8',
        tono: 'text-kl-muted',
      },
      {
        valor: pendientes === null ? '—' : String(pendientes),
        etiqueta: 'Problemas pendientes',
        detalle: pendientes === null ? 'Cargando…' : 'Sin resolver',
        vacio: '',
        icono: '0-imgIcon9',
        tono: pendientes ? 'text-amber-300' : 'text-kl-muted',
      },
    ];
  });

  protected readonly grupos = computed(() => {
    if (this.coach) {
      const reales = this.misGrupos();
      if (reales !== null) {
        return reales.map((grupo) => ({
          id: grupo.groupId,
          iniciales: this.inicialesDe(grupo.name),
          nombre: grupo.name,
          detalle: `${grupo.activeMembers}/${grupo.maxCapacity ?? '—'} integrantes · ${grupo.sessionSchedule ?? 'horario por definir'}`,
          estado:
            grupo.status === 'BORRADOR'
              ? 'Borrador'
              : grupo.pendingRequests > 0
                ? `${grupo.pendingRequests} pendiente${grupo.pendingRequests === 1 ? '' : 's'}`
                : 'Sin pendientes',
        }));
      }
      return [];
    }

    const membresias = this.misMembresias();
    if (membresias !== null) {
      return membresias.map((item) => ({
        id: item.groupId,
        iniciales: this.inicialesDe(item.name),
        nombre: item.name,
        detalle: `${item.expectedLevel ?? 'Sin nivel'} · ${item.sessionSchedule ?? 'horario por definir'}`,
        estado: this.estadoMembresia(item.membership.status),
      }));
    }

    return [];
  });

  /** Verdadero mientras la lista de grupos todavía no llegó de la API. */
  protected readonly gruposCargando = computed(() =>
    (this.coach ? this.misGrupos() : this.misMembresias()) === null,
  );

  protected readonly pasos;

  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
    this.ruta = this.coach ? '/coach/inicio' : '/inicio';
    if (this.coach) {
      this.api.loadMine().subscribe({
        next: (mine) => this.misGrupos.set(mine.filter((g): g is CoachGroup => 'activeMembers' in g)),
        error: () => this.misGrupos.set([]),
      });
    } else {
      this.api.loadMine().subscribe({
        next: (mine) => {
          const membresias = mine.filter((m): m is PractitionerGroup => 'membership' in m);
          this.misMembresias.set(membresias);
          this.cargarProblemas(membresias);
        },
        error: () => this.misMembresias.set([]),
      });
    }
    this.pasos = [
      { nombre: 'Crea tu cuenta', detalle: 'Listo, ya estás dentro.' },
      {
        nombre: this.coach ? 'Completa tu perfil de coach' : 'Completa tu perfil',
        detalle: this.coach
          ? 'Tu especialidad y experiencia.'
          : 'Tus datos académicos y de plataformas.',
      },
      {
        nombre: this.coach ? 'Crea tu primer grupo' : 'Únete a un grupo',
        detalle: this.coach
          ? 'Define nivel, horario, cupo y visibilidad.'
          : 'Busca un grupo de tu nivel y envía tu solicitud.',
      },
      {
        nombre: this.coach ? 'Invita a practicantes' : 'Resuelve tu primer problema',
        detalle: this.coach
          ? 'Comparte el código y acepta solicitudes.'
          : 'Tu coach te asignará problemas para practicar.',
      },
    ];
  }

  private inicialesDe(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((palabra) => palabra[0]?.toUpperCase() ?? '')
      .join('');
  }

  private estadoMembresia(status: string): string {
    switch (status) {
      case 'ACTIVO':
        return 'Miembro';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'ACLARACION_SOLICITADA':
        return 'Aclaración';
      case 'EXPULSADO':
        return 'Expulsado';
      case 'RECHAZADO':
        return 'Rechazado';
      default:
        return 'Retirado';
    }
  }

  /** Cuenta problemas resueltos y pendientes sumando los grupos activos del practicante. */
  private cargarProblemas(membresias: PractitionerGroup[]): void {
    const activos = membresias.filter((item) => item.membership.status === 'ACTIVO');

    if (activos.length === 0) {
      this.resueltos.set(0);
      this.pendientesProblemas.set(0);
      return;
    }

    forkJoin(activos.map((item) => this.api.assignedProblems(item.groupId))).subscribe({
      next: (results) => {
        const items = results.flatMap((result) => result.items);
        this.resueltos.set(items.filter((item) => item.status === 'RESUELTO').length);
        this.pendientesProblemas.set(items.filter((item) => item.status !== 'RESUELTO').length);
      },
      error: () => {
        this.resueltos.set(null);
        this.pendientesProblemas.set(null);
      },
    });
  }
}
