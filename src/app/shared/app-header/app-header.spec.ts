import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Session } from '../../core/session';
import { signIn } from '../../testing/sign-in';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  afterEach(() => TestBed.inject(Session).logout());

  async function render(coach: boolean) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    signIn(coach ? 'COACH' : 'PRACTICANTE');
    const fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('omits the notifications and dark-mode icons', async () => {
    const root = await render(false);
    expect(root.querySelector('img[alt="Notificaciones pendientes"]')).toBeNull();
    expect(root.querySelector('img[alt="Tema oscuro"]')).toBeNull();
  });

  it('renders the user menu', async () => {
    const root = await render(false);
    expect(root.querySelector('app-user-menu')).not.toBeNull();
    expect(root.querySelector('[aria-label="Abrir menú de usuario"]')).not.toBeNull();
  });

  it('links the logo to /coach/inicio for the coach', async () => {
    const root = await render(true);
    expect(root.querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/coach/inicio');
  });

  it('links the logo to /inicio for the practitioner', async () => {
    const root = await render(false);
    expect(root.querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/inicio');
  });
});

describe('AppHeader (única cabecera)', () => {
  afterEach(() => TestBed.inject(Session).logout());
  async function render(coach: boolean) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    signIn(coach ? 'COACH' : 'PRACTICANTE');
    const fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('no tiene controles decorativos como el buscador global', async () => {
    const root = await render(false);
    expect(root.textContent).not.toContain('Búsqueda global');
    expect(root.querySelector('[role="search"], input, kbd')).toBeNull();
  });

  it('usa la misma altura y el mismo ancho para ambos roles', async () => {
    for (const coach of [false, true]) {
      TestBed.resetTestingModule();
      const root = await render(coach);
      expect(root.querySelector('mat-toolbar')?.className).toContain('h-[68px]');
      expect(root.querySelector('mat-toolbar')?.className).toContain('max-w-[1440px]');
      expect(root.querySelector('header')?.className).toContain('sticky');
    }
  });

  it('ofrece el menú móvil de navegación', async () => {
    const root = await render(false);
    expect(root.querySelector('button[aria-label="Abrir menú de navegación"]')).not.toBeNull();
  });
});
