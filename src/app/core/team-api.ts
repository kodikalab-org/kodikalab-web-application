import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './api';
import { TeamsApi } from './teams-api';
export interface TeamCompetition {
  competitionId: number;
  teamId: number;
  eventName: string;
  status: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
  startsAt: string;
  endsAt: string;
  problemsCount: number;
}
/** `GET /competitions?teamId=`: `CompetitionListResponse` with its `CompetitionListItem` entries. */
interface CompetitionListResponse {
  teamId: number;
  total: number;
  items: {
    id: number;
    eventName: string;
    status: TeamCompetition['status'];
    startsAt: string;
    endsAt: string;
    problemsCount: number;
  }[];
}
export interface AssignedProblem {
  competitionProblemId: number;
  competitionId: number;
  teamId: number;
  problemId: number;
  title: string;
  eventName: string;
  letter: string;
  status: TeamCompetition['status'];
}
export interface Standing {
  membershipId: number;
  userId: number;
  fullName: string;
  acceptedProblems: number;
  position: number;
}
export interface Ranking {
  teamId: number;
  status: 'CALCULATED' | 'NO_ACTIVITY';
  orderingCriterion: string;
  tieCriterion: string;
  members: Standing[];
}
export interface LastRanking {
  calculatedAt: string;
  ranking: Ranking;
}
export interface TopicPerformance {
  topicId: number;
  topicName: string;
  assignedProblems: number;
  solvedProblems: number;
  unsolvedProblems: number;
  solvingMembers: number;
  pendingResolutions: number;
  coveragePercentage: number;
  lowestCoverage: boolean;
}
export interface TopicReport {
  teamId: number;
  metric: string;
  comparisonCriterion: string;
  comparisonExplanation: string;
  activeMembers: number;
  pendingResolutions: number;
  topics: TopicPerformance[];
}
export interface OfficialRequest {
  finalPosition: number | null;
  solvedProblems: number | null;
  confirm: boolean;
}
export interface OfficialResult {
  id: number;
  competitionId: number;
  teamId: number;
  eventName: string;
  competitionEndsAt: string;
  finalPosition: number | null;
  solvedProblems: number | null;
  status: 'PENDIENTE' | 'CONFIRMADO';
  registeredAt: string;
  confirmedAt: string | null;
}
export interface Progress {
  teamId: number;
  membershipId: number;
  userId: number;
  acceptedProblems: number;
}
export interface Resolution {
  resolutionId: number;
  membershipId: number;
  membershipTeamId: number;
  competitionProblemId: number;
  competitionId: number;
  competitionTeamId: number;
  problemId: number;
  verdict: string;
}
export interface Registration {
  resolution: Resolution;
  registrationMethod: string;
  progress: Progress;
}
export interface ManualRequest {
  language: string;
  evidenceUrl: string | null;
}
@Injectable({ providedIn: 'root' })
export class TeamApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly teams = inject(TeamsApi);
  /** Competitions of one team from `GET /competitions?teamId=`, flattened to `TeamCompetition`. */
  competitions(teamId: number) {
    return this.http
      .get<CompetitionListResponse>(`${this.url}/competitions`, {
        params: new HttpParams().set('teamId', teamId),
        timeout: 15000,
      })
      .pipe(
        map(({ teamId: team, items }) =>
          items.map(
            (item): TeamCompetition => ({
              competitionId: item.id,
              teamId: team,
              eventName: item.eventName,
              status: item.status,
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              problemsCount: item.problemsCount,
            }),
          ),
        ),
      );
  }
  /**
   * Problems assigned to one team from `GET /problems/assigned?teamId=` (shared with the groups
   * pages), flattened to `AssignedProblem`. `competitionProblemId` is the identifier that
   * `register` needs.
   */
  assignments(teamId: number) {
    return this.teams.assignedProblems(teamId).pipe(
      map(({ teamId: team, items }) =>
        items.map(
          (item): AssignedProblem => ({
            competitionProblemId: item.competitionProblemId,
            competitionId: item.competition.id,
            teamId: team,
            problemId: item.problem.id,
            title: item.problem.title,
            eventName: item.competition.name,
            letter: item.letter,
            status: item.competition.status,
          }),
        ),
      ),
    );
  }
  ranking(id: number) {
    return this.http.get<Ranking>(this.url + '/analytics/teams/' + id + '/standings', {
      timeout: 15000,
    });
  }
  topics(id: number) {
    return this.http.get<TopicReport>(this.url + '/analytics/teams/' + id + '/weaknesses', {
      timeout: 15000,
    });
  }
  result(id: number) {
    return this.http.get<OfficialResult>(this.resultUrl(id), { timeout: 15000 });
  }
  create(id: number, body: OfficialRequest) {
    return this.http.post<OfficialResult>(this.resultUrl(id), body, { timeout: 15000 });
  }
  update(id: number, body: OfficialRequest) {
    return this.http.put<OfficialResult>(this.resultUrl(id), body, { timeout: 15000 });
  }
  history(id: number) {
    return this.http.get<OfficialResult[]>(
      this.url + '/competitions/teams/' + id + '/official-results',
      { timeout: 15000 },
    );
  }
  progress(id: number) {
    return this.http.get<Progress>(this.url + '/analytics/teams/' + id + '/progress/me', {
      timeout: 15000,
    });
  }
  register(team: number, assignment: number, body: ManualRequest) {
    return this.http.post<Registration>(
      this.url + '/competitions/teams/' + team + '/problems/' + assignment + '/resolutions',
      body,
      { timeout: 15000 },
    );
  }
  private resultUrl(id: number) {
    return this.url + '/competitions/' + id + '/official-result';
  }
}
export function positiveId(value: string | number | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
