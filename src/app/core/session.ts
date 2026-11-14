import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL, AuthResponse, RegisterRequest, Role } from './api';

/** `lifetime` is the length in ms of the token issued at login or refresh; sessions saved before it existed lack it. */
interface SessionData { token: string; email: string; role: Role; expiresAt: number; lifetime?: number; }
const KEY = 'kodikalab.session';
/** A sleeping backend (free hosting) can take close to a minute to answer its first request. */
export const COLD_START_TIMEOUT = 60000;
/** The token is renewed once less than this share of its lifetime is left. */
export const REFRESH_THRESHOLD = 0.2;

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
  private refreshing = false;

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
        const data = this.toSessionData(response);
        this.logout();
        this.account.set(data);
        this.write(data, remember ? ['localStorage'] : ['sessionStorage']);
      }),
    );
  }

  /**
   * Asks the backend for a new token and replaces the stored one, in whichever storage already holds the
   * session. The caller decides what to do on failure: the current session stays valid until it expires.
   */
  refresh() {
    return this.http.post<AuthResponse>(`${this.url}/auth/refresh`, null, { timeout: COLD_START_TIMEOUT }).pipe(
      tap((response) => {
        const current = this.account();
        const data = this.toSessionData(response);
        // A refresh that arrives after a logout or a login as someone else must not resurrect the old session.
        if (!current || data.email !== current.email) return;
        this.account.set(data);
        this.write(data, 'existing');
      }),
    );
  }

  /** True when the session is valid but has less than 20 % of its lifetime left. */
  private refreshDue(): boolean {
    const session = this.account();
    if (!session?.lifetime) return false;
    const left = session.expiresAt - Date.now();
    return left > 0 && left < session.lifetime * REFRESH_THRESHOLD;
  }

  /** Renews the token in the background when it is close to expiring. A failure is ignored and never ends the session. */
  refreshIfDue(): void {
    if (!this.browser || this.refreshing || !this.refreshDue()) return;
    this.refreshing = true;
    this.refresh().subscribe({
      next: () => { this.refreshing = false; },
      error: () => { this.refreshing = false; },
    });
  }

  private toSessionData(response: AuthResponse): SessionData {
    if (!response.token || !response.expiresIn || !['PRACTICANTE', 'COACH'].includes(response.role)) {
      throw new Error('Respuesta de autenticación incompleta');
    }
    return {
      token: response.token, email: response.email, role: response.role,
      expiresAt: Date.now() + response.expiresIn * 1000, lifetime: response.expiresIn * 1000,
    };
  }

  /** Saves the session in the given storages, or only in those that already hold one. */
  private write(data: SessionData, where: ('localStorage' | 'sessionStorage')[] | 'existing'): void {
    const win = this.document.defaultView;
    if (!this.browser || !win) return;
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try {
        const storage = win[name];
        if (where === 'existing' ? storage.getItem(KEY) !== null : where.includes(name)) storage.setItem(KEY, JSON.stringify(data));
      } catch { /* Storage may be disabled. The in-memory session still works. */ }
    }
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
