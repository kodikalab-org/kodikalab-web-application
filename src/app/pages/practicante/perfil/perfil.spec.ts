import { TestBed } from '@angular/core/testing';
import { Session } from '../../../core/session';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Perfil } from './perfil';
import { CodeforcesStatsApi, CodeforcesStats } from '../../../core/codeforces-stats-api';
import { ProfileApi } from '../../../core/profile-api';

describe('Perfil', () => {
  async function setup(params: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
      ],
    }).compileComponents();
    TestBed.inject(Session).demo.set('PRACTICANTE');
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root };
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
    TestBed.inject(Session).demo.set(null);
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement, response, load };
  }
  const emptyStats: CodeforcesStats = { linked: true, handle: 'new_handle', problemsSolved: 0,
    maxStreakDays: 0, currentRating: 0, acceptedSubmissions: 0, acceptanceRate: 0,
    activity: [], solvedByRating: [] };

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

  it('opens the "Información personal" tab by default with profile, stats and platforms', async () => {
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
    expect(contenido).toContain('Camila Rojas Vargas');
    expect(contenido).toContain('@camilarojas');
    expect(contenido).toContain('Ingeniería de Software · 5.º ciclo');
    expect(contenido).toContain('Nivel competitivo: Intermedio · Código 20240001');
    expect(contenido).toContain('Estadísticas');
    expect(contenido).toContain('569');
    expect(contenido).toContain('Problemas resueltos');
    expect(contenido).toContain('Actividad de resolución de problemas');
    expect(contenido).toContain('Problemas por rating');
    expect(root.querySelectorAll('a[href="/practicante/plataformas"]').length).toBe(1);
    expect(root.querySelectorAll('li[aria-disabled="true"]').length).toBe(2);
    expect(contenido.match(/En mantenimiento/g)?.length).toBe(2);
    expect(contenido).not.toContain('Aún no vinculas plataformas');
  });

  it('draws one dated cell per day in the annual calendar and labels demo data', async () => {
    const { root } = await setup();
    const days = root.querySelectorAll('.activity-cell:not(.padding)');
    expect([365, 366]).toContain(days.length);
    expect(texto(root)).toContain('Datos de ejemplo');
  });

  it('shows skeletons instead of content while loading (?estado=cargando)', async () => {
    const { root } = await setup({ estado: 'cargando' });
    expect(root.querySelector('#panel-perfil')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelectorAll('.animate-pulse').length).toBe(2);
    expect(texto(root)).not.toContain('Camila Rojas Vargas');
    expect(texto(root)).not.toContain('Problemas resueltos');
  });

  it('shows the empty platforms state with a link to the platforms section of the editor', async () => {
    const { root } = await setup({ estado: 'sin-plataformas' });
    const contenido = texto(root);
    expect(contenido).toContain('Aún no vinculas plataformas');
    expect(contenido).toContain('Vincular plataformas');
    const enlace = [...root.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Vincular plataformas'),
    );
    expect(enlace?.getAttribute('href')).toBe('/perfil/editar#plataformas');
    expect(root.querySelectorAll('a[href="/practicante/plataformas"]').length).toBe(0);
  });

  it('shows the success notice after saving (?estado=actualizado)', async () => {
    const { root } = await setup({ estado: 'actualizado' });
    const aviso = root.querySelector('[role="status"]');
    expect(aviso?.textContent).toContain('Perfil actualizado correctamente');
    expect(aviso?.textContent).toContain('Tus cambios ya están visibles en tu perfil.');
    expect(aviso?.closest('main')).not.toBeNull();
    expect(aviso?.classList.contains('profile-notice')).toBe(true);
    expect(aviso?.classList.contains('absolute')).toBe(false);
  });

  it('uses a full-bleed background and the same fluid layout in the saved state', async () => {
    const { fixture, root } = await setup();
    const fondo = root.querySelector('img[aria-hidden="true"]')!;
    expect(fondo.classList.contains('profile-background')).toBe(true);
    expect(fondo.classList.contains('w-[1440px]')).toBe(false);
    const columnas = root.querySelector('#panel-perfil > div')!.className;
    fixture.destroy();
    TestBed.resetTestingModule();
    const actualizado = await setup({ estado: 'actualizado' });
    expect(actualizado.root.querySelector('#panel-perfil > div')!.className).toBe(columnas);
  });

  it('lists the group requests with their status and filters (?tab=solicitudes)', async () => {
    const { root } = await setup({ tab: 'solicitudes' });
    const contenido = texto(root);
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Solicitudes',
    );
    expect(contenido).toContain('Solicitudes recientes');
    expect(contenido).toContain('Estados: Pendiente · Aceptada · Rechazada · Retirada');
    for (const filtro of ['Todas 6', 'Pendientes 1', 'Aceptadas 3', 'Rechazadas 2']) {
      expect(contenido).toContain(filtro);
    }
    expect(root.querySelector('input[placeholder="Buscar grupo…"]')).not.toBeNull();
    expect(root.querySelectorAll('li.border-b').length).toBe(6);
    expect(contenido).toContain('Algorithms Club (UPC)');
    expect(contenido).toContain('Pendiente');
    expect(contenido).toContain('Mostrando 1–6 de 6 solicitudes');
  });

  it('shows the empty requests state with "Explorar grupos" (?tab=solicitudes&estado=vacio)', async () => {
    const { root } = await setup({ tab: 'solicitudes', estado: 'vacio' });
    const contenido = texto(root);
    expect(contenido).toContain('Aún no has enviado solicitudes');
    expect(contenido).toContain('Explorar grupos');
    expect(root.querySelector('input[placeholder="Buscar grupo…"]')).toBeNull();
    expect(root.querySelectorAll('li.border-b').length).toBe(0);
  });

  it('shows the submissions table with verdicts and filters (?tab=submissions)', async () => {
    const { root } = await setup({ tab: 'submissions' });
    const encabezados = [...root.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
    expect(encabezados).toEqual([
      'Problema',
      'Lenguaje',
      'Veredicto',
      'Tiempo',
      'Memoria',
      'Fecha',
    ]);
    expect(root.querySelectorAll('tbody tr').length).toBe(8);
    const contenido = texto(root);
    for (const veredicto of ['Aceptado', 'Wrong Answer', 'Time Limit']) {
      expect(contenido).toContain(veredicto);
    }
    expect(contenido).toContain('Two Sum');
    expect(contenido).toContain('Mostrando 1–8 de 248 submissions');
    expect(root.querySelectorAll('mat-select').length).toBe(4);
    expect(root.querySelector('input[placeholder="Buscar problema…"]')).not.toBeNull();
  });

  it('shows the empty submissions state with the catalogue button (?tab=submissions&estado=vacio)', async () => {
    const { root } = await setup({ tab: 'submissions', estado: 'vacio' });
    expect(texto(root)).toContain('Aún no tienes submissions');
    expect(texto(root)).toContain('Ir al catálogo de problemas');
    expect(root.querySelector('table')).toBeNull();
  });

  it('shows the general settings with three switches and no recovery code row (?tab=ajustes)', async () => {
    const { root } = await setup({ tab: 'ajustes' });
    const contenido = texto(root);
    for (const titulo of ['Notificaciones', 'Privacidad del perfil', 'Idioma', 'Tema oscuro', 'Cerrar sesión']) {
      expect(contenido).toContain(titulo);
    }
    expect(contenido).not.toContain('Código de recuperación');
    expect(root.querySelectorAll('mat-slide-toggle').length).toBe(3);
    expect(root.querySelectorAll('button[role="switch"][aria-checked="true"]').length).toBe(3);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  for (const estado of ['ver-codigo', 'codigo-recuperacion']) {
    it(`ignores the removed recovery code state ?estado=${estado} in the settings tab`, async () => {
      const { root } = await setup({ tab: 'ajustes', estado });
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(texto(root)).not.toContain('Código de recuperación');
    });
  }

  it('ignores states that do not belong to the active tab', async () => {
    const { root } = await setup({ tab: 'solicitudes', estado: 'cargando' });
    expect(root.querySelector('#panel-perfil')?.getAttribute('aria-busy')).toBe('false');
    expect(texto(root)).toContain('Solicitudes recientes');
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
