import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { LINK_STATE_LABEL, ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { cicloLabel } from '../../../models/profile-validation';
import { VinculacionPendiente } from '../vinculacion-pendiente/vinculacion-pendiente';

@Component({
  selector: 'app-plataformas-competitivas',
  imports: [AsyncPipe, RouterLink, MatButtonModule, MatToolbarModule, VinculacionPendiente],
  templateUrl: './plataformas-competitivas.html',
  styleUrl: './plataformas-competitivas.css',
})
export class PlataformasCompetitivas {
  protected readonly enlaces = ['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos'];
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly plataformasDemo = [
    { nombre: 'Codeforces', usuario: 'camila_rc', pendiente: true },
    { nombre: 'AtCoder', usuario: 'camila_upc', pendiente: false },
  ];

  /**
   * Platforms with their link state. The demo keeps its fixed sample; real accounts show the
   * three platforms the backend supports (Codeforces, AtCoder, VJudge) from ProfileApi.
   */
  protected get plataformas(): { nombre: string; usuario: string; pendiente: boolean; etiqueta: string }[] {
    if (this.session.demo()) {
      return this.plataformasDemo.map((p) => ({ ...p, etiqueta: p.pendiente ? 'Pendiente de validación externa' : 'Vinculada' }));
    }
    return this.profiles.platforms().map((p) => ({
      nombre: p.name, usuario: p.handle ?? 'Sin identificador', pendiente: p.state === 'PENDIENTE',
      etiqueta: LINK_STATE_LABEL[p.state],
    }));
  }

  /** Saved data shown next to the platforms (real accounts only). */
  protected get datosGuardados(): string[] {
    const p = this.profiles.profile();
    return p?.role === 'PRACTICANTE'
      ? [p.email, `${p.carrera} · ${cicloLabel(p.cicloAcademico)}`, `Nivel ${p.nivelCompetitivo.toLowerCase()}`]
      : [];
  }

  /** Estado de maqueta (`?estado=confirmada`): Codeforces validó el identificador. */
  protected readonly estado$ = inject(ActivatedRoute).queryParamMap.pipe(
    map((params) => params.get('estado')),
  );
}
