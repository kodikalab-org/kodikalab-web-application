import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function click(root: HTMLElement, selector: string) {
    (root.querySelector(selector) as HTMLElement).click();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('does not show language selectors in the header or footer', async () => {
    const root = await setup();
    expect(root.querySelector('[aria-label="Idioma"]')).toBeNull();
    expect(root.querySelector('.header__login')?.textContent).toContain('Iniciar sesión');
  });

  it('starts the hero with the title instead of the introductory badge', async () => {
    const root = await setup();
    const hero = root.querySelector('.hero__content')!;
    expect(hero.firstElementChild?.tagName).toBe('H1');
    expect(hero.querySelector('mat-chip-set')).toBeNull();
    expect(root.querySelector('.footer__text')?.textContent).toContain('GPC UPC');
  });

  it('opens and closes the mobile menu from the menu button', async () => {
    const root = await setup();
    const button = root.querySelector('.header__menu')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('.mobile-menu')).toBeNull();

    await click(root, '.header__menu');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Cerrar menú');
    expect(root.querySelectorAll('.mobile-menu__link').length).toBe(5);

    await click(root, '.mobile-menu__link:nth-of-type(2)');
    expect(root.querySelector('.mobile-menu')).toBeNull();
    expect(root.querySelector('.header__link--active')?.textContent).toContain('Características');
  });

  it('moves between testimonials with the carousel controls', async () => {
    const root = await setup();
    const text = () => root.querySelector('.quote__text')!.textContent!;
    const first = text();

    await click(root, '[aria-label="Testimonio siguiente"]');
    expect(text()).not.toBe(first);
    expect(root.querySelector('[aria-label="Ver testimonio 2"]')?.getAttribute('aria-current')).toBe('true');

    await click(root, '[aria-label="Testimonio anterior"]');
    expect(text()).toBe(first);

    await click(root, '[aria-label="Testimonio anterior"]');
    expect(root.querySelector('[aria-label="Ver testimonio 2"]')?.getAttribute('aria-current')).toBe('true');

    await click(root, '[aria-label="Ver testimonio 1"]');
    expect(text()).toBe(first);
  });
});
