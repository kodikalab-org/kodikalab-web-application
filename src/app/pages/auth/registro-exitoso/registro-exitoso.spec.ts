import { TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideRouter } from '@angular/router';
import { Session } from '../../../core/session';
import { RegistroExitoso } from './registro-exitoso';

describe('RegistroExitoso', () => {
  function setup(copied = true, withRegistration = true) {
    const copy = vi.fn(() => copied);
    TestBed.configureTestingModule({
      imports: [RegistroExitoso],
      providers: [provideRouter([]), { provide: Clipboard, useValue: { copy } }],
    });
    if (withRegistration) {
      TestBed.inject(Session).registration.set({
        message: 'Registro exitoso', email: 'camila.rojas@upc.edu.pe', role: 'PRACTICANTE',
        recoveryCode: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX',
      });
    }
    const fixture = TestBed.createComponent(RegistroExitoso);
    const root = fixture.nativeElement as HTMLElement;
    const continueButton = () => root.querySelector<HTMLButtonElement>('button.auth-submit')!;
    const confirm = () => {
      root.querySelector<HTMLElement>('mat-checkbox input')!.click();
      fixture.detectChanges();
    };
    return { fixture, root, copy, continueButton, confirm };
  }

  it('confirms the registration and shows the recovery code once', async () => {
    const { fixture, root } = setup();
    await fixture.whenStable();
    expect(root.querySelector('[role=status]')?.textContent).toContain('Registro exitoso');
    expect(root.querySelector('code')?.textContent).toBe('ABCD-EFGH-IJKL-MNOP-QRST-UVWX');
    expect(root.textContent).toContain('Ya guardé mi código de recuperación');
  });

  it('keeps the continue action disabled until the user confirms the code is saved', async () => {
    const { fixture, continueButton, confirm } = setup();
    await fixture.whenStable();
    expect(continueButton().disabled).toBe(true);
    confirm();
    expect(continueButton().disabled).toBe(false);
  });

  it('copies the code and confirms the copy', async () => {
    const { fixture, root, copy } = setup(true);
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(copy).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP-QRST-UVWX');
    expect(root.textContent).toContain('Código copiado');
  });

  it('tells the user to copy by hand when the clipboard is unavailable', async () => {
    const { fixture, root } = setup(false);
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(root.textContent).toContain('No se pudo copiar');
  });

  it('shows a clear empty state with a sign-in link when there is no registration in memory', async () => {
    const { fixture, root } = setup(true, false);
    await fixture.whenStable();
    expect(root.textContent).toContain('Confirmación no disponible');
    expect(root.querySelector('code')).toBeNull();
    expect(root.querySelector<HTMLAnchorElement>('a[href="/login"]')).not.toBeNull();
  });
});
