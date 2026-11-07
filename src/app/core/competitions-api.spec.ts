import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import {
  CompetitionsApi,
  CreateCompetitionRequest,
  nextStatus,
  splitCompetitions,
} from './competitions-api';

describe('CompetitionsApi', () => {
  let api: CompetitionsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(CompetitionsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('creates a competition with POST /competitions and the exact request body', async () => {
    const body: CreateCompetitionRequest = {
      teamId: 7,
      eventName: 'Maratón interna',
      description: null,
      accessType: 'PRIVADO_PASS',
      accessKey: 'clave-segura',
      penaltyRule: 'IOI_POINTS',
      scoreboardFreezeMinutes: 30,
      startsAt: '2026-11-20T14:00:00-05:00',
      endsAt: '2026-11-20T16:00:00-05:00',
    };
    const created = firstValueFrom(api.create(body));
    const request = http.expectOne('/api/competitions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 5, teamId: 7, eventName: 'Maratón interna', status: 'PROGRAMADA' });
    expect((await created).id).toBe(5);
  });

  it('changes the status with PATCH /competitions/{id}/status and a status-only body', async () => {
    const changed = firstValueFrom(api.changeStatus(41, 'EN_CURSO'));
    const request = http.expectOne('/api/competitions/41/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'EN_CURSO' });
    request.flush({ id: 41, status: 'EN_CURSO' });
    expect((await changed).status).toBe('EN_CURSO');
  });
});

describe('nextStatus', () => {
  it('only advances one step at a time, like the backend lifecycle', () => {
    expect(nextStatus('PROGRAMADA')).toBe('EN_CURSO');
    expect(nextStatus('EN_CURSO')).toBe('FINALIZADA');
    expect(nextStatus('FINALIZADA')).toBeNull();
  });
});

describe('splitCompetitions', () => {
  type Status = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
  const item = (id: number, status: Status, startsAt: string) => ({ id, status, startsAt });

  it('puts running and scheduled contests first, running before scheduled', () => {
    const { current } = splitCompetitions([
      item(1, 'PROGRAMADA', '2026-12-01T10:00:00Z'),
      item(2, 'EN_CURSO', '2026-11-05T10:00:00Z'),
      item(3, 'PROGRAMADA', '2026-11-10T10:00:00Z'),
    ]);
    expect(current.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('puts finished contests in the past list, newest first', () => {
    const { current, past } = splitCompetitions([
      item(1, 'FINALIZADA', '2026-09-01T10:00:00Z'),
      item(2, 'FINALIZADA', '2026-10-01T10:00:00Z'),
      item(3, 'PROGRAMADA', '2026-12-01T10:00:00Z'),
    ]);
    expect(past.map((c) => c.id)).toEqual([2, 1]);
    expect(current.map((c) => c.id)).toEqual([3]);
  });
});
