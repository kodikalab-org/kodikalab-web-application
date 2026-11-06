import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

const PROGRAMADA = 'border-indigo-300/50 bg-indigo-400/10 text-indigo-200';
const EN_CURSO = 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300';
const SIN_INTENTOS = 'border-kl-border-strong bg-white/4 text-kl-body';
const RESUELTO = 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300';
const EN_PROGRESO = 'border-indigo-300/50 bg-indigo-400/15 text-indigo-200';
const POR_VERIFICAR = 'border-amber-400/50 bg-amber-400/10 text-amber-300';

@Component({
  selector: 'app-problemas-asignados',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './problemas-asignados.html',
  styleUrl: './problemas-asignados.css',
  host: { class: 'block' },
})
export class ProblemasAsignados {
  // Datos de ejemplo del Figma.
  protected readonly equipos = [
    { nombre: 'Equipo Alfa', iniciales: 'EA', detalle: '6 problemas asignados', clase: 'from-[#8a6cff] to-[#6e52f2]' },
    { nombre: 'Equipo Beta', iniciales: 'EB', detalle: '3 problemas asignados', clase: 'from-teal-400 to-teal-600' },
    { nombre: 'Grafos y DP', iniciales: 'GD', detalle: '4 problemas asignados', clase: 'from-pink-500 to-rose-600' },
  ];

  protected readonly competencias = ['Simulacro semanal', 'Maratón interna UPC'];
  protected readonly estadosCompetencia = ['Programada', 'En curso'];
  protected readonly dificultades = ['Hasta 1000', '1001 a 1600', 'Más de 1600'];
  protected readonly misEstados = ['Sin intentos', 'En progreso', 'Por verificar', 'Resuelto'];

  protected readonly problemas = [
    { letra: 'A', titulo: 'Theatre Square', detalle: 'CF-1A · Codeforces', competencia: 'Simulacro semanal', estado: 'Programada', claseEstado: PROGRAMADA, dificultad: '1000', temas: ['Matemática'], extra: '+1', puntaje: '100', miEstado: 'Sin intentos', claseMiEstado: SIN_INTENTOS },
    { letra: 'B', titulo: 'Coin Combinations I', detalle: 'CSES-1635 · CSES', competencia: 'Simulacro semanal', estado: 'Programada', claseEstado: PROGRAMADA, dificultad: '—', temas: ['Programación dinámica'], extra: '', puntaje: '100', miEstado: 'Sin intentos', claseMiEstado: SIN_INTENTOS },
    { letra: 'A', titulo: 'Watermelon', detalle: 'CF-4A · Codeforces', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '800', temas: ['Matemática'], extra: '', puntaje: '100', miEstado: 'Resuelto', claseMiEstado: RESUELTO },
    { letra: 'B', titulo: 'Weird Algorithm', detalle: 'CSES-1068 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Matemática'], extra: '+1', puntaje: '100', miEstado: 'En progreso', claseMiEstado: EN_PROGRESO },
    { letra: 'C', titulo: 'Missing Number', detalle: 'CSES-1083 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Ordenamiento'], extra: '', puntaje: '100', miEstado: 'Por verificar', claseMiEstado: POR_VERIFICAR },
    { letra: 'D', titulo: 'Shortest Routes I', detalle: 'CSES-1671 · CSES', competencia: 'Maratón interna UPC', estado: 'En curso', claseEstado: EN_CURSO, dificultad: '—', temas: ['Grafos'], extra: '+1', puntaje: '100', miEstado: 'Sin intentos', claseMiEstado: SIN_INTENTOS },
  ];

  // Avance fijo del Figma: no se calcula a partir de la lista.
  protected readonly avance = [
    { etiqueta: 'Resueltos', cantidad: '1', punto: 'bg-emerald-400' },
    { etiqueta: 'Por verificar', cantidad: '1', punto: 'bg-amber-400' },
    { etiqueta: 'En progreso', cantidad: '1', punto: 'bg-indigo-300' },
    { etiqueta: 'Sin intentos', cantidad: '3', punto: 'bg-kl-border-strong' },
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
    miEstado: new FormControl('', { nonNullable: true }),
  });
}
