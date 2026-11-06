import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { apiError } from '../../../core/api';
import { CreateGroupResponse, GroupStatus, TeamsApi } from '../../../core/teams-api';
import { Session } from '../../../core/session';

/**
 * Confirmación de US04. Toma el grupo recién creado desde `TeamsApi` en lugar de
 * mostrar datos fijos, y permite publicar el borrador sin salir de la pantalla.
 */
@Component({
  selector: 'app-grupo-creado',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './grupo-creado.html',
  styleUrl: './grupo-creado.css',
})
export class GrupoCreado {
  private readonly api = inject(TeamsApi);
  protected readonly session = inject(Session);

  /** Estado local: cambia a ACTIVO cuando el coach publica el borrador. */
  private readonly estadoPublicado = signal<GroupStatus | null>(null);
  protected readonly publicando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected readonly grupo = computed<CreateGroupResponse | null>(() =>
    this.session.demo()
      ? {
          groupId: 1,
          name: 'Equipo Alfa',
          status: 'ACTIVO',
          invitationCode: 'DEMO12345678',
          message: 'Vista de ejemplo: no se creó ningún grupo.',
        }
      : this.api.lastCreated(),
  );

  protected readonly estadoActual = computed<GroupStatus>(
    () => this.estadoPublicado() ?? this.grupo()?.status ?? 'ACTIVO',
  );
  protected readonly esBorrador = computed(() => this.estadoActual() === 'BORRADOR');
  protected readonly estadoTexto = computed(() =>
    this.esBorrador() ? 'Borrador' : 'Activo, visible para los practicantes',
  );

  /** Mensaje de la última acción: crear o publicar. */
  protected readonly mensajePrincipal = computed(
    () => this.mensaje() || this.grupo()?.message || '',
  );

  /** US04: publica el borrador y lo deja disponible para solicitudes. */
  protected publicar(): void {
    const grupo = this.grupo();
    if (!grupo || this.publicando() || this.session.demo()) return;

    this.publicando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.api.publish(grupo.groupId).subscribe({
      next: (detalle) => {
        this.publicando.set(false);
        this.estadoPublicado.set(detalle.status);
        this.mensaje.set('Grupo publicado: ya aparece en el listado y acepta solicitudes.');
      },
      error: (error: unknown) => {
        this.publicando.set(false);
        this.error.set(apiError(error));
      },
    });
  }
}
