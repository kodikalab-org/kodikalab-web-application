import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-progreso-tema',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './progreso-tema.html',
  styleUrl: './progreso-tema.css',
})
export class ProgresoTema {
  protected readonly indicadores = [
    { etiqueta: 'Problemas asignados', valor: '14', ayuda: 'de tu equipo' },
    { etiqueta: 'Resueltos', valor: '7', ayuda: 'de 14' },
    { etiqueta: 'Cobertura global', valor: '50%', ayuda: 'problemas distintos' },
    { etiqueta: 'Por reforzar', valor: '2', ayuda: 'temas' },
  ];
  protected readonly temas = [
    {
      nombre: 'Teoría de números',
      detalle: '4 asignados · 1 resueltos · 1 por verificar',
      cobertura: 25,
      reforzar: true,
      verificar: true,
    },
    {
      nombre: 'Geometría',
      detalle: '4 asignados · 1 resueltos',
      cobertura: 25,
      reforzar: true,
      verificar: false,
    },
    {
      nombre: 'Programación dinámica',
      detalle: '3 asignados · 1 resueltos',
      cobertura: 33,
      reforzar: false,
      verificar: false,
    },
    {
      nombre: 'Grafos',
      detalle: '6 asignados · 3 resueltos · 1 por verificar',
      cobertura: 50,
      reforzar: false,
      verificar: true,
    },
    {
      nombre: 'Estructuras de datos',
      detalle: '5 asignados · 4 resueltos',
      cobertura: 80,
      reforzar: false,
      verificar: false,
    },
    {
      nombre: 'Búsqueda binaria',
      detalle: '3 asignados · 3 resueltos',
      cobertura: 100,
      reforzar: false,
      verificar: false,
    },
  ];
}
