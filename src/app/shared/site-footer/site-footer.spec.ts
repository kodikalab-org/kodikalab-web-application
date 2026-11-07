import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { navigationFor } from '../../core/navigation';
import { FooterAudience, SiteFooter, footerColumns } from './site-footer';

describe('SiteFooter', () => {
  async function render(audience: FooterAudience, variant: 'full' | 'compact' = 'full') {
    await TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.componentRef.setInput('audience', audience);
    fixture.componentRef.setInput('variant', variant);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const hrefs = (root: HTMLElement) => Array.from(root.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
  const titles = (root: HTMLElement) => Array.from(root.querySelectorAll('nav h2')).map((h) => h.textContent?.trim());

  it('describes the platform and shows the legal row on every full footer', async () => {
    const root = await render('public');
    expect(root.querySelector('.footer__text')?.textContent).toContain('GPC UPC');
    expect(root.textContent).toContain('© 2026 Kodikalab. Todos los derechos reservados.');
    expect(root.textContent).toContain('Términos de Servicio');
    expect(root.textContent).toContain('Política de privacidad');
  });

  it('offers the sign-in, registration and demos to visitors', async () => {
    const root = await render('public');
    expect(titles(root)).toEqual(['Plataforma', 'Tu cuenta', 'Pruébala']);
    expect(hrefs(root)).toEqual(
      expect.arrayContaining(['/login', '/registro', '/recuperar-contrasena', '/demo/practicante', '/demo/coach']),
    );
  });

  it.each([
    ['practicante', 'Mi progreso', '/progreso'],
    ['coach', 'Seguimiento', '/coach/rendimiento'],
  ] as const)('shows the %s navigation, progress and account links', async (audience, progressTitle, progressPath) => {
    const root = await render(audience);
    expect(titles(root)).toEqual(['Plataforma', progressTitle, 'Tu cuenta', 'Sobre Kodikalab']);
    expect(hrefs(root)).toContain(progressPath);
    // Every link of the signed-in navigation is reachable from the footer.
    for (const link of navigationFor(audience === 'coach')) {
      expect(footerColumns(audience).flatMap((c) => c.links).map((l) => l.path)).toContain(link.path);
    }
  });

  it('links the brand to the home of each audience', async () => {
    expect((await render('public')).querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/');
    TestBed.resetTestingModule();
    expect((await render('practicante')).querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/inicio');
    TestBed.resetTestingModule();
    expect((await render('coach')).querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/coach/inicio');
  });

  it('keeps the compact variant to the legal line without link columns', async () => {
    const root = await render('public', 'compact');
    expect(root.querySelector('footer')).toBeNull();
    expect(root.querySelectorAll('nav')).toHaveLength(0);
    expect(root.textContent).toContain('© 2026 Kodikalab · GPC UPC');
    expect(root.textContent).toContain('Términos de Servicio');
    expect(root.textContent).toContain('Política de privacidad');
  });
});
