import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { fieldErrors } from '../../../core/api';
import { submitUrl } from '../../../core/problem-links';
import {
  AssignedProblemItem,
  PLATFORM_LABEL,
  problemsError,
} from '../../../core/problems-api';
import { TeamApi } from '../../../core/team-api';

/** Backend limit of `language` and `evidenceUrl` (`POST /competitions/teams/{teamId}/problems/{id}/resolutions`). */
const MAX_LANGUAGE = 30;
const MAX_EVIDENCE = 500;

/**
 * US-09: registers a problem as solved. KodikaLab never stores code: the practitioner submits the solution on
 * the original platform (logged in there) and pastes the URL of that submission as evidence.
 */
@Component({
  selector: 'app-registro-problemas-resueltos',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './registro-problemas-resueltos.html',
  styleUrl: './registro-problemas-resueltos.css',
  host: { class: 'block' },
})
export class RegistroProblemasResueltos {
  private readonly api = inject(TeamApi);

  /** Team the practitioner solves the problem for; `null` when the page was opened without one. */
  readonly teamId = input.required<number | null>();
  readonly asignacion = input.required<AssignedProblemItem>();
  /** The container (dialog) closes the form when it is emitted. */
  readonly cancelar = output<void>();
  /** Emitted after the backend accepted the registration, so the container can refresh its data. */
  readonly registrado = output<void>();

  protected readonly lenguajes = ['C++17', 'Python 3.11', 'Java 17', 'JavaScript (Node 20)', 'Kotlin'];
  protected readonly maxEvidencia = MAX_EVIDENCE;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  protected readonly plataforma = computed(() => {
    const origen = this.asignacion().problem.sourcePlatform;
    return origen ? PLATFORM_LABEL[origen] : null;
  });
  /** Page of the original platform where the solution is submitted, or `null` when there is none. */
  protected readonly enlaceEnvio = computed(() => submitUrl(this.asignacion().problem));

  protected readonly form = new FormGroup({
    lenguaje: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_LANGUAGE)],
    }),
    evidencia: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_EVIDENCE), Validators.pattern(/^(https?:\/\/\S+)?$/)],
    }),
  });

  protected registrar(): void {
    const equipo = this.teamId();
    if (equipo === null || this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const { lenguaje, evidencia } = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.erroresCampo.set({});
    this.api
      .register(equipo, this.asignacion().competitionProblemId, {
        language: lenguaje.trim(),
        evidenceUrl: evidencia.trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.registrado.emit();
        },
        error: (error) => {
          this.guardando.set(false);
          this.erroresCampo.set(fieldErrors(error));
          this.error.set(this.mensaje(error));
        },
      });
  }

  /** Text for the registration errors the practitioner can act on; field errors are shown by their field. */
  private mensaje(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      const texto = String(error.error?.message ?? '');
      if (error.status === 409 && /accepted|ya existe/i.test(texto)) {
        return 'Ya registraste este problema como resuelto.';
      }
      if (error.status === 404 && /asignado/i.test(texto)) {
        return 'Este problema no está asignado a una competencia de tu equipo.';
      }
      if (error.status === 400 && Object.keys(fieldErrors(error)).length > 0) {
        return 'Revisa los datos ingresados.';
      }
    }
    return problemsError(error);
  }
}
