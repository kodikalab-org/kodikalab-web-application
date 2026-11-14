import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Session } from '../../core/session';
import { AppHeader } from '../../shared/app-header/app-header';
import { SiteFooter } from '../../shared/site-footer/site-footer';

/**
 * The single frame of every signed-in page: background, header, `<main>` with the routed page and footer.
 * The role (coach or practitioner) comes from the session, not from the route.
 */
@Component({
  selector: 'app-shell',
  imports: [AppHeader, RouterOutlet, SiteFooter],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  host: { class: 'block' },
})
export class AppShell {
  private readonly session = inject(Session);
  /** Skip link: moves focus to the page content without changing the URL. */
  protected saltar(event: Event, contenido: HTMLElement): void {
    event.preventDefault();
    contenido.focus();
  }

  protected readonly audience = computed(() => (this.session.account()?.role === 'COACH' ? 'coach' : 'practicante'));
}
