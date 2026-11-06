import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { RecuperarAcceso } from './recuperar-acceso/recuperar-acceso';
import { RegistroExitoso } from './registro-exitoso/registro-exitoso';
import { Session } from '../../core/session';

const REGISTER_URL = 'http://localhost:8080/api/auth/register';
const LOGIN_URL = 'http://localhost:8080/api/auth/login';
const RECOVERY_URL = 'http://localhost:8080/api/auth/recovery';
const CONNECTION = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';

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
  const submit = (root: HTMLElement) => root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const alertText = (root: HTMLElement) => root.querySelector('[role=alert]')?.textContent ?? '';

  async function fillRegistration(root: HTMLElement, email = 'test@example.com') {
    for (const [id, value] of Object.entries({ firstName: 'Usuario', lastName: 'Prueba', email,
      password: 'Prueba2026', confirmPassword: 'Prueba2026' })) type(root, id, value);
    root.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
  }

  it('submits registration once, waits for 201, and never sends confirmation or terms as API fields', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    submit(root);
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    const request = http.expectOne(REGISTER_URL);
    expect(Object.keys(request.request.body).sort()).toEqual(['email', 'firstName', 'lastName', 'password', 'role']);
    request.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'PRACTICANTE' });
    await fixture.whenStable();
    // Registration issues no token: the form signs in with the same credentials before onboarding.
    expect(navigate).not.toHaveBeenCalled();
    const login = http.expectOne(LOGIN_URL);
    expect(login.request.body).toEqual({ email: 'test@example.com', password: 'Prueba2026' });
    login.flush({ message: 'OK', email: 'test@example.com', role: 'PRACTICANTE', token: 'test-token', expiresIn: 3600 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/datos-academicos');
    expect(TestBed.inject(Session).account()?.token).toBe('test-token');
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('');
  });

  it('sends a new coach straight to coach onboarding after signing in', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    root.querySelector<HTMLButtonElement>('mat-button-toggle[value="COACH"] button')!.click();
    submit(root);
    const register = http.expectOne(REGISTER_URL);
    expect(register.request.body.role).toBe('COACH');
    register.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'COACH' });
    await fixture.whenStable();
    http.expectOne(LOGIN_URL).flush({ message: 'OK', email: 'test@example.com', role: 'COACH', token: 'test-token', expiresIn: 3600 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/onboarding/coach/experiencia');
  });

  it('never registers twice when the automatic sign-in fails: Reintentar only repeats the sign-in', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    http.expectOne(REGISTER_URL).flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'PRACTICANTE' });
    await fixture.whenStable();
    http.expectOne(LOGIN_URL).flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain(CONNECTION);
    expect(navigate).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('button.retry')!.click();
    fixture.detectChanges();
    http.expectNone(REGISTER_URL);
    expect(http.expectOne(LOGIN_URL).request.body.password).toBe('Prueba2026');
  });

  it('tells the user the account exists when the sign-in is rejected after registering', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    http.expectOne(REGISTER_URL).flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'PRACTICANTE' });
    await fixture.whenStable();
    http.expectOne(LOGIN_URL).flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain('Tu cuenta se creó');
    expect(root.querySelector('a[href="/login"]')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends trimmed names and a trimmed, lowercased email', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root, '  Test@Example.COM ');
    type(root, 'firstName', '  Usuario   Nuevo ');
    submit(root);
    const request = http.expectOne(REGISTER_URL);
    expect(request.request.body).toMatchObject({ firstName: 'Usuario Nuevo', lastName: 'Prueba', email: 'test@example.com' });
    request.flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
  });

  it('keeps a duplicate registration on its form, clears only the password and shows the backend alert', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    http.expectOne(REGISTER_URL).flush(
      { message: 'El correo institucional ya está vinculado a una cuenta existente' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain('El correo institucional ya está vinculado a una cuenta existente');
    expect(root.querySelector<HTMLInputElement>('#firstName')!.value).toBe('Usuario');
    expect(root.querySelector<HTMLInputElement>('#email')!.value).toBe('test@example.com');
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows 400 field errors under their own control and keeps the rest of the form', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    http.expectOne(REGISTER_URL).flush(
      { message: 'Datos inválidos', errors: { email: 'El correo no es válido para el registro' } },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.textContent).toContain('El correo no es válido para el registro');
    expect(alertText(root)).toBe('');
    expect(root.querySelector<HTMLInputElement>('#email')!.value).toBe('test@example.com');
    expect(root.querySelector<HTMLInputElement>('#lastName')!.value).toBe('Prueba');
  });

  it('offers Reintentar after a connection failure and sends the same data again', async () => {
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    await fillRegistration(root);
    submit(root);
    http.expectOne(REGISTER_URL).flush({}, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain(CONNECTION);
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('Prueba2026');
    root.querySelector<HTMLButtonElement>('button.retry')!.click();
    fixture.detectChanges();
    const retry = http.expectOne(REGISTER_URL);
    expect(retry.request.body.password).toBe('Prueba2026');
    retry.flush({ message: 'Registro exitoso', email: 'test@example.com', role: 'PRACTICANTE' });
    await fixture.whenStable();
    http.expectOne(LOGIN_URL).flush({ message: 'OK', email: 'test@example.com', role: 'PRACTICANTE', token: 'test-token', expiresIn: 3600 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/datos-academicos');
  });

  it('routes a newly authenticated coach to coach onboarding, independently of the email', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'email', 'practicante@example.com');
    type(root, 'password', 'Prueba2026');
    submit(root);
    http.expectOne(LOGIN_URL).flush({ message: 'OK', email: 'practicante@example.com', role: 'COACH', token: 'test-token', expiresIn: 3600 });
    // The login handler checks whether a profile already exists before choosing the destination.
    await Promise.resolve();
    http.expectOne('http://localhost:8080/api/users/me').flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/onboarding/coach/experiencia');
  });

  it('shows "Credenciales inválidas" with retry and recovery actions, keeps the email and clears the password', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'email', 'Camila.Rojas@upc.edu.pe');
    type(root, 'password', 'Equivocada1');
    submit(root);
    http.expectOne(LOGIN_URL).flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain('Credenciales inválidas');
    expect(root.querySelector('[role=alert] a[href="/recuperar-acceso"]')).not.toBeNull();
    expect(root.querySelector('[role=alert] button.retry')).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>('#email')!.value).toBe('Camila.Rojas@upc.edu.pe');
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('');
    expect(TestBed.inject(Session).account()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('button.retry')!.click();
    fixture.detectChanges();
    expect(alertText(root)).toBe('');
  });

  it('offers retry with the same password after a connection failure during login', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'email', 'practicante@example.com');
    type(root, 'password', 'Prueba2026');
    submit(root);
    http.expectOne(LOGIN_URL).flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alertText(root)).toContain(CONNECTION);
    expect(root.querySelector('[role=alert] a[href="/recuperar-acceso"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('button.retry')!.click();
    fixture.detectChanges();
    expect(http.expectOne(LOGIN_URL).request.body.password).toBe('Prueba2026');
  });

  it('shows recovery failure without a success screen or session', async () => {
    const fixture = TestBed.createComponent(RecuperarAcceso);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    type(root, 'recovery-email', 'test@example.com');
    type(root, 'recovery-code', 'ABCDEFGHIJKLMNOPQRSTUVWX');
    type(root, 'new-password', 'Prueba2026');
    submit(root);
    http.expectOne(RECOVERY_URL).flush({ message: 'Datos de recuperación inválidos' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(alertText(root)).toContain('Datos de recuperación inválidos');
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
