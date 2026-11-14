import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { Session } from './session';
import { TeamsApi } from './teams-api';

describe('Teams API session boundaries', () => {
  let session: Session;
  let teams: TeamsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(Session);
    session.logout();
    teams = TestBed.inject(TeamsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); session.logout(); });

  it('preserves the live teams contract', async () => {
    const base = TestBed.inject(API_URL);
    const loaded = firstValueFrom(teams.loadGroups());
    const get = http.expectOne(`${base}/teams`);
    expect(get.request.method).toBe('GET');
    get.flush([]);
    await loaded;
    const body = { name: 'Grupo real', draft: true };
    const created = firstValueFrom(teams.create(body));
    const post = http.expectOne(`${base}/teams`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(body);
    post.flush({ groupId: 9, name: body.name, status: 'BORRADOR', invitationCode: 'EXAMPLE12345', message: 'OK' });
    expect((await created).groupId).toBe(9);
    expect(teams.lastCreated()?.groupId).toBe(9);
  });

  it('joins by code with a JSON body and no query parameter', async () => {
    const base = TestBed.inject(API_URL);
    const joined = firstValueFrom(teams.joinByCode(' a1b2c3d4e5f6 '));
    const post = http.expectOne(`${base}/teams/join-by-code`);
    expect(post.request.method).toBe('POST');
    expect(post.request.params.keys()).toEqual([]);
    expect(post.request.body).toEqual({ invitationCode: 'A1B2C3D4E5F6' });
    post.flush({ message: 'ok', membershipId: 4, groupId: 2, status: 'ACTIVO' });
    expect((await joined).status).toBe('ACTIVO');
  });

  it('does not send a code query parameter when requesting a group', async () => {
    const base = TestBed.inject(API_URL);
    const joined = firstValueFrom(teams.join(2));
    const post = http.expectOne(`${base}/teams/2/join`);
    expect(post.request.params.keys()).toEqual([]);
    post.flush({ message: 'ok', membershipId: 4, groupId: 2, status: 'PENDIENTE' });
    await joined;
  });

  it('clears group data and invitation codes when the session changes', async () => {
    TestBed.tick();
    teams.lastCreated.set({ groupId: 9, name: 'Privado', status: 'BORRADOR', invitationCode: 'EXAMPLE12345', message: 'OK' });
    teams.mine.set([{ groupId: 9, name: 'Privado' } as never]);
    session.account.set({ token: 'otro-token', email: 'otro@example.com', role: 'COACH', expiresAt: Date.now() + 60000 });
    TestBed.tick();
    expect(teams.lastCreated()).toBeNull();
    expect(teams.mine()).toEqual([]);
    expect(teams.requests()).toEqual([]);
  });
});
