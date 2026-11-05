import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Session } from '../../core/session';
import { ProfileApi } from '../../core/profile-api';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';

@Component({
  selector: 'app-inicio-dashboard',
  imports: [
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
  private readonly profiles = inject(ProfileApi);
  protected get nombre(): string { return this.session.demo() ? (this.coach ? 'Marco' : 'Camila') : this.session.account()?.email ?? 'Usuario'; }
  protected get iniciales(): string { return this.session.demo() ? (this.coach ? 'MP' : 'CR') : 'KL'; }
  protected salir(): void { this.session.logout(); this.profiles.reset(); }
  protected readonly coach: boolean;
  protected readonly nuevo$;
  protected readonly ruta: string;
  // Material renders menus in the CDK overlay, outside this component's host.
  protected readonly clasesMenu =
    'bg-kl-surface text-kl-text rounded-2xl border border-solid border-kl-border-strong shadow-[0_16px_48px_#00000099] max-w-[calc(100vw-24px)] [--mat-menu-container-color:var(--kl-surface)] [--mat-menu-item-label-text-size:14px] [--mat-menu-item-label-text-weight:400] [--mat-menu-item-hover-state-layer-color:var(--kl-accent)] [--mat-menu-item-focus-state-layer-color:var(--kl-accent)] [&_.mat-mdc-menu-item]:min-h-11 [&_.mat-mdc-menu-item]:text-kl-text [&_.mat-mdc-menu-item:hover]:bg-kl-accent/15 [&_.mat-mdc-menu-item:focus-visible]:bg-kl-accent/20';
  protected readonly enlaces = [
    { id: 'problemas', nombre: 'Problemas' },
    { id: 'competencias', nombre: 'Concursos' },
    { id: 'grupos', nombre: 'Grupos' },
    { id: 'progreso', nombre: 'Progreso' },
  ];

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
  protected readonly estadisticas;
  protected readonly temas;
  protected readonly grupos;
  protected readonly pasos;

  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
    this.ruta = this.coach ? '/coach/inicio' : '/inicio';
    this.nuevo$ = route.queryParamMap.pipe(map((params) => !this.session.demo() || params.get('estado') === 'nuevo'));
    this.estadisticas = this.coach
      ? [
          {
            valor: '2',
            etiqueta: 'Equipos a cargo',
            detalle: 'Alfa y Beta',
            vacio: 'Crea tu primer grupo',
            icono: '2-imgIcon7',
            tono: 'text-kl-muted',
          },
          {
            valor: '24',
            etiqueta: 'Integrantes activos',
            detalle: '+3 este mes',
            vacio: 'Aún no hay integrantes',
            icono: '2-imgIcon8',
            tono: 'text-green-400',
          },
          {
            valor: '3',
            etiqueta: 'Solicitudes pendientes',
            detalle: 'Requieren tu respuesta',
            vacio: 'Todo al día',
            icono: '2-imgIcon9',
            tono: 'text-amber-300',
          },
          {
            valor: '2',
            etiqueta: 'Competencias',
            detalle: 'Próxima: sáb 1 nov',
            vacio: 'Ninguna programada',
            icono: '2-imgIcon10',
            tono: 'text-kl-muted',
          },
        ]
      : [
          {
            valor: '569',
            etiqueta: 'Problemas resueltos',
            detalle: '+12 este mes',
            vacio: 'Empieza con tu primer problema',
            icono: '0-imgIcon6',
            tono: 'text-green-400',
          },
          {
            valor: '1984',
            etiqueta: 'Rating Codeforces',
            detalle: '+35 este mes',
            vacio: 'Vincula tu cuenta en el perfil',
            icono: '0-imgIcon7',
            tono: 'text-green-400',
          },
          {
            valor: '3',
            etiqueta: 'Mis grupos',
            detalle: '2 activos · 1 pendiente',
            vacio: 'Únete a uno para entrenar',
            icono: '0-imgIcon8',
            tono: 'text-kl-muted',
          },
          {
            valor: '6',
            etiqueta: 'Problemas pendientes',
            detalle: '1 vence mañana',
            vacio: 'Aún no tienes asignaciones',
            icono: '0-imgIcon9',
            tono: 'text-amber-300',
          },
        ];
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
    this.grupos = this.coach
      ? [
          {
            iniciales: 'EA',
            nombre: 'Equipo Alfa',
            detalle: '14/20 integrantes · Mar y jue 7:00 p. m.',
            estado: '2 pendientes',
          },
          {
            iniciales: 'EB',
            nombre: 'Equipo Beta',
            detalle: '10/20 integrantes · Mié 6:00 p. m.',
            estado: '1 pendiente',
          },
        ]
      : [
          { iniciales: 'EA', nombre: 'Equipo Alfa', detalle: 'Intermedio', estado: 'Miembro' },
          { iniciales: 'GD', nombre: 'Grafos y DP', detalle: 'Avanzado', estado: 'Miembro' },
          {
            iniciales: 'SC',
            nombre: 'Sprint Coders',
            detalle: 'Todos los niveles',
            estado: 'Pendiente',
          },
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
}
