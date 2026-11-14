import { TestBed } from '@angular/core/testing';
import { ProfileApi } from '../../../../core/profile-api';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OnboardingPresentacion } from './presentacion';

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

  it('ignores ?estado= and never preloads a sample presentation', async () => {
    for (const estado of ['con-texto', 'guardando']) {
      const { root } = await abrir(`?estado=${estado}`);
      expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.value).toBe('');
      expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.readOnly).toBe(false);
      expect(root.querySelector('button[aria-busy="true"]')).toBeNull();
      expect(root.textContent).not.toMatch(/ICPC|Marco|Club de Programación/);
      TestBed.resetTestingModule();
    }
  });

  it('builds the preview summary from the draft of the previous step', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingPresentacion }])],
    }).compileComponents();
    TestBed.inject(ProfileApi).coach = { especialidad: 'Grafos', organizacion: 'Club de pruebas', anios: 3 };
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla', OnboardingPresentacion);
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Coach · Grafos · Club de pruebas · 3 años');
  });
});
