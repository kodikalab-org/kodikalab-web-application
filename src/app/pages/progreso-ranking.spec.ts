import { RenderMode } from '@angular/ssr';
import { serverRoutes } from '../app.routes.server';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Session } from '../core/session';
import { accessGuard } from '../core/access-guard';
import { RendimientoEquipo } from './rendimiento-equipo/rendimiento-equipo';

describe('Interfaces de progreso y ranking', () => {
  it('renders private ranking and team progress only on the client', () => {
    for (const path of ['ranking', 'progreso/equipos']) {
      expect(serverRoutes.find(route => route.path === path)?.renderMode).toBe(RenderMode.Client);
    }
  });
  it('conserva los guards y roles de develop en las cuatro rutas nuevas', () => {
    for (const path of ['progreso', 'ranking', 'progreso/equipos', 'coach/rendimiento']) {
      const route = routes.find((item) => item.path === path)!;
      expect(route.canActivate).toContain(accessGuard);
      expect(route.data?.['role']).toBe(path.startsWith('coach/') ? 'COACH' : 'PRACTICANTE');
    }
    expect(routes.find((route) => route.path === 'grupos')).toBeDefined();
    expect(routes.find((route) => route.path === 'coach/grupos')).toBeDefined();
    expect(routes.at(-1)?.path).toBe('**');
  });

  async function setup(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(Session).startDemo(url.startsWith('/coach/') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    return { harness, root: harness.routeNativeElement! };
  }

  it('muestra el ranking de ejemplo y enlaza a progreso sin simular paginación', async () => {
    const { harness, root } = await setup('/ranking');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(root.textContent).toContain('Mostrando 5 de 14 integrantes');
    expect(root.textContent).toContain('Camila Rojas');
    root.querySelector<HTMLAnchorElement>('a[href="/progreso"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/progreso');
  });

  it('alterna ambos frames de equipo y recupera el ejemplo original al volver', async () => {
    const { harness } = await setup('/progreso/equipos');
    expect(harness.routeNativeElement?.querySelector('tbody tr')?.textContent).toContain(
      'Resuelto',
    );
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/progreso/equipos?equipo=grafos-dp"]')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toContain('Grafos y DP');
    expect(harness.routeNativeElement?.querySelector('tbody tr')?.textContent).toContain(
      'Sin resolver',
    );
    expect(harness.routeNativeElement?.textContent).toContain('30%');
    await harness.navigateByUrl('/progreso/equipos?equipo=alfa');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toContain('Equipo Alfa');
    expect(harness.routeNativeElement?.querySelector('tbody tr')?.textContent).toContain(
      'Resuelto',
    );
    expect(harness.routeNativeElement?.textContent).toContain('50%');
  });

  it('muestra cinco temas de rendimiento y permite seleccionar prioridades sin cambiar métricas', async () => {
    const { harness, root } = await setup('/coach/rendimiento');
    expect(root.querySelectorAll('[role="progressbar"]')).toHaveLength(5);
    root.querySelector<HTMLElement>('[formcontrolname="primero"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const opcion = [...overlay.querySelectorAll<HTMLElement>('mat-option')].find(
      (node) => node.textContent?.trim() === 'Grafos',
    )!;
    opcion.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(root.querySelector('[formcontrolname="primero"]')?.textContent).toContain('Grafos');
    expect(root.textContent).toContain('58%');
    expect(root.textContent).toContain('la selección no se guarda');
  });

  it('valida los campos obligatorios y deshabilita el enlace principal', async () => {
    const { harness, root } = await setup('/coach/rendimiento');
    const pantalla = harness.routeDebugElement!.componentInstance as RendimientoEquipo;
    const form = (pantalla as unknown as { form: RendimientoEquipoForm }).form;
    form.controls.primero.setValue('');
    form.markAllAsTouched();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('Selecciona el primer tema.');
    expect(
      root
        .querySelector('a[aria-describedby="prioridad-pendiente"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
  });
});

// Acceso tipado al formulario protegido únicamente para comprobar su validación.
type RendimientoEquipoForm = import('@angular/forms').FormGroup<{
  primero: import('@angular/forms').FormControl<string>;
  segundo: import('@angular/forms').FormControl<string>;
}>;
