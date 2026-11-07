import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it('replaces Problemas with Solicitudes for the coach', async () => {
    const root = await render(true);
    const links = Array.from(root.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Inicio', 'Solicitudes', 'Concursos', 'Grupos', 'Recursos']);
  });
});
