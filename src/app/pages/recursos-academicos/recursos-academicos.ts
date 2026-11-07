import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Session } from '../../core/session';
import { HeaderNavigation } from '../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../shared/user-menu/user-menu';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  selector: 'app-recursos-academicos',
  imports: [SiteFooter, HeaderNavigation, UserMenu, AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './recursos-academicos.html',
  styleUrl: './recursos-academicos.css',
})
export class RecursosAcademicos {
  protected readonly session = inject(Session);
  protected get coach(): boolean { return (this.session.demo() ?? this.session.account()?.role) === 'COACH'; }
  // Selección de frames estáticos, sin consultar catálogos ni utilizar IA.
  protected readonly estado$;
  protected readonly pertinentes = [
    {
      nombre: 'Competitive Programmer’s Handbook',
      detalle: 'Antti Laaksonen · Libro · Sección: Shortest paths',
      relacion: 'explica BFS y caminos mínimos para grafos sin pesos, aplicables a una grilla.',
    },
    {
      nombre: 'Competitive Programming 4',
      detalle: 'Steven y Felix Halim · Libro · Sección: Graph',
      relacion: 'presenta recorridos y estrategias para modelar problemas de rutas en grafos.',
    },
  ];
  protected readonly relacionados = [
    {
      nombre: 'Recorridos de grafos',
      detalle: 'Material de grafos · Nivel inicial–intermedio',
      relacion: 'permite representar las celdas y sus conexiones antes de aplicar el algoritmo de camino mínimo.',
    },
    {
      nombre: 'Colas y búsqueda en anchura',
      detalle: 'Estructuras de datos · Nivel inicial',
      relacion: 'refuerza la estructura auxiliar utilizada por BFS. No aborda el problema específico.',
    },
  ];

  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(map(params => {
      const estado = params.get('estado') ?? '';
      return ['relacionados', 'catalogo-no-disponible', 'contexto-no-disponible'].includes(estado) ? estado : 'pertinentes';
    }));
  }
}
