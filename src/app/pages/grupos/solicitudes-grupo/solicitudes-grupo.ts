import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { apiError } from '../../../core/api';
import { CoachGroup, Membership, MembershipDecision, TeamsApi } from '../../../core/teams-api';

type Estado = 'PENDIENTE' | 'ACLARACION_SOLICITADA' | 'ACTIVO';

/**
 * US06 — El coach revisa las postulaciones del grupo, acepta, rechaza o pide una
 * aclaración. Los datos vienen de `GET /teams/{id}/memberships?status=…`.
 */
@Component({
  selector: 'app-solicitudes-grupo',
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './solicitudes-grupo.html',
  styleUrl: './solicitudes-grupo.css',
})
export class SolicitudesGrupo {
  private readonly api = inject(TeamsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly groups = computed(
    () => this.api.mine().filter((g): g is CoachGroup => 'activeMembers' in g),
  );
  protected readonly selectedGroupId = signal<number | null>(null);
  protected readonly estado = signal<Estado>('PENDIENTE');
  protected readonly requests = this.api.requests;
  protected readonly selected = signal<Membership | null>(null);
  protected readonly pidiendoAclaracion = signal(false);
  protected readonly mensaje = signal('');
  protected readonly guardando = signal(false);
  protected readonly confirmandoExpulsion = signal<number | null>(null);
  protected readonly feedback = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly selectedGroup = computed(() => {
    const id = this.selectedGroupId();
    return id === null ? null : this.groups().find((g) => g.groupId === id) ?? null;
  });

  constructor() {
    this.api.loadMine().subscribe({
      next: () => {
        const requested = Number(this.route.snapshot.queryParamMap.get('grupo'));
        const group =
          this.groups().find((g) => g.groupId === requested) ?? this.groups()[0] ?? null;
        this.selectedGroupId.set(group?.groupId ?? null);
        this.cargar();
      },
      error: (error: unknown) =>
        this.feedback.set({ tipo: 'error', texto: apiError(error) }),
    });
  }

  protected cambiarGrupo(groupId: number): void {
    this.selectedGroupId.set(groupId);
    this.selected.set(null);
    this.cargar();
  }

  protected cambiarEstado(estado: Estado): void {
    this.estado.set(estado);
    this.selected.set(null);
    this.cargar();
  }

  protected ver(request: Membership): void {
    this.selected.set(request);
    this.pidiendoAclaracion.set(false);
    this.mensaje.set('');
    this.feedback.set(null);
  }

  protected cerrar(): void {
    this.selected.set(null);
    this.pidiendoAclaracion.set(false);
  }

  protected decidir(decision: MembershipDecision): void {
    const request = this.selected();
    const groupId = this.selectedGroupId();
    if (!request || groupId === null || this.guardando()) return;

    this.guardando.set(true);
    this.api.decide(groupId, request.membershipId, decision, this.mensaje()).subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.feedback.set({ tipo: 'ok', texto: response.message });
        this.selected.set(null);
        this.cargar();
        this.api.loadMine().subscribe({ next: () => undefined });
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.feedback.set({ tipo: 'error', texto: apiError(error) });
      },
    });
  }

  /** US06: pide confirmación antes de expulsar a un integrante. */
  protected pedirConfirmacion(request: Membership): void {
    this.confirmandoExpulsion.set(request.membershipId);
    this.feedback.set(null);
  }

  protected cancelarExpulsion(): void {
    this.confirmandoExpulsion.set(null);
  }

  protected expulsar(request: Membership): void {
    const groupId = this.selectedGroupId();
    if (groupId === null || this.guardando()) return;

    this.guardando.set(true);
    this.api.decide(groupId, request.membershipId, 'EXPULSAR').subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.confirmandoExpulsion.set(null);
        this.feedback.set({ tipo: 'ok', texto: response.message });
        this.cargar();
        this.api.loadMine().subscribe({ next: () => undefined });
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.feedback.set({ tipo: 'error', texto: apiError(error) });
      },
    });
  }

  protected nombrePracticante(request: Membership): string {    return request.practitioner?.fullName ?? 'Postulante';
  }

  protected iniciales(request: Membership): string {
    return this.nombrePracticante(request)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected fecha(valor: string | null | undefined): string {
    if (!valor) return '—';
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(valor));
  }

  private cargar(): void {
    const groupId = this.selectedGroupId();
    if (groupId === null) return;
    this.api.loadRequests(groupId, this.estado()).subscribe({
      error: (error: unknown) =>
        this.feedback.set({ tipo: 'error', texto: apiError(error) }),
    });
  }
}
