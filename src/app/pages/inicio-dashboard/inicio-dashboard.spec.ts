import { TestBed } from '@angular/core/testing';
import { Session } from '../../core/session';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { InicioDashboard } from './inicio-dashboard';

describe('InicioDashboard', () => {
  async function setup(url = '/inicio') {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: InicioDashboard, data: { coach: false } },
          { path: 'coach/inicio', component: InicioDashboard, data: { coach: true } },
          { path: 'login', component: InicioDashboard },
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

  it('opens mobile navigation with no links to unavailable screens', async () => {
    const { harness, root } = await setup('/coach/inicio');
    const trigger = root.querySelector<HTMLButtonElement>('[aria-label="Abrir navegación"]')!;
    trigger.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(overlay.querySelector('a[href="/coach/inicio#contenido"]')).not.toBeNull();
    expect(overlay.querySelector('a[href="/coach/inicio#problemas"]')?.textContent).toContain(
      'Solicitudes',
    );
    expect(overlay.textContent).toContain('Recursos · próximamente');
    expect(overlay.querySelector('a[href="/perfil"]')).toBeNull();
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

  it('navigates to a dashboard section while preserving the empty demo', async () => {
    const { harness, root } = await setup('/inicio?estado=nuevo');
    const section = root.querySelector<HTMLElement>('#grupos')!;
    section.scrollIntoView = vi.fn();
    root.querySelector<HTMLAnchorElement>('nav a[href="/inicio?estado=nuevo#grupos"]')!.click();
    await harness.fixture.whenStable();
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(TestBed.inject(Router).url).toBe('/inicio?estado=nuevo#grupos');
    expect(root.textContent).toContain('Aún no estás en ningún grupo');
  });

  it('offers working section shortcuts from notifications', async () => {
    const { harness, root } = await setup('/coach/inicio');
    root.querySelector<HTMLButtonElement>('[aria-label="Notificaciones"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.textContent).toContain('todavía no están conectadas');
    expect(overlay.querySelector('a[href="/coach/inicio#problemas"]')?.textContent).toContain(
      'Revisar solicitudes',
    );
    expect(overlay.querySelector('a[href="/coach/inicio#competencias"]')).not.toBeNull();
  });
});
