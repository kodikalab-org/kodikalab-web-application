import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegistroProblemasResueltos } from './registro-problemas-resueltos';

describe('RegistroProblemasResueltos', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [RegistroProblemasResueltos],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(RegistroProblemasResueltos);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const registrar = () =>
      Array.from(root.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Registrar como resuelto'),
      )!;
    return { fixture, root, registrar };
  }

  it('muestra el formulario con el código de ejemplo y permite registrar', async () => {
    const { root, registrar } = await setup();
    expect(root.textContent).toContain('Registrar solución');
    expect(root.querySelector('textarea')).not.toBeNull();
    expect(registrar().getAttribute('aria-disabled')).not.toBe('true');
  });

  it('muestra el error y bloquea el registro cuando falta el código', async () => {
    const { fixture, root, registrar } = await setup();
    const codigo = root.querySelector<HTMLTextAreaElement>('textarea')!;
    codigo.value = '';
    codigo.dispatchEvent(new Event('input'));
    codigo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Pega el código de tu solución');
    expect(registrar().getAttribute('aria-disabled')).toBe('true');
  });

  it('emite cancelar al pulsar Cancelar', async () => {
    const { fixture, root } = await setup();
    let emitido = false;
    fixture.componentInstance.cancelar.subscribe(() => (emitido = true));
    const cancelar = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancelar'),
    )!;
    cancelar.click();
    expect(emitido).toBe(true);
  });
});
