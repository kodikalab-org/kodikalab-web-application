import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { signIn } from '../../../testing/sign-in';
import { CoachPerfil } from './perfil';

const PERFIL = { fullName: 'Ángela Prueba', email: 'coach@example.invalid', especialidadPrincipal: 'Grafos',
  organizacionClub: 'Club de pruebas', aniosExperiencia: 4, presentacion: null };
const GRUPOS = [
  { groupId: 1, name: 'Equipo Uno', description: null, expectedLevel: 'INTERMEDIO', maxCapacity: 20,
    sessionSchedule: 'Lunes 18:00', status: 'ACTIVO', visibility: 'PUBLICO', invitationCode: 'ABC',
    activeMembers: 5, pendingRequests: 2 },
  { groupId: 2, name: 'Equipo Dos', description: null, expectedLevel: 'AVANZADO', maxCapacity: 10,
    sessionSchedule: null, status: 'ACTIVO', visibility: 'PUBLICO', invitationCode: 'DEF',
    activeMembers: 3, pendingRequests: 0 },
];

describe('CoachPerfil', () => {
  async function abrir(url = '/coach/perfil', grupos: unknown[] = GRUPOS, profile: Record<string, unknown> = PERFIL) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'coach/perfil', component: CoachPerfil }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    signIn('COACH', profile);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, CoachPerfil);
    TestBed.inject(HttpTestingController).expectOne(`${TestBed.inject(API_URL)}/teams/me`).flush(grupos);
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    await settle();
    return { root, settle };
  }
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(Session).logout();
  });

  it('shows the account name above a smaller email and uses real initials', async () => {
    const { root } = await abrir();
    expect(root.querySelector('.profile-name')?.textContent?.trim()).toBe('Ángela Prueba');
    expect(root.querySelector('.profile-email')?.textContent?.trim()).toBe('coach@example.invalid');
    expect(root.querySelector('.profile-avatar')?.textContent?.trim()).toBe('ÁP');
  });

  it('shows the profile and the real groups of the coach on the default tab', async () => {
    const { root } = await abrir();
    expect(root.querySelector('h1')?.textContent).toContain('Perfil');
    expect(root.textContent).toContain('Especialidad: Grafos');
    expect(root.textContent).toContain('Club de pruebas');
    expect(root.textContent).toContain('Mis equipos');
    expect(root.textContent).toContain('Equipo Uno');
    expect(root.textContent).toContain('5/20 integrantes · Lunes 18:00');
    expect(root.textContent).toContain('3/10 integrantes · horario por definir');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).not.toBeNull();
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.textContent).not.toMatch(/Marco|Paredes|Equipo Alfa|Equipo Beta/);
  });

  it('totals the real members and pending requests', async () => {
    const { root } = await abrir();
    const valores = Array.from(root.querySelectorAll('ul.flex.list-none.gap-3 li')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(valores).toEqual(['2Equipos a cargo', '8Integrantes activos', '2Solicitudes pendientes']);
  });

  it('shows an honest empty state when the coach has no groups', async () => {
    const { root } = await abrir('/coach/perfil', []);
    expect(root.textContent).toContain('Aún no tienes equipos');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).not.toBeNull();
  });

  it('falls back to the personal information tab for an unknown tab', async () => {
    const { root } = await abrir('/coach/perfil?tab=otra');
    expect(root.textContent).toContain('Mis equipos');
  });

  it('marks the active tab and links every tab through the tab query param', async () => {
    const { root } = await abrir('/coach/perfil?tab=ajustes');
    const pestanias = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Secciones del perfil"] a'),
    );
    expect(pestanias.map((a) => a.getAttribute('href'))).toEqual([
      '/coach/perfil?tab=info',
      '/coach/perfil?tab=solicitudes',
      '/coach/perfil?tab=ajustes',
    ]);
    expect(pestanias.map((a) => a.getAttribute('aria-current'))).toEqual([null, null, 'page']);
  });

  it('links Editar perfil to the edit screen', async () => {
    const { root } = await abrir();
    expect(root.querySelectorAll('a[href="/coach/perfil/editar"]').length).toBe(2);
  });

  it('shows the success notice only when the API confirmed the save', async () => {
    const { root } = await abrir('/coach/perfil?estado=actualizado');
    expect(root.querySelector('[role="status"]')).toBeNull();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'coach/perfil', component: CoachPerfil }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    signIn('COACH', PERFIL);
    TestBed.inject(ProfileApi).message.set('Perfil actualizado.');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/coach/perfil?estado=actualizado', CoachPerfil);
    TestBed.inject(HttpTestingController).expectOne(`${TestBed.inject(API_URL)}/teams/me`).flush([]);
    harness.detectChanges();
    const aviso = (harness.routeNativeElement as HTMLElement).querySelector('[role="status"]');
    expect(aviso?.textContent).toContain('Perfil actualizado correctamente');
    expect(aviso?.textContent).toContain('Tus cambios ya están visibles en tu perfil.');
  });

  it('points to the group management page instead of listing invented requests', async () => {
    const { root } = await abrir('/coach/perfil?tab=solicitudes');
    expect(root.textContent).toContain('Solicitudes de ingreso');
    expect(root.textContent).toContain('Revisa tus solicitudes desde la gestión de grupos');
    expect(root.querySelector('a[href="/coach/grupos/solicitudes"]')).not.toBeNull();
    expect(root.querySelectorAll('li button').length).toBe(0);
    expect(root.textContent).not.toMatch(/Valeria|Sebastián|Ítalo/);
  });

  it('shows the general settings with the language and logout rows, without a recovery code row', async () => {
    const { root } = await abrir('/coach/perfil?tab=ajustes');
    for (const titulo of ['Privacidad del perfil', 'Idioma', 'Cerrar sesión']) {
      expect(root.textContent).toContain(titulo);
    }
    expect(root.textContent).not.toContain('Notificaciones');
    expect(root.textContent).not.toContain('Tema oscuro');
    expect(root.textContent).not.toContain('Código de recuperación');
    expect(root.querySelector('a[href="/login"]')?.textContent).toContain('Cerrar sesión');
  });
});
