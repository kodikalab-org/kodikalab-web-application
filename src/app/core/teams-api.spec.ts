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

  it('shows static groups, memberships and requests in a demo without HTTP', async () => {
    session.startDemo('PRACTICANTE');
    TestBed.tick();
    expect((await firstValueFrom(teams.loadGroups())).length).toBeGreaterThan(0);
    expect(await firstValueFrom(teams.loadMine())).toEqual(expect.arrayContaining([
      expect.objectContaining({ membership: expect.objectContaining({ status: 'ACTIVO' }) }),
    ]));
    session.startDemo('COACH');
    TestBed.tick();
    expect(await firstValueFrom(teams.loadMine())).toEqual(expect.arrayContaining([
      expect.objectContaining({ activeMembers: 3 }),
    ]));
    expect((await firstValueFrom(teams.loadRequests(1, 'PENDIENTE')))[0].practitioner?.fullName).toBe('Valeria Núñez');
    expect(await firstValueFrom(teams.loadRequests(1, 'ACLARACION_SOLICITADA'))).toEqual([]);
    http.expectNone(() => true);
  });

  it('rejects all demo writes without reporting success or contacting the API', async () => {
    session.startDemo('COACH');
    const writes = [
      teams.create({ name: 'Grupo demo' }), teams.updateDraft(1, { name: 'Cambio' }),
      teams.publish(1), teams.join(1), teams.decide(1, 101, 'ACEPTAR'),
      teams.respondClarification(1, 101, 'Respuesta'),
    ];
    for (const write of writes) {
      await expect(firstValueFrom<unknown>(write)).rejects.toMatchObject({ error: {
        message: expect.stringContaining('Demostración: los cambios no se guardan.'),
      } });
    }
    expect(teams.lastCreated()).toBeNull();
    http.expectNone(() => true);
  });

  it('keeps demo groups loaded immediately after switching roles', async () => {
    TestBed.tick();
    session.startDemo('COACH');
    await firstValueFrom(teams.loadMine());
    TestBed.tick();
    expect(teams.mine().length).toBeGreaterThan(0);
  });

  it('preserves the live teams contract outside a demo', async () => {
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

  it('rejects join by code in a demo without contacting the API', async () => {
    session.startDemo('PRACTICANTE');
    await expect(firstValueFrom<unknown>(teams.joinByCode('A1B2C3D4E5F6'))).rejects.toMatchObject({ error: {
      message: expect.stringContaining('Demostración: los cambios no se guardan.'),
    } });
    http.expectNone(() => true);
  });

  it('clears group data and invitation codes when changing session or demo role', async () => {
    TestBed.tick();
    teams.lastCreated.set({ groupId: 9, name: 'Privado', status: 'BORRADOR', invitationCode: 'EXAMPLE12345', message: 'OK' });
    session.startDemo('COACH');
    TestBed.tick();
    expect(teams.lastCreated()).toBeNull();
    await firstValueFrom(teams.loadMine());
    expect(teams.mine().length).toBeGreaterThan(0);
    session.logout();
    TestBed.tick();
    expect(teams.mine()).toEqual([]);
    expect(teams.requests()).toEqual([]);
  });
});
