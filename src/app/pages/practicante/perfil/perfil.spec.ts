import { TestBed } from '@angular/core/testing';
import { Session } from '../../../core/session';
import { signIn } from '../../../testing/sign-in';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Perfil } from './perfil';
import { CodeforcesStatsApi, CodeforcesStats } from '../../../core/codeforces-stats-api';
import { ProfileApi } from '../../../core/profile-api';

const emptyStats: CodeforcesStats = { linked: true, handle: 'new_handle', problemsSolved: 0,
  maxStreakDays: 0, currentRating: 0, acceptedSubmissions: 0, acceptanceRate: 0,
  activity: [], solvedByRating: [] };

const PERFIL = { fullName: 'Ana María Núñez', email: 'usuario@example.com', codigoEstudiante: 'TEST001',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO', district: 'San Miguel',
  goal: 'Clasificar a competencias', codeforcesHandle: 'ana_cf', codeforcesRating: 1432,
  atcoderHandle: null, vjudgeHandle: null };

describe('Perfil', () => {
  async function setup(params: Record<string, string> = {}, profile: Record<string, unknown> = PERFIL) {
    const load = vi.fn().mockReturnValue(of(emptyStats));
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
        { provide: CodeforcesStatsApi, useValue: { load } },
      ],
    }).compileComponents();
    signIn('PRACTICANTE', profile);
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, load };
  }

  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('pins the outer toolbar with important utilities and no scroll-container ancestor', async () => {
    const { root } = await setup();
    const toolbar = root.querySelector('mat-toolbar')!;
    for (const utility of ['sticky', 'top-0', 'z-40', 'backdrop-blur-xl']) {
      expect(toolbar.classList.contains(utility)).toBe(true);
    }
    expect(toolbar.classList.contains('relative')).toBe(false);
    expect(toolbar.classList.contains('z-10')).toBe(false);
    expect(toolbar.parentElement!.classList.contains('overflow-clip')).toBe(true);
    expect(toolbar.closest('.overflow-hidden')).toBeNull();
    expect(root.querySelector('app-header-navigation')?.classList.contains('sticky')).toBe(false);
  });

  async function setupLive() {
    const response = new Subject<CodeforcesStats>();
    const load = vi.fn().mockReturnValue(response);
    await TestBed.configureTestingModule({ imports: [Perfil], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      { provide: CodeforcesStatsApi, useValue: { load } },
    ] }).compileComponents();
    signIn('PRACTICANTE', PERFIL);
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement, response, load };
  }

  it('shows the real account name prominently, email separately and matching initials', async () => {
    const { fixture, root } = await setupLive();
    TestBed.inject(ProfileApi).profile.set({ fullName: 'Ana María Núñez', email: 'student@example.invalid',
      role: 'PRACTICANTE', codigoEstudiante: 'TEST001', carrera: 'Ingeniería de Software', cicloAcademico: 5,
      nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: null, codeforcesRating: null,
      atcoderHandle: null, vjudgeHandle: null });
    await fixture.whenStable();
    expect(root.querySelector('.profile-name')?.textContent?.trim()).toBe('Ana María Núñez');
    expect(root.querySelector('.profile-name')?.textContent).not.toContain('@');
    expect(root.querySelector('.profile-email')?.textContent?.trim()).toBe('student@example.invalid');
    expect(root.querySelector('.profile-email')?.classList.contains('text-[12px]')).toBe(true);
    expect(root.querySelector('.profile-avatar')?.textContent?.trim()).toBe('AN');
  });

  it('does not promote email to a name while an older backend omits fullName', async () => {
    const { fixture, root } = await setupLive();
    TestBed.inject(ProfileApi).profile.set({ email: 'not.a.name@example.invalid', role: 'PRACTICANTE',
      codigoEstudiante: 'TEST002', carrera: 'Ingeniería de Software', cicloAcademico: 5,
      nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: null, codeforcesRating: null,
      atcoderHandle: null, vjudgeHandle: null });
    await fixture.whenStable();
    expect(root.querySelector('.profile-name')?.textContent?.trim()).toBe('Practicante');
    expect(root.querySelector('.profile-email')?.textContent?.trim()).toBe('not.a.name@example.invalid');
  });

  it('renders a real loading skeleton without demo numbers', async () => {
    const { root } = await setupLive();
    expect(root.querySelector('[aria-labelledby="titulo-estadisticas"]')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('.animate-pulse')).not.toBeNull();
    expect(texto(root)).not.toContain('569');
  });

  it('offers linking when the server reports no Codeforces handle', async () => {
    const { fixture, root, response } = await setupLive();
    response.next({ ...emptyStats, linked: false, handle: null });
    await fixture.whenStable();
    expect(texto(root)).toContain('Vincula tu usuario de Codeforces');
    expect(root.querySelector('a[fragment="plataformas"]')).not.toBeNull();
    expect(texto(root)).not.toContain('Problemas resueltos');
  });

  it('shows genuine zero stats for a linked account without accepted submissions', async () => {
    const { fixture, root, response } = await setupLive();
    response.next(emptyStats);
    await fixture.whenStable();
    expect(texto(root)).toContain('Aún no hay envíos aceptados');
    expect(texto(root)).toContain('0 días');
    expect(texto(root)).toContain('0.0 % de aceptación');
    expect(texto(root)).not.toContain('569');
  });

  it('renders backend counts and exact rating buckets including unrated', async () => {
    const { fixture, root, response } = await setupLive();
    response.next({ ...emptyStats, problemsSolved: 519, maxStreakDays: 10, currentRating: 1339,
      acceptedSubmissions: 600, acceptanceRate: 45.25,
      solvedByRating: [{ rating: 0, count: 7 }, { rating: 1350, count: 4 }] });
    await fixture.whenStable();
    expect(texto(root)).toContain('519');
    expect(texto(root)).toContain('10 días');
    expect(texto(root)).toContain('1339');
    expect(texto(root)).toContain('Sin rating');
    expect(texto(root)).toContain('1350');
    expect(texto(root)).not.toContain('Top 12');
  });

  it('shows a retry alert on an unavailable service and recovers', async () => {
    const { fixture, root, response, load } = await setupLive();
    response.error({ status: 503 });
    await fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar');
    load.mockReturnValue(of(emptyStats));
    const retry = [...root.querySelectorAll('button')].find(button => button.textContent?.includes('Reintentar'))!;
    retry.click();
    await fixture.whenStable();
    expect(load).toHaveBeenCalledTimes(2);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(texto(root)).toContain('Aún no hay envíos aceptados');
  });

  it('opens the "Información personal" tab by default with the profile from the API', async () => {
    const { root } = await setup();
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Información personal',
      'Solicitudes',
      'Submissions',
      'Ajustes generales',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    const contenido = texto(root);
    expect(contenido).toContain('Ana María Núñez');
    expect(contenido).toContain('Ingeniería de Software · 5.º ciclo');
    expect(contenido).toContain('INTERMEDIO · TEST001');
    expect(contenido).toContain('Clasificar a competencias');
    expect(contenido).toContain('Estadísticas');
    expect(contenido).toContain('ana_cf');
    expect(root.querySelectorAll('a[href="/perfil/editar#plataformas"]').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('a[href="/practicante/plataformas"]').length).toBe(0);
    expect(root.querySelectorAll('li[aria-disabled="true"]').length).toBe(2);
    expect(contenido.match(/En mantenimiento/g)?.length).toBe(2);
    expect(contenido).not.toContain('Aún no vinculas plataformas');
    expect(contenido).not.toMatch(/Camila|569|Datos de ejemplo|Demostración/);
  });

  it('shows the empty platforms state with a link to the platforms section of the editor', async () => {
    const { root } = await setup({}, { ...PERFIL, codeforcesHandle: null });
    const contenido = texto(root);
    expect(contenido).toContain('Aún no vinculas plataformas');
    expect(contenido).toContain('Vincular plataformas');
    const enlace = [...root.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Vincular plataformas'),
    );
    expect(enlace?.getAttribute('href')).toBe('/perfil/editar#plataformas');
  });

  it('keeps empty fields instead of sample values when there is no profile yet', async () => {
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: CodeforcesStatsApi, useValue: { load: vi.fn().mockReturnValue(of(emptyStats)) } }],
    }).compileComponents();
    TestBed.inject(Session).restore();
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    expect(texto(fixture.nativeElement)).not.toMatch(/Camila|Rojas|Ingeniería|San Miguel|20240001/);
  });

  it('shows the success notice after saving (?estado=actualizado)', async () => {
    const { fixture, root } = await setup({ estado: 'actualizado' });
    expect(root.querySelector('[role="status"].profile-notice')).toBeNull();
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ estado: 'actualizado' })) } },
        { provide: CodeforcesStatsApi, useValue: { load: vi.fn().mockReturnValue(of(emptyStats)) } }],
    }).compileComponents();
    signIn('PRACTICANTE', PERFIL);
    TestBed.inject(ProfileApi).message.set('Perfil guardado.');
    const guardado = TestBed.createComponent(Perfil);
    await guardado.whenStable();
    const aviso = (guardado.nativeElement as HTMLElement).querySelector('[role="status"].profile-notice');
    expect(aviso?.textContent).toContain('Perfil actualizado correctamente');
    expect(aviso?.textContent).toContain('Perfil guardado.');
    expect(aviso?.closest('main')).not.toBeNull();
    expect(aviso?.classList.contains('absolute')).toBe(false);
  });

  it('uses a full-bleed background', async () => {
    const { root } = await setup();
    const fondo = root.querySelector('img[aria-hidden="true"]')!;
    expect(fondo.classList.contains('profile-background')).toBe(true);
    expect(fondo.classList.contains('w-[1440px]')).toBe(false);
  });

  it('shows an honest empty state for the requests tab with a link to the groups', async () => {
    const { root } = await setup({ tab: 'solicitudes' });
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Solicitudes');
    expect(texto(root)).toContain('Tus solicitudes aún no están disponibles aquí');
    expect(root.querySelector('main a[href="/grupos?tab=mis-grupos"]')).not.toBeNull();
    expect(root.querySelectorAll('li.border-b').length).toBe(0);
    expect(root.querySelector('input[placeholder="Buscar grupo…"]')).toBeNull();
    expect(texto(root)).not.toMatch(/Algorithms Club|Latin Coders/);
  });

  it('shows an honest empty state for the submissions tab without a fake table', async () => {
    const { root } = await setup({ tab: 'submissions' });
    expect(texto(root)).toContain('Tus submissions aún no están disponibles aquí');
    expect(root.querySelector('table')).toBeNull();
    expect(texto(root)).not.toMatch(/Two Sum|248 submissions/);
  });

  it('shows the general settings with one switch and no recovery code row (?tab=ajustes)', async () => {
    const { root } = await setup({ tab: 'ajustes' });
    const contenido = texto(root);
    for (const titulo of ['Privacidad del perfil', 'Idioma', 'Cerrar sesión']) {
      expect(contenido).toContain(titulo);
    }
    expect(contenido).not.toContain('Código de recuperación');
    expect(root.querySelectorAll('mat-slide-toggle').length).toBe(1);
    expect(contenido).not.toContain('Notificaciones');
    expect(contenido).not.toContain('Tema oscuro');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ignores states that do not belong to the active tab', async () => {
    const { root } = await setup({ tab: 'solicitudes', estado: 'actualizado' });
    expect(root.querySelector('.profile-notice')).toBeNull();
    expect(texto(root)).toContain('Tus solicitudes aún no están disponibles aquí');
  });

  it('falls back to the first tab when the tab is unknown', async () => {
    const { root } = await setup({ tab: 'inexistente' });
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Información personal',
    );
  });

  it('links the view toggle to the profile and to the editor', async () => {
    const { root } = await setup();
    const enlaces = [...root.querySelectorAll('nav[aria-label="Vista del perfil"] a')];
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/perfil', '/perfil/editar']);
    expect(enlaces[0].getAttribute('aria-current')).toBe('page');
  });
});
