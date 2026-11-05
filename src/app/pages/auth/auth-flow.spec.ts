import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { RecuperarAcceso } from './recuperar-acceso/recuperar-acceso';
import { RegistroExitoso } from './registro-exitoso/registro-exitoso';
import { Session } from '../../core/session';

describe('API-connected access forms', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(Session).logout();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => { http.verify(); TestBed.inject(Session).logout(); });

  function type(root: HTMLElement, id: string, value: string) {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('submits registration once, waits for 201, and never sends confirmation or terms as API fields', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    for (const [id, value] of Object.entries({ firstName: 'Usuario', lastName: 'Prueba', email: 'test@example.com',
      password: 'Prueba2026', confirmPassword: 'Prueba2026' })) type(root, id, value);
    root.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    const request = http.expectOne('http://localhost:8080/api/auth/register');
    expect(Object.keys(request.request.body).sort()).toEqual(['email', 'firstName', 'lastName', 'password', 'role']);
    request.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'PRACTICANTE', recoveryCode: 'test-code' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/registro-exitoso');
    expect(TestBed.inject(Session).account()).toBeNull();
  });

  it('keeps a duplicate registration on its form and displays the backend error', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    for (const [id, value] of Object.entries({ firstName: 'Usuario', lastName: 'Prueba', email: 'test@example.com',
      password: 'Prueba2026', confirmPassword: 'Prueba2026' })) type(root, id, value);
    root.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectOne('http://localhost:8080/api/auth/register').flush({ message: 'El correo ya está registrado' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('El correo ya está registrado');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes a newly authenticated coach to coach onboarding, independently of the email', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'email', 'practicante@example.com');
    type(root, 'password', 'Prueba2026');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectOne('http://localhost:8080/api/auth/login').flush({ message: 'OK', email: 'practicante@example.com', role: 'COACH', token: 'test-token', expiresIn: 3600 });
    // The login handler checks whether a profile already exists before choosing the destination.
    await Promise.resolve();
    http.expectOne('http://localhost:8080/api/users/me').flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/onboarding/coach/experiencia');
  });

  it('shows a recovery failure without a success screen or session', async () => {
    const fixture = TestBed.createComponent(RecuperarAcceso);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'recovery-email', 'test@example.com');
    type(root, 'recovery-code', 'invalid-code');
    type(root, 'new-password', 'Prueba2026');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectOne('http://localhost:8080/api/auth/recovery').flush({}, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('datos de recuperación inválidos');
    expect(root.querySelector('code')).toBeNull();
    expect(TestBed.inject(Session).account()).toBeNull();
  });

  it('does not fabricate a registration confirmation when its ephemeral response is missing', async () => {
    const fixture = TestBed.createComponent(RegistroExitoso);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Confirmación no disponible');
    expect(fixture.nativeElement.querySelector('code')).toBeNull();
  });
});
