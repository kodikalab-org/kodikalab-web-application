import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfigurarAsignacion } from './configurar-asignacion';
import { ElegirDestinatarios } from '../elegir-destinatarios/elegir-destinatarios';

describe('ConfigurarAsignacion', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [ConfigurarAsignacion],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfigurarAsignacion);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const continuar = () =>
      Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Continuar'))!;
    return { fixture, root, continuar };
  }

  it('muestra la competencia, las filas y los destinatarios', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Simulacro semanal');
    expect(root.querySelectorAll('input[formcontrolname="letra"]').length).toBe(4);
    expect(root.querySelector('app-elegir-destinatarios')).not.toBeNull();
  });

  it('permite continuar con los datos de ejemplo', async () => {
    const { continuar } = await setup();
    expect(continuar().getAttribute('aria-disabled')).not.toBe('true');
  });

  it('deshabilita continuar y muestra el error cuando el color es inválido', async () => {
    const { fixture, root, continuar } = await setup();
    const color = root.querySelector<HTMLInputElement>('input[formcontrolname="color"]')!;
    color.value = 'rojo';
    color.dispatchEvent(new Event('input'));
    color.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Usa un color hexadecimal, por ejemplo #FF0000');
    expect(continuar().getAttribute('aria-disabled')).toBe('true');
  });

  it('permite elegir solo algunos integrantes y bloquea continuar si no hay ninguno', async () => {
    const { fixture, root, continuar } = await setup();
    const radios = root.querySelectorAll<HTMLInputElement>('app-elegir-destinatarios input[type="radio"]');
    expect(radios.length).toBe(2);
    radios[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelectorAll('app-elegir-destinatarios mat-checkbox').length).toBe(8);
    expect(root.textContent).toContain('Integrantes elegidos');
    expect(continuar().getAttribute('aria-disabled')).not.toBe('true');

    const destinatarios = fixture.debugElement.query(
      (d) => d.componentInstance instanceof ElegirDestinatarios,
    ).componentInstance as ElegirDestinatarios;
    destinatarios.form.controls.integrantes.controls.forEach((c) => c.setValue(false));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(continuar().getAttribute('aria-disabled')).toBe('true');
  });
});
