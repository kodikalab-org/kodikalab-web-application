import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RegistroProblemasResueltos } from '../../../registro-problemas-resueltos/registro-problemas-resueltos';

@Component({
  selector: 'app-problema-elegido',
  imports: [RouterLink, MatButtonModule, MatCardModule, RegistroProblemasResueltos],
  templateUrl: './problema-elegido.html',
  styleUrl: './problema-elegido.css',
  host: { class: 'block' },
})
export class ProblemaElegido {
  // Datos de ejemplo del Figma (problema «Weird Algorithm»).
  protected readonly condiciones = [
    { etiqueta: 'Plataforma', valor: 'CSES' },
    { etiqueta: 'Código de origen', valor: 'CSES-1068', mono: true },
    { etiqueta: 'Dificultad', valor: '—' },
    { etiqueta: 'Límite de tiempo', valor: '1 s' },
    { etiqueta: 'Límite de memoria', valor: '512 MB' },
    { etiqueta: 'Puntaje · globo', valor: '100 · #22C55E', mono: true },
  ];

  protected readonly competencia = [
    { etiqueta: 'Competencia', valor: 'Maratón interna UPC' },
    { etiqueta: 'Inicio', valor: 'Mar 28 oct 2026 · 12:00 a. m.' },
    { etiqueta: 'Fin', valor: 'Dom 2 nov 2026 · 11:59 p. m.' },
    { etiqueta: 'Duración', valor: '24 horas' },
    { etiqueta: 'Penalización', valor: 'ICPC · 20 min' },
  ];

  protected readonly avance = [
    { etiqueta: 'Intentos', valor: '2' },
    { etiqueta: 'Último intento', valor: '29 oct. 2026 · 8:14 p. m.' },
  ];

  protected readonly intentos = [
    { fecha: '29 oct. 2026 · 8:14 p. m.', lenguaje: 'C++17', veredicto: 'Rechazado', evidencia: '—' },
    { fecha: '28 oct. 2026 · 7:40 p. m.', lenguaje: 'C++17', veredicto: 'Rechazado', evidencia: '—' },
  ];
}
