import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { vi } from 'vitest';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  function positionSections(root: HTMLElement, tops: number[], headerHeight = 80) {
    vi.spyOn(root.querySelector('.header')!, 'getBoundingClientRect').mockReturnValue({
      bottom: headerHeight,
    } as DOMRect);
    ['inicio', 'caracteristicas', 'comunidad', 'precios'].forEach((id, index) => {
      vi.spyOn(root.querySelector(`#${id}`)!, 'getBoundingClientRect').mockReturnValue({
        top: tops[index],
        height: 500,
      } as DOMRect);
    });
  }

  it('does not show language selectors in the header or footer', async () => {
    const { root } = await setup();
    expect(root.querySelector('[aria-label="Idioma"]')).toBeNull();
    expect(root.querySelector('.header__login')?.textContent).toContain('Iniciar sesión');
  });

  it('starts the hero with the title instead of the introductory badge', async () => {
    const { root } = await setup();
    const hero = root.querySelector('.hero__content')!;
    expect(hero.firstElementChild?.tagName).toBe('H1');
    expect(hero.querySelector('mat-chip-set')).toBeNull();
    expect(root.querySelector('.footer__text')?.textContent).toContain('GPC UPC');
  });

  it('keeps the persistent header outside the hero and exposes the main landmark', async () => {
    const { root } = await setup();
    expect(root.querySelector('.hero .header')).toBeNull();
    expect(root.querySelector('.header')?.getAttribute('role')).toBe('banner');
    expect(root.querySelector('main#contenido')).not.toBeNull();
    expect(root.querySelector('a[href="/#contenido"]')?.textContent).toContain('Saltar');
  });

  it('reserves the full initial viewport for the hero and keeps the stats after it', async () => {
    const { root } = await setup();
    const hero = root.querySelector('.hero')!;
    expect(hero.classList.contains('min-h-dvh')).toBe(true);
    expect(hero.nextElementSibling?.classList.contains('stats')).toBe(true);
    expect(hero.querySelector('.stats')).toBeNull();
  });

  it('opens an accessible mobile menu with the existing auth destinations', async () => {
    const { fixture, root } = await setup();
    const trigger = root.querySelector<HTMLButtonElement>('.header__menu')!;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = TestBed.inject(OverlayContainer).getContainerElement();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu.querySelector('a[href="/login"]')?.textContent).toContain('Iniciar sesión');
    expect(menu.querySelector('a[href="/registro"]')?.textContent).toContain('Registrarse');
  });

  it('scrolls only to the supplied section reference', async () => {
    const { fixture, root } = await setup();
    const section = root.querySelector<HTMLElement>('#caracteristicas')!;
    const scroll = vi.fn();
    section.scrollIntoView = scroll;
    fixture.componentInstance['scrollToSection']('caracteristicas', section);
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    fixture.componentInstance['scrollToSection'](undefined, section);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('does not present unfinished demo controls as working actions', async () => {
    const { root } = await setup();
    expect(
      root.querySelector<HTMLButtonElement>('button[title="Video próximamente disponible"]')
        ?.disabled,
    ).toBe(true);
    expect(root.querySelector('.cta__actions a[href="/#precios"]')?.textContent).toContain(
      'Ver planes',
    );
    expect(root.querySelectorAll('.header__nav [aria-disabled="true"]').length).toBe(1);
    expect(root.querySelector('.hero__actions a')?.getAttribute('href')).toBe('/registro');
  });

  it('updates the active navigation in both scroll directions without relying on the URL', async () => {
    const { fixture, root } = await setup();
    const scenarios = [
      { tops: [0, 900, 1600, 2400], active: 'inicio' },
      { tops: [-900, 80, 800, 1600], active: 'caracteristicas' },
      { tops: [-1800, -900, 80, 900], active: 'comunidad' },
      { tops: [-2700, -1800, -900, 80], active: 'precios' },
      { tops: [-900, 80, 800, 1600], active: 'caracteristicas' },
      { tops: [0, 900, 1600, 2400], active: 'inicio' },
    ];

    for (const scenario of scenarios) {
      positionSections(root, scenario.tops);
      fixture.componentInstance['updateActiveSection']();
      fixture.detectChanges();
      const active = root.querySelectorAll('.header__nav [aria-current="location"]');
      expect(active.length).toBe(1);
      expect(active[0].getAttribute('href')).toBe(
        scenario.active === 'inicio' ? '/' : `/#${scenario.active}`,
      );
    }
  });

  it('uses the actual header height when the viewport changes', async () => {
    const { fixture, root } = await setup();
    positionSections(root, [-900, 100, 800, 1600], 64);
    fixture.componentInstance['updateActiveSection']();
    fixture.detectChanges();
    expect(root.querySelector('.header__link--active')?.textContent).toContain('Inicio');

    positionSections(root, [-900, 96, 800, 1600], 64);
    fixture.componentInstance['updateActiveSection']();
    fixture.detectChanges();
    expect(root.querySelector('.header__link--active')?.textContent).toContain('Características');

    positionSections(root, [-900, 100, 800, 1600], 80);
    fixture.componentInstance['updateActiveSection']();
    fixture.detectChanges();
    expect(root.querySelector('.header__link--active')?.textContent).toContain('Características');
  });

  it('marks the visible section in the mobile menu as well', async () => {
    const { fixture, root } = await setup();
    positionSections(root, [-2700, -1800, -900, 80]);
    fixture.componentInstance['updateActiveSection']();
    root.querySelector<HTMLButtonElement>('.header__menu')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = TestBed.inject(OverlayContainer).getContainerElement();
    expect(menu.querySelector('[aria-current="location"]')?.textContent).toContain('Precios');
  });

  it('shows Free and monthly GO pricing without pretending checkout is available', async () => {
    const { root } = await setup();
    const cards = root.querySelectorAll('.pricing-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Free');
    expect(cards[0].textContent).toContain('sin costo');
    expect(cards[0].textContent).toContain('Consultas limitadas');
    expect(cards[1].textContent).toContain('GO');
    expect(cards[1].textContent).toContain('20');
    expect(cards[1].textContent).toContain('al mes');
    expect(cards[1].textContent).toContain('Análisis de rendimiento más detallados');
    expect(root.querySelectorAll('.pricing-card a[href="/registro"]').length).toBe(2);
    expect(root.querySelector('#pricing-note')?.textContent).toContain(
      'no activa GO ni genera cobros',
    );
    expect(root.querySelector('.header__nav a[href="/#precios"]')).not.toBeNull();
  });
});
