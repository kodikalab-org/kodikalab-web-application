import { Component, computed, input } from '@angular/core';
import { CodeforcesStats } from '../../../../core/codeforces-stats-api';
import { codeforcesRank } from './statistics-view';

@Component({
  selector: 'app-statistics-metrics',
  templateUrl: './statistics-metrics.html',
  styleUrl: './statistics-metrics.css',
})
export class StatisticsMetrics {
  readonly data = input.required<CodeforcesStats>();
  protected readonly rank = computed(() => codeforcesRank(this.data().currentRating));
}
