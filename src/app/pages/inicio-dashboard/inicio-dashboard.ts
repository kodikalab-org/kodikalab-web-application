import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
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
import { forkJoin, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Loader } from '../../shared/loader/loader';
import { plural } from '../../shared/plural';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  selector: 'app-inicio-dashboard',
  imports: [
    Loader,
    SiteFooter,
    HeaderNavigation,
    UserMenu,
    AsyncPipe,
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
  protected get nombre(): string { return this.session.demo() ? (this.coach ? 'Marco' : 'Camila') : this.session.account()?.email ?? 'Usuario'; }
  protected get iniciales(): string { return this.session.demo() ? (this.coach ? 'MP' : 'CR') : 'KL'; }
  protected readonly coach: boolean;
  protected readonly nuevo$;
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
  protected readonly problemas = [
    {
      nombre: 'Suma de intervalos',
      detalle: 'Estructuras de datos · Codeforces',
      estado: 'Resuelto',
      tono: 'text-green-400 border-green-400/50 bg-green-400/10',
    },
    {
      nombre: 'Camino mínimo en grilla',
      detalle: 'Grafos · AtCoder',
      estado: 'En curso',
      tono: 'text-indigo-300 border-indigo-300/50 bg-indigo-300/10',
    },
    {
      nombre: 'Mochila con repeticiones',
      detalle: 'Programación dinámica · VJudge',
      estado: 'Vence mañana',
      tono: 'text-amber-300 border-amber-300/50 bg-amber-300/10',
    },
    {
      nombre: 'Divisores y primos',
      detalle: 'Teoría de números · Codeforces',
      estado: 'Sin iniciar',
      tono: 'text-kl-body border-kl-border-strong bg-white/5',
    },
  ];
  protected readonly solicitudes = [
    {
      iniciales: 'VN',
      nombre: 'Valeria Núñez',
      detalle: 'Solicita unirse a Equipo Alfa · Nivel Intermedio',
      fecha: '12 oct.',
    },
    {
      iniciales: 'SC',
      nombre: 'Sebastián Cruz',
      detalle: 'Solicita unirse a Equipo Alfa · Nivel Principiante',
      fecha: '11 oct.',
    },
    {
      iniciales: 'IM',
      nombre: 'Ítalo Mendoza',
      detalle: 'Solicita unirse a Equipo Beta · Nivel Avanzado',
      fecha: '9 oct.',
    },
  ];
  protected readonly competencias = [
    { nombre: 'Simulacro semanal', grupo: 'Equipo Alfa', fecha: 'Sáb 1 nov · 7:00 p. m.' },
    { nombre: 'Maratón interna UPC', grupo: 'Grafos y DP', fecha: 'Dom 9 nov · 9:00 a. m.' },
    { nombre: 'Contest de práctica', grupo: 'Equipo Alfa', fecha: 'Sáb 15 nov · 7:00 p. m.' },
  ];
  protected readonly temas;
  /** Grupos reales del coach; `null` mientras la petición está en curso. */
  protected readonly misGrupos = signal<CoachGroup[] | null>(null);
  /** Membresías reales del practicante. */
  protected readonly misMembresias = signal<PractitionerGroup[] | null>(null);
  protected readonly resueltos = signal<number | null>(null);
  protected readonly pendientesProblemas = signal<number | null>(null);
  protected readonly errorGrupos = signal(false);
  protected readonly errorProblemas = signal(false);
  /** Demo variant without activity (`?estado=nuevo`). */
  private readonly sinActividad;
  /** The coach demo teams listed on this screen; the demo tiles are derived from them. */
  private readonly equiposDemo = [
    { iniciales: 'EA', nombre: 'Equipo Alfa', integrantes: 14, cupo: 20, horario: 'Mar y jue 7:00 p. m.', pendientes: 2 },
    { iniciales: 'EB', nombre: 'Equipo Beta', integrantes: 10, cupo: 20, horario: 'Mié 6:00 p. m.', pendientes: 1 },
  ];
  protected readonly plural = plural;
  protected readonly solicitudesPendientes = computed(() =>
    (this.misGrupos() ?? []).reduce((total, grupo) => total + grupo.pendingRequests, 0),
  );

  /** True while the real teams or memberships have not arrived and nothing has failed. */
  protected get cargandoGrupos(): boolean {
    const datos = this.coach ? this.misGrupos() : this.misMembresias();
    return !this.session.demo() && !this.errorGrupos() && datos === null;
  }

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
    const demo = !!this.session.demo();
    const nuevo = demo && this.sinActividad();
    if (this.coach) {
      const grupos = demo
        ? nuevo ? [] : this.equiposDemo.map((e) => ({ activeMembers: e.integrantes, pendingRequests: e.pendientes }))
        : this.misGrupos();
      if (grupos === null) {
        const detalle = this.errorGrupos() ? 'No se pudo cargar' : 'Cargando…';
        return [
          { valor: '—', etiqueta: 'Equipos a cargo', detalle, vacio: '', icono: '2-imgIcon7', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Integrantes activos', detalle, vacio: '', icono: '2-imgIcon8', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Solicitudes pendientes', detalle, vacio: '', icono: '2-imgIcon9', tono: 'text-kl-muted' },
          { valor: '—', etiqueta: 'Competencias', detalle, vacio: '', icono: '2-imgIcon10', tono: 'text-kl-muted' },
        ];
      }
      const programadas = nuevo ? 0 : this.competencias.length;
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
          // No request feeds this count in a real session, so no number is shown there.
          valor: demo ? String(programadas) : '—',
          etiqueta: 'Competencias',
          detalle: !demo ? 'Pendiente de integración' : programadas ? 'Programadas' : 'Ninguna programada',
          vacio: 'Ninguna programada',
          icono: '2-imgIcon10',
          tono: 'text-kl-muted',
        },
      ];
    }

    if (!demo) {
      const membresias = this.misMembresias();
      const sinGrupos = this.errorGrupos() ? 'No se pudo cargar' : 'Cargando…';
      const sinProblemas = this.errorGrupos() || this.errorProblemas() ? 'No se pudo cargar' : 'Cargando…';
      const enEspera = (membresias ?? []).filter((item) =>
        ['PENDIENTE', 'ACLARACION_SOLICITADA'].includes(item.membership.status),
      ).length;
      const activos = (membresias ?? []).filter(
        (item) => item.membership.status === 'ACTIVO',
      ).length;
      const resueltos = this.resueltos();
      const pendientes = this.pendientesProblemas();
      return [
        {
          valor: resueltos === null ? '—' : String(resueltos),
          etiqueta: 'Problemas resueltos',
          detalle: resueltos === null ? sinProblemas : 'En tus grupos',
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
              ? sinGrupos
              : `${plural(activos, 'activo')} · ${plural(enEspera, 'pendiente')}`,
          vacio: '',
          icono: '0-imgIcon8',
          tono: 'text-kl-muted',
        },
        {
          valor: pendientes === null ? '—' : String(pendientes),
          etiqueta: 'Problemas pendientes',
          detalle: pendientes === null ? sinProblemas : 'Sin resolver',
          vacio: '',
          icono: '0-imgIcon9',
          tono: pendientes ? 'text-amber-300' : 'text-kl-muted',
        },
      ];
    }

    if (nuevo) {
      return [
        { valor: '0', etiqueta: 'Problemas resueltos', detalle: 'Empieza con tu primer problema', vacio: '', icono: '0-imgIcon6', tono: 'text-kl-muted' },
        { valor: '—', etiqueta: 'Rating Codeforces', detalle: 'Vincula tu cuenta en el perfil', vacio: '', icono: '0-imgIcon7', tono: 'text-kl-muted' },
        { valor: '0', etiqueta: 'Mis grupos', detalle: 'Únete a uno para entrenar', vacio: '', icono: '0-imgIcon8', tono: 'text-kl-muted' },
        { valor: '0', etiqueta: 'Problemas pendientes', detalle: 'Aún no tienes asignaciones', vacio: '', icono: '0-imgIcon9', tono: 'text-kl-muted' },
      ];
    }

    return [
      { valor: '569', etiqueta: 'Problemas resueltos', detalle: '+12 este mes', vacio: 'Empieza con tu primer problema', icono: '0-imgIcon6', tono: 'text-green-400' },
      { valor: '1984', etiqueta: 'Rating Codeforces', detalle: '+35 este mes', vacio: 'Vincula tu cuenta en el perfil', icono: '0-imgIcon7', tono: 'text-green-400' },
      { valor: '3', etiqueta: 'Mis grupos', detalle: '2 activos · 1 pendiente', vacio: 'Únete a uno para entrenar', icono: '0-imgIcon8', tono: 'text-kl-muted' },
      { valor: '6', etiqueta: 'Problemas pendientes', detalle: '1 vence mañana', vacio: 'Aún no tienes asignaciones', icono: '0-imgIcon9', tono: 'text-amber-300' },
    ];
  });

  protected readonly grupos = computed(() => {
    if (this.coach) {
      if (this.session.demo()) {
        return this.equiposDemo.map((equipo) => ({
          id: null,
          iniciales: equipo.iniciales,
          nombre: equipo.nombre,
          detalle: `${equipo.integrantes}/${equipo.cupo} integrantes · ${equipo.horario}`,
          estado: plural(equipo.pendientes, 'pendiente'),
        }));
      }
      return (this.misGrupos() ?? []).map((grupo) => ({
        id: grupo.groupId,
        iniciales: this.inicialesDe(grupo.name),
        nombre: grupo.name,
        detalle: `${grupo.activeMembers}/${grupo.maxCapacity ?? '—'} integrantes · ${grupo.sessionSchedule ?? 'horario por definir'}`,
        estado:
          grupo.status === 'BORRADOR'
            ? 'Borrador'
            : grupo.pendingRequests > 0
              ? plural(grupo.pendingRequests, 'pendiente')
              : 'Sin pendientes',
      }));
    }

    if (!this.session.demo()) {
      return (this.misMembresias() ?? []).map((item) => ({
        id: item.groupId,
        iniciales: this.inicialesDe(item.name),
        nombre: item.name,
        detalle: `${item.expectedLevel ?? 'Sin nivel'} · ${item.sessionSchedule ?? 'horario por definir'}`,
        estado: this.estadoMembresia(item.membership.status),
      }));
    }

    return [
      { id: null, iniciales: 'EA', nombre: 'Equipo Alfa', detalle: 'Intermedio', estado: 'Miembro' },
      { id: null, iniciales: 'GD', nombre: 'Grafos y DP', detalle: 'Avanzado', estado: 'Miembro' },
      { id: null, iniciales: 'SC', nombre: 'Sprint Coders', detalle: 'Todos los niveles', estado: 'Pendiente' },
    ];
  });

  protected readonly pasos;

  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
    this.ruta = this.coach ? '/coach/inicio' : '/inicio';
    this.nuevo$ = route.queryParamMap.pipe(map((params) => !this.session.demo() || params.get('estado') === 'nuevo'));
    this.sinActividad = toSignal(route.queryParamMap.pipe(map((params) => params.get('estado') === 'nuevo')), {
      initialValue: false,
    });
    if (!this.session.demo()) this.cargar();
    this.temas = this.coach
      ? [
          { nombre: 'Teoría de números', valor: 22 },
          { nombre: 'Grafos', valor: 41 },
          { nombre: 'Programación dinámica', valor: 58 },
          { nombre: 'Búsqueda binaria', valor: 83 },
        ]
      : [
          { nombre: 'Búsqueda binaria', valor: 90 },
          { nombre: 'Programación dinámica', valor: 72 },
          { nombre: 'Grafos', valor: 58 },
          { nombre: 'Teoría de números', valor: 33 },
        ];
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

  /** Loads the real teams and, for practitioners, their assigned problems. Also used to retry. */
  protected cargar(): void {
    this.errorGrupos.set(false);
    this.errorProblemas.set(false);
    this.misGrupos.set(null);
    this.misMembresias.set(null);
    this.resueltos.set(null);
    this.pendientesProblemas.set(null);
    this.api.loadMine().subscribe({
      next: (mine) => {
        if (this.coach) {
          this.misGrupos.set(mine.filter((g): g is CoachGroup => 'activeMembers' in g));
          return;
        }
        const membresias = mine.filter((m): m is PractitionerGroup => 'membership' in m);
        this.misMembresias.set(membresias);
        this.cargarProblemas(membresias);
      },
      error: () => this.errorGrupos.set(true),
    });
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
      error: () => this.errorProblemas.set(true),
    });
  }
}
