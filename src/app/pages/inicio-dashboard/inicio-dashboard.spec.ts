import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Session } from '../../core/session';
import { API_URL } from '../../core/api';
import { signIn } from '../../testing/sign-in';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InicioDashboard } from './inicio-dashboard';

const GRUPO_COACH = { groupId: 4, name: 'Grupo Real', description: null, expectedLevel: 'INTERMEDIO', maxCapacity: 12,
  sessionSchedule: 'Viernes 17:00', status: 'ACTIVO', visibility: 'PUBLICO', invitationCode: 'XYZ',
  activeMembers: 3, pendingRequests: 1 };
const MEMBRESIA = { groupId: 9, name: 'Club Real', description: null, expectedLevel: 'AVANZADO', maxCapacity: 10,
  sessionSchedule: null, status: 'ACTIVO', visibility: 'PUBLICO',
  membership: { membershipId: 1, status: 'ACTIVO', teamRole: 'MIEMBRO', joinedAt: '2026-10-01T18:00:00Z', leftAt: null } };

describe('InicioDashboard', () => {
  async function setup(url = '/inicio', mine: unknown[] = []) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: InicioDashboard, data: { coach: false } },
          { path: 'coach/inicio', component: InicioDashboard, data: { coach: true } },
          { path: 'login', component: InicioDashboard },
          { path: 'grupos', component: InicioDashboard },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    signIn(url.includes('coach') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${TestBed.inject(API_URL)}/teams/me`).flush(mine);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, root: harness.routeNativeElement!, http };
  }
  afterEach(() => {
    TestBed.inject(HttpTestingController).match(() => true);
    TestBed.inject(Session).logout();
  });

  it('greets the signed-in account and shows honest empty states for a new practitioner', async () => {
    const { root } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('Hola, usuario@example.com');
    expect(root.textContent).toContain('Aún no tienes problemas asignados');
    expect(root.textContent).toContain('Aún no estás en ningún grupo');
    expect(root.textContent).toContain('2 de 4 pasos completados');
    expect(root.querySelectorAll('[role="progressbar"]').length).toBe(0);
    expect(root.textContent).not.toMatch(/569|Suma de intervalos|Camila|Equipo Alfa|Demostración|demo/i);
  });

  it('shows the real memberships of the practitioner instead of sample teams', async () => {
    const { root } = await setup('/inicio', [MEMBRESIA]);
    expect(root.textContent).toContain('Club Real');
    expect(root.textContent).toContain('Miembro');
    expect(root.textContent).not.toContain('Aún no estás en ningún grupo');
    expect(root.textContent).not.toContain('Grafos y DP');
  });

  it('shows empty requests and real teams for the coach', async () => {
    const { root } = await setup('/coach/inicio', [GRUPO_COACH]);
    expect(root.querySelector('h1')?.textContent).toContain('Hola, usuario@example.com');
    expect(root.textContent).toContain('Grupo Real');
    expect(root.textContent).toContain('3/12 integrantes · Viernes 17:00');
    expect(root.textContent).toContain('No tienes solicitudes pendientes');
    expect(root.textContent).not.toMatch(/Valeria|Equipo Beta|Marco|Suma de intervalos/);
  });

  it('offers to create the first group to a coach without groups', async () => {
    const { root } = await setup('/coach/inicio', []);
    expect(root.textContent).toContain('Aún no has creado grupos');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).not.toBeNull();
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

  it('styles the user menu on the overlay panel without demo entries', async () => {
    const { harness, root } = await setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Abrir menú de usuario"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const panel = overlay.querySelector('.mat-mdc-menu-panel')!;
    expect(panel.classList.contains('bg-kl-surface')).toBe(true);
    expect(panel.classList.contains('border-kl-border-strong')).toBe(true);
    expect(panel.classList.contains('rounded-2xl')).toBe(true);
    expect(panel.querySelector('[role="note"]')?.textContent).toContain('Practicante');
    expect(overlay.querySelector('a[href*="estado=nuevo"], a[href^="/demo"]')).toBeNull();
  });

  it('opens the existing groups interface instead of a dashboard fragment', async () => {
    const { harness, root } = await setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Abrir accesos rápidos"]')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLAnchorElement>('a[href="/grupos"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/grupos');
  });
});
