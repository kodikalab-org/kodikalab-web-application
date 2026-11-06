import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { apiError } from '../../../core/api';
import {
  CoachGroup,
  DecisionFailure,
  Membership,
  MembershipDecision,
  TeamsApi,
  classifyDecisionError,
} from '../../../core/teams-api';

/** Resultado de una decisión que el backend no aplicó, con el estado actualizado de la postulación. */
export interface ResultadoDecision {
  titulo: string;
  detalle: string;
  /** Estado de la postulación tras refrescar la lista, o `null` si no se pudo consultar. */
  estado: string | null;
}

const NIVELES: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

/**
 * US06 — El coach revisa las postulaciones pendientes del grupo y las acepta o rechaza.
 * Los datos vienen de `GET /teams/{id}/memberships?status=PENDIENTE`.
 */
@Component({
  selector: 'app-solicitudes-grupo',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './solicitudes-grupo.html',
  styleUrl: './solicitudes-grupo.css',
})
export class SolicitudesGrupo {
  private readonly api = inject(TeamsApi);
  private readonly route = inject(ActivatedRoute);
  private cargaSolicitudes?: Subscription;

  protected readonly groups = computed(() =>
    this.api.mine().filter((g): g is CoachGroup => 'activeMembers' in g),
  );
  protected readonly cargandoGrupos = signal(true);
  protected readonly errorGrupos = signal('');
  protected readonly cargandoSolicitudes = signal(false);
  protected readonly errorSolicitudes = signal('');

  /** Grupo elegido; es un selector de filtro, no un campo que se envíe. */
  protected readonly selector = new FormGroup({
    grupo: new FormControl<number | null>(null),
  });
  protected readonly selectedGroupId = signal<number | null>(null);
  protected readonly requests = this.api.requests;
  protected readonly selected = signal<Membership | null>(null);
  protected readonly confirmandoRechazo = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorAccion = signal('');
  protected readonly resultado = signal<ResultadoDecision | null>(null);
  protected readonly aviso = signal('');

  protected readonly selectedGroup = computed(() => {
    const id = this.selectedGroupId();
    return id === null ? null : (this.groups().find((g) => g.groupId === id) ?? null);
  });
  protected readonly grupoCompleto = computed(() => {
    const group = this.selectedGroup();
    return !!group && group.maxCapacity !== null && group.activeMembers >= group.maxCapacity;
  });

  constructor() {
    this.selector.controls.grupo.valueChanges.subscribe((groupId) => {
      if (groupId !== null) this.cambiarGrupo(groupId);
    });
    this.cargarGrupos();
  }

  protected cargarGrupos(): void {
    this.cargandoGrupos.set(true);
    this.errorGrupos.set('');
    this.api.loadMine().subscribe({
      next: () => {
        this.cargandoGrupos.set(false);
        const requested = Number(this.route.snapshot.queryParamMap.get('grupo'));
        const group =
          this.groups().find((g) => g.groupId === requested) ?? this.groups()[0] ?? null;
        this.selectedGroupId.set(group?.groupId ?? null);
        this.selector.controls.grupo.setValue(group?.groupId ?? null, { emitEvent: false });
        this.cargar();
      },
      error: (error: unknown) => {
        this.cargandoGrupos.set(false);
        this.errorGrupos.set(apiError(error));
      },
    });
  }

  protected cambiarGrupo(groupId: number): void {
    this.selectedGroupId.set(groupId);
    this.cerrar();
    this.aviso.set('');
    this.cargar();
  }

  protected cargar(): void {
    const groupId = this.selectedGroupId();
    if (groupId === null) return;
    this.cargaSolicitudes?.unsubscribe();
    this.cargandoSolicitudes.set(true);
    this.errorSolicitudes.set('');
    this.cargaSolicitudes = this.api.loadRequests(groupId).subscribe({
      next: () => this.cargandoSolicitudes.set(false),
      error: (error: unknown) => {
        this.cargandoSolicitudes.set(false);
        this.errorSolicitudes.set(apiError(error));
      },
    });
  }

  protected ver(request: Membership): void {
    this.selected.set(request);
    this.confirmandoRechazo.set(false);
    this.errorAccion.set('');
    this.resultado.set(null);
    this.aviso.set('');
  }

  protected cerrar(): void {
    if (this.guardando()) return;
    this.selected.set(null);
    this.confirmandoRechazo.set(false);
    this.errorAccion.set('');
    this.resultado.set(null);
  }

  /** Rechazar pide una confirmación explícita antes de enviarse. */
  protected pedirRechazo(): void {
    if (!this.guardando()) this.confirmandoRechazo.set(true);
  }

  protected cancelarRechazo(): void {
    if (!this.guardando()) this.confirmandoRechazo.set(false);
  }

  protected decidir(decision: MembershipDecision): void {
    const request = this.selected();
    const groupId = this.selectedGroupId();
    if (!request || groupId === null || this.guardando()) return;
    if (decision === 'RECHAZAR' && !this.confirmandoRechazo()) return;

    this.guardando.set(true);
    this.errorAccion.set('');
    this.api.decide(groupId, request.membershipId, decision).subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.aviso.set(response.message);
        this.selected.set(null);
        this.confirmandoRechazo.set(false);
        this.refrescarContadores();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.fallar(error, request, groupId);
      },
    });
  }

  protected nombrePracticante(request: Membership): string {
    return request.practitioner?.fullName ?? 'Postulante';
  }

  protected iniciales(request: Membership): string {
    return this.nombrePracticante(request)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected nivel(valor: string | null | undefined): string {
    return valor ? (NIVELES[valor] ?? valor) : '—';
  }

  protected fecha(valor: string | null | undefined): string {
    const date = valor ? new Date(valor) : null;
    if (!date || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(date);
  }

  /** Vuelve a pedir los grupos para actualizar `activeMembers` y `pendingRequests`. */
  private refrescarContadores(): void {
    this.api.loadMine().subscribe({ error: () => undefined });
  }

  /**
   * Si el backend no aplicó la decisión, la membresía no cambió: se refresca la lista y se
   * muestra el estado actual de la postulación en lugar de solo un error.
   */
  private fallar(error: unknown, request: Membership, groupId: number): void {
    const causa = classifyDecisionError(error);
    if (causa === 'OTRO') {
      this.errorAccion.set(apiError(error));
      return;
    }
    if (causa === 'SIN_PERMISO') {
      this.resultado.set(this.describir(causa, request, null));
      return;
    }
    this.guardando.set(true);
    this.refrescarContadores();
    this.api.loadRequests(groupId).subscribe({
      next: (lista) => {
        this.guardando.set(false);
        const sigue = lista.some((item) => item.membershipId === request.membershipId);
        this.resultado.set(this.describir(causa, request, sigue));
      },
      error: () => {
        this.guardando.set(false);
        this.resultado.set(this.describir(causa, request, null));
      },
    });
  }

  private describir(
    causa: DecisionFailure,
    request: Membership,
    sigue: boolean | null,
  ): ResultadoDecision {
    const nombre = this.nombrePracticante(request);
    const estado =
      sigue === null
        ? null
        : sigue
          ? 'Postulación: pendiente, sin cambios'
          : 'Postulación: atendida, ya no está pendiente';
    switch (causa) {
      case 'SIN_CUPO':
        return {
          titulo: 'El grupo no tiene cupo',
          detalle: `No se pudo aceptar a ${nombre}: el grupo ya alcanzó su capacidad. No se modificó la membresía.`,
          estado,
        };
      case 'YA_RESPONDIDA':
        return {
          titulo: 'La solicitud ya fue atendida',
          detalle: `La postulación de ${nombre} ya no estaba pendiente. No se modificó la membresía.`,
          estado,
        };
      case 'SIN_PERMISO':
        return {
          titulo: 'No eres el coach responsable de este grupo',
          detalle:
            'Solo el coach responsable puede aceptar o rechazar postulaciones. No se modificó la membresía.',
          estado,
        };
      default:
        return {
          titulo: 'La solicitud ya no existe',
          detalle: `La postulación de ${nombre} o el grupo ya no están disponibles. Se actualizó la lista.`,
          estado,
        };
    }
  }
}
