import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
import {
  COACH_LIMITS,
  applyBackendErrors,
  backendFieldErrors,
  blankToNull,
  errorMessage,
  maxText,
  trimmed,
} from '../../../../models/profile-validation';

/** Fields owned by the previous step; the rest (presentacion) is shown under this step's input. */
const CAMPOS_DEL_PASO_ANTERIOR = ['especialidadPrincipal', 'organizacionClub', 'aniosExperiencia'];

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
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Backend errors about the first step, with the message to show next to the link back. */
  protected readonly erroresPasoAnterior = signal<string[]>([]);
  /** Line of the preview card: the sample in the demo, the first-step draft otherwise. */
  protected get resumenPerfil(): string {
    if (this.session.demo()) return 'Coach · Grafos y Programación Dinámica · Club de Programación Competitiva · 4 años';
    const { especialidad, organizacion, anios } = this.profiles.coach;
    return ['Coach', trimmed(especialidad), trimmed(organizacion), anios === null ? '' : `${anios} años`]
      .filter(Boolean).join(' · ');
  }
  protected get mensajePresentacion(): string {
    return errorMessage(this.form.controls.presentacion, {
      maxlength: `La presentación no puede superar los ${COACH_LIMITS.presentacion} caracteres`,
    });
  }
  protected async guardar(omitir = false): Promise<void> {
    if (this.busy() || (!omitir && this.form.invalid)) return;
    if (this.session.demo()) { await this.router.navigateByUrl('/onboarding/coach/completado'); return; }
    const draft = this.profiles.coach;
    if (!trimmed(draft.especialidad) || draft.anios === null) { await this.router.navigateByUrl('/onboarding/coach/experiencia'); return; }
    this.busy.set(true);
    this.error.set('');
    this.erroresPasoAnterior.set([]);
    try {
      await firstValueFrom(this.profiles.save({ especialidadPrincipal: trimmed(draft.especialidad),
        organizacionClub: blankToNull(draft.organizacion), aniosExperiencia: draft.anios,
        presentacion: omitir ? null : blankToNull(this.form.controls.presentacion.value) }));
      await this.router.navigateByUrl('/onboarding/coach/completado');
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * The presentation error goes under its input. Errors about the first step are kept in the
   * draft so that step shows them under their fields when the person goes back.
   */
  private mostrarError(error: unknown): void {
    const campos = backendFieldErrors(error);
    if (!(error instanceof HttpErrorResponse) || error.status !== 400 || Object.keys(campos).length === 0) {
      this.error.set(apiError(error));
      return;
    }
    const propios: Record<string, string> = {};
    const anteriores: Record<string, string> = {};
    for (const [campo, mensaje] of Object.entries(campos)) {
      (CAMPOS_DEL_PASO_ANTERIOR.includes(campo) ? anteriores : propios)[campo] = mensaje;
    }
    const sinControl = applyBackendErrors(this.form, propios, { presentacion: 'presentacion' });
    this.profiles.draftErrors = anteriores;
    this.erroresPasoAnterior.set([...Object.values(anteriores), ...sinControl]);
  }
  protected readonly form = new FormGroup({
    presentacion: new FormControl('', {
      nonNullable: true,
      validators: [maxText(COACH_LIMITS.presentacion)],
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
