import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { Session } from '../../core/session';
import { signIn } from '../../testing/sign-in';
import { AppShell } from './app-shell';

@Component({ template: '<h1 class="kl-page-title">Página</h1>' })
class Pagina {}

describe('AppShell', () => {
  async function abrir(role: 'PRACTICANTE' | 'COACH') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AppShell, children: [{ path: 'pagina', component: Pagina }] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    signIn(role);
    const harness = await RouterTestingHarness.create('/pagina');
    return harness.routeNativeElement as HTMLElement;
  }
  afterEach(() => TestBed.inject(Session).logout());

  it('dibuja una sola cabecera, el main con la página y el pie', async () => {
    const root = await abrir('PRACTICANTE');
    expect(root.querySelectorAll('header')).toHaveLength(1);
    expect(root.querySelectorAll('main')).toHaveLength(1);
    expect(root.querySelector('main h1')?.textContent).toBe('Página');
    expect(root.querySelector('footer')).not.toBeNull();
    expect(root.querySelector('app-user-menu')).not.toBeNull();
  });

  it('toma el rol de la sesión: practicante', async () => {
    const root = await abrir('PRACTICANTE');
    expect(root.querySelector('header a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/inicio');
    expect(root.querySelector('footer a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/inicio');
  });

  it('toma el rol de la sesión: coach', async () => {
    const root = await abrir('COACH');
    expect(root.querySelector('header a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/coach/inicio');
    expect(root.querySelector('footer a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/coach/inicio');
  });

  it('no incluye icono de notificaciones, conmutador de tema ni buscador', async () => {
    const root = await abrir('PRACTICANTE');
    const etiquetas = Array.from(root.querySelectorAll('[aria-label], [alt]')).map(
      (el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('alt') ?? ''}`.toLowerCase(),
    );
    expect(etiquetas.some((e) => /notificaciones|tema|búsqueda/.test(e))).toBe(false);
  });

  it('ofrece un enlace para saltar al contenido que mueve el foco al main', async () => {
    const root = await abrir('PRACTICANTE');
    const salto = root.querySelector<HTMLAnchorElement>('a[href="#contenido"]')!;
    expect(salto.textContent).toContain('Saltar al contenido');
    salto.click();
    expect(root.querySelector('main')?.id).toBe('contenido');
  });
});
