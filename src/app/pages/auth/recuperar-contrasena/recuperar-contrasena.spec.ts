import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { PasswordResetFlow } from '../../../core/password-reset-flow';
import { maskEmail } from './recuperar-contrasena';

describe('Password reset screens', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
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
    const type = async (id: string, value: string, blur = true) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      if (blur) input.dispatchEvent(new Event('blur'));
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const submit = async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const button = () => root.querySelector<HTMLButtonElement>('button.submit')!;
    return { harness, root, type, submit, button };
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
  });

  it('validates the email before sending the code', async () => {
    const { root, type, button } = await open('/recuperar-contrasena');
    await type('recovery-email', '');
    expect(root.textContent).toContain('Ingresa tu correo institucional');
    await type('recovery-email', 'no-es-un-correo');
    expect(root.textContent).toContain('Ingresa un correo válido');
    expect(button().disabled).toBe(true);
    await type('recovery-email', 'camila.rojas@upc.edu.pe');
    expect(button().disabled).toBe(false);
  });

  it('goes to the code step with a normalized, masked email', async () => {
    const { harness, type, submit } = await open('/recuperar-contrasena');
    await type('recovery-email', '  Camila.Rojas@UPC.edu.pe ');
    await submit();
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/codigo');
    expect(TestBed.inject(PasswordResetFlow).email()).toBe('camila.rojas@upc.edu.pe');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Paso 2 de 3');
    expect(root.textContent).toContain('ca***@upc.edu.pe');
    expect(root.textContent).not.toContain('camila.rojas@upc.edu.pe');
  });

  it('asks for a six digit code and moves on to the new password step', async () => {
    TestBed.inject(PasswordResetFlow).email.set('camila.rojas@upc.edu.pe');
    const { root, type, submit, button } = await open('/recuperar-contrasena/codigo');
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
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena/nueva');
    expect(TestBed.inject(PasswordResetFlow).codeVerified()).toBe(true);
  });

  it('lets the user resend the code or go back to change the email', async () => {
    TestBed.inject(PasswordResetFlow).email.set('camila.rojas@upc.edu.pe');
    const { harness, root } = await open('/recuperar-contrasena/codigo');
    expect(root.querySelector('a[href="/recuperar-contrasena"]')?.textContent).toContain('Cambiar correo');
    expect(root.querySelector('[role=status]')).toBeNull();
    Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reenviar código'))!
      .click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role=status]')?.textContent).toContain('Te enviamos un código nuevo a ca***@upc.edu.pe');
  });

  it('applies the password policy and requires both passwords to match', async () => {
    const flow = TestBed.inject(PasswordResetFlow);
    flow.email.set('camila.rojas@upc.edu.pe');
    flow.codeVerified.set(true);
    const { root, type, button } = await open('/recuperar-contrasena/nueva');
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

  it('finishes by returning to the login with a confirmation and clears the flow', async () => {
    const flow = TestBed.inject(PasswordResetFlow);
    flow.email.set('camila.rojas@upc.edu.pe');
    flow.codeVerified.set(true);
    const { harness, type, submit } = await open('/recuperar-contrasena/nueva');
    await type('new-password', 'Nueva2026');
    await type('repeat-password', 'Nueva2026');
    await submit();
    expect(TestBed.inject(Router).url).toBe('/login?motivo=contrasena-actualizada');
    expect(flow.email()).toBe('');
    expect(flow.codeVerified()).toBe(false);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[role=status]')?.textContent).toContain('Contraseña actualizada');
  });

  it('does not let a later step be opened directly', async () => {
    const { harness } = await open('/recuperar-contrasena/codigo');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena');
    await harness.navigateByUrl('/recuperar-contrasena/nueva');
    expect(TestBed.inject(Router).url).toBe('/recuperar-contrasena');
    TestBed.inject(PasswordResetFlow).email.set('camila.rojas@upc.edu.pe');
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

describe('maskEmail', () => {
  it('keeps the first two letters and the domain', () => {
    expect(maskEmail('camila.rojas@upc.edu.pe')).toBe('ca***@upc.edu.pe');
    expect(maskEmail('a@upc.edu.pe')).toBe('a***@upc.edu.pe');
  });

  it('returns the value unchanged when it is not an email', () => {
    expect(maskEmail('sin-arroba')).toBe('sin-arroba');
  });
});
