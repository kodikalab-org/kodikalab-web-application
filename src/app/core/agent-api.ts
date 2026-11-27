import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api';

/** Contract of `POST /agent/chat` (backend `docs/agent/contract.md`). */

export interface AgentChatRequest {
  message: string;
  conversationId?: string;
  teamId?: number;
}

export interface AgentTeam {
  groupId: number;
  name: string;
  expectedLevel: string | null;
  sessionSchedule: string | null;
  /** Empty means an exact match. */
  differences: string[] | null;
}

export interface AgentProblem {
  /** `null` for a Codeforces problem that is not in the catalog yet. */
  problemId: number | null;
  title: string;
  url: string | null;
  topic: string;
  difficulty: string | null;
  reason: string;
  source: 'CATALOG' | 'CODEFORCES';
}

export interface AgentChart {
  title: string;
  unit: string;
  labels: string[];
  values: number[];
}

export interface AgentAction {
  actionId: string;
  type: string;
  summary: string;
  expiresAt: string;
}

/** Only `conversationId`, `agent` and `message` are always present. */
export interface AgentResponse {
  conversationId: string;
  agent: string;
  message: string;
  teams?: AgentTeam[];
  problems?: AgentProblem[];
  chart?: AgentChart;
  action?: AgentAction;
}

export const AGENT_MESSAGE_LIMIT = 1000;
/** One message can take several model calls, so it waits longer than the rest of the API. */
const AGENT_TIMEOUT_MS = 90_000;

@Injectable({ providedIn: 'root' })
export class AgentApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  chat(request: AgentChatRequest) {
    return this.http.post<AgentResponse>(`${this.url}/agent/chat`, request, { timeout: AGENT_TIMEOUT_MS });
  }
}
