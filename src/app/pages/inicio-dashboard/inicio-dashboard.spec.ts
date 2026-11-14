import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Session } from '../../core/session';
import { API_URL } from '../../core/api';
import { signIn } from '../../testing/sign-in';
import { provideRouter } from '@angular/router';
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
          { path: 'inicio', component: InicioDashboard },
          { path: 'coach/inicio', component: InicioDashboard },
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

  it('links "Resolver problema" to the assigned problems of the practitioner', async () => {
    const { root } = await setup();
    const enlace = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Resolver problema'))!;
    expect(enlace.getAttribute('href')).toBe('/practicante/problemas-asignados');
  });

  it('shows the real memberships of the practitioner instead of sample teams', async () => {
    const { root } = await setup('/inicio', [MEMBRESIA]);
    expect(root.textContent).toContain('Club Real');
    expect(root.textContent).toContain('Miembro');
    expect(root.textContent).not.toContain('Aún no estás en ningún grupo');
    expect(root.textContent).not.toContain('Grafos y DP');
  });

  it('shows real requests and teams for the coach', async () => {
    const { root } = await setup('/coach/inicio', [GRUPO_COACH]);
    expect(root.querySelector('h1')?.textContent).toContain('Hola, usuario@example.com');
    expect(root.textContent).toContain('Grupo Real');
    expect(root.textContent).toContain('3/12 integrantes · Viernes 17:00');
    expect(root.textContent).toContain('Tienes 1 solicitud pendiente de ingreso.');
    expect(root.textContent).not.toMatch(/Valeria|Equipo Beta|Marco|Suma de intervalos/);
  });

  it('offers to create the first group to a coach without groups', async () => {
    const { root } = await setup('/coach/inicio', []);
    expect(root.textContent).toContain('Aún no has creado grupos');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).not.toBeNull();
  });

  it('has no header of its own: the application shell provides it', async () => {
    const { root } = await setup('/coach/inicio');
    expect(root.querySelector('header')).toBeNull();
    expect(root.querySelector('app-header, app-site-footer, mat-toolbar')).toBeNull();
  });

  it('shows the real pending requests of /teams/me in the card and links to the requests page', async () => {
    const { root } = await setup('/coach/inicio', [GRUPO_COACH, { ...GRUPO_COACH, groupId: 5, name: 'Otro Grupo', pendingRequests: 2 }]);
    expect(root.textContent).toContain('Tienes 3 solicitudes pendientes de ingreso.');
    expect(root.textContent).not.toContain('No tienes solicitudes pendientes');
    const enlaces = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="/coach/grupos/solicitudes"]')).map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(expect.arrayContaining([
      '/coach/grupos/solicitudes', '/coach/grupos/solicitudes?grupo=4', '/coach/grupos/solicitudes?grupo=5',
    ]));
  });
});
