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
});
