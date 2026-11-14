import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { Session } from './session';
import { ProfileApi } from './profile-api';
import { authInterceptor } from './auth-interceptor';

describe('Real API session', () => {
  let session: Session;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: API_URL, useValue: 'http://localhost:8080/api' },
    ] });
    session = TestBed.inject(Session);
    session.logout();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); session.logout(); });

  async function login(remember = false) {
    const result = firstValueFrom(session.login('test@example.com', 'Prueba2026', remember));
    const request = http.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ message: 'OK', email: 'test@example.com', role: 'COACH', token: 'test-token', expiresIn: 3600 });
    await result;
  }

  it('registers the selected role without creating an authenticated session', async () => {
    const result = firstValueFrom(session.register({ firstName: 'Usuario', lastName: 'Prueba',
      email: 'test@example.com', password: 'Prueba2026', role: 'COACH' }));
    const request = http.expectOne('http://localhost:8080/api/auth/register');
    expect(request.request.body.role).toBe('COACH');
    request.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'COACH' });
    await result;
    expect(session.token()).toBeNull();
    expect(localStorage.getItem('kodikalab.session')).toBeNull();
    expect(sessionStorage.getItem('kodikalab.session')).toBeNull();
  });

  it('takes the role from the login response, never from the email', async () => {
    await login();
    expect(session.account()?.role).toBe('COACH');
    expect(session.token()).toBe('test-token');
    expect(localStorage.getItem('kodikalab.session')).toBeNull();
    expect(sessionStorage.getItem('kodikalab.session')).not.toBeNull();
  });

  it('persists a remembered session and clears both storages on logout', async () => {
    await login(true);
    expect(localStorage.getItem('kodikalab.session')).not.toBeNull();
    session.logout();
    expect(session.account()).toBeNull();
    expect(localStorage.getItem('kodikalab.session')).toBeNull();
    expect(sessionStorage.getItem('kodikalab.session')).toBeNull();
  });

  describe('after the browser is reopened', () => {
    // A new Session is what the app gets after closing and reopening the browser: it only has the storages.
    const reopened = () => TestBed.runInInjectionContext(() => new Session());

    it('restores a remembered login from the persistent storage', async () => {
      await login(true);
      const next = reopened();
      expect(next.token()).toBe('test-token');
      expect(next.account()?.email).toBe('test@example.com');
      expect(next.account()?.role).toBe('COACH');
    });

    it('forgets a login that was not remembered once the tab is closed, but keeps it across a reload', async () => {
      await login(false);
      expect(reopened().token()).toBe('test-token');
      // Closing the tab empties sessionStorage.
      sessionStorage.removeItem('kodikalab.session');
      expect(reopened().token()).toBeNull();
    });

    it('discards a remembered login whose token already expired and cleans the storage', async () => {
      await login(true);
      const saved = JSON.parse(localStorage.getItem('kodikalab.session')!);
      localStorage.setItem('kodikalab.session', JSON.stringify({ ...saved, expiresAt: Date.now() - 1000 }));
      expect(reopened().token()).toBeNull();
      expect(localStorage.getItem('kodikalab.session')).toBeNull();
    });

    it('ignores a corrupted stored session', () => {
      localStorage.setItem('kodikalab.session', '{no es json');
      expect(reopened().token()).toBeNull();
    });

    it('a new login without remember replaces a previously remembered one', async () => {
      await login(true);
      await login(false);
      expect(localStorage.getItem('kodikalab.session')).toBeNull();
      expect(sessionStorage.getItem('kodikalab.session')).not.toBeNull();
    });
  });

  it('does not turn rejected credentials into a session', async () => {
    const result = firstValueFrom(session.login('test@example.com', 'wrong', false));
    const rejected = expect(result).rejects.toMatchObject({ status: 401 });
    http.expectOne('http://localhost:8080/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(session.token()).toBeNull();
  });

  it('adds Bearer only to the API and clears the session after a protected 401', async () => {
    await login();
    const router = TestBed.inject(Router);
    const navigation = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(TestBed.inject(ProfileApi).load());
    const rejected = expect(result).rejects.toMatchObject({ status: 401 });
    const request = http.expectOne('http://localhost:8080/api/users/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(session.token()).toBeNull();
    expect(navigation).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
  });

  it('never sends the JWT to an unrelated host', async () => {
    await login();
    const result = firstValueFrom(TestBed.inject(HttpClient).get('https://example.com/data'));
    const request = http.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    await result;
  });

  it('expires a session instead of sending an expired token', async () => {
    await login();
    session.account.update(account => account && { ...account, expiresAt: Date.now() - 1 });
    expect(session.token()).toBeNull();
    expect(session.account()).toBeNull();
  });

  describe('refresh', () => {
    const URL = 'http://localhost:8080/api/auth/refresh';
    const stored = (name: 'localStorage' | 'sessionStorage') => JSON.parse(window[name].getItem('kodikalab.session')!);

    it('replaces token and expiry in the storage that holds the session (sessionStorage)', async () => {
      await login(false);
      const result = firstValueFrom(session.refresh());
      const request = http.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      request.flush({ message: 'OK', email: 'test@example.com', role: 'COACH', token: 'nuevo-token', expiresIn: 7200 });
      await result;
      expect(session.token()).toBe('nuevo-token');
      expect(stored('sessionStorage').token).toBe('nuevo-token');
      expect(stored('sessionStorage').expiresAt).toBeGreaterThan(Date.now() + 7000 * 1000);
      expect(localStorage.getItem('kodikalab.session')).toBeNull();
    });

    it('replaces token and expiry in localStorage for a remembered session', async () => {
      await login(true);
      const result = firstValueFrom(session.refresh());
      http.expectOne(URL).flush({ message: 'OK', email: 'test@example.com', role: 'COACH', token: 'nuevo-token', expiresIn: 7200 });
      await result;
      expect(stored('localStorage').token).toBe('nuevo-token');
      expect(sessionStorage.getItem('kodikalab.session')).toBeNull();
    });

    it('does not renew while more than 20 % of the lifetime is left', async () => {
      await login();
      session.refreshIfDue();
      http.expectNone(URL);
    });

    it('renews once less than 20 % of the lifetime is left, and only once at a time', async () => {
      await login();
      session.account.update((account) => account && { ...account, expiresAt: Date.now() + 3600_000 * 0.15 });
      session.refreshIfDue();
      session.refreshIfDue();
      const request = http.expectOne(URL);
      request.flush({ message: 'OK', email: 'test@example.com', role: 'COACH', token: 'nuevo-token', expiresIn: 3600 });
      expect(session.token()).toBe('nuevo-token');
      session.refreshIfDue();
      http.expectNone(URL);
    });

    it('keeps the session when the renewal fails, even with a 401', async () => {
      await login(true);
      const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      session.account.update((account) => account && { ...account, expiresAt: Date.now() + 3600_000 * 0.1 });
      session.refreshIfDue();
      http.expectOne(URL).flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(session.token()).toBe('test-token');
      expect(localStorage.getItem('kodikalab.session')).not.toBeNull();
      expect(navigation).not.toHaveBeenCalled();
      // A later navigation can try again.
      session.refreshIfDue();
      http.expectOne(URL).flush({}, { status: 503, statusText: 'Service Unavailable' });
      expect(session.token()).toBe('test-token');
    });

    it('never renews a session that carries no lifetime (saved by an older version)', () => {
      session.restore();
      session.account.set({ token: 't', email: 'a@b.c', role: 'COACH', expiresAt: Date.now() + 1000 });
      session.refreshIfDue();
      http.expectNone(URL);
    });
  });
});
