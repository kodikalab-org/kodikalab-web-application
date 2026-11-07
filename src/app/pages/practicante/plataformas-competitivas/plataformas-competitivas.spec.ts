import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PlataformasCompetitivas } from './plataformas-competitivas';

describe('PlataformasCompetitivas', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: PlataformasCompetitivas }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, PlataformasCompetitivas);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const buttons = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('shows the pending link state by default', async () => {
    const root = await abrir('');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Perfil guardado · Vinculación pendiente',
    );
    expect(root.textContent).toContain('Estado: Pendiente de validación externa');
    expect(buttons(root)).toContain('Reintentar vinculación');
    expect(buttons(root)).toContain('Ver mi perfil');
  });

  it('shows the confirmed state for ?estado=confirmada', async () => {
    const root = await abrir('?estado=confirmada');
    const status = root.querySelector('[role="status"]')!.textContent!;
    expect(status).toContain('Vinculación confirmada');
    expect(status).toContain(
      'Validamos camila_rc en Codeforces. La plataforma quedó vinculada sin modificar los demás datos del perfil.',
    );
    expect(root.textContent).not.toContain('Pendiente de validación externa');
    expect(root.textContent?.match(/Estado:\s*Vinculada/g)?.length).toBe(1);
    expect(root.textContent).toContain('AtCoder · En mantenimiento');
    expect(root.textContent).toContain('VJudge · En mantenimiento');
    expect(buttons(root)).not.toContain('Reintentar vinculación');
    expect(buttons(root)).toContain('Ver mi perfil');
  });
});
