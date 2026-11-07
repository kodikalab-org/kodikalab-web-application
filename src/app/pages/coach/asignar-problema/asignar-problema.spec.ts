import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AsignarProblema } from './asignar-problema';

describe('AsignarProblema', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AsignarProblema],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AsignarProblema);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra el catálogo con datos fijos y el paso actual', async () => {
    const { root } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('Asignar problemas');
    expect(root.querySelectorAll('tbody tr').length).toBe(8);
    expect(root.querySelector('[aria-current="step"]')?.textContent).toContain(
      'Seleccionar problemas',
    );
  });

  it('enlaza al siguiente paso y a los problemas asignados', async () => {
    const { root } = await setup();
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema/configurar');
    expect(hrefs).toContain('/coach/problemas-asignados');
  });

  it('muestra un error si la búsqueda supera 100 caracteres', async () => {
    const { fixture, root } = await setup();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'a'.repeat(101);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Usa como máximo 100 caracteres');
  });
});
