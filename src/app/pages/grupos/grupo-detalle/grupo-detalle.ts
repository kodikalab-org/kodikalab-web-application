import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { apiError } from '../../../core/api';
import {
  AssignedProblem,
  MembershipStatus,
  PractitionerGroup,
  StudyGroupSummary,
  TeamsApi,
} from '../../../core/teams-api';

/**
 * US05: vista del grupo para el practicante.
 *
 * Muestra la información del grupo, su membresía y los problemas que el coach
 * asignó a ese grupo (`GET /problems/assigned?teamId=`).
 */
@Component({
  selector: 'app-grupo-detalle',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './grupo-detalle.html',
  styleUrl: './grupo-detalle.css',
})
export class GrupoDetalle {
  private readonly api = inject(TeamsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly grupo = signal<StudyGroupSummary | null>(null);
  protected readonly membresia = signal<MembershipStatus | null>(null);
  protected readonly problemas = signal<AssignedProblem[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly problemasError = signal('');

  constructor() {
    this.api.loadGroups().subscribe({
      next: (groups) => {
        const grupo = groups.find((item) => item.groupId === this.id);
        if (!grupo) {
          this.error.set('El grupo no existe o no está publicado.');
          this.cargando.set(false);
          return;
        }
        this.grupo.set(grupo);
        this.cargando.set(false);
        this.cargarMembresia();
        this.cargarProblemas();
      },
      error: (error: unknown) => {
        this.error.set(apiError(error));
        this.cargando.set(false);
      },
    });
  }

  protected estadoMembresia(): string {
    switch (this.membresia()) {
      case 'ACTIVO':
        return 'Miembro activo';
      case 'PENDIENTE':
        return 'Solicitud pendiente';
      case 'ACLARACION_SOLICITADA':
        return 'Aclaración solicitada';
      case 'EXPULSADO':
        return 'Expulsado';
      case 'RECHAZADO':
        return 'Solicitud rechazada';
      case 'RETIRADO':
        return 'Retirado';
      default:
        return 'Sin membresía';
    }
  }

  protected fecha(valor: string | null | undefined): string {
    if (!valor) return '—';
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(valor));
  }

  private cargarMembresia(): void {
    this.api.loadMine().subscribe({
      next: (mine) => {
        const membership = (mine as PractitionerGroup[]).find(
          (item) => item.groupId === this.id,
        )?.membership;
        this.membresia.set(membership?.status ?? null);
      },
      error: () => this.membresia.set(null),
    });
  }

  private cargarProblemas(): void {
    this.api.assignedProblems(this.id).subscribe({
      next: (response) => this.problemas.set(response.items),
      error: (error: unknown) => this.problemasError.set(apiError(error)),
    });
  }
}
