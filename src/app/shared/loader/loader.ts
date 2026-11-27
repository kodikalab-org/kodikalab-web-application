import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Loading state of a component: an announced label over shimmering placeholder rows. */
@Component({
  selector: 'app-loader',
  host: { role: 'status', class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="flex items-center gap-2.5 text-sm text-kl-muted">
      <span class="kl-spinner" aria-hidden="true"></span>{{ label() }}
    </span>
    <span class="mt-3 flex flex-col gap-2.5" aria-hidden="true">
      @for (row of placeholders(); track row) {
        <span class="kl-skeleton block h-14"></span>
      }
    </span>`,
})
export class Loader {
  readonly label = input.required<string>();
  readonly rows = input(2);
  protected readonly placeholders = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
}
