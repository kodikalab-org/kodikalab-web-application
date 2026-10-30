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
    expect(text).toContain('Ingresa un correo válido');
    expect(text).toContain('Crea una contraseña');
    expect(text).toContain('Confirma tu contraseña');
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
