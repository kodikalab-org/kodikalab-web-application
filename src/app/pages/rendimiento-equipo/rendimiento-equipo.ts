import { inject as injectSession } from '@angular/core';
import { Session } from '../../core/session';
import { TopicsLive } from './topics-live';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SiteFooter } from '../../shared/site-footer/site-footer';
import { AppHeader } from '../../shared/app-header/app-header';

@Component({
  selector: 'app-rendimiento-equipo',
  imports: [
    AppHeader,
    SiteFooter,
    TopicsLive,
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './rendimiento-equipo.html',
  styleUrl: './rendimiento-equipo.css',
})
export class RendimientoEquipo {
  readonly session = injectSession(Session);
  protected readonly estado$;
  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(map((params) => params.get('estado') ?? ''));
  }
  protected readonly form = new FormGroup({
    primero: new FormControl('Teoría de números', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    segundo: new FormControl('Geometría', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly indicadores = [
    { etiqueta: 'Integrantes', valor: '14', ayuda: 'miembros activos' },
    { etiqueta: 'Problemas distintos', valor: '24', ayuda: 'propuestos al equipo' },
    { etiqueta: 'Cobertura grupal', valor: '58%', ayuda: 'resueltos / asignados' },
    { etiqueta: 'Áreas prioritarias', valor: '1', ayuda: 'temas por reforzar' },
  ];
  protected readonly temas = [
    { nombre: 'Teoría de números', detalle: '2 de 8 problemas distintos resueltos', cobertura: 25 },
    { nombre: 'Geometría', detalle: '2 de 4 problemas distintos resueltos', cobertura: 50 },
    { nombre: 'Grafos', detalle: '5 de 8 problemas distintos resueltos', cobertura: 63 },
    {
      nombre: 'Programación dinámica',
      detalle: '6 de 8 problemas distintos resueltos',
      cobertura: 75,
    },
    { nombre: 'Búsqueda binaria', detalle: '4 de 4 problemas distintos resueltos', cobertura: 100 },
  ];
}
