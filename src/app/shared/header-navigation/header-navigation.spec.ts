import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HeaderNavigation } from './header-navigation';

describe('HeaderNavigation', () => {
  async function render(coach: boolean) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeaderNavigation);
    fixture.componentRef.setInput('coach', coach);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the five header links and no sidebar or hamburger button', async () => {
    const root = await render(false);
    const links = Array.from(root.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos']);
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('[aria-controls="app-sidebar"]')).toBeNull();
    expect(root.textContent).not.toContain('☰');
  });

  it('shows the same five labels for the coach, each with a real route', async () => {
    const root = await render(true);
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/coach/inicio', '/coach/problemas-asignados', '/coach/concursos', '/grupos', '/recursos',
    ]);
  });

  it('points the practitioner links to their pages instead of dashboard fragments', async () => {
    const root = await render(false);
    const hrefs = Array.from(root.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/inicio', '/practicante/problemas-asignados', '/concursos', '/grupos', '/recursos']);
  });

  it('keeps Problemas and Concursos active on their sub-routes but Inicio only on its own URL', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(HeaderNavigation);
    await router.navigateByUrl('/concursos/3/5');
    await fixture.whenStable();
    fixture.detectChanges();
    const active = (label: string) =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).find((a) => a.textContent?.trim() === label)!.classList.contains('text-kl-accent-text');
    expect(active('Concursos')).toBe(true);
    expect(active('Problemas')).toBe(false);
    await router.navigateByUrl('/inicio/otra');
    fixture.detectChanges();
    expect(active('Inicio')).toBe(false);
    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    expect(active('Inicio')).toBe(true);
  });
});
