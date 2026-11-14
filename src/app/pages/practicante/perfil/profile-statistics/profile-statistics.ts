import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeforcesStats } from '../../../../core/codeforces-stats-api';
import { StatisticsPlatform, STATISTICS_PLATFORMS } from './statistics-view';
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
  readonly retry = output<void>();
  protected readonly platform = signal<StatisticsPlatform>('all');
  protected readonly platforms = STATISTICS_PLATFORMS;
  protected readonly stats = computed(() => this.data());
  protected readonly supported = computed(
    () => this.platform() === 'all' || this.platform() === 'codeforces',
  );
  protected readonly profileUrl = computed(
    () => `https://codeforces.com/profile/${encodeURIComponent(this.stats()?.handle ?? '')}`,
  );
  protected readonly submissionsUrl = computed(
    () => `https://codeforces.com/submissions/${encodeURIComponent(this.stats()?.handle ?? '')}`,
  );
  protected readonly pendingName = computed(() => 'AtCoder');
  protected readonly pendingUrl = computed(() => 'https://atcoder.jp/');

  protected selectPlatform(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (this.platforms.some((platform) => platform.id === value))
      this.platform.set(value as StatisticsPlatform);
  }
}
