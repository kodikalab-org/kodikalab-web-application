import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { cicloLabel } from '../../../../models/profile-validation';
import { VinculacionPendiente } from '../../vinculacion-pendiente/vinculacion-pendiente';

@Component({
  selector: 'app-onboarding-completado',
  imports: [AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule, VinculacionPendiente],
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
    const plataformas = this.profiles.platforms().flatMap((plataforma) => {
      if (plataforma.state === 'PENDIENTE') return [`${plataforma.name}: ${plataforma.handle} · pendiente`];
      if (plataforma.state === 'SIN_VINCULAR') return plataforma.key === 'codeforces' ? ['Codeforces sin vincular'] : [];
      const rating = plataforma.rating == null ? '' : ` · rating ${plataforma.rating}`;
      return [`${plataforma.name}: ${plataforma.handle}${rating}`];
    });
    return [`Código ${p.codigoEstudiante}`, p.carrera, cicloLabel(p.cicloAcademico), p.nivelCompetitivo, ...plataformas];
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
      this.profiles.pendingLink() ? 'aviso-codeforces' : null),
  );
}
