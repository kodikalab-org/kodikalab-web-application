import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../../../core/api';
import { Session } from '../../../core/session';
import { CoachPerfil } from './perfil';

describe('Coach profile with real teams', () => {
  let http: HttpTestingController;
  const team = (groupId: number, name: string, activeMembers: number, pendingRequests: number) => ({
    groupId, name, description: null, expectedLevel: null, maxCapacity: 20, sessionSchedule: null,
    status: 'ACTIVO', visibility: 'PUBLICO', invitationCode: 'A1B2C3D4E5F6', activeMembers, pendingRequests,
  });

  async function open(tab: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'coach/perfil', component: CoachPerfil }]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(Session).account.set({ token: 't', email: 'c@kodikalab.test', role: 'COACH', expiresAt: Date.now() + 60_000 });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/coach/perfil?tab=' + tab);
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    const text = () => root.textContent!.replace(/\s+/g, ' ');
    const teamsRequest = () => http.expectOne(TestBed.inject(API_URL) + '/teams/me');
    return { harness, root, text, teamsRequest };
  }

  afterEach(() => TestBed.inject(Session).logout());

  it('does not claim there are no pending requests before the server answers', async () => {
    const { text } = await open('solicitudes');
    expect(text()).not.toContain('No tienes solicitudes pendientes');
    expect(text()).toContain('Cargando tus equipos');
  });

  it('lists each team with pending requests and links to its review screen', async () => {
    const { harness, root, text, teamsRequest } = await open('solicitudes');
    teamsRequest().flush([team(7, 'Equipo Grafos', 4, 2), team(8, 'Equipo DP', 1, 0)]);
    harness.detectChanges();
    expect(text()).toContain('2 solicitudes pendientes');
    expect(text()).not.toContain('Equipo DP');
    expect(root.querySelector('a[href="/coach/grupos/solicitudes?grupo=7"]')).not.toBeNull();
  });

  it('shows the real teams and their totals', async () => {
    const { harness, text, teamsRequest } = await open('info');
    teamsRequest().flush([team(7, 'Equipo Grafos', 4, 2), team(8, 'Equipo DP', 1, 0)]);
    harness.detectChanges();
    expect(text()).toContain('Equipo Grafos');
    expect(text()).toContain('1/20 integrantes');
    expect(text()).toMatch(/2 ?Equipos a cargo/);
    expect(text()).toMatch(/5 ?Integrantes activos/);
    expect(text()).toMatch(/2 ?Solicitudes pendientes/);
  });

  it('shows an empty state when the coach has no teams', async () => {
    const { harness, text, teamsRequest } = await open('info');
    teamsRequest().flush([]);
    harness.detectChanges();
    expect(text()).toContain('Aún no tienes equipos');
  });

  it('reports a failed load and retries it', async () => {
    const { harness, root, text, teamsRequest } = await open('solicitudes');
    teamsRequest().flush('', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(text()).toContain('No pudimos cargar tus equipos');
    expect(text()).not.toContain('No tienes solicitudes pendientes');
    [...root.querySelectorAll('button')].find((b) => b.textContent!.includes('Reintentar'))!.click();
    teamsRequest().flush([]);
    harness.detectChanges();
    expect(text()).toContain('No tienes solicitudes pendientes');
  });
});
