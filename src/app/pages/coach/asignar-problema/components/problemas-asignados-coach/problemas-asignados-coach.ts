import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

const PROGRAMADA = 'border-indigo-300/50 bg-indigo-400/10 text-indigo-200';
const EN_CURSO = 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300';

@Component({
  selector: 'app-problemas-asignados-coach',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './problemas-asignados-coach.html',
  styleUrl: './problemas-asignados-coach.css',
  host: { class: 'block' },
})
export class ProblemasAsignadosCoach {
  // Datos de ejemplo del Figma.
  protected readonly equipos = [
    { nombre: 'Equipo Alfa', iniciales: 'EA', detalle: '6 problemas asignados', clase: 'from-[#8a6cff] to-[#6e52f2]' },
    { nombre: 'Equipo Beta', iniciales: 'EB', detalle: '3 problemas asignados', clase: 'from-teal-400 to-teal-600' },
  ];

  protected readonly competencias = ['Simulacro semanal', 'Maratón interna UPC'];
  protected readonly estados = ['Programada', 'En curso'];
  protected readonly dificultades = ['Hasta 1000', '1001 a 1600', 'Más de 1600'];

  protected readonly problemas = [
    { letra: 'A', titulo: 'Theatre Square', detalle: 'CF-1A · Codeforces', competencia: 'Simulacro semanal', estado: 'Programada', claseEstado: PROGRAMADA, dificultad: '1000', temas: ['Matemática'], extra: '+1', puntaje: '100', fecha: '20 oct.' },
    { letra: 'B', titulo: 'Coin Combinations I', detalle: 'CSES-1635 · CSES', competencia: 'Simulacro semanal', estado: 'Programada', claseEstado: PROGRAMADA, dificultad: '—', temas: ['Programación dinámica'], extra: '', puntaje: '100', fecha: '20 oct.' },
    { letra: 'A', titulo: 'Watermelon', detalle: 'CF-4A · Codeforces', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '800', temas: ['Matemática'], extra: '', puntaje: '100', fecha: '14 oct.' },
    { letra: 'B', titulo: 'Weird Algorithm', detalle: 'CSES-1068 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Matemática'], extra: '+1', puntaje: '100', fecha: '14 oct.' },
    { letra: 'C', titulo: 'Missing Number', detalle: 'CSES-1083 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Ordenamiento'], extra: '', puntaje: '100', fecha: '14 oct.' },
    { letra: 'D', titulo: 'Shortest Routes I', detalle: 'CSES-1671 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Grafos'], extra: '+1', puntaje: '100', fecha: '14 oct.' },
  ];

  protected readonly resumen = [
    { etiqueta: 'Problemas asignados', valor: '6' },
    { etiqueta: 'Competencias', valor: '2' },
    { etiqueta: 'Integrantes activos', valor: '14' },
    { etiqueta: 'Última asignación', valor: '20 oct. 2026' },
  ];

  protected readonly competenciasEquipo = [
    { nombre: 'Simulacro semanal', detalle: 'Empieza sáb 1 nov · 7:00 p. m.', estado: 'Programada', claseEstado: PROGRAMADA },
    { nombre: 'Maratón interna UPC', detalle: 'Termina dom 2 nov · 11:59 p. m.', estado: 'En curso', claseEstado: EN_CURSO },
  ];

  protected readonly form = new FormGroup({
    equipo: new FormControl('Equipo Alfa', { nonNullable: true }),
    busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    competencia: new FormControl('', { nonNullable: true }),
    estado: new FormControl('', { nonNullable: true }),
    dificultad: new FormControl('', { nonNullable: true }),
  });
}
