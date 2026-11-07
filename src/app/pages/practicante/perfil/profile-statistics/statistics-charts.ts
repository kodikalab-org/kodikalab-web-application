import { Component, computed, input, signal } from '@angular/core';
import { CodeforcesStats } from '../../../../core/codeforces-stats-api';
import { ActivityPeriod, activityView, ratingView, shortDate } from './statistics-view';

@Component({
  selector: 'app-statistics-charts',
  templateUrl: './statistics-charts.html',
  styleUrl: './statistics-charts.css',
})
export class StatisticsCharts {
  readonly data = input.required<CodeforcesStats>();
  protected readonly period = signal<ActivityPeriod>('year');
  protected readonly periods = [
    { id: 'month', label: '30 días' },
    { id: 'quarter', label: '90 días' },
    { id: 'year', label: 'Último año' },
  ] as const;
  protected readonly activity = computed(() => activityView(this.data().activity, this.period()));
  protected readonly buckets = computed(() =>
    ratingView(this.data().solvedByRating, this.data().problemsSolved),
  );
  protected readonly hardest = computed(() =>
    Math.max(
      0,
      ...this.data()
        .solvedByRating.filter((bucket) => bucket.count > 0)
        .map((bucket) => bucket.rating),
    ),
  );
  protected readonly shortDate = shortDate;
}
