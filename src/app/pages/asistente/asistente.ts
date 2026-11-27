import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Session } from '../../core/session';
import { AgentChat } from '../../shared/agent-chat/agent-chat';
import { AppHeader } from '../../shared/app-header/app-header';

@Component({
  selector: 'app-asistente',
  imports: [AgentChat, AppHeader],
  templateUrl: './asistente.html',
  host: { class: 'block' },
})
export class Asistente {
  protected readonly session = inject(Session);
  protected readonly coach = inject(ActivatedRoute).snapshot.data['coach'] === true;
}
