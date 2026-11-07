import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  CodeforcesProblemsApi,
  codeforcesCodeFrom,
  codeforcesImportError,
} from '../../core/codeforces-problems-api';
import type { CatalogProblem } from '../../core/problems-api';

/**
 * "Código de Codeforces" quick-add: takes a code (`1850A`) or a problem URL, asks the backend to import
 * it into the catalog and emits the catalog problem. What to do with it (add to a contest, to a
 * selection) is up to the parent. The form around it is never submitted: Enter only adds the code.
 */
@Component({
  selector: 'app-codeforces-code-add',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-start gap-3">
      <mat-form-field
        appearance="outline"
        subscriptSizing="dynamic"
        class="auth-field min-w-[220px] flex-1"
      >
        <mat-label>Código de Codeforces</mat-label>
        <input
          matInput
          aria-label="Código de Codeforces"
          placeholder="1850A o la URL del problema"
          autocomplete="off"
          [value]="text()"
          (input)="onInput($event)"
          (keydown.enter)="$event.preventDefault(); add()"
        />
      </mat-form-field>
      <button
        mat-flat-button
        type="button"
        class="h-[46px]"
        aria-label="Agregar por código"
        [disabled]="busy()"
        (click)="add()"
      >
        {{ busy() ? 'Agregando…' : 'Agregar' }}
      </button>
    </div>
    @if (error(); as message) {
      <p role="alert" class="mt-2 mb-0 text-sm text-red-300">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      --auth-field-height: 46px;
      --auth-field-padding: 11px;
      --auth-input-color: var(--kl-text-heading);
      --auth-focus-color: var(--kl-accent-link);
      --mat-button-filled-container-height: 46px;
      --mat-button-filled-container-shape: 12px;
    }
  `,
})
export class CodeforcesCodeAdd {
  private readonly api = inject(CodeforcesProblemsApi);

  /** The problem the backend returned, whether it was just created or already in the catalog. */
  readonly imported = output<CatalogProblem>();

  protected readonly text = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected onInput(event: Event) {
    this.text.set((event.target as HTMLInputElement).value);
    this.error.set('');
  }

  protected add() {
    if (this.busy()) return;
    const code = codeforcesCodeFrom(this.text());
    if (code === null) {
      this.error.set(
        'Escribe un código válido de Codeforces, por ejemplo 1850A, o pega la URL del problema.',
      );
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.api.importByCode(code).subscribe({
      next: ({ problem }) => {
        this.busy.set(false);
        this.text.set('');
        this.imported.emit(problem);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(codeforcesImportError(e));
      },
    });
  }
}
