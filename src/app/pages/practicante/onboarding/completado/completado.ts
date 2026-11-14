import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-onboarding-completado',
  imports: [SiteFooter, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './completado.html',
  styleUrl: './completado.css',
})
export class OnboardingCompletado {
  protected readonly session = inject(Session);
  protected readonly profiles = inject(ProfileApi);
  protected get resumen(): string[] {
    const p = this.profiles.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    return [`Código ${p.codigoEstudiante}`, p.carrera, `${p.cicloAcademico}.º ciclo`, p.nivelCompetitivo,
      p.codeforcesHandle ? `Codeforces: ${p.codeforcesHandle}${p.codeforcesRating == null ? '' : ` · rating ${p.codeforcesRating}`}` : 'Codeforces sin vincular',
      ...(p.atcoderHandle ? [`AtCoder: ${p.atcoderHandle}`] : []), ...(p.vjudgeHandle ? [`VJudge: ${p.vjudgeHandle}`] : [])];
  }
  /** Codeforces no confirmó el identificador: lo informa el mensaje del perfil guardado. */
  protected get avisoCodeforces(): boolean {
    return this.profiles.message().includes('Codeforces no');
  }
}
