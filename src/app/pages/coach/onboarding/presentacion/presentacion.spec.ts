import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OnboardingPresentacion } from './presentacion';

const TEXTO =
  'Entrenador de maratones ICPC. Trabajo con grafos, programación dinámica y simulacros semanales.';

describe('OnboardingPresentacion', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingPresentacion }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingPresentacion);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { root, settle };
  }

  it('shows step 2 of 2 with an empty counter and the preview placeholder', async () => {
    const { root } = await abrir('');
    expect(root.textContent).toContain('PASO 2 DE 2');
    expect(root.textContent).toContain('0/500');
    expect(root.textContent).toContain('Tu presentación aparecerá aquí.');
    expect(root.querySelector('ol .sr-only')?.textContent).toBe(' (completado)');
    expect(root.textContent).toContain('Omitir por ahora');
  });

  it('mirrors the typed text in the counter and the preview', async () => {
    const { root, settle } = await abrir('');
    const area = root.querySelector<HTMLTextAreaElement>('#presentacion')!;
    area.value = 'Hola';
    area.dispatchEvent(new Event('input'));
    await settle();
    expect(root.textContent).toContain('4/500');
    expect(root.querySelector('section')?.textContent).toContain('Hola');
  });

  it('preloads the text for ?estado=con-texto', async () => {
    const { root } = await abrir('?estado=con-texto');
    expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.value).toBe(TEXTO);
    expect(root.textContent).toContain('95/500');
    expect(root.querySelector('section')?.textContent).toContain(TEXTO);
  });

  it('shows the saving state for ?estado=guardando', async () => {
    const { root } = await abrir('?estado=guardando');
    const busy = root.querySelector<HTMLButtonElement>('button[aria-busy="true"]')!;
    expect(busy.textContent).toContain('Guardando perfil…');
    expect(busy.disabled).toBe(true);
    expect(root.textContent).not.toContain('Omitir por ahora');
    expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.readOnly).toBe(true);
  });
});
