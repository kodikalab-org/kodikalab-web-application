import { TestBed } from '@angular/core/testing';
import { Session } from '../../../core/session';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CoachPerfil } from './perfil';

describe('CoachPerfil', () => {
  async function abrir(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'coach/perfil', component: CoachPerfil }])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('COACH');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, CoachPerfil);
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    await settle();
    const botones = (texto: string) =>
      Array.from(root.querySelectorAll<HTMLElement>('button')).filter((b) =>
        b.textContent?.includes(texto),
      );
    return { root, settle, botones };
  }

  it('shows the personal information tab by default', async () => {
    const { root } = await abrir('/coach/perfil');
    expect(root.querySelector('h1')?.textContent).toContain('Perfil');
    expect(root.textContent).toContain('Marco Paredes');
    expect(root.textContent).toContain('@marcoparedes');
    expect(root.textContent).toContain('Especialidad: Grafos y Programación Dinámica');
    expect(root.textContent).toContain('Mis equipos');
    expect(root.textContent).toContain('Equipo Alfa');
    expect(root.textContent).toContain('14/20 integrantes · Martes y jueves, 7:00 p. m.');
    expect(root.textContent).toContain('Crear equipo');
    expect(root.querySelector('[role="status"]')).toBeNull();
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
    const { root } = await abrir('/coach/perfil');
    const enlaces = root.querySelectorAll('a[href="/coach/perfil/editar"]');
    expect(enlaces.length).toBe(2);
  });

  it('shows the success notice for ?estado=actualizado', async () => {
    const { root } = await abrir('/coach/perfil?estado=actualizado');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Perfil actualizado correctamente',
    );
    expect(root.textContent).toContain('Tus cambios ya están visibles en tu perfil.');
  });

  it('lists the pending requests with Rechazar and Aceptar actions', async () => {
    const { root } = await abrir('/coach/perfil?tab=solicitudes');
    expect(root.textContent).toContain('Solicitudes de ingreso');
    expect(root.textContent).toContain('Pendiente → Aceptada o Rechazada');
    expect(root.textContent).toContain('Pendientes 3');
    expect(root.textContent).toContain('Valeria Núñez');
    expect(root.textContent).toContain('Solicita unirse a Equipo Alfa · Nivel Intermedio');
    expect(root.textContent).toContain('12 oct. 2024');
    expect(root.querySelectorAll('li button[aria-label^="Aceptar a"]').length).toBe(3);
    expect(root.querySelectorAll('li button[aria-label^="Rechazar a"]').length).toBe(3);
    expect(root.textContent).not.toContain('No tienes solicitudes pendientes');
  });

  it('marks a request as Aceptada or Rechazada and updates the pending counter', async () => {
    const { root, settle } = await abrir('/coach/perfil?tab=solicitudes');
    root.querySelector<HTMLButtonElement>('button[aria-label="Aceptar a Valeria Núñez"]')!.click();
    await settle();
    root
      .querySelector<HTMLButtonElement>('button[aria-label="Rechazar a Sebastián Cruz"]')!
      .click();
    await settle();
    const estados = Array.from(root.querySelectorAll('li [role="status"]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(estados).toEqual(['Aceptada', 'Rechazada']);
    expect(root.textContent).toContain('Pendientes 1');
    expect(root.querySelectorAll('li button[aria-label^="Aceptar a"]').length).toBe(1);
  });

  it('shows the empty state for ?tab=solicitudes&estado=vacio', async () => {
    const { root } = await abrir('/coach/perfil?tab=solicitudes&estado=vacio');
    expect(root.textContent).toContain('No tienes solicitudes pendientes');
    expect(root.textContent).toContain(
      'Cuando un practicante solicite unirse a tus equipos, aparecerá aquí para que lo aceptes o lo rechaces.',
    );
    expect(root.querySelectorAll('li button').length).toBe(0);
  });

  it('shows the general settings with toggles, language and logout, without a recovery code row', async () => {
    const { root, botones } = await abrir('/coach/perfil?tab=ajustes');
    const titulos = [
      'Notificaciones',
      'Privacidad del perfil',
      'Idioma',
      'Tema oscuro',
      'Cerrar sesión',
    ];
    for (const titulo of titulos) {
      expect(root.textContent).toContain(titulo);
    }
    const toggles = Array.from(root.querySelectorAll<HTMLButtonElement>('button[role="switch"]'));
    expect(toggles.map((t) => t.getAttribute('aria-checked'))).toEqual(['true', 'false', 'true']);
    expect(root.querySelector('mat-select')?.textContent).toContain('Español');
    expect(root.textContent).not.toContain('Código de recuperación');
    expect(botones('Código no disponible en demo').length).toBe(0);
    expect(root.querySelector('a[href="/login"]')?.textContent).toContain('Cerrar sesión');
  });

  it('flips a settings toggle', async () => {
    const { root, settle } = await abrir('/coach/perfil?tab=ajustes');
    const privacidad = root.querySelector<HTMLButtonElement>(
      'button[aria-label="Privacidad del perfil"]',
    )!;
    privacidad.click();
    await settle();
    expect(privacidad.getAttribute('aria-checked')).toBe('true');
  });
});
