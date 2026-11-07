import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeforcesStats } from '../../../../core/codeforces-stats-api';
import { StatisticsPlatform, STATISTICS_PLATFORMS, exampleStatistics } from './statistics-view';
import { StatisticsCharts } from './statistics-charts';
import { StatisticsMetrics } from './statistics-metrics';

@Component({
  selector: 'app-profile-statistics',
  imports: [RouterLink, StatisticsCharts, StatisticsMetrics],
  templateUrl: './profile-statistics.html',
  styleUrl: './profile-statistics.css',
})
export class ProfileStatistics {
  readonly data = input<CodeforcesStats | null>(null);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly demo = input(false);
  readonly retry = output<void>();
  protected readonly platform = signal<StatisticsPlatform>('all');
  protected readonly platforms = STATISTICS_PLATFORMS;
  private readonly example = exampleStatistics();
  protected readonly stats = computed(() => (this.demo() ? this.example : this.data()));
  protected readonly supported = computed(
    () => this.platform() === 'all' || this.platform() === 'codeforces',
  );
  protected readonly profileUrl = computed(() =>
    this.demo()
      ? 'https://codeforces.com/'
      : `https://codeforces.com/profile/${encodeURIComponent(this.stats()?.handle ?? '')}`,
  );
  protected readonly submissionsUrl = computed(() =>
    this.demo()
      ? 'https://codeforces.com/problemset'
      : `https://codeforces.com/submissions/${encodeURIComponent(this.stats()?.handle ?? '')}`,
  );
  protected readonly pendingName = computed(() =>
    this.platform() === 'atcoder' ? 'AtCoder' : 'LeetCode',
  );
  protected readonly pendingUrl = computed(() =>
    this.platform() === 'atcoder' ? 'https://atcoder.jp/' : 'https://leetcode.com/',
  );

  protected selectPlatform(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (this.platforms.some((platform) => platform.id === value))
      this.platform.set(value as StatisticsPlatform);
  }
}
