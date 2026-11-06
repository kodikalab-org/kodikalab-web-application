import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CodeforcesStatsApi, activityCalendar } from './codeforces-stats-api';

describe('CodeforcesStatsApi', () => {
  it('requests stats from the backend without contacting the public provider', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(CodeforcesStatsApi).load().subscribe();
    const request = http.expectOne('http://localhost:8080/api/users/me/codeforces/stats');
    expect(request.request.method).toBe('GET');
    request.flush({ linked: false });
    http.verify();
  });

  it('fills missing UTC days and preserves actual counts without demo data', () => {
    const calendar = activityCalendar([{ date: '2026-11-06', count: 8 }], new Date('2026-11-06T23:00:00Z'));
    const days = calendar.filter(day => !day.padding);
    expect(days).toHaveLength(365);
    expect(days[0].date).toBe('2025-11-07');
    expect(days.at(-1)).toEqual({ date: '2026-11-06', count: 8, padding: false });
    expect(days.filter(day => day.count > 0)).toHaveLength(1);
    expect(calendar.findIndex(day => !day.padding)).toBe(4);
  });
});
