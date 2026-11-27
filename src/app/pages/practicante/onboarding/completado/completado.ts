import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { profileIdentity } from '../../../../core/profile-identity';
import { NIVELES_EDICION } from '../../../../data/perfil-practicante-demo';
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
  /** Header identity: the saved profile name when there is one, otherwise the account email. */
  protected get cuenta() {
    if (this.session.demo()) return { name: 'Camila Rojas', initials: 'CR' };
    const email = this.session.account()?.email ?? '';
    return profileIdentity(this.profiles.profile()?.fullName, email, email);
  }
  protected get resumen(): string[] {
    if (this.session.demo()) return this.resumenDemo;
    const p = this.profiles.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    const nivel = NIVELES_EDICION.find(n => n.valor === p.nivelCompetitivo)?.titulo ?? p.nivelCompetitivo;
    return [`Código ${p.codigoEstudiante}`, p.carrera, `${p.cicloAcademico}.º ciclo`, `Nivel ${nivel}`,
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
