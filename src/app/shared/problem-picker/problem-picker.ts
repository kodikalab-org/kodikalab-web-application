import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EMPTY, Observable, Subject, catchError, debounceTime, map, switchMap, tap } from 'rxjs';
import {
  CodeforcesProblemsApi,
  SEARCH_LIMIT,
  codeforcesImportError,
} from '../../core/codeforces-problems-api';
import { CatalogProblem, ProblemsApi, problemsError } from '../../core/problems-api';
import { CodeforcesCodeAdd } from './codeforces-code-add';
import {
  ICPC_SCORE,
  MAX_PICKED,
  PALETTE,
  PickedProblem,
  letterFor,
  moveRow,
  problemFromHit,
  relabel,
} from './picked-problems';

type Source = 'codeforces' | 'catalogo';

/** A search result of either source, in one shape. `problem` is null until a Codeforces hit is imported. */
interface SearchHit {
  key: string;
  code: string;
  title: string;
  difficulty: string;
  topics: string[];
  url: string | null;
  problem: CatalogProblem | null;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

/**
 * vjudge-like "add problem" table for a contest: add by Codeforces code, search Codeforces or the
 * KodikaLab catalog, then set the letter order, points and balloon color of the chosen problems.
 *
 * The selection is a two-way `model`: bind it with `[(rows)]="signal"` and read the rows (or turn them
 * into a `POST /problems/assign` body with `toAssignItems`). A `model` was chosen over a
 * `ControlValueAccessor` because the value is only read on submit and has no validation of its own.
 * Nothing in it submits the surrounding form.
 */
@Component({
  selector: 'app-problem-picker',
  imports: [CodeforcesCodeAdd, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './problem-picker.html',
  styleUrl: './problem-picker.css',
  host: { class: 'block' },
})
export class ProblemPicker {
  private readonly codeforces = inject(CodeforcesProblemsApi);
  private readonly catalog = inject(ProblemsApi);

  /** Chosen problems, letters always in position order. */
  readonly rows = model<PickedProblem[]>([]);
  /** Points of a newly added problem (1 for ICPC contests, 100 for IOI ones). */
  readonly defaultScore = input(ICPC_SCORE);

  protected readonly maximum = MAX_PICKED;
  protected readonly source = signal<Source>('codeforces');
  protected readonly query = signal('');
  protected readonly hits = signal<SearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal('');
  /** True once a search ran, so an empty list can say "no results". */
  protected readonly searched = signal(false);
  protected readonly importing = signal<ReadonlySet<string>>(new Set());
  /** Why the last add did not happen (duplicate, limit, failed import). */
  protected readonly notice = signal('');

  private readonly trigger = new Subject<{ term: string; source: Source }>();
  private lastDefaultScore = ICPC_SCORE;

  constructor() {
    this.trigger
      .pipe(
        debounceTime(DEBOUNCE_MS),
        switchMap(({ term, source }) => {
          this.searchError.set('');
          if (term.length < MIN_QUERY) {
            this.hits.set([]);
            this.searched.set(false);
            this.searching.set(false);
            return EMPTY;
          }
          this.searching.set(true);
          return this.load(term, source).pipe(
            tap((hits) => {
              this.hits.set(hits);
              this.searched.set(true);
              this.searching.set(false);
            }),
            catchError((error: unknown) => {
              this.hits.set([]);
              this.searched.set(false);
              this.searching.set(false);
              this.searchError.set(
                source === 'codeforces' ? codeforcesImportError(error) : problemsError(error),
              );
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    // Rows still on the previous default follow it (the coach switched ICPC and IOI); edited ones stay.
    effect(() => {
      const next = this.defaultScore();
      untracked(() => {
        const previous = this.lastDefaultScore;
        this.lastDefaultScore = next;
        if (previous !== next)
          this.rows.update((rows) =>
            rows.map((row) => (row.score === previous ? { ...row, score: next } : row)),
          );
      });
    });
  }

  protected setSource(source: Source) {
    if (this.source() === source) return;
    this.source.set(source);
    this.hits.set([]);
    this.searched.set(false);
    this.trigger.next({ term: this.query().trim(), source });
  }

  protected onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.trigger.next({ term: value.trim(), source: this.source() });
  }

  /** Enter inside a field of the picker must not submit the contest form around it. */
  protected stopEnter(event: Event) {
    if ((event.target as HTMLElement).tagName === 'INPUT') event.preventDefault();
  }

  /** Adds a catalog problem as the last row. Returns false (and explains why) for a duplicate or the limit. */
  add(problem: CatalogProblem): boolean {
    const rows = this.rows();
    if (rows.some((row) => row.problem.id === problem.id)) {
      this.notice.set('Ese problema ya está en la lista.');
      return false;
    }
    if (rows.length >= MAX_PICKED) {
      this.notice.set(`Máximo ${MAX_PICKED} problemas por ahora.`);
      return false;
    }
    this.notice.set('');
    this.rows.set([
      ...rows,
      {
        problem,
        letter: letterFor(rows.length),
        score: this.defaultScore(),
        balloonColor: PALETTE[rows.length % PALETTE.length],
      },
    ]);
    return true;
  }

  protected isPicked(hit: SearchHit): boolean {
    return hit.problem !== null && this.rows().some((row) => row.problem.id === hit.problem!.id);
  }

  /** Adds a result: a catalog problem right away, a Codeforces one after importing it. */
  protected addHit(hit: SearchHit) {
    if (hit.problem) {
      this.add(hit.problem);
      return;
    }
    if (this.importing().has(hit.key)) return;
    this.notice.set('');
    this.importing.update((keys) => new Set(keys).add(hit.key));
    this.codeforces.importByCode(hit.code).subscribe({
      next: ({ problem }) => {
        this.stopImporting(hit.key);
        this.add(problem);
      },
      error: (error: unknown) => {
        this.stopImporting(hit.key);
        this.notice.set(codeforcesImportError(error));
      },
    });
  }

  protected move(index: number, step: -1 | 1) {
    this.rows.update((rows) => moveRow(rows, index, step));
  }

  protected remove(index: number) {
    this.rows.update((rows) => relabel(rows.filter((_, i) => i !== index)));
  }

  protected setScore(index: number, event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 0) return;
    this.patch(index, { score: Math.trunc(value) });
  }

  protected setColor(index: number, event: Event) {
    this.patch(index, { balloonColor: (event.target as HTMLInputElement).value });
  }

  private patch(index: number, change: Partial<PickedProblem>) {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  private stopImporting(key: string) {
    this.importing.update((keys) => {
      const next = new Set(keys);
      next.delete(key);
      return next;
    });
  }

  private load(term: string, source: Source): Observable<SearchHit[]> {
    if (source === 'catalogo')
      return this.catalog.catalog({ q: term, size: SEARCH_LIMIT }).pipe(
        map((page) =>
          page.items.map((problem) => ({
            key: `p:${problem.id}`,
            code: problem.sourceCode ?? `#${problem.id}`,
            title: problem.title,
            difficulty: problem.difficultyRating ?? '—',
            topics: problem.topics.map((topic) => topic.name),
            url: problem.url,
            problem,
          })),
        ),
      );
    return this.codeforces.search(term).pipe(
      map((results) =>
        results.map((hit) => ({
          key: `cf:${hit.code}`,
          code: hit.code,
          title: hit.title,
          difficulty: hit.difficultyRating === null ? '—' : String(hit.difficultyRating),
          topics: hit.topics,
          url: hit.url,
          problem:
            hit.problemId === null ? null : problemFromHit({ ...hit, problemId: hit.problemId }),
        })),
      ),
    );
  }
}
