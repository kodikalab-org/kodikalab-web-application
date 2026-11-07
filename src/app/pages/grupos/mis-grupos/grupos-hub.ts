import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { map } from 'rxjs';
import { Session } from '../../../core/session';
import { ExplorarGrupos } from '../explorar-grupos/explorar-grupos';
import { MisGrupos } from './mis-grupos';
import { tabDesdeParametro } from './segmentos';

/**
 * `/grupos` para ambos roles: pestañas «Explorar» y «Mis grupos». La pestaña activa
 * vive en `?tab=` para poder enlazarla desde otras pantallas.
 */
@Component({
  selector: 'app-grupos-hub',
  imports: [RouterLink, MatButtonModule, MatTabsModule, ExplorarGrupos, MisGrupos],
  templateUrl: './grupos-hub.html',
  styleUrl: './grupos-hub.css',
})
export class GruposHub {
  private readonly session = inject(Session);
  private readonly route = inject(ActivatedRoute);

  protected readonly coach = computed(
    () => (this.session.demo() ?? this.session.account()?.role) === 'COACH',
  );
  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((params) => tabDesdeParametro(params.get('tab')))),
    { initialValue: tabDesdeParametro(this.route.snapshot.queryParamMap.get('tab')) },
  );
}
