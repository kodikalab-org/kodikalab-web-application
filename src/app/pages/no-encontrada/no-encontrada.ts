import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Session, homeFor } from '../../core/session';

/** Shown inside the application frame for any address that does not exist. */
@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink, MatButtonModule],
  template: `<div class="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 px-4 py-16 lg:px-6">
    <p class="m-0 font-mono text-sm text-kl-muted">Error 404</p>
    <h1 class="kl-page-title">No encontramos esta página</h1>
    <p class="m-0 max-w-[560px] text-kl-body">
      La dirección que abriste no existe o ya no está disponible. Revisa que esté bien escrita o vuelve al inicio.
    </p>
    <a mat-flat-button [routerLink]="inicio()">Ir al inicio</a>
  </div>`,
})
export class NoEncontrada {
  private readonly session = inject(Session);
  protected readonly inicio = computed(() => {
    const role = this.session.account()?.role;
    return role ? homeFor(role) : '/';
  });
}
