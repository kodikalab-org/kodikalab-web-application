import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CodeforcesStats } from '../../../../core/codeforces-stats-api';
import { ProfileStatistics } from './profile-statistics';

describe('ProfileStatistics', () => {
  const stats: CodeforcesStats = {
    linked: true,
    handle: 'safe_name',
    problemsSolved: 519,
    maxStreakDays: 10,
    currentRating: 1339,
    acceptedSubmissions: 552,
    acceptanceRate: 48.6,
    activity: [],
    solvedByRating: [
      { rating: 0, count: 19 },
      { rating: 800, count: 500 },
    ],
  };

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [ProfileStatistics],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProfileStatistics);
    fixture.componentRef.setInput('data', stats);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    async function select(value: string) {
      const select = root.querySelector('select')!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }
    return { fixture, root, select };
  }

  it('offers all four requested filters and explains the partial coverage', async () => {
    const { root } = await setup();
    expect(
      [...root.querySelectorAll('option')].map((option) => option.textContent?.trim()),
    ).toEqual(['Todas las plataformas', 'Codeforces', 'LeetCode', 'AtCoder']);
    expect(root.querySelector('.coverage-note')?.textContent).toContain(
      '1 de 3 fuentes disponibles',
    );
    expect(root.textContent).toContain('El rating no se suma entre plataformas');
    expect(root.querySelector('.metric-grid')?.textContent).toContain('519');
  });

  it.each([
    ['leetcode', 'LeetCode', 'https://leetcode.com/'],
    ['atcoder', 'AtCoder', 'https://atcoder.jp/'],
  ])(
    'does not relabel Codeforces data or invented zeros as %s statistics',
    async (id, name, url) => {
      const { root, select } = await setup();
      await select(id);
      expect(root.textContent).toContain(`${name} todavía no aporta estadísticas`);
      expect(root.querySelector('.metric-grid')).toBeNull();
      expect(root.textContent).not.toContain('519');
      expect(root.textContent).not.toContain('1339');
      expect(root.querySelector(`a[href="${url}"]`)).not.toBeNull();
    },
  );

  it('returns to the same Codeforces values without another API dependency', async () => {
    const { root, select, fixture } = await setup();
    await select('leetcode');
    const button = root.querySelector('button')!;
    button.click();
    await fixture.whenStable();
    expect(root.querySelector('select')!.value).toBe('codeforces');
    expect(root.querySelector('.metric-grid')?.textContent).toContain('519');
    expect(root.querySelector('.coverage-note')).toBeNull();
    expect(stats.solvedByRating[0].rating).toBe(0);
  });

  it('uses real handle-specific external links and protects the opener', async () => {
    const { root } = await setup();
    expect(root.querySelector('a[href="https://codeforces.com/profile/safe_name"]')).not.toBeNull();
    expect(
      root.querySelector('a[href="https://codeforces.com/submissions/safe_name"]'),
    ).not.toBeNull();
    for (const link of root.querySelectorAll('a[target="_blank"]')) {
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(root.textContent).toContain('Codeforces · Pupil');
    expect(root.textContent).toContain('Sin rating');
    expect(root.textContent).not.toContain('Top 12');
  });

  it('filters only the activity window, not historical solved counts or rating', async () => {
    const { fixture, root } = await setup();
    const today = new Date();
    const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    fixture.componentRef.setInput('data', {
      ...stats,
      activity: [
        { date: new Date(end).toISOString().slice(0, 10), count: 3 },
        { date: new Date(end - 40 * 86400000).toISOString().slice(0, 10), count: 8 },
      ],
    });
    await fixture.whenStable();
    expect(root.querySelector('.activity-summary strong')?.textContent?.trim()).toBe('11');
    const month = [...root.querySelectorAll('.period-filter button')].find(
      (button) => button.textContent?.trim() === '30 días',
    )!;
    (month as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(month.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.activity-summary strong')?.textContent?.trim()).toBe('3');
    expect(root.querySelector('.metric-grid')?.textContent).toContain('519');
    expect(root.querySelector('.metric-grid')?.textContent).toContain('1339');
    expect(root.querySelectorAll('.activity-cell:not(.padding)')).toHaveLength(30);
  });

  it('preserves loading and retry without replacing real data with demo values', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(root.querySelector('.stats-skeleton')).not.toBeNull();
    expect(root.querySelector('.metric-grid')).toBeNull();
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('failed', true);
    await fixture.whenStable();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    root.querySelector<HTMLButtonElement>('.error-state button')!.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(root.textContent).not.toContain('569');
  });

  it('keeps an unsupported source independent of a Codeforces loading state', async () => {
    const { fixture, root, select } = await setup();
    fixture.componentRef.setInput('loading', true);
    await select('atcoder');
    expect(root.querySelector('.pending-platform')).not.toBeNull();
    expect(root.querySelector('.stats-panel')?.getAttribute('aria-busy')).toBe('false');
    expect(root.querySelector('.stats-skeleton')).toBeNull();
  });

  it('labels synthetic data and never points the demo to a fabricated user profile', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('demo', true);
    await fixture.whenStable();
    expect(root.querySelector('.demo-notice')?.textContent).toContain('Datos de ejemplo');
    expect(root.querySelector('.metric-grid')?.textContent).toContain('569');
    expect(root.querySelector('a[href*="/profile/"]')).toBeNull();
    expect(root.querySelector('a[href*="/submissions/"]')).toBeNull();
  });
});
