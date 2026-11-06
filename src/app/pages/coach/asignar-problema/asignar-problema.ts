import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';

/** Textos en español del paginador del catálogo. */
class PaginadorEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Problemas por página';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const inicio = page * pageSize + 1;
    const fin = Math.min((page + 1) * pageSize, length);
    return `Mostrando ${inicio}–${fin} de ${length} problemas`;
  };
}

@Component({
  selector: 'app-asignar-problema',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './asignar-problema.html',
  styleUrl: './asignar-problema.css',
  host: { class: 'block' },
})
export class AsignarProblema {
  protected readonly pasos = [
    {
      numero: 1,
      titulo: 'Seleccionar problemas',
      detalle: 'Elige del catálogo',
      actual: true,
      clase: 'border-[#8a6cff] bg-[#241a5c]/60',
      claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white',
    },
    {
      numero: 2,
      titulo: 'Configurar asignación',
      detalle: 'Competencia, letras y puntaje',
      actual: false,
      clase: 'border-kl-border bg-white/3',
      claseNumero: 'bg-white/8 text-kl-muted',
    },
    {
      numero: 3,
      titulo: 'Revisar y confirmar',
      detalle: 'Verifica antes de asignar',
      actual: false,
      clase: 'border-kl-border bg-white/3',
      claseNumero: 'bg-white/8 text-kl-muted',
    },
  ];

  protected readonly plataformas = ['Codeforces', 'CSES', 'AtCoder'];
  protected readonly dificultades = ['Hasta 1000', '1001 a 1600', 'Más de 1600'];
  protected readonly temas = ['Matemática', 'Implementación', 'Strings', 'Grafos', 'Programación dinámica'];

  // Datos de ejemplo del Figma.
  protected readonly problemas = [
    { titulo: 'Theatre Square', codigo: 'CF-1A', temas: ['Matemática', 'Implementación'], dificultad: '1000', plataforma: 'Codeforces', punto: 'bg-blue-400', limites: '1 s · 256 MB', marcado: true },
    { titulo: 'Watermelon', codigo: 'CF-4A', temas: ['Matemática'], dificultad: '800', plataforma: 'Codeforces', punto: 'bg-blue-400', limites: '1 s · 64 MB', marcado: false },
    { titulo: 'Way Too Long Words', codigo: 'CF-71A', temas: ['Strings'], dificultad: '800', plataforma: 'Codeforces', punto: 'bg-blue-400', limites: '1 s · 256 MB', marcado: false },
    { titulo: 'Weird Algorithm', codigo: 'CSES-1068', temas: ['Matemática', 'Implementación'], dificultad: '—', plataforma: 'CSES', punto: 'bg-emerald-400', limites: '1 s · 512 MB', marcado: true },
    { titulo: 'Missing Number', codigo: 'CSES-1083', temas: ['Ordenamiento'], dificultad: '—', plataforma: 'CSES', punto: 'bg-emerald-400', limites: '1 s · 512 MB', marcado: false },
    { titulo: 'Coin Combinations I', codigo: 'CSES-1635', temas: ['Programación dinámica'], dificultad: '—', plataforma: 'CSES', punto: 'bg-emerald-400', limites: '1 s · 512 MB', marcado: false },
    { titulo: 'Shortest Routes I', codigo: 'CSES-1671', temas: ['Grafos', 'Dijkstra'], dificultad: '—', plataforma: 'CSES', punto: 'bg-emerald-400', limites: '1 s · 512 MB', marcado: true },
    { titulo: 'I Hate Non-integer Number', codigo: 'ABC262-D', temas: ['Programación dinámica'], dificultad: '1600', plataforma: 'AtCoder', punto: 'bg-white', limites: '2 s · 1024 MB', marcado: true },
  ];

  // Resumen fijo de la selección mostrada en el Figma (no se calcula).
  protected readonly seleccionados = [
    { titulo: 'Theatre Square', detalle: 'CF-1A · Codeforces' },
    { titulo: 'Weird Algorithm', detalle: 'CSES-1068 · CSES' },
    { titulo: 'Shortest Routes I', detalle: 'CSES-1671 · CSES' },
    { titulo: 'I Hate Non-integer Number', detalle: 'ABC262-D · AtCoder' },
  ];

  protected readonly form = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    plataforma: new FormControl('', { nonNullable: true }),
    dificultad: new FormControl('', { nonNullable: true }),
    tema: new FormControl('', { nonNullable: true }),
    seleccion: new FormArray(
      this.problemas.map((p) => new FormControl(p.marcado, { nonNullable: true })),
    ),
  });
}
