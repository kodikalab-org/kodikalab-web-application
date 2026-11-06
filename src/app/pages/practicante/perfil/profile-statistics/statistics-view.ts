import { activityCalendar, CodeforcesStats } from '../../../../core/codeforces-stats-api';

export type StatisticsPlatform = 'all' | 'codeforces' | 'leetcode' | 'atcoder';
export type ActivityPeriod = 'month' | 'quarter' | 'year';

export const STATISTICS_PLATFORMS = [
  { id: 'all', name: 'Todas las plataformas' },
  { id: 'codeforces', name: 'Codeforces' },
  { id: 'leetcode', name: 'LeetCode' },
  { id: 'atcoder', name: 'AtCoder' },
] as const;

export function activityView(
  activity: CodeforcesStats['activity'],
  period: ActivityPeriod,
  today = new Date(),
) {
  const year = activityCalendar(activity, today).filter((day) => !day.padding);
  const days = period === 'year' ? year : year.slice(period === 'month' ? -30 : -90);
  const padding = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: padding }, () => ({ date: '', count: 0, padding: true })),
    ...days,
  ];
  const columns = Math.ceil(cells.length / 7);
  const months: { key: string; label: string; column: number; span: number }[] = [];
  for (let index = padding; index < cells.length; index++) {
    const key = cells[index].date.slice(0, 7);
    if (months.at(-1)?.key === key) continue;
    const column = Math.floor(index / 7) + 1;
    months.push({
      key,
      column,
      span: Math.min(3, columns - column + 1),
      label: new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
        .format(new Date(`${cells[index].date}T00:00:00Z`))
        .replace('.', ''),
    });
  }
  const activeDays = days.filter((day) => day.count > 0);
  return {
    cells,
    columns,
    months: months.filter(
      (month, i) =>
        month.span > 1 && (i !== 0 || !months[1] || months[1].column - month.column >= 3),
    ),
    start: days[0].date,
    end: days.at(-1)!.date,
    days: days.length,
    accepted: days.reduce((total, day) => total + day.count, 0),
    activeDays: activeDays.length,
    lastActive: activeDays.at(-1)?.date ?? null,
    consistency: Math.round((activeDays.length / days.length) * 100),
  };
}

export function ratingView(buckets: CodeforcesStats['solvedByRating'], problemsSolved: number) {
  const maximum = Math.max(0, ...buckets.map((bucket) => bucket.count));
  return [...buckets]
    .sort((a, b) => a.rating - b.rating)
    .map((bucket) => ({
      ...bucket,
      label: bucket.rating === 0 ? 'Sin rating' : String(bucket.rating),
      width: maximum === 0 ? 0 : (bucket.count / maximum) * 100,
      percentage: problemsSolved === 0 ? 0 : (bucket.count / problemsSolved) * 100,
      url:
        bucket.rating === 0
          ? 'https://codeforces.com/problemset'
          : `https://codeforces.com/problemset?tags=${bucket.rating}-${bucket.rating}`,
    }));
}

export function codeforcesRank(rating: number): string {
  if (rating <= 0) return 'Sin rating disponible';
  const ranks = [
    [1200, 'Newbie'],
    [1400, 'Pupil'],
    [1600, 'Specialist'],
    [1900, 'Expert'],
    [2100, 'Candidate Master'],
    [2300, 'Master'],
    [2400, 'International Master'],
    [2600, 'Grandmaster'],
    [3000, 'International Grandmaster'],
  ] as const;
  return ranks.find(([limit]) => rating < limit)?.[1] ?? 'Legendary Grandmaster';
}

export function shortDate(date: string | null): string {
  return date
    ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
      )
    : 'Sin actividad';
}

/** Coherent, explicitly labelled examples; never used for a signed-in account. */
export function exampleStatistics(today = new Date()): CodeforcesStats {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const activity = Array.from({ length: 365 }, (_, offset) => ({
    date: new Date(end - offset * 86400000).toISOString().slice(0, 10),
    count: offset < 17 ? 1 + (offset % 4) : offset % 13 < 2 ? 1 + (offset % 5) : 0,
  }))
    .filter((day) => day.count > 0)
    .reverse();
  return {
    linked: true,
    handle: 'cuenta_demo',
    problemsSolved: 569,
    maxStreakDays: 17,
    currentRating: 1984,
    acceptedSubmissions: 860,
    acceptanceRate: 65.3,
    activity,
    solvedByRating: [
      [0, 19],
      [800, 180],
      [900, 70],
      [1000, 80],
      [1100, 50],
      [1200, 60],
      [1300, 45],
      [1400, 30],
      [1500, 20],
      [1600, 10],
      [1800, 5],
    ].map(([rating, count]) => ({ rating, count })),
  };
}
