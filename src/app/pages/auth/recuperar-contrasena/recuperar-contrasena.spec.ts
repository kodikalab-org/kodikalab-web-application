import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { API_URL } from '../../../core/api';
import { authInterceptor } from '../../../core/auth-interceptor';
import { PasswordResetApi } from '../../../core/password-reset-api';
import { PasswordResetFlow } from '../../../core/password-reset-flow';
import { Session } from '../../../core/session';
import { maskEmail } from './recuperar-contrasena';

const API = 'http://api.test';
const EMAIL = 'camila.rojas@upc.edu.pe';

describe('Password reset screens', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
      ],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(PasswordResetFlow).reset();
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const type = async (id: string, value: string, blur = true) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      if (blur) input.dispatchEvent(new Event('blur'));
      await settle();
    };
    const submit = async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
    };
    /** Answers the pending request of one step and lets the screen react to it. */
    const answer = async (step: 'request' | 'verify' | 'confirm', body: unknown, status = 200, message = '') => {
      const call = http.expectOne(`${API}/auth/password-reset/${step}`);
      expect(call.request.method).toBe('POST');
      expect(call.request.headers.has('Authorization')).toBe(false);
      if (status === 200) call.flush({ message: 'ok' });
      else call.flush({ message }, { status, statusText: 'error' });
      await settle();
      return call.request.body;
    };
    const button = () => root.querySelector<HTMLButtonElement>('button.submit')!;
    const alert = () => root.querySelector('[role=alert]')?.textContent?.replace(/\s+/g, ' ').trim();
    return { harness, root, type, submit, answer, button, alert, http, settle };
  }

  it('explains the three steps and asks only for the email on the first screen', async () => {
    const { root, button } = await open('/recuperar-contrasena');
    expect(root.querySelector('h1')?.textContent).toContain('Recuperar contraseña');
    expect(root.textContent).toContain('Paso 1 de 3');
    const steps = Array.from(root.querySelectorAll('ol li')).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(steps).toHaveLength(3);
    expect(steps[0]).toContain('te enviaremos un código');
    expect(steps[1]).toContain('código de 6 dígitos');
    expect(steps[2]).toContain('nueva contraseña');
    expect(root.querySelectorAll('input')).toHaveLength(1);
    expect(button().textContent).toContain('Enviar código por correo');
    expect(button().disabled).toBe(true);
    expect(root.textContent).not.toContain('Vista de ejemplo');
  });

  it('validates the email before sending the code and sends nothing while it is invalid', async () => {
    const { root, type, submit, button, http } = await open('/recuperar-contrasena');
    await type('recovery-email', '');
    expect(root.textContent).toContain('Ingresa tu correo institucional');
    await type('recovery-email', 'no-es-un-correo');
    expect(root.textContent).toContain('Ingresa un correo válido');
    expect(button().disabled).toBe(true);
    await submit();
    http.expectNone(`${API}/auth/password-reset/request`);
    await type('recovery-email', EMAIL);
    expect(button().disabled).toBe(false);
  });

  it('requests the code with a normalized email and shows it masked on the next step', async () => {
    const { harness, type, submit, answer, button } = await open('/recuperar-contrasena');
    await type('recovery-email', '  Camila.Rojas@UPC.edu.pe ');
    await submit();
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Enviando código');
    const body = await answer('request', null);
    expect(body).toEqual({ email: EMAIL });
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
    expect(TestBed.inject(PasswordResetFlow).email()).toBe(EMAIL);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Paso 2 de 3');
    expect(root.textContent).toContain('ca***@upc.edu.pe');
    expect(root.textContent).not.toContain(EMAIL);
  });

  it('stays on the first step and shows the backend message when the code cannot be sent', async () => {
    const { type, submit, answer, alert, button } = await open('/recuperar-contrasena');
    await type('recovery-email', EMAIL);
    await submit();
    await answer('request', null, 429, 'Espera un minuto antes de pedir otro código');
    expect(alert()).toBe('Espera un minuto antes de pedir otro código');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena');
    expect(button().disabled).toBe(false);
    expect(TestBed.inject(PasswordResetFlow).email()).toBe('');
  });

  it('explains that the email service is unavailable', async () => {
    const { type, submit, answer, alert } = await open('/recuperar-contrasena');
    await type('recovery-email', EMAIL);
    await submit();
    await answer('request', null, 503, 'El envío de correos no está configurado');
    expect(alert()).toBe('No podemos enviar correos en este momento. Inténtalo más tarde.');
  });

  it('checks the six digit code with the backend before moving on', async () => {
    TestBed.inject(PasswordResetFlow).email.set(EMAIL);
    const { root, type, submit, answer, button } = await open('/recuperar-contrasena/codigo');
    expect(button().textContent).toContain('Verificar código');
    expect(button().disabled).toBe(true);
    await type('recovery-code', '');
    expect(root.textContent).toContain('Ingresa el código que recibiste');
    await type('recovery-code', '12345');
    expect(root.textContent).toContain('El código tiene 6 dígitos');
    expect(button().disabled).toBe(true);
    await type('recovery-code', '12a456');
    expect(button().disabled).toBe(true);
    await type('recovery-code', '123 456');
    expect(button().disabled).toBe(false);
    await submit();
    const flow = TestBed.inject(PasswordResetFlow);
    expect(flow.codeVerified()).toBe(false);
    const body = await answer('verify', null);
    expect(body).toEqual({ email: EMAIL, code: '123456' });
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/nueva');
    expect(flow.codeVerified()).toBe(true);
    expect(flow.code()).toBe('123456');
  });

  it('keeps the user on the code step when the code is wrong and offers a new one', async () => {
    TestBed.inject(PasswordResetFlow).email.set(EMAIL);
    const { root, type, submit, answer, alert } = await open('/recuperar-contrasena/codigo');
    await type('recovery-code', '000000');
    await submit();
    await answer('verify', null, 401, 'Código inválido o vencido');
    expect(alert()).toContain('Código inválido o vencido');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
    expect(TestBed.inject(PasswordResetFlow).codeVerified()).toBe(false);
    expect(root.querySelector('[role=alert] a[href="/recuperar-contrasena"]')?.textContent).toContain(
      'Pedir un código nuevo',
    );
  });

  it('shows the lock message after too many wrong codes', async () => {
    TestBed.inject(PasswordResetFlow).email.set(EMAIL);
    const { type, submit, answer, alert } = await open('/recuperar-contrasena/codigo');
    await type('recovery-code', '111111');
    await submit();
    await answer('verify', null, 429, 'Demasiados intentos. Espera unos minutos y pide un código nuevo');
    expect(alert()).toContain('Demasiados intentos');
  });

  it('resends the code and tells the user, without leaving the step', async () => {
    TestBed.inject(PasswordResetFlow).email.set(EMAIL);
    const { root, answer } = await open('/recuperar-contrasena/codigo');
    expect(root.querySelector('a[href="/recuperar-contrasena"]')?.textContent).toContain('Cambiar correo');
    expect(root.querySelector('[role=status]')).toBeNull();
    Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reenviar código'))!
      .click();
    const body = await answer('request', null);
    expect(body).toEqual({ email: EMAIL });
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
    expect(root.querySelector('[role=status]')?.textContent).toContain('Te enviamos un código nuevo a ca***@upc.edu.pe');
  });

  it('does not tell the user a new code was sent when the resend fails', async () => {
    TestBed.inject(PasswordResetFlow).email.set(EMAIL);
    const { root, answer, alert } = await open('/recuperar-contrasena/codigo');
    Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reenviar código'))!
      .click();
    await answer('request', null, 429, 'Espera un minuto antes de pedir otro código');
    expect(alert()).toBe('Espera un minuto antes de pedir otro código Pedir un código nuevo');
    expect(root.querySelector('[role=status]')).toBeNull();
  });

  async function openNewPassword() {
    const flow = TestBed.inject(PasswordResetFlow);
    flow.email.set(EMAIL);
    flow.code.set('123456');
    flow.codeVerified.set(true);
    return open('/recuperar-contrasena/nueva');
  }

  it('applies the password policy and requires both passwords to match', async () => {
    const { root, type, button } = await openNewPassword();
    expect(root.querySelector('h1')?.textContent).toContain('Crea tu nueva contraseña');
    expect(root.textContent).toContain('Paso 3 de 3');
    expect(button().textContent).toContain('Cambiar contraseña');
    await type('new-password', '12345');
    expect(root.textContent).toContain('La contraseña debe contener al menos 8 caracteres, una mayúscula y un número');
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2027');
    expect(root.textContent).toContain('Las contraseñas no coinciden');
    expect(button().disabled).toBe(true);
    await type('repeat-password', 'Nueva2026');
    expect(root.textContent).not.toContain('Las contraseñas no coinciden');
    expect(button().disabled).toBe(false);
  });

  it('has one working eye that shows and hides both new password fields', async () => {
    const { root, settle } = await openNewPassword();
    const eyes = root.querySelectorAll<HTMLButtonElement>('button.toggle');
    expect(eyes).toHaveLength(1);
    const field = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    expect(field('new-password').type).toBe('password');
    eyes[0].click();
    await settle();
    expect(field('new-password').type).toBe('text');
    expect(field('repeat-password').type).toBe('text');
    expect(eyes[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('sets the new password with the code, clears the flow and returns to the login with a confirmation', async () => {
    const flow = TestBed.inject(PasswordResetFlow);
    const { harness, type, submit, answer } = await openNewPassword();
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2026');
    await submit();
    const body = await answer('confirm', null);
    expect(body).toEqual({ email: EMAIL, code: '123456', newPassword: 'Nueva2026' });
    expect(TestBed.inject(Router).url).toBe('/login?motivo=contrasena-actualizada');
    expect(flow.email()).toBe('');
    expect(flow.code()).toBe('');
    expect(flow.codeVerified()).toBe(false);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[role=status]')?.textContent).toContain('Contraseña actualizada');
  });

  it('keeps the flow and shows the backend message when the code expired before the password was set', async () => {
    const flow = TestBed.inject(PasswordResetFlow);
    const { type, submit, answer, alert } = await openNewPassword();
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2026');
    await submit();
    await answer('confirm', null, 401, 'Código inválido o vencido');
    expect(alert()).toContain('Código inválido o vencido');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/nueva');
    expect(flow.email()).toBe(EMAIL);
  });

  it('shows the backend message for a rejected password', async () => {
    const { type, submit, answer, alert } = await openNewPassword();
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2026');
    await submit();
    await answer('confirm', null, 400, 'La contraseña debe contener al menos 8 caracteres, una mayúscula y un número');
    expect(alert()).toContain('La contraseña debe contener al menos 8 caracteres');
  });

  it('sends one request at a time', async () => {
    const { type, submit, http } = await openNewPassword();
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2026');
    await submit();
    await submit();
    http.expectOne(`${API}/auth/password-reset/confirm`);
  });

  it('does not let a later step be opened directly', async () => {
    const { harness } = await open('/recuperar-contrasena/codigo');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena');
    await harness.navigateByUrl('/recuperar-contrasena/nueva');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena');
    const flow = TestBed.inject(PasswordResetFlow);
    flow.email.set(EMAIL);
    await harness.navigateByUrl('/recuperar-contrasena/nueva');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
    flow.codeVerified.set(true);
    await harness.navigateByUrl('/recuperar-contrasena/nueva');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
  });

  it('offers the way in from the login screen', async () => {
    const { root } = await open('/login');
    const link = root.querySelector('a[href="/recuperar-contrasena"]');
    expect(link?.textContent).toContain('¿Olvidaste tu contraseña?');
    expect(root.querySelector('[role=status]')).toBeNull();
  });
});

describe('Password reset requests and the auth interceptor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
      ],
    }),
  );

  it('sends the three public steps without a token and does not log the user out on a 401', () => {
    const session = TestBed.inject(Session);
    session.account.set({
      token: 'token-de-otra-sesion',
      email: 'otra@upc.edu.pe',
      role: 'PRACTICANTE',
      expiresAt: Date.now() + 60_000,
    });
    const api = TestBed.inject(PasswordResetApi);
    const http = TestBed.inject(HttpTestingController);
    for (const step of ['request', 'verify', 'confirm'] as const) {
      const call =
        step === 'request'
          ? api.request(EMAIL)
          : step === 'verify'
            ? api.verify(EMAIL, '123456')
            : api.confirm(EMAIL, '123456', 'Nueva2026');
      let failed = 0;
      call.subscribe({ error: () => failed++ });
      const req = http.expectOne(`${API}/auth/password-reset/${step}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ message: 'Código inválido o vencido' }, { status: 401, statusText: 'Unauthorized' });
      expect(failed).toBe(1);
    }
    expect(session.token()).toBe('token-de-otra-sesion');
    http.verify();
  });
});

describe('maskEmail', () => {
  it('keeps the first two letters and the domain', () => {
    expect(maskEmail(EMAIL)).toBe('ca***@upc.edu.pe');
    expect(maskEmail('a@upc.edu.pe')).toBe('a***@upc.edu.pe');
  });

  it('returns the value unchanged when it is not an email', () => {
    expect(maskEmail('sin-arroba')).toBe('sin-arroba');
  });
});
