import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Registro } from './registro';

describe('Registro', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Registro],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const submit = () => root.querySelector<HTMLButtonElement>('button.submit')!;
    const input = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const type = async (id: string, value: string) => {
      const el = input(id);
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, root, submit, input, type };
  }

  it('keeps the interface in Spanish without a language selector', async () => {
    const { root } = await setup();
    expect(root.querySelector('[aria-label="Idioma"]')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toContain('Crear cuenta');
    expect(root.querySelector('.back')).not.toBeNull();
  });

  it('has a working eye on each password field that shows and hides both of them', async () => {
    const { fixture, root, input } = await setup();
    const eyes = Array.from(root.querySelectorAll<HTMLButtonElement>('button.toggle'));
    expect(eyes).toHaveLength(2);
    // Each field shows a single icon of its own: the eye is a button, not a decorative image.
    expect(root.querySelectorAll('img[matSuffix][src*="eye-off"]')).toHaveLength(0);
    expect(input('password').type).toBe('password');
    expect(eyes[0].getAttribute('aria-label')).toBe('Mostrar contraseñas');
    eyes[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input('password').type).toBe('text');
    expect(input('confirmPassword').type).toBe('text');
    expect(eyes[0].getAttribute('aria-label')).toBe('Ocultar contraseñas');
    expect(eyes[0].getAttribute('aria-pressed')).toBe('true');
    eyes[0].click();
    fixture.detectChanges();
    expect(input('password').type).toBe('password');
    expect(input('confirmPassword').type).toBe('password');
  });

  it('starts with the submit button disabled and no errors shown', async () => {
    const { root, submit } = await setup();
    expect(submit().disabled).toBe(true);
    expect(root.querySelectorAll('mat-error').length).toBe(0);
  });

  it('shows required errors only after touching the fields', async () => {
    const { root, type } = await setup();
    await type('firstName', '');
    await type('lastName', '');
    await type('email', '');
    await type('password', '');
    await type('confirmPassword', '');
    const text = root.textContent ?? '';
    expect(text).toContain('Ingresa tu nombre');
    expect(text).toContain('Ingresa tu apellido');
    expect(text).toContain('Ingresa tu correo institucional');
    expect(text).toContain('Crea una contraseña');
    expect(text).toContain('Confirma tu contraseña');
  });

  it('treats a whitespace-only name as missing', async () => {
    const { root, type } = await setup();
    await type('firstName', '    ');
    expect(root.textContent).toContain('Ingresa tu nombre');
  });

  it('limits each name to 80 characters with its own message', async () => {
    const { root, type } = await setup();
    await type('firstName', 'a'.repeat(81));
    expect(root.textContent).toContain('El nombre no puede superar 80 caracteres');
    await type('firstName', 'Ana');
    await type('lastName', 'b'.repeat(81));
    expect(root.textContent).toContain('El apellido no puede superar 80 caracteres');
  });

  it('rejects a full name above 150 characters and keeps the submit disabled', async () => {
    const { fixture, root, submit, type } = await setup();
    await type('firstName', 'a'.repeat(80));
    await type('lastName', 'b'.repeat(70));
    await type('email', 'camila.rojas@upc.edu.pe');
    await type('password', 'Password123');
    await type('confirmPassword', 'Password123');
    root.querySelector<HTMLElement>('mat-checkbox input')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Nombre y apellido juntos no pueden superar 150 caracteres');
    expect(submit().disabled).toBe(true);
    await type('lastName', 'b'.repeat(69));
    expect(root.textContent).not.toContain('Nombre y apellido juntos');
    expect(submit().disabled).toBe(false);
  });

  it('rejects an email above 100 characters with its own message', async () => {
    const { root, type } = await setup();
    await type('email', `${'a'.repeat(60)}@${'b'.repeat(30)}.${'c'.repeat(20)}.pe`);
    expect(root.textContent).toContain('El correo no puede superar 100 caracteres');
  });

  it('rejects a weak password and mismatched confirmation', async () => {
    const { root, type } = await setup();
    await type('password', 'abc');
    expect(root.textContent).toContain(
      'La contraseña debe contener al menos 8 caracteres, una mayúscula y un número',
    );
    await type('password', 'Password123');
    await type('confirmPassword', 'Password124');
    expect(root.textContent).toContain('Las contraseñas no coinciden');
  });

  it('highlights a weak password in orange but keeps the message as the signal', async () => {
    const { root, type } = await setup();
    await type('password', '12345');
    const field = root.querySelector('mat-form-field.auth-field--weak');
    expect(field).not.toBeNull();
    expect(field?.querySelector('mat-error')?.textContent).toContain(
      'La contraseña debe contener al menos 8 caracteres, una mayúscula y un número',
    );
    await type('password', 'Password123');
    expect(root.querySelector('mat-form-field.auth-field--weak')).toBeNull();
  });

  it('does not use the orange state for an empty password, which keeps its red required message', async () => {
    const { root, type } = await setup();
    await type('password', '');
    expect(root.querySelector('mat-form-field.auth-field--weak')).toBeNull();
    expect(root.textContent).toContain('Crea una contraseña');
  });

  it('rejects a password above 72 UTF-8 bytes even when it meets the policy', async () => {
    const { root, submit, type } = await setup();
    // "Ab1" + 24 euro signs: 27 characters but 75 bytes.
    await type('password', `Ab1${'€'.repeat(24)}`);
    expect(root.textContent).toContain('La contraseña no puede superar 72 bytes');
    expect(root.querySelector('mat-form-field.auth-field--weak')).toBeNull();
    expect(submit().disabled).toBe(true);
    await type('password', `Ab1${'€'.repeat(23)}`);
    expect(root.textContent).not.toContain('La contraseña no puede superar 72 bytes');
  });

  it('enables the submit button when the form is valid', async () => {
    const { fixture, root, submit, type } = await setup();
    await type('firstName', 'Camila');
    await type('lastName', 'Rojas');
    await type('email', 'camila.rojas@upc.edu.pe');
    await type('password', 'Password123');
    await type('confirmPassword', 'Password123');
    expect(submit().disabled).toBe(true);
    root.querySelector<HTMLElement>('mat-checkbox input')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(submit().disabled).toBe(false);
  });
});
