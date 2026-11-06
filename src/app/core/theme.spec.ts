import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  let theme: Theme;
  let changed: (event: { matches: boolean }) => void;
  const key = 'kodikalab.theme';
  beforeEach(() => {
    localStorage.removeItem(key);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: (_: string, handler: typeof changed) => (changed = handler),
        removeEventListener: vi.fn(),
      })),
    );
    theme = TestBed.inject(Theme);
  });
  afterEach(() => {
    localStorage.removeItem(key);
    TestBed.inject(DOCUMENT).documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('uses the OS preference until a theme is explicitly chosen', () => {
    theme.init();
    expect(theme.current()).toBe('dark');
    changed({ matches: false });
    expect(theme.current()).toBe('light');
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('starts in light mode when the OS does not prefer dark mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    theme.init();
    expect(theme.current()).toBe('light');
  });
  it('restores the saved preference before the OS preference', () => {
    localStorage.setItem(key, 'light');
    theme.init();
    expect(theme.current()).toBe('light');
    expect(TestBed.inject(DOCUMENT).documentElement.dataset['theme']).toBe('light');
  });
  it('changes the current document and persists without reloading', () => {
    theme.init();
    theme.toggle();
    expect(theme.current()).toBe('light');
    expect(localStorage.getItem(key)).toBe('light');
    changed({ matches: true });
    expect(theme.current()).toBe('light');
  });
  it('ignores invalid preferences', () => {
    localStorage.setItem(key, 'invalid');
    theme.init();
    expect(theme.current()).toBe('dark');
  });
  it('still changes theme if localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    theme.init();
    theme.toggle();
    expect(theme.current()).toBe('light');
  });
});
