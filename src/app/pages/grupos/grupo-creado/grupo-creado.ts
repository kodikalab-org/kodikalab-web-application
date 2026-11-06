import { Component, inject, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TeamsApi } from '../../../core/teams-api';

/**
 * Confirmación de US04. Toma el grupo recién creado desde `TeamsApi` en lugar de
 * mostrar datos fijos, para que el nombre y el código de invitación sean reales.
 */
@Component({
  selector: 'app-grupo-creado',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './grupo-creado.html',
  styleUrl: './grupo-creado.css',
})
export class GrupoCreado {
  private readonly api = inject(TeamsApi);
  private readonly clipboard = inject(Clipboard);

  protected readonly grupo = this.api.lastCreated;
  /** `true` tras copiar el código, `false` si el navegador no permitió copiarlo. */
  protected readonly copiado = signal<boolean | null>(null);

  protected copiarCodigo(): void {
    const creado = this.grupo();
    if (!creado) return;
    this.copiado.set(this.clipboard.copy(creado.invitationCode));
  }
}
