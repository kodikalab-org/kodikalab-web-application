import { TestBed } from '@angular/core/testing';
import { HeaderNavigation } from './header-navigation';
import { Sidebar } from '../../core/sidebar';
import { provideRouter } from '@angular/router';

describe('Header sidebar control', () => {
  it('opens the common drawer and exposes its accessible state', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeaderNavigation);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-controls')).toBe('app-sidebar');
    expect(button.classList.contains('xl:hidden')).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('nav a').length).toBe(5);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    await fixture.whenStable();
    expect(TestBed.inject(Sidebar).opened()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    TestBed.inject(Sidebar).opened.set(false);
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
