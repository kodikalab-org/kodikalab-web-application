import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideRouter } from '@angular/router';
import { Session } from '../../../core/session';
import { RecuperarAcceso } from './recuperar-acceso';

const RECOVERY_URL = 'http://localhost:8080/api/auth/recovery';
const CODE = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX';

describe('RecuperarAcceso', () => {
  let http: HttpTestingController;
  let copy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    copy = vi.fn(() => true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Clipboard, useValue: { copy } },
      ],
    });
    TestBed.inject(Session).logout();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.inject(Session).logout(); });

  async function setup() {
    const fixture = TestBed.createComponent(RecuperarAcceso);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const type = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
    };
    const submit = () => root.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const send = () => root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    const fill = (code: string, password = 'Nueva2026') => {
      type('recovery-email', 'Camila.Rojas@UPC.edu.pe ');
      type('recovery-code', code);
      type('new-password', password);
    };
    return { fixture, root, type, submit, send, fill };
  }

  it('does not send a malformed recovery code and explains the expected format', async () => {
    const { root, submit, fill } = await setup();
    fill('invalid-code');
    expect(submit().disabled).toBe(true);
    expect(root.textContent).toContain('El código tiene 24 caracteres');
    http.expectNone(RECOVERY_URL);
  });

  it('accepts a code without hyphens or in lowercase and sends the canonical form', async () => {
    const { root, send, fill, fixture } = await setup();
    fill('abcdefghijklmnopqrstuvwx');
    fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    send();
    const request = http.expectOne(RECOVERY_URL);
    expect(request.request.body).toEqual({
      email: 'camila.rojas@upc.edu.pe', recoveryCode: CODE, newPassword: 'Nueva2026',
    });
    request.flush({ message: 'OK', recoveryCode: 'WXYZ-2345-ABCD-EFGH-IJKL-MNOP' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('code')?.textContent).toContain('WXYZ-2345-ABCD-EFGH-IJKL-MNOP');
    expect(root.textContent).toContain('el código anterior ya no es válido');
    expect(TestBed.inject(Session).account()).toBeNull();
  });

  it('copies the new code and confirms the copy', async () => {
    const { root, send, fill, fixture } = await setup();
    fill(CODE);
    fixture.detectChanges();
    send();
    http.expectOne(RECOVERY_URL).flush({ message: 'OK', recoveryCode: 'NEW2-NEW2-NEW2-NEW2-NEW2-NEW2' });
    await fixture.whenStable();
    fixture.detectChanges();
    root.querySelectorAll<HTMLButtonElement>('button')[0].click();
    fixture.detectChanges();
    expect(copy).toHaveBeenCalledWith('NEW2-NEW2-NEW2-NEW2-NEW2-NEW2');
    expect(root.textContent).toContain('Código copiado');
  });

  it('shows the recovery rejection, keeps the email and code, and clears the new password', async () => {
    const { root, send, fill, fixture } = await setup();
    fill(CODE);
    fixture.detectChanges();
    send();
    http.expectOne(RECOVERY_URL).flush({ message: 'Datos de recuperación inválidos' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('Datos de recuperación inválidos');
    expect(root.querySelector('code')).toBeNull();
    // The browser sanitizes spaces around a type="email" value, so the input shows the trimmed text.
    expect(root.querySelector<HTMLInputElement>('#recovery-email')!.value).toBe('Camila.Rojas@UPC.edu.pe');
    expect(root.querySelector<HTMLInputElement>('#recovery-code')!.value).toBe(CODE);
    expect(root.querySelector<HTMLInputElement>('#new-password')!.value).toBe('');
    expect(TestBed.inject(Session).account()).toBeNull();
  });

  it('shows 400 field errors under their own control', async () => {
    const { root, send, fill, fixture } = await setup();
    fill(CODE);
    fixture.detectChanges();
    send();
    http.expectOne(RECOVERY_URL).flush(
      { message: 'Datos inválidos', errors: { recoveryCode: 'El código no existe para esta cuenta' } },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.textContent).toContain('El código no existe para esta cuenta');
    expect(root.querySelector('[role=alert]')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('#recovery-code')!.value).toBe(CODE);
  });

  it('keeps the form after a connection failure and resends it with the Reintentar action', async () => {
    const { root, send, fill, fixture } = await setup();
    fill(CODE);
    fixture.detectChanges();
    send();
    http.expectOne(RECOVERY_URL).flush({}, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('No pudimos conectar con el servidor');
    root.querySelector<HTMLButtonElement>('button.retry')!.click();
    fixture.detectChanges();
    const retry = http.expectOne(RECOVERY_URL);
    expect(retry.request.body.newPassword).toBe('Nueva2026');
    retry.flush({ message: 'OK', recoveryCode: 'NEW2-NEW2-NEW2-NEW2-NEW2-NEW2' });
    await fixture.whenStable();
  });

  it('shows the orange weak-password state for a short password and no request is sent', async () => {
    const { root, submit, fill } = await setup();
    fill(CODE, '12345');
    expect(root.querySelector('mat-form-field.auth-field--weak')).not.toBeNull();
    expect(root.textContent).toContain('La contraseña debe contener al menos 8 caracteres, una mayúscula y un número');
    expect(submit().disabled).toBe(true);
    http.expectNone(RECOVERY_URL);
  });

  it('rejects a new password above 72 bytes', async () => {
    const { root, submit, fill } = await setup();
    fill(CODE, `Ab1${'€'.repeat(24)}`);
    expect(root.textContent).toContain('La contraseña no puede superar 72 bytes');
    expect(submit().disabled).toBe(true);
  });
});
