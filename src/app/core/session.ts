import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL, AuthResponse, RegisterRequest, Role } from './api';

interface SessionData { token: string; email: string; role: Role; expiresAt: number; }
const KEY = 'kodikalab.session';
/** A sleeping backend (free hosting) can take close to a minute to answer its first request. */
export const COLD_START_TIMEOUT = 60000;

function parseSession(raw: string): SessionData | null {
  try {
    const saved = JSON.parse(raw);
    return saved && typeof saved.token === 'string' && typeof saved.email === 'string' &&
      ['PRACTICANTE', 'COACH'].includes(saved.role) && saved.expiresAt > Date.now() ? saved : null;
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly account = signal<SessionData | null>(null);
  private restored = false;

  restore(): void {
    if (!this.browser || this.restored) return;
    this.restored = true;
    const win = this.document.defaultView;
    if (!win) return;
    const stored = this.readStored(win);
    if (stored) this.account.set(stored);
    // A login or logout in another tab reaches this one, so every tab shows the same account.
    win.addEventListener('storage', (event) => {
      if (event.key !== KEY && event.key !== null) return;
      const next = this.readStored(win);
      if (next?.token !== this.account()?.token) this.account.set(next);
    });
  }

  /**
   * The valid stored session, preferring the one of this tab. A copy that expired or is corrupted is
   * removed on its own: it must not take a still valid copy of the other storage with it.
   */
  private readStored(win: Window): SessionData | null {
    let found: SessionData | null = null;
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try {
        const storage = win[name];
        const raw = storage.getItem(KEY);
        if (!raw) continue;
        const saved = parseSession(raw);
        if (saved) found ??= saved;
        else storage.removeItem(KEY);
      } catch { /* Storage may be disabled. */ }
    }
    return found;
  }

  token(): string | null {
    this.restore();
    const session = this.account();
    if (session && session.expiresAt <= Date.now()) { this.logout(); return null; }
    return session?.token ?? null;
  }

  login(email: string, password: string, remember: boolean) {
    return this.http.post<AuthResponse>(`${this.url}/auth/login`, { email, password }, { timeout: COLD_START_TIMEOUT }).pipe(
      tap((response) => {
        if (!response.token || !response.expiresIn || !['PRACTICANTE', 'COACH'].includes(response.role)) {
          throw new Error('Respuesta de autenticación incompleta');
        }
        this.logout();
        const data: SessionData = {
          token: response.token, email: response.email, role: response.role,
          expiresAt: Date.now() + response.expiresIn * 1000,
        };
        this.account.set(data);
        try {
          const win = this.document.defaultView;
          if (this.browser && win) (remember ? win.localStorage : win.sessionStorage).setItem(KEY, JSON.stringify(data));
        } catch { /* Storage may be disabled. The in-memory session still works. */ }
      }),
    );
  }

  register(request: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.url}/auth/register`, request, { timeout: 15000 });
  }

  logout(): void {
    this.restored = true;
    this.account.set(null);
    this.clearStorage();
  }

  private clearStorage(): void {
    if (!this.browser) return;
    try {
      this.document.defaultView?.localStorage.removeItem(KEY);
      this.document.defaultView?.sessionStorage.removeItem(KEY);
    } catch { /* optional */ }
  }
}

export const homeFor = (role: Role) => role === 'COACH' ? '/coach/inicio' : '/inicio';
export const onboardingFor = (role: Role) => role === 'COACH'
  ? '/onboarding/coach/experiencia' : '/onboarding/practicante/datos-academicos';
