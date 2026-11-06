import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

/**
 * El seguimiento con aclaraciones no existe en el backend (las postulaciones solo se
 * aceptan o rechazan), así que esta ruta antigua lleva a las solicitudes reales.
 */
@Component({
  selector: 'app-seguimiento-grupo',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './seguimiento-grupo.html',
  styleUrl: './seguimiento-grupo.css',
})
export class SeguimientoGrupo {
  constructor() {
    inject(Router).navigateByUrl('/coach/grupos/solicitudes', { replaceUrl: true });
  }
}
