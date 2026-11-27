import { Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AGENT_MESSAGE_LIMIT, AgentChart, AgentTeam } from '../../core/agent-api';
import { AgentChatStore } from '../../core/agent-chat-store';
import { Session } from '../../core/session';
import { CoachGroup, TeamsApi } from '../../core/teams-api';
import { Loader } from '../loader/loader';

interface Bar { label: string; value: number | null; width: number; }

/** Conversation with the assistant. It only draws what the server sends: no figure is computed here. */
@Component({
  selector: 'app-agent-chat',
  imports: [Loader, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './agent-chat.html',
  // The message and team boxes are rounded and translucent instead of Material's flat opaque fill.
  host: {
    class:
      'flex min-h-0 flex-1 flex-col gap-3 [--mat-form-field-outlined-container-shape:16px] ' +
      '[--mat-form-field-outlined-outline-color:var(--kl-border-strong)] ' +
      '[--mat-form-field-outlined-focus-outline-color:var(--kl-accent-text)]',
  },
})
export class AgentChat {
  protected readonly store = inject(AgentChatStore);
  protected readonly session = inject(Session);
  private readonly teams = inject(TeamsApi);
  private readonly history = viewChild<ElementRef<HTMLElement>>('history');
  protected readonly limit = AGENT_MESSAGE_LIMIT;

  protected readonly coach = computed(() => (this.session.demo() ?? this.session.account()?.role) === 'COACH');
  protected readonly coachTeams = computed(() =>
    this.coach() ? this.teams.mine().filter((team): team is CoachGroup => !('membership' in team)) : []);
  protected readonly examples = computed(() => this.coach()
    ? ['¿En qué temas está más débil mi equipo?', 'Recomiéndame problemas para que practique mi equipo']
    : ['¿Cómo uso KodikaLab?', 'Busco un grupo de entrenamiento']);

  protected readonly teamsFailed = signal(false);

  /** The assistant still works without the list: the coach can name the team in the message. */
  protected loadTeams(): void {
    this.teamsFailed.set(false);
    this.teams.loadMine().subscribe({
      next: () => {
        const options = this.coachTeams();
        if (this.store.teamId() === null && options.length) {
          this.store.teamId.set((options.find((team) => team.activeMembers > 0) ?? options[0]).groupId);
        }
      },
      error: () => this.teamsFailed.set(true),
    });
  }

  constructor() {
    if (this.coach() && !this.session.demo()) this.loadTeams();
    afterRenderEffect(() => {
      const last = this.store.messages().at(-1);
      this.store.sending();
      const element = this.history()?.nativeElement;
      if (!element) return;
      // A long answer is read from its beginning; anything else keeps the latest line in view.
      const answer = last?.author === 'agent' && !this.store.sending()
        ? element.querySelector<HTMLElement>('[data-message="' + last.id + '"]') : null;
      element.scrollTop = answer
        ? element.scrollTop + answer.getBoundingClientRect().top - element.getBoundingClientRect().top - 12
        : element.scrollHeight;
    });
  }

  protected bars(chart: AgentChart): Bar[] {
    const values = chart.labels.map((_, index) => {
      const value = chart.values?.[index];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    });
    const top = chart.unit === '%' ? 100 : Math.max(...values.map((value) => value ?? 0), 1);
    // The figure is printed as sent; only the bar is clamped, since an invalid CSS width would fill the track.
    return chart.labels.map((label, index) => ({
      label, value: values[index], width: Math.min(100, Math.max(0, ((values[index] ?? 0) / top) * 100)),
    }));
  }

  protected teamSummary(team: AgentTeam): string {
    return [team.expectedLevel, team.sessionSchedule].filter(Boolean).join(' · ');
  }

  protected webUrl(url: string | null): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.store.send(this.store.draft());
  }

  /** Enter sends; Shift+Enter writes a new line. */
  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (!key.shiftKey && !key.isComposing) this.submit(event);
  }
}
