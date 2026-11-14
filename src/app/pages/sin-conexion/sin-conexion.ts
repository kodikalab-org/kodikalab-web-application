import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ProfileApi } from '../../core/profile-api';
import { safeReturnUrl } from '../../core/return-url';

/** Seconds between automatic attempts; the last value repeats. */
const WAITS = [3, 6, 12, 20];

/**
 * Shown when the server does not answer while the session is still valid. It keeps the session,
 * retries on its own and returns to the page the user wanted.
 */
@Component({
  selector: 'app-sin-conexion',
  imports: [RouterLink, MatButtonModule],
  template: `<main class="flex min-h-dvh flex-col items-center justify-center gap-5 bg-kl-bg px-4 text-center font-body text-kl-text">
    <img src="images/login/logo-48.svg" width="48" height="48" alt="" />
    <h1 class="m-0 font-display text-[28px] leading-9 font-bold">Reconectando con el servidor</h1>
    <p class="m-0 max-w-[460px] text-kl-body" role="status" aria-live="polite">
      @if (probando()) {
        Comprobando la conexión…
      } @else {
        El servidor no responde todavía. Tu sesión sigue abierta; reintentamos en {{ restante() }} s.
      }
    </p>
    <div class="flex flex-wrap justify-center gap-3">
      <button mat-flat-button type="button" [disabled]="probando()" (click)="probar()">Reintentar ahora</button>
      <a mat-stroked-button routerLink="/">Ir a la portada</a>
    </div>
  </main>`,
})
export class SinConexion {
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  private readonly volver = safeReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('volver'));
  protected readonly probando = signal(false);
  protected readonly restante = signal(0);
  private intento = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
    this.probar();
  }

  protected probar(): void {
    if (this.probando()) return;
    this.detener();
    this.probando.set(true);
    this.profiles.load().subscribe({
      next: () => void this.router.navigateByUrl(this.volver ?? '/inicio'),
      error: (error: unknown) => {
        this.probando.set(false);
        // 401 is handled by the interceptor; a missing profile is resolved by the guard of the target.
        if (error instanceof HttpErrorResponse && error.status === 401) return;
        if (error instanceof HttpErrorResponse && error.status === 404) {
          void this.router.navigateByUrl(this.volver ?? '/inicio');
          return;
        }
        this.esperar();
      },
    });
  }

  private esperar(): void {
    this.restante.set(WAITS[Math.min(this.intento++, WAITS.length - 1)]);
    this.reloj = setInterval(() => {
      this.restante.update((value) => value - 1);
      if (this.restante() <= 0) this.probar();
    }, 1000);
  }

  private detener(): void {
    if (this.reloj !== null) clearInterval(this.reloj);
    this.reloj = null;
  }
}
