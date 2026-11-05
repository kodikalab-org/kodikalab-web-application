import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { firstValueFrom, map, tap } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { apiError } from '../../../../core/api';

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
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected busy = false;
  protected error = '';
  protected async guardar(omitir = false): Promise<void> {
    if (this.busy || (!omitir && this.form.invalid)) return;
    if (this.session.demo()) { await this.router.navigateByUrl('/onboarding/coach/completado'); return; }
    const draft = this.profiles.coach;
    if (!draft.especialidad || draft.anios === null) { await this.router.navigateByUrl('/onboarding/coach/experiencia'); return; }
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.profiles.save({ especialidadPrincipal: draft.especialidad,
        organizacionClub: draft.organizacion || null, aniosExperiencia: draft.anios,
        presentacion: omitir ? null : this.form.controls.presentacion.value || null }));
      await this.router.navigateByUrl('/onboarding/coach/completado');
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
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
    if (!this.session.demo()) return;
    this.form.reset();
    if (estado === 'con-texto' || estado === 'guardando') {
      this.form.patchValue({
        presentacion:
          'Entrenador de maratones ICPC. Trabajo con grafos, programación dinámica y simulacros semanales.',
      });
    }
  }
}
