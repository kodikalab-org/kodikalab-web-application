import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session';
import { InicioDashboard } from './inicio-dashboard';

const BASE = 'http://localhost:8080/api';

const coachGroup = (groupId: number, overrides: Record<string, unknown> = {}) => ({
  groupId, name: `Equipo ${groupId}`, description: null, expectedLevel: null, maxCapacity: 20,
  sessionSchedule: null, status: 'ACTIVO', visibility: 'PUBLICO', invitationCode: 'A1B2C3D4E5F6',
  activeMembers: 1, pendingRequests: 0, ...overrides,
});
const membership = (groupId: number, status: string, name = `Equipo ${groupId}`) => ({
  groupId, name, description: null, expectedLevel: null, maxCapacity: null, sessionSchedule: null,
  status: 'ACTIVO', visibility: 'PUBLICO',
  membership: { membershipId: groupId, status, teamRole: 'MIEMBRO', joinedAt: null, leftAt: null },
});

describe('InicioDashboard states', () => {
  async function setup(url: string, demo: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: InicioDashboard, data: { coach: false } },
          { path: 'coach/inicio', component: InicioDashboard, data: { coach: true } },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    if (demo) TestBed.inject(Session).demo.set(url.includes('coach') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    const section = (label: string) => root.querySelector(`[aria-label="${label}"]`)!;
    const tiles = () =>
      [...section('Resumen de actividad').querySelectorAll('mat-card')].map((card) =>
        [...card.querySelectorAll('span, strong')]
          .filter((node) => !node.children.length && node.textContent!.trim())
          .map((node) => node.textContent!.trim())
          .join(' '),
      );
    return { harness, root, tiles, section, http: TestBed.inject(HttpTestingController) };
  }
  const retryButton = (root: Element) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar'));
  const fail = { status: 503, statusText: 'Unavailable' };

  afterEach(() => TestBed.inject(Session).logout());

  it('derives the coach demo tiles from the demo data on screen', async () => {
    const { tiles } = await setup('/coach/inicio', true);
    expect(tiles().join('|')).not.toContain('Cargando');
    expect(tiles()[0]).toBe('Equipos a cargo 2 Tus grupos de entrenamiento');
    expect(tiles()[1]).toBe('Integrantes activos 24 En todos tus grupos');
    expect(tiles()[2]).toBe('Solicitudes pendientes 3 Requieren tu respuesta');
    expect(tiles()[3]).toBe('Competencias 3 Programadas');
  });

  it('shows zeros in the coach demo without activity', async () => {
    const { tiles } = await setup('/coach/inicio?estado=nuevo', true);
    expect(tiles().map((t) => / 0 /.test(t))).toEqual([true, true, true, true]);
  });

  it('does not show activity numbers in the practitioner demo without activity', async () => {
    const { tiles } = await setup('/inicio?estado=nuevo', true);
    expect(tiles().join('|')).not.toMatch(/569|1984|vence/);
    expect(tiles()[0]).toBe('Problemas resueltos 0 Empieza con tu primer problema');
  });

  it('shows no fake teams while the real coach groups are loading', async () => {
    const { section, http } = await setup('/coach/inicio', false);
    expect(section('Mis equipos').textContent).not.toContain('Equipo Alfa');
    expect(section('Mis equipos').textContent).toContain('Cargando tus equipos');
    http.expectOne(`${BASE}/teams/me`);
  });

  it('ends a failed coach request in an error state that can be retried', async () => {
    const { harness, root, tiles, section, http } = await setup('/coach/inicio', false);
    http.expectOne(`${BASE}/teams/me`).flush({}, fail);
    harness.detectChanges();
    expect(tiles().join('|')).not.toContain('Cargando');
    expect(tiles()[0]).toBe('Equipos a cargo — No se pudo cargar');
    expect(section('Mis equipos').textContent).not.toContain('Aún no has creado grupos');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar tu actividad');
    retryButton(root)!.click();
    harness.detectChanges();
    http.expectOne(`${BASE}/teams/me`).flush([coachGroup(1)]);
    harness.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(tiles()[0]).toContain('Equipos a cargo 1');
  });

  it('ends a failed practitioner request without endless loading', async () => {
    const { harness, root, tiles, section, http } = await setup('/inicio', false);
    http.expectOne(`${BASE}/teams/me`).flush({}, fail);
    harness.detectChanges();
    expect(tiles().join('|')).not.toContain('Cargando');
    expect(section('Mis grupos').textContent).not.toContain('Aún no estás en ningún grupo');
    expect(retryButton(root)).toBeDefined();
  });

  it('ends a failed assigned problems request in an error state that can be retried', async () => {
    const { harness, root, tiles, http } = await setup('/inicio', false);
    http.expectOne(`${BASE}/teams/me`).flush([membership(1, 'ACTIVO')]);
    http.expectOne(`${BASE}/problems/assigned?teamId=1`).flush({}, fail);
    harness.detectChanges();
    expect(tiles().join('|')).not.toContain('Cargando');
    expect(tiles()[0]).toBe('Problemas resueltos — No se pudo cargar');
    expect(tiles()[3]).toBe('Problemas pendientes — No se pudo cargar');
    expect(tiles()[2]).toContain('Mis grupos 1');
    retryButton(root)!.click();
    http.expectOne(`${BASE}/teams/me`);
  });

  it('counts only open requests as pending memberships', async () => {
    const { harness, tiles, http } = await setup('/inicio', false);
    http.expectOne(`${BASE}/teams/me`).flush([
      membership(1, 'EXPULSADO'), membership(2, 'RECHAZADO'), membership(3, 'PENDIENTE'),
    ]);
    harness.detectChanges();
    expect(tiles()[2]).toBe('Mis grupos 3 0 activos · 1 pendiente');
  });

  it('does not invent a competition count or deny real pending requests', async () => {
    const { harness, tiles, section, http } = await setup('/coach/inicio', false);
    http.expectOne(`${BASE}/teams/me`).flush([coachGroup(1, { pendingRequests: 1 })]);
    harness.detectChanges();
    expect(tiles()[3]).toBe('Competencias — Pendiente de integración');
    const requests = section('Solicitudes pendientes').textContent!;
    expect(requests).not.toContain('No tienes solicitudes pendientes');
    expect(requests).toContain('Tienes 1 solicitud pendiente');
  });
});
