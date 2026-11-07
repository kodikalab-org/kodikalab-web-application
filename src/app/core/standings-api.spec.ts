import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { Standings, StandingsApi } from './standings-api';

describe('StandingsApi', () => {
  let api: StandingsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(StandingsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reads the contest standings with GET /competitions/{id}/standings', async () => {
    const body: Standings = {
      competitionId: 10,
      teamId: 1,
      eventName: 'Contest A',
      status: 'EN_CURSO',
      penaltyRule: 'ICPC_20_MIN',
      startsAt: '2026-11-06T10:00:00Z',
      endsAt: '2026-11-06T12:00:00Z',
      problems: [{ competitionProblemId: 101, letter: 'A', title: 'Watermelon', score: null }],
      rows: [
        {
          position: 1,
          userId: 7,
          fullName: 'Ana Perez',
          solved: 1,
          score: 0,
          penaltyMinutes: 25,
          cells: [
            { competitionProblemId: 101, letter: 'A', result: 'RESUELTO', attempts: 1, minutes: 25 },
          ],
        },
      ],
    };
    const result = firstValueFrom(api.get(10));
    const request = http.expectOne('/api/competitions/10/standings');
    expect(request.request.method).toBe('GET');
    request.flush(body);
    expect(await result).toEqual(body);
  });
});
