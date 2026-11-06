import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
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
    expect(root.querySelector('h1')?.textContent).toContain('Iniciar sesión');
    expect(root.querySelector('.back')).not.toBeNull();
  });

  it('starts with the submit button disabled and no errors shown', async () => {
    const { root, submit } = await setup();
    expect(submit().disabled).toBe(true);
    expect(root.querySelectorAll('mat-error').length).toBe(0);
  });

  it('shows required errors only after touching the fields', async () => {
    const { root, type } = await setup();
    await type('email', '');
    await type('password', '');
    const text = root.textContent ?? '';
    expect(text).toContain('Ingresa tu correo institucional');
    expect(text).toContain('Ingresa tu contraseña');
  });

  it('treats a whitespace-only email as missing', async () => {
    const { root, type } = await setup();
    await type('email', '   ');
    expect(root.textContent).toContain('Ingresa tu correo institucional');
  });

  it('rejects a malformed email', async () => {
    const { root, type } = await setup();
    await type('email', 'camila.rojas@');
    expect(root.textContent).toContain('Ingresa un correo válido, por ejemplo nombre@upc.edu.pe');
  });

  it('rejects an email above 100 characters', async () => {
    const { root, type } = await setup();
    await type('email', `${'a'.repeat(60)}@${'b'.repeat(30)}.${'c'.repeat(20)}.pe`);
    expect(root.textContent).toContain('El correo no puede superar 100 caracteres');
  });

  it('does not trim or reject a password with spaces, but blocks passwords above 72 bytes', async () => {
    const { root, submit, type } = await setup();
    await type('email', 'camila.rojas@upc.edu.pe');
    await type('password', '  Password123  ');
    expect(submit().disabled).toBe(false);
    await type('password', '€'.repeat(25));
    expect(root.textContent).toContain('La contraseña no puede superar 72 bytes');
    expect(submit().disabled).toBe(true);
  });

  it('enables the submit button when the form is valid', async () => {
    const { submit, type } = await setup();
    await type('email', 'camila.rojas@upc.edu.pe');
    await type('password', 'Password123');
    expect(submit().disabled).toBe(false);
  });

  it('toggles the password visibility', async () => {
    const { fixture, root, input } = await setup();
    const toggle = root.querySelector<HTMLButtonElement>('button.toggle')!;
    expect(input('password').type).toBe('password');
    toggle.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input('password').type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
  });
});
