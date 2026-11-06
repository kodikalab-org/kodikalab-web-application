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
import { PractitionerProfile, apiError } from '../../../../core/api';
import {
  PRACTITIONER_LIMITS,
  applyBackendErrors,
  backendFieldErrors,
  blankToNull,
  errorMessage,
  handleFormat,
  maxText,
  parseCiclo,
  trimmed,
} from '../../../../models/profile-validation';

const usuarioExterno = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [maxText(PRACTITIONER_LIMITS.handle), handleFormat],
  });

const MENSAJES_HANDLE = {
  handlePattern: 'Usa solo letras, números, punto, guion y guion bajo (máx. 50)',
  maxlength: `Máximo ${PRACTITIONER_LIMITS.handle} caracteres`,
};

const CONTROL_POR_CAMPO: Record<string, string> = {
  codeforcesHandle: 'codeforces', atcoderHandle: 'atcoder', vjudgeHandle: 'vjudge',
};
/** Earlier wizard step that owns each backend field that is not a platform handle. */
const PASO_POR_CAMPO: Record<string, { ruta: string; nombre: string }> = {
  codigoEstudiante: { ruta: '/onboarding/practicante/datos-academicos', nombre: 'Datos académicos' },
  carrera: { ruta: '/onboarding/practicante/datos-academicos', nombre: 'Datos académicos' },
  cicloAcademico: { ruta: '/onboarding/practicante/datos-academicos', nombre: 'Datos académicos' },
  nivelCompetitivo: { ruta: '/onboarding/practicante/perfil-competitivo', nombre: 'Perfil competitivo' },
};
const DUPLICADO = 'Este código de estudiante ya está vinculado a otro practicante';

interface ErrorDePaso { readonly mensaje: string; readonly ruta: string; readonly nombre: string; }

@Component({
  selector: 'app-onboarding-plataformas',
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
  templateUrl: './plataformas.html',
  styleUrl: './plataformas.css',
})
export class OnboardingPlataformas {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Backend errors about data entered in earlier steps, with the step to go back to. */
  protected readonly erroresDePasos = signal<ErrorDePaso[]>([]);

  protected async guardar(omitir = false): Promise<void> {
    if (this.busy() || (!omitir && this.form.invalid)) return;
    if (this.session.demo()) { await this.router.navigateByUrl('/onboarding/practicante/completado'); return; }
    const academic = this.profiles.academic;
    const nivel = this.profiles.competitive.nivel;
    const ciclo = parseCiclo(academic.ciclo);
    if (!trimmed(academic.codigo) || !nivel || ciclo === null) {
      await this.router.navigateByUrl('/onboarding/practicante/datos-academicos');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.erroresDePasos.set([]);
    const handles = this.form.getRawValue();
    try {
      await firstValueFrom(this.profiles.save({
        codigoEstudiante: trimmed(academic.codigo), carrera: trimmed(academic.carrera), cicloAcademico: ciclo,
        nivelCompetitivo: nivel as PractitionerProfile['nivelCompetitivo'],
        codeforcesHandle: omitir ? null : blankToNull(handles.codeforces),
        atcoderHandle: omitir ? null : blankToNull(handles.atcoder),
        vjudgeHandle: omitir ? null : blankToNull(handles.vjudge),
      }));
      await this.router.navigateByUrl('/onboarding/practicante/completado');
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.busy.set(false);
    }
  }

  protected mensaje(clave: 'codeforces' | 'atcoder' | 'vjudge'): string {
    return errorMessage(this.form.get(clave), MENSAJES_HANDLE);
  }

  /**
   * Handle errors go under their input. Errors about earlier steps are kept in the draft so
   * that step shows them under its field when the person goes back, and are listed here.
   */
  private mostrarError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    let campos = backendFieldErrors(error);
    if (status === 409) {
      const mensaje = (error as HttpErrorResponse).error?.message;
      campos = { codigoEstudiante: typeof mensaje === 'string' ? mensaje : DUPLICADO };
    } else if (status !== 400 || Object.keys(campos).length === 0) {
      this.error.set(apiError(error));
      return;
    }
    const deHandles: Record<string, string> = {};
    const dePasos: Record<string, string> = {};
    for (const [campo, mensaje] of Object.entries(campos)) {
      (campo in CONTROL_POR_CAMPO ? deHandles : dePasos)[campo] = mensaje;
    }
    const sinControl = applyBackendErrors(this.form, deHandles, CONTROL_POR_CAMPO);
    this.profiles.draftErrors = dePasos;
    this.erroresDePasos.set([
      ...Object.entries(dePasos).map(([campo, mensaje]) => ({
        mensaje, ruta: (PASO_POR_CAMPO[campo] ?? PASO_POR_CAMPO['codigoEstudiante']).ruta,
        nombre: (PASO_POR_CAMPO[campo] ?? PASO_POR_CAMPO['codigoEstudiante']).nombre,
      })),
      ...sinControl.map((mensaje) => ({ mensaje, ruta: PASO_POR_CAMPO['codigoEstudiante'].ruta, nombre: 'Datos académicos' })),
    ]);
  }

  protected readonly plataformas = [
    { clave: 'codeforces', nombre: 'Codeforces', icono: 'images/onboarding/codeforces-34.svg' },
    { clave: 'atcoder', nombre: 'AtCoder', icono: 'images/onboarding/atcoder-34.svg' },
    { clave: 'vjudge', nombre: 'VJudge', icono: 'images/onboarding/vjudge-34.svg' },
  ] as const;

  protected readonly form = new FormGroup({
    codeforces: usuarioExterno(),
    atcoder: usuarioExterno(),
    vjudge: usuarioExterno(),
  });

  /**
   * Estados de maqueta (`?estado=`): `error-formato` precarga un usuario de
   * Codeforces inválido y `guardando` precarga los tres usuarios y muestra el
   * botón en curso de guardado.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    if (!this.session.demo()) return;
    this.form.reset();
    if (estado === 'error-formato') {
      this.form.patchValue({ codeforces: 'camila rojas!', atcoder: 'camila_r' });
      this.form.markAllAsTouched();
    }
    if (estado === 'guardando') {
      this.form.patchValue({ codeforces: 'camila_cf', atcoder: 'camila_r', vjudge: 'camila_vj' });
    }
  }
}
