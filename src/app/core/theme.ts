import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly current = signal<ColorTheme>('dark');
  private initialized = false;
  private readonly destroyRef = inject(DestroyRef);
  init() {
    if (!this.browser || this.initialized) return;
    this.initialized = true;
    const win = this.document.defaultView!;
    const media = win.matchMedia?.('(prefers-color-scheme: dark)');
    const stored = this.preference();
    this.apply(stored ?? (media?.matches ? 'dark' : 'light'));
    const changed = (event: MediaQueryListEvent) => {
      if (!this.preference()) this.apply(event.matches ? 'dark' : 'light');
    };
    media?.addEventListener('change', changed);
    this.destroyRef.onDestroy(() => media?.removeEventListener('change', changed));
  }
  toggle() {
    const theme = this.current() === 'dark' ? 'light' : 'dark';
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem('kodikalab.theme', theme);
    } catch {}
  }
  private preference(): ColorTheme | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem('kodikalab.theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
  private apply(theme: ColorTheme) {
    this.current.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
  }
}
