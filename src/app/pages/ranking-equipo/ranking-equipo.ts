import { Component } from '@angular/core';
import { RankingLive } from './ranking-live';

/** Pantalla conectada a la API: toda la vista vive en `ranking-live`. */
@Component({
  selector: 'app-ranking-equipo',
  imports: [RankingLive],
  template: '<app-ranking-live />',
})
export class RankingEquipo {}
