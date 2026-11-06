import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL, PractitionerProfile, PractitionerRequest } from './api';
import { ProfileApi } from './profile-api';

const URL = 'http://localhost:8080/api/users/me';
const PENDING_MESSAGE =
  'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';

const profile = (patch: Partial<PractitionerProfile> = {}): PractitionerProfile => ({
  email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
  codeforcesHandle: null, codeforcesRating: null, atcoderHandle: null, vjudgeHandle: null, ...patch,
});
const request = (patch: Partial<PractitionerRequest> = {}): PractitionerRequest => ({
  codigoEstudiante: 'U202412345', carrera: 'Ingeniería de Software', cicloAcademico: 5,
  nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: null, atcoderHandle: null, vjudgeHandle: null, ...patch,
});

describe('ProfileApi', () => {
  let api: ProfileApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: 'http://localhost:8080/api' },
    ] });
    api = TestBed.inject(ProfileApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function save(body: PractitionerRequest, response: { message: string; profile: PractitionerProfile }) {
    const result = firstValueFrom(api.save(body));
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
    await result;
  }

  it('marks a platform as linked when the backend returns the same handle', async () => {
    await save(request({ codeforcesHandle: 'tourist' }),
      { message: 'Perfil actualizado correctamente', profile: profile({ codeforcesHandle: 'tourist', codeforcesRating: 3700 }) });
    expect(api.pendingLink()).toBeNull();
    const codeforces = api.platforms().find((p) => p.key === 'codeforces')!;
    expect(codeforces).toMatchObject({ state: 'VINCULADA', handle: 'tourist', rating: 3700 });
  });

  it('compares the returned handle ignoring case', async () => {
    await save(request({ codeforcesHandle: 'Tourist' }),
      { message: 'ok', profile: profile({ codeforcesHandle: 'tourist' }) });
    expect(api.pendingLink()).toBeNull();
  });

  it('leaves the link PENDING, with the backend notice, when Codeforces does not confirm the handle', async () => {
    await save(request({ codeforcesHandle: 'nuevo_handle' }),
      { message: PENDING_MESSAGE, profile: profile({ codeforcesHandle: 'viejo' }) });
    expect(api.pendingLink()).toMatchObject({ handle: 'nuevo_handle', notice: PENDING_MESSAGE });
    const codeforces = api.platforms().find((p) => p.key === 'codeforces')!;
    expect(codeforces).toMatchObject({ state: 'PENDIENTE', handle: 'nuevo_handle', savedHandle: 'viejo', notice: PENDING_MESSAGE, rating: null });
    expect((api.profile() as PractitionerProfile).codeforcesHandle).toBe('viejo');
  });

  it('lists only the platforms the backend supports', async () => {
    await save(request({ atcoderHandle: 'ana_ac' }), { message: 'ok', profile: profile({ atcoderHandle: 'ana_ac' }) });
    expect(api.platforms().map((p) => [p.name, p.state])).toEqual([
      ['Codeforces', 'SIN_VINCULAR'], ['AtCoder', 'VINCULADA'], ['VJudge', 'SIN_VINCULAR'],
    ]);
  });

  it('clears the pending link when the handle is removed', async () => {
    await save(request({ codeforcesHandle: 'x' }), { message: PENDING_MESSAGE, profile: profile() });
    expect(api.pendingLink()).not.toBeNull();
    await save(request({ codeforcesHandle: null }), { message: 'ok', profile: profile() });
    expect(api.pendingLink()).toBeNull();
  });

  it('keeps the saved profile and the pending link when a save fails', async () => {
    await save(request({ codeforcesHandle: 'x' }), { message: PENDING_MESSAGE, profile: profile({ carrera: 'Previa' }) });
    const before = api.profile();
    const pending = api.pendingLink();
    const failures: { status: number; body: Record<string, unknown> | null }[] = [
      { status: 400, body: { message: 'Datos inválidos', errors: { carrera: 'x' } } },
      { status: 409, body: { message: 'dup' } },
      { status: 0, body: null },
    ];
    for (const failure of failures) {
      const result = firstValueFrom(api.save(request({ carrera: 'Otra' })));
      const req = http.expectOne(URL);
      if (failure.status === 0) req.error(new ProgressEvent('error'));
      else req.flush(failure.body, { status: failure.status, statusText: 'err' });
      await expect(result).rejects.toBeTruthy();
      expect(api.profile()).toBe(before);
      expect(api.pendingLink()).toBe(pending);
    }
  });

  it('retries the pending link resending the saved data with the requested handle', async () => {
    await save(request({ codeforcesHandle: 'nuevo', atcoderHandle: 'ac' }),
      { message: PENDING_MESSAGE, profile: profile({ atcoderHandle: 'ac' }) });
    const retry = firstValueFrom(api.retryPendingLink());
    const req = http.expectOne(URL);
    expect(req.request.body).toEqual(request({ codeforcesHandle: 'nuevo', atcoderHandle: 'ac' }));
    expect('codeforcesRating' in req.request.body).toBe(false);
    req.flush({ message: 'Perfil actualizado correctamente', profile: profile({ atcoderHandle: 'ac', codeforcesHandle: 'nuevo', codeforcesRating: 1200 }) });
    await retry;
    expect(api.pendingLink()).toBeNull();
    expect(api.platforms()[0]).toMatchObject({ state: 'VINCULADA', handle: 'nuevo', rating: 1200 });
  });

  it('keeps the link pending when the retry is still not confirmed', async () => {
    await save(request({ codeforcesHandle: 'nuevo' }), { message: PENDING_MESSAGE, profile: profile() });
    const retry = firstValueFrom(api.retryPendingLink());
    http.expectOne(URL).flush({ message: PENDING_MESSAGE, profile: profile() });
    await retry;
    expect(api.platforms()[0].state).toBe('PENDIENTE');
  });

  it('refuses to retry without a pending link', async () => {
    await expect(firstValueFrom(api.retryPendingLink())).rejects.toThrow('No hay una vinculación pendiente.');
  });

  it('forgets the pending link of another account and on reset', async () => {
    await save(request({ codeforcesHandle: 'x' }), { message: PENDING_MESSAGE, profile: profile() });
    api.profile.set(profile({ email: 'otra@example.com' }));
    expect(api.platforms()[0].state).toBe('SIN_VINCULAR');
    api.reset();
    expect(api.pendingLink()).toBeNull();
    expect(api.draftErrors).toEqual({});
  });

  it('drops the pending link when a reload shows the handle saved', async () => {
    await save(request({ codeforcesHandle: 'nuevo' }), { message: PENDING_MESSAGE, profile: profile() });
    const loaded = firstValueFrom(api.load());
    http.expectOne(URL).flush({ message: 'ok', profile: profile({ codeforcesHandle: 'nuevo' }) });
    await loaded;
    expect(api.pendingLink()).toBeNull();
  });

  it('does not touch the link state when a coach saves', async () => {
    const result = firstValueFrom(api.save({ especialidadPrincipal: 'Grafos', organizacionClub: null, aniosExperiencia: 3, presentacion: null }));
    http.expectOne(URL).flush({ message: 'ok', profile: { email: 'c@example.com', role: 'COACH', especialidadPrincipal: 'Grafos', organizacionClub: null, aniosExperiencia: 3, presentacion: null } });
    await result;
    expect(api.pendingLink()).toBeNull();
    expect(api.platforms()).toEqual([]);
  });
});
