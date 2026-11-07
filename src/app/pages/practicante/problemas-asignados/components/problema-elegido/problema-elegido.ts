import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { combineLatest } from 'rxjs';
import { positiveId } from '../../../../../core/team-api';
import {
  ASSIGNMENT_STATUS,
  AssignedDetail,
  AttemptInfo,
  COMPETITION_STATUS,
  PLATFORM_LABEL,
  ProblemsApi,
  VERDICT_LABEL,
  formatDateTime,
  problemsError,
} from '../../../../../core/problems-api';
import { RegistroProblemasResueltos } from '../../../registro-problemas-resueltos/registro-problemas-resueltos';

const PENALIZACION: Record<string, string> = {
  ICPC_20_MIN: 'ICPC · 20 min',
  IOI_POINTS: 'IOI · por puntos',
};

/** US-08/US-09 (practitioner): one assigned problem with its conditions, the personal attempts and the registration. */
@Component({
  selector: 'app-problema-elegido',
  imports: [RouterLink, MatButtonModule, MatCardModule, RegistroProblemasResueltos],
  templateUrl: './problema-elegido.html',
  styleUrl: './problema-elegido.css',
  host: { class: 'block' },
})
export class ProblemaElegido {
  private readonly api = inject(ProblemsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly estadoAsignacion = ASSIGNMENT_STATUS;
  protected readonly estadoCompetencia = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;
  protected readonly etiquetaVeredicto = VERDICT_LABEL;
  protected readonly fecha = formatDateTime;

  protected readonly detalle = signal<AssignedDetail | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly teamId = signal<number | null>(null);
  protected readonly registroAbierto = signal(false);
  protected readonly recienRegistrado = signal(false);

  private competitionProblemId: number | null = null;
  private request = 0;

  protected readonly asignacion = computed(() => this.detalle()?.assignment ?? null);
  /** Attempts, most recent first. */
  protected readonly intentos = computed<AttemptInfo[]>(() =>
    [...(this.detalle()?.attempts ?? [])].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    ),
  );
  protected readonly ultimoIntento = computed(() => this.intentos()[0] ?? null);

  /** Reason the registration is not available, or `null` when the practitioner can register the problem. */
  protected readonly bloqueo = computed(() => {
    const item = this.asignacion();
    if (!item) return null;
    if (item.status === 'RESUELTO') return 'Ya registraste este problema como resuelto.';
    if (item.competition.status === 'PROGRAMADA') return 'La competencia aún no ha comenzado.';
    if (this.teamId() === null) return 'Abre el problema desde tu lista de problemas asignados para registrarlo en tu equipo.';
    return null;
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(([params, query]) => {
        this.teamId.set(positiveId(query.get('teamId')));
        this.competitionProblemId = positiveId(params.get('competitionProblemId'));
        this.detalle.set(null);
        this.recienRegistrado.set(false);
        this.cargar();
      });
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected abrirRegistro(dialogo: HTMLDialogElement): void {
    this.registroAbierto.set(true);
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }

  protected cerrarRegistro(dialogo: HTMLDialogElement): void {
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
    this.registroAbierto.set(false);
  }

  /** The registration was accepted: close the form and reload the state and the attempts. */
  protected alRegistrar(dialogo: HTMLDialogElement): void {
    this.cerrarRegistro(dialogo);
    this.recienRegistrado.set(true);
    this.cargar();
  }

  protected penalizacion(regla: string | null): string {
    return regla ? (PENALIZACION[regla] ?? regla) : '—';
  }

  protected duracion(minutos: number | null): string {
    if (minutos === null) return '—';
    const horas = minutos / 60;
    return Number.isInteger(horas) ? `${horas} ${horas === 1 ? 'hora' : 'horas'}` : `${minutos} min`;
  }

  private cargar(): void {
    const id = this.competitionProblemId;
    const actual = ++this.request;
    if (id === null) {
      this.error.set('El problema solicitado no es válido.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.api.assignedDetail(id).subscribe({
      next: (detalle) => {
        if (actual !== this.request) return;
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (error) => {
        if (actual !== this.request) return;
        this.error.set(problemsError(error));
        this.cargando.set(false);
      },
    });
  }
}
