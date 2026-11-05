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

  it('registers the selected role without creating an authenticated session or storing a recovery code', async () => {
    const result = firstValueFrom(session.register({ firstName: 'Usuario', lastName: 'Prueba',
      email: 'test@example.com', password: 'Prueba2026', role: 'COACH' }));
    const request = http.expectOne('http://localhost:8080/api/auth/register');
    expect(request.request.body.role).toBe('COACH');
    request.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'COACH', recoveryCode: 'code-only-in-memory' });
    await result;
    expect(session.token()).toBeNull();
    expect(session.registration()?.recoveryCode).toBe('code-only-in-memory');
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

  it('does not end the session when the recovery-code password is incorrect', async () => {
    await login();
    const result = firstValueFrom(session.recoveryCode('wrong'));
    const rejected = expect(result).rejects.toMatchObject({ status: 401 });
    http.expectOne('http://localhost:8080/api/auth/recovery-code').flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(session.token()).toBe('test-token');
  });

  it('keeps demo navigation separate from real authentication', () => {
    session.startDemo('PRACTICANTE');
    expect(session.demo()).toBe('PRACTICANTE');
    expect(session.token()).toBeNull();
    expect(session.account()).toBeNull();
    http.expectNone(() => true);
  });

  it('blocks protected API calls in demo, even if another screen accidentally makes one', async () => {
    session.startDemo('COACH');
    await expect(firstValueFrom(TestBed.inject(ProfileApi).load())).rejects.toThrow('La demostración');
    http.expectNone(() => true);
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

  it('rotates recovery through the real contract without persisting its response', async () => {
    await login();
    const result = firstValueFrom(session.recover('test@example.com', 'old-code', 'Nueva2026'));
    const request = http.expectOne('http://localhost:8080/api/auth/recovery');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ email: 'test@example.com', recoveryCode: 'old-code', newPassword: 'Nueva2026' });
    request.flush({ message: 'OK', recoveryCode: 'new-code' });
    expect((await result).recoveryCode).toBe('new-code');
    expect(session.account()).toBeNull();
    expect(session.registration()).toBeNull();
  });
});
