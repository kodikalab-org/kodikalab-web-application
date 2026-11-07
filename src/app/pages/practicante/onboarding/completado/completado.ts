import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-onboarding-completado',
  imports: [SiteFooter, AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './completado.html',
  styleUrl: './completado.css',
})
export class OnboardingCompletado {
  protected readonly session = inject(Session);
  protected readonly profiles = inject(ProfileApi);
  protected get resumen(): string[] {
    if (this.session.demo()) return this.resumenDemo;
    const p = this.profiles.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    return [`Código ${p.codigoEstudiante}`, p.carrera, `${p.cicloAcademico}.º ciclo`, p.nivelCompetitivo,
      p.codeforcesHandle ? `Codeforces: ${p.codeforcesHandle}${p.codeforcesRating == null ? '' : ` · rating ${p.codeforcesRating}`}` : 'Codeforces sin vincular',
      ...(p.atcoderHandle ? [`AtCoder: ${p.atcoderHandle}`] : []), ...(p.vjudgeHandle ? [`VJudge: ${p.vjudgeHandle}`] : [])];
  }
  private readonly resumenDemo = [
    'Código 20240001',
    'Ingeniería de Software',
    '5.º ciclo',
    'Nivel Intermedio',
    'Codeforces: camila_cf · rating 1432',
    'AtCoder: camila_r',
    'VJudge: camila_vj',
  ];
  protected readonly resumenAviso = [
    'Código 20240001',
    'Ingeniería de Software',
    '5.º ciclo',
    'Nivel Intermedio',
    'Codeforces sin vincular',
    'AtCoder: camila_r',
    'VJudge: camila_vj',
  ];
  /** Estado de maqueta (`?estado=aviso-codeforces`): Codeforces no confirmó el identificador. */
  protected readonly estado$ = inject(ActivatedRoute).queryParamMap.pipe(
    map((params) => this.session.demo() ? params.get('estado') :
      this.profiles.message().includes('Codeforces no') ? 'aviso-codeforces' : null),
  );
}
