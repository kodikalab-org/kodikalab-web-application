import { Component, inject } from '@angular/core';
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

  protected readonly grupo = this.api.lastCreated;
}
