import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OnboardingCompletado } from './completado';

describe('OnboardingCompletado', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingCompletado }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingCompletado);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('shows the success message with the Codeforces rating by default', async () => {
    const root = await abrir('');
    expect(root.querySelector('h1')?.textContent).toContain('¡Tu perfil está listo, Camila!');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Perfil actualizado correctamente',
    );
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Detectamos tu rating de Codeforces: 1432.',
    );
    expect(root.textContent).toContain('Codeforces: camila_cf · rating 1432');
  });

  it('keeps the "(completado)" suffix of the three steps for screen readers only', async () => {
    const root = await abrir('');
    const hidden = Array.from(root.querySelectorAll('ol .sr-only'));
    expect(hidden.length).toBe(3);
    for (const sr of hidden) {
      expect(sr.textContent).toBe(' (completado)');
    }
  });

  it('shows the Codeforces warning for ?estado=aviso-codeforces', async () => {
    const root = await abrir('?estado=aviso-codeforces');
    const status = root.querySelector('[role="status"]')!.textContent!;
    expect(status).toContain('Perfil actualizado, pero Codeforces no confirmó el identificador');
    expect(status).toContain(
      'Se conservaron los datos previos de Codeforces. Puedes corregirlo después desde tu perfil.',
    );
    expect(root.textContent).toContain('Codeforces sin vincular');
    expect(root.textContent).not.toContain('rating 1432');
  });
});
