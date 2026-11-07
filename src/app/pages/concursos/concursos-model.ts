import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { TeamCompetition } from '../../core/team-api';
import { AssignedProblem, CoachGroup, PractitionerGroup } from '../../core/teams-api';
import { PenaltyRule, StandingsCell } from '../../core/standings-api';

export type CompetitionStatus = TeamCompetition['status'];
export type ProblemStatus = 'RESUELTO' | 'PENDIENTE' | 'EN_PROGRESO' | 'SIN_INTENTOS';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface ActiveTeam {
  groupId: number;
  name: string;
}

/** `/teams/me` returns every membership status: keep only the teams where I am an ACTIVO member. */
export function activeTeams(groups: (CoachGroup | PractitionerGroup)[]): ActiveTeam[] {
  return groups
    .filter((group): group is PractitionerGroup => 'membership' in group && group.membership.status === 'ACTIVO')
    .map((group) => ({ groupId: group.groupId, name: group.name }));
}

/** Normalizes the free-form assignment status of `/problems/assigned`. */
export function problemStatus(item: Pick<AssignedProblem, 'status'>): ProblemStatus {
  const status = (item.status ?? '').toUpperCase();
  return status === 'RESUELTO' || status === 'PENDIENTE' || status === 'EN_PROGRESO'
    ? status
    : 'SIN_INTENTOS';
}

export interface ContestProgress {
  solved: number;
  pending: number;
  total: number;
}

/** My progress in one contest: statuses of the assigned problems that belong to it. */
export function contestProgress(items: AssignedProblem[], competitionId: number, declaredTotal = 0): ContestProgress {
  const own = items.filter((item) => item.competition.id === competitionId);
  const solved = own.filter((item) => problemStatus(item) === 'RESUELTO').length;
  const pending = own.filter((item) => problemStatus(item) === 'PENDIENTE').length;
  return { solved, pending, total: Math.max(declaredTotal, own.length) };
}

export interface ContestRow {
  competition: TeamCompetition;
  teamName: string;
  progress: ContestProgress | null;
}

function time(value: string | null | undefined): number {
  const ms = Date.parse(value ?? '');
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/** Current (EN_CURSO first) and upcoming contests, then past ones newest first. */
export function splitContests(rows: ContestRow[]): { current: ContestRow[]; past: ContestRow[] } {
  const rank = (row: ContestRow) => (row.competition.status === 'EN_CURSO' ? 0 : 1);
  const current = rows
    .filter((row) => row.competition.status !== 'FINALIZADA')
    .sort((a, b) => rank(a) - rank(b) || compare(time(a.competition.startsAt), time(b.competition.startsAt)));
  const past = rows
    .filter((row) => row.competition.status === 'FINALIZADA')
    .sort((a, b) => compare(endOf(b.competition), endOf(a.competition)));
  return { current, past };
}

/** Total order that tolerates the +Infinity used for missing dates. */
function compare(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function endOf(competition: TeamCompetition): number {
  const end = time(competition.endsAt);
  return Number.isFinite(end) ? end : Number.isFinite(time(competition.startsAt)) ? time(competition.startsAt) : 0;
}

/** Contest length in minutes from its start and end, or null when either date is missing. */
export function durationMinutes(startsAt: string | null | undefined, endsAt: string | null | undefined): number | null {
  const start = time(startsAt);
  const end = time(endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / MINUTE) : null;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Time left, coarse for far dates (days+hours) and precise (min or min+s) near the start/end. */
export function formatCountdown(ms: number, withSeconds = false): string {
  const total = Math.max(0, ms);
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);
  const seconds = Math.floor((total % MINUTE) / 1000);
  if (days) return `${days} d ${hours} h`;
  if (hours) return `${hours} h ${minutes} min`;
  return withSeconds ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${minutes} min`;
}

export function formatDateTime(value: string | null | undefined): string {
  const ms = time(value);
  if (!Number.isFinite(ms)) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(ms);
}

export const STATUS_LABEL: Record<CompetitionStatus, string> = {
  EN_CURSO: 'En curso',
  PROGRAMADA: 'Programado',
  FINALIZADA: 'Finalizado',
};

export const STATUS_BADGE: Record<CompetitionStatus, string> = {
  EN_CURSO: 'border-green-400/50 bg-green-400/10 text-green-300',
  PROGRAMADA: 'border-kl-accent-text/50 bg-kl-accent/15 text-kl-accent-text',
  FINALIZADA: 'border-kl-border-strong bg-white/4 text-kl-muted',
};

export const PROBLEM_LABEL: Record<ProblemStatus, string> = {
  RESUELTO: 'Resuelto',
  PENDIENTE: 'Pendiente de verificación',
  EN_PROGRESO: 'En progreso',
  SIN_INTENTOS: 'Sin intentos',
};

export const PROBLEM_BADGE: Record<ProblemStatus, string> = {
  RESUELTO: 'border-green-400/50 bg-green-400/10 text-green-300',
  PENDIENTE: 'border-amber-300/50 bg-amber-300/10 text-amber-200',
  EN_PROGRESO: 'border-sky-300/50 bg-sky-300/10 text-sky-200',
  SIN_INTENTOS: 'border-kl-border-strong bg-white/4 text-kl-muted',
};

export function penaltyLabel(rule: PenaltyRule | null | undefined): string {
  if (rule === 'ICPC_20_MIN') return 'ICPC (20 min por envío incorrecto)';
  if (rule === 'IOI_POINTS') return 'IOI (puntos)';
  return '—';
}

/** Codeforces-style balloon colors, one per problem position. */
const BALLOONS = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#a98bff', '#f472b6', '#2dd4bf', '#fb923c'];
export const balloonColor = (index: number) => BALLOONS[index % BALLOONS.length];

/**
 * Text of one standings cell. `attempts` counts every registered submission, so a solved problem
 * shows `+` plus the wrong ones before the accepted one (`+2`); an unsolved attempted problem shows
 * `-N`; a pending verification shows `?`; no attempts leaves it empty.
 */
export function standingCellText(cell: Pick<StandingsCell, 'result' | 'attempts'>): string {
  switch (cell.result) {
    case 'RESUELTO': {
      const wrong = Math.max(0, cell.attempts - 1);
      return wrong ? `+${wrong}` : '+';
    }
    case 'PENDIENTE':
      return '?';
    case 'EN_PROGRESO':
      return cell.attempts > 0 ? `-${cell.attempts}` : '';
    default:
      return '';
  }
}

/** Accepted time as `h:mm`, the way Codeforces prints it under the `+`. */
export function formatSolveTime(minutes: number | null): string {
  if (minutes === null || minutes < 0) return '';
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Signal with the current time that refreshes on an interval and stops when the component dies. */
export function injectNow(intervalMs: number): Signal<number> {
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now;
}
