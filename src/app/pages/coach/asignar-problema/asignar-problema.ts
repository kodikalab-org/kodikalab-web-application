import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { merge } from 'rxjs';
import {
  CatalogPage,
  CatalogProblem,
  CatalogTopic,
  PLATFORM_LABEL,
  ProblemsApi,
  SourcePlatform,
  problemsError,
} from '../../../core/problems-api';
import { CodeforcesCodeAdd } from '../../../shared/problem-picker/codeforces-code-add';
import { AssignmentStore, MAX_PROBLEMS_PER_ASSIGNMENT } from './assignment-store';
import { PasosAsignacion } from './components/pasos-asignacion/pasos-asignacion';

/** Textos en español del paginador del catálogo. */
class PaginadorEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Problemas por página';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return 'Sin problemas';
    const inicio = page * pageSize + 1;
    const fin = Math.min((page + 1) * pageSize, length);
    return `Mostrando ${inicio}–${fin} de ${length} problemas`;
  };
}

const PUNTO_PLATAFORMA: Record<SourcePlatform, string> = {
  CODEFORCES: 'bg-blue-400',
  CSES: 'bg-emerald-400',
  ATCODER: 'bg-white',
};

/** Step 1 of US-07: search the catalog and pick the problems to assign. */
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
    CodeforcesCodeAdd,
    PasosAsignacion,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './asignar-problema.html',
  styleUrl: './asignar-problema.css',
  host: { class: 'block' },
})
export class AsignarProblema {
  private readonly api = inject(ProblemsApi);
  protected readonly store = inject(AssignmentStore);

  protected readonly tamano = 10;
  protected readonly maximo = MAX_PROBLEMS_PER_ASSIGNMENT;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;

  protected readonly pagina = signal<CatalogPage | null>(null);
  protected readonly indice = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Result of the last quick add by Codeforces code (added, already selected, limit reached). */
  protected readonly avisoCodigo = signal<string | null>(null);

  // The backend has no endpoint for filter values: they come from the problems it has returned so far.
  protected readonly plataformas = signal<SourcePlatform[]>([]);
  protected readonly temas = signal<CatalogTopic[]>([]);
  protected readonly dificultades = signal<string[]>([]);

  protected readonly form = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    plataforma: new FormControl('', { nonNullable: true }),
    dificultad: new FormControl('', { nonNullable: true }),
    tema: new FormControl('', { nonNullable: true }),
  });

  private request = 0;

  constructor() {
    const { plataforma, dificultad, tema } = this.form.controls;
    merge(plataforma.valueChanges, dificultad.valueChanges, tema.valueChanges)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.aplicar());
    this.cargar(0);
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const teamId = Number(query.get('teamId'));
    const competitionId = Number(query.get('competitionId'));
    if (Number.isInteger(teamId) && teamId > 0 && Number.isInteger(competitionId) && competitionId > 0) {
      this.store.preselect(teamId, competitionId);
    }
  }

  /** Applies the search box and filters, going back to the first page. */
  protected aplicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargar(0);
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.cargar(evento.pageIndex);
  }

  protected reintentar(): void {
    this.cargar(this.indice());
  }

  protected alternar(problema: CatalogProblem): void {
    this.store.toggle(problema);
  }

  /** Puts a problem imported by its Codeforces code into the selection; it is never toggled off. */
  protected agregarImportado(problema: CatalogProblem): void {
    if (this.store.isSelected(problema.id)) {
      this.avisoCodigo.set(`«${problema.title}» ya está en tu selección.`);
    } else if (this.store.toggle(problema)) {
      this.avisoCodigo.set(`«${problema.title}» se agregó a tu selección.`);
    } else {
      this.avisoCodigo.set(`Llegaste al máximo de ${this.maximo} problemas.`);
    }
  }

  protected punto(plataforma: SourcePlatform | null): string {
    return plataforma ? PUNTO_PLATAFORMA[plataforma] : 'bg-kl-border-strong';
  }

  protected limites(problema: CatalogProblem): string {
    const tiempo = problema.timeLimitMs === null ? null : `${problema.timeLimitMs / 1000} s`;
    const memoria = problema.memoryLimitMb === null ? null : `${problema.memoryLimitMb} MB`;
    return [tiempo, memoria].filter(Boolean).join(' · ') || '—';
  }

  private cargar(indice: number): void {
    const { busqueda, plataforma, dificultad, tema } = this.form.getRawValue();
    const actual = ++this.request;
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .catalog({
        q: busqueda,
        platform: plataforma as SourcePlatform | '',
        difficulty: dificultad,
        topicId: tema ? Number(tema) : null,
        page: indice,
        size: this.tamano,
      })
      .subscribe({
        next: (pagina) => {
          if (actual !== this.request) return;
          this.pagina.set(pagina);
          this.indice.set(pagina.page);
          this.recordarFiltros(pagina.items);
          this.cargando.set(false);
        },
        error: (error) => {
          if (actual !== this.request) return;
          this.error.set(problemsError(error));
          this.cargando.set(false);
        },
      });
  }

  private recordarFiltros(problemas: CatalogProblem[]): void {
    this.plataformas.update((lista) =>
      unir(lista, problemas.flatMap((p) => (p.sourcePlatform ? [p.sourcePlatform] : [])), (a) => a),
    );
    this.temas.update((lista) => unir(lista, problemas.flatMap((p) => p.topics), (t) => t.id));
    this.dificultades.update((lista) =>
      unir(lista, problemas.flatMap((p) => (p.difficultyRating ? [p.difficultyRating] : [])), (d) => d),
    );
  }
}

/** Appends the values of `nuevos` that `actuales` does not have yet, keeping the order they were first seen. */
function unir<T, K>(actuales: T[], nuevos: T[], clave: (valor: T) => K): T[] {
  const vistos = new Set(actuales.map(clave));
  const unicos = nuevos.filter((valor) => {
    const k = clave(valor);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  return unicos.length === 0 ? actuales : [...actuales, ...unicos];
}
