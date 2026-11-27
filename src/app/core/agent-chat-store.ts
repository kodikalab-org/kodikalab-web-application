import { Injectable, computed, effect, inject, linkedSignal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AgentApi, AgentResponse } from './agent-api';
import { apiError } from './api';
import { Session } from './session';

export interface AgentChatMessage {
  id: number;
  author: 'user' | 'agent';
  text: string;
  response?: AgentResponse;
}

const DEMO_MESSAGE = 'Demostración: el asistente necesita una sesión real. Inicia sesión para usarlo.';

/** 429 and 503 carry an explanation meant for the user (limit reached, assistant disabled or unavailable). */
function chatError(error: unknown): string {
  if (error instanceof HttpErrorResponse && (error.status === 429 || error.status === 503)) {
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return apiError(error);
}

/** One conversation shared by the assistant page and the floating panel. */
@Injectable({ providedIn: 'root' })
export class AgentChatStore {
  private readonly api = inject(AgentApi);
  private readonly session = inject(Session);
  private readonly identity = computed(() => `${this.session.demo() ?? ''}|${this.session.account()?.email ?? ''}`);

  private sessionState<T>(initial: () => T) {
    // Reset synchronously on session changes, so one account never sees another's conversation.
    return linkedSignal({ source: this.identity, computation: initial });
  }

  readonly messages = this.sessionState<AgentChatMessage[]>(() => []);
  readonly draft = this.sessionState(() => '');
  readonly teamId = this.sessionState<number | null>(() => null);
  readonly error = this.sessionState<string | null>(() => null);
  readonly sending = this.sessionState(() => false);
  readonly panelOpen = this.sessionState(() => false);
  private readonly conversationId = this.sessionState<string | null>(() => null);

  private pending?: Subscription;
  private pendingOwner = '';
  private nextId = 0;

  constructor() {
    effect(() => {
      if (this.identity() !== this.pendingOwner) this.pending?.unsubscribe();
    });
  }

  /** Returns `false` when nothing was sent. */
  send(text: string): boolean {
    const message = text.trim();
    if (!message || this.sending()) return false;
    if (this.session.demo()) {
      this.error.set(DEMO_MESSAGE);
      return false;
    }
    const conversationId = this.conversationId();
    const teamId = this.teamId();
    const id = ++this.nextId;
    this.messages.update((list) => [...list, { id, author: 'user', text: message }]);
    this.draft.set('');
    this.error.set(null);
    this.sending.set(true);
    this.pendingOwner = this.identity();
    this.pending = this.api.chat({
      message,
      ...(conversationId ? { conversationId } : {}),
      ...(teamId ? { teamId } : {}),
    }).subscribe({
      next: (response) => {
        this.conversationId.set(response.conversationId);
        this.messages.update((list) =>
          [...list, { id: ++this.nextId, author: 'agent', text: response.message, response }]);
        this.sending.set(false);
      },
      error: (error: unknown) => {
        // The text goes back to the box so it can be sent again without a duplicate in the history.
        this.messages.update((list) => list.filter((item) => item.id !== id));
        this.draft.set(message);
        this.error.set(chatError(error));
        this.sending.set(false);
      },
    });
    return true;
  }

  reset(): void {
    this.pending?.unsubscribe();
    this.conversationId.set(null);
    this.messages.set([]);
    this.draft.set('');
    this.error.set(null);
    this.sending.set(false);
  }
}
