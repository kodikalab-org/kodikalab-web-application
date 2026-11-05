import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL, AuthResponse, RecoveryResponse, RegisterRequest, Role } from './api';

interface SessionData { token: string; email: string; role: Role; expiresAt: number; }
const KEY = 'kodikalab.session';
const DEMO_KEY = 'kodikalab.demo';

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly account = signal<SessionData | null>(null);
  readonly demo = signal<Role | null>(null);
  // Recovery codes are ephemeral: never stored in URLs, browser storage or logs.
  readonly registration = signal<AuthResponse | null>(null);
  private restored = false;

  restore(): void {
    if (!this.browser || this.restored) return;
    this.restored = true;
    try {
      const win = this.document.defaultView!;
      const raw = win.sessionStorage.getItem(KEY) ?? win.localStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved.token === 'string' && typeof saved.email === 'string' &&
          ['PRACTICANTE', 'COACH'].includes(saved.role) && saved.expiresAt > Date.now()) this.account.set(saved);
      else this.clearStorage();
      const demo = win.sessionStorage.getItem(DEMO_KEY);
      if (demo === 'PRACTICANTE' || demo === 'COACH') this.demo.set(demo);
    } catch { this.account.set(null); }
  }

  token(): string | null {
    this.restore();
    if (this.demo()) return null;
    const session = this.account();
    if (session && session.expiresAt <= Date.now()) { this.logout(); return null; }
    return session?.token ?? null;
  }

  login(email: string, password: string, remember: boolean) {
    return this.http.post<AuthResponse>(`${this.url}/auth/login`, { email, password }, { timeout: 15000 }).pipe(
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
    return this.http.post<AuthResponse>(`${this.url}/auth/register`, request, { timeout: 15000 }).pipe(
      tap((response) => this.registration.set(response)),
    );
  }

  recover(email: string, recoveryCode: string, newPassword: string) {
    return this.http.post<RecoveryResponse>(`${this.url}/auth/recovery`, { email, recoveryCode, newPassword }, { timeout: 15000 })
      .pipe(tap(() => this.logout()));
  }

  recoveryCode(password: string) {
    return this.http.post<RecoveryResponse>(`${this.url}/auth/recovery-code`, { password }, { timeout: 15000 });
  }

  startDemo(role: Role): void {
    this.restore();
    this.demo.set(role);
    try { this.document.defaultView?.sessionStorage.setItem(DEMO_KEY, role); } catch { /* optional */ }
  }

  logout(): void {
    this.restored = true;
    this.account.set(null);
    this.demo.set(null);
    this.registration.set(null);
    this.clearStorage();
    try { this.document.defaultView?.sessionStorage.removeItem(DEMO_KEY); } catch { /* optional */ }
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
