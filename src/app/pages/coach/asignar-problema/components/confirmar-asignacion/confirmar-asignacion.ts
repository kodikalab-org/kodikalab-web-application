import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { COMPETITION_STATUS, PLATFORM_LABEL } from '../../../../../core/problems-api';
import { AssignmentStore } from '../../assignment-store';
import { PasosAsignacion } from '../pasos-asignacion/pasos-asignacion';

/** Step 3 of US-07: review the assignment and send it with `POST /problems/assign`. */
@Component({
  selector: 'app-confirmar-asignacion',
  imports: [RouterLink, MatButtonModule, MatCardModule, PasosAsignacion],
  templateUrl: './confirmar-asignacion.html',
  styleUrl: './confirmar-asignacion.css',
  host: { class: 'block' },
})
export class ConfirmarAsignacion {
  protected readonly store = inject(AssignmentStore);
  private readonly router = inject(Router);

  protected readonly estado = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;

  protected confirmar(): void {
    const solicitud = this.store.request();
    if (!solicitud || this.store.submitting()) return;
    // The store forgets the competition once the assignment succeeds, so the name is read first.
    const competencia = this.store.competition()?.eventName ?? '';
    this.store.submit().subscribe({
      next: () =>
        this.router.navigate(['/coach/problemas-asignados'], {
          queryParams: { asignados: solicitud.problems.length, competencia },
        }),
      // Errors that point at fields are shown on the configuration step, where they can be fixed.
      error: () => {
        if (this.store.hasFieldErrors()) this.router.navigate(['/coach/asignar-problema/configurar']);
      },
    });
  }
}
