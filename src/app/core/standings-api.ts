import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api';

export type StandingResult = 'RESUELTO' | 'PENDIENTE' | 'EN_PROGRESO' | 'SIN_INTENTOS';
export type PenaltyRule = 'ICPC_20_MIN' | 'IOI_POINTS' | string;

export interface StandingsProblem {
  competitionProblemId: number;
  letter: string;
  title: string;
  score: number | null;
}

export interface StandingsCell {
  competitionProblemId: number;
  letter: string;
  result: StandingResult;
  /** Submissions the participant registered for this problem. */
  attempts: number;
  /** Minutes from the contest start to the accepted submission, when solved. */
  minutes: number | null;
}

export interface StandingsRow {
  position: number;
  userId: number;
  fullName: string;
  solved: number;
  score: number;
  penaltyMinutes: number;
  cells: StandingsCell[];
}

/** `GET /competitions/{competitionId}/standings`: Codeforces-style standings of one contest. */
export interface Standings {
  competitionId: number;
  teamId: number;
  eventName: string;
  status: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
  penaltyRule: PenaltyRule;
  startsAt: string | null;
  endsAt: string | null;
  problems: StandingsProblem[];
  rows: StandingsRow[];
}

@Injectable({ providedIn: 'root' })
export class StandingsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  get(competitionId: number) {
    return this.http.get<Standings>(`${this.url}/competitions/${competitionId}/standings`, {
      timeout: 15000,
    });
  }
}
