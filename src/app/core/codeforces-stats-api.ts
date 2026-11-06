import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api';

export interface CodeforcesStats {
  linked: boolean;
  handle: string | null;
  problemsSolved: number;
  maxStreakDays: number;
  currentRating: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  activity: { date: string; count: number }[];
  solvedByRating: { rating: number; count: number }[];
}

/** Only the backend contacts Codeforces; the browser uses the authenticated API. */
@Injectable({ providedIn: 'root' })
export class CodeforcesStatsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  load() {
    return this.http.get<CodeforcesStats>(`${this.url}/users/me/codeforces/stats`, { timeout: 30000 });
  }
}

/** Fill missing UTC dates and align the first calendar column to Monday. */
export function activityCalendar(activity: CodeforcesStats['activity'], today = new Date()) {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startDate = new Date(end);
  startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
  startDate.setUTCDate(startDate.getUTCDate() + 1);
  const start = startDate.getTime();
  const counts = new Map(activity.map(day => [day.date, day.count]));
  const cells: { date: string; count: number; padding: boolean }[] = [];
  for (let i = 0; i < (startDate.getUTCDay() + 6) % 7; i++) cells.push({ date: '', count: 0, padding: true });
  for (let date = start; date <= end; date += 86400000) {
    const key = new Date(date).toISOString().slice(0, 10);
    cells.push({ date: key, count: counts.get(key) ?? 0, padding: false });
  }
  return cells;
}
