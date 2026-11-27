import { Loader } from '../loader/loader';
import { Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AgentChatStore } from '../../core/agent-chat-store';
import { Session } from '../../core/session';
import { AgentChat } from '../agent-chat/agent-chat';

/** Public pages, onboarding and the assistant page itself never show the floating panel. */
const HIDDEN = /^\/($|login|registro|recuperar-contrasena|demo\/|onboarding\/|(coach\/)?asistente)/;

/**
 * Floating assistant. It lives in the root component, so it stays open with its conversation while the user changes
 * page. That also leaves it ready for the day the assistant can navigate on the user's behalf.
 */
@Component({
  selector: 'app-agent-panel',
  imports: [Loader, AgentChat, MatButtonModule, RouterLink],
  templateUrl: './agent-panel.html',
})
export class AgentPanel {
  protected readonly store = inject(AgentChatStore);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly closeButton = viewChild('closeButton', { read: ElementRef<HTMLButtonElement> });
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly visible = computed(() =>
    !!this.session.account() && !this.session.demo() && !HIDDEN.test(this.path().split(/[?#]/)[0]));
  protected readonly fullPage = computed(() =>
    this.session.account()?.role === 'COACH' ? '/coach/asistente' : '/asistente');

  constructor() {
    effect(() => this.closeButton()?.nativeElement.focus());
  }
}
