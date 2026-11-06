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
import { PractitionerProfile, apiError } from '../../../../core/api';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

const usuarioExterno = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]*$/)],
  });

@Component({
  selector: 'app-onboarding-plataformas',
  imports: [
    SiteFooter,
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
  protected busy = false;
  protected error = '';
  protected async guardar(omitir = false): Promise<void> {
    if (this.busy || (!omitir && this.form.invalid)) return;
    if (this.session.demo()) { await this.router.navigateByUrl('/onboarding/practicante/completado'); return; }
    const academic = this.profiles.academic;
    const nivel = this.profiles.competitive.nivel;
    if (!academic.codigo || !nivel) { await this.router.navigateByUrl('/onboarding/practicante/datos-academicos'); return; }
    this.busy = true;
    this.error = '';
    const handles = this.form.getRawValue();
    try {
      await firstValueFrom(this.profiles.save({
        codigoEstudiante: academic.codigo, carrera: academic.carrera,
        district: academic.distrito || null,
        cicloAcademico: Number.parseInt(academic.ciclo, 10),
        nivelCompetitivo: nivel as PractitionerProfile['nivelCompetitivo'],
        codeforcesHandle: omitir ? null : handles.codeforces || null,
        atcoderHandle: omitir ? null : handles.atcoder || null,
        vjudgeHandle: omitir ? null : handles.vjudge || null,
      }));
      await this.router.navigateByUrl('/onboarding/practicante/completado');
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected readonly plataformas = [
    { clave: 'codeforces', nombre: 'Codeforces', icono: 'images/onboarding/codeforces-34.svg' },
    { clave: 'atcoder', nombre: 'AtCoder', icono: 'images/onboarding/atcoder-34.svg' },
    { clave: 'vjudge', nombre: 'VJudge', icono: 'images/onboarding/vjudge-34.svg' },
  ];

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
