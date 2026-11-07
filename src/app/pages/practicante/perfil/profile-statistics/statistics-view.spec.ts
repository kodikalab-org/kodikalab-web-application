import {
  activityView,
  codeforcesRank,
  exampleStatistics,
  ratingView,
  shortDate,
} from './statistics-view';

describe('Statistics view models', () => {
  const today = new Date('2026-11-06T12:00:00Z');

  it('filters accepted activity to an inclusive 30-day UTC window', () => {
    const view = activityView(
      [
        { date: '2026-10-07', count: 99 },
        { date: '2026-10-08', count: 2 },
        { date: '2026-11-06', count: 3 },
        { date: '2026-11-07', count: 100 },
      ],
      'month',
      today,
    );
    expect(view.start).toBe('2026-10-08');
    expect(view.end).toBe('2026-11-06');
    expect(view.days).toBe(30);
    expect(view.accepted).toBe(5);
    expect(view.activeDays).toBe(2);
    expect(view.lastActive).toBe('2026-11-06');
    expect(view.consistency).toBe(7);
    expect(view.cells.slice(0, 3).every((day) => day.padding)).toBe(true);
    expect(view.columns).toBe(Math.ceil(view.cells.length / 7));
  });

  it('uses UTC rather than the local date for a 90-day window', () => {
    const view = activityView([], 'quarter', new Date('2026-11-06T23:50:00-05:00'));
    expect(view.end).toBe('2026-11-07');
    expect(view.days).toBe(90);
  });

  it('preserves the backend calendar-year semantics on leap day', () => {
    const view = activityView([], 'year', new Date('2028-02-29T00:01:00Z'));
    expect(view.start).toBe('2027-03-01');
    expect(view.end).toBe('2028-02-29');
    expect(view.days).toBe(366);
    expect(view.cells.filter((day) => !day.padding)).toHaveLength(366);
  });

  it('does not imply recent activity when all submissions are outside the selected window', () => {
    const view = activityView([{ date: '2026-01-01', count: 20 }], 'month', today);
    expect(view.accepted).toBe(0);
    expect(view.activeDays).toBe(0);
    expect(view.lastActive).toBeNull();
    expect(view.consistency).toBe(0);
    expect(shortDate(view.lastActive)).toBe('Sin actividad');
  });

  it('sorts exact ratings without mutating or treating unrated problems as rating zero difficulty', () => {
    const input = [
      { rating: 1350, count: 3 },
      { rating: 0, count: 2 },
      { rating: 800, count: 5 },
    ];
    const view = ratingView(input, 10);
    expect(input[0].rating).toBe(1350);
    expect(view.map((bucket) => bucket.rating)).toEqual([0, 800, 1350]);
    expect(view[0].label).toBe('Sin rating');
    expect(view[0].url).toBe('https://codeforces.com/problemset');
    expect(view[1].percentage).toBe(50);
    expect(view[1].width).toBe(100);
    expect(view[2].url).toBe('https://codeforces.com/problemset?tags=1350-1350');
  });

  it('does not divide by zero for empty rating data', () => {
    expect(ratingView([], 0)).toEqual([]);
    expect(ratingView([{ rating: 800, count: 0 }], 0)[0]).toMatchObject({
      percentage: 0,
      width: 0,
    });
  });

  it.each([
    [0, 'Sin rating disponible'],
    [1199, 'Newbie'],
    [1200, 'Pupil'],
    [1399, 'Pupil'],
    [1400, 'Specialist'],
    [1600, 'Expert'],
    [1900, 'Candidate Master'],
    [2100, 'Master'],
    [2300, 'International Master'],
    [2400, 'Grandmaster'],
    [2600, 'International Grandmaster'],
    [3000, 'Legendary Grandmaster'],
  ])('derives the Codeforces rank for %s', (rating, rank) => {
    expect(codeforcesRank(rating as number)).toBe(rank);
  });

  it('keeps explicitly synthetic demo totals internally consistent', () => {
    const demo = exampleStatistics(today);
    expect(demo.handle).toBe('cuenta_demo');
    expect(demo.acceptedSubmissions).toBeGreaterThanOrEqual(demo.problemsSolved);
    expect(demo.solvedByRating.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      demo.problemsSolved,
    );
    expect(activityView(demo.activity, 'year', today).accepted).toBeLessThanOrEqual(
      demo.acceptedSubmissions,
    );
    let previous = '',
      streak = 0,
      longest = 0;
    for (const day of demo.activity) {
      streak =
        previous && Date.parse(day.date) - Date.parse(previous) === 86400000 ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      previous = day.date;
    }
    expect(longest).toBe(demo.maxStreakDays);
  });
});
