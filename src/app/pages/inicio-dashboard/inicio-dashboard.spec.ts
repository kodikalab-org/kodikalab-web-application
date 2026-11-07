import { TestBed } from '@angular/core/testing';
import { Session } from '../../core/session';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InicioDashboard } from './inicio-dashboard';

describe('InicioDashboard', () => {
  async function setup(url = '/inicio') {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: InicioDashboard, data: { coach: false } },
          { path: 'coach/inicio', component: InicioDashboard, data: { coach: true } },
          { path: 'login', component: InicioDashboard },
          { path: 'grupos', component: InicioDashboard },
        ]),
      ],
    }).compileComponents();
    TestBed.inject(Session).demo.set(url.includes('coach') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    return { harness, root: harness.routeNativeElement! };
  }

  it('shows the practitioner activity and fixed progress data', async () => {
    const { root } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('Hola, Camila');
    expect(root.textContent).toContain('569');
    expect(root.textContent).toContain('Suma de intervalos');
    expect(root.querySelectorAll('[role="progressbar"]').length).toBe(4);
  });

  it('shows coach requests and teams without changing demo data', async () => {
    const { root } = await setup('/coach/inicio');
    expect(root.querySelector('h1')?.textContent).toContain('Hola, Marco');
    expect(root.textContent).toContain('Valeria Núñez');
    expect(root.textContent).toContain('Equipo Beta');
    expect(root.textContent).not.toContain('Suma de intervalos');
  });

  it('shows both empty variants on the same routes', async () => {
    const { harness, root } = await setup('/inicio?estado=nuevo');
    expect(root.textContent).toContain('Aún no tienes problemas asignados');
    expect(root.textContent).toContain('2 de 4 pasos completados');
    expect(root.querySelectorAll('[role="progressbar"]').length).toBe(0);
    await harness.navigateByUrl('/coach/inicio?estado=nuevo');
    expect(harness.routeNativeElement?.textContent).toContain('Aún no has creado grupos');
    expect(harness.routeNativeElement?.textContent).toContain('No tienes solicitudes pendientes');
  });

  it('updates the demo through the user menu without recreating the route', async () => {
    const { harness, root } = await setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Abrir menú de usuario"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const demo = overlay.querySelector<HTMLAnchorElement>('a[href="/inicio?estado=nuevo"]')!;
    expect(demo).not.toBeNull();
    demo.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/inicio?estado=nuevo');
    expect(root.textContent).toContain('Aún no tienes problemas asignados');
  });

  it('has no sidebar and keeps the Figma header links', async () => {
    const { root } = await setup('/coach/inicio');
    expect(root.querySelector('[aria-label="Abrir sidebar de la aplicación"]')).toBeNull();
    expect(root.querySelector('[aria-controls="app-sidebar"]')).toBeNull();
    expect(root.querySelector('nav[aria-label="Navegación principal"] a[href="/grupos"]')).not.toBeNull();
    expect(root.querySelector('nav[aria-label="Navegación principal"] a[href="/recursos"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Estado de la aplicación"]')).toBeNull();
  });

  it('keeps the header sticky above the content', async () => {
    const { root } = await setup();
    expect(root.querySelector('header')?.classList.contains('sticky')).toBe(true);
    expect(root.querySelector('header')?.classList.contains('top-0')).toBe(true);
  });

  it('styles the user menu on the overlay panel instead of relying on host inheritance', async () => {
    const { harness, root } = await setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Abrir menú de usuario"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const panel = TestBed.inject(OverlayContainer)
      .getContainerElement()
      .querySelector('.mat-mdc-menu-panel')!;
    expect(panel.classList.contains('bg-kl-surface')).toBe(true);
    expect(panel.classList.contains('border-kl-border-strong')).toBe(true);
    expect(panel.classList.contains('rounded-2xl')).toBe(true);
    expect(panel.querySelector('[role="note"]')?.textContent).toContain('Practicante');
  });

  it('opens the existing groups interface instead of a dashboard fragment', async () => {
    const { harness, root } = await setup('/inicio?estado=nuevo');
    root.querySelector<HTMLButtonElement>('[aria-label="Abrir accesos rápidos"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLAnchorElement>('a[href="/grupos"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/grupos');
    expect(TestBed.inject(Session).demo()).toBe('PRACTICANTE');
  });
});
