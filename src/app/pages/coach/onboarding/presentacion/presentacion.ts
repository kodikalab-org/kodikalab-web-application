import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap } from 'rxjs';

@Component({
  selector: 'app-onboarding-presentacion',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './presentacion.html',
  styleUrl: './presentacion.css',
})
export class OnboardingPresentacion {
  protected readonly form = new FormGroup({
    presentacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  /**
   * Estados de maqueta (`?estado=`): `con-texto` precarga la presentación del
   * Figma y `guardando` la precarga y muestra el botón en curso de guardado.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    this.form.reset();
    if (estado === 'con-texto' || estado === 'guardando') {
      this.form.patchValue({
        presentacion:
          'Entrenador de maratones ICPC. Trabajo con grafos, programación dinámica y simulacros semanales.',
      });
    }
  }
}
