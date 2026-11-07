import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { isObservable, of, throwError, firstValueFrom } from 'rxjs';
import { Session } from './session';
import { ProfileApi } from './profile-api';
import { accessGuard } from './access-guard';

describe('Access guard', () => {
  let session: Session;
  let profiles: ProfileApi;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    session = TestBed.inject(Session);
    session.logout();
    profiles = TestBed.inject(ProfileApi);
  });
  afterEach(() => session.logout());

  async function guard(url: string, role: string | null = 'PRACTICANTE') {
    const result = TestBed.runInInjectionContext(() => accessGuard(
      { data: { role } } as unknown as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot,
    ));
    const value = isObservable(result) ? await firstValueFrom(result) : await result;
    return typeof value === 'boolean' ? value : TestBed.inject(Router).serializeUrl(value as never);
  }
  function authenticated() {
    session.restore();
    session.account.set({ token: 'test-token', email: 'test@example.com', role: 'PRACTICANTE', expiresAt: Date.now() + 60000 });
  }

  it('requires a real session or explicit demo entry', async () => {
    expect(await guard('/perfil')).toBe('/login');
  });
  it('redirects a new user to onboarding when the API reports a missing profile', async () => {
    authenticated();
    vi.spyOn(profiles, 'load').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(await guard('/inicio')).toBe('/onboarding/practicante/datos-academicos');
    expect(await guard('/onboarding/practicante/datos-academicos')).toBe(true);
  });
  it('does not treat a server error as an absent profile', async () => {
    authenticated();
    vi.spyOn(profiles, 'load').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(await guard('/inicio')).toBe('/login?motivo=conexion');
  });
  it('prevents cross-role navigation', async () => {
    authenticated();
    expect(await guard('/coach/perfil', 'COACH')).toBe('/inicio');
  });
  it('lets a demo browse its own role without calling the backend', async () => {
    session.demo.set('COACH');
    const load = vi.spyOn(profiles, 'load');
    expect(await guard('/coach/perfil', 'COACH')).toBe(true);
    expect(await guard('/perfil')).toBe('/coach/inicio');
    expect(load).not.toHaveBeenCalled();
  });
  it('loads a real profile before entering its page', async () => {
    authenticated();
    vi.spyOn(profiles, 'load').mockReturnValue(of({ message: 'OK', profile: {} as never }));
    expect(await guard('/perfil')).toBe(true);
  });
  it('allows shared resources for either demo role without relaxing private role checks', async () => {
    session.demo.set('COACH');
    expect(await guard('/recursos', null)).toBe(true);
    expect(await guard('/perfil')).toBe('/coach/inicio');
    session.demo.set('PRACTICANTE');
    expect(await guard('/recursos', null)).toBe(true);
    expect(await guard('/coach/perfil', 'COACH')).toBe('/inicio');
  });
  it('loads the signed-in coach profile on shared routes', async () => {
    authenticated();
    session.account.update(account => ({ ...account!, role: 'COACH' }));
    const load = vi.spyOn(profiles, 'load').mockReturnValue(of({ message: 'OK', profile: {} as never }));
    expect(await guard('/recursos', null)).toBe(true);
    expect(load).toHaveBeenCalledOnce();
  });
});
