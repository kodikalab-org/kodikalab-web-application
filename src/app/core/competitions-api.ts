import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api';

export type CompetitionStatus = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
export type PenaltyRule = 'ICPC_20_MIN' | 'IOI_POINTS';
export type CompetitionAccessType = 'PUBLICO_GRUPO' | 'PRIVADO_PASS';

/** `POST /competitions`: `CreateCompetitionRequest`. Dates are ISO-8601 with an offset. */
export interface CreateCompetitionRequest {
  teamId: number;
  eventName: string;
  description: string | null;
  accessType: CompetitionAccessType;
  /** Required for `PRIVADO_PASS`, rejected for `PUBLICO_GRUPO`. */
  accessKey: string | null;
  penaltyRule: PenaltyRule;
  /** Null lets the backend pick its default. */
  scoreboardFreezeMinutes: number | null;
  startsAt: string;
  endsAt: string;
}

/** `CompetitionResponse`: never includes the access key. */
export interface CompetitionResponse {
  id: number;
  teamId: number;
  eventName: string;
  description: string | null;
  accessType: CompetitionAccessType;
  penaltyRule: PenaltyRule;
  durationMinutes: number;
  scoreboardFreezeMinutes: number;
  status: CompetitionStatus;
  startsAt: string;
  endsAt: string;
}

/** The lifecycle only advances one step: PROGRAMADA, EN_CURSO, FINALIZADA (mirrors `CompetitionStatus.canAdvanceTo`). */
export function nextStatus(status: CompetitionStatus): CompetitionStatus | null {
  if (status === 'PROGRAMADA') return 'EN_CURSO';
  if (status === 'EN_CURSO') return 'FINALIZADA';
  return null;
}

/**
 * Splits a team's contests into "current and upcoming" (running first, then scheduled by start,
 * soonest first) and "past" (finished, newest first).
 */
export function splitCompetitions<T extends { status: CompetitionStatus; startsAt: string }>(
  items: readonly T[],
): { current: T[]; past: T[] } {
  const time = (item: T) => Date.parse(item.startsAt);
  const current = items
    .filter((item) => item.status !== 'FINALIZADA')
    .sort(
      (a, b) =>
        Number(b.status === 'EN_CURSO') - Number(a.status === 'EN_CURSO') || time(a) - time(b),
    );
  const past = items
    .filter((item) => item.status === 'FINALIZADA')
    .sort((a, b) => time(b) - time(a));
  return { current, past };
}

/** Coach contest management. Listing a team's contests lives in `TeamApi.competitions`. */
@Injectable({ providedIn: 'root' })
export class CompetitionsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  create(body: CreateCompetitionRequest) {
    return this.http.post<CompetitionResponse>(`${this.url}/competitions`, body, {
      timeout: 15000,
    });
  }

  changeStatus(competitionId: number, status: CompetitionStatus) {
    return this.http.patch<CompetitionResponse>(
      `${this.url}/competitions/${competitionId}/status`,
      { status },
      { timeout: 15000 },
    );
  }
}
