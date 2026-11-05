import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-ranking-equipo',
  imports: [AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './ranking-equipo.html',
  styleUrl: './ranking-equipo.css',
})
export class RankingEquipo {
  protected readonly estado$;
  protected readonly compartidos = [
    { posicion: 1, nombre: 'Sebastián Cruz', resueltos: 21, estado: 'Activo' },
    { posicion: 2, nombre: 'Camila Rojas', resueltos: 16, estado: 'Compartida' },
    { posicion: 2, nombre: 'Valeria Núñez', resueltos: 16, estado: 'Compartida' },
    { posicion: 4, nombre: 'Ítalo Mendoza', resueltos: 12, estado: 'Activo' },
    { posicion: 5, nombre: 'Andrea López', resueltos: 9, estado: 'Activo' },
  ];
  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(map((params) => params.get('estado') ?? ''));
  }
  protected readonly indicadores = [
    { etiqueta: 'Integrantes', valor: '14', ayuda: 'miembros activos' },
    { etiqueta: 'Resoluciones válidas', valor: '128', ayuda: 'dentro de Equipo Alfa' },
    { etiqueta: 'Tu posición', valor: '3.º', ayuda: 'Camila Rojas' },
    { etiqueta: 'Actualizado', valor: '19:20', ayuda: '2 nov. 2026' },
  ];
  protected readonly integrantes = [
    { posicion: 1, nombre: 'Sebastián Cruz', resueltos: 21, estado: 'Activo' },
    { posicion: 2, nombre: 'Valeria Núñez', resueltos: 18, estado: 'Activo' },
    { posicion: 3, nombre: 'Camila Rojas', resueltos: 16, estado: 'Tú' },
    { posicion: 4, nombre: 'Ítalo Mendoza', resueltos: 12, estado: 'Activo' },
    { posicion: 5, nombre: 'Andrea López', resueltos: 9, estado: 'Activo' },
  ];
}
